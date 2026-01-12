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
    <header className="border-b bg-primary text-white">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="lg:hidden text-white"
          >
            <Menu className="h-5 w-5 text-white" />
          </Button>
          <h2 className="text-lg font-semibold text-white">IERM System</h2>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="text-white">
            <Bell className="h-5 w-5 text-white" />
          </Button>

          <div className="flex items-center gap-2">
            <div className="text-right text-white">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-white/80">{user?.role}</p>
            </div>
            <Button variant="ghost" size="sm" className="text-white">
              <User className="h-5 w-5 text-white" />
            </Button>
          </div>

          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white">
            <LogOut className="h-5 w-5 text-white" />
          </Button>
        </div>
      </div>
    </header>
  );
}


