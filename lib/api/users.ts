import apiClient from "./client";

export type UserRole = "ADMIN" | "EXAM_OFFICER" | "PROCTOR" | "STUDENT";

export interface User {
  id: string;
  email: string | null;
  fullName: string | null;
  username: string | null;
  code: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  role: UserRole | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedUserResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  role?: UserRole;
  isActive?: boolean;
  search?: string;
}

export interface CreateUserData {
  email?: string | null;
  fullName?: string;
  code?: string;
  avatarUrl?: string;
  role?: UserRole;
  password?: string;
  username?: string;
  isActive?: boolean;
}

export interface UpdateUserData {
  email?: string;
  fullName?: string;
  username?: string;
  code?: string;
  avatarUrl?: string;
  role?: UserRole;
  isActive?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const usersApi = {
  // Get all users with pagination and filters
  getAll: async (params?: ListUsersParams): Promise<PaginatedUserResponse> => {
    try {
      // Build query params, converting boolean to string for URL query params
      const queryParams: any = {};
      if (params?.page) queryParams.page = String(params.page);
      if (params?.limit) queryParams.limit = String(params.limit);
      if (params?.role) queryParams.role = params.role;
      if (params?.isActive !== undefined) queryParams.isActive = String(params.isActive);
      if (params?.search) queryParams.search = params.search;

      const response = await apiClient.get<ApiResponse<User[]>>("/users", {
        params: queryParams,
      });

      // Handle response structure from TransformInterceptor
      // Response from backend with TransformInterceptor: { success, statusCode, message, data: [...users], meta: { total, page, limit, totalPages } }
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        const apiResponse = response.data as ApiResponse<User[]>;
        if (apiResponse.success && apiResponse.meta) {
          return {
            data: Array.isArray(apiResponse.data) ? apiResponse.data : [],
            total: apiResponse.meta.total || 0,
            page: apiResponse.meta.page || 1,
            limit: apiResponse.meta.limit || 10,
            totalPages: apiResponse.meta.totalPages || 0,
          };
        }

        // Fallback: direct paginated response structure
        if ('data' in apiResponse && 'total' in apiResponse) {
          return apiResponse as unknown as PaginatedUserResponse;
        }
      }

      // Fallback: direct paginated response (without interceptor)
      if (response.data && typeof response.data === 'object' && 'data' in response.data && 'total' in response.data) {
        return response.data as unknown as PaginatedUserResponse;
      }

      // Final fallback
      return {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
    } catch (error: any) {
      console.error("Error fetching users:", error);
      throw error;
    }
  },

  // Get user by ID
  getById: async (id: string): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
    return response.data.success ? response.data.data : (response.data as any);
  },

  // Create user
  create: async (data: CreateUserData): Promise<User> => {
    const response = await apiClient.post<ApiResponse<User>>("/users", data);
    return response.data.success ? response.data.data : (response.data as any);
  },

  // Update user
  update: async (id: string, data: UpdateUserData): Promise<User> => {
    const response = await apiClient.put<ApiResponse<User>>(`/users/${id}`, data);
    return response.data.success ? response.data.data : (response.data as any);
  },

  // Delete user
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  // Change user role
  changeRole: async (id: string, role: UserRole): Promise<User> => {
    const response = await apiClient.patch<ApiResponse<User>>(`/users/${id}/role`, { role });
    return response.data.success ? response.data.data : (response.data as any);
  },

  // Toggle user account status
  toggleStatus: async (id: string, isActive: boolean): Promise<User> => {
    const response = await apiClient.put<ApiResponse<User>>(`/users/${id}`, { isActive });
    return response.data.success ? response.data.data : (response.data as any);
  },

  // Import students from Excel
  importStudents: async (file: File): Promise<{ message: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<ApiResponse<{ message: string }>>("/users/import-students", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data.success ? response.data.data : { message: "Failed to start import" };
  },

  // Get hall invigilators (accessible by Admin, Exam Officer)
  getProctors: async (params?: Omit<ListUsersParams, 'role'>): Promise<PaginatedUserResponse> => {
    try {
      const queryParams: any = {};
      if (params?.page) queryParams.page = String(params.page);
      if (params?.limit) queryParams.limit = String(params.limit);
      if (params?.isActive !== undefined) queryParams.isActive = String(params.isActive);
      if (params?.search) queryParams.search = params.search;

      const response = await apiClient.get<ApiResponse<User[]>>("/users/proctors", {
        params: queryParams,
      });

      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        const apiResponse = response.data as ApiResponse<User[]>;
        if (apiResponse.success && apiResponse.meta) {
          return {
            data: Array.isArray(apiResponse.data) ? apiResponse.data : [],
            total: apiResponse.meta.total || 0,
            page: apiResponse.meta.page || 1,
            limit: apiResponse.meta.limit || 10,
            totalPages: apiResponse.meta.totalPages || 0,
          };
        }
      }

      return {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
    } catch (error: any) {
      console.error("Error fetching proctors:", error);
      throw error;
    }
  },

  // Get assignable users (IT Support + Hall Invigilator) for ticket assignment
  // Accessible by EXAM_OFFICER and ADMIN
  getAssignees: async (): Promise<User[]> => {
    try {
      const response = await apiClient.get("/users/assignees");
      const raw = response.data as any;
      // TransformInterceptor wraps: { success, statusCode, data: [...] }
      if (raw?.data && Array.isArray(raw.data)) return raw.data;
      // Fallback: direct array
      if (Array.isArray(raw)) return raw;
      return [];
    } catch (error: any) {
      console.error("Error fetching assignees:", error?.response?.status, error?.response?.data);
      return [];
    }
  },
};
