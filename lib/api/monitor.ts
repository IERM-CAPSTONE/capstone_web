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

export const monitorApi = {
  getSummary: async (params: MonitorSummaryParams): Promise<SubjectMonitorSummary[]> => {
    const response = await apiClient.get<{ data: SubjectMonitorSummary[] }>(
      "/exam-sessions/monitor-summary",
      { params }
    );
    return response.data.data;
  },
};
