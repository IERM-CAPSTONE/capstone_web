import apiClient from "./client";
import { Room, ApiResponse, PaginatedResponse, PaginationParams } from "@/types";

export const roomsApi = {
  // Get all rooms
  getAll: async (params?: PaginationParams & { campus?: string | string[]; roomNumber?: string }): Promise<PaginatedResponse<Room>> => {
    const response = await apiClient.get<any>("/exam-rooms", {
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
    const response = await apiClient.get<any>("/exam-rooms/available", {
      params,
    });

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
  },

  // Import rooms from file
  import: async (file: File, campus?: string): Promise<{ message: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    if (campus) {
      formData.append("campus", campus);
    }

    const response = await apiClient.post<{ message: string }>(
      "/exam-rooms/import",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  },

  // Delete multiple rooms
  deleteBulk: async (params?: { roomNumber?: string; campus?: string }): Promise<{ deletedCount: number }> => {
    const response = await apiClient.delete<any>("/exam-rooms/bulk", {
      params,
    });
    return response.data.data || { deletedCount: 0 };
  },
};


