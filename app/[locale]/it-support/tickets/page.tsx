"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { format } from "date-fns";
import {
    RefreshCw, Loader2, CheckCircle2, Clock,
    Hash, MapPin, Wrench, X, AlertCircle, Activity,
    Zap, Search, ChevronDown, ChevronRight, LayoutList,
    CheckSquare, Square, Play, ShieldAlert, Flame, TrendingDown, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ticketsApi, TicketFull } from "@/lib/api/tickets";
import { useSocket } from "@/hooks/use-socket";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

// ── Priority config matching Exam Officer ────────────────────────────────────
const PRIORITY_CFG = {
    Urgent: { order: 0, bar: "bg-red-500",    badge: "bg-red-100 text-red-700 border-red-200",      headerBg: "bg-red-50 border-red-100",      text: "text-red-700",    countBg: "bg-red-500 text-white",    dot: "bg-red-500",    Icon: ShieldAlert },
    High:   { order: 1, bar: "bg-orange-500", badge: "bg-orange-100 text-orange-700 border-orange-200", headerBg: "bg-orange-50 border-orange-100", text: "text-orange-700", countBg: "bg-orange-500 text-white", dot: "bg-orange-500", Icon: Flame },
    Medium: { order: 2, bar: "bg-yellow-400", badge: "bg-yellow-100 text-yellow-700 border-yellow-200", headerBg: "bg-yellow-50 border-yellow-100", text: "text-yellow-700", countBg: "bg-yellow-400 text-white", dot: "bg-yellow-400", Icon: TrendingDown },
    Low:    { order: 3, bar: "bg-slate-300",  badge: "bg-slate-100 text-slate-600 border-slate-200",   headerBg: "bg-slate-50 border-slate-100",  text: "text-slate-600",  countBg: "bg-slate-400 text-white",  dot: "bg-slate-400",  Icon: Minus },
} as const;
type PriorityKey = keyof typeof PRIORITY_CFG;

const STATUS_CLS: Record<string, string> = {
    OPEN:        "bg-orange-50 text-orange-600 border border-orange-100",
    IN_PROGRESS: "bg-blue-50 text-blue-600 border border-blue-100",
    SOLVED:      "bg-emerald-50 text-emerald-600 border border-emerald-100",
    CLOSED:      "bg-slate-50 text-slate-500 border border-slate-100",
};

// ── Live timer for IN_PROGRESS tickets ───────────────────────────────────────
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

