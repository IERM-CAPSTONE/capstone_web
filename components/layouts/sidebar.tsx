"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useUIStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";
import { useTranslations } from "next-intl";
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
  ClipboardList,
  BookOpen,
  Ticket,
  BarChart2,
} from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { Button } from "@/components/ui/button";
import { useAdminDeviceApplications } from "@/hooks/use-devices";

export function Sidebar() {
  const t = useTranslations("Sidebar");
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { user } = useAuthStore();
  const pendingApplicationsQuery = useAdminDeviceApplications({ page: 1, limit: 1, status: "PENDING" });
  const pendingApplicationsCount = pendingApplicationsQuery.data?.total ?? 0;

  const adminMenuItems = [
    { icon: Users, label: t("accounts"), href: ROUTES.ADMIN_ACCOUNTS },
    { icon: Building2, label: t("rooms"), href: ROUTES.ROOMS },
    { icon: Monitor, label: t("devices"), href: ROUTES.ADMIN_DEVICES, showBadge: true },
    { icon: BookOpen, label: t("subjects"), href: ROUTES.SUBJECTS },
    { icon: Calendar, label: t("semesters"), href: ROUTES.ADMIN_SEMESTERS },
  ];
  const examOfficerMenuItems = [
    { icon: Monitor, label: t("monitor"), href: "/exam-officer/monitor" },
    { icon: Calendar, label: t("schedules"), href: ROUTES.EXAMS_SCHEDULE },
    { icon: Ticket, label: t("tickets"), href: ROUTES.EXAM_OFFICER_TICKETS },
    { icon: FileText, label: t("auditLog"), href: ROUTES.EXAM_OFFICER_AUDIT_LOG },
    { icon: BarChart2, label: t("reports"), href: ROUTES.EXAM_OFFICER_REPORTS },
    { icon: ClipboardList, label: t("applications"), href: ROUTES.EXAM_OFFICER_PROCTOR_APPLICATIONS },
    { icon: Building2, label: t("rooms"), href: ROUTES.EXAM_OFFICER_ROOMS },
    { icon: BookOpen, label: t("subjects"), href: ROUTES.SUBJECTS },
    { icon: Calendar, label: t("semesters"), href: ROUTES.EXAM_OFFICER_SEMESTERS },
    { icon: FileText, label: t("templates"), href: "/exam-officer/templates" },
  ];

  const proctorMenuItems = [
    { icon: ClipboardList,  label: t("applications"),  href: ROUTES.PROCTOR_APPLICATIONS },
    { icon: Calendar,       label: t("schedules"),      href: ROUTES.PROCTOR_EXAM_SCHEDULES },
  ];

  const hallInvigilatorMenuItems = [
    { icon: LayoutDashboard, label: t("dashboard"),          href: ROUTES.HALL_INVIGILATOR, exact: true },
    { icon: ClipboardList,  label: t("applications"),        href: ROUTES.HALL_INVIGILATOR_APPLICATIONS },
    { icon: Ticket,         label: t("assignedTickets"),     href: ROUTES.HALL_INVIGILATOR_TICKETS },
    { icon: Calendar,       label: t("schedules"),           href: ROUTES.EXAMS_SCHEDULE },
  ];

  const studentMenuItems = [
    { icon: LayoutDashboard, label: t("dashboard"), href: ROUTES.DASHBOARD_STUDENT, exact: true },
  ];

  const itSupportMenuItems = [
    { icon: LayoutDashboard, label: t("dashboard"),      href: ROUTES.IT_SUPPORT, exact: true },
    { icon: Ticket,          label: t("techTickets"),    href: ROUTES.IT_SUPPORT_TICKETS },
  ];

  const menuItems =
    user?.role === "exam_officer"
      ? examOfficerMenuItems
      : user?.role === "proctor"
        ? proctorMenuItems
        : user?.role === "hall_invigilator"
          ? hallInvigilatorMenuItems
          : user?.role === "student"
            ? studentMenuItems
          : user?.role === "it_support"
            ? itSupportMenuItems
            : adminMenuItems;

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
          "fixed inset-y-0 left-0 z-50 w-60 transform bg-white shadow-lg transition-transform duration-300 dark:bg-gray-900 lg:static lg:translate-x-0 lg:shadow-none lg:border-r border-gray-200 dark:border-gray-800",
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
              const isActive = (item as any).exact
                ? pathnameWithoutLocale === itemHref
                : itemHref === "/"
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
                  <span className="flex items-center gap-2">
                    {item.label}
                    {item.showBadge && pendingApplicationsCount > 0 && (
                      <span className="inline-flex items-center justify-center rounded-full bg-[#F37021] px-2 py-0.5 text-[10px] font-bold text-white">
                        {pendingApplicationsCount}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}

