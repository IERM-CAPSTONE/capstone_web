"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { authApi } from "@/lib/api/auth";
import { User } from "@/types";
import { Sidebar } from "@/components/layouts/sidebar";
import { Header } from "@/components/layouts/header";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // Try to hydrate auth state from server-side cookies
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await authApi.me();
        if (!mounted) return;
        if (me) {
          // Minimal user object to satisfy frontend types
          const user: User = {
            id: me.userId,
            email: "",
            name: "",
            role: (me.role as any) || ("staff" as any),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          useAuthStore.getState().setUser(user);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <div className="hidden lg:flex w-64 flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden bg-white">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
