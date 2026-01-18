"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import apiClient from "@/lib/api/client";
import { UserRole, User } from "@/types";

interface UseCheckAuthOptions {
    /** Tự động redirect về dashboard nếu đã đăng nhập */
    redirectIfAuthenticated?: boolean;
    /** Tự động redirect về login nếu chưa đăng nhập */
    redirectIfNotAuthenticated?: boolean;
}

interface UseCheckAuthReturn {
    isLoading: boolean;
    isAuthenticated: boolean;
    user: User | null;
    checkAuth: () => Promise<void>;
    logout: () => Promise<void>;
}

/**
 * Chuẩn hóa role từ API về UserRole
 */
export const normalizeRole = (roleValue?: string | null): UserRole => {
    const value = (roleValue || "").toLowerCase();
    if (value === "admin") return "admin";
    if (value === "exam_officer") return "exam_officer";
    if (value === "proctor") return "proctor";
    return "student";
};

/**
 * Lấy locale hiện tại từ URL
 */
export const getCurrentLocale = (): string => {
    if (typeof window === "undefined") return "vi";
    return window.location.pathname.startsWith("/en") ? "en" : "vi";
};

/**
 * Custom hook để quản lý authentication
 */
export function useCheckAuth(options: UseCheckAuthOptions = {}): UseCheckAuthReturn {
    const { redirectIfAuthenticated = false, redirectIfNotAuthenticated = false } = options;

    const router = useRouter();
    const { user, setUser, logout: logoutStore, isAuthenticated } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        try {
            const response = await apiClient.get("/users/me");
            const data = (response.data as { data?: any })?.data || response.data;

            if (data && data.email) {
                const userObj: User = {
                    id: data.id || "",
                    email: data.email || "",
                    name: data.fullName || data.name || data.email || "User",
                    role: normalizeRole(data.role),
                    avatar: data.avatarUrl || data.avatar || undefined,
                    createdAt: data.createdAt || "",
                    updatedAt: data.updatedAt || "",
                };

                // Lưu user id và role vào localStorage
                if (typeof window !== "undefined") {
                    localStorage.setItem("userId", userObj.id);
                    localStorage.setItem("userRole", userObj.role);
                }

                setUser(userObj);

                // Redirect nếu đã đăng nhập và có option
                if (redirectIfAuthenticated) {
                    const locale = getCurrentLocale();
                    if (userObj.role === "admin") {
                        router.replace(`/${locale}/dashboard/admin`);
                    } else if (userObj.role === "exam_officer") {
                        router.replace(`/${locale}/dashboard/exam-officer`);
                    } else {
                        router.replace(`/${locale}/dashboard`);
                    }
                }
            } else if (redirectIfNotAuthenticated) {
                const locale = getCurrentLocale();
                router.replace(`/${locale}/auth/login`);
            }
        } catch (error) {
            console.log("Not authenticated");
            if (redirectIfNotAuthenticated) {
                const locale = getCurrentLocale();
                router.replace(`/${locale}/auth/login`);
            }
        } finally {
            setIsLoading(false);
        }
    }, [router, setUser, redirectIfAuthenticated, redirectIfNotAuthenticated]);

    const logout = useCallback(async () => {
        try {
            await apiClient.post("/auth/logout");
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            // Xóa user data khỏi localStorage
            if (typeof window !== "undefined") {
                localStorage.removeItem("userId");
                localStorage.removeItem("userRole");
            }
            logoutStore();
            const locale = getCurrentLocale();
            router.replace(`/${locale}/auth/login`);
        }
    }, [router, logoutStore]);

    useEffect(() => {
        // Nếu đã có user trong store, không cần gọi API
        if (user) {
            setIsLoading(false);

            if (redirectIfAuthenticated) {
                const locale = getCurrentLocale();
                if (user.role === "admin") {
                    router.replace(`/${locale}/dashboard/admin`);
                } else if (user.role === "exam_officer") {
                    router.replace(`/${locale}/dashboard/exam-officer`);
                } else {
                    router.replace(`/${locale}/dashboard`);
                }
            }
            return;
        }

        checkAuth();
    }, [user, checkAuth, redirectIfAuthenticated, router]);

    return {
        isLoading,
        isAuthenticated,
        user,
        checkAuth,
        logout,
    };
}
