"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import {
    Ticket, CheckSquare, Square, RefreshCw, Loader2,
    CheckCircle2, Clock, User,
    X, Hash, MapPin, UserPlus, ArrowRight,
    Search, Zap, ChevronDown, ChevronRight, LayoutList,
    ShieldAlert, Flame, TrendingDown, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ticketsApi, TicketFull } from "@/lib/api/tickets";
import { usersApi, User as ApiUser } from "@/lib/api/users";
import { useSocket } from "@/hooks/use-socket";

// ── Priority config ─────────────────────────────────────────────────────────
const PRIORITY_CFG = {
    Urgent: { order: 0, bar: "bg-red-500",    badge: "bg-red-100 text-red-700 border-red-200",      headerBg: "bg-red-50 border-red-100",      text: "text-red-700",    countBg: "bg-red-500 text-white",    dot: "bg-red-500",    Icon: ShieldAlert },
    High:   { order: 1, bar: "bg-orange-500", badge: "bg-orange-100 text-orange-700 border-orange-200", headerBg: "bg-orange-50 border-orange-100", text: "text-orange-700", countBg: "bg-orange-500 text-white", dot: "bg-orange-500", Icon: Flame },
    Medium: { order: 2, bar: "bg-yellow-400", badge: "bg-yellow-100 text-yellow-700 border-yellow-200", headerBg: "bg-yellow-50 border-yellow-100", text: "text-yellow-700", countBg: "bg-yellow-400 text-white", dot: "bg-yellow-400", Icon: TrendingDown },
    Low:    { order: 3, bar: "bg-slate-300",  badge: "bg-slate-100 text-slate-600 border-slate-200",   headerBg: "bg-slate-50 border-slate-100",  text: "text-slate-600",  countBg: "bg-slate-400 text-white",  dot: "bg-slate-400",  Icon: Minus },
} as const;
type PriorityKey = keyof typeof PRIORITY_CFG;

const STATUS_BADGE: Record<string, string> = {
    OPEN:        "bg-blue-50 text-blue-600 border border-blue-100",
    IN_PROGRESS: "bg-orange-50 text-orange-600 border border-orange-100",
    SOLVED:      "bg-emerald-50 text-emerald-600 border border-emerald-100",
    CLOSED:      "bg-slate-50 text-slate-500 border border-slate-100",
};

// STATUS_LABEL is now handled via t("statusShort.X") in the component

const KNOWN_KEYS = ["eosClientError","spinningScreen","needReassign","lostServerConn","networkError","cannotLogin","wrongExamCode","notInExamList"];

