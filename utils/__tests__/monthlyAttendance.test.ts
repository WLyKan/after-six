import { describe, expect, it, vi } from 'vitest';
import {
  getCachedAttendanceMonths,
  getAttendanceMonthCacheKey,
  getAttendanceHistory,
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
    get: vi.fn(async (key: string | null) => key === null ? store : { [key]: store[key] }),
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

  it('force refresh skips cached records and overwrites the monthly cache', async () => {
    const cacheKey = getAttendanceMonthCacheKey('staff-1', 2026, 6);
    const cachedRecord = createRecord('2026-06-01');
    const freshRecord = {
      ...createRecord('2026-06-01'),
      xb_dk_time: '2026-06-01 21:00:00',
    };
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
    const fetchDaily = vi.fn<[], Promise<ApiResponse>>()
      .mockResolvedValueOnce({ data: [freshRecord] });
    const now = new Date('2026-06-01T12:00:00.000Z');

    const result = await getMonthlyAttendanceRecords({
      staffId: 'staff-1',
      year: 2026,
      month: 6,
      storage,
      fetchDaily,
      now,
      forceRefresh: true,
    });

    expect(result.cacheHit).toBe(false);
    expect(result.fetchedAt).toBe(now.toISOString());
    expect(result.records).toEqual([freshRecord]);
    expect(fetchDaily).toHaveBeenCalledTimes(1);
    expect(storage.set).toHaveBeenCalledWith({
      [cacheKey]: expect.objectContaining({
        records: [freshRecord],
        fetchedAt: now.toISOString(),
      }),
    });
  });

  it('lists cached attendance months for one staff and returns computed history', async () => {
    const juneKey = getAttendanceMonthCacheKey('staff-1', 2026, 6);
    const mayKey = getAttendanceMonthCacheKey('staff-1', 2026, 5);
    const otherStaffKey = getAttendanceMonthCacheKey('staff-2', 2026, 6);
    const storage = createStorage({
      [juneKey]: {
        staffId: 'staff-1',
        year: 2026,
        month: 6,
        records: [createRecord('2026-06-01')],
        fetchedAt: '2026-06-02T00:00:00.000Z',
        source: 'ehr',
      },
      [mayKey]: {
        staffId: 'staff-1',
        year: 2026,
        month: 5,
        records: [createRecord('2026-05-01'), createRecord('2026-05-02')],
        fetchedAt: '2026-05-03T00:00:00.000Z',
        source: 'ehr',
      },
      [otherStaffKey]: {
        staffId: 'staff-2',
        year: 2026,
        month: 6,
        records: [createRecord('2026-06-01')],
        fetchedAt: '2026-06-02T00:00:00.000Z',
        source: 'ehr',
      },
    });

    const months = await getCachedAttendanceMonths(storage, 'staff-1');
    const history = getAttendanceHistory(months);

    expect(months.map((item) => `${item.year}-${item.month}`)).toEqual(['2026-5', '2026-6']);
    expect(history).toHaveLength(2);
    expect(history[0]).toEqual(expect.objectContaining({
      month: '2026-05',
      label: '5月',
      recordCount: 2,
    }));
    expect(history[1]).toEqual(expect.objectContaining({
      month: '2026-06',
      label: '6月',
      recordCount: 1,
    }));
  });
});
