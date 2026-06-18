import { fetchDailyAttendance } from '../utils/api';
import { calculateOvertime, getDaysArray } from '../utils/calculator';
import type { ApiResponse, MessageRequest, MessageResponse } from '../types';

const BATCH_SIZE = 5;

const EHR_URL = 'https://ehr.supcon.com/RedseaPlatform/jsp/customized/zhongkong/middleJump.jsp?tourl=https%3A%2F%2Fehr.supcon.com%2FRedseaPlatform%2FPtPortal.mc%3Fmethod%3Dclassic%23iframe%260%26nworktoday-40175-99568-54638-53885%26nworktoday-40175-99568-54638%7C%2FRedseaPlatform%2Fjsp%2FkqV2%2Fkqcount%2Fkq_count_calendar.jsp%3FnoNeedStaffId%3D1%26_t%3D1689062111283%26treePermitType%3Dpermit%26useSealTreeData%3D0%26menuName%3D%25E6%2588%2591%25E7%259A%2584%25E6%258E%2592%25E7%258F%25ADV2%26_t%3D1689062111283';

export default defineBackground(() => {
  console.log('[加班统计] Background script 已启动');

  // 点击工具栏图标 → 打开/切换到考勤页面
  browser.action.onClicked.addListener(async () => {
    const pattern = '*://ehr.supcon.com/*';
    const tabs = await browser.tabs.query({ url: pattern });
    if (tabs.length > 0 && tabs[0].id) {
      await browser.tabs.update(tabs[0].id, { active: true });
      if (tabs[0].windowId) {
        await browser.windows.update(tabs[0].windowId, { focused: true });
      }
    } else {
      await browser.tabs.create({ url: EHR_URL });
    }
  });

  browser.runtime.onMessage.addListener(
    (
      request: MessageRequest,
      sender: browser.runtime.MessageSender,
      sendResponse: (response: MessageResponse) => void
    ) => {
      if (request.action === 'getOvertimeStats') {
        console.log('[加班统计] 收到消息请求:', request);
        console.log('[加班统计] 发送者:', sender);

        handleGetOvertimeStats(request.staffId, request.year, request.month)
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

async function handleGetOvertimeStats(staffId?: string, reqYear?: number, reqMonth?: number): Promise<MessageResponse> {
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
    const year = reqYear ?? now.getFullYear();
    const month = reqMonth ?? (now.getMonth() + 1);

    // 如果请求的是当前月份，只取到今天；否则取整月
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    const today = now.getDate();
    const allDays = getDaysArray(year, month);
    const days = isCurrentMonth ? allDays.filter((_, index) => index < today) : allDays;

    console.log(`[加班统计] 请求日期: ${year}年${month}月, 当前月份: ${isCurrentMonth}, 需获取 ${days.length} 天`);
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
