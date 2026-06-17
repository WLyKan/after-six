// 打卡记录响应
export interface AttendanceRecord {
  work_day: string;
  datetypename: string;
  sb_dk_time: string | null;
  xb_dk_time: string | null;
  sb_dk_time2: string | null;
  xb_dk_time2: string | null;
  sb_dk_time3: string | null;
  xb_dk_time3: string | null;
}

// API响应
export interface ApiResponse {
  data: AttendanceRecord[];
}

// 加班明细
export interface OvertimeDetail {
  work_day: string;
  datetypename: string;
  sb_dk_time: string | null;
  xb_dk_time: string | null;
  type: number; // 0: 平时, 1: 周末
  typename: string;
  startTime: string;
  sum: number; // 毫秒
  sumString: string;
}

// 加班统计结果
export interface OvertimeStats {
  workTime: number; // 工作日加班（毫秒）
  weekTime: number; // 周末加班（毫秒）
  allTime: number; // 总加班（毫秒）
  detailList: OvertimeDetail[];
}

// 消息类型
export interface MessageRequest {
  action: 'getOvertimeStats';
}

export interface MessageResponse {
  success: boolean;
  data?: OvertimeStats;
  error?: string;
}
