"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";
import { UserRole } from "@/types";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { setUser, logout } = useAuthStore();

  useEffect(() => {
    let cancelled = false;

    const normalizeRole = (roleValue?: string | null): UserRole => {
      const value = (roleValue || "").toLowerCase();
      if (value === "admin") return "admin";
      if (value === "student") return "student";
      return "staff";
    };

    const handleCallback = async () => {
      try {
        const response = await apiClient.get("/users/me");
        const data = (response.data as { data?: any })?.data;

        if (!data) {
          throw new Error("Missing user data");
        }

        const role = normalizeRole(data.role);
        const user = {
          id: data.id || "",
          email: data.email || "",
          name: data.fullName || data.name || data.email || "User",
          role,
          avatar: data.avatarUrl || data.avatar || undefined,
          createdAt: data.createdAt || "",
          updatedAt: data.updatedAt || "",
        };

        if (cancelled) return;

        // Set user in store (token is already set in cookies by backend)
        setUser(user);

        // If role is admin, redirect to dashboard immediately
        if (role === "admin") {
          router.replace("/dashboard");
          return;
        }

        // If not admin, logout and redirect to login
        await apiClient.post("/auth/logout");
        if (cancelled) return;
        logout();
        router.replace("/login");
      } catch (error) {
        console.error("OAuth callback error:", error);
        if (cancelled) return;
        logout();
        router.replace("/login");
      }
    };

    handleCallback();

    return () => {
      cancelled = true;
    };
  }, [logout, router, setUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 text-sm text-gray-600 shadow-sm">
        Signing you in...
      </div>
    </div>
  );
}
