import apiClient from "./client";

export interface ExamSchedule {
  id: string;
  examCode?: string | null;
  semester?: string | null;
  semesterName?: string | null;
  openCode?: string | null;
  note?: string | null;
  examRoomId: string | null;
  roomNumber: string | null;
  proctorId: string | null;
  proctorName: string | null;
  hallInvigilatorId: string | null;
  hallInvigilatorName: string | null;
  subjectCode: string | null;
  examOpenTime: string | null;
  examCloseTime: string | null;
  status?: string | null;
  isArchived?: boolean | null;
  examPart?: string[];
  hasStudentsImported?: boolean;
  createdAt: string;
  updatedAt: string;
  maxRows?: number | null;
  maxColumns?: number | null;
  totalSeats?: number | null;
  campus?: string | null;
  examType?: string | null; // PE | FE | TE | RE
  studentCount: number;
}

export interface PaginatedExamScheduleResponse {
  data: ExamSchedule[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ListExamSchedulesParams {
  page?: number;
  limit?: number;
  subjectCode?: string;
  examCode?: string;
  date?: string;
  time?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  startTime?: string;
  endTime?: string;
  examRoomId?: string;
  proctorId?: string;
  studentId?: string;
  campus?: string;
  examType?: string; // PE | FE | TE | RE
}

export interface CreateExamScheduleData {
  examCode?: string;
  semester?: string;
  examPart?: string[];
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
  examPart?: string;
  openCode?: string;
  note?: string;
  examRoomId?: string;
  proctorId?: string;
  hallInvigilatorId?: string;
  subjectCode?: string;
  examOpenTime?: string;
  examCloseTime?: string;
}

export interface AutoGenerateScheduleData {
  semesterId: string;
  campus: string[];
  finalWeek?: number;
  retakeWeek?: number;
  practicalWeek?: number;
  courseraWeek?: number;
  courseraRetakeWeek?: number;
  roomIds: string[];
  fileData: string;
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

  // Auto-generate exam schedule
  autoGenerate: async (data: AutoGenerateScheduleData): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post("/exam-sessions/auto-generate", data);
    return response.data?.data ?? response.data;
  },



  // Delete exam schedule
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/exam-sessions/${id}`);
  },

  // Publish exam schedules
  publish: async (data: { sessionIds?: string[]; semesterId?: string; campus?: string }): Promise<{ success: boolean; count: number }> => {
    const response = await apiClient.post("/exam-sessions/publish", data);
    return response.data?.data ?? response.data;
  },

  // Archive exam schedule (only for completed exams)
  archive: async (id: string): Promise<ExamSchedule> => {
    const response = await apiClient.patch<{ data: ExamSchedule }>(
      `/exam-sessions/${id}/archive`
    );
    return response.data.data;
  },

  // Finalize seat assignments for a session
  finalizeSeats: async (id: string): Promise<{ success: boolean; message: string; data: { studentsAssigned: number; seatsUsed: number } }> => {
    const response = await apiClient.post(`/exam-sessions/${id}/finalize-seats`);
    return response.data?.data ?? response.data;
  },

  // Import exam schedules (legacy - file upload)
  import: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post("/exam-sessions/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  // Import Schedule + Students (JSON) - calls /exam-sessions/import-schedule
  importSchedule: async (data: ImportScheduleData): Promise<ImportScheduleResponse> => {
    const response = await apiClient.post<ImportScheduleResponse>(
      "/exam-sessions/import-schedule",
      data
    );
    return response.data;
  },

  // Alias for importSchedule (backward compatibility)
  importWithStudents: async (payload: { importType: string; schedules: any[]; students: any[] }): Promise<any> => {
    const response = await apiClient.post("/exam-sessions/import-schedule", payload);
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

  // Export Exam Sessions to Excel
  export: async (params: any): Promise<Blob> => {
    const response = await apiClient.get("/exam-sessions/export", {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  // Update exam session fields (e.g. proctorId, status, note)
  update: async (id: string, data: Partial<{
    proctorId: string | null;
    hallInvigilatorId: string | null;
    status: string;
    note: string;
    openCode: string;
    examRoomId: string | null;
    semesterId: string | null;
  }>): Promise<ExamSchedule> => {
    const response = await apiClient.patch<any>(`/exam-sessions/${id}`, data);
    return response.data?.data ?? response.data;
  },
};

// Interfaces for import-schedule API
export interface ScheduleItem {
  examCode?: string | null;
  openCode?: string | null;
  subjectCode: string;
  examDate: string;
  startTime: string;
  endTime: string;
  room: string;
  examSession: string;
}

export interface StudentItem {
  stt?: number | null;
  studentCode: string;
  name: string;
  email: string;
  memberCode: string;
  cccd: string;
  subjectCode: string;
  examSession: string;
  examPart: string;
}

export interface ImportScheduleData {
  importType: 'schedule';
  schedules: ScheduleItem[];
  students: StudentItem[];
  batchId?: string;
  totalItems?: number;
}

export interface ImportScheduleResponse {
  success: boolean;
  message: string;
  data: {
    schedulesReceived: number;
    studentsReceived: number;
  };
}
