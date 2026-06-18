export default defineContentScript({
  matches: ['*://ehr.supcon.com/*'],
  main() {
    console.log('[加班统计] Content script 已加载');
    console.log('[加班统计] 当前URL:', window.location.href);

    initOvertimeStats();
  },
});

async function initOvertimeStats() {
  const MAX_RETRIES = 10;
  const RETRY_DELAY = 2000;

  console.log('[加班统计] 开始查找 iframe...');

  for (let i = 0; i < MAX_RETRIES; i++) {
    let iframe = document.querySelector('#portalframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.querySelector('iframe[name="portalframe"]') as HTMLIFrameElement;
    }
    if (!iframe) {
      iframe = Array.from(document.querySelectorAll('iframe')).find(f =>
        f.src?.includes('kq_count_calendar') || f.src?.includes('kqV2')
      ) as HTMLIFrameElement;
    }

    if (iframe) {
      console.log('[加班统计] 找到 iframe:', iframe.id || iframe.name || iframe.src?.substring(0, 50));

      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          const container = findContainer(iframeDoc);
          if (container) {
            console.log('[加班统计] 找到目标容器');
            await initWithContainer(iframeDoc, container, iframe);
            return;
          }
        }
      } catch (e) {
        console.error('[加班统计] 访问 iframe 出错:', e);
      }
    } else {
      console.log(`[加班统计] 第 ${i + 1} 次未找到 iframe`);
    }

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
  }

  console.warn('[加班统计] 无法找到 iframe 或容器');
}

function findContainer(doc: Document): HTMLElement | null {
  // CSS 选择器
  const el = doc.querySelector(
    'form:nth-child(1) > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div > div'
  );
  if (el) return el as HTMLElement;

  // XPath 兜底
  const result = doc.evaluate(
    '/html/body/div[1]/div/div/form[1]/div[2]/div[2]/div[1]/div/div',
    doc,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null
  );
  return result.singleNodeValue as HTMLElement | null;
}

/**
 * 初始化：获取 staffId → 首次加载数据 → 监听月份切换
 */
async function initWithContainer(doc: Document, container: HTMLElement, iframe: HTMLIFrameElement) {
  const staffId = getStaffIdFromIframe(doc);
  if (!staffId) {
    appendSummary(doc, '无法获取工号，请确认已登录系统');
    return;
  }

  console.log('[加班统计] staff_id:', staffId);

  // 首次加载当前月份
  await fetchAndDisplay(doc, staffId);

  // 监听月份切换
  setupMonthChangeListener(doc, staffId, iframe);
}

/**
 * 核心：获取数据并显示（清除旧数据 → 请求 → 渲染）
 * 每次都重新查找容器，避免 DOM 更新后引用失效
 */
async function fetchAndDisplay(doc: Document, staffId: string, year?: number, month?: number) {
  const summaryText = year && month ? `${year}年${month}月` : '本月';
  console.log(`[加班统计] fetchAndDisplay 开始: year=${year}, month=${month}, 显示文本="${summaryText}"`);

  // 清除旧的加班显示
  clearOvertimeDisplay(doc);

  // 重新查找容器（DOM 可能已被 FullCalendar 替换）
  const container = findContainer(doc);
  if (!container) {
    console.warn('[加班统计] fetchAndDisplay: 容器未找到');
    return;
  }

  // 显示加载中
  const loadingEl = appendSummary(doc, '加载中...');

  console.log(`[加班统计] 请求 ${summaryText} 数据...`);

  return new Promise<void>((resolve) => {
    browser.runtime.sendMessage(
      { action: 'getOvertimeStats', staffId, year, month },
      (response) => {
        loadingEl.remove();

        if (browser.runtime.lastError) {
          console.error('[加班统计] 通信失败:', browser.runtime.lastError.message);
          appendSummary(doc, '通信失败: ' + browser.runtime.lastError.message);
          resolve();
          return;
        }

        if (!response) {
          appendSummary(doc, '未收到响应');
          resolve();
          return;
        }

        if (response.success && response.data) {
          const { allTime, detailList } = response.data;
          const hour = Math.floor(allTime / 1000 / 60 / 60);
          const minute = Math.floor((allTime / 1000 / 60) % 60);
          console.log(`[加班统计] ${summaryText}加班: ${hour}h${minute}m, 明细 ${detailList.length} 条`);
          appendSummary(doc, `${summaryText}加班: ${hour}小时${minute}分钟`);
          injectDailyOvertime(doc, detailList);
        } else {
          console.error('[加班统计] 获取数据失败:', response.error);
          appendSummary(doc, response.error || '数据获取失败');
        }

        resolve();
      }
    );
  });
}

