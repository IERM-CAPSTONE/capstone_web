"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCheckAuth } from "@/hooks/use-check-auth";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslations } from "next-intl";

export default function DashboardRedirectPage() {
  const { user, isLoading } = useCheckAuth();
  const router = useRouter();
  const commonT = useTranslations("Common");

  useEffect(() => {
    console.log('user', user);
    if (!isLoading && user) {
      const locale = window.location.pathname.startsWith('/en') ? 'en' : 'vi';

      if (user.role === "admin") {
        router.replace(`/${locale}${ROUTES.DASHBOARD_ADMIN}`);
      } else if (user.role === "exam_officer" || user.role === "proctor") {
        router.replace(`/${locale}${ROUTES.EXAMS_SCHEDULE}`);
      } else if (user.role === "proctor") {
        router.replace(`/${locale}${ROUTES.DASHBOARD_PROCTOR}`);
      } else {
        // Redirect to a default authenticated page for other roles
        router.replace(`/${locale}${ROUTES.DASHBOARD}`);
      }
    } else if (!isLoading && !user) {
      // Not authenticated, redirect to login
      const locale = window.location.pathname.startsWith('/en') ? 'en' : 'vi';
      router.replace(`/${locale}/auth/login`);
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-600">{commonT("loadingDashboard")}</p>
    </div>
  );
}
