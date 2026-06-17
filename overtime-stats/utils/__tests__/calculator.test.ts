import { describe, it, expect } from 'vitest';
import { calculateOvertime } from '../calculator';
import type { AttendanceRecord } from '../../types';

describe('calculateOvertime', () => {
  it('should return zero stats for empty records', () => {
    const result = calculateOvertime([]);
    expect(result.workTime).toBe(0);
    expect(result.weekTime).toBe(0);
    expect(result.allTime).toBe(0);
    expect(result.detailList).toHaveLength(0);
  });

  it('should calculate workday overtime correctly', () => {
    const records: AttendanceRecord[] = [
      {
        work_day: '2026-6-1',
        datetypename: '工作日',
        sb_dk_time: '2026-6-1 08:30:00',
        xb_dk_time: '2026-6-1 20:00:00',
        sb_dk_time2: null,
        xb_dk_time2: null,
        sb_dk_time3: null,
        xb_dk_time3: null,
      },
    ];

    const result = calculateOvertime(records);
    expect(result.workTime).toBeGreaterThan(0);
    expect(result.weekTime).toBe(0);
  });

  it('should calculate weekend overtime correctly', () => {
    const records: AttendanceRecord[] = [
      {
        work_day: '2026-6-7',
        datetypename: '休息日',
        sb_dk_time: '2026-6-7 09:00:00',
        xb_dk_time: '2026-6-7 18:00:00',
        sb_dk_time2: null,
        xb_dk_time2: null,
        sb_dk_time3: null,
        xb_dk_time3: null,
      },
    ];

    const result = calculateOvertime(records);
    expect(result.workTime).toBe(0);
    expect(result.weekTime).toBeGreaterThan(0);
  });
});
