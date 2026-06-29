import type { ApiResponse, AttendanceRecord, AttendanceMonthCache } from '../types';
import { calculateOvertime, getDaysArray } from './calculator';

const CACHE_PREFIX = 'attendance';

export interface AttendanceMonthStorage {
  get(key: string | null): Promise<Record<string, unknown>>;
  set(items: Record<string, AttendanceMonthCache>): Promise<void>;
}

export interface AttendanceHistoryMonth {
  month: string;
  label: string;
  year: number;
  monthNumber: number;
  hours: number;
  weekendHours: number;
  workdayHours: number;
  recordCount: number;
  fetchedAt: string;
}

interface GetMonthlyAttendanceRecordsOptions {
  staffId: string;
  year: number;
  month: number;
  storage: AttendanceMonthStorage;
  fetchDaily: (staffId: string, day: string) => Promise<ApiResponse>;
  now?: Date;
  forceRefresh?: boolean;
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

function isAttendanceMonthCache(value: unknown): value is AttendanceMonthCache {
  if (!value || typeof value !== 'object') return false;
  const cache = value as AttendanceMonthCache;
  return Boolean(
    typeof cache.staffId === 'string' &&
      typeof cache.year === 'number' &&
      typeof cache.month === 'number' &&
      Array.isArray(cache.records) &&
      typeof cache.fetchedAt === 'string' &&
      cache.source === 'ehr'
  );
}

export async function getCachedAttendanceMonths(storage: AttendanceMonthStorage, staffId?: string): Promise<AttendanceMonthCache[]> {
  const stored = await storage.get(null);
  return Object.entries(stored)
    .filter(([key, value]) => key.startsWith(`${CACHE_PREFIX}:`) && isAttendanceMonthCache(value))
    .map(([, value]) => value as AttendanceMonthCache)
    .filter((cache) => !staffId || cache.staffId === staffId)
    .sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year);
}

export function getAttendanceHistory(caches: AttendanceMonthCache[]): AttendanceHistoryMonth[] {
  return caches.map((cache) => {
    const stats = calculateOvertime(cache.records);
    return {
      month: `${cache.year}-${String(cache.month).padStart(2, '0')}`,
      label: `${cache.month}月`,
      year: cache.year,
      monthNumber: cache.month,
      hours: Number((stats.allTime / 1000 / 60 / 60).toFixed(1)),
      weekendHours: Number((stats.weekTime / 1000 / 60 / 60).toFixed(1)),
      workdayHours: Number((stats.workTime / 1000 / 60 / 60).toFixed(1)),
      recordCount: stats.detailList.filter((detail) => detail.sum > 0).length,
      fetchedAt: cache.fetchedAt,
    };
  });
}

export async function getMonthlyAttendanceRecords({
  staffId,
  year,
  month,
  storage,
  fetchDaily,
  now = new Date(),
  forceRefresh = false,
}: GetMonthlyAttendanceRecordsOptions): Promise<{ records: AttendanceRecord[]; cacheHit: boolean; cacheKey: string; fetchedAt?: string }> {
  const cacheKey = getAttendanceMonthCacheKey(staffId, year, month);
  const cached = await storage.get(cacheKey);
  const cachedMonth = cached[cacheKey] as AttendanceMonthCache | undefined;

  if (!forceRefresh && isValidCache(cachedMonth, staffId, year, month)) {
    return {
      records: cachedMonth.records,
      cacheHit: true,
      cacheKey,
      fetchedAt: cachedMonth.fetchedAt,
    };
  }

  const days = getDaysToFetch(year, month, now);
  const results = await Promise.allSettled(days.map((day) => fetchDaily(staffId, day)));
  const records = results.flatMap((result) => {
    if (result.status === 'rejected') return [];
    const firstRecord = result.value.data?.[0];
    return firstRecord ? [firstRecord] : [];
  });

  const fetchedAt = now.toISOString();

  await storage.set({
    [cacheKey]: {
      staffId,
      year,
      month,
      records,
      fetchedAt,
      source: 'ehr',
    },
  });

  return {
    records,
    cacheHit: false,
    cacheKey,
    fetchedAt,
  };
}
