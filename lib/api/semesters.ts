import apiClient from "./client";
import { Semester, PaginatedResponse, PaginationParams } from "@/types";

export const semestersApi = {
    // Get all semesters
    getAll: async (params?: PaginationParams & { search?: string }): Promise<PaginatedResponse<Semester>> => {
        try {
            const response = await apiClient.get<any>("/semesters", {
                params,
            });

            // Handle the common ApiResponse format with TransformInterceptor
            if (response.data && response.data.success && response.data.meta) {
                return {
                    success: true,
                    data: response.data.data || [],
                    pagination: {
                        total: response.data.meta.total || 0,
                        page: response.data.meta.page || 1,
                        limit: response.data.meta.limit || 10,
                        totalPages: response.data.meta.totalPages || 0,
                    }
                };
            }

            // Fallback for direct response
            return {
                success: true,
                data: response.data?.data || [],
                pagination: {
                    total: response.data?.total || 0,
                    page: response.data?.page || 1,
                    limit: response.data?.limit || 10,
                    totalPages: response.data?.totalPages || 0,
                }
            };
        } catch (error) {
            console.error("Error fetching semesters:", error);
            return {
                success: false,
                data: [],
                pagination: { total: 0, page: 1, limit: 10, totalPages: 0 }
            };
        }
    },

    // Get semester by ID
    getById: async (id: string): Promise<Semester> => {
        const response = await apiClient.get<{ data: Semester }>(`/semesters/${id}`);
        return response.data.data;
    },

    // Create semester
    create: async (data: { code: string; name?: string; startDate: string; endDate: string }): Promise<Semester> => {
        const response = await apiClient.post<{ data: Semester }>("/semesters", data);
        return response.data.data;
    },

    // Update semester
    update: async (id: string, data: { name?: string; startDate?: string; endDate?: string }): Promise<Semester> => {
        const response = await apiClient.patch<{ data: Semester }>(`/semesters/${id}`, data);
        return response.data.data;
    },

    // Delete semester
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/semesters/${id}`);
    },
};
