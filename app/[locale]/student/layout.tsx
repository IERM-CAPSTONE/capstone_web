"use client";

import { Sidebar } from "@/components/layouts/sidebar";
import { Header } from "@/components/layouts/header";
import { useCheckAuth } from "@/hooks/use-check-auth";
import { DashboardLoadingSkeleton } from "@/components/ui/page-loading";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, isAuthenticated, user } = useCheckAuth({
    redirectIfNotAuthenticated: true,
  });

  const allowedRoles = ["admin", "student", "exam_officer"];

  if (isLoading || !isAuthenticated || (user && !allowedRoles.includes(user.role))) {
    return <DashboardLoadingSkeleton />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-gray-100">
          <div className="flex-1 overflow-y-auto p-0 md:p-5">{children}</div>
          <footer className="bg-white border-t border-gray-200 p-4 flex items-center justify-between text-xs text-gray-500">
            <div>© {new Date().getFullYear()} FPT University - Intelligent Examination Room Management System</div>
            <div>Version 1.0.0</div>
          </footer>
        </main>
      </div>
    </div>
  );
}
