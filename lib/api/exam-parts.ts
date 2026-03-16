import apiClient from "./client";
import { ExamPart } from "@/types";

export const examPartsApi = {
    // Get all exam types
    getAll: async (): Promise<ExamPart[]> => {
        const response = await apiClient.get<{ data: ExamPart[] }>("/exam-parts");
        return response.data.data;
    },

    // Get by ID
    getById: async (id: string): Promise<ExamPart> => {
        const response = await apiClient.get<{ data: ExamPart }>(`/exam-parts/${id}`);
        return response.data.data;
    },

    // Create
    create: async (data: Partial<ExamPart>): Promise<ExamPart> => {
        const response = await apiClient.post<{ data: ExamPart }>("/exam-parts", data);
        return response.data.data;
    },

    // Update
    update: async (id: string, data: Partial<ExamPart>): Promise<ExamPart> => {
        const response = await apiClient.patch<{ data: ExamPart }>(`/exam-parts/${id}`, data);
        return response.data.data;
    },

    // Delete
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/exam-parts/${id}`);
    },
};
