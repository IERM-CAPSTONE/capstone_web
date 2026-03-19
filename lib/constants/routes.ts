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
  DASHBOARD_EXAM_OFFICER: "/exam-officer",
  DASHBOARD_PROCTOR: "/proctor",

  // Admin routes
  ADMIN_ACCOUNTS: "/admin/accounts",
  ADMIN_ACCOUNTS_CREATE: "/admin/accounts/create",
  ADMIN_ACCOUNTS_EDIT: (id: string) => `/admin/accounts/edit/${id}`,
  ADMIN_ACCOUNTS_DETAIL: (id: string) => `/admin/accounts/${id}`,
  ADMIN_DEVICES: "/admin/devices",
  ADMIN_DEVICES_CREATE: "/admin/devices/create",
  ADMIN_DEVICES_DETAIL: (id: string) => `/admin/devices/${id}`,
  ADMIN_DEVICES_EDIT: (id: string) => `/admin/devices/${id}/edit`,
  ADMIN_SEMESTERS: "/admin/semesters",

  // Rooms routes
  ROOMS: "/admin/rooms",
  ROOMS_CREATE: "/admin/rooms/create",
  ROOMS_DETAIL: (id: string) => `/admin/rooms/${id}`,
  ROOMS_EDIT: (id: string) => `/admin/rooms/${id}/edit`,

  // Exam Officer routes
  EXAM_OFFICER_ROOMS: "/exam-officer/rooms",
  EXAM_OFFICER_SEMESTERS: "/exam-officer/semesters",
  EXAM_OFFICER_TICKETS: "/exam-officer/tickets",
  SUBJECTS: "/exam-officer/subjects",

  // Exam Schedules
  EXAMS_SCHEDULE: "/exam-officer/exam-schedules",
  EXAMS_SCHEDULE_CREATE: "/exam-officer/exam-schedules/create",
  EXAMS_SCHEDULE_DETAIL: (id: string) => `/exam-officer/exam-schedules/${id}`,
  EXAMS_SCHEDULE_EDIT: (id: string) => `/exam-officer/exam-schedules/${id}/update`,
  EXAMS_SCHEDULE_STUDENTS: (id: string) => `/exam-officer/exam-schedules/${id}/students`,

  // Proctor Applications
  PROCTOR_APPLICATIONS: "/proctor/applications",
  PROCTOR_TICKETS: "/proctor/tickets",
  PROCTOR_EXAM_SESSION_DETAIL: (id: string) => `/proctor/exam-sessions/${id}`,
  EXAM_OFFICER_PROCTOR_APPLICATIONS: "/exam-officer/proctor-applications",

  // Hall Invigilator routes
  HALL_INVIGILATOR: "/hall-invigilator",
  HALL_INVIGILATOR_TICKETS: "/hall-invigilator/tickets",
  HALL_INVIGILATOR_APPLICATIONS: "/hall-invigilator/applications",

  // IT Support routes
  IT_SUPPORT: "/it-support",
  IT_SUPPORT_TICKETS: "/it-support/tickets",

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
