import { fetchDailyAttendance } from '../utils/api';
import { calculateOvertime, getDaysArray } from '../utils/calculator';
import type { ApiResponse, MessageRequest, MessageResponse } from '../types';

const BATCH_SIZE = 5;

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (
      request: MessageRequest,
      sender: browser.runtime.MessageSender,
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
        return true;
      }
    }
  );
});

async function fetchWithConcurrency(
  staffId: string,
  days: string[]
): Promise<ApiResponse[]> {
  const results: ApiResponse[] = [];

  for (let i = 0; i < days.length; i += BATCH_SIZE) {
    const batch = days.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map((day) => fetchDailyAttendance(staffId, day))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }
  }

  return results;
}

async function handleGetOvertimeStats(): Promise<MessageResponse> {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const today = now.getDate();

    const staffId = await getStaffIdFromStorage();

    if (!staffId) {
      return {
        success: false,
        error: '无法获取工号，请确认已登录系统',
      };
    }

    const days = getDaysArray(year, month).filter((_, index) => index < today);
    const results = await fetchWithConcurrency(staffId, days);

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
  const result = await browser.storage.local.get('staffId');
  return result.staffId || null;
}
