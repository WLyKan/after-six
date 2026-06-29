import type { ApiResponse, AttendanceRecord, AttendanceMonthCache } from '../types';
import { getDaysArray } from './calculator';

const CACHE_PREFIX = 'attendance';

export interface AttendanceMonthStorage {
  get(key: string): Promise<Record<string, AttendanceMonthCache | undefined>>;
  set(items: Record<string, AttendanceMonthCache>): Promise<void>;
}

interface GetMonthlyAttendanceRecordsOptions {
  staffId: string;
  year: number;
  month: number;
  storage: AttendanceMonthStorage;
  fetchDaily: (staffId: string, day: string) => Promise<ApiResponse>;
  now?: Date;
}

export function getAttendanceMonthCacheKey(staffId: string, year: number, month: number): string {
  return `${CACHE_PREFIX}:${staffId}:${year}-${String(month).padStart(2, '0')}`;
}

function getDaysToFetch(year: number, month: number, now: Date): string[] {
  const allDays = getDaysArray(year, month);
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  if (!isCurrentMonth) return allDays;

  return allDays.filter((_, index) => index < now.getDate());
}

function isValidCache(value: AttendanceMonthCache | undefined, staffId: string, year: number, month: number): value is AttendanceMonthCache {
  return Boolean(
    value &&
      value.staffId === staffId &&
      value.year === year &&
      value.month === month &&
      Array.isArray(value.records)
  );
}

export async function getMonthlyAttendanceRecords({
  staffId,
  year,
  month,
  storage,
  fetchDaily,
  now = new Date(),
}: GetMonthlyAttendanceRecordsOptions): Promise<{ records: AttendanceRecord[]; cacheHit: boolean; cacheKey: string }> {
  const cacheKey = getAttendanceMonthCacheKey(staffId, year, month);
  const cached = await storage.get(cacheKey);
  const cachedMonth = cached[cacheKey];

  if (isValidCache(cachedMonth, staffId, year, month)) {
    return {
      records: cachedMonth.records,
      cacheHit: true,
      cacheKey,
    };
  }

  const days = getDaysToFetch(year, month, now);
  const results = await Promise.allSettled(days.map((day) => fetchDaily(staffId, day)));
  const records = results.flatMap((result) => {
    if (result.status === 'rejected') return [];
    const firstRecord = result.value.data?.[0];
    return firstRecord ? [firstRecord] : [];
  });

  await storage.set({
    [cacheKey]: {
      staffId,
      year,
      month,
      records,
      fetchedAt: now.toISOString(),
      source: 'ehr',
    },
  });

  return {
    records,
    cacheHit: false,
    cacheKey,
  };
}
