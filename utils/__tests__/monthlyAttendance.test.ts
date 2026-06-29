import { describe, expect, it, vi } from 'vitest';
import {
  getAttendanceMonthCacheKey,
  getMonthlyAttendanceRecords,
  type AttendanceMonthCache,
  type AttendanceMonthStorage,
} from '../monthlyAttendance';
import type { ApiResponse, AttendanceRecord } from '../../types';

function createRecord(workDay: string): AttendanceRecord {
  return {
    work_day: workDay,
    datetypename: '工作日',
    sb_dk_time: `${workDay} 08:30:00`,
    xb_dk_time: `${workDay} 20:00:00`,
    sb_dk_time2: null,
    xb_dk_time2: null,
    sb_dk_time3: null,
    xb_dk_time3: null,
  };
}

function createStorage(initial: Record<string, AttendanceMonthCache> = {}): AttendanceMonthStorage {
  const store = { ...initial };

  return {
    get: vi.fn(async (key: string) => ({ [key]: store[key] })),
    set: vi.fn(async (items: Record<string, AttendanceMonthCache>) => {
      Object.assign(store, items);
    }),
  };
}

describe('getMonthlyAttendanceRecords', () => {
  it('returns cached monthly attendance records without fetching online data', async () => {
    const cacheKey = getAttendanceMonthCacheKey('staff-1', 2026, 6);
    const cachedRecord = createRecord('2026-06-01');
    const storage = createStorage({
      [cacheKey]: {
        staffId: 'staff-1',
        year: 2026,
        month: 6,
        records: [cachedRecord],
        fetchedAt: '2026-06-02T00:00:00.000Z',
        source: 'ehr',
      },
    });
    const fetchDaily = vi.fn();

    const result = await getMonthlyAttendanceRecords({
      staffId: 'staff-1',
      year: 2026,
      month: 6,
      storage,
      fetchDaily,
      now: new Date('2026-06-15T12:00:00'),
    });

    expect(result.cacheHit).toBe(true);
    expect(result.records).toEqual([cachedRecord]);
    expect(fetchDaily).not.toHaveBeenCalled();
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('fetches online data and persists valid monthly attendance records when cache is missing', async () => {
    const storage = createStorage();
    const firstRecord = createRecord('2026-06-01');
    const secondRecord = createRecord('2026-06-02');
    const fetchDaily = vi.fn<[], Promise<ApiResponse>>()
      .mockResolvedValueOnce({ data: [firstRecord] })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [secondRecord] });

    const result = await getMonthlyAttendanceRecords({
      staffId: 'staff-1',
      year: 2026,
      month: 6,
      storage,
      fetchDaily,
      now: new Date('2026-06-03T12:00:00'),
    });

    const cacheKey = getAttendanceMonthCacheKey('staff-1', 2026, 6);
    expect(result.cacheHit).toBe(false);
    expect(result.records).toEqual([firstRecord, secondRecord]);
    expect(fetchDaily).toHaveBeenCalledTimes(3);
    expect(storage.set).toHaveBeenCalledWith({
      [cacheKey]: expect.objectContaining({
        staffId: 'staff-1',
        year: 2026,
        month: 6,
        records: [firstRecord, secondRecord],
        source: 'ehr',
      }),
    });
  });
});
