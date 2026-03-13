"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import {
    Ticket, CheckSquare, Square, RefreshCw, Loader2,
    AlertCircle, CheckCircle2, Clock, User,
    Image as ImageIcon, ChevronDown, ChevronRight, Zap,
    Filter, X, Bell, Hash, MapPin, UserPlus, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
    ticketsApi, TicketFull, IssueType, TicketStatus,
} from "@/lib/api/tickets";
import { usersApi, User as ApiUser } from "@/lib/api/users";
import { useSocket } from "@/hooks/use-socket";

// ── Constants ─────────────────────────────────────────────────────────────────
const PRIORITY_COLOR: Record<string, string> = {
    Urgent: "bg-red-100 text-red-700 border-red-300",
    High: "bg-orange-100 text-orange-700 border-orange-300",
    Medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
    Low: "bg-slate-100 text-slate-600 border-slate-300",
};

const STATUS_COLOR: Record<string, string> = {
    OPEN: "bg-blue-100 text-blue-700",
    Open: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-orange-100 text-orange-700",
    "In Progress": "bg-orange-100 text-orange-700",
    SOLVED: "bg-green-100 text-green-700",
    Resolved: "bg-green-100 text-green-700",
    CLOSED: "bg-slate-100 text-slate-500",
    Closed: "bg-slate-100 text-slate-500",
};

const ACTIVE_STATUSES = ["OPEN", "Open", "IN_PROGRESS", "In Progress"];

