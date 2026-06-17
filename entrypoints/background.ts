import { fetchDailyAttendance } from '../utils/api';
import { calculateOvertime, getDaysArray } from '../utils/calculator';
import type { ApiResponse, MessageRequest, MessageResponse } from '../types';

const BATCH_SIZE = 5;

export default defineBackground(() => {
  console.log('[加班统计] Background script 已启动');

  browser.runtime.onMessage.addListener(
    (
      request: MessageRequest,
      sender: browser.runtime.MessageSender,
      sendResponse: (response: MessageResponse) => void
    ) => {
      if (request.action === 'getOvertimeStats') {
        console.log('[加班统计] 收到消息请求:', request);
        console.log('[加班统计] 发送者:', sender);

        handleGetOvertimeStats(request.staffId)
          .then((result) => {
            console.log('[加班统计] 处理完成，返回结果:', result);
            sendResponse(result);
          })
          .catch((error) => {
            console.error('[加班统计] 处理失败:', error);
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
  console.log(`[加班统计] 开始获取 ${days.length} 天的打卡数据，每批 ${BATCH_SIZE} 个`);

  const results: ApiResponse[] = [];

  for (let i = 0; i < days.length; i += BATCH_SIZE) {
    const batch = days.slice(i, i + BATCH_SIZE);
    console.log(`[加班统计] 获取第 ${i / BATCH_SIZE + 1} 批数据:`, batch);

    const batchResults = await Promise.allSettled(
      batch.map((day) => fetchDailyAttendance(staffId, day))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.warn('[加班统计] 获取数据失败:', result.reason);
      }
    }
  }

  console.log(`[加班统计] 共获取到 ${results.length} 条数据`);
  return results;
}

async function handleGetOvertimeStats(staffId?: string): Promise<MessageResponse> {
  try {
    console.log('[加班统计] 开始处理请求，staffId:', staffId);

    if (!staffId) {
      console.warn('[加班统计] staffId 为空');
      return {
        success: false,
        error: '无法获取工号，请确认已登录系统',
      };
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const today = now.getDate();

    console.log(`[加班统计] 当前日期: ${year}年${month}月${today}日`);

    const days = getDaysArray(year, month).filter((_, index) => index < today);
    console.log(`[加班统计] 需要获取 ${days.length} 天的数据:`, days);

    const results = await fetchWithConcurrency(staffId, days);

    const validRecords = results
      .filter((r) => r.data && r.data.length > 0)
      .map((r) => r.data[0]);

    console.log(`[加班统计] 有效打卡记录: ${validRecords.length} 条`);
    console.log('[加班统计] 打卡记录详情:', validRecords);

    const stats = calculateOvertime(validRecords);

    console.log('[加班统计] 计算结果:', {
      workTime: stats.workTime,
      weekTime: stats.weekTime,
      allTime: stats.allTime,
      detailCount: stats.detailList.length,
    });

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error('[加班统计] 处理请求失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取数据失败',
    };
  }
}
