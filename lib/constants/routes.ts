/**
 * ✅ ROUTING CONFIGURATION
 * 
 * Cách sử dụng:
 * - Import: import { ROUTES } from "@/lib/constants/routes"
 * - Static route: <Link href={ROUTES.ROOMS}>Phòng thi</Link>
 * - Dynamic route: <Link href={ROUTES.ROOMS_DETAIL(room.id)}>Chi tiết</Link>
 * 
 * Quy tắc:
 * - Tất cả routes được định nghĩa ở đây
 * - Dynamic routes dùng function: ROUTES.ROOMS_DETAIL(id)
 * - Nested routes: ROUTES.ROOMS_CREATE
 */

export const ROUTES = {
  // Public routes
  HOME: "/",
  LOGIN: "/auth/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",

  // Dashboard
  DASHBOARD: "/dashboard",
  DASHBOARD_ADMIN: "/admin",
  DASHBOARD_EXAM_OFFICER: "/exam-officer/exam-schedules",
  DASHBOARD_PROCTOR: "/proctor",

  // Admin routes
  ADMIN_ACCOUNTS: "/admin/accounts",
  ADMIN_ACCOUNTS_CREATE: "/admin/accounts/create",
  ADMIN_ACCOUNTS_EDIT: (id: string) => `/admin/accounts/edit/${id}`,
  ADMIN_ACCOUNTS_DETAIL: (id: string) => `/admin/accounts/${id}`,
  ADMIN_DEVICES: "/admin/devices",

  // Rooms routes
  ROOMS: "/admin/rooms",
  ROOMS_CREATE: "/admin/rooms/create",
  ROOMS_DETAIL: (id: string) => `/admin/rooms/${id}`,
  ROOMS_EDIT: (id: string) => `/admin/rooms/${id}/edit`,

  // Exam Officer rooms
  EXAM_OFFICER_ROOMS: "/exam-officer/rooms",

  // Exam Schedules
  EXAMS_SCHEDULE: "/exam-officer/exam-schedules",
  EXAMS_SCHEDULE_CREATE: "/exam-officer/exam-schedules/create",
  EXAMS_SCHEDULE_DETAIL: (id: string) => `/exam-officer/exam-schedules/${id}`,
  EXAMS_SCHEDULE_EDIT: (id: string) => `/exam-officer/exam-schedules/${id}/update`,
  EXAMS_SCHEDULE_STUDENTS: (id: string) => `/exam-officer/exam-schedules/${id}/students`,

  // Proctor Applications
  PROCTOR_APPLICATIONS: "/proctor/applications",
  EXAM_OFFICER_PROCTOR_APPLICATIONS: "/exam-officer/proctor-applications",

  // Các routes khác sẽ được thêm sau khi cần
  STUDENTS: "/students",
  MONITORING: "/monitoring",
  REPORTS: "/reports",
  SETTINGS: "/settings",
} as const;

/**
 * Helper function để check active route
 */
export function isActiveRoute(currentPath: string, route: string): boolean {
  return currentPath === route || currentPath.startsWith(route + "/");
}

