import apiClient from "./client";

export interface AnnouncementTemplate {
  id: string;
  title: string;
  content: string;
  type: "INFO" | "WARNING" | "URGENT";
  campus?: string;
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export interface BroadcastMessageItem {
  id: string;
  title: string;
  content: string;
  type: string;
  createdAt: string;
  senderName?: string | null;
  subjectCodes: string[];
  deliveries: Array<{
    sessionId: string;
    subjectCode: string;
    roomNumber: string;
    campus: string;
  }>;
}

export const templatesApi = {
  getTemplates: async (params?: { page?: number; limit?: number; search?: string; campus?: string }): Promise<AnnouncementTemplate[]> => {
    const response = await apiClient.get<ApiResponse<{ items: AnnouncementTemplate[]; total: number }> | { items: AnnouncementTemplate[]; total: number }>("/announcement-templates", { params });
    const raw = response.data as any;

    if (raw?.success && raw?.data) {
      if (Array.isArray(raw.data)) return raw.data;
      if (Array.isArray(raw.data.items)) return raw.data.items;
      return [];
    }

    if (Array.isArray(raw?.items)) return raw.items;
    if (Array.isArray(raw?.data)) return raw.data;

    return [];
  },
  
  createTemplate: async (data: Omit<AnnouncementTemplate, "id" | "createdAt">): Promise<AnnouncementTemplate> => {
    const response = await apiClient.post<ApiResponse<AnnouncementTemplate> | AnnouncementTemplate>("/announcement-templates", data);
    const raw = response.data as any;
    return raw?.success ? raw.data : raw;
  },
  
  updateTemplate: async (id: string, data: Partial<AnnouncementTemplate>): Promise<AnnouncementTemplate> => {
    const response = await apiClient.put<ApiResponse<AnnouncementTemplate> | AnnouncementTemplate>(`/announcement-templates/${id}`, data);
    const raw = response.data as any;
    return raw?.success ? raw.data : raw;
  },
  
  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`/announcement-templates/${id}`);
  },

  broadcast: async (data: { subjectCodes: string[]; content: string; type: string; title?: string }): Promise<{ success: boolean; count: number; deliveries: Array<{ sessionId: string; subjectCode: string; roomNumber: string; campus: string }>; sentAt: string }> => {
    const response = await apiClient.post<ApiResponse<{ success: boolean; count: number; deliveries: Array<{ sessionId: string; subjectCode: string; roomNumber: string; campus: string }>; sentAt: string }> | { success: boolean; count: number; deliveries: Array<{ sessionId: string; subjectCode: string; roomNumber: string; campus: string }>; sentAt: string }>("/broadcast", data);
    const raw = response.data as any;
    return raw?.success && raw?.data ? raw.data : raw;
  },

  getBroadcastMessages: async (params?: { subjectCodes?: string[]; limit?: number }): Promise<BroadcastMessageItem[]> => {
    const response = await apiClient.get<ApiResponse<BroadcastMessageItem[]> | BroadcastMessageItem[]>("/broadcast/messages", {
      params: {
        subjectCodes: params?.subjectCodes?.join(","),
        limit: params?.limit,
      },
    });
    const raw = response.data as any;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    return [];
  },
};
