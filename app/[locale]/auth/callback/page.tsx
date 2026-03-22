"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import apiClient from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";
import { UserRole, User } from "@/types";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { normalizeRole, getCurrentLocale } from "@/hooks/use-check-auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser } = useAuthStore();
  const t = useTranslations("Common");
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      // Check for error in URL
      const errorMsg = searchParams.get("error");
      if (errorMsg) {
        toast.error(t("error") + ": " + errorMsg);
        const locale = getCurrentLocale();
        router.replace(`/${locale}${ROUTES.LOGIN}`);
        return;
      }

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
          const locale = getCurrentLocale();

          if (role === "exam_officer") {
            router.replace(`/${locale}${ROUTES.DASHBOARD_EXAM_OFFICER}`);
          } else if (role === "admin") {
            router.replace(`/${locale}${ROUTES.DASHBOARD_ADMIN}`);
          } else {
            router.replace(`/${locale}${ROUTES.LOGIN}`);
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
          username: userData.username || undefined,
          role: normalizeRole(userData.role) as UserRole,
          avatar: userData.avatarUrl || userData.avatar || undefined,
          campus: userData.campus || null,
          createdAt: userData.createdAt || "",
          updatedAt: userData.updatedAt || "",
        };

        setUser(userObj);
        toast.success(t("welcome"));

        // Route based on role
        const role = normalizeRole(userData.role) as UserRole;
        const locale = getCurrentLocale();

        if (role === "exam_officer") {
          router.replace(`/${locale}${ROUTES.DASHBOARD_EXAM_OFFICER}`);
        } else if (role === "admin") {
          router.replace(`/${locale}${ROUTES.DASHBOARD_ADMIN}`);
        } else {
          router.replace(`/${locale}${ROUTES.LOGIN}`);
        }
      } catch (error) {
        console.error("OAuth callback error:", error);
        toast.error(t("error"));
        const locale = getCurrentLocale();
        router.replace(`/${locale}${ROUTES.LOGIN}`);
      } finally {
        setIsProcessing(false);
      }
    };

    // Give backend a moment to set cookies
    const timeoutId = setTimeout(handleCallback, 300);
    return () => clearTimeout(timeoutId);
  }, [user, router, setUser, searchParams, t]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 text-sm text-gray-600 shadow-sm">
        {t("signingIn")}
      </div>
    </div>
  );
}
