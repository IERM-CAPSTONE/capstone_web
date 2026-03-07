export type UserRole = "admin" | "staff" | "student" | "exam_officer" | "proctor" | "it_support" | "hall_invigilator";

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

export interface SeatAssignment {
  seatNumber: number;
  studentId: string;
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

export interface ExamType {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface SubjectPart {
  id: string;
  subjectId: string;
  examTypeId: string;
  duration: number | null;
  examType?: ExamType;
}

export interface Subject {
  id: string;
  code: string;
  name: string | null;
  semesterId: string | null;
  semester?: Semester;
  department: string | null;
  parts: SubjectPart[];
  createdAt: string;
  updatedAt: string;
}

export interface Semester {
  id: string;
  code: string;
  name: string | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}