// ── Timer badge component ────────────────────────────────────────────────────
function TimerBadge({ startISO }: { startISO: string }) {
    const elapsed = useElapsedSeconds(startISO);
    const isLong = elapsed > 10 * 60; // >10 min = warn
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

// ── Resolve modal ─────────────────────────────────────────────────────────────
function ResolveModal({ tickets, onClose, onConfirm }: {
    tickets: TicketFull[];
    onClose: () => void;
    onConfirm: (note: string) => Promise<void>;
}) {
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);
    const handle = async () => {
        if (!note.trim()) return toast.warning("Vui lòng nhập ghi chú xử lý");
        setLoading(true);
        try { await onConfirm(note); onClose(); }
        finally { setLoading(false); }
    };
    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-black text-white text-sm">Xác nhận xử lý xong</h3>
                            <p className="text-purple-200 text-[10px]">{tickets.length} ticket được chọn</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center">
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>
                <div className="px-5 py-4 space-y-4">
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 max-h-28 overflow-y-auto space-y-1">
                        {tickets.map(tk => (
                            <div key={tk.id} className="flex items-center gap-2 text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                                <span className="text-slate-700 font-semibold truncate flex-1">{tk.issueName}</span>
                                {tk.studentCode && <span className="font-mono text-orange-600 font-bold shrink-0">{tk.studentCode}</span>}
                            </div>
                        ))}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Ghi chú kỹ thuật <span className="text-red-400">*</span></label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Mô tả cách đã xử lý..." rows={3}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 transition-all" />
                    </div>
                </div>
                <div className="flex gap-2 px-5 pb-5">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Huỷ</button>
                    <button onClick={handle} disabled={loading || !note.trim()}
                        className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-violet-600 rounded-xl hover:from-purple-700 hover:to-violet-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Xác nhận
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main page ────────────────────────────────────────────────────────────────
const KNOWN_KEYS = ["eosClientError","spinningScreen","needReassign","lostServerConn","networkError","cannotLogin","wrongExamCode","notInExamList"];

export default function ITSupportTicketsPage() {
    const t  = useTranslations("ITSupportTickets");
    const tS = useTranslations("ProctorSession");
    const resolve = (raw: string) =>
        KNOWN_KEYS.includes(raw) ? (() => { try { return tS(`incident.${raw}` as any); } catch { return raw; } })() : raw;
    const { user } = useAuthStore();
    const [tickets, setTickets] = useState<TicketFull[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("active");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [collapsedPriority, setCollapsedPriority] = useState<Set<string>>(new Set());
    const [collapsedIssue, setCollapsedIssue] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [processing, setProcessing] = useState<string | null>(null); // ticketId or "bulk"
    // startedAt cache: ticketId → ISO time when IT Support clicked "Nhận xử lý"
    const [startedAt, setStartedAt] = useState<Record<string, string>>({});
    const { socket } = useSocket();
    const filterRef = useRef(filterStatus);
    useEffect(() => { filterRef.current = filterStatus; }, [filterStatus]);

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            setTickets(await ticketsApi.list());
            setSelectedIds(new Set());
        } catch { toast.error(t("toast.loadError")); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    useEffect(() => {
        if (!socket) return;
        const refresh = () => fetchTickets();
        const handleUpdated = (payload: { ticketId: string; startedAt?: string }) => {
            if (payload.startedAt && payload.ticketId) {
                setStartedAt(prev => ({ ...prev, [payload.ticketId]: payload.startedAt! }));
            }
            fetchTickets();
        };
        socket.on("ticket:assigned", refresh);
        socket.on("ticket:updated", handleUpdated);
        return () => { socket.off("ticket:assigned", refresh); socket.off("ticket:updated", handleUpdated); };
    }, [socket, fetchTickets]);

    // ── Grouping ──
    const displayed = useMemo(() => {
        let list = tickets;
        // Filter by tab
        if (filterStatus === "active") list = list.filter(tk => tk.status === "OPEN");
        else if (filterStatus === "inprogress") list = list.filter(tk => tk.status === "IN_PROGRESS");
        else if (filterStatus === "solved") list = list.filter(tk => tk.status === "SOLVED");
        // Search filter
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(tk =>
                resolve(tk.issueName).toLowerCase().includes(q) ||
                tk.issueName.toLowerCase().includes(q) ||
                tk.studentCode?.toLowerCase().includes(q) ||
                tk.reporter?.fullName?.toLowerCase().includes(q) ||
                (tk.session?.examRoom?.roomNumber ?? (tk.session as any)?.roomNumber)?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [tickets, filterStatus, search]);

    const grouped = useMemo(() => {
        const byPriority = new Map<string, Map<string, TicketFull[]>>();
        for (const tk of displayed) {
            const p = tk.priority ?? "Medium";
            if (!byPriority.has(p)) byPriority.set(p, new Map());
            const byIssue = byPriority.get(p)!;
            if (!byIssue.has(tk.issueName)) byIssue.set(tk.issueName, []);
            byIssue.get(tk.issueName)!.push(tk);
        }
        return (["Urgent", "High", "Medium", "Low"] as PriorityKey[])
            .filter(p => byPriority.has(p))
            .map(p => {
                const issues = Array.from(byPriority.get(p)!.entries())
                    .sort((a, b) => b[1].length - a[1].length);
                return { priority: p, issues } as { priority: PriorityKey; issues: [string, TicketFull[]][] };
            });
    }, [displayed]);

    const stats = useMemo(() => ({
        active:     tickets.filter(t => t.status === "OPEN").length,
        inprogress: tickets.filter(t => t.status === "IN_PROGRESS").length,
        solved:     tickets.filter(t => t.status === "SOLVED").length,
        urgent:     tickets.filter(t => t.priority === "Urgent" && t.status !== "SOLVED").length,
    }), [tickets]);

    // ── Actions ──
    const toggleTicket = (id: string) => setSelectedIds(prev => {
        const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
    });
    const selectIssueGroup = (priority: string, issueKey: string) => {
        const ids = displayed.filter(t => t.priority === priority && t.issueName === issueKey).map(t => t.id);
        setSelectedIds(prev => {
            const n = new Set(prev);
            ids.every(id => n.has(id)) ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id));
            return n;
        });
    };
    const selectPriorityGroup = (p: string) => {
        const ids = displayed.filter(t => t.priority === p).map(t => t.id);
        setSelectedIds(prev => {
            const n = new Set(prev);
            ids.every(id => n.has(id)) ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id));
            return n;
        });
    };

    const handleStart = async (ticketId: string) => {
        setProcessing(ticketId);
        try {
            await ticketsApi.process(ticketId, { action: "start" as any, resolveNote: "" });
            const now = new Date().toISOString();
            setStartedAt(prev => ({ ...prev, [ticketId]: now }));
            setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: "IN_PROGRESS" as any } : t));
            toast.success(t("toast.startSuccess"));
        } catch { toast.error(t("toast.startError")); }
        finally { setProcessing(null); }
    };

    const handleBulkResolve = async (note: string) => {
        // Only process IN_PROGRESS tickets — never re-resolve SOLVED ones
        const ids = [...selectedIds].filter(id => tickets.find(tk => tk.id === id)?.status === "IN_PROGRESS");
        if (!ids.length) { setProcessing(null); return; }
        setProcessing("bulk");
        try {
            if (ids.length === 1) {
                await ticketsApi.process(ids[0], { action: "resolve", resolveNote: note });
                setTickets(prev => prev.map(tk =>
                    tk.id === ids[0] ? { ...tk, status: "SOLVED" as any, techNote: note } : tk
                ));
                toast.success(`✅ ${t("toast.resolveSuccess")}`);
            } else {
                const r = await ticketsApi.bulkProcess({ ticketIds: ids, action: "resolve", resolveNote: note });
                toast.success(`✅ ${t("toast.resolveSuccess")} (${r.processed})`);
                await fetchTickets();
            }
            setSelectedIds(new Set());
        } catch { toast.error(t("toast.resolveError")); }
        finally { setProcessing(null); }
    };

    const selected = tickets.filter(t => selectedIds.has(t.id));

    const statusTabs = [
        { key: "active",     label: t("tabs.active"),     count: stats.active },
        { key: "inprogress", label: t("tabs.inprogress"), count: stats.inprogress },
        { key: "solved",     label: t("tabs.solved"),     count: stats.solved },
    ];

    return (
        <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
            {/* ── HEADER ── */}
            <div className="shrink-0 bg-gradient-to-r from-purple-700 to-violet-600 px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                            <Wrench className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-white">{t("title")}</h1>
                            <p className="text-purple-200 text-xs">{t("subtitle")}</p>
                        </div>
                    </div>
                    <button onClick={fetchTickets} disabled={loading}
                        className="flex items-center gap-1.5 text-xs font-semibold text-purple-100 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-lg transition-all">
                        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                        {loading ? t("loading") : t("refresh")}
                    </button>
                </div>

                {/* Triage pills + search */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {[
                        { label: t("triage.urgent"),     val: stats.urgent,     dot: "bg-red-400",    cls: stats.urgent > 0 ? "border-red-300/50 bg-red-500/20" : "border-white/10 bg-white/10", pulse: true },
                        { label: t("triage.inprogress"), val: stats.inprogress, dot: "bg-blue-300",   cls: "border-white/10 bg-white/10", pulse: false },
                        { label: t("triage.waiting"),    val: stats.active,     dot: "bg-orange-300", cls: "border-white/10 bg-white/10", pulse: false },
                        { label: t("triage.done"),       val: stats.solved,     dot: "bg-emerald-300",cls: "border-white/10 bg-white/10", pulse: false },
                    ].map(s => (
                        <div key={s.label} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold", s.cls)}>
                            <span className={cn("w-2 h-2 rounded-full shrink-0", s.dot, s.pulse && s.val > 0 && "animate-pulse")} />
                            <span className="text-purple-100">{s.label}</span>
                            <span className="font-black text-white">{s.val}</span>
                        </div>
                    ))}
                    <div className="ml-auto relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-300" />
                        <input type="text" placeholder={t("searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)}
                            className="pl-9 pr-8 py-2 text-xs border border-white/20 rounded-xl bg-white/10 text-white placeholder-purple-300 focus:bg-white/20 focus:outline-none w-52 transition-all" />
                        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white"><X className="w-3 h-3" /></button>}
                    </div>
                </div>

                {/* Status tabs */}
                <div className="flex items-center gap-1.5">
                    {statusTabs.map(({ key, label, count }) => (
                        <button key={key} onClick={() => setFilterStatus(key)}
                            className={cn("px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all",
                                filterStatus === key ? "bg-white text-purple-700 border-white shadow-sm" : "bg-white/10 text-purple-100 border-white/20 hover:bg-white/20")}>
                            {label}
                            <span className={cn("ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black", filterStatus === key ? "bg-purple-100 text-purple-700" : "bg-white/20 text-white")}>{count}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── BODY ── */}
            <div className="flex flex-1 overflow-hidden">
                {/* LEFT: grouped list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center h-40 gap-2 text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
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
                            {/* Batch row */}
                            <div className="flex items-center gap-3 text-xs text-slate-400 px-1">
                                <button onClick={() => setSelectedIds(new Set(displayed.map(tk => tk.id)))} className="text-purple-500 font-semibold hover:text-purple-700">{t("selectAll")}</button>
                                <span>·</span>
                                <button onClick={() => setSelectedIds(new Set())} className="hover:text-slate-600">{t("deselect")}</button>
                                {selectedIds.size > 0 && <span className="ml-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-bold text-[10px]">✓ {selectedIds.size} {t("selectedCount")}</span>}
                                <span className="ml-auto text-[11px] font-medium">{displayed.length} {t("ticketCount")}</span>
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
                                        {/* Priority header */}
                                        <div className={cn("flex items-center gap-2 px-4 py-2.5 border-b", cfg.headerBg)}>
                                            <button onClick={() => setCollapsedPriority(prev => { const n = new Set(prev); n.has(priority) ? n.delete(priority) : n.add(priority); return n; })}
                                                className="flex items-center gap-2 flex-1 min-w-0">
                                                <Icon className={cn("w-4 h-4 shrink-0", cfg.text)} />
                                                <span className={cn("text-sm font-black", cfg.text)}>{t(`priority.${priority}` as any)}</span>
                                                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black", cfg.countBg)}>{totalInPriority}</span>
                                                <span className="text-[10px] text-slate-400 font-medium">— {issues.length} {t("issueTypes")}</span>
                                                {selInPriority > 0 && <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-bold">✓ {selInPriority}</span>}
                                                {priCollapsed ? <ChevronRight className={cn("w-3.5 h-3.5 ml-auto", cfg.text)} /> : <ChevronDown className={cn("w-3.5 h-3.5 ml-auto", cfg.text)} />}
                                            </button>
                                            <button onClick={() => selectPriorityGroup(priority)}
                                                className={cn("text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors shrink-0",
                                                    allPriSel ? "bg-purple-500 text-white border-purple-500" : "bg-white border-slate-200 text-slate-500 hover:border-purple-400 hover:text-purple-600")}>
                                                {allPriSel ? t("deselectGroup") : `${t("selectN")} ${totalInPriority}`}
                                            </button>
                                        </div>

                                        {/* Issue sub-groups */}
                                        {!priCollapsed && (
                                            <div className="divide-y divide-slate-50">
                                                {issues.map(([issueKey, items]) => {
                                                    const subKey = `${priority}::${issueKey}`;
                                                    const subCollapsed = collapsedIssue.has(subKey);
                                                    const selInIssue = items.filter(tk => selectedIds.has(tk.id)).length;
                                                    const allIssueSel = selInIssue === items.length;

                                                    return (
                                                        <div key={issueKey}>
                                                            {/* Sub-group header */}
                                                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50/60">
                                                                <button onClick={() => setCollapsedIssue(prev => { const n = new Set(prev); n.has(subKey) ? n.delete(subKey) : n.add(subKey); return n; })}
                                                                    className="flex items-center gap-2 flex-1 min-w-0 text-left">
                                                                    {subCollapsed ? <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" /> : <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />}
                                                                    <span className="text-[11px] font-bold text-slate-700 truncate">{resolve(issueKey)}</span>
                                                                    <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[9px] font-black shrink-0">{items.length}</span>
                                                                    {selInIssue > 0 && <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[9px] font-black shrink-0">✓ {selInIssue}</span>}
                                                                </button>
                                                                <button onClick={() => selectIssueGroup(priority, issueKey)}
                                                                    className={cn("text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all shrink-0 flex items-center gap-1",
                                                                        allIssueSel ? "bg-purple-500 text-white border-purple-500" : "bg-white border-slate-200 text-slate-500 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50")}>
                                                                    {allIssueSel ? <><CheckSquare className="w-2.5 h-2.5" /> {t("deselectGroup")}</> : <>{t("selectN")} {items.length}</>}
                                                                </button>
                                                            </div>

                                                            {/* Ticket rows */}
                                                            {!subCollapsed && (
                                                                <div className="bg-white">
                                                                    <div className="grid grid-cols-[24px_4px_100px_60px_68px_100px_1fr_64px] gap-x-4 items-center px-4 py-2 border-b border-slate-50">
                                                                        {["", "", t("columns.mssv"), t("columns.room"), t("columns.subject"), t("columns.reporter"), t("columns.status"), t("columns.time")].map((h, i) => (
                                                                            <span key={i} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</span>
                                                                        ))}
                                                                    </div>
                                                                    {items.map(ticket => {
                                                                        const sel = selectedIds.has(ticket.id);
                                                                        const room = ticket.session?.examRoom?.roomNumber ?? (ticket.session as any)?.roomNumber;
                                                                        const isInProgress = ticket.status === "IN_PROGRESS";
                                                                        const timerStart = startedAt[ticket.id] ?? (isInProgress ? ticket.updatedAt : null);
                                                                        return (
                                                                            <div key={ticket.id}
                                                                                onClick={() => ticket.status !== "SOLVED" && toggleTicket(ticket.id)}
                                                                                className={cn(
                                                                                    "group grid grid-cols-[24px_4px_100px_60px_68px_100px_1fr_64px] gap-x-4 items-center px-4 py-3.5 border-b border-slate-50 last:border-0 transition-all",
                                                                                    ticket.status === "SOLVED" ? "opacity-60 cursor-default" : "cursor-pointer",
                                                                                    sel ? "bg-purple-50/70" : ticket.status !== "SOLVED" ? "hover:bg-slate-50/60" : ""
                                                                                )}>
                                                                                <div onClick={e => { e.stopPropagation(); ticket.status !== "SOLVED" && toggleTicket(ticket.id); }} className="flex items-center justify-center">
                                                                                    {ticket.status === "SOLVED"
                                                                                        ? <Square className="w-4 h-4 text-slate-100" />
                                                                                        : sel ? <CheckSquare className="w-4 h-4 text-purple-500" /> : <Square className="w-4 h-4 text-slate-200 group-hover:text-slate-400" />}
                                                                                </div>
                                                                                <div className={cn("w-1.5 h-6 rounded-full", cfg.bar)} />
                                                                                <span className="text-xs font-black text-orange-600 font-mono truncate">{ticket.studentCode ?? "—"}</span>
                                                                                <span className="text-xs font-bold text-blue-600 truncate">{room ?? "—"}</span>
                                                                                <span className="text-[11px] font-mono text-slate-600 truncate">{ticket.session?.subjectCode ?? "—"}</span>
                                                                                <span className="text-[11px] text-slate-500 truncate">{ticket.reporter?.fullName ?? "—"}</span>
                                                                                <div className="flex items-center gap-2 min-w-0">
                                                                                    <span
                                                                                        className={cn("px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0", STATUS_CLS[ticket.status])}
                                                                                        title={ticket.techNote || undefined}
                                                                                    >
                                                                                        {t(`status.${ticket.status}` as any)}
                                                                                    </span>
                                                                                    {isInProgress && timerStart && <TimerBadge startISO={timerStart} />}
                                                                                    {ticket.status === "OPEN" && (
                                                                                        <button
                                                                                            onClick={e => { e.stopPropagation(); handleStart(ticket.id); }}
                                                                                            disabled={processing === ticket.id}
                                                                                            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500 text-white text-[10px] font-bold hover:bg-blue-600 transition-colors disabled:opacity-60">
                                                                                            {processing === ticket.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                                                                                            {t("actions.start")}
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex flex-col gap-0.5 items-end">
                                                                                    <span className="text-[11px] text-slate-400 tabular-nums font-mono">{format(new Date(ticket.createdAt), "HH:mm")}</span>
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

                {/* RIGHT: Quick process panel */}
                <div className="w-[256px] shrink-0 border-l border-slate-100 bg-white flex flex-col overflow-y-auto">
                    <div className="p-4 flex flex-col gap-3 flex-1">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-purple-500" />
                            <span className="text-xs font-black text-slate-800">{t("rightPanel.title")}</span>
                        </div>

                        {selectedIds.size === 0 ? (
                            <div className="flex flex-col items-center py-10 gap-3 text-slate-300">
                                <LayoutList className="w-10 h-10 opacity-40" />
                                <p className="text-xs text-center text-slate-400 leading-relaxed">{t("rightPanel.hint")}</p>
                            </div>
                        ) : (
                            <>
                                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                                    <p className="text-xs font-bold text-purple-700 mb-2">{selectedIds.size} {t("rightPanel.selectedCount")}</p>
                                    <div className="space-y-1 max-h-36 overflow-y-auto">
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
                                        {selected.length > 8 && <p className="text-[10px] text-slate-400 text-center">+{selected.length - 8} ticket</p>}
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowResolveModal(true)}
                                    disabled={processing === "bulk"}
                                    className="w-full h-10 rounded-xl text-xs font-black flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-sm hover:from-purple-700 hover:to-violet-700 transition-all disabled:opacity-60">
                                    {processing === "bulk" ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("loading")}</> : <><CheckCircle2 className="w-4 h-4" /> {t("rightPanel.resolveBtn")} ({selectedIds.size})</>}
                                </button>
                                <button onClick={() => setSelectedIds(new Set())} className="text-[11px] text-slate-400 hover:text-slate-600 text-center w-full transition-colors">{t("deselect")}</button>
                            </>
                        )}

                        {/* Stats */}
                        <div className="mt-auto pt-3 border-t border-slate-50">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{t("triage.urgent").toUpperCase()}</p>
                            {[
                                { l: t("tabs.active"),     v: stats.active,     c: "text-orange-600" },
                                { l: t("tabs.inprogress"), v: stats.inprogress, c: "text-blue-600" },
                                { l: t("tabs.solved"),     v: stats.solved,     c: "text-emerald-600" },
                                { l: t("triage.urgent"),   v: stats.urgent,     c: "text-red-600" },
                            ].map(({ l, v, c }) => (
                                <div key={l} className="flex items-center justify-between mb-1.5">
                                    <span className="text-[11px] text-slate-400">{l}</span>
                                    <span className={cn("text-sm font-black", c)}>{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {showResolveModal && (
                <ResolveModal tickets={selected} onClose={() => setShowResolveModal(false)} onConfirm={handleBulkResolve} />
            )}
        </div>
    );
}
