import apiClient from "./client";
import { Subject, ApiResponse, PaginatedResponse, PaginationParams } from "@/types";

export const subjectsApi = {
    // Get all subjects
    getAll: async (params?: PaginationParams & { semester?: string; department?: string; search?: string }): Promise<PaginatedResponse<Subject>> => {
        try {
            const response = await apiClient.get<any>("/subjects", {
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
            console.error("Error fetching subjects:", error);
            return {
                success: false,
                data: [],
                pagination: { total: 0, page: 1, limit: 10, totalPages: 0 }
            };
        }
    },

    // Get subject by ID
    getById: async (id: string): Promise<Subject> => {
        const response = await apiClient.get<{ data: Subject }>(`/subjects/${id}`);
        return response.data.data;
    },

    // Create subject
    create: async (data: any): Promise<Subject> => {
        const response = await apiClient.post<{ data: Subject }>("/subjects", data);
        return response.data.data;
    },

    // Update subject
    update: async (id: string, data: any): Promise<Subject> => {
        const response = await apiClient.patch<{ data: Subject }>(`/subjects/${id}`, data);
        return response.data.data;
    },

    // Delete subject
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/subjects/${id}`);
    },

    // Import subjects from Excel
    import: async (file: File, semesterId?: string): Promise<{ message: string }> => {
        const formData = new FormData();
        formData.append("file", file);
        if (semesterId) {
            formData.append("semesterId", semesterId);
        }
        const response = await apiClient.post<{ message: string }>("/subjects/import", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    },
};
