import { describe, expect, it } from 'vitest';
import {
  buildCompensatoryLeaveRecords,
  buildHistoricalCompensatoryLeaveUsages,
  createBalanceCalibrationUsage,
  createCompensatoryUsage,
  getCompensatoryUsageStorageKey,
  getRemainingCompensatoryHours,
  normalizeCompensatoryUsages,
  type CompensatoryLeaveUsage,
} from '../compensatoryLeave';
import type { AttendanceHistoryMonth } from '../monthlyAttendance';
import type { AttendanceMonthCache, AttendanceRecord } from '../../types';

function createHistoryMonth(month: string, hours: number): AttendanceHistoryMonth {
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthNumber = Number(monthText);

  return {
    month,
    label: `${monthNumber}月`,
    year,
    monthNumber,
    hours,
    weekendHours: 0,
    workdayHours: hours,
    recordCount: 1,
    fetchedAt: `${month}-01T00:00:00.000Z`,
  };
}

function createCache(month: string, records: AttendanceRecord[]): AttendanceMonthCache {
  const [yearText, monthText] = month.split('-');

  return {
    staffId: 'staff-1',
    year: Number(yearText),
    month: Number(monthText),
    records,
    fetchedAt: `${month}-01T00:00:00.000Z`,
    source: 'ehr',
  };
}

function createRecord(workDay: string, overrides: Partial<AttendanceRecord> = {}): AttendanceRecord {
  return {
    work_day: workDay,
    datetypename: '工作日',
    sb_dk_time: `${workDay} 08:30:00`,
    xb_dk_time: `${workDay} 17:30:00`,
    sb_dk_time2: null,
    xb_dk_time2: null,
    sb_dk_time3: null,
    xb_dk_time3: null,
    qj_total_min: 0,
    abnormal_name: '加班',
    abnormal_type: '12',
    sub_type: '1',
    ...overrides,
  };
}

