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
  console.log('[加班统计] 页面所有 iframe:', document.querySelectorAll('iframe').length);

  // 列出所有 iframe
  document.querySelectorAll('iframe').forEach((iframe, i) => {
    console.log(`[加班统计] iframe ${i}: id=${iframe.id}, name=${iframe.name}, src=${iframe.src?.substring(0, 100)}`);
  });

  for (let i = 0; i < MAX_RETRIES; i++) {
    // 尝试多种方式查找 iframe
    let iframe = document.querySelector('#portalframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.querySelector('iframe[name="portalframe"]') as HTMLIFrameElement;
    }
    if (!iframe) {
      // 尝试查找包含考勤页面的 iframe
      iframe = Array.from(document.querySelectorAll('iframe')).find(f =>
        f.src?.includes('kq_count_calendar') || f.src?.includes('kqV2')
      ) as HTMLIFrameElement;
    }

    if (iframe) {
      console.log('[加班统计] 找到 iframe:', iframe.id || iframe.name || iframe.src?.substring(0, 50));

      // 等待 iframe 加载完成
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          console.log('[加班统计] 可以访问 iframe 文档');

          // 查找容器
          const container = iframeDoc.querySelector(
            'form:nth-child(1) > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div > div'
          );

          if (container) {
            console.log('[加班统计] 在 iframe 中找到目标容器');
            await injectOvertimeStats(iframeDoc, container as HTMLElement);
            return;
          } else {
            console.log('[加班统计] iframe 中未找到容器');

            // 查找所有包含 "kq" 的元素
            const kqElements = iframeDoc.querySelectorAll('[id*="kq"], [class*="kq"], [name*="kq"]');
            console.log(`[加班统计] 找到 ${kqElements.length} 个包含 "kq" 的元素`);

            // 打印 iframe 的 body 结构
            console.log('[加班统计] iframe body 结构:');
            const body = iframeDoc.body;
            if (body) {
              console.log('body > div 数量:', body.children.length);
              for (let i = 0; i < Math.min(body.children.length, 5); i++) {
                const child = body.children[i];
                console.log(`  body > div:nth-child(${i + 1}): tag=${child.tagName}, id=${child.id}, class=${child.className?.substring(0, 50)}`);
              }
            }

            // 查找包含考勤日历的表格
            const tables = iframeDoc.querySelectorAll('table');
            console.log(`[加班统计] 找到 ${tables.length} 个表格`);

            // 查找 staff_id
            const staffInput = iframeDoc.querySelector('input[name="staff_id"]') as HTMLInputElement;
            if (staffInput) {
              console.log('[加班统计] 找到 staff_id:', staffInput.value);
            }

            // 尝试用户提供的 XPath 路径
            const xpathResult = iframeDoc.evaluate(
              '/html/body/div[1]/div/div/form[1]/div[2]/div[2]/div[1]/div/div',
              iframeDoc,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            );
            if (xpathResult.singleNodeValue) {
              console.log('[加班统计] 通过 XPath 找到容器!');
              await injectOvertimeStats(iframeDoc, xpathResult.singleNodeValue as HTMLElement);
              return;
            } else {
              console.log('[加班统计] XPath 未找到容器');
            }
          }
        } else {
          console.log('[加班统计] 无法访问 iframe 文档（可能跨域）');
        }
      } catch (e) {
        console.error('[加班统计] 访问 iframe 出错:', e);
      }
    } else {
      console.log(`[加班统计] 第 ${i + 1} 次未找到 iframe`);

      // 检查页面是否有动态加载的内容
      const allElements = document.querySelectorAll('*');
      console.log(`[加班统计] 页面共有 ${allElements.length} 个元素`);
    }

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
  }

  console.warn('[加班统计] 无法找到 iframe 或容器');
}

async function injectOvertimeStats(doc: Document, container: HTMLElement) {
  // 从 iframe 获取 staff_id
  const staffId = getStaffIdFromIframe(doc);

  console.log('[加班统计] 获取到的 staff_id:', staffId);

  if (!staffId) {
    appendMessage(container, '无法获取工号，请确认已登录系统');
    return;
  }

  // 显示加载中
  const loadingEl = appendMessage(container, '加载中...');

  console.log('[加班统计] 发送消息给 background 获取数据...');

  // 发送消息给background获取数据
  browser.runtime.sendMessage(
    { action: 'getOvertimeStats', staffId },
    (response) => {
      loadingEl.remove();

      console.log('[加班统计] 收到 background 响应:', response);

      if (browser.runtime.lastError) {
        console.error('[加班统计] 通信失败:', browser.runtime.lastError.message);
        appendMessage(container, '通信失败: ' + browser.runtime.lastError.message);
        return;
      }

      if (!response) {
        console.error('[加班统计] 未收到响应');
        appendMessage(container, '未收到响应');
        return;
      }

      if (response.success && response.data) {
        const { allTime, detailList } = response.data;
        const hour = Math.floor(allTime / 1000 / 60 / 60);
        const minute = Math.floor((allTime / 1000 / 60) % 60);
        console.log(`[加班统计] 本月总加班: ${hour}小时${minute}分钟`);
        console.log('[加班统计] 加班明细:', detailList);
        appendMessage(container, `本月加班: ${hour}小时${minute}分钟`);

        // 在每个日期单元格上显示加班工时
        injectDailyOvertime(doc, detailList);
      } else {
        console.error('[加班统计] 获取数据失败:', response.error);
        appendMessage(container, response.error || '数据获取失败');
      }
    }
  );
}

