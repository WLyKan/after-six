import type { AttendanceHistoryMonth } from './monthlyAttendance';

export const COMPENSATORY_LEAVE_HOURS_PER_DAY = 7.5;
export const COMPENSATORY_LEAVE_POLICY_CHANGE_MONTH = '2025-09';
export const INITIAL_EFFECTIVE_COMPENSATORY_LEAVE_HOURS = 10;
const USAGE_STORAGE_PREFIX = 'compensatory-usages';

export interface CompensatoryLeaveAllocation {
  grantId: string;
  hours: number;
}

export interface CompensatoryLeaveUsage {
  id: string;
  usedDate: string;
  hours: number;
  note: string;
  allocations: CompensatoryLeaveAllocation[];
  createdAt: string;
}

export interface CompensatoryLeaveRecord {
  id: string;
  sourceMonth: string;
  overtimeHours: number;
  thresholdHours: number;
  hours: number;
  usedHours: number;
  notes: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'used';
}

interface CreateCompensatoryUsageOptions {
  records: CompensatoryLeaveRecord[];
  existingUsages: CompensatoryLeaveUsage[];
  usedDate: string;
  hours: number;
  note: string;
  id?: string;
  createdAt?: string;
}

function getCompensatoryThreshold(year: number, month: number): number {
  if (year < 2025 || (year === 2025 && month < 9)) {
    return 30;
  }

  return 40;
}

function getExpiryDate(year: number): string {
  return `${year + 1}-03-31`;
}

function isExpired(expiryDate: string, now: Date): boolean {
  const expiryEnd = new Date(`${expiryDate}T23:59:59`);
  return expiryEnd.getTime() < now.getTime();
}

function roundHours(hours: number): number {
  return Number(hours.toFixed(1));
}

function getAllocatedHoursByGrant(usages: CompensatoryLeaveUsage[]): Map<string, number> {
  const allocated = new Map<string, number>();

  for (const usage of usages) {
    for (const allocation of usage.allocations) {
      allocated.set(allocation.grantId, roundHours((allocated.get(allocation.grantId) ?? 0) + allocation.hours));
    }
  }

  return allocated;
}

function applyUsageRecords(records: CompensatoryLeaveRecord[], usages: CompensatoryLeaveUsage[]): CompensatoryLeaveRecord[] {
  const allocated = getAllocatedHoursByGrant(usages);

  return records.map((record) => {
    const usedHours = Math.min(record.hours, allocated.get(record.id) ?? 0);
    const remainingHours = roundHours(record.hours - usedHours);
    const status = record.status === 'expired'
      ? 'expired'
      : remainingHours > 0
        ? 'active'
        : 'used';

    return { ...record, usedHours: roundHours(usedHours), status };
  });
}

export function buildCompensatoryLeaveRecords(
  history: AttendanceHistoryMonth[],
  now = new Date(),
  usages: CompensatoryLeaveUsage[] = []
): CompensatoryLeaveRecord[] {
  const records = history.flatMap((item) => {
    const thresholdHours = getCompensatoryThreshold(item.year, item.monthNumber);
    const earnedDays = Math.floor(item.hours / thresholdHours);

    if (earnedDays <= 0) return [];

    const hours = earnedDays * COMPENSATORY_LEAVE_HOURS_PER_DAY;
    const expiryDate = getExpiryDate(item.year);

    return [{
      id: item.month,
      sourceMonth: item.month,
      overtimeHours: item.hours,
      thresholdHours,
      hours,
      usedHours: 0,
      notes: `当月加班 ${item.hours}h，按满 ${thresholdHours}h/天折算，获得 ${earnedDays} 天调休`,
      expiryDate,
      status: isExpired(expiryDate, now) ? 'expired' : 'active',
    }];
  });

  return applyUsageRecords(records, usages);
}

export function getRemainingCompensatoryHours(records: CompensatoryLeaveRecord[]): number {
  return roundHours(records
    .filter((record) => record.status === 'active')
    .reduce((sum, record) => sum + (record.hours - record.usedHours), 0));
}

export function createCompensatoryUsage({
  records,
  usedDate,
  hours,
  note,
  id = crypto.randomUUID(),
  createdAt = new Date().toISOString(),
}: CreateCompensatoryUsageOptions): CompensatoryLeaveUsage {
  if (!usedDate) {
    throw new Error('请选择使用日期');
  }

  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error('请输入有效的使用时长');
  }

  const remainingBalance = getRemainingCompensatoryHours(records);

  if (hours > remainingBalance) {
    throw new Error('调休余额不足');
  }

  let hoursToAllocate = hours;
  const allocations: CompensatoryLeaveAllocation[] = [];
  const activeRecords = records
    .filter((record) => record.status === 'active' && record.hours > record.usedHours)
    .sort((a, b) => {
      const expiryCompare = a.expiryDate.localeCompare(b.expiryDate);
      return expiryCompare === 0 ? a.sourceMonth.localeCompare(b.sourceMonth) : expiryCompare;
    });

  for (const record of activeRecords) {
    if (hoursToAllocate <= 0) break;

    const recordRemainingHours = roundHours(record.hours - record.usedHours);
    const allocatedHours = Math.min(recordRemainingHours, hoursToAllocate);

    allocations.push({
      grantId: record.id,
      hours: roundHours(allocatedHours),
    });
    hoursToAllocate = roundHours(hoursToAllocate - allocatedHours);
  }

  return {
    id,
    usedDate,
    hours: roundHours(hours),
    note,
    allocations,
    createdAt,
  };
}

export function createBalanceCalibrationUsage(
  records: CompensatoryLeaveRecord[],
  targetRemainingHours = INITIAL_EFFECTIVE_COMPENSATORY_LEAVE_HOURS,
  createdAt = new Date().toISOString()
): CompensatoryLeaveUsage | null {
  const remainingHours = getRemainingCompensatoryHours(records);
  const hoursToUse = roundHours(remainingHours - targetRemainingHours);

  if (hoursToUse <= 0) return null;

  return createCompensatoryUsage({
    records,
    existingUsages: [],
    usedDate: createdAt.slice(0, 10),
    hours: hoursToUse,
    note: `历史调休余额校准，保留当前有效余额 ${targetRemainingHours}h`,
    id: 'initial-balance-calibration',
    createdAt,
  });
}

export function normalizeCompensatoryUsages(value: unknown): CompensatoryLeaveUsage[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is CompensatoryLeaveUsage => {
    if (!item || typeof item !== 'object') return false;
    const usage = item as CompensatoryLeaveUsage;

    return Boolean(
      typeof usage.id === 'string' &&
        typeof usage.usedDate === 'string' &&
        typeof usage.hours === 'number' &&
        typeof usage.note === 'string' &&
        typeof usage.createdAt === 'string' &&
        Array.isArray(usage.allocations) &&
        usage.allocations.every((allocation) => (
          allocation &&
          typeof allocation.grantId === 'string' &&
          typeof allocation.hours === 'number'
        ))
    );
  });
}

export function getCompensatoryUsageStorageKey(staffId: string): string {
  return `${USAGE_STORAGE_PREFIX}:${staffId}`;
}
