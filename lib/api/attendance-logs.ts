import apiClient from "./client";

export type AttendanceLogStatus = "SUCCESS" | "ERROR";

export interface AttendanceLogItem {
  id: string;
  uid?: number | null;
  studentId?: string | null;
  studentCode?: string | null;
  studentName?: string | null;
  examSessionId?: string | null;
  status: AttendanceLogStatus;
  confidence?: number | null;
  isCorrectRoom?: boolean | null;
  timestamp: string;
  message?: string | null;
  deviceId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceLogsResponse {
  data: AttendanceLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AttendanceLogsParams {
  page?: number;
  limit?: number;
  studentId?: string;
  studentCode?: string;
  examSessionId?: string;
  deviceId?: string;
  status?: AttendanceLogStatus;
  isCorrectRoom?: boolean;
  fromTime?: string;
  toTime?: string;
}

export const attendanceLogsApi = {
  list: async (params?: AttendanceLogsParams): Promise<AttendanceLogsResponse> => {
    const response = await apiClient.get<AttendanceLogsResponse>("/admin/attendance-logs", { params });
    return (response.data as any)?.data ? (response.data as any) : {
      data: [],
      total: 0,
      page: params?.page || 1,
      limit: params?.limit || 20,
      totalPages: 0,
    };
  },
};