// ── Main Page ───────────────────────────────────────────────────────────────
export default function ExamOfficerTicketsPage() {
    const t = useTranslations("ExamOfficerTickets");
    const tS = useTranslations("ProctorSession");
    const resolve = (raw: string) =>
        KNOWN_KEYS.includes(raw) ? (() => { try { return tS(`incident.${raw}` as any); } catch { return raw; } })() : raw;

    // ── State ──
    const [tickets, setTickets] = useState<TicketFull[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("active");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [note, setNote] = useState("");
    const [processing, setProcessing] = useState(false);
    const [collapsedPriority, setCollapsedPriority] = useState<Set<string>>(new Set());
    const [collapsedIssue, setCollapsedIssue] = useState<Set<string>>(new Set());
    const [newCount, setNewCount] = useState(0);
    const [actionMode, setActionMode] = useState<"resolve" | "assign">("resolve");
    const [assignees, setAssignees] = useState<ApiUser[]>([]);
    const [assigneeId, setAssigneeId] = useState("");
    const [search, setSearch] = useState("");
    const { socket } = useSocket();
    const filterRef = useRef(filterStatus);
    useEffect(() => { filterRef.current = filterStatus; }, [filterStatus]);

    useEffect(() => { usersApi.getAssignees().then(setAssignees).catch(() => {}); }, []);

    const fetchTickets = useCallback(async () => {
        try {
            setLoading(true);
            setTickets(await ticketsApi.list()); // always fetch ALL — filter client-side
            setSelectedIds(new Set());
        } catch { toast.error(t("toastLoadError")); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    useEffect(() => {
        if (!socket) return;
        const handler = (payload: { ticket: TicketFull; reporter?: any }) => {
            const tk: TicketFull = { ...payload.ticket, reporter: payload.reporter ?? payload.ticket.reporter ?? null };
            setTickets(prev => prev.some(tk2 => tk2.id === tk.id) ? prev : [tk, ...prev]);
            setNewCount(c => c + 1);
            // Note: layout.tsx already shows the orange "Ticket mới" toast — no duplicate here
        };
        socket.on("ticket:created", handler);
        return () => { socket.off("ticket:created", handler); };
    }, [socket]);

    // ── Filtered list ──
    const showAssigneeCol = filterStatus !== "active"; // Hide assignee col in Open/unassigned tab
    const displayed = useMemo(() => {
        let list = tickets;
        if (filterStatus === "active")   list = list.filter(tk => tk.assignee == null && tk.status !== "SOLVED");  // Unassigned, not solved
        if (filterStatus === "assigned") list = list.filter(tk => tk.assignee != null && tk.status !== "SOLVED");  // Assigned, not solved
        if (filterStatus === "solved")   list = list.filter(tk => tk.status === "SOLVED");                          // Resolved only
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
    }, [tickets, filterStatus, search]);

    // ── 2-level grouping: Priority → Incident key ──
    // Result: Map<priority, Map<issueKey, TicketFull[]>>
    const grouped = useMemo(() => {
        const byPriority = new Map<string, Map<string, TicketFull[]>>();
        for (const tk of displayed) {
            const p = tk.priority ?? "Medium";
            if (!byPriority.has(p)) byPriority.set(p, new Map());
            const issueKey = tk.issueName; // stored key like "cannotLogin"
            const byIssue = byPriority.get(p)!;
            if (!byIssue.has(issueKey)) byIssue.set(issueKey, []);
            byIssue.get(issueKey)!.push(tk);
        }
        // Sort priorities, sort issue groups by size desc
        return (["Urgent","High","Medium","Low"] as PriorityKey[])
            .filter(p => byPriority.has(p))
            .map(p => {
                const issueMap = byPriority.get(p)!;
                const issues = Array.from(issueMap.entries())
                    .sort((a, b) => b[1].length - a[1].length);
                return { priority: p, issues } as { priority: PriorityKey; issues: [string, TicketFull[]][] };
            });
    }, [displayed]);

    const stats = useMemo(() => ({
        urgent:     tickets.filter(tk => tk.priority === "Urgent" && tk.status !== "SOLVED").length,
        high:       tickets.filter(tk => tk.priority === "High"   && tk.status !== "SOLVED").length,
        inProgress: tickets.filter(tk => tk.status === "IN_PROGRESS").length,
        waiting:    tickets.filter(tk => tk.status === "OPEN").length,
        solved:     tickets.filter(tk => tk.status === "SOLVED").length,
        // Tab counts
        openCount:     tickets.filter(tk => tk.assignee == null && tk.status !== "SOLVED").length,
        assignedCount: tickets.filter(tk => tk.assignee != null && tk.status !== "SOLVED").length,
        allCount:      tickets.filter(tk => tk.status !== "SOLVED").length,
        solvedCount:   tickets.filter(tk => tk.status === "SOLVED").length,
    }), [tickets]);

    // ── Selection helpers (SOLVED tickets cannot be selected) ──
    const toggleTicket = (id: string) => {
        const tk = tickets.find(t => t.id === id);
        if (tk?.status === "SOLVED") return; // block selection of SOLVED
        setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };
    const selectIssueGroup = (priority: string, issueKey: string) => {
        const ids = displayed.filter(tk => tk.priority === priority && tk.issueName === issueKey && tk.status !== "SOLVED").map(tk => tk.id);
        setSelectedIds(prev => {
            const n = new Set(prev);
            ids.every(id => n.has(id)) ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id));
            return n;
        });
    };
    const selectPriorityGroup = (p: string) => {
        const ids = displayed.filter(tk => tk.priority === p && tk.status !== "SOLVED").map(tk => tk.id);
        setSelectedIds(prev => {
            const n = new Set(prev);
            ids.every(id => n.has(id)) ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id));
            return n;
        });
    };

    async function handleBulkResolve() {
        if (!selectedIds.size) return toast.warning(t("toastNoSelection"));
        if (!note.trim()) return toast.warning(t("toastEnterNote"));
        setProcessing(true);
        try {
            const r = await ticketsApi.bulkProcess({ ticketIds: [...selectedIds], action: "resolve", resolveNote: note.trim() });
            toast.success(`✅ Đã xử lý ${r.processed} ticket. ${t("toastNotified")}`);
            setNote(""); await fetchTickets();
        } catch { toast.error(t("toastResolveFail")); }
        finally { setProcessing(false); }
    }
    async function handleBulkAssign() {
        if (!selectedIds.size) return toast.warning(t("toastNoSelection"));
        if (!assigneeId) return toast.warning(t("toastSelectAssignee"));
        setProcessing(true);
        try {
            const r = await ticketsApi.bulkProcess({ ticketIds: [...selectedIds], action: "assign", resolveNote: note.trim() || "Đang xử lý", assigneeId });
            const a = assignees.find(x => x.id === assigneeId);
            toast.success(`📋 Đã giao ${r.processed} ticket cho ${a?.fullName ?? "người dùng"}`);
            setNote(""); setAssigneeId(""); await fetchTickets();
        } catch { toast.error(t("toastAssignFail")); }
        finally { setProcessing(false); }
    }

    const selected = tickets.filter(tk => selectedIds.has(tk.id));

    const statusTabs = [
        { key: "active",   label: t("filterActive"),   count: stats.openCount },
        { key: "assigned", label: t("filterAssigned"),  count: stats.assignedCount },
        { key: "all",      label: t("filterAll"),       count: stats.allCount },
        { key: "solved",   label: t("filterSolved"),    count: stats.solvedCount },
    ];

    return (
        <div className="h-screen flex flex-col bg-[#f7f8fc] overflow-hidden">

            {/* ── HEADER ── */}
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
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {[
                        { key: "urgent",     l: t("triageUrgent"),     v: stats.urgent,     dot: "bg-red-500",     cls: stats.urgent > 0 ? "border-red-200 bg-red-50" : "border-slate-100 bg-slate-50",       pulse: true },
                        { key: "high",       l: t("triageHigh"),       v: stats.high,       dot: "bg-orange-500",  cls: stats.high > 0   ? "border-orange-200 bg-orange-50" : "border-slate-100 bg-slate-50", pulse: false },
                        { key: "inProgress", l: t("triageInProgress"), v: stats.inProgress, dot: "bg-blue-500",   cls: "border-slate-100 bg-slate-50", pulse: false },
                        { key: "waiting",    l: t("triageWaiting"),    v: stats.waiting,     dot: "bg-slate-400",   cls: "border-slate-100 bg-slate-50", pulse: false },
                        { key: "done",       l: t("triageDone"),       v: stats.solved,     dot: "bg-emerald-500", cls: "border-slate-100 bg-slate-50", pulse: false },
                    ].map(s => (
                        <div key={s.key} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold", s.cls)}>
                            <span className={cn("w-2 h-2 rounded-full shrink-0", s.dot, s.pulse && s.v > 0 && "animate-pulse")} />
                            <span className="text-slate-500">{s.l}</span>
                            <span className={cn("font-black text-sm", s.v > 0 && s.key === "urgent" ? "text-red-600" : "text-slate-800")}>{s.v}</span>
                        </div>
                    ))}
                    <div className="ml-auto relative">
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

            {/* ── BODY ── */}
            <div className="flex flex-1 overflow-hidden">

                {/* LEFT: 2-level grouped list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                                {filterStatus !== "solved" && (
                                    <>
                                        <button onClick={() => setSelectedIds(new Set(displayed.filter(t => t.status !== "SOLVED").map(t => t.id)))} className="text-orange-500 font-semibold hover:text-orange-600">{t("selectAll")}</button>
                                        <span>·</span>
                                        <button onClick={() => setSelectedIds(new Set())} className="hover:text-slate-600">{t("deselectAll")}</button>
                                        {selectedIds.size > 0 && <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-bold text-[10px]">✓ {selectedIds.size} {t("selected", { count: "" }).replace("{count} ", "")}</span>}
                                    </>
                                )}
                                <span className="ml-auto text-[11px] font-medium">{displayed.length} tickets {search && `(${tickets.length})`}</span>
                            </div>

                            {/* ── PRIORITY GROUPS ── */}
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
                                                className={cn("text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors shrink-0",
                                                    allPriSel ? "bg-orange-500 text-white border-orange-500" : "bg-white border-slate-200 text-slate-500 hover:border-orange-400 hover:text-orange-600")}>
                                                {allPriSel ? t("deselectAll") : t("selectGroup", { count: totalInPriority })}
                                            </button>
                                        </div>

                                        {/* ── ISSUE SUB-GROUPS ── */}
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
                                                                {/* ← KEY button: select entire issue group */}
                                                                <button
                                                                    onClick={() => selectIssueGroup(priority, issueKey)}
                                                                    className={cn(
                                                                        "text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all shrink-0 flex items-center gap-1",
                                                                        allIssueSel
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
                                                                    {/* Column headers — only on first sub-group */}
                                                                    <div className={cn("grid gap-x-3 items-center px-4 py-1.5 border-b border-slate-50", showAssigneeCol ? "grid-cols-[20px_4px_90px_60px_72px_90px_1fr_56px]" : "grid-cols-[20px_4px_90px_60px_72px_90px_56px]")}>
                                                                        {["","",t("colStudentId"),t("colRoom"),t("colSubject"),t("colProctor"),...(showAssigneeCol ? ["Xự lý bởi"] : []),t("colTime")].map((h, i) => (
                                                                            <span key={i} className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{h}</span>
                                                                        ))}
                                                                    </div>
                                                                    {items.map(ticket => {
                                                                        const sel = selectedIds.has(ticket.id);
                                                                        const isSolved = ticket.status === "SOLVED";
                                                                        const room = ticket.session?.examRoom?.roomNumber ?? (ticket.session as any)?.roomNumber;
                                                                        return (
                                                                            <div key={ticket.id}
                                                                                onClick={() => toggleTicket(ticket.id)}
                                                                                className={cn(
                                                                                    "group grid gap-x-3 items-center px-4 py-2.5 border-b border-slate-50 last:border-0 transition-all",
                                                                                    showAssigneeCol ? "grid-cols-[20px_4px_90px_60px_72px_90px_1fr_56px]" : "grid-cols-[20px_4px_90px_60px_72px_90px_56px]",
                                                                                    isSolved ? "opacity-60 cursor-default" : "cursor-pointer",
                                                                                    sel ? "bg-orange-50/70" : (!isSolved && "hover:bg-slate-50/60")
                                                                                )}
                                                                            >
                                                                                <div onClick={e => { e.stopPropagation(); toggleTicket(ticket.id); }} className="flex items-center justify-center">
                                                                                    {isSolved ? <span className="w-3.5 h-3.5" /> : sel ? <CheckSquare className="w-3.5 h-3.5 text-orange-500" /> : <Square className="w-3.5 h-3.5 text-slate-200 group-hover:text-slate-400 transition-colors" />}
                                                                                </div>
                                                                                <div className={cn("w-1 h-5 rounded-full", cfg.bar)} />
                                                                                <span className="text-[11px] font-black text-orange-600 font-mono truncate">{ticket.studentCode ?? "—"}</span>
                                                                                <span className="text-[11px] font-bold text-blue-600 truncate">{room ?? "—"}</span>
                                                                                <span className="text-[10px] font-mono font-semibold text-slate-600 truncate">{ticket.session?.subjectCode ?? "—"}</span>
                                                                                <span className="text-[10px] text-slate-500 truncate">{ticket.reporter?.fullName ?? "—"}</span>
                                                                                {/* Assignee column — only in assigned/all/solved tabs */}
                                                                                {showAssigneeCol && (
                                                                                    <div className="flex items-center gap-1 min-w-0">
                                                                                        {ticket.assignee ? (
                                                                                            <span className="flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded-md truncate max-w-full">
                                                                                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                                                                                                {ticket.assignee.fullName ?? ticket.assignee.email}
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="text-[10px] text-slate-300">—</span>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                                <div className="flex flex-col gap-0.5 items-end">
                                                                                    <span className="text-[10px] text-slate-400 tabular-nums font-mono">{format(new Date(ticket.createdAt), "HH:mm")}</span>
                                                                                    <span className={cn("text-[8px] font-semibold px-1 py-0.5 rounded", STATUS_BADGE[ticket.status])}>{t(`statusShort.${ticket.status}` as any) || ticket.status}</span>
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
                <div className="w-[272px] shrink-0 border-l border-slate-100 bg-white flex flex-col overflow-y-auto">
                    <div className="p-4 flex flex-col gap-3 flex-1">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-orange-500" />
                            <span className="text-xs font-black text-slate-800">{t("quickProcess")}</span>
                        </div>
                        {filterStatus === "solved" ? (
                            <div className="flex flex-col items-center py-10 gap-3 text-slate-300">
                                <CheckCircle2 className="w-10 h-10 opacity-40 text-emerald-400" />
                                <p className="text-xs text-center text-slate-400 leading-relaxed">Ticket đã xử lý không thể thay đổi</p>
                            </div>
                        ) : (
                            <>
                        {selectedIds.size === 0 ? (
                            <div className="flex flex-col items-center py-10 gap-3 text-slate-300">
                                <LayoutList className="w-10 h-10 opacity-40" />
                                <p className="text-xs text-center text-slate-400 leading-relaxed">{t("selectHint")}</p>
                            </div>
                        ) : (
                            <>
                                <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
                                    <p className="text-xs font-bold text-orange-700 mb-2">{t("ticketsSelected", { count: selectedIds.size })}</p>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {selected.slice(0, 8).map(tk => {
                                            const c = PRIORITY_CFG[tk.priority as PriorityKey] ?? PRIORITY_CFG.Low;
                                            return (
                                                <div key={tk.id} className="flex items-center gap-1.5 text-[10px]">
                                                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", c.dot)} />
                                                    <span className="text-slate-600 truncate flex-1">{resolve(tk.issueName)}</span>
                                                    <span className="text-orange-600 font-mono font-bold shrink-0">{tk.studentCode?.slice(-5) ?? "—"}</span>
                                                </div>
                                            );
                                        })}
                                        {selected.length > 8 && <p className="text-[10px] text-slate-400 text-center">{t("andMore", { count: selected.length - 8 })}</p>}
                                    </div>
                                </div>
                                <div className="flex rounded-xl overflow-hidden border border-slate-100 text-[11px] font-bold shadow-sm">
                                    <button onClick={() => setActionMode("resolve")} className={cn("flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors", actionMode === "resolve" ? "bg-orange-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}><CheckCircle2 className="w-3.5 h-3.5" /> {t("modeResolve")}</button>
                                    <button onClick={() => setActionMode("assign")} className={cn("flex-1 py-2.5 flex items-center justify-center gap-1.5 border-l border-slate-100 transition-colors", actionMode === "assign" ? "bg-blue-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}><UserPlus className="w-3.5 h-3.5" /> {t("modeAssign")}</button>
                                </div>
                                {actionMode === "assign" && (
                                    <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                                        <option value="">{t("selectAssignee")}</option>
                                        {assignees.map(a => <option key={a.id} value={a.id}>{a.fullName ?? a.email} ({a.role})</option>)}
                                    </select>
                                )}
                                <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
                                    placeholder={actionMode === "resolve" ? t("notePlaceholderResolve") : t("notePlaceholderAssign")}
                                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none placeholder:text-slate-300" />
                                <button
                                    onClick={actionMode === "resolve" ? handleBulkResolve : handleBulkAssign}
                                    disabled={processing || (actionMode === "resolve" ? !note.trim() : !assigneeId)}
                                    className={cn("w-full h-10 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all",
                                        actionMode === "resolve"
                                            ? note.trim() ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-sm shadow-orange-100 hover:shadow-orange-200" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                            : assigneeId ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-100" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                    )}>
                                    {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("processing")}</> :
                                        actionMode === "resolve" ? <><CheckCircle2 className="w-4 h-4" /> {t("resolveBtn", { count: selectedIds.size })}</> :
                                            <><ArrowRight className="w-4 h-4" /> {t("assignBtn", { count: selectedIds.size })}</>}
                                </button>
                                <button onClick={() => setSelectedIds(new Set())} className="text-[11px] text-slate-400 hover:text-slate-600 text-center w-full transition-colors">{t("clearAll")}</button>
                            </>
                        )}
                            </>
                        )}
                        <div className="mt-auto pt-3 border-t border-slate-50">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{t("statTitle")}</p>
                            {[{ l: t("statNew"), v: stats.waiting, c: "text-blue-600" },{ l: t("statInProgress"), v: stats.inProgress, c: "text-orange-600" },{ l: t("statAssigned"), v: stats.assignedCount, c: "text-purple-600" },{ l: t("statResolved"), v: stats.solved, c: "text-emerald-600" }].map(({ l, v, c }) => (
                                <div key={l} className="flex items-center justify-between mb-1.5">
                                    <span className="text-[11px] text-slate-400">{l}</span>
                                    <span className={cn("text-sm font-black", c)}>{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