/**
 * 清除已注入的加班显示（汇总 + 每日标签）
 */
function clearOvertimeDisplay(doc: Document) {
  doc.querySelectorAll('.overtime-stats-summary').forEach((el) => el.remove());
  doc.querySelectorAll('.overtime-stats-badge').forEach((el) => el.remove());
}

/**
 * 从日历单元格检测当前显示的月份
 * 取出现次数最多的月份（处理相邻月份溢出单元格）
 */
function detectCurrentMonth(doc: Document): { year: number; month: number } | null {
  const cells = doc.querySelectorAll('td.fc-day');
  console.log(`[加班统计] detectCurrentMonth: 找到 ${cells.length} 个 fc-day 单元格`);

  // 统计每个月份出现的次数
  const monthCounts = new Map<string, { year: number; month: number; count: number }>();

  for (const cell of cells) {
    const dateStr = cell.getAttribute('data-date');
    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0]);
        const m = parseInt(parts[1]);
        const key = `${y}-${m}`;
        const existing = monthCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          monthCounts.set(key, { year: y, month: m, count: 1 });
        }
      }
    }
  }

  // 打印所有检测到的月份分布
  for (const [key, val] of monthCounts) {
    console.log(`[加班统计] detectCurrentMonth: ${key} → ${val.count} 个单元格`);
  }

  // 取出现次数最多的月份
  let best: { year: number; month: number; count: number } | null = null;
  for (const val of monthCounts.values()) {
    if (!best || val.count > best.count) {
      best = val;
    }
  }

  if (best) {
    console.log(`[加班统计] detectCurrentMonth: 最终结果 → ${best.year}年${best.month}月 (${best.count} 个单元格)`);
    return { year: best.year, month: best.month };
  }

  console.warn('[加班统计] detectCurrentMonth: 未找到任何日期');
  return null;
}

/**
 * 监听月份切换
 * - MutationObserver 监听日历 body DOM 变化
 * - click 事件委托监听前进/后退按钮
 * - 800ms 防抖，等 FullCalendar 渲染完成
 */
function setupMonthChangeListener(doc: Document, staffId: string, iframe: HTMLIFrameElement) {
  let displayedMonth = detectCurrentMonth(doc);
  let isFetching = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  console.log('[加班统计] 初始月份:', displayedMonth);

  const DEBOUNCE_MS = 800;

  const checkMonthChange = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (isFetching) {
        console.log('[加班统计] checkMonthChange: 正在获取中，跳过');
        return;
      }

      console.log('[加班统计] checkMonthChange: 开始检测...');
      const currentMonth = detectCurrentMonth(doc);
      if (!currentMonth) {
        console.log('[加班统计] checkMonthChange: 未检测到月份，跳过');
        return;
      }

      console.log(`[加班统计] checkMonthChange: 当前=${currentMonth.year}-${currentMonth.month}, 已显示=${displayedMonth?.year}-${displayedMonth?.month}`);

      if (
        !displayedMonth ||
        currentMonth.year !== displayedMonth.year ||
        currentMonth.month !== displayedMonth.month
      ) {
        console.log(
          `[加班统计] ✓ 月份切换确认: ${displayedMonth?.year}-${displayedMonth?.month} → ${currentMonth.year}-${currentMonth.month}`
        );
        displayedMonth = currentMonth;
        isFetching = true;
        fetchAndDisplay(doc, staffId, currentMonth.year, currentMonth.month).finally(() => {
          isFetching = false;
        });
      } else {
        console.log('[加班统计] checkMonthChange: 月份未变化，跳过');
      }
    }, DEBOUNCE_MS);
  };

  // 策略1: MutationObserver — 监听日历区域 DOM 变化
  const calendarBody =
    doc.querySelector('.fc-body') ||
    doc.querySelector('.fc-view-container') ||
    doc.querySelector('table.fc-border-separate');

  if (calendarBody) {
    const observer = new MutationObserver(checkMonthChange);
    observer.observe(calendarBody, { childList: true, subtree: true });
    console.log('[加班统计] MutationObserver 已挂载到:', calendarBody.tagName);
  }

  // 策略2: click 事件委托 — 监听前进/后退按钮
  doc.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest(
      '.fc-prev-button, .fc-next-button, .fc-prev, .fc-next, [class*="fc-button-prev"], [class*="fc-button-next"]'
    );
    if (btn) {
      console.log('[加班统计] 点击月份导航按钮');
      checkMonthChange();
    }
  }, true);
}

