"use client";

import { useAuthStore } from "@/store/auth-store";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

export default function DashboardIndexPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      // Wait a bit for user to be loaded from layout
      const timer = setTimeout(() => {
        if (!user) {
          router.push("/auth/login");
        }
      }, 500);
      return () => clearTimeout(timer);
    }

    // Route based on role - only redirect when user is confirmed
    if (user.role === "exam_officer") {
      router.replace(ROUTES.DASHBOARD_EXAM_OFFICER);
    } else if (user.role === "admin") {
      router.replace(ROUTES.DASHBOARD_ADMIN);
    } else {
      // Unknown role, redirect to login
      router.push("/auth/login");
    }
  }, [user, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-600">Loading dashboard...</p>
    </div>
  );
}