function getStaffIdFromIframe(doc: Document): string | null {
  console.log('[加班统计] 尝试从 iframe 获取 staff_id...');

  // 从 iframe 的 input 元素获取 staff_id
  const staffInput = doc.querySelector('input[name="staff_id"]') as HTMLInputElement;
  if (staffInput && staffInput.value) {
    console.log('[加班统计] 从 iframe input[name="staff_id"] 获取到:', staffInput.value);
    return staffInput.value;
  }

  // 尝试从隐藏字段获取
  const hiddenInputs = doc.querySelectorAll('input[type="hidden"]');
  console.log(`[加班统计] 找到 ${hiddenInputs.length} 个隐藏字段`);
  hiddenInputs.forEach((input) => {
    const htmlInput = input as HTMLInputElement;
    if (htmlInput.name && htmlInput.value) {
      console.log(`[加班统计] 隐藏字段: ${htmlInput.name} = ${htmlInput.value}`);
    }
  });

  console.warn('[加班统计] 未找到 staff_id');
  return null;
}

function injectDailyOvertime(doc: Document, detailList: Array<{ work_day: string; sumString: string; sum: number }>) {
  console.log('[加班统计] 开始注入每日加班工时...');

  // 获取所有日期单元格 - 使用 fc-day class
  const cells = doc.querySelectorAll('td.fc-day');
  console.log(`[加班统计] 找到 ${cells.length} 个日期单元格 (fc-day)`);

  let injectedCount = 0;

  cells.forEach((cell) => {
    // 尝试从 data-date 属性获取日期
    let dateStr = cell.getAttribute('data-date');

    // 如果没有 data-date，尝试从 class 中提取日期
    if (!dateStr) {
      const classMatch = cell.className.match(/fc-day-(\d{4}-\d{2}-\d{2})/);
      if (classMatch) {
        dateStr = classMatch[1];
      }
    }

    // 如果还没有，尝试从 id 中提取日期
    if (!dateStr) {
      const idMatch = cell.id.match(/kqcal_td_(\d{4}-\d{1,2}-\d{1,2})/);
      if (idMatch) {
        dateStr = idMatch[1];
      }
    }

    if (dateStr) {
      // 查找该日期的加班数据
      const detail = detailList.find((d) => {
        // 标准化日期格式进行比较
        const normalizedWorkDay = normalizeDate(d.work_day);
        const normalizedDate = normalizeDate(dateStr!);
        return normalizedWorkDay === normalizedDate;
      });

      if (detail && detail.sum > 0) {
        const hour = Math.floor(detail.sum / 1000 / 60 / 60);
        const minute = Math.floor((detail.sum / 1000 / 60) % 60);
        const text = hour > 0 && minute > 0 ? `${hour}h ${minute}m` : hour > 0 ? `${hour}h` : `${minute}m`;

        const overtimeEl = doc.createElement('div');
        overtimeEl.textContent = text;
        overtimeEl.style.cssText = `
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
        cell.style.position = 'relative';
        cell.appendChild(overtimeEl);
        injectedCount++;
        console.log(`[加班统计] 在 ${dateStr} 注入加班工时: ${detail.sumString}`);
      }
    }
  });

  console.log(`[加班统计] 共注入 ${injectedCount} 天的加班工时`);
}

function normalizeDate(dateStr: string): string {
  // 将日期标准化为 YYYY-M-D 格式
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[0]}-${parseInt(parts[1])}-${parseInt(parts[2])}`;
  }
  return dateStr;
}

function appendMessage(container: HTMLElement, text: string): HTMLElement {
  const div = document.createElement('div');
  div.textContent = text;
  div.style.cssText = `
    font-size: 14px;
    padding: 8px 0;
    color: #333;
    text-align: left;
  `;
  container.appendChild(div);
  return div;
}
