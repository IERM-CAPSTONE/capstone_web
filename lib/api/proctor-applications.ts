import apiClient from "./client";
import { ApiResponse, PaginatedResponse, PaginationParams } from "@/types";

export type PreferredShift = "MORNING" | "AFTERNOON";
export type PreferredType = "ROOM" | "HALL";
export type ProctorApplicationStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";

export interface ProctorApplication {
  id: string;
  teacherId: string;
  teacherName: string | null;
  teacherCode: string | null;
  preferredShift: PreferredShift;
  preferredType: PreferredType;
  preferredDates: Date[];
  notes: string | null;
  status: ProctorApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProctorApplicationData {
  preferredShift: PreferredShift;
  preferredType: PreferredType;
  preferredDates?: string[];
  notes?: string | null;
}

export interface UpdateProctorApplicationData {
  preferredShift?: PreferredShift;
  preferredType?: PreferredType;
  preferredDates?: string[];
  notes?: string | null;
}

export interface UpdateProctorApplicationStatusData {
  status: "APPROVED" | "REJECTED";
}

export interface ListAllProctorApplicationsParams extends PaginationParams {
  teacherId?: string;
  status?: ProctorApplicationStatus;
  preferredDateStart?: string;
  preferredDateEnd?: string;
}

export interface AvailableDate {
  date: string; // YYYY-MM-DD
  count: number;
}

export const proctorApplicationsApi = {
  // Create application (Proctor only)
  create: async (data: CreateProctorApplicationData): Promise<ProctorApplication> => {
    const response = await apiClient.post<ApiResponse<ProctorApplication>>(
      "/proctor-applications",
      data
    );
    if (!response.data.success || !response.data.data) {
      throw new Error("Failed to create application");
    }
    return response.data.data;
  },

  // Update application (Proctor, own only)
  update: async (
    id: string,
    data: UpdateProctorApplicationData
  ): Promise<ProctorApplication> => {
    const response = await apiClient.put<ApiResponse<ProctorApplication>>(
      `/proctor-applications/${id}`,
      data
    );
    if (!response.data.success || !response.data.data) {
      throw new Error("Failed to update application");
    }
    return response.data.data;
  },

  // Cancel application (Proctor, own only)
  cancel: async (id: string): Promise<ProctorApplication> => {
    const response = await apiClient.patch<ApiResponse<ProctorApplication>>(
      `/proctor-applications/${id}/cancel`
    );
    if (!response.data.success || !response.data.data) {
      throw new Error("Failed to cancel application");
    }
    return response.data.data;
  },

  // Get own applications (Proctor only)
  getMyApplications: async (): Promise<ProctorApplication[]> => {
    const response = await apiClient.get<ApiResponse<ProctorApplication[]>>(
      "/proctor-applications/my-applications"
    );
    if (!response.data.success || !response.data.data) {
      throw new Error("Failed to fetch applications");
    }
    return response.data.data;
  },

  // Get all applications (Admin/ExamOfficer only)
  getAllApplications: async (
    params?: ListAllProctorApplicationsParams
  ): Promise<PaginatedResponse<ProctorApplication>> => {
    const response = await apiClient.get<PaginatedResponse<ProctorApplication>>(
      "/proctor-applications",
      { params }
    );
    return response.data;
  },

  // Update application status (Admin/ExamOfficer only)
  updateStatus: async (
    id: string,
    data: UpdateProctorApplicationStatusData
  ): Promise<ProctorApplication> => {
    const response = await apiClient.patch<ApiResponse<ProctorApplication>>(
      `/proctor-applications/${id}/status`,
      data
    );
    if (!response.data.success || !response.data.data) {
      throw new Error("Failed to update status");
    }
    return response.data.data;
  },

  // Get available dates from exam sessions
  getAvailableDates: async (semesterId?: string): Promise<AvailableDate[]> => {
    const response = await apiClient.get<ApiResponse<AvailableDate[]>>(
      "/proctor-applications/available-dates",
      { params: semesterId ? { semesterId } : undefined }
    );
    if (!response.data.success || !response.data.data) {
      throw new Error("Failed to fetch available dates");
    }
    return response.data.data;
  },
};
