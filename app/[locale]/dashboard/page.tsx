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
        router.replace(`/${locale}${ROUTES.DASHBOARD_ADMIN}`);
      } else if (user.role === "exam_officer" || user.role === "proctor") {
        router.replace(`/${locale}${ROUTES.EXAMS_SCHEDULE}`);
      } else {
        // Redirect to a default authenticated page for other roles
        router.replace(`/${locale}${ROUTES.DASHBOARD}`);
      }
    }
  }, [user, isAuthenticated, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-600">{commonT("loadingDashboard")}</p>
    </div>
  );
}
