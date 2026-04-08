"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
    Ticket, RefreshCw, Loader2, Clock,
    CheckCircle2, Hash, MapPin, X,
    ChevronRight, FileText, Activity,
    ShieldAlert, Flame, TrendingDown, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ticketsApi, TicketFull } from "@/lib/api/tickets";
import { useSocket } from "@/hooks/use-socket";
import { toast } from "sonner";

// ── Priority / Status config ───────────────────────────────────────────────────
const PRIORITY_ORDER: Record<string, number> = { Urgent: 0, Normal: 1 };
const STATUS_ORDER: Record<string, number>   = { OPEN: 0, IN_PROGRESS: 1, SOLVED: 2, CLOSED: 3 };

const PRIORITY_CFG: Record<string, {
    label: string; badge: string; bar: string; glow: string;
    Icon: React.ElementType; iconColor: string;
}> = {
    Urgent: { label: "priority.urgent", badge: "bg-red-100 text-red-700 border-red-200",       bar: "bg-gradient-to-r from-red-500 to-rose-500",     glow: "shadow-red-100",    Icon: ShieldAlert,  iconColor: "text-red-500"    },
    Normal: { label: "priority.normal", badge: "bg-slate-100 text-slate-700 border-slate-200",    bar: "bg-gradient-to-r from-slate-400 to-slate-500",  glow: "shadow-slate-100",  Icon: Minus,        iconColor: "text-slate-500"  },
};

