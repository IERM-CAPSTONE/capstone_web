export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "IERM";
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
const browserApiUrl =
  typeof window !== "undefined" ? `${window.location.origin}/api` : undefined;
const serverApiUrl =
  configuredApiUrl && !configuredApiUrl.includes("localhost")
    ? configuredApiUrl
    : "http://capstone_api:3000/api";

export const API_URL = browserApiUrl || serverApiUrl;

export const ROLES = {
  ADMIN: "admin",
  STAFF: "staff",
  STUDENT: "student",
} as const;

export const ROOM_STATUS = {
  AVAILABLE: "available",
  OCCUPIED: "occupied",
  MAINTENANCE: "maintenance",
} as const;

export const EXAM_STATUS = {
  SCHEDULED: "scheduled",
  ONGOING: "ongoing",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

