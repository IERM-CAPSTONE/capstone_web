import apiClient from "./client";

export interface AttendanceSnapshot {
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

export interface ListAttendanceSnapshotsParams {
    page?: number;
    limit?: number;
    examSessionId?: string;
    status?: string;
    actorType?: "STUDENT" | "PROCTOR";
    matchedUserId?: string;
    fromDate?: string;
    toDate?: string;
}

export interface ListAttendanceSnapshotsResponse {
    data: AttendanceSnapshot[];
    total: number;
    page: number;
    limit: number;
}

export const attendanceSnapshotsApi = {
    list: async (
        params: ListAttendanceSnapshotsParams,
    ): Promise<ListAttendanceSnapshotsResponse> => {
        const response = await apiClient.get<ListAttendanceSnapshotsResponse>(
            "/face-recognition/attendance-snapshots",
            { params },
        );

        const raw = response.data as any;
        if (Array.isArray(raw?.data)) {
            return {
                data: raw.data,
                total: raw.meta?.total ?? raw.data.length,
                page: raw.meta?.page ?? params.page ?? 1,
                limit: raw.meta?.limit ?? params.limit ?? raw.data.length,
            };
        }

        return raw?.data?.data ? raw.data : raw;
    },

    getLatestStudentSnapshot: async (
        examSessionId: string,
        studentId: string,
    ): Promise<AttendanceSnapshot | null> => {
        const response = await attendanceSnapshotsApi.list({
            page: 1,
            limit: 1,
            examSessionId,
            actorType: "STUDENT",
            matchedUserId: studentId,
        });

        return response.data[0] ?? null;
    },
};
