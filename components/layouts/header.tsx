"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { useUIStore } from "@/store/ui-store";
import { Menu, Bell, User, LogOut } from "lucide-react";
import { authApi } from "@/lib/api/auth";

export function Header() {
  const router = useRouter();
  const { user, logout: logoutStore } = useAuthStore();
  const { toggleSidebar } = useUIStore();

  const handleLogout = async () => {
    try {
      await authApi.logout();
      logoutStore();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      logoutStore();
      router.push("/login");
    }
  };

  return (
    <header className="border-b bg-white dark:bg-gray-900">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold">IERM System</h2>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm">
            <Bell className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {user?.role}
              </p>
            </div>
            <Button variant="ghost" size="sm">
              <User className="h-5 w-5" />
            </Button>
          </div>

          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}


