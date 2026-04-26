import apiClient from "./client";

export type IssueType =
    | "Academic Violation"
    | "Technical Issue"
    | "Room Management"
    | "Face Mismatch";

export type TicketPriority = "Normal" | "Urgent";
export type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed" | "OPEN" | "IN_PROGRESS" | "SOLVED" | "CLOSED";

export interface TicketReporter {
    id: string;
    fullName: string;
    email: string;
    role: string;
}

export interface TicketSession {
    id: string;
    subjectCode: string | null;
    examCode: string | null;
    roomNumber?: string | null;
    examRoom?: { id: string; roomNumber: string } | null;
}

export interface TicketActivityHistory {
    id: string;
    activityType: string;
    description: string;
    actorId?: string | null;
    fromAssigneeId?: string | null;
    toAssigneeId?: string | null;
    note?: string | null;
    createdAt: string;
    updatedAt?: string;
}

export interface AiCandidate {
    id: string;
    ticketId: string;
    sourceActivityId: string;
    sourceType: "CONCLUSION" | "RESOLUTION";
    issueCode?: string | null;
    issueType?: string | null;
    issueCustomText?: string | null;
    resolutionCode?: string | null;
    resolutionCustomText?: string | null;
    responseText?: string | null;
    techNote?: string | null;
    reviewStatus: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
    reviewNote?: string | null;
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface TicketFull {
    id: string;
    issueName: string;
    issueType: IssueType;
    description?: string | null;
    priority: TicketPriority;
    status: TicketStatus;
    sessionId?: string | null;
    attachment?: string | null;
    resolveNote?: string | null;
    techNote?: string | null;
    finalIssueName?: string | null;
    finalIssueType?: IssueType | string | null;
    finalIssueCustomText?: string | null;
    resolutionCode?: string | null;
    resolutionCustomText?: string | null;
    resolutionStandardText?: string | null;
    latestSummary?: string | null;
    resolvedBy?: string | null;
    resolvedAt?: string | null;
    needsAiReview?: boolean;
    aiTrainingStatus?: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | string | null;
    reviewNote?: string | null;
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    ocrText?: string | null;
    createdById?: string;
    reporterId?: string;
    studentCode?: string | null;
    reporter?: TicketReporter | null;
    assignee?: TicketReporter | null;
    session?: TicketSession | null;
    activityHistories?: TicketActivityHistory[];
    aiCandidates?: AiCandidate[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateTicketData {
    issueName: string;
    issueType: IssueType;
    description?: string;
    priority?: TicketPriority;
    sessionId?: string;
    attachment?: string;
    /** MSSV of the student involved */
    studentCode?: string;
    /** studentExamId to link a student to this ticket (optional) */
    studentExamId?: string;
    confirmedAssignmentType?: "HALL_INVIGILATOR" | "EXAM_OFFICER";
}

export interface ListTicketsParams {
    status?: string;
    issueType?: string;
    sessionId?: string;
    fromDate?: string;
    toDate?: string;
}

export interface ProcessTicketData {
    action: "assign" | "reassign" | "change_status" | "resolve" | "start";
    status?: "OPEN" | "IN_PROGRESS" | "SOLVED" | "CLOSED" | "PENDING";
    assigneeId?: string;
    note?: string;
    resolveNote?: string;
    finalIssueName?: string;
    finalIssueType?: string;
    finalIssueCustomText?: string | null;
    resolutionCode?: string | null;
    resolutionCustomText?: string | null;
    resolutionStandardText?: string | null;
}

export interface BulkProcessTicketData {
    ticketIds: string[];
    action: "assign" | "change_status" | "resolve";
    note?: string;
    status?: "OPEN" | "IN_PROGRESS" | "SOLVED" | "CLOSED" | "PENDING";
    assigneeId?: string;
    resolveNote?: string;
}

export interface BulkProcessResult {
    processed: number;
    failed: number;
    details: { ticketId: string; success: boolean; error?: string }[];
}

export interface ReviewTicketData {
    decision: "APPROVED" | "REJECTED";
    finalIssueName?: string;
    finalIssueType?: string;
    resolutionCode?: string;
    resolutionStandardText?: string | null;
    reviewNote?: string;
}

export interface CommentTicketData {
    mode?: "DISCUSSION" | "CONCLUSION" | "RESOLUTION";
    body?: string;
    content?: string;
    useForAiTraining?: boolean;
    issueCode?: string;
    issueType?: string;
    issueCustomText?: string | null;
    finalIssueName?: string;
    finalIssueType?: string;
    finalIssueCustomText?: string | null;
    resolutionCode?: string | null;
    resolutionCustomText?: string | null;
    responseText?: string | null;
    techNote?: string | null;
    resolutionStandardText?: string | null;
}

export interface RouteTicketData {
    targetRole: "PROCTOR" | "HALL_INVIGILATOR" | "EXAM_OFFICER" | "IT_SUPPORT";
    reason?: string | null;
}

export interface LifecycleTicketData {
    action: "START" | "REOPEN" | "ACKNOWLEDGE" | "CLOSE";
    note?: string | null;
}

export interface BulkTicketActionData {
    ticketIds: string[];
    action: "COMMENT" | "ROUTE" | "LIFECYCLE";
    mode?: "DISCUSSION" | "CONCLUSION" | "RESOLUTION";
    body?: string;
    issueCode?: string;
    issueType?: string;
    issueCustomText?: string | null;
    resolutionCode?: string | null;
    resolutionCustomText?: string | null;
    responseText?: string | null;
    techNote?: string | null;
    useForAiTraining?: boolean;
    targetRole?: "PROCTOR" | "HALL_INVIGILATOR" | "EXAM_OFFICER" | "IT_SUPPORT";
    lifecycleAction?: "START" | "REOPEN" | "ACKNOWLEDGE" | "CLOSE";
    note?: string | null;
}

export interface TicketStatsFilters {
    semesterId: string;
    semesterCode: string;
    semesterName: string;
    week: number | null;
    totalWeeks: number;
    rangeStart: string;
    rangeEnd: string;
}

export interface TicketStatsSummary {
    totalTickets: number;
    avgTimeToStartMinutes: number | null;
    avgTimeToResolveMinutes: number | null;
    startedSampleSize: number;
    resolvedSampleSize: number;
}

export interface TicketCountBucket {
    name: string;
    count: number;
}

export interface TicketSemesterBucket {
    semesterId: string;
    code: string;
    name: string;
    count: number;
}

export interface TicketStatsResponse {
    filters: TicketStatsFilters;
    summary: TicketStatsSummary;
    byIssueType: TicketCountBucket[];
    byIssueName: TicketCountBucket[];
    topSubjects: TicketCountBucket[];
    bySemester: TicketSemesterBucket[];
}

export const ticketsApi = {
    create: async (data: CreateTicketData): Promise<TicketFull> => {
        const response = await apiClient.post<{ data: TicketFull }>("/tickets", data);
        return response.data?.data ?? (response.data as any);
    },

    list: async (params?: ListTicketsParams): Promise<TicketFull[]> => {
        const response = await apiClient.get<TicketFull[]>("/tickets", { params });
        return (response.data as any)?.data ?? response.data ?? [];
    },

    getById: async (id: string): Promise<TicketFull> => {
        const response = await apiClient.get<{ data: TicketFull }>(`/tickets/${id}`);
        return response.data?.data ?? (response.data as any);
    },

    process: async (id: string, data: ProcessTicketData): Promise<TicketFull> => {
        const response = await apiClient.patch<{ data: TicketFull }>(`/tickets/${id}/process`, data);
        return response.data?.data ?? (response.data as any);
    },

    review: async (id: string, data: ReviewTicketData): Promise<TicketFull> => {
        const ticket = await ticketsApi.getById(id);
        const candidate = (ticket.aiCandidates ?? []).find((item) => item.reviewStatus === "PENDING_REVIEW");
        if (!candidate) {
            throw new Error("No pending AI candidate found for this ticket.");
        }
        return ticketsApi.reviewCandidate(id, candidate.id, data);
    },

    reviewCandidate: async (ticketId: string, candidateId: string, data: ReviewTicketData): Promise<TicketFull> => {
        const response = await apiClient.patch<{ data: TicketFull }>(
            `/tickets/${ticketId}/ai-candidates/${candidateId}/review`,
            data,
        );
        return response.data?.data ?? (response.data as any);
    },

    comment: async (id: string, data: CommentTicketData): Promise<TicketFull> => {
        const payload = {
            ...data,
            mode: data.mode ?? "DISCUSSION",
            body: data.body ?? data.content,
            issueCode: data.issueCode ?? data.finalIssueName,
            issueType: data.issueType ?? data.finalIssueType,
            issueCustomText: data.issueCustomText ?? data.finalIssueCustomText,
            responseText: data.responseText ?? data.resolutionStandardText,
        };
        const response = await apiClient.post<{ data: TicketFull }>(`/tickets/${id}/comments`, payload);
        return response.data?.data ?? (response.data as any);
    },

    route: async (id: string, data: RouteTicketData): Promise<TicketFull> => {
        const response = await apiClient.patch<{ data: TicketFull }>(`/tickets/${id}/route`, data);
        return response.data?.data ?? (response.data as any);
    },

    lifecycle: async (id: string, data: LifecycleTicketData): Promise<TicketFull> => {
        const response = await apiClient.patch<{ data: TicketFull }>(`/tickets/${id}/lifecycle`, data);
        return response.data?.data ?? (response.data as any);
    },

    bulkProcess: async (data: BulkProcessTicketData): Promise<BulkProcessResult> => {
        const response = await apiClient.post<BulkProcessResult>("/tickets/bulk-process", data);
        return (response.data as any)?.data ?? response.data;
    },

    bulkAction: async (data: BulkTicketActionData): Promise<BulkProcessResult> => {
        const response = await apiClient.post<BulkProcessResult>("/tickets/bulk-process", data);
        return (response.data as any)?.data ?? response.data;
    },

    getStats: async (params: { semesterId: string; week?: number }): Promise<TicketStatsResponse> => {
        const response = await apiClient.get<TicketStatsResponse | { data: TicketStatsResponse }>("/tickets/stats/overview", { params });
        return (response.data as any)?.data ?? response.data;
    },
};