/**
 * 追加汇总消息到容器末尾（表格之后）
 * 每次重新查找容器，避免 DOM 更新后引用失效
 */
function appendSummary(doc: Document, text: string): HTMLElement {
  const div = doc.createElement('div');
  div.className = 'overtime-stats-summary';
  div.textContent = text;
  div.style.cssText = `
    font-size: 14px;
    padding: 8px 0;
    color: #333;
    text-align: left;
  `;

  const container = findContainer(doc);
  if (container) {
    // 插入到容器的最后一个子元素之后，确保在表格下方
    const lastChild = container.lastElementChild;
    if (lastChild) {
      lastChild.after(div);
    } else {
      container.appendChild(div);
    }
  }

  return div;
}

function getStaffIdFromIframe(doc: Document): string | null {
  const staffInput = doc.querySelector('input[name="staff_id"]') as HTMLInputElement;
  if (staffInput?.value) return staffInput.value;

  const hiddenInputs = doc.querySelectorAll('input[type="hidden"]');
  for (const input of hiddenInputs) {
    const el = input as HTMLInputElement;
    if (el.name === 'staff_id' && el.value) return el.value;
  }

  return null;
}

function injectDailyOvertime(doc: Document, detailList: Array<{ work_day: string; sumString: string; sum: number }>) {
  const cells = doc.querySelectorAll('td.fc-day');
  console.log(`[加班统计] injectDailyOvertime: ${cells.length} 个单元格, ${detailList.length} 条记录`);

  // 打印前3个单元格的日期信息用于调试
  let debugCount = 0;
  cells.forEach((cell) => {
    if (debugCount < 3) {
      const dateStr = cell.getAttribute('data-date') || cell.className.match(/fc-day-(\d{4}-\d{2}-\d{2})/)?.[1] || cell.id;
      console.log(`[加班统计] injectDailyOvertime: 单元格样本 → data-date="${cell.getAttribute('data-date')}", class-date="${cell.className.match(/fc-day-(\d{4}-\d{2}-\d{2})/)?.[1]}", id="${cell.id}"`);
      debugCount++;
    }
  });

  // 打印 detailList 中的日期
  if (detailList.length > 0) {
    console.log(`[加班统计] injectDailyOvertime: 数据日期范围: ${detailList[0].work_day} ~ ${detailList[detailList.length - 1].work_day}`);
  }

  let injectedCount = 0;

  cells.forEach((cell) => {
    let dateStr = cell.getAttribute('data-date');

    if (!dateStr) {
      const classMatch = cell.className.match(/fc-day-(\d{4}-\d{2}-\d{2})/);
      if (classMatch) dateStr = classMatch[1];
    }

    if (!dateStr) {
      const idMatch = cell.id.match(/kqcal_td_(\d{4}-\d{1,2}-\d{1,2})/);
      if (idMatch) dateStr = idMatch[1];
    }

    if (!dateStr) return;

    const normalizedDate = normalizeDate(dateStr);
    const detail = detailList.find((d) => normalizeDate(d.work_day) === normalizedDate);

    if (detail && detail.sum > 0) {
      const hour = Math.floor(detail.sum / 1000 / 60 / 60);
      const minute = Math.floor((detail.sum / 1000 / 60) % 60);
      const text = hour > 0 && minute > 0 ? `${hour}h ${minute}m` : hour > 0 ? `${hour}h` : `${minute}m`;

      const badge = doc.createElement('div');
      badge.className = 'overtime-stats-badge';
      badge.textContent = text;
      badge.style.cssText = `
        position: absolute;
        right: 2px;
        bottom: 2px;
        font-size: 10px;
        line-height: 1.4;
        padding: 1px 3px;
        border-radius: 3px;
        background: rgba(0, 0, 0, 0.06);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      `;
      (cell as HTMLElement).style.position = 'relative';
      cell.appendChild(badge);
      injectedCount++;
    }
  });

  console.log(`[加班统计] 已注入 ${injectedCount} 天加班工时`);
}

function normalizeDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[0]}-${parseInt(parts[1])}-${parseInt(parts[2])}`;
  }
  return dateStr;
}
