import { useEffect, useState } from 'react';
import { calculateOvertime } from '../../../utils/calculator';
import { getAttendanceHistory, getCachedAttendanceMonths } from '../../../utils/monthlyAttendance';
import type { AttendanceMonthCache } from '../../../types';
import { getAchievements, type Achievement, type AchievementMetrics } from '../components/AchievementSystem';

function toHours(time: number) {
  return Number((time / 1000 / 60 / 60).toFixed(1));
}

function getDayTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getMaxConsecutiveDays(days: string[]) {
  const timestamps = Array.from(new Set(days))
    .map((day) => new Date(`${day} 00:00:00`).getTime())
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => a - b);
  let max = 0;
  let current = 0;
  let previous: number | null = null;

  for (const timestamp of timestamps) {
    if (previous !== null && timestamp - previous === 24 * 60 * 60 * 1000) {
      current += 1;
    } else {
      current = 1;
    }
    max = Math.max(max, current);
    previous = timestamp;
  }

  return max;
}

function buildMetrics(caches: AttendanceMonthCache[]): AchievementMetrics {
  const history = getAttendanceHistory(caches);
  const latest = history.at(-1);
  const previous = history.at(-2);
  const records = caches.flatMap((cache) => cache.records);
  const allStats = calculateOvertime(records);
  const overtimeDetails = allStats.detailList.filter((detail) => detail.sum > 0);
  const earlyPunchDays = records.filter((record) => {
    const start = getDayTime(record.sb_dk_time || record.sb_dk_time2 || record.sb_dk_time3);
    return start ? start.getHours() < 8 : false;
  }).length;
  const latePunchDays = overtimeDetails
    .filter((detail) => {
      const end = getDayTime(detail.xb_dk_time);
      return end ? end.getHours() >= 22 : false;
    })
    .map((detail) => detail.work_day);
  const balancedMonthStreak = [...history].reverse().findIndex((item) => item.hours >= 20);
  const latestReductionPercent = previous && previous.hours > 0
    ? Math.max(0, Math.round(((previous.hours - (latest?.hours || 0)) / previous.hours) * 100))
    : 0;

  return {
    currentMonthHours: latest?.hours || 0,
    maxWeekendHours: history.reduce((max, item) => Math.max(max, item.weekendHours), 0),
    totalHours: toHours(allStats.allTime),
    totalRecords: overtimeDetails.length,
    balancedMonthStreak: balancedMonthStreak === -1 ? history.length : balancedMonthStreak,
    latestReductionPercent,
    hotStreakDays: getMaxConsecutiveDays(overtimeDetails.map((detail) => detail.work_day)),
    earlyPunchDays,
    latePunchStreakDays: getMaxConsecutiveDays(latePunchDays),
    hasNewYearRecord: overtimeDetails.some((detail) => detail.work_day.endsWith('-01-01')),
  };
}

export function useAchievementState(): { achievements: Achievement[]; completionRate: number; loaded: boolean } {
  const [items, setItems] = useState<Achievement[]>(getAchievements());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadAchievements() {
      try {
        if (typeof browser === 'undefined' || !browser.storage?.local) {
          setItems(getAchievements());
          return;
        }
        const cached = await browser.storage.local.get('staffId');
        const staffId = typeof cached.staffId === 'string' ? cached.staffId : undefined;
        const months = await getCachedAttendanceMonths(browser.storage.local, staffId);
        setItems(getAchievements(buildMetrics(months)));
      } finally {
        setLoaded(true);
      }
    }

    loadAchievements();
  }, []);

  const unlockedCount = items.filter((item) => item.isUnlocked).length;
  const completionRate = items.length > 0 ? Math.round((unlockedCount / items.length) * 100) : 0;

  return {
    achievements: items,
    completionRate,
    loaded,
  };
}
