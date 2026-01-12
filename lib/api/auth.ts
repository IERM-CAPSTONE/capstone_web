import apiClient from "./client";
import { User } from "@/types";

export const authApi = {
  // Initiates Google OAuth via backend. Kept for future use.
  googleLogin: () => {
    if (typeof window !== "undefined") {
      window.location.href = "/api/auth/google";
    }
  },

  // Logout clears auth cookies on the server
  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },

  // Refresh access token using refresh cookie
  refresh: async (): Promise<void> => {
    await apiClient.post("/auth/refresh");
  },

  // Get current user info (reads httpOnly access token cookie via same-origin API)
  me: async (): Promise<{ userId: string; role?: string } | null> => {
    try {
      const res = await apiClient.get('/auth/me');
      return res.data;
    } catch (e) {
      return null;
    }
  },

  // Optional: credential login (not implemented on backend; placeholder for TS)
  login: async (
    _params: { email: string; password: string }
  ): Promise<{ user: User; accessToken: string }> => {
    throw new Error("Password login not implemented; use Google login.");
  },
};
