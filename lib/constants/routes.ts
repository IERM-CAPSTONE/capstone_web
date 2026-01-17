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
  DASHBOARD_ADMIN: "/dashboard/admin",
  DASHBOARD_EXAM_OFFICER: "/dashboard/exam-officer",

  // Rooms routes (Ví dụ mẫu)
  ROOMS: "/rooms",
  ROOMS_CREATE: "/rooms/create",
  ROOMS_DETAIL: (id: string) => `/rooms/${id}`,
  ROOMS_EDIT: (id: string) => `/rooms/${id}/edit`,

  // Exam Schedules
  EXAMS_SCHEDULE: "/dashboard/exam-officer/exam-schedule",
  EXAMS_SCHEDULE_CREATE: "/dashboard/exam-officer/exam-schedule/create",
  EXAMS_SCHEDULE_DETAIL: (id: string) => `/dashboard/exam-officer/exam-schedule/${id}`,
  EXAMS_SCHEDULE_EDIT: (id: string) => `/dashboard/exam-officer/exam-schedule/${id}/update`,

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

