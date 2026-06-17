import { fetchDailyAttendance } from '../utils/api';
import { calculateOvertime, getDaysArray } from '../utils/calculator';
import type { MessageRequest, MessageResponse } from '../types';

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener(
    (
      request: MessageRequest,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: MessageResponse) => void
    ) => {
      if (request.action === 'getOvertimeStats') {
        handleGetOvertimeStats()
          .then(sendResponse)
          .catch((error) => {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          });
        return true; // 保持消息通道开放
      }
    }
  );
});

async function handleGetOvertimeStats(): Promise<MessageResponse> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const staffId = await getStaffIdFromStorage();

    if (!staffId) {
      return {
        success: false,
        error: '无法获取工号，请确认已登录系统',
      };
    }

    const days = getDaysArray(year, month);
    const promises = days.map((day) => fetchDailyAttendance(staffId, day));
    const results = await Promise.all(promises);

    const validRecords = results
      .filter((r) => r.data && r.data.length > 0)
      .map((r) => r.data[0]);

    const stats = calculateOvertime(validRecords);

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取数据失败',
    };
  }
}

async function getStaffIdFromStorage(): Promise<string | null> {
  const result = await chrome.storage.local.get('staffId');
  return result.staffId || null;
}