describe('buildCompensatoryLeaveRecords', () => {
  it('uses 30 hours per leave day before September 2025', () => {
    const records = buildCompensatoryLeaveRecords(
      [createHistoryMonth('2025-08', 61)],
      new Date('2025-09-01T00:00:00')
    );

    expect(records).toEqual([
      expect.objectContaining({
        sourceMonth: '2025-08',
        overtimeHours: 61,
        thresholdHours: 30,
        hours: 15,
        usedHours: 0,
        expiryDate: '2026-03-31',
        status: 'active',
      }),
    ]);
  });

  it('uses 40 hours per leave day from September 2025', () => {
    const records = buildCompensatoryLeaveRecords(
      [
        createHistoryMonth('2025-09', 39.9),
        createHistoryMonth('2025-10', 80),
      ],
      new Date('2025-11-01T00:00:00')
    );

    expect(records).toHaveLength(1);
    expect(records[0]).toEqual(expect.objectContaining({
      sourceMonth: '2025-10',
      thresholdHours: 40,
      hours: 15,
      expiryDate: '2026-03-31',
      status: 'active',
    }));
  });

  it('marks leave as expired after March of the next year', () => {
    const records = buildCompensatoryLeaveRecords(
      [createHistoryMonth('2024-12', 30)],
      new Date('2026-04-01T00:00:00')
    );

    expect(records[0]).toEqual(expect.objectContaining({
      sourceMonth: '2024-12',
      expiryDate: '2025-03-31',
      status: 'expired',
    }));
  });

  it('keeps only 10 active hours and marks older valid leave as used', () => {
    const grants = buildCompensatoryLeaveRecords(
      [
        createHistoryMonth('2025-09', 40),
        createHistoryMonth('2025-10', 80),
      ],
      new Date('2025-11-01T00:00:00')
    );
    const usage = createCompensatoryUsage({
      records: grants,
      existingUsages: [],
      usedDate: '2025-11-01',
      hours: 12.5,
      note: '历史调休已使用校准',
      createdAt: '2025-11-01T00:00:00.000Z',
      id: 'usage-1',
    });
    const records = buildCompensatoryLeaveRecords(
      [
        createHistoryMonth('2025-09', 40),
        createHistoryMonth('2025-10', 80),
      ],
      new Date('2025-11-01T00:00:00'),
      [usage]
    );

    expect(records).toEqual([
      expect.objectContaining({
        sourceMonth: '2025-09',
        hours: 7.5,
        usedHours: 7.5,
        status: 'used',
      }),
      expect.objectContaining({
        sourceMonth: '2025-10',
        hours: 15,
        usedHours: 5,
        status: 'active',
      }),
    ]);
  });

  it('allocates new usage to earliest expiring active leave first', () => {
    const records = buildCompensatoryLeaveRecords(
      [
        createHistoryMonth('2025-09', 40),
        createHistoryMonth('2025-10', 80),
      ],
      new Date('2025-11-01T00:00:00')
    );

    const usage = createCompensatoryUsage({
      records,
      existingUsages: [],
      usedDate: '2025-11-20',
      hours: 10,
      note: '调休',
      createdAt: '2025-11-20T08:00:00.000Z',
      id: 'usage-1',
    });

    expect(usage.allocations).toEqual([
      { grantId: '2025-09', hours: 7.5 },
      { grantId: '2025-10', hours: 2.5 },
    ]);

    const updatedRecords = buildCompensatoryLeaveRecords(
      [
        createHistoryMonth('2025-09', 40),
        createHistoryMonth('2025-10', 80),
      ],
      new Date('2025-11-21T00:00:00'),
      [usage]
    );

    expect(getRemainingCompensatoryHours(updatedRecords)).toBe(12.5);
    expect(updatedRecords[0]).toEqual(expect.objectContaining({ usedHours: 7.5, status: 'used' }));
    expect(updatedRecords[1]).toEqual(expect.objectContaining({ usedHours: 2.5, status: 'active' }));
  });

  it('rejects usage that exceeds current active balance', () => {
    const records = buildCompensatoryLeaveRecords(
      [createHistoryMonth('2025-10', 40)],
      new Date('2025-11-01T00:00:00')
    );

    expect(() => createCompensatoryUsage({
      records,
      existingUsages: [],
      usedDate: '2025-11-20',
      hours: 8,
      note: '',
    })).toThrow('调休余额不足');
  });

  it('ignores invalid persisted usages and builds staff specific storage key', () => {
    const usages: CompensatoryLeaveUsage[] = [
      {
        id: 'usage-1',
        usedDate: '2025-11-20',
        hours: 7.5,
        note: '调休',
        allocations: [{ grantId: '2025-10', hours: 7.5 }],
        createdAt: '2025-11-20T08:00:00.000Z',
      },
    ];

    expect(getCompensatoryUsageStorageKey('staff-1')).toBe('compensatory-usages:staff-1');
    expect(normalizeCompensatoryUsages([...usages, { id: 'bad' }])).toEqual(usages);
  });

  it('creates an initial calibration usage to keep 10 active hours', () => {
    const records = buildCompensatoryLeaveRecords(
      [
        createHistoryMonth('2025-09', 40),
        createHistoryMonth('2025-10', 80),
      ],
      new Date('2025-11-01T00:00:00')
    );

    const usage = createBalanceCalibrationUsage(records, 10, '2025-11-01T00:00:00.000Z');

    expect(usage).toEqual(expect.objectContaining({
      id: 'initial-balance-calibration',
      usedDate: '2025-11-01',
      hours: 12.5,
      note: '历史调休余额校准，保留当前有效余额 10h',
    }));
    expect(usage?.allocations).toEqual([
      { grantId: '2025-09', hours: 7.5 },
      { grantId: '2025-10', hours: 5 },
    ]);
  });

  it('builds historical leave usages from qj_total_min records', () => {
    const records = buildCompensatoryLeaveRecords(
      [
        createHistoryMonth('2025-07', 60),
        createHistoryMonth('2025-08', 30),
      ],
      new Date('2025-09-01T00:00:00')
    );
    const caches = [
      createCache('2025-08', [
        createRecord('2025-08-06', {
          abnormal_name: '加班',
          abnormal_type: '12',
          sub_type: '1',
          qj_total_min: 150,
        }),
        createRecord('2025-08-07', { qj_total_min: 0 }),
      ]),
    ];

    const usages = buildHistoricalCompensatoryLeaveUsages(caches, records);

    expect(usages).toEqual([
      expect.objectContaining({
        id: 'history-leave:2025-08-06:150',
        usedDate: '2025-08-06',
        hours: 2.5,
        note: '历史考勤识别：调休假',
        source: 'history',
      }),
    ]);
    expect(usages[0].allocations).toEqual([{ grantId: '2025-07', hours: 2.5 }]);
  });

  it('uses historical leave usages to reduce remaining balance', () => {
    const baseRecords = buildCompensatoryLeaveRecords(
      [createHistoryMonth('2025-07', 60)],
      new Date('2025-09-01T00:00:00')
    );
    const usages = buildHistoricalCompensatoryLeaveUsages([
      createCache('2025-08', [
        createRecord('2025-08-06', { qj_total_min: 150 }),
        createRecord('2025-08-08', { abnormal_name: '请假', abnormal_type: '6', sub_type: '11', qj_total_min: 300 }),
      ]),
    ], baseRecords);

    const updatedRecords = buildCompensatoryLeaveRecords(
      [createHistoryMonth('2025-07', 60)],
      new Date('2025-09-01T00:00:00'),
      usages
    );

    expect(usages.map((usage) => usage.hours)).toEqual([2.5, 5]);
    expect(getRemainingCompensatoryHours(updatedRecords)).toBe(7.5);
  });
});
