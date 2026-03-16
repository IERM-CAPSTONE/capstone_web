import apiClient from "./client";

export interface StudentExam {
    id: string;
    examSessionId: string;
    studentId: string;
    seatNumber: string | null;
    seatPosition?: string | null;
    status: string;
    currentLocation: string | null;
    identityId: string | null;
    isMatched: boolean;
    checkinTime: string | null;
    checkoutTime: string | null;
    isValid: boolean;
    createdAt: string;
    updatedAt: string;
    studentName?: string | null;
    studentCode?: string | null;
    stt?: number | null;
    parts?: any[];
    email?: string | null;
}

export interface PaginatedStudentExamResponse {
    data: StudentExam[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ListStudentExamsParams {
    page?: number;
    limit?: number;
    examSessionId?: string;
    studentId?: string;
    status?: string;
}

export const studentExamsApi = {
    // List student exams
    list: async (
        params: ListStudentExamsParams
    ): Promise<PaginatedStudentExamResponse> => {
        const response = await apiClient.get<PaginatedStudentExamResponse>(
            "/student-exams",
            { params }
        );
        return response.data;
    },

    // Get student exam by ID
    getById: async (id: string): Promise<StudentExam> => {
        const response = await apiClient.get<{ data: StudentExam }>(
            `/student-exams/${id}`
        );
        return response.data.data;
    },

    // Update attendance/submission for a specific part
    updatePart: async (id: string, data: { isCheckedIn?: boolean; checkInTime?: string | null; isSubmit?: boolean; isSign?: boolean }) => {
        const response = await apiClient.patch(`/student-exam-parts/${id}`, data);
        return response.data;
    },
};
