export type UserRole = "admin" | "staff" | "student" | "exam_officer" | "proctor";

export type RoomStatus = "available" | "occupied" | "maintenance";

export type ExamStatus = "scheduled" | "ongoing" | "completed" | "cancelled";

export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  capacity: number | null;
  status: string;
  maxRows?: number;
  maxColumns?: number;
  totalSeats?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SeatLayout {
  rows: number;
  columns: number;
  seats: Seat[];
}

export interface Seat {
  id: string;
  row: number;
  column: number;
  number: string;
  isAvailable: boolean;
}

// Các types khác sẽ được thêm sau khi cần
// export interface Exam { ... }
// export interface Student { ... }

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

