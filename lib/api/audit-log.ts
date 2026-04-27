import apiClient from "./client";
import type { TicketFull } from "./tickets";

export interface AttendanceSnapshotItem {
  id: string;
  actorType: "STUDENT" | "PROCTOR";
  examSessionId: string;
  examPartCode?: string | null;
  capturedUserId?: string | null;
  matchedUserId?: string | null;
  status: "MATCHED" | "NOT_MATCHED" | "WRONG_ROOM" | "FAILED";
  confidence?: number | null;
  imageUrl?: string | null;
  captureTimestamp: string;
  createdAt: string;
}

export interface FaceEnrollmentItem {
  id: string;
  status: string;
  capturedImageUrls?: Record<string, string> | null;
  createdAt: string;
  supervisorName?: string | null;
}

export interface AuditLogSearchResponse {
  tickets: Partial<TicketFull>[];
  attendanceSnapshots: AttendanceSnapshotItem[];
  faceEnrollments: FaceEnrollmentItem[];
}

export const auditLogApi = {
  search: async (keyword: string): Promise<AuditLogSearchResponse> => {
    const response = await apiClient.get<AuditLogSearchResponse>("/audit-log/search", {
      params: { keyword },
    });

    return (response.data as any)?.data ?? response.data ?? {
      tickets: [],
      attendanceSnapshots: [],
      faceEnrollments: [],
    };
  },
};
