"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useUIStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";
import {
  LayoutDashboard,
  Building2,
  Users,
  Monitor,
  Menu,
  X,
  Calendar,
  AlertCircle,
  FileText,
  Settings,
} from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { Button } from "@/components/ui/button";

const adminMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: ROUTES.DASHBOARD_ADMIN },
  { icon: Users, label: "Account Management", href: ROUTES.ADMIN_ACCOUNTS },
  { icon: Building2, label: "Exam Room Management", href: ROUTES.ROOMS },
  { icon: Users, label: "Device Management", href: ROUTES.ADMIN_DEVICES },
];

const examOfficerMenuItems = [
  { icon: Calendar, label: "Exam Schedules", href: ROUTES.EXAMS_SCHEDULE },
  { icon: Building2, label: "Exam Rooms", href: ROUTES.ROOMS },
  { icon: AlertCircle, label: "Monitoring", href: ROUTES.MONITORING },
  { icon: FileText, label: "Reports", href: ROUTES.REPORTS },
  { icon: Users, label: "Students", href: ROUTES.STUDENTS },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { user } = useAuthStore();

  const menuItems = user?.role === "exam_officer" ? examOfficerMenuItems : adminMenuItems;

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-300 dark:bg-gray-900 lg:static lg:translate-x-0 lg:shadow-none lg:border-r border-gray-200 dark:border-gray-800",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Mobile Header with Close Button only */}
          <div className="flex items-center justify-end p-4 lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Menu */}
          <nav className="flex-1 space-y-1 p-4 mt-2">
            {menuItems.map((item) => {
              const Icon = item.icon;

              // Strip locale prefix (e.g., /vi or /en) from pathname for comparison
              const pathnameWithoutLocale = pathname.replace(/^\/(en|vi)/, "") || "/";

              const itemHref = item.href as string;
              const isActive =
                itemHref === "/"
                  ? pathnameWithoutLocale === itemHref
                  : pathnameWithoutLocale === itemHref || pathnameWithoutLocale.startsWith(itemHref + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors mb-1",
                    isActive
                      ? "bg-[#FFEAD8] text-[#F37021]"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  )}
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      toggleSidebar();
                    }
                  }}
                >
                  <Icon className={cn("h-5 w-5", isActive ? "text-[#F37021]" : "text-gray-500")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}

