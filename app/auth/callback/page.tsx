"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";
import { UserRole, User } from "@/types";
import { ROUTES } from "@/lib/constants/routes";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser } = useAuthStore();

  useEffect(() => {
    const normalizeRole = (roleValue?: string | null): UserRole => {
      const value = (roleValue || "").toLowerCase();
      if (value === "admin") return "admin";
      if (value === "student") return "student";
      if (value === "exam_officer") return "exam_officer";
      if (value === "proctor") return "proctor";
      return "staff";
    };

    const handleCallback = async () => {
      try {
        // First, try to get user data from URL query params (if backend redirects with data)
        const userDataFromParams = searchParams.get("user");
        let userData: any = null;

        if (userDataFromParams) {
          try {
            userData = JSON.parse(decodeURIComponent(userDataFromParams));
          } catch (e) {
            console.log("Could not parse user data from params");
          }
        }

        // If user is already in store, use it
        if (user && !userData) {
          const role = normalizeRole(user.role) as UserRole;
          
          if (role === "exam_officer") {
            router.replace(ROUTES.DASHBOARD_EXAM_OFFICER);
          } else if (role === "admin") {
            router.replace(ROUTES.DASHBOARD_ADMIN);
          } else {
            router.replace(ROUTES.LOGIN);
          }
          return;
        }

        // If no user data from params, fetch from API
        if (!userData) {
          const response = await apiClient.get("/users/me");
          userData = response.data?.data || response.data;
        }

        if (!userData || !userData.email) {
          throw new Error("Missing user data");
        }

        const userObj: User = {
          id: userData.id || "",
          email: userData.email || "",
          name: userData.fullName || userData.name || userData.email || "User",
          role: normalizeRole(userData.role) as UserRole,
          avatar: userData.avatarUrl || userData.avatar || undefined,
          createdAt: userData.createdAt || "",
          updatedAt: userData.updatedAt || "",
        };

        setUser(userObj);

        // Route based on role
        const role = normalizeRole(userData.role) as UserRole;
        
        if (role === "exam_officer") {
          router.replace(ROUTES.DASHBOARD_EXAM_OFFICER);
        } else if (role === "admin") {
          router.replace(ROUTES.DASHBOARD_ADMIN);
        } else {
          router.replace(ROUTES.LOGIN);
        }
      } catch (error) {
        console.error("OAuth callback error:", error);
        router.replace(ROUTES.LOGIN);
      }
    };

    // Give backend a moment to set cookies
    const timeoutId = setTimeout(handleCallback, 300);
    return () => clearTimeout(timeoutId);
  }, [user, router, setUser, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 text-sm text-gray-600 shadow-sm">
        Signing you in...
      </div>
    </div>
  );
}
