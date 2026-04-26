"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import {
    Ticket, CheckSquare, Square, RefreshCw, Loader2,
    CheckCircle2,
    X,
    Search, Zap, ChevronDown, ChevronRight, LayoutList, MessageSquare,
    ShieldAlert, Minus, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ticketsApi, TicketActivityHistory, TicketFull } from "@/lib/api/tickets";
import { usersApi, User } from "@/lib/api/users";
import { useSocket } from "@/hooks/use-socket";
import { getIssuePreset, getResolutionPresetsForIssue, reviewIssuePresets } from "@/lib/tickets/review-presets";

// â”€â”€ Priority config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PRIORITY_CFG = {
    Urgent: { order: 0, bar: "bg-red-500",    badge: "bg-red-100 text-red-700 border-red-200",      headerBg: "bg-red-50 border-red-100",      text: "text-red-700",    countBg: "bg-red-500 text-white",    dot: "bg-red-500",    Icon: ShieldAlert },
    Normal: { order: 1, bar: "bg-slate-400",  badge: "bg-slate-100 text-slate-700 border-slate-200",   headerBg: "bg-slate-50 border-slate-100",  text: "text-slate-700",  countBg: "bg-slate-500 text-white",  dot: "bg-slate-400",  Icon: Minus },
} as const;
type PriorityKey = keyof typeof PRIORITY_CFG;

function normalizePriority(priority?: string | null): PriorityKey {
    return (priority ?? "").toUpperCase() === "URGENT" ? "Urgent" : "Normal";
}

const STATUS_BADGE: Record<string, string> = {
    OPEN:        "bg-blue-50 text-blue-600 border border-blue-100",
    IN_PROGRESS: "bg-orange-50 text-orange-600 border border-orange-100",
    SOLVED:      "bg-emerald-50 text-emerald-600 border border-emerald-100",
    CLOSED:      "bg-slate-50 text-slate-500 border border-slate-100",
};

// STATUS_LABEL is now handled via t("statusShort.X") in the component

