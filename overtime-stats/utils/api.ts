import type { ApiResponse } from '../types';

export async function fetchDailyAttendance(
  staffId: string,
  date: string
): Promise<ApiResponse> {
  const url = `https://ehr.supcon.com/RedseaPlatform/redmagicapi/rf_s_kq_count_SelectStaffIDDaily/redApiExec.mc?staff_id=${staffId}&work_day=${date}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
  });

  return response.json();
}
