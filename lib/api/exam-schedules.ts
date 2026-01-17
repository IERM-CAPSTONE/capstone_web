import apiClient from "./client";

export interface ExamSchedule {
  id: string;
  examCode?: string | null;
  semester?: string | null;
  examType?: string | null;
  openCode?: string | null;
  note?: string | null;
  examRoomId: string | null;
  examRoomNumber: string | null;
  proctorId: string | null;
  hallInvigilatorId: string | null;
  hallInvigilatorName: string | null;
  subjectCode: string | null;
  examOpenTime: string | null;
  examCloseTime: string | null;
  status?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedExamScheduleResponse {
  data: ExamSchedule[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListExamSchedulesParams {
  page?: number;
  limit?: number;
  subjectCode?: string;
  examRoomId?: string;
  proctorId?: string;
}

export interface CreateExamScheduleData {
  examCode?: string;
  semester?: string;
  examType?: string;
  openCode?: string;
  note?: string;
  examRoomId?: string;
  proctorId?: string;
  hallInvigilatorId?: string;
  subjectCode?: string;
  examOpenTime?: string;
  examCloseTime?: string;
}

export interface UpdateExamScheduleData {
  examCode?: string;
  semester?: string;
  examType?: string;
  openCode?: string;
  note?: string;
  examRoomId?: string;
  proctorId?: string;
  hallInvigilatorId?: string;
  subjectCode?: string;
  examOpenTime?: string;
  examCloseTime?: string;
}

export const examSchedulesApi = {
  // List exam schedules
  list: async (
    params: ListExamSchedulesParams
  ): Promise<PaginatedExamScheduleResponse> => {
    const response = await apiClient.get<PaginatedExamScheduleResponse>(
      "/exam-sessions",
      { params }
    );
    return response.data;
  },

  // Get exam schedule by ID
  getById: async (id: string): Promise<ExamSchedule> => {
    const response = await apiClient.get<{ data: ExamSchedule }>(
      `/exam-sessions/${id}`
    );
    return response.data.data;
  },

  // Create exam schedule
  create: async (data: CreateExamScheduleData): Promise<ExamSchedule> => {
    const response = await apiClient.post<{ data: ExamSchedule }>(
      "/exam-sessions",
      data
    );
    return response.data.data;
  },

  // Update exam schedule
  update: async (
    id: string,
    data: UpdateExamScheduleData
  ): Promise<ExamSchedule> => {
    const response = await apiClient.patch<{ data: ExamSchedule }>(
      `/exam-sessions/${id}`,
      data
    );
    return response.data.data;
  },

  // Delete exam schedule
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/exam-sessions/${id}`);
  },

  // Archive exam schedule (only for completed exams)
  archive: async (id: string): Promise<ExamSchedule> => {
    const response = await apiClient.patch<{ data: ExamSchedule }>(
      `/exam-sessions/${id}/archive`
    );
    return response.data.data;
  },

  // Import exam schedules
  import: async (file: File): Promise<any> => {
    // Legacy support or if we still use this endpoint for some reason
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post("/exam-sessions/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  // Import Schedule + Students (JSON)
  importWithStudents: async (payload: { importType: string; schedules: any[]; students: any[] }): Promise<any> => {
    const response = await apiClient.post("/exam-sessions/import-with-students", payload);
    return response.data;
  },

  // Import Proctors (JSON)
  importProctors: async (payload: { importType: string; proctors: any[] }): Promise<any> => {
    const response = await apiClient.post("/exam-sessions/import-proctors", payload);
    return response.data;
  },

  // Import Exam Codes (JSON)
  importCodes: async (payload: { importType: string; codes: any[] }): Promise<any> => {
    const response = await apiClient.post("/exam-sessions/import-codes", payload);
    return response.data;
  },
};