const STATUS_CFG: Record<string, { labelKey: string; dot: string; badge: string; pulse?: boolean }> = {
    OPEN:        { labelKey: "status.open",       dot: "bg-orange-500",  badge: "bg-orange-50 text-orange-700 border-orange-200",   pulse: true  },
    IN_PROGRESS: { labelKey: "status.inProgress", dot: "bg-blue-500",    badge: "bg-blue-50 text-blue-700 border-blue-200",         pulse: true  },
    SOLVED:      { labelKey: "status.solved",      dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200"              },
    CLOSED:      { labelKey: "status.closed",      dot: "bg-slate-400",   badge: "bg-slate-100 text-slate-500 border-slate-200"                   },
};

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ProctorTicketsPage() {
    const t        = useTranslations("ProctorTickets");
    const tSession = useTranslations("ProctorSession");

    const KNOWN_INCIDENT_KEYS = [
        "eosClientError","spinningScreen","needReassign",
        "lostServerConn","networkError","cannotLogin",
        "wrongExamCode","notInExamList",
    ];

    const resolveIssueName = (raw: string) => {
        if (KNOWN_INCIDENT_KEYS.includes(raw)) {
            try { return tSession(`incident.${raw}` as any); } catch { return raw; }
        }
        return raw;
    };

    const FILTER_TABS = [
        { key: "all",         labelKey: "filter.all"        },
        { key: "OPEN",        labelKey: "filter.open"       },
        { key: "IN_PROGRESS", labelKey: "filter.inProgress" },
        { key: "SOLVED",      labelKey: "filter.solved"     },
    ];

    const [tickets,  setTickets]  = useState<TicketFull[]>([]);
    const [loading,  setLoading]  = useState(true);
    const [filter,   setFilter]   = useState("all");
    const [imgOpen,  setImgOpen]  = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);
    const { socket } = useSocket();

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            const data = await ticketsApi.list();
            setTickets(data);
        } catch {
            toast.error(t("errorLoad"));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    // ── Real-time socket ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;
        const handleUpdated  = (p: { ticketId: string; status: string }) =>
            setTickets(prev => prev.map(tk => tk.id === p.ticketId ? { ...tk, status: p.status as any } : tk));
        const handleResolved = (p: { ticketId: string }) =>
            setTickets(prev => prev.map(tk => tk.id === p.ticketId ? { ...tk, status: "SOLVED" as any } : tk));
        socket.on("ticket:updated",  handleUpdated);
        socket.on("ticket:resolved", handleResolved);
        return () => { socket.off("ticket:updated", handleUpdated); socket.off("ticket:resolved", handleResolved); };
    }, [socket]);

    // ── Sorted + filtered: unresolved first ───────────────────────────────────
    const displayed = useMemo(() => {
        const list = tickets.filter(tk => filter === "all" ? true : tk.status === filter);
        return [...list].sort((a, b) => {
            const sDiff = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
            if (sDiff !== 0) return sDiff;
            const pDiff = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
            if (pDiff !== 0) return pDiff;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [tickets, filter]);

    const counts = {
        all:         tickets.length,
        OPEN:        tickets.filter(tk => tk.status === "OPEN").length,
        IN_PROGRESS: tickets.filter(tk => tk.status === "IN_PROGRESS").length,
        SOLVED:      tickets.filter(tk => tk.status === "SOLVED").length,
    } as Record<string, number>;

    const unresolvedCount = counts.OPEN + counts.IN_PROGRESS;

    return (
        <div className="min-h-full bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-50">

            {/* ── HEADER ── */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-100/80 shadow-sm">
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-200">
                            <Ticket className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-black text-slate-900 tracking-tight">{t("title")}</h1>
                                {unresolvedCount > 0 && (
                                    <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full animate-pulse">
                                        {unresolvedCount}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400">{t("subtitle")}</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchTickets} disabled={loading}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-orange-600 bg-slate-50 border border-slate-200 rounded-xl hover:border-orange-300 transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                        {t("refresh")}
                    </button>
                </div>

                {/* Filter tabs */}
                <div className="px-6 pb-3 flex items-center gap-2 overflow-x-auto">
                    {FILTER_TABS.map(tab => {
                        const count = counts[tab.key] ?? 0;
                        const sc    = tab.key !== "all" ? STATUS_CFG[tab.key] : null;
                        const active = filter === tab.key;
                        return (
                            <button
                                key={tab.key} onClick={() => setFilter(tab.key)}
                                className={cn(
                                    "flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all whitespace-nowrap",
                                    active ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-200"
                                           : "bg-white border-slate-200 text-slate-600 hover:border-orange-200 hover:text-orange-600"
                                )}
                            >
                                {sc && <span className={cn("w-2 h-2 rounded-full shrink-0", sc.dot, sc.pulse && count > 0 && "animate-pulse")} />}
                                {t(tab.labelKey as any)}
                                <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-black", active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── BODY ── */}
            <div className="p-5 max-w-3xl">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-400">{t("loading")}</span>
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <div className="w-20 h-20 rounded-3xl bg-white shadow-lg border border-slate-100 flex items-center justify-center">
                            <Ticket className="w-10 h-10 text-slate-200" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-slate-500">{t("empty.title")}</p>
                            <p className="text-xs text-slate-400 mt-1">{t("empty.subtitle")}</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {displayed.map((ticket, idx) => {
                            const roomNumber  = ticket.session?.examRoom?.roomNumber ?? (ticket.session as any)?.roomNumber;
                            const sc          = STATUS_CFG[ticket.status] ?? STATUS_CFG.OPEN;
                            const pc          = PRIORITY_CFG[ticket.priority] ?? PRIORITY_CFG.Normal;
                            const isExpanded  = expanded === ticket.id;
                            const isNew       = ticket.status === "OPEN";
                            const isInProgress = ticket.status === "IN_PROGRESS";
                            const isSolved    = ticket.status === "SOLVED" || ticket.status === "CLOSED";
                            const { Icon }    = pc;

                            return (
                                <div
                                    key={ticket.id}
                                    className={cn(
                                        "group relative bg-white rounded-2xl border overflow-hidden transition-all duration-300",
                                        isSolved ? "border-slate-100 opacity-75 hover:opacity-100"
                                                 : cn("border-slate-150 shadow-md hover:shadow-lg hover:-translate-y-0.5", pc.glow),
                                        isInProgress && "ring-1 ring-blue-200"
                                    )}
                                >
                                    {/* Priority bar */}
                                    <div className={cn("h-1 w-full", pc.bar)} />

                                    {/* Status badge (top-right) */}
                                    {isNew && (
                                        <div className="absolute top-3 right-3">
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-500 text-white text-[9px] font-black rounded-full animate-pulse shadow-sm shadow-orange-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                                                {t("statusNew")}
                                            </span>
                                        </div>
                                    )}
                                    {isInProgress && (
                                        <div className="absolute top-3 right-3">
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500 text-white text-[9px] font-black rounded-full shadow-sm shadow-blue-200">
                                                <Activity className="w-2.5 h-2.5 animate-pulse" />
                                                {t(sc.labelKey as any)}
                                            </span>
                                        </div>
                                    )}

                                    <div className="p-4 pr-24">
                                        {/* Row 1: index + icon + student code + priority badge */}
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-[10px] font-black text-slate-300 tabular-nums w-5 shrink-0">
                                                {String(idx + 1).padStart(2, "0")}
                                            </span>
                                            <Icon className={cn("w-3.5 h-3.5 shrink-0", pc.iconColor)} />
                                            {ticket.studentCode && (
                                                <span className="flex items-center gap-1 text-[10px] font-black text-orange-600 font-mono bg-orange-50 px-1.5 py-0.5 rounded-md border border-orange-100">
                                                    <Hash className="w-2.5 h-2.5" />{ticket.studentCode}
                                                </span>
                                            )}
                                            <span className={cn("ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border", pc.badge)}>
                                                {t(pc.label as any)}
                                            </span>
                                        </div>

                                        {/* Row 2: Issue name */}
                                        <p className={cn(
                                            "text-sm font-bold leading-snug mb-2",
                                            isSolved ? "text-slate-400 line-through decoration-slate-300" : "text-slate-900"
                                        )}>
                                            {resolveIssueName(ticket.issueName)}
                                        </p>

                                        {/* Row 3: Meta */}
                                        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                                            {ticket.session?.subjectCode && (
                                                <span className="flex items-center gap-1 font-mono font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">
                                                    <FileText className="w-3 h-3" />{ticket.session.subjectCode}
                                                </span>
                                            )}
                                            {roomNumber && (
                                                <span className="flex items-center gap-1 text-blue-600 font-semibold">
                                                    <MapPin className="w-3 h-3" />{roomNumber}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {format(new Date(ticket.createdAt), "dd/MM HH:mm")}
                                            </span>
                                            {isSolved && (
                                                <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border", sc.badge)}>
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    {t(sc.labelKey as any)}
                                                </span>
                                            )}
                                            {(ticket.description || ticket.resolveNote || ticket.attachment) && (
                                                <button
                                                    onClick={() => setExpanded(isExpanded ? null : ticket.id)}
                                                    className="ml-auto flex items-center gap-1 text-slate-400 hover:text-orange-500 transition-colors font-semibold"
                                                >
                                                    {isExpanded ? t("collapse") : t("expand")}
                                                    <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", isExpanded && "rotate-90")} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Expanded details */}
                                        {isExpanded && (
                                            <div className="mt-3 space-y-2.5 border-t border-slate-50 pt-3">
                                                {ticket.description && (
                                                    <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 rounded-xl px-3 py-2.5">
                                                        {ticket.description}
                                                    </p>
                                                )}
                                                {ticket.resolveNote && (
                                                    <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                                        <div>
                                                            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide mb-0.5">{t("resolveNote")}</p>
                                                            <p className="text-xs text-emerald-800">{ticket.resolveNote}</p>
                                                            {ticket.assignee && (
                                                                <p className="text-[11px] text-emerald-600 mt-1 font-medium">{t("by")}: {ticket.assignee.fullName}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {ticket.attachment && (
                                                    <img
                                                        src={ticket.attachment} alt="evidence"
                                                        onClick={() => setImgOpen(ticket.attachment!)}
                                                        className="h-24 w-auto rounded-xl border border-slate-200 object-cover cursor-zoom-in hover:opacity-90 transition-opacity shadow-sm"
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Left accent for unresolved urgent tickets */}
                                    {!isSolved && ticket.priority === "Urgent" && (
                                        <div className={cn(
                                            "absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl",
                                            "bg-red-500"
                                        )} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Fullscreen image */}
            {imgOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setImgOpen(null)}
                >
                    <div className="relative max-w-3xl">
                        <img src={imgOpen} alt="attachment" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl" />
                        <button
                            className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                            onClick={() => setImgOpen(null)}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