const KNOWN_KEYS = ["eosClientError","spinningScreen","needReassign","lostServerConn","networkError","cannotLogin","wrongExamCode","notInExamList"];
const ROUTE_ROLE_OPTIONS = [
    { role: "PROCTOR" as const, labelVi: "Chuyển giám thị phòng thi", labelEn: "Route to room proctor" },
    { role: "HALL_INVIGILATOR" as const, labelVi: "Chuyển giám thị hành lang", labelEn: "Route to hall invigilator" },
    { role: "EXAM_OFFICER" as const, labelVi: "Chuyển khảo thí", labelEn: "Route to exam officer" },
    { role: "IT_SUPPORT" as const, labelVi: "Chuyển IT Support", labelEn: "Route to IT Support" },
];

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function ExamOfficerTicketsPage() {
    const locale = useLocale();
    const isVietnamese = locale === "vi";
    const t = useTranslations("ExamOfficerTickets");
    const tS = useTranslations("ProctorSession");
    const resolve = (raw: string) => {
        if (!raw) return "—";
        if (KNOWN_KEYS.includes(raw)) {
            try {
                return tS(`incident.${raw}` as any);
            } catch {
                return raw;
            }
        }

        const localizedIssueMap: Record<string, { vi: string; en: string }> = {
            "Student violation during exam": {
                vi: "Vi phạm của sinh viên trong phòng thi",
                en: "Student violation during exam",
            },
            "Student violation": {
                vi: "Vi phạm của sinh viên",
                en: "Student violation",
            },
            "Technical issue": {
                vi: "Sự cố kỹ thuật",
                en: "Technical issue",
            },
            "Cannot login": {
                vi: "Không đăng nhập được",
                en: "Cannot login",
            },
        };

        const mapped = localizedIssueMap[raw];
        return mapped ? (isVietnamese ? mapped.vi : mapped.en) : raw;
    };

    // â”€â”€ State â”€â”€
    const [tickets, setTickets] = useState<TicketFull[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("attention");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
    const [activeTicketDetail, setActiveTicketDetail] = useState<TicketFull | null>(null);
    const [ticketDetailCache, setTicketDetailCache] = useState<Record<string, TicketFull>>({});
    const [note, setNote] = useState("");
    const [processing, setProcessing] = useState(false);
    const [collapsedPriority, setCollapsedPriority] = useState<Set<string>>(new Set());
    const [collapsedIssue, setCollapsedIssue] = useState<Set<string>>(new Set());
    const [newCount, setNewCount] = useState(0);
    const [search, setSearch] = useState("");
    const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
    const [reviewDecision, setReviewDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
    const [reviewIssueCode, setReviewIssueCode] = useState(reviewIssuePresets[0]?.code ?? "cannotLogin");
    const [reviewResolutionCode, setReviewResolutionCode] = useState("RESET_PASSWORD_GUIDE");
    const [reviewStandardText, setReviewStandardText] = useState("");
    const [reviewNote, setReviewNote] = useState("");
    const [commentMode, setCommentMode] = useState<"discussion" | "conclusion">("discussion");
    const [commentIssueCode, setCommentIssueCode] = useState(reviewIssuePresets[0]?.code ?? "cannotLogin");
    const [commentCustomIssueType, setCommentCustomIssueType] = useState<"Technical Issue" | "Academic Violation" | "Room Management" | "Face Mismatch">("Technical Issue");
    const [commentIssueCustomText, setCommentIssueCustomText] = useState("");
    const [commentResolutionCode, setCommentResolutionCode] = useState("RESET_PASSWORD_GUIDE");
    const [commentResolutionCustomText, setCommentResolutionCustomText] = useState("");
    const [commentStandardText, setCommentStandardText] = useState("");
    const [commentUseForAi, setCommentUseForAi] = useState(false);
    const [lifecycleAction, setLifecycleAction] = useState<"OPEN" | "IN_PROGRESS" | "SOLVED" | "CLOSED">("IN_PROGRESS");
    const [assignees, setAssignees] = useState<User[]>([]);
    const [assigning, setAssigning] = useState(false);
    const [assignmentQuery, setAssignmentQuery] = useState("");
    const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
    const [assignmentPopoverOpen, setAssignmentPopoverOpen] = useState(false);
    const { socket } = useSocket();
    const filterRef = useRef(filterStatus);
    useEffect(() => { filterRef.current = filterStatus; }, [filterStatus]);

    useEffect(() => {
        setSelectedIds(new Set());
        setNote("");
        setCommentMode("discussion");
        setCommentCustomIssueType("Technical Issue");
        setCommentIssueCustomText("");
        setCommentResolutionCustomText("");
        setCommentUseForAi(false);
        setLifecycleAction("IN_PROGRESS");
        setActiveTicketId(null);
        setActiveTicketDetail(null);
        setAssignmentQuery("");
        setAssignmentDialogOpen(false);
        setAssignmentPopoverOpen(false);
        if (filterStatus !== "review") {
            setReviewDecision("APPROVED");
            setReviewNote("");
        }
    }, [filterStatus, selectedDate]);

    useEffect(() => {
        let cancelled = false;
        usersApi.getAssignees()
            .then((items) => {
                if (!cancelled) setAssignees(items);
            })
            .catch(() => {
                if (!cancelled) setAssignees([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const fetchTickets = useCallback(async () => {
        try {
            setLoading(true);
            setTickets(await ticketsApi.list()); // always fetch ALL â€” filter client-side
            setSelectedIds(new Set());
        } catch { toast.error(t("toastLoadError")); }
        finally { setLoading(false); }
    }, []);

    const refreshTicketContext = useCallback(async (ticketIds: string[]) => {
        const uniqueIds = Array.from(new Set(ticketIds.filter(Boolean)));
        if (!uniqueIds.length) return;

        const refreshedTickets = (await Promise.all(
            uniqueIds.map((id) => ticketsApi.getById(id).catch(() => null)),
        )).filter(Boolean) as TicketFull[];

        if (!refreshedTickets.length) return;

        const refreshedMap = new Map(refreshedTickets.map((ticket) => [ticket.id, ticket]));

        setTickets((prev) => prev.map((ticket) => refreshedMap.get(ticket.id) ?? ticket));
        setTicketDetailCache((prev) => {
            const next = { ...prev };
            for (const ticket of refreshedTickets) next[ticket.id] = ticket;
            return next;
        });

        if (activeTicketId) {
            const activeRefreshed = refreshedMap.get(activeTicketId);
            if (activeRefreshed) setActiveTicketDetail(activeRefreshed);
        }
    }, [activeTicketId]);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    useEffect(() => {
        if (!activeTicketId) {
            setActiveTicketDetail(null);
            return;
        }
        let cancelled = false;
        ticketsApi.getById(activeTicketId)
            .then((ticket) => {
                if (!cancelled) {
                    setActiveTicketDetail(ticket);
                    setTicketDetailCache((prev) => ({ ...prev, [ticket.id]: ticket }));
                }
            })
            .catch(() => {
                if (!cancelled) setActiveTicketDetail(null);
            });
        return () => {
            cancelled = true;
        };
    }, [activeTicketId]);

    useEffect(() => {
        if (!socket) return;
        const handler = (payload: { ticket: TicketFull; reporter?: any }) => {
            const tk: TicketFull = { ...payload.ticket, reporter: payload.reporter ?? payload.ticket.reporter ?? null };
            setTickets(prev => prev.some(tk2 => tk2.id === tk.id) ? prev : [tk, ...prev]);
            setNewCount(c => c + 1);
            // Note: layout.tsx already shows the orange "Ticket má»›i" toast, so skip duplicates here.
        };
        socket.on("ticket:created", handler);
        return () => { socket.off("ticket:created", handler); };
    }, [socket]);

    // â”€â”€ Filtered list â”€â”€
    const showAssigneeCol = true;
    const ticketsForSelectedDate = useMemo(
        () => tickets.filter((tk) => format(new Date(tk.createdAt), "yyyy-MM-dd") === selectedDate),
        [tickets, selectedDate],
    );
    const displayed = useMemo(() => {
        let list = ticketsForSelectedDate;
        if (filterStatus === "attention") {
            list = list.filter(
                tk =>
                    tk.status !== "SOLVED" &&
                    (tk.assignee == null || tk.assignee?.role === "EXAM_OFFICER"),
            );
        }
        if (filterStatus === "assigned") list = list.filter(tk => tk.assignee != null && tk.status !== "SOLVED");  // Assigned, not solved
        if (filterStatus === "solved")   list = list.filter(tk => tk.status === "SOLVED");                          // Resolved only
        if (filterStatus === "review")   list = list.filter(tk => tk.needsAiReview === true);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(tk =>
                tk.studentCode?.toLowerCase().includes(q) ||
                resolve(tk.issueName).toLowerCase().includes(q) ||
                tk.reporter?.fullName?.toLowerCase().includes(q) ||
                (tk.session?.examRoom?.roomNumber ?? (tk.session as any)?.roomNumber)?.toLowerCase().includes(q) ||
                tk.session?.subjectCode?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [ticketsForSelectedDate, filterStatus, search]);

    useEffect(() => {
        const idsToFetch = displayed
            .slice(0, 20)
            .map((ticket) => ticket.id)
            .filter((id) => !ticketDetailCache[id]);

        if (!idsToFetch.length) return;
        let cancelled = false;

        Promise.all(
            idsToFetch.map((id) =>
                ticketsApi.getById(id).then((ticket) => ({ id, ticket })).catch(() => null),
            ),
        ).then((results) => {
            if (cancelled) return;
            const nextEntries = results.filter(Boolean) as { id: string; ticket: TicketFull }[];
            if (!nextEntries.length) return;
            setTicketDetailCache((prev) => {
                const next = { ...prev };
                for (const entry of nextEntries) next[entry.id] = entry.ticket;
                return next;
            });
        });

        return () => {
            cancelled = true;
        };
    }, [displayed, ticketDetailCache]);

    const stats = useMemo(() => ({
        urgent:     ticketsForSelectedDate.filter(tk => normalizePriority(tk.priority) === "Urgent" && tk.status !== "SOLVED").length,
        normal:     ticketsForSelectedDate.filter(tk => normalizePriority(tk.priority) === "Normal" && tk.status !== "SOLVED").length,
        inProgress: ticketsForSelectedDate.filter(tk => tk.status === "IN_PROGRESS").length,
        waiting:    ticketsForSelectedDate.filter(tk => tk.status === "OPEN").length,
        solved:     ticketsForSelectedDate.filter(tk => tk.status === "SOLVED").length,
        reviewPending: ticketsForSelectedDate.filter(tk => tk.needsAiReview === true).length,
        // Tab counts
        attentionCount: ticketsForSelectedDate.filter(
            tk =>
                tk.status !== "SOLVED" &&
                (tk.assignee == null || tk.assignee?.role === "EXAM_OFFICER"),
        ).length,
        assignedCount: ticketsForSelectedDate.filter(tk => tk.assignee != null && tk.status !== "SOLVED").length,
        allCount:      ticketsForSelectedDate.filter(tk => tk.status !== "SOLVED").length,
        solvedCount:   ticketsForSelectedDate.filter(tk => tk.status === "SOLVED").length,
    }), [ticketsForSelectedDate]);

    const grouped = useMemo(() => {
        const byPriority = new Map<string, Map<string, TicketFull[]>>();
        for (const tk of displayed) {
            const p = normalizePriority(tk.priority);
            if (!byPriority.has(p)) byPriority.set(p, new Map());
            const issueKey = tk.issueName;
            const byIssue = byPriority.get(p)!;
            if (!byIssue.has(issueKey)) byIssue.set(issueKey, []);
            byIssue.get(issueKey)!.push(tk);
        }
        return (["Urgent","Normal"] as PriorityKey[])
            .filter(p => byPriority.has(p))
            .map(p => {
                const issueMap = byPriority.get(p)!;
                const issues = Array.from(issueMap.entries())
                    .sort((a, b) => b[1].length - a[1].length);
                return { priority: p, issues } as { priority: PriorityKey; issues: [string, TicketFull[]][] };
            });
    }, [displayed]);

    const selected = tickets.filter(tk => selectedIds.has(tk.id));
    const activeTicket = activeTicketDetail ?? tickets.find((tk) => tk.id === activeTicketId) ?? null;
    const actionTicketIds = useMemo(() => (
        selectedIds.size > 0 ? [...selectedIds] : activeTicket ? [activeTicket.id] : []
    ), [activeTicket, selectedIds]);
    const selectedReviewTicket = filterStatus === "review" && selected.length === 1 ? selected[0] : null;
    const selectedReviewTicketDetail = selectedReviewTicket
        ? ticketDetailCache[selectedReviewTicket.id] ?? activeTicketDetail ?? selectedReviewTicket
        : null;

    const previousAssignees = useMemo(() => {
        if (!activeTicket) return [];
        const userMap = new Map(assignees.map((user) => [user.id, user]));
        const seen = new Set<string>();
        const ordered: User[] = [];

        for (const history of [...(activeTicket.activityHistories ?? [])].reverse()) {
            for (const candidateId of [history.toAssigneeId, history.fromAssigneeId]) {
                if (!candidateId || seen.has(candidateId)) continue;
                const user = userMap.get(candidateId);
                if (!user) continue;
                seen.add(candidateId);
                ordered.push(user);
            }
        }

        if (activeTicket.assignee && !seen.has(activeTicket.assignee.id)) {
            const current = userMap.get(activeTicket.assignee.id);
            if (current) ordered.unshift(current);
        }

        return ordered;
    }, [activeTicket, assignees]);

    const filteredAssignableUsers = useMemo(() => {
        const query = assignmentQuery.trim().toLowerCase();
        if (!query) return [];
        return assignees.filter((user) => {
            const haystacks = [user.email, user.code, user.fullName].filter(Boolean).map((value) => String(value).toLowerCase());
            return haystacks.some((value) => value.includes(query));
        });
    }, [assignmentQuery, assignees]);


    // â”€â”€ Selection helpers (SOLVED tickets cannot be selected) â”€â”€
    const toggleTicket = (id: string) => {
        const tk = tickets.find(t => t.id === id);
        if (tk?.status === "SOLVED") return; // block selection of SOLVED
        if (filterStatus === "review") {
            setSelectedIds(prev => prev.has(id) ? new Set() : new Set([id]));
            setActiveTicketId(id);
            return;
        }
        setSelectedIds(prev => {
            const n = new Set(prev);
            if (n.has(id)) {
                n.delete(id);
            } else {
                n.add(id);
                setActiveTicketId(id);
            }
            return n;
        });
    };
    const openTicketDetail = (id: string) => {
        setActiveTicketId(id);
        setAssignmentDialogOpen(false);
        setAssignmentPopoverOpen(false);
        if (filterStatus === "review") {
            setSelectedIds(new Set([id]));
        }
    };
    const selectIssueGroup = (priority: string, issueKey: string) => {
        if (filterStatus === "review") return;
        const ids = displayed.filter(tk => tk.priority === priority && tk.issueName === issueKey && tk.status !== "SOLVED").map(tk => tk.id);
        setSelectedIds(prev => {
            const n = new Set(prev);
            ids.every(id => n.has(id)) ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id));
            return n;
        });
    };
    const selectPriorityGroup = (p: string) => {
        if (filterStatus === "review") return;
        const ids = displayed.filter(tk => tk.priority === p && tk.status !== "SOLVED").map(tk => tk.id);
        setSelectedIds(prev => {
            const n = new Set(prev);
            ids.every(id => n.has(id)) ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id));
            return n;
        });
    };

    async function handleCommentTicket() {
        if (!actionTicketIds.length) {
            return toast.warning(isVietnamese ? "Chọn hoặc mở ít nhất 1 ticket." : "Select or open at least 1 ticket.");
        }
        if (commentMode === "discussion" && !note.trim()) {
            return toast.warning(isVietnamese ? "Nhập nội dung bình luận." : "Enter a comment.");
        }
        const hasValidIssue =
            commentIssueCode === "OTHER"
                ? !!commentCustomIssueType
                : !!commentIssuePreset;
        const hasValidResolution = !!commentResolutionCode;

        if (commentMode !== "discussion" && (!hasValidIssue || !hasValidResolution)) {
            return toast.warning(
                isVietnamese
                    ? "Vui lòng chọn lỗi và cách xử lý."
                    : "Please choose the issue and resolution.",
            );
        }
        setProcessing(true);
        try {
            const ids = [...actionTicketIds];
            if (commentMode === "discussion") {
                await Promise.all(ids.map((id) => ticketsApi.comment(id, { mode: "DISCUSSION", body: note.trim() })));
            } else {
                await Promise.all(
                    ids.map((id) =>
                        ticketsApi.comment(id, {
                            mode: "CONCLUSION",
                            body: commentPayloadText,
                            useForAiTraining: commentUseForAi || shouldForceAiReviewCandidate,
                            issueCode: commentIssueCode,
                            issueType: selectedCommentIssueType,
                            issueCustomText: commentIssueCode === "OTHER" && commentIssueCustomText.trim() ? commentIssueCustomText.trim() : null,
                            resolutionCode: commentResolutionCode,
                            resolutionCustomText: commentResolutionCode === "CUSTOM" && commentResolutionCustomText.trim() ? commentResolutionCustomText.trim() : null,
                            responseText: commentResponseText,
                            techNote: null,
                        }),
                    ),
                );
            }
            toast.success(
                commentMode === "discussion"
                    ? (isVietnamese ? "Đã thêm bình luận." : "Comment added.")
                    : (isVietnamese ? "Đã cập nhật kết quả xử lý." : "Handling result updated."),
            );
            setNote("");
            setCommentCustomIssueType("Technical Issue");
            setCommentIssueCustomText("");
            setCommentResolutionCustomText("");
            setCommentUseForAi(false);
            setCommentMode("discussion");
            await refreshTicketContext(ids);
        } catch {
            toast.error(
                isVietnamese
                    ? "Không thể xử lý bình luận."
                    : "Could not process the comment.",
            );
        } finally {
            setProcessing(false);
        }
    }

    async function handleLifecycleUpdate() {
        if (!actionTicketIds.length) {
            return toast.warning(isVietnamese ? "Chọn hoặc mở ít nhất 1 ticket." : "Select or open at least 1 ticket.");
        }

        setProcessing(true);
        try {
            if (actionTicketIds.length > 1) {
                await ticketsApi.bulkProcess({
                    ticketIds: actionTicketIds,
                    action: "change_status",
                    status: lifecycleAction,
                    note: note.trim() || null,
                });
            } else {
                await ticketsApi.process(actionTicketIds[0], {
                    action: "change_status",
                    status: lifecycleAction,
                    note: note.trim() || null,
                });
            }
            toast.success(isVietnamese ? "Đã cập nhật ticket." : "Ticket updated.");
            setNote("");
            await refreshTicketContext(actionTicketIds);
        } catch {
            toast.error(isVietnamese ? "Không thể cập nhật ticket." : "Could not update the ticket.");
        } finally {
            setProcessing(false);
        }
    }

    async function handleAssignTicket(target: { type: "role"; role: "PROCTOR" | "HALL_INVIGILATOR" | "EXAM_OFFICER" | "IT_SUPPORT" } | { type: "user"; user: User }) {
        const targetTicketIds = actionTicketIds;
        if (!targetTicketIds.length) {
            return toast.warning(isVietnamese ? "Chọn một ticket trước." : "Select a ticket first.");
        }

        setAssigning(true);
        try {
            if (target.type === "role") {
                if (targetTicketIds.length > 1) {
                    await ticketsApi.bulkAction({
                        ticketIds: targetTicketIds,
                        action: "ROUTE",
                        targetRole: target.role,
                        note: note.trim() || null,
                    });
                    await refreshTicketContext(targetTicketIds);
                } else {
                    const updated = await ticketsApi.route(targetTicketIds[0], {
                        targetRole: target.role,
                        reason: note.trim() || null,
                    });
                    setActiveTicketDetail(updated);
                    setTicketDetailCache((prev) => ({ ...prev, [updated.id]: updated }));
                    setTickets((prev) => prev.map((tk) => (tk.id === updated.id ? updated : tk)));
                }
            } else {
                if (targetTicketIds.length > 1) {
                    await ticketsApi.bulkProcess({
                        ticketIds: targetTicketIds,
                        action: "assign",
                        assigneeId: target.user.id,
                    });
                    await refreshTicketContext(targetTicketIds);
                } else {
                    const updated = await ticketsApi.process(targetTicketIds[0], {
                        action: activeTicket?.assignee ? "reassign" : "assign",
                        assigneeId: target.user.id,
                        note: note.trim() || undefined,
                    });

                    setActiveTicketDetail(updated);
                    setTicketDetailCache((prev) => ({ ...prev, [updated.id]: updated }));
                    setTickets((prev) => prev.map((tk) => (tk.id === updated.id ? updated : tk)));
                }
            }

            const assignedName = target.type === "role"
                ? ROUTE_ROLE_OPTIONS.find((item) => item.role === target.role)?.[isVietnamese ? "labelVi" : "labelEn"]
                : (target.user.email ?? target.user.id);
            toast.success(
                targetTicketIds.length > 1
                    ? (isVietnamese ? `Đã giao ${targetTicketIds.length} ticket cho ${assignedName}.` : `Assigned ${targetTicketIds.length} tickets to ${assignedName}.`)
                    : (isVietnamese ? `Đã giao ticket cho ${assignedName}.` : `Ticket assigned to ${assignedName}.`)
            );
            setAssignmentQuery("");
            setAssignmentDialogOpen(false);
            setAssignmentPopoverOpen(false);
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message ||
                err?.message ||
                (isVietnamese ? "Giao ticket thất bại." : "Failed to assign ticket.")
            );
        } finally {
            setAssigning(false);
        }
    }

    const reviewResolutionOptions = useMemo(
        () => getResolutionPresetsForIssue(reviewIssueCode),
        [reviewIssueCode],
    );
    const commentIssueOptions = useMemo(
        () => [
            ...reviewIssuePresets,
            {
                code: "OTHER",
                issueType: commentCustomIssueType,
                viLabel: isVietnamese ? "Lỗi khác (không bắt buộc)" : "Other issue (optional)",
            },
        ],
        [commentCustomIssueType, isVietnamese],
    );
    const commentResolutionOptions = useMemo(
        () => [
            ...getResolutionPresetsForIssue(commentIssueCode),
            {
                code: "CUSTOM",
                issueCodes: [commentIssueCode],
                viLabel: isVietnamese ? "Cách xử lý custom (không bắt buộc)" : "Custom resolution (optional)",
                viText: "",
            },
        ],
        [commentIssueCode, isVietnamese],
    );
    const commentIssuePreset = getIssuePreset(commentIssueCode);
    const isStructuredComment = commentMode !== "discussion";
    const selectedCommentIssueType = commentIssueCode === "OTHER" ? commentCustomIssueType : commentIssuePreset?.issueType;
    const selectedCommentResolutionLabel =
        commentResolutionOptions.find((item) => item.code === commentResolutionCode)?.viLabel ??
        commentResolutionCode;
    const commentResponseText =
        commentStandardText.trim() ||
        (commentResolutionCode === "CUSTOM" && commentResolutionCustomText.trim()
            ? commentResolutionCustomText.trim()
            : selectedCommentResolutionLabel);
    const shouldForceAiReviewCandidate = commentIssueCode === "OTHER" || commentResolutionCode === "CUSTOM";

    const formatIssueType = useCallback((issueType?: string | null) => {
        if (!issueType) return "—";
        if (!isVietnamese) return issueType;
        switch (issueType) {
            case "Technical Issue":
                return "Sự cố kỹ thuật";
            case "Academic Violation":
                return "Vi phạm học thuật";
            case "Room Management":
                return "Quản lý phòng";
            case "Face Mismatch":
                return "Sai lệch định danh";
            default:
                return issueType;
        }
    }, [isVietnamese]);

    const parseActivityPayload = useCallback((history: TicketActivityHistory) => {
        try {
            const parsed = JSON.parse(history.description ?? "{}");
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch {
            return {};
        }
    }, []);

    const formatActivityTitle = useCallback((history: TicketActivityHistory) => {
        switch (history.activityType) {
            case "TICKET_CREATED":
                return isVietnamese ? "Tạo ticket" : "Ticket created";
            case "TICKET_ASSIGNED":
                return isVietnamese ? "Giao ticket" : "Ticket assigned";
            case "TICKET_REASSIGNED":
                return isVietnamese ? "Chuyển xử lý" : "Ticket reassigned";
            case "TICKET_STARTED":
                return isVietnamese ? "Bắt đầu xử lý" : "Processing started";
            case "TICKET_RESOLVED":
                return isVietnamese ? "Đánh dấu đã giải quyết" : "Ticket resolved";
            case "TICKET_COMMENTED":
                return isVietnamese ? "Bình luận" : "Comment";
            default:
                return isVietnamese ? "Cập nhật ticket" : "Ticket update";
        }
    }, [isVietnamese]);

    const formatActivityMessage = useCallback((history: TicketActivityHistory) => {
        const payload = parseActivityPayload(history) as any;
        const meta = payload.meta ?? {};
        if (history.activityType === "TICKET_COMMENTED") {
            if (history.note?.trim()) return history.note.trim();
            if (meta.comment) return String(meta.comment);
        }

        if (isVietnamese) {
            if (history.activityType === "TICKET_CREATED") {
                return payload.message?.replace("created ticket", "đã tạo ticket") ?? "Ticket đã được tạo.";
            }
            if (history.activityType === "TICKET_ASSIGNED") {
                return history.note?.trim() || "Ticket đã được giao xử lý.";
            }
            if (history.activityType === "TICKET_REASSIGNED") {
                return history.note?.trim() || "Ticket đã được chuyển xử lý.";
            }
            if (history.activityType === "TICKET_RESOLVED") {
                return history.note?.trim() || "Ticket đã được đánh dấu giải quyết.";
            }
            if (history.activityType === "TICKET_COMMENTED" && payload.message) {
                return String(payload.message).replace("added a comment", "đã thêm một bình luận");
            }
        }

        return history.note?.trim() || payload.message || "—";
    }, [isVietnamese, parseActivityPayload]);

    const getActivityIcon = useCallback((history: TicketActivityHistory) => {
        switch (history.activityType) {
            case "TICKET_CREATED":
                return Ticket;
            case "TICKET_COMMENTED":
                return MessageSquare;
            case "TICKET_RESOLVED":
                return CheckCircle2;
            default:
                return LayoutList;
        }
    }, []);

    const getTicketSummary = useCallback((ticket: TicketFull) => {
        const detail = ticketDetailCache[ticket.id] ?? ticket;
        const histories = detail.activityHistories ?? [];
        const latestComment = [...histories]
            .reverse()
            .find((history) => history.activityType === "TICKET_COMMENTED" && history.note?.trim());
        const latestWorkflow = [...histories]
            .reverse()
            .find((history) => history.activityType !== "TICKET_CREATED");

        const pickStructuredSummary = (text?: string | null) => {
            if (!text?.trim()) return null;
            const lines = text
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean);

            const preferredPrefixes = isVietnamese
                ? ["Bình luận:", "Phản hồi:", "Ghi chú kỹ thuật:"]
                : ["Comment:", "Response:", "Technical note:"];

            for (const prefix of preferredPrefixes) {
                const match = lines.find((line) => line.startsWith(prefix));
                if (match) return match.slice(prefix.length).trim();
            }

            return lines[0] ?? null;
        };

        const raw =
            pickStructuredSummary(latestComment?.note) ||
            pickStructuredSummary(latestWorkflow?.note) ||
            detail.resolutionStandardText?.trim() ||
            detail.resolveNote?.trim() ||
            detail.description?.trim() ||
            "—";

        return raw.replace(/\s+/g, " ").trim();
    }, [isVietnamese, ticketDetailCache]);

    const commentPayloadText = useMemo(() => {
        if (commentMode === "discussion") return note.trim();
        const issueLabel =
            commentIssueCode === "OTHER"
                ? commentIssueCustomText.trim() || (isVietnamese ? "Lỗi khác" : "Other issue")
                : resolve(commentIssueCode);
        const normalizedResolutionLabel =
            commentResolutionCode === "CUSTOM"
                ? commentResolutionCustomText.trim() || (isVietnamese ? "Cách xử lý custom" : "Custom resolution")
                : selectedCommentResolutionLabel;
        const lines = [
            `${isVietnamese ? "Lỗi" : "Issue"}: ${issueLabel}`,
            `${isVietnamese ? "Loại vấn đề" : "Issue type"}: ${formatIssueType(selectedCommentIssueType)}`,
            `${isVietnamese ? "Cách xử lý" : "Resolution"}: ${normalizedResolutionLabel}`,
        ];
        if (note.trim()) {
            lines.unshift(`${isVietnamese ? "Bình luận" : "Comment"}: ${note.trim()}`);
        }
        return lines.join("\n");
    }, [
        commentIssueCode,
        commentIssueCustomText,
        commentMode,
        commentResolutionCode,
        commentResolutionCustomText,
        formatIssueType,
        isVietnamese,
        note,
        resolve,
        selectedCommentResolutionLabel,
        selectedCommentIssueType,
    ]);

    useEffect(() => {
        if (!selectedReviewTicket) return;
        const defaultIssue =
            getIssuePreset(selectedReviewTicket.finalIssueName) ??
            getIssuePreset(selectedReviewTicket.issueName) ??
            reviewIssuePresets[0];
        const nextIssueCode = defaultIssue.code;
        const nextResolutionOptions = getResolutionPresetsForIssue(nextIssueCode);
        const fallbackResolution = nextResolutionOptions[0];
        const nextResolutionCode =
            selectedReviewTicket.resolutionCode &&
            selectedReviewTicket.resolutionCode !== "CUSTOM" &&
            nextResolutionOptions.some((preset) => preset.code === selectedReviewTicket.resolutionCode)
                ? selectedReviewTicket.resolutionCode
                : fallbackResolution?.code ?? "";
        setReviewDecision("APPROVED");
        setReviewIssueCode(nextIssueCode);
        setReviewResolutionCode(nextResolutionCode);
        setReviewStandardText(
            selectedReviewTicket.resolutionStandardText ??
                fallbackResolution?.viText ??
                selectedReviewTicket.resolveNote ??
                "",
        );
        setReviewNote(selectedReviewTicket.reviewNote ?? "");
    }, [selectedReviewTicket]);

    useEffect(() => {
        if (!reviewResolutionOptions.length) return;
        if (!reviewResolutionOptions.some((preset) => preset.code === reviewResolutionCode)) {
            setReviewResolutionCode(reviewResolutionOptions[0].code);
            setReviewStandardText(reviewResolutionOptions[0].viText);
        }
    }, [reviewResolutionCode, reviewResolutionOptions]);

    useEffect(() => {
        if (!commentResolutionOptions.length) return;
        if (!commentResolutionOptions.some((preset) => preset.code === commentResolutionCode)) {
            setCommentResolutionCode(commentResolutionOptions[0].code);
            setCommentStandardText(commentResolutionOptions[0].viText);
            return;
        }
        if (!commentStandardText.trim()) {
            const preset = commentResolutionOptions.find((item) => item.code === commentResolutionCode);
            if (preset) setCommentStandardText(preset.viText);
        }
    }, [commentResolutionCode, commentResolutionOptions, commentStandardText]);

    const statusTabs = [
        {
            key: "attention",
            label: isVietnamese ? "Cần khảo thí" : "Needs attention",
            count: stats.attentionCount,
        },
        { key: "assigned", label: t("filterAssigned"),  count: stats.assignedCount },
        { key: "all",      label: t("filterAll"),       count: stats.allCount },
        { key: "review",   label: isVietnamese ? "Cần review" : "Needs review", count: stats.reviewPending },
        { key: "solved",   label: t("filterSolved"),    count: stats.solvedCount },
    ];

    const bulkContextTickets = useMemo(
        () => actionTicketIds
            .map((id) => ticketDetailCache[id] ?? tickets.find((ticket) => ticket.id === id))
            .filter(Boolean) as TicketFull[],
        [actionTicketIds, ticketDetailCache, tickets],
    );

    const availableLifecycleOptions = useMemo(() => ([
        { value: "OPEN" as const, label: isVietnamese ? "Mở" : "Open" },
        { value: "IN_PROGRESS" as const, label: isVietnamese ? "Đang xử lý" : "In Progress" },
        { value: "SOLVED" as const, label: isVietnamese ? "Đã giải quyết" : "Solved" },
        { value: "CLOSED" as const, label: isVietnamese ? "Đã đóng" : "Closed" },
    ]), [isVietnamese]);

    const lifecycleHint = useMemo(() => {
        if (!bulkContextTickets.length) {
            return isVietnamese ? "Chọn ticket trước để đổi trạng thái." : "Select tickets first to change status.";
        }
        return isVietnamese
            ? "Chọn trạng thái đích, giống thao tác trên Jira hoặc GitHub."
            : "Choose a target status, like Jira or GitHub.";
    }, [bulkContextTickets.length, isVietnamese]);

    async function handleReviewTicket() {
        if (!selectedReviewTicket) {
            return toast.warning(
                isVietnamese ? "Chọn 1 ticket cần review." : "Select 1 ticket that needs review.",
            );
        }
        setProcessing(true);
        try {
            if (reviewDecision === "APPROVED") {
                const issuePreset = getIssuePreset(reviewIssueCode);
                if (!issuePreset || !reviewResolutionCode || !reviewStandardText.trim()) {
                    toast.warning(
                        isVietnamese
                            ? "Vui lòng map đầy đủ lỗi, cách xử lý và phản hồi chuẩn."
                            : "Please map the issue, resolution, and standard response.",
                    );
                    return;
                }
                await ticketsApi.review(selectedReviewTicket.id, {
                    decision: "APPROVED",
                    finalIssueName: reviewIssueCode,
                    finalIssueType: issuePreset.issueType,
                    resolutionCode: reviewResolutionCode,
                    resolutionStandardText: reviewStandardText.trim(),
                    reviewNote: reviewNote.trim(),
                });
                toast.success(
                    isVietnamese
                        ? "Đã duyệt ticket vào tập train."
                        : "Ticket approved for the training set.",
                );
            } else {
                await ticketsApi.review(selectedReviewTicket.id, {
                    decision: "REJECTED",
                    reviewNote:
                        reviewNote.trim() ||
                        (isVietnamese
                            ? "Không đủ dữ liệu để đưa vào train."
                            : "Not enough data to include in training."),
                });
                toast.success(
                    isVietnamese
                        ? "Đã từ chối ticket khỏi tập train."
                        : "Ticket rejected from the training set.",
                );
            }
            setSelectedIds(new Set());
            await fetchTickets();
        } catch {
            toast.error(
                isVietnamese
                    ? "Không thể cập nhật trạng thái review."
                    : "Could not update the review status.",
            );
        } finally {
            setProcessing(false);
        }
    }

    return (
        <div className="h-full min-h-0 flex flex-col bg-[#f7f8fc] overflow-hidden">
            {assignmentDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-6">
                    <div className="flex h-[min(760px,calc(100vh-48px))] w-[min(1080px,calc(100vw-48px))] overflow-hidden rounded-[28px] bg-white shadow-2xl">
                        <div className="flex min-w-0 flex-1 flex-col border-r border-slate-200">
                            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
                                        {isVietnamese ? "Chuyển xử lý" : "Transfer handling"}
                                    </p>
                                    <h2 className="mt-2 text-2xl font-black text-slate-900">
                                        {actionTicketIds.length > 1
                                            ? (isVietnamese ? `Đang thao tác ${actionTicketIds.length} ticket` : `Working with ${actionTicketIds.length} tickets`)
                                            : (isVietnamese ? "Chọn vai trò hoặc người xử lý tiếp theo" : "Choose the next role or assignee")}
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setAssignmentDialogOpen(false)}
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 hover:border-slate-300 hover:text-slate-700"
                                >
                                    {isVietnamese ? "Đóng" : "Close"}
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 py-5">
                                <div className="mt-5">
                                    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-sm font-black text-slate-900">
                                            {isVietnamese ? "Xử lý ticket" : "Process tickets"}
                                        </p>
                                        <div className="mt-3 space-y-3">
                                            <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">
                                                            {isVietnamese ? "Trao đổi" : "Discussion"}
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {isVietnamese
                                                                ? "Có thể thêm kết quả xử lý nếu cần cập nhật lỗi và cách xử lý."
                                                                : "Add handling result when you need to update the issue and resolution."}
                                                        </p>
                                                    </div>
                                                    <label className="flex shrink-0 items-center gap-2 text-xs font-bold text-slate-600">
                                                        <input
                                                            type="checkbox"
                                                            checked={commentMode === "conclusion"}
                                                            onChange={(event) => setCommentMode(event.target.checked ? "conclusion" : "discussion")}
                                                            className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-400"
                                                        />
                                                        {isVietnamese ? "Thêm kết quả xử lý" : "Add handling result"}
                                                    </label>
                                                </div>
                                            </div>

                                            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
                                                placeholder={
                                                    isVietnamese ? "Nhập bình luận để trao đổi hoặc cập nhật..." : "Enter a comment to discuss or update..."
                                                }
                                                className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none placeholder:text-slate-300 bg-white" />

                                            {isStructuredComment && (
                                                <>
                                                    <select value={commentIssueCode} onChange={e => setCommentIssueCode(e.target.value)} className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                                                        {commentIssueOptions.map((preset) => <option key={preset.code} value={preset.code}>{preset.viLabel}</option>)}
                                                    </select>
                                                    {commentIssueCode === "OTHER" && (
                                                        <>
                                                            <select
                                                                value={commentCustomIssueType}
                                                                onChange={e => setCommentCustomIssueType(e.target.value as "Technical Issue" | "Academic Violation" | "Room Management" | "Face Mismatch")}
                                                                className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                                                            >
                                                                <option value="Technical Issue">{isVietnamese ? "Sự cố kỹ thuật" : "Technical Issue"}</option>
                                                                <option value="Academic Violation">{isVietnamese ? "Vi phạm học thuật" : "Academic Violation"}</option>
                                                                <option value="Room Management">{isVietnamese ? "Quản lý phòng" : "Room Management"}</option>
                                                                <option value="Face Mismatch">{isVietnamese ? "Sai lệch định danh" : "Face Mismatch"}</option>
                                                            </select>
                                                            <textarea
                                                                rows={2}
                                                                value={commentIssueCustomText}
                                                                onChange={e => setCommentIssueCustomText(e.target.value)}
                                                                placeholder={isVietnamese ? "Mô tả lỗi custom (không bắt buộc)" : "Custom issue text (optional)"}
                                                                className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none placeholder:text-slate-300 bg-white"
                                                            />
                                                        </>
                                                    )}
                                                    <select value={commentResolutionCode} onChange={e => {
                                                        const nextCode = e.target.value;
                                                        setCommentResolutionCode(nextCode);
                                                        const preset = commentResolutionOptions.find((item) => item.code === nextCode);
                                                        if (preset) setCommentStandardText(preset.viText);
                                                    }} className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                                                        {commentResolutionOptions.map((preset) => <option key={preset.code} value={preset.code}>{preset.viLabel}</option>)}
                                                    </select>
                                                    {commentResolutionCode === "CUSTOM" && (
                                                        <textarea
                                                            rows={2}
                                                            value={commentResolutionCustomText}
                                                            onChange={e => setCommentResolutionCustomText(e.target.value)}
                                                            placeholder={isVietnamese ? "Cách xử lý custom (không bắt buộc)" : "Custom resolution text (optional)"}
                                                            className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none placeholder:text-slate-300 bg-white"
                                                        />
                                                    )}
                                                    <label className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                                                        <input
                                                            type="checkbox"
                                                            checked={commentUseForAi || shouldForceAiReviewCandidate}
                                                            onChange={(e) => setCommentUseForAi(e.target.checked)}
                                                            disabled={shouldForceAiReviewCandidate}
                                                            className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-400"
                                                        />
                                                        <span>
                                                            {shouldForceAiReviewCandidate
                                                                ? (isVietnamese ? "Custom taxonomy sẽ được đưa vào Cần review để quyết định train AI." : "Custom taxonomy will be sent to Needs review before AI training.")
                                                                : (isVietnamese ? "Dùng cập nhật này cho AI training" : "Use this update for AI training")}
                                                        </span>
                                                    </label>
                                                </>
                                            )}

                                            <button
                                                onClick={handleCommentTicket}
                                                disabled={
                                                    processing ||
                                                    !actionTicketIds.length ||
                                                    (commentMode === "discussion" && !note.trim()) ||
                                                    (commentMode !== "discussion" && (
                                                        (!commentIssuePreset && commentIssueCode !== "OTHER") ||
                                                        !commentResolutionCode
                                                    ))
                                                }
                                                className={cn(
                                                    "w-full h-14 rounded-2xl text-base font-black flex items-center justify-center gap-2 transition-all shadow-sm",
                                                    (actionTicketIds.length > 0 && ((commentMode === "discussion" && !!note.trim()) || (commentMode !== "discussion" &&
                                                        (!!commentIssuePreset || commentIssueCode === "OTHER") &&
                                                        !!commentResolutionCode
                                                    )))
                                                        ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-200 hover:from-orange-600 hover:to-orange-700"
                                                        : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                                                )}>
                                                {processing ? <><Loader2 className="w-5 h-5 animate-spin" /> {t("processing")}</> :
                                                    <><LayoutList className="w-5 h-5" /> {commentMode === "discussion" ? (isVietnamese ? "Gửi bình luận" : "Send comment") : (isVietnamese ? "Cập nhật kết quả xử lý" : "Update handling result")}</>}
                                            </button>
                                        </div>
                                    </section>
                                </div>

                            </div>
                        </div>

                        <aside className="hidden w-[320px] shrink-0 bg-slate-50 lg:flex lg:flex-col">
                            <div className="border-b border-slate-200 px-5 py-5">
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                                    {isVietnamese ? "Tóm tắt" : "Summary"}
                                </p>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    {isVietnamese
                                        ? "Ưu tiên chuyển theo vai trò để backend auto-assign đúng người. Nếu cần linh hoạt hơn, chọn lại assignee cũ hoặc tìm user khác."
                                        : "Prefer role routing so the backend auto-assigns the right person. For more flexibility, choose a previous assignee or search another user."}
                                </p>
                            </div>
                            <div className="flex-1 overflow-y-auto px-5 py-5">
                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                                        {isVietnamese ? "Ticket đang thao tác" : "Tickets in context"}
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {bulkContextTickets.slice(0, 8).map((ticket) => (
                                            <span
                                                key={ticket.id}
                                                className="inline-flex max-w-full items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700"
                                                title={ticket.studentCode ?? "—"}
                                            >
                                                <span className="truncate">
                                                    {ticket.studentCode ?? "—"}
                                                </span>
                                            </span>
                                        ))}
                                    </div>
                                    {bulkContextTickets.length > 8 && (
                                        <p className="mt-2 text-xs text-slate-500">
                                            {isVietnamese ? `Còn ${bulkContextTickets.length - 8} ticket khác` : `${bulkContextTickets.length - 8} more tickets`}
                                        </p>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                                        {isVietnamese ? "Chuyển xử lý" : "Assign"}
                                    </p>
                                    <div className="relative mt-3">
                                        <button
                                            onClick={() => setAssignmentPopoverOpen((prev) => !prev)}
                                            className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:border-orange-300"
                                        >
                                            <span className="truncate">
                                                {activeTicket?.assignee?.email ?? (isVietnamese ? "Chọn vai trò hoặc người xử lý" : "Choose role or assignee")}
                                            </span>
                                            <span className="text-xs text-slate-400">{assignmentPopoverOpen ? "▲" : "▼"}</span>
                                        </button>

                                        {assignmentPopoverOpen && (
                                            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                                                <div className="border-b border-slate-100 px-3 py-2">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                                        <input
                                                            value={assignmentQuery}
                                                            onChange={(e) => setAssignmentQuery(e.target.value)}
                                                            placeholder={isVietnamese ? "Tìm email, mã, tên" : "Search email, code, name"}
                                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs outline-none focus:border-orange-300 focus:bg-white"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="max-h-[360px] overflow-y-auto p-2">
                                                    <div className="px-2 pb-1 pt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                                        {isVietnamese ? "Chuyển theo vai trò" : "Route by role"}
                                                    </div>
                                                    {ROUTE_ROLE_OPTIONS.map((option) => (
                                                        <button
                                                            key={option.role}
                                                            onClick={() => handleAssignTicket({ type: "role", role: option.role })}
                                                            disabled={assigning}
                                                            className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                                        >
                                                            <span>{isVietnamese ? option.labelVi : option.labelEn}</span>
                                                        </button>
                                                    ))}

                                                    {activeTicket && previousAssignees.length > 0 && (
                                                        <>
                                                            <div className="mt-2 px-2 pb-1 pt-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                                                {isVietnamese ? "Đã từng xử lý" : "Previous assignees"}
                                                            </div>
                                                            {previousAssignees.map((user) => (
                                                                <button
                                                                    key={user.id}
                                                                    onClick={() => handleAssignTicket({ type: "user", user })}
                                                                    disabled={assigning}
                                                                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                                                >
                                                                    <span className="truncate">{user.email ?? user.id}</span>
                                                                    {user.role && <span className="ml-3 shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{user.role}</span>}
                                                                </button>
                                                            ))}
                                                        </>
                                                    )}

                                                    {!!assignmentQuery.trim() && (
                                                        <>
                                                            <div className="mt-2 px-2 pb-1 pt-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                                                {isVietnamese ? "Kết quả tìm kiếm" : "Search results"}
                                                            </div>
                                                            {filteredAssignableUsers.length ? filteredAssignableUsers.map((user) => (
                                                                <button
                                                                    key={user.id}
                                                                    onClick={() => handleAssignTicket({ type: "user", user })}
                                                                    disabled={assigning}
                                                                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                                                >
                                                                    <span className="truncate">{user.email ?? user.id}</span>
                                                                    {user.role && <span className="ml-3 shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{user.role}</span>}
                                                                </button>
                                                            )) : (
                                                                <div className="px-3 py-3 text-xs text-slate-400">
                                                                    {isVietnamese ? "Không tìm thấy user phù hợp." : "No matching users found."}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                                        {isVietnamese ? "Đổi trạng thái" : "Change status"}
                                    </p>
                                    <div className="mt-3 space-y-3">
                                        <select
                                            value={lifecycleAction}
                                            onChange={(e) => setLifecycleAction(e.target.value as "OPEN" | "IN_PROGRESS" | "SOLVED" | "CLOSED")}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-amber-300"
                                            disabled={processing}
                                        >
                                            {availableLifecycleOptions.map((option) => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs leading-5 text-slate-500">
                                            {lifecycleHint}
                                        </p>
                                        <button
                                            onClick={handleLifecycleUpdate}
                                            disabled={processing || !actionTicketIds.length}
                                            className={cn(
                                                "w-full rounded-xl px-3 py-2.5 text-sm font-black transition-all",
                                                actionTicketIds.length && !processing
                                                    ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-200"
                                                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                            )}
                                        >
                                            {processing ? t("processing") : (isVietnamese ? "Cập nhật trạng thái" : "Update status")}
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </aside>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="shrink-0 bg-white border-b border-slate-100 px-6 py-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-md shadow-orange-100">
                            <Ticket className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                                {t("title")}
                                {newCount > 0 && <span className="px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full animate-pulse">+{newCount}</span>}
                            </h1>
                            <p className="text-xs text-slate-400">{t("subtitle")}</p>
                        </div>
                    </div>
                    <button onClick={fetchTickets} disabled={loading}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-orange-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:border-orange-300 transition-colors">
                        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                        {loading ? t("loading") : t("refresh")}
                    </button>
                </div>

                {/* Triage pills + search */}
                <div className="flex items-center gap-4 mb-3 flex-wrap">
                    {/* Cụm 1: Độ ưu tiên */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-50/80 border border-slate-100 rounded-[1rem]">
                        {[
                            { key: "urgent",     l: t("triageUrgent"),     v: stats.urgent,     dot: "bg-red-500",     cls: stats.urgent > 0 ? "border-red-200 bg-red-50" : "border-transparent bg-white shadow-sm",       pulse: true },
                            { key: "normal",     l: t("triageNormal"),     v: stats.normal,     dot: "bg-slate-500",   cls: stats.normal > 0 ? "border-slate-200 bg-slate-100"  : "border-transparent bg-white shadow-sm", pulse: false },
                        ].map(s => (
                            <div key={s.key} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold", s.cls)}>
                                <span className={cn("w-2 h-2 rounded-full shrink-0", s.dot, s.pulse && s.v > 0 && "animate-pulse")} />
                                <span className="text-slate-500">{s.l}</span>
                                <span className={cn("font-black text-sm", s.v > 0 && s.key === "urgent" ? "text-red-600" : "text-slate-800")}>{s.v}</span>
                            </div>
                        ))}
                    </div>

                    {/* Cụm 2: Trạng thái xử lý */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-50/80 border border-slate-100 rounded-[1rem]">
                        {[
                            { key: "inProgress", l: t("triageInProgress"), v: stats.inProgress, dot: "bg-blue-500",   cls: "border-transparent bg-white shadow-sm", pulse: false },
                            { key: "waiting",    l: t("triageWaiting"),    v: stats.waiting,     dot: "bg-slate-400",   cls: "border-transparent bg-white shadow-sm", pulse: false },
                            { key: "done",       l: t("triageDone"),       v: stats.solved,     dot: "bg-emerald-500", cls: "border-transparent bg-white shadow-sm", pulse: false },
                        ].map(s => (
                            <div key={s.key} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold", s.cls)}>
                                <span className={cn("w-2 h-2 rounded-full shrink-0", s.dot, s.pulse && s.v > 0 && "animate-pulse")} />
                                <span className="text-slate-500">{s.l}</span>
                                <span className={cn("font-black text-sm", s.v > 0 && s.key === "urgent" ? "text-red-600" : "text-slate-800")}>{s.v}</span>
                            </div>
                        ))}
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value || format(new Date(), "yyyy-MM-dd"))}
                                className="bg-transparent text-xs font-semibold text-slate-700 outline-none"
                                aria-label={isVietnamese ? "Lọc ticket theo ngày" : "Filter tickets by date"}
                            />
                        </label>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input type="text" placeholder={t("searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)}
                            className="pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-300 focus:border-transparent w-64 outline-none placeholder:text-slate-300 transition-all" />
                        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>}
                    </div>
                </div>

                {/* Status tabs */}
                <div className="flex items-center gap-1.5">
                    {statusTabs.map(({ key, label, count }) => (
                        <button key={key} onClick={() => setFilterStatus(key)}
                            className={cn("px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all",
                                filterStatus === key ? "bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-100" : "bg-white text-slate-600 border-slate-200 hover:border-orange-300")}>
                            {label}
                            {count > 0 && <span className={cn("ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black", filterStatus === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")}>{count}</span>}
                        </button>
                    ))}
                </div>
            </div>

            {/* â”€â”€ BODY â”€â”€ */}
            <div className="flex flex-1 min-h-0 overflow-hidden">

                {/* LEFT: 2-level grouped list */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center h-40 gap-2 text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
                            <span className="text-sm">{t("loading")}</span>
                        </div>
                    ) : displayed.length === 0 ? (
                        <div className="flex flex-col items-center py-24 gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-slate-200" />
                            </div>
                            <p className="text-sm font-semibold text-slate-400">{search ? t("noTicketsSearch") : t("noTickets")}</p>
                        </div>
                    ) : (
                        <>
                            {/* Batch row */}
                            <div className="flex items-center gap-3 text-xs text-slate-400 px-1">
                                {filterStatus !== "solved" && filterStatus !== "review" && (
                                    <>
                                        <button onClick={() => setSelectedIds(new Set(displayed.filter(t => t.status !== "SOLVED").map(t => t.id)))} className="text-orange-500 font-semibold hover:text-orange-600">{t("selectAll")}</button>
                                        <span>·</span>
                                        <button onClick={() => setSelectedIds(new Set())} className="hover:text-slate-600">{t("deselectAll")}</button>
                                        {selectedIds.size > 0 && <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-bold text-[10px]">✓ {selectedIds.size} {t("selected", { count: "" }).replace("{count} ", "")}</span>}
                                        {actionTicketIds.length > 0 && (
                                            <>
                                                <span>·</span>
                                                <button
                                                    onClick={() => setAssignmentDialogOpen(true)}
                                                    className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-xs font-black text-white shadow-sm shadow-orange-200 hover:bg-orange-600"
                                                >
                                                    <Zap className="h-3.5 w-3.5" />
                                                    {isVietnamese ? `Xử lý ${actionTicketIds.length} ticket` : `Process ${actionTicketIds.length} tickets`}
                                                </button>
                                            </>
                                        )}
                                    </>
                                )}
                                <span className="ml-auto text-[11px] font-medium">{displayed.length} tickets {search && `(${ticketsForSelectedDate.length})`}</span>
                            </div>

                            {/* â”€â”€ PRIORITY GROUPS â”€â”€ */}
                            {grouped.map(({ priority, issues }) => {
                                const cfg = PRIORITY_CFG[priority];
                                const { Icon } = cfg;
                                const priCollapsed = collapsedPriority.has(priority);
                                const totalInPriority = issues.reduce((s, [, tks]) => s + tks.length, 0);
                                const selInPriority = issues.reduce((s, [, tks]) => s + tks.filter(tk => selectedIds.has(tk.id)).length, 0);
                                const allPriSel = selInPriority === totalInPriority;

                                return (
                                    <div key={priority} className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm bg-white">
                                        {/* Priority level header */}
                                        <div className={cn("flex items-center gap-2 px-4 py-2.5 border-b", cfg.headerBg)}>
                                            <button onClick={() => setCollapsedPriority(prev => { const n = new Set(prev); n.has(priority) ? n.delete(priority) : n.add(priority); return n; })}
                                                className="flex items-center gap-2 flex-1 min-w-0">
                                                <Icon className={cn("w-4 h-4 shrink-0", cfg.text)} />
                                                <span className={cn("text-sm font-black", cfg.text)}>
                                                    {t(`priorityLabel.${priority}` as any)}
                                                </span>
                                                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black", cfg.countBg)}>{totalInPriority}</span>
                                                <span className="text-[10px] text-slate-400 font-medium">— {t("issueTypes", { count: issues.length })}</span>
                                                {selInPriority > 0 && <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold">✓ {selInPriority}</span>}
                                                {priCollapsed ? <ChevronRight className={cn("w-3.5 h-3.5 ml-auto", cfg.text)} /> : <ChevronDown className={cn("w-3.5 h-3.5 ml-auto", cfg.text)} />}
                                            </button>
                                            <button onClick={() => selectPriorityGroup(priority)}
                                                disabled={filterStatus === "review"}
                                                className={cn("text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors shrink-0",
                                                    filterStatus === "review"
                                                        ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                                                        : allPriSel
                                                            ? "bg-orange-500 text-white border-orange-500"
                                                            : "bg-white border-slate-200 text-slate-500 hover:border-orange-400 hover:text-orange-600")}>
                                                {allPriSel ? t("deselectAll") : t("selectGroup", { count: totalInPriority })}
                                            </button>
                                        </div>

                                        {/* â”€â”€ ISSUE SUB-GROUPS â”€â”€ */}
                                        {!priCollapsed && (
                                            <div className="divide-y divide-slate-50">
                                                {issues.map(([issueKey, items]) => {
                                                    const subKey = `${priority}::${issueKey}`;
                                                    const subCollapsed = collapsedIssue.has(subKey);
                                                    const selInIssue = items.filter(tk => selectedIds.has(tk.id)).length;
                                                    const allIssueSel = selInIssue === items.length;
                                                    const issueLabel = resolve(issueKey);

                                                    return (
                                                        <div key={issueKey}>
                                                            {/* Sub-group header */}
                                                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50/60">
                                                                <button onClick={() => setCollapsedIssue(prev => { const n = new Set(prev); n.has(subKey) ? n.delete(subKey) : n.add(subKey); return n; })}
                                                                    className="flex items-center gap-2 flex-1 min-w-0 text-left">
                                                                    {subCollapsed ? <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" /> : <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />}
                                                                    <span className="text-[11px] font-bold text-slate-700 truncate">{issueLabel}</span>
                                                                    <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[9px] font-black shrink-0">{items.length}</span>
                                                                    {selInIssue > 0 && <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[9px] font-black shrink-0">✓ {selInIssue}</span>}
                                                                </button>
                                                                {/* â† KEY button: select entire issue group */}
                                                                <button
                                                                    onClick={() => selectIssueGroup(priority, issueKey)}
                                                                    disabled={filterStatus === "review"}
                                                                    className={cn(
                                                                        "text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all shrink-0 flex items-center gap-1",
                                                                        filterStatus === "review"
                                                                            ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                                                                            : allIssueSel
                                                                                ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                                                                                : "bg-white border-slate-200 text-slate-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50"
                                                                    )}
                                                                >
                                                                    {allIssueSel ? <><CheckSquare className="w-2.5 h-2.5" /> {t("deselectGroup")}</> : <>{t("selectGroup", { count: items.length })}</>}
                                                                </button>
                                                            </div>

                                                            {/* Ticket rows */}
                                                            {!subCollapsed && (
                                                                <div className="bg-white">
                                                                    {/* Column headers â€” only on first sub-group */}
                                                                    <div className={cn("grid gap-x-3 items-center px-4 py-1.5 border-b border-slate-50", showAssigneeCol ? "grid-cols-[20px_4px_90px_60px_72px_90px_1fr_56px]" : "grid-cols-[20px_4px_90px_60px_72px_90px_56px]")}>
                                                                        {["","",t("colStudentId"),t("colRoom"),t("colSubject"),t("colProctor"),...(showAssigneeCol ? [isVietnamese ? "Xử lý bởi" : "Handled by"] : []),t("colTime")].map((h, i) => (
                                                                            <span key={i} className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{h}</span>
                                                                        ))}
                                                                    </div>
                                                                    {items.map(ticket => {
                                                                        const sel = selectedIds.has(ticket.id);
                                                                        const isSolved = ticket.status === "SOLVED";
                                                                        const room = ticket.session?.examRoom?.roomNumber ?? (ticket.session as any)?.roomNumber;
                                                                        return (
                                                                            <div key={ticket.id}
                                                                                onClick={() => openTicketDetail(ticket.id)}
                                                                                className={cn(
                                                                                    "group px-4 py-2.5 border-b border-slate-50 last:border-0 transition-all",
                                                                                    isSolved ? "opacity-60 cursor-default" : "cursor-pointer",
                                                                                    sel ? "bg-orange-50/70" : activeTicketId === ticket.id ? "bg-slate-50/80 ring-1 ring-inset ring-slate-200" : (!isSolved && "hover:bg-slate-50/60")
                                                                                )}
                                                                            >
                                                                                <div className={cn(
                                                                                    "grid gap-x-3 items-center",
                                                                                    showAssigneeCol ? "grid-cols-[20px_4px_90px_60px_72px_90px_1fr_56px]" : "grid-cols-[20px_4px_90px_60px_72px_90px_56px]",
                                                                                )}>
                                                                                    <div onClick={e => { e.stopPropagation(); toggleTicket(ticket.id); }} className="flex items-center justify-center">
                                                                                        {isSolved ? <span className="w-3.5 h-3.5" /> : sel ? <CheckSquare className="w-3.5 h-3.5 text-orange-500" /> : <Square className="w-3.5 h-3.5 text-slate-200 group-hover:text-slate-400 transition-colors" />}
                                                                                    </div>
                                                                                    <div className={cn("w-1 h-5 rounded-full", cfg.bar)} />
                                                                                    <span className="text-[11px] font-black text-orange-600 font-mono truncate">{ticket.studentCode ?? "—"}</span>
                                                                                    <span className="text-[11px] font-bold text-blue-600 truncate">{room ?? "—"}</span>
                                                                                    <span className="text-[10px] font-mono font-semibold text-slate-600 truncate">{ticket.session?.subjectCode ?? "—"}</span>
                                                                                    <span className="text-[10px] text-slate-500 truncate">{ticket.reporter?.fullName ?? "—"}</span>
                                                                                    {showAssigneeCol && (
                                                                                        <div className="flex items-center gap-1 min-w-0">
                                                                                            {ticket.assignee ? (
                                                                                                <span className="flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded-md truncate max-w-full">
                                                                                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                                                                                                    {ticket.assignee.email ?? ticket.assignee.fullName}
                                                                                                </span>
                                                                                            ) : (
                                                                                                <span className="text-[10px] text-slate-300">—</span>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                    <div className="flex flex-col gap-0.5 items-end">
                                                                                        <span className="text-[10px] text-slate-400 tabular-nums font-mono">{format(new Date(ticket.createdAt), "HH:mm")}</span>
                                                                                        {ticket.needsAiReview === true && (
                                                                                            <span className="text-[8px] font-semibold px-1 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                                                                                                {isVietnamese ? "Cần review" : "Needs review"}
                                                                                            </span>
                                                                                        )}
                                                                                        <span className={cn("text-[8px] font-semibold px-1 py-0.5 rounded", STATUS_BADGE[ticket.status])}>{t(`statusShort.${ticket.status}` as any) || ticket.status}</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="ml-[30px] mt-2 flex items-start gap-2">
                                                                                    <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                                                                                    <p className="line-clamp-2 text-[10px] leading-5 text-slate-500">
                                                                                        {getTicketSummary(ticket)}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>

                {/* RIGHT: Quick Process panel (hidden when viewing solved tab) */}
                <div className="w-[460px] shrink-0 min-h-0 border-l border-slate-100 bg-white flex flex-col overflow-hidden">
                    <div className="p-4 flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-orange-500" />
                            <span className="text-xs font-black text-slate-800">{filterStatus === "review" ? "AI Review" : (isVietnamese ? "Chi tiết ticket" : "Ticket details")}</span>
                            {filterStatus !== "review" && filterStatus !== "solved" && actionTicketIds.length > 0 && (
                                <button
                                    onClick={() => setAssignmentDialogOpen(true)}
                                    className="ml-auto inline-flex items-center gap-2 rounded-xl bg-orange-500 px-3.5 py-2.5 text-xs font-black text-white shadow-sm shadow-orange-200 hover:bg-orange-600"
                                >
                                    <Zap className="h-3.5 w-3.5" />
                                    {isVietnamese ? `Xử lý ${actionTicketIds.length} ticket` : `Process ${actionTicketIds.length} tickets`}
                                </button>
                            )}
                        </div>
                        {filterStatus === "review" ? (
                            !selectedReviewTicket ? (
                                <div className="flex flex-col items-center py-10 gap-3 text-slate-300">
                                    <LayoutList className="w-10 h-10 opacity-40" />
                                    <p className="text-xs text-center text-slate-400 leading-relaxed">
                                        {isVietnamese
                                            ? "Chọn 1 ticket cần review để map lại dữ liệu trước khi train."
                                            : "Select 1 ticket that needs review to remap the data before training."}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-[11px] text-slate-700 space-y-2">
                                        <p className="font-bold text-amber-700">
                                            {isVietnamese ? "Thông tin cần chuẩn hóa" : "Data to normalize"}
                                        </p>
                                        <div><span className="font-semibold">{isVietnamese ? "Lỗi custom:" : "Custom issue:"}</span> {selectedReviewTicket.finalIssueCustomText ?? (isVietnamese ? "Không có" : "None")}</div>
                                        <div><span className="font-semibold">{isVietnamese ? "Xử lý custom:" : "Custom resolution:"}</span> {selectedReviewTicket.resolutionCustomText ?? (isVietnamese ? "Không có" : "None")}</div>
                                        <div><span className="font-semibold">{isVietnamese ? "Phản hồi cuối:" : "Final response:"}</span> {selectedReviewTicket.resolveNote ?? (isVietnamese ? "Không có" : "None")}</div>
                                    </div>
                                    <div className="rounded-xl border border-slate-100 p-3">
                                        <p className="text-slate-400 mb-2 text-[11px]">{isVietnamese ? "Ảnh ticket" : "Ticket image"}</p>
                                        {selectedReviewTicketDetail?.attachment ? (
                                            <a
                                                href={selectedReviewTicketDetail.attachment}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block overflow-hidden rounded-xl border border-slate-200 bg-slate-50 hover:border-orange-300 transition-colors"
                                            >
                                                <img
                                                    src={selectedReviewTicketDetail.attachment}
                                                    alt={isVietnamese ? "Ảnh ticket" : "Ticket attachment"}
                                                    className="h-48 w-full object-cover"
                                                />
                                                <div className="px-3 py-2 text-[11px] font-medium text-orange-600">
                                                    {isVietnamese ? "Bấm để mở ảnh đầy đủ" : "Click to open full image"}
                                                </div>
                                            </a>
                                        ) : (
                                            <p className="text-[12px] text-slate-500">
                                                {isVietnamese ? "Ticket này không có ảnh đính kèm." : "This ticket has no attachment."}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex rounded-xl overflow-hidden border border-slate-100 text-[11px] font-bold shadow-sm">
                                        <button onClick={() => setReviewDecision("APPROVED")} className={cn("flex-1 py-2.5 transition-colors", reviewDecision === "APPROVED" ? "bg-emerald-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>
                                            {isVietnamese ? "Duyệt train" : "Approve training"}
                                        </button>
                                        <button onClick={() => setReviewDecision("REJECTED")} className={cn("flex-1 py-2.5 border-l border-slate-100 transition-colors", reviewDecision === "REJECTED" ? "bg-red-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>
                                            {isVietnamese ? "Từ chối" : "Reject"}
                                        </button>
                                    </div>
                                    {reviewDecision === "APPROVED" && (
                                        <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                                            <div className="space-y-1.5">
                                                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                                                    {isVietnamese ? "Nhóm lỗi chuẩn" : "Standard issue group"}
                                                </p>
                                                <select
                                                    value={reviewIssueCode}
                                                    onChange={e => setReviewIssueCode(e.target.value)}
                                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm leading-5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                                >
                                                    {reviewIssuePresets.map((preset) => <option key={preset.code} value={preset.code}>{preset.viLabel}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                                                    {isVietnamese ? "Cách xử lý chuẩn" : "Standard resolution"}
                                                </p>
                                                <select
                                                    value={reviewResolutionCode}
                                                    onChange={e => {
                                                        const nextCode = e.target.value;
                                                        setReviewResolutionCode(nextCode);
                                                        const preset = reviewResolutionOptions.find((item) => item.code === nextCode);
                                                        if (preset) setReviewStandardText(preset.viText);
                                                    }}
                                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm leading-5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                                >
                                                    {reviewResolutionOptions.map((preset) => <option key={preset.code} value={preset.code}>{preset.viLabel}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                                                    {isVietnamese ? "Phản hồi chuẩn để train" : "Standard response for training"}
                                                </p>
                                                <textarea
                                                    rows={5}
                                                    value={reviewStandardText}
                                                    onChange={e => setReviewStandardText(e.target.value)}
                                                    placeholder={isVietnamese ? "Phản hồi chuẩn sau khi reviewer map lại" : "Standard response after reviewer mapping"}
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-none placeholder:text-slate-300"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-1.5">
                                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                            {isVietnamese ? "Ghi chú review nội bộ" : "Internal review note"}
                                        </p>
                                        <textarea
                                            rows={4}
                                            value={reviewNote}
                                            onChange={e => setReviewNote(e.target.value)}
                                            placeholder={isVietnamese ? "Ghi chú review nội bộ" : "Internal review note"}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none placeholder:text-slate-300"
                                        />
                                    </div>
                                    <button onClick={handleReviewTicket} disabled={processing || (reviewDecision === "APPROVED" && !reviewStandardText.trim())} className={cn("w-full h-10 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all", reviewDecision === "APPROVED" ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-100" : "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-sm shadow-red-100")}>
                                        {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> {isVietnamese ? "Đang cập nhật" : "Updating"}</> : reviewDecision === "APPROVED" ? (isVietnamese ? "Duyệt vào train" : "Approve for training") : (isVietnamese ? "Từ chối khỏi train" : "Reject from training")}
                                    </button>
                                </>
                            )
                        ) : filterStatus === "solved" ? (
                            <div className="flex flex-col items-center py-10 gap-3 text-slate-300">
                                <CheckCircle2 className="w-10 h-10 opacity-40 text-emerald-400" />
                                <p className="text-xs text-center text-slate-400 leading-relaxed">
                                    {isVietnamese ? "Ticket đã xử lý không thể thay đổi" : "Resolved tickets cannot be changed"}
                                </p>
                            </div>
                        ) : (
                            activeTicket ? (
                                <div className="space-y-3">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                        <p className="text-xs font-black text-slate-800 mb-1">{resolve(activeTicket.issueName)}</p>
                                        <p className="text-[11px] text-slate-500">
                                            {activeTicket.studentCode ?? "—"} · {(activeTicket.session?.examRoom?.roomNumber ?? (activeTicket.session as any)?.roomNumber) ?? "—"} · {activeTicket.session?.subjectCode ?? "—"}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                                        <div className="rounded-xl border border-slate-100 p-3">
                                            <p className="text-slate-400 mb-1">{isVietnamese ? "Trạng thái" : "Status"}</p>
                                            <span className={cn("inline-flex text-[10px] font-semibold px-2 py-1 rounded", STATUS_BADGE[activeTicket.status])}>
                                                {t(`statusShort.${activeTicket.status}` as any) || activeTicket.status}
                                            </span>
                                        </div>
                                        <div className="rounded-xl border border-slate-100 p-3">
                                            <p className="text-slate-400 mb-1">{isVietnamese ? "Mức độ" : "Priority"}</p>
                                            <p className="font-semibold text-slate-700">{t(`priorityLabel.${normalizePriority(activeTicket.priority)}` as any)}</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-100 p-3 col-span-2">
                                            <p className="text-slate-400 mb-1">{isVietnamese ? "Giám thị tạo ticket" : "Reporter"}</p>
                                            <p className="font-semibold text-slate-700">{activeTicket.reporter?.fullName ?? "—"}</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-100 p-3 col-span-2">
                                            <p className="text-slate-400 mb-1">{isVietnamese ? "Phòng thi" : "Exam room"}</p>
                                            <p className="font-semibold text-slate-700">
                                                {(activeTicket.session?.examRoom?.roomNumber ?? (activeTicket.session as any)?.roomNumber) ?? "—"}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-slate-100 p-3 col-span-2">
                                            <p className="text-slate-400 mb-1">{isVietnamese ? "Người xử lý" : "Assignee"}</p>
                                            <p className="font-semibold text-slate-700">{activeTicket.assignee?.email ?? activeTicket.assignee?.fullName ?? "—"}</p>
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-slate-100 p-3">
                                        <p className="text-slate-400 mb-2 text-[11px]">{isVietnamese ? "Ảnh đính kèm" : "Attachment"}</p>
                                        {activeTicket.attachment ? (
                                            <a
                                                href={activeTicket.attachment}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block overflow-hidden rounded-xl border border-slate-200 bg-slate-50 hover:border-orange-300 transition-colors"
                                            >
                                                <img
                                                    src={activeTicket.attachment}
                                                    alt={isVietnamese ? "Ảnh ticket" : "Ticket attachment"}
                                                    className="h-40 w-full object-cover"
                                                />
                                                <div className="px-3 py-2 text-[11px] font-medium text-orange-600">
                                                    {isVietnamese ? "Bấm để mở ảnh đầy đủ" : "Click to open full image"}
                                                </div>
                                            </a>
                                        ) : (
                                            <p className="text-[12px] text-slate-500">—</p>
                                        )}
                                    </div>
                                    <div className="rounded-xl border border-slate-100 p-3">
                                        <p className="text-slate-400 mb-1 text-[11px]">{isVietnamese ? "Mô tả" : "Description"}</p>
                                        <p className="text-[12px] text-slate-700 whitespace-pre-wrap">{activeTicket.description?.trim() || "—"}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-100 p-3">
                                        <p className="text-slate-400 mb-1 text-[11px]">{isVietnamese ? "Phản hồi cuối" : "Final response"}</p>
                                        <p className="text-[12px] text-slate-700 whitespace-pre-wrap">{activeTicket.resolveNote?.trim() || activeTicket.resolutionStandardText?.trim() || "—"}</p>
                                    </div>
                                    {(activeTicket.status === "SOLVED" || activeTicket.resolutionCode || activeTicket.resolvedAt) && (
                                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                                            <p className="text-emerald-700 mb-2 text-[11px] font-bold uppercase tracking-widest">
                                                {isVietnamese ? "Snapshot cuối" : "Final snapshot"}
                                            </p>
                                            <div className="space-y-1 text-[12px] text-slate-700">
                                                <p><span className="font-semibold">{isVietnamese ? "Lỗi:" : "Issue:"}</span> {activeTicket.finalIssueCustomText || resolve(activeTicket.finalIssueName ?? activeTicket.issueName)}</p>
                                                <p><span className="font-semibold">{isVietnamese ? "Loại:" : "Type:"}</span> {activeTicket.finalIssueType ?? "—"}</p>
                                                <p><span className="font-semibold">Resolution:</span> {activeTicket.resolutionCustomText || activeTicket.resolutionCode || "—"}</p>
                                                <p><span className="font-semibold">{isVietnamese ? "Resolved at:" : "Resolved at:"}</span> {activeTicket.resolvedAt ? format(new Date(activeTicket.resolvedAt), "dd/MM/yyyy HH:mm") : "—"}</p>
                                                <p><span className="font-semibold">AI:</span> {activeTicket.needsAiReview ? (isVietnamese ? "Đang chờ review" : "Pending review") : "—"}</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="rounded-xl border border-slate-100 p-3">
                                        <p className="text-slate-400 mb-1 text-[11px]">{isVietnamese ? "Ghi chú kỹ thuật" : "Technical note"}</p>
                                        <p className="text-[12px] text-slate-700 whitespace-pre-wrap">{activeTicket.techNote?.trim() || "—"}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-100 p-3">
                                        <div className="flex items-center gap-2 mb-3">
                                            <LayoutList className="w-4 h-4 text-orange-500" />
                                            <p className="text-slate-700 text-[12px] font-bold">
                                                {isVietnamese ? "Lịch sử xử lý" : "Activity history"}
                                            </p>
                                        </div>
                                        {activeTicket.activityHistories?.length ? (
                                            <div className="space-y-0">
                                                {activeTicket.activityHistories.map((history, index) => {
                                                    const Icon = getActivityIcon(history);
                                                    return (
                                                        <div key={history.id} className="relative flex gap-3 pb-4 last:pb-0">
                                                            {index < activeTicket.activityHistories!.length - 1 && (
                                                                <div className="absolute left-[15px] top-8 bottom-0 w-px bg-slate-200" />
                                                            )}
                                                            <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-orange-100 bg-orange-50 text-orange-600">
                                                                <Icon className="w-3.5 h-3.5" />
                                                            </div>
                                                            <div className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="min-w-0">
                                                                        <p className="text-[12px] font-bold text-slate-800">
                                                                            {formatActivityTitle(history)}
                                                                        </p>
                                                                        <p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-slate-600">
                                                                            {formatActivityMessage(history)}
                                                                        </p>
                                                                    </div>
                                                                    <span className="shrink-0 text-[10px] font-medium text-slate-400">
                                                                        {format(new Date(history.createdAt), "HH:mm - dd/MM")}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-[12px] text-slate-500">
                                                {isVietnamese ? "Chưa có lịch sử xử lý." : "No activity history yet."}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-[11px] text-slate-400">
                                        {isVietnamese ? "Tạo lúc" : "Created at"}: {format(new Date(activeTicket.createdAt), "dd/MM/yyyy HH:mm")}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center py-10 gap-3 text-slate-300">
                                    <LayoutList className="w-10 h-10 opacity-40" />
                                    <p className="text-xs text-center text-slate-400 leading-relaxed">
                                        {isVietnamese ? "Chọn một ticket để xem chi tiết." : "Select a ticket to view details."}
                                    </p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

