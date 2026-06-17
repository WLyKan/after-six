export default defineContentScript({
  matches: ['*://ehr.supcon.com/*'],
  main() {
    initOvertimeStats();
  },
});

async function initOvertimeStats() {
  const MAX_RETRIES = 5;
  const RETRY_DELAY = 1000;

  for (let i = 0; i < MAX_RETRIES; i++) {
    const container = document.querySelector(
      'body > div:nth-child(1) > div > div > form:nth-child(1) > div:nth-child(2) > div:nth-child(2) > div:nth-child(1)'
    );

    if (container) {
      await injectOvertimeStats(container as HTMLElement);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
  }

  console.warn('目标容器未找到');
}

async function injectOvertimeStats(container: HTMLElement) {
  // 从页面获取staff_id
  const staffId = getStaffIdFromPage();

  if (!staffId) {
    appendMessage(container, '无法获取工号，请确认已登录系统');
    return;
  }

  // 显示加载中
  const loadingEl = appendMessage(container, '加载中...');

  // 发送消息给background获取数据
  browser.runtime.sendMessage(
    { action: 'getOvertimeStats', staffId },
    (response) => {
      loadingEl.remove();

      if (browser.runtime.lastError) {
        appendMessage(container, '通信失败: ' + browser.runtime.lastError.message);
        return;
      }

      if (!response) {
        appendMessage(container, '未收到响应');
        return;
      }

      if (response.success && response.data) {
        const { allTime, detailList } = response.data;
        const hour = Math.floor(allTime / 1000 / 60 / 60);
        const minute = Math.floor((allTime / 1000 / 60) % 60);
        appendMessage(container, `本月加班: ${hour}小时${minute}分钟`);

        // 在每个日期单元格上显示加班工时
        injectDailyOvertime(detailList);
      } else {
        appendMessage(container, response.error || '数据获取失败');
      }
    }
  );
}

function getStaffIdFromPage(): string | null {
  // 从页面的input元素获取staff_id
  const staffInput = document.querySelector('input[name="staff_id"]') as HTMLInputElement;
  if (staffInput && staffInput.value) {
    return staffInput.value;
  }

  // 尝试从iframe获取
  const iframe = document.querySelector('#portalframe') as HTMLIFrameElement;
  if (iframe && iframe.contentDocument) {
    const iframeInput = iframe.contentDocument.querySelector('input[name="staff_id"]') as HTMLInputElement;
    if (iframeInput && iframeInput.value) {
      return iframeInput.value;
    }
  }

  return null;
}

function injectDailyOvertime(detailList: Array<{ work_day: string; sumString: string; sum: number }>) {
  // 获取所有日期单元格
  const cells = document.querySelectorAll('td[id^="kqcal_td_"]');

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
        const overtimeEl = document.createElement('div');
        overtimeEl.textContent = detail.sumString;
        overtimeEl.style.cssText = `
          font-size: 11px;
          color: #e74c3c;
          font-weight: bold;
          margin-top: 2px;
        `;
        cell.appendChild(overtimeEl);
      }
    }
  });
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
