"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { useUIStore } from "@/store/ui-store";
import { Menu, Bell, User, LogOut, Globe } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

export function Header() {
  const router = useRouter();
  const currentPathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("Common");

  const { user, logout: logoutStore } = useAuthStore();
  const { toggleSidebar } = useUIStore();

  const handleLocaleChange = (newLocale: string) => {
    // Current pathname includes the locale (e.g., /vi/dashboard)
    const segments = currentPathname.split('/');
    segments[1] = newLocale;
    const newPathname = segments.join('/');
    router.push(newPathname);
  };

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      toast.success(t("logoutSuccess"));
      logoutStore();
      router.push(`/${locale}/auth/login`);
    } catch (error) {
      console.error("Logout error:", error);
      toast.error(t("error"));
      logoutStore();
      router.push(`/${locale}/auth/login`);
    }
  };

  return (
    <header className="bg-[#F37021] border-b border-[#e16010] text-white shadow-md z-50">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="lg:hidden text-white hover:bg-orange-600"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#F37021] font-bold text-xl">
              IE
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold leading-none">IERM</span>
              <span className="text-xs font-medium opacity-90">
                {user?.role === "exam_officer" ? "Exam Officer Portal" : "Admin Portal"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Language Switcher */}
          <div className="flex items-center gap-1 bg-orange-600/50 p-1 rounded-lg border border-orange-400/30">
            <button
              onClick={() => handleLocaleChange("vi")}
              className={`px-2 py-1 text-xs font-bold rounded ${locale === "vi" ? "bg-white text-[#F37021]" : "text-white hover:bg-orange-600"}`}
            >
              VI
            </button>
            <button
              onClick={() => handleLocaleChange("en")}
              className={`px-2 py-1 text-xs font-bold rounded ${locale === "en" ? "bg-white text-[#F37021]" : "text-white hover:bg-orange-600"}`}
            >
              EN
            </button>
          </div>

          <div className="flex items-center gap-3 pl-4 border-l border-orange-400/30">
            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <div
                className="flex items-center gap-3 cursor-pointer hover:bg-orange-600/50 py-1 px-2 rounded-md transition-colors"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#F37021]">
                  <User className="h-5 w-5" />
                </div>
                <div className="hidden md:block text-right">
                  <p className="text-sm font-semibold leading-tight">{user?.name || "System User"}</p>
                  <p className="text-xs opacity-90">
                    {user?.role === "exam_officer" ? "Exam Officer" : "System Administrator"}
                  </p>
                </div>
              </div>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 text-gray-700 animate-in fade-in zoom-in duration-200">
                  <div className="py-1">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm text-gray-500">Signed in as</p>
                      <p className="truncate text-sm font-medium text-gray-900">{user?.email || "admin@example.com"}</p>
                    </div>

                    <button
                      className="group flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <User className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                      My Profile
                    </button>

                    <button
                      className="group flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-3 h-4 w-4 text-red-500 group-hover:text-red-600" />
                      {t("logout")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
