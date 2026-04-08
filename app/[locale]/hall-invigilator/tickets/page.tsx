"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import {
    RefreshCw, Loader2, CheckCircle2, Clock,
    Hash, MapPin, BookOpen, X, AlertCircle, Activity,
    Search, ChevronDown, ChevronRight,
    ShieldAlert, Minus,
    CheckSquare, Square, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ticketsApi, TicketFull } from "@/lib/api/tickets";
import { useSocket } from "@/hooks/use-socket";
import { toast } from "sonner";

// ── Priority config ────────────────────────────────────────────────────────────
const PRIORITY_CFG = {
    Urgent: { order: 0, bar: "bg-red-500",    badge: "bg-red-100 text-red-700 border-red-200",      headerBg: "bg-red-50 border-red-100",      text: "text-red-700",    countBg: "bg-red-500 text-white",    dot: "bg-red-500",    Icon: ShieldAlert },
    Normal: { order: 1, bar: "bg-slate-400",  badge: "bg-slate-100 text-slate-700 border-slate-200",   headerBg: "bg-slate-50 border-slate-100",  text: "text-slate-700",  countBg: "bg-slate-500 text-white",  dot: "bg-slate-400",  Icon: Minus },
} as const;
type PriorityKey = keyof typeof PRIORITY_CFG;

const STATUS_CLS: Record<string, string> = {
    OPEN:        "bg-orange-50 text-orange-600 border border-orange-100",
    IN_PROGRESS: "bg-blue-50 text-blue-600 border border-blue-100",
    SOLVED:      "bg-emerald-50 text-emerald-600 border border-emerald-100",
};

// ── Live timer ─────────────────────────────────────────────────────────────
function useElapsedSeconds(startISOOrNull: string | null): number {
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        if (!startISOOrNull) { setElapsed(0); return; }
        const start = new Date(startISOOrNull).getTime();
        const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [startISOOrNull]);
    return elapsed;
}
function formatElapsed(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function TimerBadge({ startISO }: { startISO: string }) {
    const elapsed = useElapsedSeconds(startISO);
    const isLong = elapsed > 10 * 60; // >10 min
    return (
        <span className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black tabular-nums border",
            isLong ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : "bg-blue-50 text-blue-600 border-blue-100"
        )}>
            <Clock className="w-2.5 h-2.5" />
            {formatElapsed(elapsed)}
        </span>
    );
}

