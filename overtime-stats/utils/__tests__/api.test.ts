import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchDailyAttendance } from '../api';

describe('fetchDailyAttendance', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call correct URL', async () => {
    const mockResponse = { data: [] };
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockResponse),
    });

    const result = await fetchDailyAttendance('12345', '2026-6-1');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('staff_id=12345'),
      expect.any(Object)
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('work_day=2026-6-1'),
      expect.any(Object)
    );
    expect(result).toEqual(mockResponse);
  });
});
