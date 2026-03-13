import apiClient from "./client";
import { ExamType } from "@/types";

export const examTypesApi = {
    // Get all exam types
    getAll: async (): Promise<ExamType[]> => {
        const response = await apiClient.get<{ data: ExamType[] }>("/exam-types");
        return response.data.data;
    },

    // Get by ID
    getById: async (id: string): Promise<ExamType> => {
        const response = await apiClient.get<{ data: ExamType }>(`/exam-types/${id}`);
        return response.data.data;
    },

    // Create
    create: async (data: Partial<ExamType>): Promise<ExamType> => {
        const response = await apiClient.post<{ data: ExamType }>("/exam-types", data);
        return response.data.data;
    },

    // Update
    update: async (id: string, data: Partial<ExamType>): Promise<ExamType> => {
        const response = await apiClient.patch<{ data: ExamType }>(`/exam-types/${id}`, data);
        return response.data.data;
    },

    // Delete
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/exam-types/${id}`);
    },
};
