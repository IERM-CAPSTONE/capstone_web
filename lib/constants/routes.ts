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
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",

  // Dashboard
  ADMIN_DASHBOARD: "/admin-dashboard",

  // Admin dashboard sections
  ADMIN_EXAM_ROOMS: "/admin-dashboard/exam-room",
  ADMIN_EXAM_ROOMS_CREATE: "/admin-dashboard/exam-room/create",
  ADMIN_EXAM_ROOMS_DETAIL: (id: string) => `/admin-dashboard/exam-room/${id}`,
  ADMIN_EXAM_ROOMS_EDIT: (id: string) => `/admin-dashboard/exam-room/${id}/edit`,

  ADMIN_ACCOUNTS: "/admin-dashboard/account",
  ADMIN_ACCOUNTS_CREATE: "/admin-dashboard/account/create",
  ADMIN_ACCOUNTS_DETAIL: (id: string) => `/admin-dashboard/account/${id}`,
  ADMIN_ACCOUNTS_EDIT: (id: string) => `/admin-dashboard/account/${id}/edit`,

  ADMIN_DEVICES: "/admin-dashboard/devices",
  ADMIN_DEVICES_CREATE: "/admin-dashboard/devices/create",
  ADMIN_DEVICES_DETAIL: (id: string) => `/admin-dashboard/devices/${id}`,
  ADMIN_DEVICES_EDIT: (id: string) => `/admin-dashboard/devices/${id}/edit`,

  // Rooms routes (Ví dụ mẫu)
  ROOMS: "/admin-dashboard/rooms",
  ROOMS_CREATE: "/admin-dashboard/rooms/create",
  ROOMS_DETAIL: (id: string) => `/admin-dashboard/rooms/${id}`,
  ROOMS_EDIT: (id: string) => `/admin-dashboard/rooms/${id}/edit`,

  // Các routes khác sẽ được thêm sau khi cần
  EXAMS: "/admin-dashboard/exams",
  STUDENTS: "/admin-dashboard/students",
  MONITORING: "/admin-dashboard/monitoring",
  REPORTS: "/admin-dashboard/reports",
  SETTINGS: "/admin-dashboard/settings",
} as const;

/**
 * Helper function để check active route
 */
export function isActiveRoute(currentPath: string, route: string): boolean {
  return currentPath === route || currentPath.startsWith(route + "/");
}