// ── Sub-components ─────────────────────────────────────────────────────────────
function TicketCard({
    ticket, selected, onToggle,
}: {
    ticket: TicketFull;
    selected: boolean;
    onToggle: () => void;
}) {
    const t = useTranslations("ExamOfficerTickets");
    const [imgOpen, setImgOpen] = useState(false);
    const roomNumber = ticket.session?.examRoom?.roomNumber ?? ticket.session?.roomNumber;
    const roleKey = ticket.assignee?.role?.toUpperCase().replace(" ", "_") as any;

    return (
        <div
            onClick={onToggle}
            className={cn(
                "flex gap-3 p-3.5 rounded-xl border cursor-pointer transition-all select-none",
                selected
                    ? "border-orange-400 bg-orange-50/60 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50",
            )}
        >
            {/* Checkbox */}
            <div className="mt-0.5 shrink-0 text-orange-500">
                {selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-300" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                {/* Title + badges */}
                <div className="flex items-start justify-between gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">{ticket.issueName}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", PRIORITY_COLOR[ticket.priority] ?? "bg-slate-100 text-slate-600 border-slate-300")}>
                            {ticket.priority}
                        </span>
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", STATUS_COLOR[ticket.status] ?? "bg-slate-100 text-slate-500")}>
                            {ticket.status}
                        </span>
                    </div>
                </div>

                {/* MSSV */}
                {ticket.studentCode && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-sm font-bold text-orange-600 tracking-wide font-mono">
                            {ticket.studentCode}
                        </span>
                    </div>
                )}

                {/* Meta row */}
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                    {ticket.reporter && (
                        <span className="flex items-center gap-1">
                            <User className="w-3 h-3" /> {ticket.reporter.fullName}
                        </span>
                    )}
                    {ticket.session?.subjectCode && (
                        <span className="font-mono font-semibold text-slate-700">{ticket.session.subjectCode}</span>
                    )}
                    {roomNumber && (
                        <span className="flex items-center gap-1 text-blue-600 font-semibold">
                            <MapPin className="w-3 h-3" /> {roomNumber}
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(ticket.createdAt), "HH:mm")}
                    </span>
                </div>

                {/* Description */}
                {ticket.description && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{ticket.description}</p>
                )}

                {/* Assigned to info */}
                {ticket.assignee && (
                    <div className="mt-1.5 flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5">
                        <UserPlus className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="text-xs text-blue-700 font-semibold">
                            {t("assignedTo", { name: ticket.assignee.fullName ?? ticket.assignee.email })}
                        </span>
                        <span className="text-[10px] text-blue-400 ml-1">
                            ({t(`role.${roleKey}` as any) ?? ticket.assignee.role})
                        </span>
                    </div>
                )}

                {/* Resolve note */}
                {ticket.resolveNote && (
                    <div className="mt-1.5 flex items-start gap-1.5 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-green-700">{ticket.resolveNote}</p>
                    </div>
                )}

                {/* Image thumbnail */}
                {ticket.attachment && (
                    <div className="mt-2">
                        <img
                            src={ticket.attachment}
                            alt="evidence"
                            onClick={(e) => { e.stopPropagation(); setImgOpen(true); }}
                            className="h-16 w-auto rounded-lg border border-slate-200 object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                        />
                    </div>
                )}
            </div>

            {/* Full-screen image modal */}
            {imgOpen && ticket.attachment && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
                    onClick={(e) => { e.stopPropagation(); setImgOpen(false); }}
                >
                    <div className="relative max-w-3xl max-h-[85vh]">
                        <img src={ticket.attachment} alt="attachment" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl" />
                        <button className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ExamOfficerTicketsPage() {
    const t = useTranslations("ExamOfficerTickets");
    const [tickets, setTickets] = useState<TicketFull[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>("active");
    const [filterType, setFilterType] = useState<string>("all");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [note, setNote] = useState("");
    const [processing, setProcessing] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [newCount, setNewCount] = useState(0);
    const [actionMode, setActionMode] = useState<"resolve" | "assign">("resolve");
    const [assignees, setAssignees] = useState<ApiUser[]>([]);
    const [assigneeId, setAssigneeId] = useState("");
    const { socket } = useSocket();
    const filterStatusRef = useRef(filterStatus);
    useEffect(() => { filterStatusRef.current = filterStatus; }, [filterStatus]);

    useEffect(() => {
        (async () => {
            try {
                const users = await usersApi.getAssignees();
                setAssignees(users);
            } catch { /* silently ignore */ }
        })();
    }, []);

    const fetchTickets = useCallback(async () => {
        try {
            setLoading(true);
            const params: Record<string, string> = {};
            if (filterStatus === "active") params.status = "OPEN";
            else if (filterStatus === "solved") params.status = "SOLVED";
            if (filterType !== "all") params.issueType = filterType;
            const list = await ticketsApi.list(params);
            setTickets(list);
            setSelectedIds(new Set());
        } catch {
            toast.error(t("toastLoadError"));
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterType]);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    // Real-time WebSocket
    useEffect(() => {
        if (!socket) return;
        const handleNewTicket = (payload: { ticket: TicketFull; reporter?: any }) => {
            const newTicket: TicketFull = {
                ...payload.ticket,
                reporter: payload.reporter ?? payload.ticket.reporter ?? null,
            };
            setTickets((prev) => {
                if (prev.some((tk) => tk.id === newTicket.id)) return prev;
                const status = newTicket.status;
                const inActiveFilter = ["OPEN", "Open", "IN_PROGRESS", "In Progress"].includes(status);
                if (filterStatusRef.current === "active" && !inActiveFilter) return prev;
                if (filterStatusRef.current === "solved" && !["SOLVED", "Resolved"].includes(status)) return prev;
                return [newTicket, ...prev];
            });
            setNewCount((c) => c + 1);
            const reporterName = payload.reporter?.fullName ?? "Giám thị";
            toast.info(t("newTicketToast", { reporter: reporterName, name: newTicket.issueName }), {
                duration: 6000,
                action: { label: t("view"), onClick: () => setNewCount(0) },
            });
        };
        socket.on("ticket:created", handleNewTicket);
        return () => { socket.off("ticket:created", handleNewTicket); };
    }, [socket]);

    const displayTickets = useMemo(() => {
        if (filterStatus === "assigned") return tickets.filter(tk => tk.assignee != null);
        return tickets;
    }, [tickets, filterStatus]);

    const grouped = useMemo(() => {
        const map = new Map<string, TicketFull[]>();
        for (const tk of displayTickets) {
            const key = tk.issueType ?? "Unknown";
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(tk);
        }
        return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
    }, [displayTickets]);

    const selectedTickets = tickets.filter((tk) => selectedIds.has(tk.id));
    const selectedTypes = new Set(selectedTickets.map((tk) => tk.issueType));
    const mixedTypes = selectedTypes.size > 1;

    function toggleTicket(id: string) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    function selectGroup(type: string) {
        const ids = tickets.filter((tk) => tk.issueType === type).map((tk) => tk.id);
        setSelectedIds((prev) => {
            const next = new Set(prev);
            const allSelected = ids.every((id) => next.has(id));
            if (allSelected) ids.forEach((id) => next.delete(id));
            else ids.forEach((id) => next.add(id));
            return next;
        });
    }

    function selectAll() { setSelectedIds(new Set(tickets.map((tk) => tk.id))); }
    function clearSelection() { setSelectedIds(new Set()); }

    function toggleGroup(type: string) {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(type)) next.delete(type); else next.add(type);
            return next;
        });
    }

    async function handleBulkResolve() {
        if (selectedIds.size === 0) return toast.warning(t("toastNoSelection"));
        if (!note.trim()) return toast.warning(t("toastEnterNote"));
        setProcessing(true);
        try {
            const result = await ticketsApi.bulkProcess({
                ticketIds: Array.from(selectedIds),
                action: "resolve",
                resolveNote: note.trim(),
            });
            const failedStr = result.failed > 0 ? t("toastResolvedFailed", { count: result.failed }) : "";
            toast.success(`✅ ${t("toastResolved", { count: result.processed, failed: failedStr })} ${t("toastNotified")}`);
            setNote("");
            await fetchTickets();
        } catch {
            toast.error(t("toastResolveFail"));
        } finally {
            setProcessing(false);
        }
    }

    async function handleBulkAssign() {
        if (selectedIds.size === 0) return toast.warning(t("toastNoSelection"));
        if (!assigneeId) return toast.warning(t("toastSelectAssignee"));
        setProcessing(true);
        try {
            const result = await ticketsApi.bulkProcess({
                ticketIds: Array.from(selectedIds),
                action: "assign",
                resolveNote: note.trim() || "Đang xử lý",
                assigneeId,
            });
            const assignee = assignees.find(a => a.id === assigneeId);
            toast.success(`📋 ${t("toastAssigned", { count: result.processed, name: assignee?.fullName ?? "người dùng" })}`);
            setNote(""); setAssigneeId("");
            await fetchTickets();
        } catch {
            toast.error(t("toastAssignFail"));
        } finally {
            setProcessing(false);
        }
    }

    const activeFilterCount = tickets.filter((tk) => ACTIVE_STATUSES.includes(tk.status)).length;
    const assignedFilterCount = tickets.filter((tk) => tk.assignee != null).length;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Ticket className="w-6 h-6 text-orange-500" /> {t("title")}
                        {newCount > 0 && (
                            <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full animate-pulse">
                                {t("newBadge", { count: newCount })}
                            </span>
                        )}
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">{t("subtitle")}</p>
                </div>
                <button
                    onClick={fetchTickets}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-600 transition-colors"
                >
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    {loading ? t("loading") : t("refresh")}
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-slate-400" />
                {[
                    { key: "active", label: t("filterActive", { count: activeFilterCount }) },
                    { key: "assigned", label: t("filterAssigned", { count: assignedFilterCount }) },
                    { key: "all", label: t("filterAll") },
                    { key: "solved", label: t("filterSolved") },
                ].map(({ key, label }) => (
                    <button key={key}
                        onClick={() => setFilterStatus(key)}
                        className={cn("px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                            filterStatus === key ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-600 border-slate-200 hover:border-orange-300")}>
                        {label}
                    </button>
                ))}
                <div className="w-px h-4 bg-slate-200 mx-1" />
                {["all", "Academic Violation", "Technical Issue", "Room Management", "Face Mismatch"].map((type) => (
                    <button key={type}
                        onClick={() => setFilterType(type)}
                        className={cn("px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border",
                            filterType === type ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400")}>
                        {type === "all" ? t("filterAllTypes") : (t(`issueType.${type}` as any) ?? type)}
                    </button>
                ))}
            </div>

            {/* Main 2-col layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
                {/* LEFT: Ticket list */}
                <div className="lg:col-span-2 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                        </div>
                    ) : displayTickets.length === 0 ? (
                        <div className="flex flex-col items-center py-20 text-slate-400">
                            <CheckCircle2 className="w-12 h-12 opacity-30 mb-2" />
                            <p className="font-medium text-slate-500">{t("noTickets")}</p>
                        </div>
                    ) : (
                        <>
                            {/* Global select controls */}
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <button onClick={selectAll} className="text-orange-500 hover:text-orange-600 font-semibold">{t("selectAll")}</button>
                                <span>·</span>
                                <button onClick={clearSelection} className="hover:text-slate-700">{t("clearSelection")}</button>
                                {selectedIds.size > 0 && (
                                    <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-bold">
                                        {t("selected", { count: selectedIds.size })}
                                    </span>
                                )}
                            </div>

                            {/* Grouped ticket list */}
                            {grouped.map(([type, items]) => {
                                const collapsed = collapsedGroups.has(type);
                                const groupSelectedCount = items.filter((tk) => selectedIds.has(tk.id)).length;
                                const allGroupSelected = groupSelectedCount === items.length;

                                return (
                                    <Card key={type} className="border-none shadow-sm overflow-hidden">
                                        {/* Group header */}
                                        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                                            <button
                                                onClick={() => toggleGroup(type)}
                                                className="flex items-center gap-2 text-sm font-bold text-slate-700"
                                            >
                                                {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                {type}
                                                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-xs font-semibold">{items.length}</span>
                                                {groupSelectedCount > 0 && (
                                                    <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                                                        {t("groupSelected", { count: groupSelectedCount })}
                                                    </span>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => selectGroup(type)}
                                                className={cn("text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors",
                                                    allGroupSelected
                                                        ? "bg-orange-500 text-white hover:bg-orange-600"
                                                        : "bg-white border border-slate-200 text-slate-600 hover:border-orange-400 hover:text-orange-600")}
                                            >
                                                {allGroupSelected ? t("deselectGroup") : t("selectGroup")}
                                            </button>
                                        </div>

                                        {!collapsed && (
                                            <CardContent className="p-3 space-y-2">
                                                {items.map((ticket) => (
                                                    <TicketCard
                                                        key={ticket.id}
                                                        ticket={ticket}
                                                        selected={selectedIds.has(ticket.id)}
                                                        onToggle={() => toggleTicket(ticket.id)}
                                                    />
                                                ))}
                                            </CardContent>
                                        )}
                                    </Card>
                                );
                            })}
                        </>
                    )}
                </div>

                {/* RIGHT: Bulk action panel */}
                <div className="space-y-3">
                    <Card className="border-none shadow-sm sticky top-6">
                        <CardHeader className="pb-2 px-5 pt-5">
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-orange-500" /> {t("quickProcess")}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 space-y-4">
                            {selectedIds.size === 0 ? (
                                <div className="flex flex-col items-center py-6 text-slate-400">
                                    <CheckSquare className="w-8 h-8 opacity-30 mb-2" />
                                    <p className="text-xs text-center">{t("selectHint")}</p>
                                </div>
                            ) : (
                                <>
                                    {/* Selection summary */}
                                    <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                                        <p className="text-xs font-bold text-orange-700 mb-2">
                                            {t("ticketsSelected", { count: selectedIds.size })}
                                        </p>
                                        {mixedTypes && (
                                            <div className="flex items-center gap-1.5 text-xs text-amber-600 mb-2">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                {t("mixedTypes")}
                                            </div>
                                        )}
                                        <div className="space-y-1 max-h-36 overflow-y-auto">
                                            {selectedTickets.map((tk) => (
                                                <div key={tk.id} className="flex items-center justify-between text-xs">
                                                    <span className="text-slate-700 truncate flex-1">{tk.reporter?.fullName ?? "—"}</span>
                                                    <span className="text-slate-400 ml-2 shrink-0">{tk.session?.subjectCode ?? ""}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action mode tabs */}
                                    <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs font-semibold">
                                        <button
                                            onClick={() => setActionMode("resolve")}
                                            className={cn("flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors",
                                                actionMode === "resolve" ? "bg-orange-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" /> {t("modeResolve")}
                                        </button>
                                        <button
                                            onClick={() => setActionMode("assign")}
                                            className={cn("flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors border-l border-slate-200",
                                                actionMode === "assign" ? "bg-blue-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}
                                        >
                                            <UserPlus className="w-3.5 h-3.5" /> {t("modeAssign")}
                                        </button>
                                    </div>

                                    {/* Assignee picker */}
                                    {actionMode === "assign" && (
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                                {t("assignTo")} <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={assigneeId}
                                                onChange={e => setAssigneeId(e.target.value)}
                                                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                                            >
                                                <option value="">{t("selectAssignee")}</option>
                                                {assignees.map(a => (
                                                    <option key={a.id} value={a.id}>
                                                        {a.fullName ?? a.username ?? a.email} ({a.role})
                                                    </option>
                                                ))}
                                            </select>
                                            {assignees.length === 0 && (
                                                <p className="text-[11px] text-slate-400 mt-1">{t("noAssignees")}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Note input */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                            {t("note")} {actionMode === "resolve" && <span className="text-red-500">*</span>}
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            placeholder={actionMode === "resolve" ? t("notePlaceholderResolve") : t("notePlaceholderAssign")}
                                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none placeholder:text-slate-300"
                                        />
                                    </div>

                                    {/* Submit */}
                                    <button
                                        onClick={actionMode === "resolve" ? handleBulkResolve : handleBulkAssign}
                                        disabled={processing || (actionMode === "resolve" ? !note.trim() : !assigneeId)}
                                        className={cn(
                                            "w-full h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors",
                                            actionMode === "resolve"
                                                ? (note.trim() ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-slate-100 text-slate-400 cursor-not-allowed")
                                                : (assigneeId ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-slate-100 text-slate-400 cursor-not-allowed")
                                        )}
                                    >
                                        {processing ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> {t("processing")}</>
                                        ) : actionMode === "resolve" ? (
                                            <><CheckCircle2 className="w-4 h-4" /> {t("resolveAll", { count: selectedIds.size })}</>
                                        ) : (
                                            <><ArrowRight className="w-4 h-4" /> {t("assignTickets", { count: selectedIds.size })}</>
                                        )}
                                    </button>

                                    <p className="text-xs text-slate-400 text-center">
                                        {actionMode === "resolve" ? t("resolveNotify") : t("assignNotify")}
                                    </p>

                                    <button onClick={clearSelection} className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors">
                                        {t("clearAll")}
                                    </button>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Stats mini card */}
                    <Card className="border-none shadow-sm">
                        <CardContent className="p-4 space-y-2">
                            {[
                                { label: t("statNew"), count: tickets.filter(tk => ["OPEN", "Open"].includes(tk.status)).length, color: "text-blue-600" },
                                { label: t("statInProgress"), count: tickets.filter(tk => ["IN_PROGRESS", "In Progress"].includes(tk.status)).length, color: "text-orange-600" },
                                { label: t("statAssigned"), count: tickets.filter(tk => tk.assignee != null).length, color: "text-purple-600" },
                                { label: t("statResolved"), count: tickets.filter(tk => ["SOLVED", "Resolved"].includes(tk.status)).length, color: "text-green-600" },
                            ].map(({ label, count, color }) => (
                                <div key={label} className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500">{label}</span>
                                    <span className={cn("text-sm font-bold", color)}>{count}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
