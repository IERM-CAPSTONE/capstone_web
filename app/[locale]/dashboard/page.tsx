"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslations } from "next-intl";

export default function DashboardRedirectPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const commonT = useTranslations("Common");

  useEffect(() => {
    console.log('user', user);
    if (isAuthenticated && user) {
      const locale = window.location.pathname.startsWith('/en') ? 'en' : 'vi';

      if (user.role === "admin") {
        router.replace(`/${locale}/dashboard/admin`);
      } else if (user.role === "exam_officer") {
        router.replace(`/${locale}/dashboard/exam-officer`);
      } else {
        // For other roles like staff/student if they don't have a specific dashboard yet
        router.replace(`/${locale}/auth/login`);
      }
    }
  }, [user, isAuthenticated, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-600">{commonT("loadingDashboard")}</p>
    </div>
  );
}