// ── Resolve Modal (multi-ticket) ──────────────────────────────────────────
// ticket prop = single-ticket shortcut; tickets prop = bulk
function ResolveModal({ tickets, onClose, onConfirm, t }: {
    tickets: TicketFull[];
    onClose: () => void;
    onConfirm: (note: string) => Promise<void>;
    t: ReturnType<typeof useTranslations>;
}) {
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);
    const handle = async () => {
        setLoading(true);
        try { await onConfirm(note); onClose(); }
        catch { toast.error(t("toast.resolveError")); }
        finally { setLoading(false); }
    };
    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-black text-white text-sm">{t("resolve.title")}</h3>
                            <p className="text-teal-100 text-[10px]">{tickets.length} ticket</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center">
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>
                {tickets.length > 1 && (
                    <div className="px-5 pt-4">
                        <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 max-h-28 overflow-y-auto space-y-1">
                            {tickets.map(tk => (
                                <div key={tk.id} className="flex items-center gap-2 text-[10px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                                    <span className="text-slate-700 font-semibold truncate flex-1">{tk.issueName}</span>
                                    {tk.studentCode && <span className="font-mono text-orange-600 font-bold shrink-0">{tk.studentCode}</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="px-5 py-4 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">{t("resolve.noteLabel")} <span className="text-slate-400 font-normal">{t("resolve.noteOptional")}</span></label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={t("resolve.notePlaceholder")} rows={3}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-teal-300 transition-all" />
                    </div>
                </div>
                <div className="flex gap-2 px-5 pb-5">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">{t("resolve.cancel")}</button>
                    <button onClick={handle} disabled={loading}
                        className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl hover:from-teal-700 hover:to-emerald-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        {t("resolve.confirm")}{tickets.length > 1 ? ` (${tickets.length})` : ""}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HallInvigilatorTicketsPage() {
    const t  = useTranslations("HallInvigilatorTickets");
    const tS = useTranslations("ProctorSession");
    const KNOWN_KEYS = ["eosClientError","spinningScreen","needReassign","lostServerConn","networkError","cannotLogin","wrongExamCode","notInExamList","deviceViolation","cheatingBehavior","submissionFailed","hardwareFailure","focusLostRepeat","cccdMismatch","networkIssue","wrongFileFormat","roomIssue"];
    const resolveIssue = (raw: string) =>
        KNOWN_KEYS.includes(raw)
            ? (() => { try { return tS(`incident.${raw}` as any); } catch { return raw; } })()
            : raw;
    const [tickets, setTickets] = useState<TicketFull[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("pending");
    const [collapsedPriority, setCollapsedPriority] = useState<Set<string>>(new Set());
    const [collapsedIssue, setCollapsedIssue] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [resolvingTickets, setResolvingTickets] = useState<TicketFull[]>([]);
    const [processing, setProcessing] = useState<string | null>(null);
    const { socket } = useSocket();

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try { setTickets(await ticketsApi.list()); setSelectedIds(new Set()); }
        catch { toast.error(t("toast.loadError")); }
        finally { setLoading(false); }
    }, []);

    const silentRefresh = useCallback(async () => {
        try { setTickets(await ticketsApi.list()); }
        catch { /* ignore */ }
    }, []);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    useEffect(() => {
        if (!socket) return;
        socket.on("ticket:assigned", silentRefresh);
        socket.on("ticket:updated", silentRefresh);
        socket.on("ticket:created", silentRefresh);
        return () => {
            socket.off("ticket:assigned", silentRefresh);
            socket.off("ticket:updated", silentRefresh);
            socket.off("ticket:created", silentRefresh);
        };
    }, [socket, silentRefresh]);

    useEffect(() => {
        const h = () => silentRefresh();
        window.addEventListener("tickets:refresh", h);
        const onVis = () => { if (document.visibilityState === "visible") silentRefresh(); };
        document.addEventListener("visibilitychange", onVis);
        return () => { window.removeEventListener("tickets:refresh", h); document.removeEventListener("visibilitychange", onVis); };
    }, [silentRefresh]);

    // ── Computed ──
    const displayed = useMemo(() => {
        let list = tickets;
        if (filterStatus === "pending") list = list.filter(t => t.status === "OPEN" || t.status === "IN_PROGRESS");
        else if (filterStatus === "solved") list = list.filter(t => t.status === "SOLVED");
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(t =>
                t.issueName.toLowerCase().includes(q) ||
                resolveIssue(t.issueName).toLowerCase().includes(q) ||
                t.studentCode?.toLowerCase().includes(q) ||
                t.reporter?.fullName?.toLowerCase().includes(q) ||
                (t.session?.examRoom?.roomNumber ?? (t.session as any)?.roomNumber)?.toLowerCase()?.includes(q)
            );
        }
        return list;
    }, [tickets, filterStatus, search]);

    const grouped = useMemo(() => {
        const byPriority = new Map<string, Map<string, TicketFull[]>>();
        for (const tk of displayed) {
            const p = tk.priority ?? "Normal";
            if (!byPriority.has(p)) byPriority.set(p, new Map());
            const byIssue = byPriority.get(p)!;
            if (!byIssue.has(tk.issueName)) byIssue.set(tk.issueName, []);
            byIssue.get(tk.issueName)!.push(tk);
        }
        return (["Urgent", "Normal"] as PriorityKey[])
            .filter(p => byPriority.has(p))
            .map(p => ({
                priority: p,
                issues: Array.from(byPriority.get(p)!.entries()).sort((a, b) => b[1].length - a[1].length),
            }));
    }, [displayed]);

    const stats = useMemo(() => ({
        open:     tickets.filter(t => t.status === "OPEN").length,
        inprog:   tickets.filter(t => t.status === "IN_PROGRESS").length,
        solved:   tickets.filter(t => t.status === "SOLVED").length,
        urgent:   tickets.filter(t => t.priority === "Urgent" && t.status !== "SOLVED").length,
        pending:  tickets.filter(t => t.status === "OPEN" || t.status === "IN_PROGRESS").length,
    }), [tickets]);

    // ── Selection helpers ──
    const toggleTicket = (id: string) => setSelectedIds(prev => {
        const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
    });
    const selectIssueGroup = (priority: string, issueKey: string) => {
        const ids = displayed.filter(tk => tk.priority === priority && tk.issueName === issueKey).map(tk => tk.id);
        setSelectedIds(prev => {
            const n = new Set(prev);
            ids.every(id => n.has(id)) ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id));
            return n;
        });
    };
    const selectPriorityGroup = (p: string) => {
        const ids = displayed.filter(tk => tk.priority === p).map(tk => tk.id);
        setSelectedIds(prev => {
            const n = new Set(prev);
            ids.every(id => n.has(id)) ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id));
            return n;
        });
    };

    // ── Actions ──
    const handleBulkResolve = async (note: string) => {
        // Only process IN_PROGRESS tickets — never re-resolve SOLVED ones
        const ids = [...selectedIds].filter(id => tickets.find(tk => tk.id === id)?.status === "IN_PROGRESS");
        if (!ids.length) { setProcessing(null); return; }
        setProcessing("bulk");
        try {
            if (ids.length === 1) {
                await ticketsApi.process(ids[0], { action: "resolve", resolveNote: note || t("resolve.confirm") });
                setTickets(prev => prev.map(tk => tk.id === ids[0] ? { ...tk, status: "SOLVED" as any, resolveNote: note } : tk));
            } else {
                await (ticketsApi as any).bulkProcess?.({ ticketIds: ids, action: "resolve", resolveNote: note }) ??
                    Promise.all(ids.map(id => ticketsApi.process(id, { action: "resolve", resolveNote: note || t("resolve.confirm") })));
                setTickets(prev => prev.map(tk => ids.includes(tk.id) ? { ...tk, status: "SOLVED" as any, resolveNote: note } : tk));
            }
            toast.success(`✅ ${t("toast.resolveSuccess")} (${ids.length})`);
            setSelectedIds(new Set());
        } catch { toast.error(t("toast.resolveError")); }
        finally { setProcessing(null); }
    };

    const handleResolve = async (note: string) => {
        if (!resolvingTickets.length) return;
        await handleBulkResolve(note);
        setResolvingTickets([]);
    };

    const selected = tickets.filter(tk => selectedIds.has(tk.id));
    const selectedOpen = selected.filter(tk => tk.status === "OPEN").length;
    const selectedInProg = selected.filter(tk => tk.status === "IN_PROGRESS").length;

    const statusTabs = [
        { key: "pending", label: t("tabs.pending"), count: stats.pending },
        { key: "solved",  label: t("tabs.solved"),  count: stats.solved },
        { key: "all",     label: t("tabs.all"),     count: tickets.length },
    ];


    return (
        <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">

            {/* ── HEADER ── */}
            <div className="shrink-0 bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-white">{t("title")}</h1>
                            <p className="text-teal-100 text-xs">{t("subtitle")}</p>
                        </div>
                    </div>
                    <button onClick={fetchTickets} disabled={loading}
                        className="flex items-center gap-1.5 text-xs font-semibold text-teal-100 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-lg transition-all">
                        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                        {loading ? t("loading") : t("refresh")}
                    </button>
                </div>

                {/* Triage pills + search */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {[
                        { label: t("triage.urgent"),    val: stats.urgent,  dot: "bg-red-400",     cls: stats.urgent > 0 ? "border-red-300/50 bg-red-500/20" : "border-white/10 bg-white/10", pulse: true },
                        { label: t("triage.inprogress"),val: stats.inprog,  dot: "bg-blue-300",    cls: "border-white/10 bg-white/10", pulse: false },
                        { label: t("triage.waiting"),   val: stats.open,    dot: "bg-orange-300",  cls: "border-white/10 bg-white/10", pulse: false },
                        { label: t("triage.done"),      val: stats.solved,  dot: "bg-emerald-300", cls: "border-white/10 bg-white/10", pulse: false },
                    ].map(s => (
                        <div key={s.label} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold", s.cls)}>
                            <span className={cn("w-2 h-2 rounded-full shrink-0", s.dot, s.pulse && s.val > 0 && "animate-pulse")} />
                            <span className="text-teal-100">{s.label}</span>
                            <span className="font-black text-white">{s.val}</span>
                        </div>
                    ))}
                    <div className="ml-auto relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-teal-300" />
                        <input type="text" placeholder={t("searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)}
                            className="pl-9 pr-8 py-2 text-xs border border-white/20 rounded-xl bg-white/10 text-white placeholder-teal-300 focus:bg-white/20 focus:outline-none w-52 transition-all" />
                        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-300 hover:text-white"><X className="w-3 h-3" /></button>}
                    </div>
                </div>

                {/* Status tabs */}
                <div className="flex items-center gap-1.5">
                    {statusTabs.map(({ key, label, count }) => (
                        <button key={key} onClick={() => setFilterStatus(key)}
                            className={cn("px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all",
                                filterStatus === key ? "bg-white text-teal-700 border-white shadow-sm" : "bg-white/10 text-teal-100 border-white/20 hover:bg-white/20")}>
                            {label}
                            <span className={cn("ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black",
                                filterStatus === key ? "bg-teal-100 text-teal-700" : "bg-white/20 text-white")}>{count}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── BODY ── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center h-40 gap-2 text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
                        <span className="text-sm">{t("loading")}</span>
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="flex flex-col items-center py-24 gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-slate-200" />
                        </div>
                        <p className="text-sm font-semibold text-slate-400">{search ? t("empty.noResults") : t("empty.noTickets")}</p>
                    </div>
                ) : (
                    <>
                        {/* Count row */}
                        <div className="flex items-center gap-3 text-xs text-slate-400 px-1">
                            <span className="ml-auto text-[11px] font-medium">{displayed.length} {t("ticketCount")}</span>
                        </div>

                        {/* ── PRIORITY GROUPS ── */}
                        {grouped.map(({ priority, issues }) => {
                            const cfg = PRIORITY_CFG[priority as PriorityKey] ?? PRIORITY_CFG.Normal;
                            const { Icon } = cfg;
                            const priCollapsed = collapsedPriority.has(priority);
                            const totalInPriority = issues.reduce((s, [, tks]) => s + tks.length, 0);
                            const selInPriority = issues.reduce((s, [, tks]) => s + tks.filter(tk => selectedIds.has(tk.id)).length, 0);
                            const allPriSel = totalInPriority > 0 && selInPriority === totalInPriority;

                            return (
                                <div key={priority} className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm bg-white">
                                    {/* Priority header */}
                                    <div className={cn("flex items-center gap-2 px-4 py-2.5 border-b", cfg.headerBg)}>
                                        <button
                                            onClick={() => setCollapsedPriority(prev => { const n = new Set(prev); n.has(priority) ? n.delete(priority) : n.add(priority); return n; })}
                                            className="flex items-center gap-2 flex-1 min-w-0"
                                        >
                                            <Icon className={cn("w-4 h-4 shrink-0", cfg.text)} />
                                            <span className={cn("text-sm font-black", cfg.text)}>{t(`priority.${priority}` as any)}</span>
                                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black", cfg.countBg)}>{totalInPriority}</span>
                                            <span className="text-[10px] text-slate-400 font-medium">— {issues.length} {t("issueTypes")}</span>
                                            {selInPriority > 0 && <span className="px-2 py-0.5 rounded-full bg-teal-500 text-white text-[10px] font-bold">✓ {selInPriority}</span>}
                                            {priCollapsed ? <ChevronRight className={cn("w-3.5 h-3.5 ml-auto", cfg.text)} /> : <ChevronDown className={cn("w-3.5 h-3.5 ml-auto", cfg.text)} />}
                                        </button>
                                        <button onClick={() => selectPriorityGroup(priority)}
                                            className={cn("text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors shrink-0",
                                                allPriSel ? "bg-teal-500 text-white border-teal-500" : "bg-white border-slate-200 text-slate-500 hover:border-teal-400 hover:text-teal-600")}>
                                            {allPriSel ? "Bỏ chọn" : `Chọn ${totalInPriority}`}
                                        </button>
                                    </div>

                                    {/* Issue sub-groups */}
                                    {!priCollapsed && (
                                        <div className="divide-y divide-slate-50">
                                            {issues.map(([issueKey, items]) => {
                                                const subKey = `${priority}::${issueKey}`;
                                                const subCollapsed = collapsedIssue.has(subKey);
                                                const selInIssue = items.filter(tk => selectedIds.has(tk.id)).length;
                                                const allIssueSel = items.length > 0 && selInIssue === items.length;

                                                return (
                                                    <div key={issueKey}>
                                                        {/* Sub-group header */}
                                                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50/60">
                                                            <button
                                                                onClick={() => setCollapsedIssue(prev => { const n = new Set(prev); n.has(subKey) ? n.delete(subKey) : n.add(subKey); return n; })}
                                                                className="flex items-center gap-2 flex-1 min-w-0 text-left"
                                                            >
                                                                {subCollapsed ? <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" /> : <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />}
                                                                <span className="text-[11px] font-bold text-slate-700 truncate">{resolveIssue(issueKey)}</span>
                                                                <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[9px] font-black shrink-0">{items.length}</span>
                                                                {selInIssue > 0 && <span className="px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 text-[9px] font-black shrink-0">✓ {selInIssue}</span>}
                                                            </button>
                                                            <button onClick={() => selectIssueGroup(priority, issueKey)}
                                                                className={cn("text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all shrink-0 flex items-center gap-1",
                                                                    allIssueSel ? "bg-teal-500 text-white border-teal-500" : "bg-white border-slate-200 text-slate-500 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50")}>
                                                                {allIssueSel ? <><CheckSquare className="w-2.5 h-2.5" /> Bỏ chọn</> : <>Chọn {items.length}</>}
                                                            </button>
                                                        </div>

                                                                {/* Ticket rows */}
                                                                {!subCollapsed && (
                                                                    <div className="bg-white">
                                                                        {/* Column headers */}
                                                                        <div className="grid grid-cols-[24px_4px_100px_60px_68px_100px_1fr_120px_64px] gap-x-3 items-center px-4 py-2 border-b border-slate-50">
                                                                            {["", "", t("columns.mssv"), t("columns.room"), t("columns.subject"), t("columns.reporter"), t("columns.statusCol"), t("columns.action"), t("columns.time")].map((h, i) => (
                                                                                <span key={i} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</span>
                                                                            ))}
                                                                        </div>
                                                                        {items.map(ticket => {
                                                                            const sel = selectedIds.has(ticket.id);
                                                                            const room = ticket.session?.examRoom?.roomNumber ?? (ticket.session as any)?.roomNumber;
                                                                            const isOpen = ticket.status === "OPEN";
                                                                            const isInProg = ticket.status === "IN_PROGRESS";
                                                                            const canAct = isOpen || isInProg;
                                                                            return (
                                                                                <div key={ticket.id}
                                                                                    onClick={() => ticket.status !== "SOLVED" && toggleTicket(ticket.id)}
                                                                                    className={cn(
                                                                                        "group grid grid-cols-[24px_4px_100px_60px_68px_100px_1fr_120px_64px] gap-x-3 items-center px-4 py-3.5 border-b border-slate-50 last:border-0 transition-all",
                                                                                        ticket.status === "SOLVED" ? "opacity-60 cursor-default" : "cursor-pointer",
                                                                                        sel ? "bg-teal-50/70" : ticket.status !== "SOLVED" ? "hover:bg-teal-50/30" : ""
                                                                                    )}>
                                                                                    {/* Checkbox — disabled for SOLVED */}
                                                                                    <div onClick={e => { e.stopPropagation(); ticket.status !== "SOLVED" && toggleTicket(ticket.id); }} className="flex items-center justify-center">
                                                                                        {ticket.status === "SOLVED"
                                                                                            ? <Square className="w-4 h-4 text-slate-100" />
                                                                                            : sel ? <CheckSquare className="w-4 h-4 text-teal-500" /> : <Square className="w-4 h-4 text-slate-200 group-hover:text-slate-400" />}
                                                                                    </div>
                                                                                    <div className={cn("w-1.5 h-6 rounded-full", cfg.bar)} />
                                                                                    <span className="text-xs font-black text-orange-600 font-mono truncate">{ticket.studentCode ?? "—"}</span>
                                                                                    <span className="text-xs font-bold text-blue-600 truncate">{room ?? "—"}</span>
                                                                                    <span className="text-[11px] font-mono text-slate-600 truncate">{ticket.session?.subjectCode ?? "—"}</span>
                                                                                    <span className="text-[11px] text-slate-500 truncate">{ticket.reporter?.fullName ?? "—"}</span>
                                                                                    {/* Status */}
                                                                                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                                                                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0", STATUS_CLS[ticket.status])}>
                                                                                            {t(`status.${ticket.status}` as any) ?? ticket.status}
                                                                                        </span>
                                                                                        {ticket.status === "IN_PROGRESS" && (
                                                                                            <TimerBadge startISO={ticket.updatedAt} />
                                                                                        )}
                                                                                        {ticket.resolveNote && (
                                                                                            <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md truncate max-w-[80px]" title={ticket.resolveNote}>
                                                                                                {ticket.resolveNote}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    {/* Actions */}
                                                                                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                                                        {canAct && isInProg && (
                                                                                            <button
                                                                                                onClick={() => { setSelectedIds(new Set([ticket.id])); setResolvingTickets([ticket]); }}
                                                                                                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold hover:bg-emerald-600 transition-colors shrink-0"
                                                                                            >
                                                                                                <CheckCircle2 className="w-3 h-3" />
                                                                                                {t("actions.done")}
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                    {/* Time */}
                                                                                    <div className="flex flex-col gap-0.5 items-end">
                                                                                        <span className="text-[11px] text-slate-400 tabular-nums font-mono">{format(new Date(ticket.createdAt), "HH:mm")}</span>
                                                                                        <span className="text-[9px] text-slate-300 tabular-nums">{format(new Date(ticket.createdAt), "dd/MM")}</span>
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

            {/* ── FLOATING BULK BAR ── */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-slate-900/95 backdrop-blur text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/10">
                    <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-teal-400" />
                        <span className="text-sm font-black">{selectedIds.size} đã chọn</span>
                        {selectedOpen > 0 && <span className="text-[10px] bg-blue-500 px-2 py-0.5 rounded-full font-bold">{selectedOpen} chờ</span>}
                        {selectedInProg > 0 && <span className="text-[10px] bg-orange-500 px-2 py-0.5 rounded-full font-bold">{selectedInProg} đang xử lý</span>}
                    </div>
                    <div className="w-px h-6 bg-white/20" />
                    {selectedInProg > 0 && (
                        <button
                            onClick={() => setResolvingTickets(selected.filter(tk => tk.status === "IN_PROGRESS"))}
                            disabled={processing === "bulk"}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-xs font-bold transition-colors disabled:opacity-60"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Xong ({selectedInProg})
                        </button>
                    )}
                    <button onClick={() => setSelectedIds(new Set())} className="text-[11px] text-slate-400 hover:text-white transition-colors ml-1">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {resolvingTickets.length > 0 && (
                <ResolveModal
                    tickets={resolvingTickets}
                    onClose={() => setResolvingTickets([])}
                    onConfirm={handleResolve}
                    t={t}
                />
            )}
        </div>
    );
}
