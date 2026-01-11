"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { Sidebar } from "@/components/layouts/sidebar";
import { Header } from "@/components/layouts/header";
import apiClient from "@/lib/api/client";
import { UserRole } from "@/types";
import { SocketProvider, useSocket } from "@/lib/socket/socket-provider";
import { CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, setUser, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      // If user is already loaded and is admin, allow access
      if (user && user.role === "admin") {
        if (isLoading) {
          setIsLoading(false);
        }
        return;
      }

      // If user is loaded but not admin, redirect to login
      if (user && user.role !== "admin") {
        await apiClient.post("/auth/logout");
        logout();
        router.replace("/login");
        return;
      }

      // If no user but might have token in cookies, try to fetch user
      try {
        const response = await apiClient.get("/users/me");
        const data = (response.data as { data?: any })?.data;

        if (cancelled) return;

        if (!data) {
          router.replace("/login");
          return;
        }

        const normalizeRole = (roleValue?: string | null): UserRole => {
          const value = (roleValue || "").toLowerCase();
          if (value === "admin") return "admin";
          if (value === "student") return "student";
          return "staff";
        };

        const role = normalizeRole(data.role);
        const userData = {
          id: data.id || "",
          email: data.email || "",
          name: data.fullName || data.name || data.email || "User",
          role,
          avatar: data.avatarUrl || data.avatar || undefined,
          createdAt: data.createdAt || "",
          updatedAt: data.updatedAt || "",
        };

        setUser(userData);

        // Only admin can access dashboard
        if (role !== "admin") {
          await apiClient.post("/auth/logout");
          logout();
          router.replace("/login");
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Failed to fetch user:", error);
        if (cancelled) return;
        logout();
        router.replace("/login");
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, setUser, logout]);

  if (isLoading || !isAuthenticated || (user && user.role !== "admin")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 text-sm text-gray-600 shadow-sm">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <SocketProvider>
      <DashboardContent>{children}</DashboardContent>
    </SocketProvider>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleAccountActivity = (data: any) => {
      const typeStr = data.type.replace(/_/g, " ").replace(/\w\S*/g, (txt: string) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
      setNotification({
        message: `${typeStr}: ${data.userName}`,
        type: 'success'
      });
      setTimeout(() => setNotification(null), 5000);
    };

    const handleImportCompleted = (data: any) => {
      setNotification({
        message: `Import Finished: ${data.fileName}`,
        type: 'info'
      });
      setTimeout(() => setNotification(null), 5000);
    };

    socket.on("ACCOUNT_ACTIVITY", handleAccountActivity);
    socket.on("IMPORT_COMPLETED", handleImportCompleted);

    return () => {
      socket.off("ACCOUNT_ACTIVITY", handleAccountActivity);
      socket.off("IMPORT_COMPLETED", handleImportCompleted);
    };
  }, [socket]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>

          {/* Global Notification */}
          {notification && (
            <div className={cn(
              "fixed top-6 right-6 z-[9999] animate-in fade-in slide-in-from-right-4 duration-300",
              "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border",
              notification.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-blue-50 border-blue-100 text-blue-800"
            )}>
              {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Info className="h-5 w-5 text-blue-600" />}
              <span className="text-sm font-semibold">{notification.message}</span>
              <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-70">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Footer */}
          <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div>
              © 2026 FPT University - Intelligent Examination Room Management System
            </div>
            <div>
              Version 1.0.0
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

