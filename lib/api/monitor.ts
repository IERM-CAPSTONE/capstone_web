import apiClient from "./client";

export interface SessionRoomDetail {
  sessionId: string;
  roomNumber: string;
  proctorName: string | null;
  proctorOnline: boolean;
  hallInvigilatorName: string | null;
  hallInvigilatorOnline: boolean;
  checkedIn: number;
  totalStudents: number;
  pendingTickets: number;
}

export interface SubjectMonitorSummary {
  subjectCode: string;
  examOpenTime: string;
  examCloseTime: string;
  status: string;
  totalProctors: number;
  presentProctors: number;
  totalHallInvigilators: number;
  presentHallInvigilators: number;
  totalStudents: number;
  checkedInStudents: number;
  pendingTickets: number;
  sessions: SessionRoomDetail[];
}

export interface MonitorSummaryParams {
  campus?: string;
  semesterId?: string;
  date?: string;
}

export interface SessionActivityItem {
  id: string;
  activityType: string;
  event: string;
  title: string;
  message: string;
  ticketId: string;
  createdAt: string;
  meta?: Record<string, any>;
}

export const monitorApi = {
  getSummary: async (params: MonitorSummaryParams): Promise<SubjectMonitorSummary[]> => {
    const response = await apiClient.get<{ data: SubjectMonitorSummary[] }>(
      "/exam-sessions/monitor-summary",
      { params }
    );
    return response.data.data;
  },

  getSessionActivities: async (sessionId: string, params?: { limit?: number }): Promise<SessionActivityItem[]> => {
    const response = await apiClient.get<{ data: SessionActivityItem[] } | SessionActivityItem[]>(`/exam-sessions/${sessionId}/monitor-activities`, {
      params,
    });
    const raw = response.data as any;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    return [];
  },
};
