import type { AttendanceRecord, OvertimeDetail, OvertimeStats } from '../types';

function timeToString(time: number): string {
  const second = Math.floor((time / 1000) % 60);
  const minute = Math.floor(((time / 1000) - second) / 60) % 60;
  const hour = Math.floor(((time / 1000) - second) / 60 - minute) / 60;

  return `${hour}小时${minute}分钟`;
}

export function calculateOvertime(records: AttendanceRecord[]): OvertimeStats {
  let workTime = 0;
  let weekTime = 0;
  const detailList: OvertimeDetail[] = [];

  for (const day of records) {
    const { work_day, datetypename, sb_dk_time, xb_dk_time } = day;
    const time8 = new Date(`${work_day} 08:00:00`);
    const time9 = new Date(`${work_day} 09:00:00`);

    const actualSbDk = sb_dk_time || day.sb_dk_time2 || day.sb_dk_time3;
    const actualXbDk = xb_dk_time || day.xb_dk_time2 || day.xb_dk_time3;

    if (actualSbDk && actualXbDk) {
      const minStartTime = new Date(`${work_day} 17:30:00`);
      const maxStartTime = new Date(`${work_day} 18:30:00`);
      const sbdkTime = new Date(actualSbDk);
      const xbdkTime = new Date(actualXbDk);

      // Skip if clock-out is before clock-in (malformed data)
      if (xbdkTime <= sbdkTime) continue;

      if (datetypename === '工作日') {
        let startTime: Date;
        if (sbdkTime <= time8) {
          startTime = minStartTime;
        } else if (sbdkTime >= time9) {
          startTime = maxStartTime;
        } else {
          startTime = new Date(minStartTime.getTime() + (sbdkTime.getTime() - time8.getTime()));
        }

        const sum = xbdkTime.getTime() - startTime.getTime();
        detailList.push({
          work_day,
          datetypename,
          sb_dk_time: actualSbDk,
          xb_dk_time: actualXbDk,
          type: 0,
          typename: '平时',
          startTime: startTime.toISOString(),
          sum,
          sumString: sum > 0 ? timeToString(sum) : '0',
        });
      } else if (datetypename === '休息日' || datetypename === '法定节日') {
        const sum = xbdkTime.getTime() - sbdkTime.getTime();
        detailList.push({
          work_day,
          datetypename,
          sb_dk_time: actualSbDk,
          xb_dk_time: actualXbDk,
          type: 1,
          typename: '周末',
          startTime: sbdkTime.toISOString(),
          sum,
          sumString: sum > 0 ? timeToString(sum) : '0',
        });
      } else {
        if (sbdkTime < new Date(`${work_day} 18:00:00`)) {
          const sum = xbdkTime.getTime() - maxStartTime.getTime();
          detailList.push({
            work_day,
            datetypename,
            sb_dk_time: actualSbDk,
            xb_dk_time: actualXbDk,
            type: 0,
            typename: '平时',
            startTime: maxStartTime.toISOString(),
            sum,
            sumString: sum > 0 ? timeToString(sum) : '0',
          });
        }
      }
    }
  }

  detailList.forEach((item) => {
    if (item.type === 0 && item.sum > 0) {
      workTime += item.sum;
    }
    if (item.type === 1 && item.sum > 0) {
      weekTime += item.sum;
    }
  });

  return {
    workTime,
    weekTime,
    allTime: workTime + weekTime,
    detailList,
  };
}

export function getDaysArray(year: number, month: number): string[] {
  const currentMonth = new Date(year, month, 0);
  const dayCount = currentMonth.getDate();
  const dayArray: string[] = [];

  for (let day = 1; day <= dayCount; day++) {
    dayArray.push(`${year}-${month}-${day}`);
  }

  return dayArray;
}

export { timeToString };
