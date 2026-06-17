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
  const RETRY_DELAY = 1500;

  console.log('[加班统计] 开始查找 iframe...');

  for (let i = 0; i < MAX_RETRIES; i++) {
    const iframe = document.querySelector('#portalframe') as HTMLIFrameElement;

    if (iframe) {
      console.log('[加班统计] 找到 iframe #portalframe');

      // 等待 iframe 加载完成
      if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
        console.log('[加班统计] iframe 已加载完成');

        // 尝试在 iframe 内查找容器
        const iframeDoc = iframe.contentDocument;
        const container = iframeDoc.querySelector(
          'form:nth-child(1) > div:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div > div'
        );

        if (container) {
          console.log('[加班统计] 在 iframe 中找到目标容器');
          await injectOvertimeStats(iframeDoc, container as HTMLElement);
          return;
        } else {
          console.log('[加班统计] iframe 中未找到容器，尝试其他选择器...');

          // 列出 iframe 中的所有 form 元素
          const forms = iframeDoc.querySelectorAll('form');
          console.log(`[加班统计] iframe 中有 ${forms.length} 个 form 元素`);

          // 尝试更通用的选择器
          const allDivs = iframeDoc.querySelectorAll('div');
          console.log(`[加班统计] iframe 中有 ${allDivs.length} 个 div 元素`);

          // 查找包含考勤日历的元素
          const kqElements = iframeDoc.querySelectorAll('[id*="kq"], [class*="kq"]');
          console.log(`[加班统计] 找到 ${kqElements.length} 个包含 "kq" 的元素`);
          kqElements.forEach((el, idx) => {
            console.log(`[加班统计] kq 元素 ${idx}:`, el.tagName, el.id, el.className);
          });
        }
      } else {
        console.log(`[加班统计] iframe 尚未加载完成 (readyState: ${iframe.contentDocument?.readyState})`);
      }
    } else {
      console.log(`[加班统计] 第 ${i + 1} 次未找到 iframe #portalframe`);
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

  // 获取所有日期单元格
  const cells = doc.querySelectorAll('td[id^="kqcal_td_"]');
  console.log(`[加班统计] 找到 ${cells.length} 个日期单元格`);

  let injectedCount = 0;

  cells.forEach((cell) => {
    const cellId = cell.id; // 格式: kqcal_td_2026-6-1
    const dateMatch = cellId.match(/kqcal_td_(\d{4}-\d{1,2}-\d{1,2})/);

    if (dateMatch) {
      const dateStr = dateMatch[1];
      // 查找该日期的加班数据
      const detail = detailList.find((d) => {
        // 标准化日期格式进行比较
        const normalizedWorkDay = normalizeDate(d.work_day);
        const normalizedDate = normalizeDate(dateStr);
        return normalizedWorkDay === normalizedDate;
      });

      if (detail && detail.sum > 0) {
        // 创建加班工时显示元素
        const overtimeEl = doc.createElement('div');
        overtimeEl.textContent = detail.sumString;
        overtimeEl.style.cssText = `
          font-size: 11px;
          color: #e74c3c;
          font-weight: bold;
          margin-top: 2px;
        `;
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
