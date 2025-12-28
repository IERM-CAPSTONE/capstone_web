import apiClient from "./client";
import { User, ApiResponse } from "@/types";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const authApi = {
  // Login
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await apiClient.post<ApiResponse<LoginResponse>>(
      "/auth/login",
      credentials
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || "Login failed");
    }
    
    // Store token
    if (typeof window !== "undefined") {
      localStorage.setItem("token", response.data.data.accessToken);
      localStorage.setItem("refreshToken", response.data.data.refreshToken);
    }
    
    return response.data.data;
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      // Clear tokens
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
      }
    }
  },

  // Get current user
  getMe: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>("/auth/me");
    if (!response.data.success || !response.data.data) {
      throw new Error("Failed to get user");
    }
    return response.data.data;
  },

  // Refresh token
  refreshToken: async (): Promise<string> => {
    const refreshToken = typeof window !== "undefined" 
      ? localStorage.getItem("refreshToken") 
      : null;
    
    if (!refreshToken) {
      throw new Error("No refresh token");
    }
    
    const response = await apiClient.post<ApiResponse<{ accessToken: string }>>(
      "/auth/refresh",
      { refreshToken }
    );
    
    if (!response.data.success || !response.data.data) {
      throw new Error("Failed to refresh token");
    }
    
    // Update token
    if (typeof window !== "undefined") {
      localStorage.setItem("token", response.data.data.accessToken);
    }
    
    return response.data.data.accessToken;
  },
};


