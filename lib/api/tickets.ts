import apiClient from "./client";

export type IssueType =
    | "Academic Violation"
    | "Technical Issue"
    | "Room Management"
    | "Face Mismatch";

export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";
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
    createdById?: string;
    reporterId?: string;
    studentCode?: string | null;
    reporter?: TicketReporter | null;
    assignee?: TicketReporter | null;
    session?: TicketSession | null;
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
}

export interface ListTicketsParams {
    status?: string;
    issueType?: string;
    sessionId?: string;
    fromDate?: string;
    toDate?: string;
}

export interface ProcessTicketData {
    action: "resolve" | "assign" | "start";
    resolveNote: string;
    assigneeId?: string;
}

export interface BulkProcessTicketData {
    ticketIds: string[];
    action: "resolve" | "assign";
    resolveNote: string;
    assigneeId?: string;
}

export interface BulkProcessResult {
    processed: number;
    failed: number;
    details: { ticketId: string; success: boolean; error?: string }[];
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

    bulkProcess: async (data: BulkProcessTicketData): Promise<BulkProcessResult> => {
        const response = await apiClient.post<BulkProcessResult>("/tickets/bulk-process", data);
        return (response.data as any)?.data ?? response.data;
    },
};
