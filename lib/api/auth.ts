import apiClient from "./client";

interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar?: string;
    createdAt: string;
    updatedAt: string;
  };
  accessToken: string;
}

export const authApi = {
  // Login with email/password (not currently used - system uses Google OAuth)
  login: async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
    // Note: This endpoint doesn't exist in the backend
    // The system uses Google OAuth only
    const response = await apiClient.post<LoginResponse>("/auth/login", credentials);
    return response.data;
  },

  // Logout user and clear cookies
  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },
};
