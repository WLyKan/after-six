import { getStaffId } from '../utils/storage';

export default defineContentScript({
  matches: ['*://ubd.supcon.com/*'],
  main() {
    initOvertimeStats();
  },
});

async function initOvertimeStats() {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  for (let i = 0; i < MAX_RETRIES; i++) {
    const container = document.querySelector(
      '#desktopSectionArea > div:nth-child(2) > div > div > div:nth-child(3) > div > div > div'
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
  const staffId = getStaffId();

  if (!staffId) {
    appendMessage(container, '未登录系统');
    return;
  }

  // 先缓存staff_id到storage供background使用
  await browser.storage.local.set({ staffId });

  // 显示加载中
  const loadingEl = appendMessage(container, '加载中...');

  // 发送消息给background获取数据
  browser.runtime.sendMessage(
    { action: 'getOvertimeStats' },
    (response) => {
      loadingEl.remove();

      if (response.success && response.data) {
        const { allTime } = response.data;
        const hour = Math.floor(allTime / 1000 / 60 / 60);
        const minute = Math.floor((allTime / 1000 / 60) % 60);
        appendMessage(container, `本月加班: ${hour}小时${minute}分钟`);
      } else {
        appendMessage(container, response.error || '数据获取失败');
      }
    }
  );
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
