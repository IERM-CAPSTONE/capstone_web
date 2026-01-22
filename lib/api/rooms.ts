import apiClient from "./client";
import { Room, ApiResponse, PaginatedResponse, PaginationParams } from "@/types";

export const roomsApi = {
  // Get all rooms
  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<Room>> => {
    const response = await apiClient.get<PaginatedResponse<Room>>("/exam-rooms", {
      params,
    });
    return response.data;
  },

  // Get room by ID
  getById: async (id: string): Promise<Room> => {
    const response = await apiClient.get<ApiResponse<Room>>(`/exam-rooms/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error("Room not found");
    }
    return response.data.data;
  },

  // Create room
  create: async (data: Partial<Room>): Promise<Room> => {
    const response = await apiClient.post<ApiResponse<Room>>("/exam-rooms", data);
    if (!response.data.success || !response.data.data) {
      throw new Error("Failed to create room");
    }
    return response.data.data;
  },

  // Update room
  update: async (id: string, data: Partial<Room>): Promise<Room> => {
    const response = await apiClient.patch<ApiResponse<Room>>(`/exam-rooms/${id}`, data);
    if (!response.data.success || !response.data.data) {
      throw new Error("Failed to update room");
    }
    return response.data.data;
  },

  // Delete room
  delete: async (id: string): Promise<void> => {
    await apiClient.delete<ApiResponse<void>>(`/exam-rooms/${id}`);
  },

  // Get available rooms
  getAvailable: async (params?: PaginationParams): Promise<PaginatedResponse<Room>> => {
    const response = await apiClient.get<PaginatedResponse<Room>>("/exam-rooms/available", {
      params,
    });
    return response.data;
  },
};


