"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/store/auth-store";
import { examSchedulesApi, ExamSchedule } from "@/lib/api/exam-schedules";
import { ticketsApi, TicketFull } from "@/lib/api/tickets";
import { getCurrentLocale } from "@/hooks/use-check-auth";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { useSocket } from "@/hooks/use-socket";
import {
    Calendar, Clock, Loader2, ChevronRight, CheckCircle2, Hash, MapPin,
    Ticket, AlertCircle, Activity, TrendingUp, Shield, ArrowRight,
    BookOpen, PlayCircle, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { format } from "date-fns";
import { parseLocalDate } from "@/app/[locale]/exam-officer/exam-schedules/utils";

// ── Config ──────────────────────────────────────────────────────────────────
function getSessionStatus(s: ExamSchedule): "Upcoming" | "In Progress" | "Completed" {
    const now = new Date();
    const open = s.examOpenTime ? parseLocalDate(s.examOpenTime) : null;
    const close = s.examCloseTime ? parseLocalDate(s.examCloseTime) : null;
    if (!open || now < open) return "Upcoming";
    if (close && now > close) return "Completed";
    return "In Progress";
}

const SESSION_DOT: Record<string, string> = {
    "Upcoming": "bg-blue-400", "In Progress": "bg-orange-400 animate-pulse", "Completed": "bg-slate-300",
};
const SESSION_BADGE: Record<string, string> = {
    "Upcoming": "bg-blue-50 text-blue-600 border-blue-200",
    "In Progress": "bg-orange-50 text-orange-600 border-orange-200",
    "Completed": "bg-slate-50 text-slate-400 border-slate-200",
};
const SESSION_VI: Record<string, string> = {
    "Upcoming": "Sắp diễn ra", "In Progress": "Đang diễn ra", "Completed": "Đã kết thúc",
};

const PRIORITY_CFG: Record<string, { bar: string; badge: string; dot: string }> = {
    Urgent: { bar: "bg-red-500",    badge: "bg-red-50 text-red-600 border-red-200",        dot: "bg-red-500 animate-pulse" },
    High:   { bar: "bg-orange-500", badge: "bg-orange-50 text-orange-600 border-orange-200", dot: "bg-orange-500" },
    Medium: { bar: "bg-yellow-400", badge: "bg-yellow-50 text-yellow-600 border-yellow-200", dot: "bg-yellow-400" },
    Low:    { bar: "bg-blue-400",   badge: "bg-blue-50 text-blue-600 border-blue-200",     dot: "bg-blue-400" },
};
const STATUS_CFG: Record<string, { label: string; cls: string }> = {
    OPEN:        { label: "Chờ xử lý",  cls: "bg-orange-100 text-orange-700 border-orange-200" },
    IN_PROGRESS: { label: "Đang xử lý", cls: "bg-blue-100 text-blue-700 border-blue-200" },
    SOLVED:      { label: "Đã xử lý",   cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

// ── Component ───────────────────────────────────────────────────────────────
export default function HallInvigilatorDashboard() {
    const t  = useTranslations("HallInvigilatorDashboard");
    const tS = useTranslations("ProctorSession");

    const KNOWN_KEYS = ["eosClientError","spinningScreen","needReassign","lostServerConn","networkError","cannotLogin","wrongExamCode","notInExamList","deviceViolation","cheatingBehavior","submissionFailed","hardwareFailure","focusLostRepeat","cccdMismatch","networkIssue","wrongFileFormat","roomIssue"];
    const resolveIssue = (raw: string) =>
        KNOWN_KEYS.includes(raw)
            ? (() => { try { return tS(`incident.${raw}` as any); } catch { return raw; } })()
            : raw;
    const { user } = useAuthStore();
    const router = useRouter();
    const locale = getCurrentLocale();
    const { socket } = useSocket();

    const [sessions, setSessions] = useState<ExamSchedule[]>([]);
    const [tickets, setTickets] = useState<TicketFull[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [scheds, tks] = await Promise.all([
                examSchedulesApi.list({ limit: 50 }),
                ticketsApi.list(),
            ]);
            const schedArr = Array.isArray(scheds) ? scheds : ((scheds as any).data ?? []);
            setSessions(schedArr);
            setTickets(tks);
        } catch { }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Socket real-time
    useEffect(() => {
        if (!socket) return;
        const refresh = () => fetchData();
        socket.on("ticket:assigned", refresh);
        socket.on("ticket:updated", refresh);
        return () => { socket.off("ticket:assigned", refresh); socket.off("ticket:updated", refresh); };
    }, [socket, fetchData]);

    // Also react to layout's forwardRefresh
    useEffect(() => {
        const handler = () => fetchData();
        window.addEventListener("tickets:refresh", handler);
        return () => window.removeEventListener("tickets:refresh", handler);
    }, [fetchData]);

    // ── Computed ──
    const todaySessions = sessions.filter(s => {
        if (!s.examOpenTime) return false;
        const d = parseLocalDate(s.examOpenTime);
        if (!d) return false;
        const n = new Date();
        return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    });
    const upcomingCount = sessions.filter(s => getSessionStatus(s) === "Upcoming").length;
    const ongoingCount  = sessions.filter(s => getSessionStatus(s) === "In Progress").length;

    const activeTickets = tickets
        .filter(t => t.status === "OPEN" || t.status === "IN_PROGRESS")
        .sort((a, b) => ["Urgent","High","Medium","Low"].indexOf(a.priority) - ["Urgent","High","Medium","Low"].indexOf(b.priority));
    const solvedToday = tickets.filter(t => {
        if (t.status !== "SOLVED") return false;
        const d = new Date(t.updatedAt), n = new Date();
        return d.toDateString() === n.toDateString();
    }).length;
    const urgent = tickets.filter(t => t.priority === "Urgent" && t.status !== "SOLVED").length;
    const inProgress = tickets.filter(t => t.status === "IN_PROGRESS").length;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-full bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-50">

            {/* ── Hero Banner ── */}
            <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 px-8 py-7">
                <div className="absolute -top-8 -right-8 w-56 h-56 rounded-full bg-white/5 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full bg-teal-300/10 blur-xl pointer-events-none" />
                <div className="absolute top-2 right-48 w-24 h-24 rounded-full bg-emerald-300/10 blur-xl pointer-events-none" />

                <div className="relative flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2.5">
                            <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                                <BookOpen className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-teal-100 text-sm font-medium">{t("portalLabel")}</span>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">
                            {t("greeting", { name: user?.name?.split(" ").pop() ?? "" })}
                        </h1>
                        <p className="text-teal-100 text-sm mt-1.5">
                            {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        </p>
                    </div>

                    {urgent > 0 ? (
                        <div className="hidden md:flex items-center gap-3 bg-red-500/20 border border-red-400/30 rounded-2xl px-5 py-4 backdrop-blur">
                            <AlertCircle className="w-6 h-6 text-red-300 animate-pulse" />
                            <div>
                                <p className="text-white font-black text-2xl leading-none">{urgent}</p>
                                <p className="text-red-200 text-xs mt-0.5">{t("urgentTickets")}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="hidden md:flex items-center gap-3 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl px-5 py-4 backdrop-blur">
                            <Shield className="w-6 h-6 text-emerald-300" />
                            <div>
                                <p className="text-white font-black text-sm leading-tight">{t("noUrgent")}</p>
                                <p className="text-emerald-200 text-xs">{t("urgentTickets")}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* ── Stat cards ── */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    {[
                        { icon: Calendar,     label: t("stats.upcomingSessions"),  val: upcomingCount,      gradient: "from-blue-500 to-cyan-500",     bg: "bg-blue-50",     txt: "text-blue-600",    ring: "ring-blue-200",    desc: t("stats.upcomingDesc") },
                        { icon: Activity,     label: t("stats.ongoingSessions"),    val: ongoingCount,       gradient: "from-orange-500 to-amber-500",  bg: "bg-orange-50",   txt: "text-orange-600",  ring: "ring-orange-200",  desc: t("stats.ongoingDesc") },
                        { icon: Ticket,       label: t("stats.pendingTickets"),     val: activeTickets.length, gradient: "from-teal-500 to-emerald-500", bg: "bg-teal-50",     txt: "text-teal-600",    ring: "ring-teal-200",    desc: t("stats.pendingDesc") },
                        { icon: CheckCircle2, label: t("stats.solvedToday"),        val: solvedToday,        gradient: "from-violet-500 to-purple-500", bg: "bg-violet-50",   txt: "text-violet-600",  ring: "ring-violet-200",  desc: t("stats.solvedDesc") },
                    ].map(({ icon: Icon, label, val, gradient, bg, txt, ring, desc }) => (
                        <div key={label} className={cn("relative overflow-hidden rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all duration-300 group cursor-default ring-1", ring)}>
                            <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300", bg)} />
                            <div className="relative p-5 flex items-center gap-4">
                                <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-sm shrink-0", gradient)}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn("text-3xl font-black", txt)}>{loading ? <Loader2 className="w-6 h-6 animate-spin opacity-40" /> : val}</p>
                                    <p className="text-xs text-slate-500 font-medium">{label}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{val} {desc}</p>
                                </div>
                            </div>
                            <div className={cn("h-1 w-full bg-gradient-to-r", gradient)} />
                        </div>
                    ))}
                </div>

                {/* ── Main 3-col layout ── */}
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

                    {/* LEFT: Exam schedule — 2 of 5 col */}
                    <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 to-white">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                                    <Calendar className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="font-black text-slate-900 text-sm">{t("schedule.title")}</h2>
                                    <p className="text-[10px] text-slate-400">{todaySessions.length} {t("schedule.countLabel")}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => router.push(`/${locale}/hall-invigilator/exam-schedules`)}
                                className="flex items-center gap-1 text-xs text-blue-600 font-bold hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                {t("schedule.viewAll")} <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="flex-1 divide-y divide-slate-50 overflow-y-auto max-h-[380px]">
                            {loading ? (
                                <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                            ) : todaySessions.length === 0 ? (
                                <div className="py-12 flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                                        <Calendar className="w-6 h-6 text-slate-200" />
                                    </div>
                                    <p className="text-sm text-slate-400 font-semibold">{t("schedule.empty")}</p>
                                </div>
                            ) : todaySessions.map(s => {
                                const st = getSessionStatus(s);
                                const openD  = s.examOpenTime  ? parseLocalDate(s.examOpenTime)  : null;
                                const closeD = s.examCloseTime ? parseLocalDate(s.examCloseTime) : null;
                                return (
                                    <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50/30 transition-colors">
                                        <div className={cn("w-2 h-2 rounded-full shrink-0", SESSION_DOT[st])} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-800 truncate">{s.subjectCode ?? "—"}</p>
                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                                <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{openD ? format(openD, "HH:mm") : "—"}–{closeD ? format(closeD, "HH:mm") : "—"}</span>
                                                {s.roomNumber && <span className="text-blue-500 font-semibold flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />P.{s.roomNumber}</span>}
                                            </div>
                                        </div>
                                        <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0", SESSION_BADGE[st])}>{t(`session.${st}` as any)}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* All upcoming — scrollable secondary list */}
                        {sessions.filter(s => getSessionStatus(s) === "Upcoming").length > 0 && (
                            <div className="border-t border-slate-100 px-4 py-2 bg-slate-50/50">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{t("schedule.upcoming")}</p>
                                <div className="space-y-1 max-h-24 overflow-y-auto">
                                    {sessions.filter(s => getSessionStatus(s) === "Upcoming").slice(0, 5).map(s => {
                                        const openD = s.examOpenTime ? parseLocalDate(s.examOpenTime) : null;
                                        return (
                                            <div key={s.id} className="flex items-center gap-2 text-[10px] text-slate-500">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-300 shrink-0" />
                                                <span className="font-semibold truncate flex-1">{s.subjectCode ?? "—"}</span>
                                                {openD && <span className="tabular-nums shrink-0">{format(openD, "dd/MM HH:mm")}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* MIDDLE: Active tickets — 2 of 5 col */}
                    <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50/60 to-white">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center">
                                    <Zap className="w-4 h-4 text-teal-600" />
                                </div>
                                <div>
                                    <h2 className="font-black text-slate-900 text-sm">{t("tickets.title")}</h2>
                                    <p className="text-[10px] text-slate-400">{t("tickets.subtitle")}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => router.push(`/${locale}${ROUTES.HALL_INVIGILATOR_TICKETS}`)}
                                className="flex items-center gap-1 text-xs text-teal-600 font-bold hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                {t("tickets.viewAll")} <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto max-h-[420px]">
                            {loading ? (
                                <div className="py-12 flex flex-col items-center gap-3">
                                    <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                                </div>
                            ) : activeTickets.length === 0 ? (
                                <div className="py-12 flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                                        <CheckCircle2 className="w-6 h-6 text-slate-200" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-400">{t("tickets.empty")}</p>
                                    <p className="text-xs text-slate-300">{t("tickets.emptyDesc")}</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {activeTickets.slice(0, 8).map(t => {
                                        const cfg = PRIORITY_CFG[t.priority] ?? PRIORITY_CFG.Low;
                                        const sts = STATUS_CFG[t.status];
                                        const room = t.session?.examRoom?.roomNumber ?? (t.session as any)?.roomNumber;
                                        return (
                                            <div key={t.id}
                                                onClick={() => router.push(`/${locale}${ROUTES.HALL_INVIGILATOR_TICKETS}`)}
                                                className="flex items-center gap-3 px-5 py-3 hover:bg-teal-50/40 transition-colors cursor-pointer group"
                                            >
                                                <div className={cn("w-1 h-10 rounded-full shrink-0", cfg.bar)} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 truncate group-hover:text-teal-700 transition-colors">{resolveIssue(t.issueName)}</p>
                                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                                        {t.studentCode && <span className="font-mono font-bold text-orange-600 flex items-center gap-0.5"><Hash className="w-2.5 h-2.5" />{t.studentCode}</span>}
                                                        {room && <span className="text-teal-500 font-semibold flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{room}</span>}
                                                        <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{format(new Date(t.createdAt), "HH:mm")}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold border", cfg.badge)}>{t.priority}</span>
                                                    <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-semibold border", sts?.cls)}>{sts?.label}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {activeTickets.length > 8 && (
                                        <div className="px-5 py-3 text-center">
                                            <button onClick={() => router.push(`/${locale}${ROUTES.HALL_INVIGILATOR_TICKETS}`)}
                                                className="text-xs text-teal-500 font-bold hover:text-teal-700 flex items-center gap-1 mx-auto">
                                                {t("tickets.viewMore", { count: activeTickets.length - 8 })} <ArrowRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Summary panel — 1 of 5 col */}
                    <div className="xl:col-span-1 flex flex-col gap-4">
                        {/* Activity summary card */}
                        <div className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-2xl p-5 relative overflow-hidden">
                            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/5 blur-xl" />
                            <div className="relative">
                                <p className="text-teal-100 text-xs font-semibold mb-3 uppercase tracking-wider">{t("summary.title")}</p>
                                <div className="space-y-3">
                                    {[
                                        { label: t("summary.completionRate"), val: tickets.length ? `${Math.round((tickets.filter(tk => tk.status === "SOLVED").length / tickets.length) * 100)}%` : "—", icon: TrendingUp },
                                        { label: t("summary.urgentPending"),  val: `${urgent} ${t("summary.pending")}`,  icon: AlertCircle },
                                        { label: t("summary.inProgress"),     val: `${inProgress}`,                       icon: PlayCircle },
                                    ].map(({ label, val, icon: Icon }) => (
                                        <div key={label} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Icon className="w-3.5 h-3.5 text-teal-200" />
                                                <p className="text-teal-100 text-xs leading-tight">{label}</p>
                                            </div>
                                            <p className="text-white font-black text-sm">{val}</p>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => router.push(`/${locale}${ROUTES.HALL_INVIGILATOR_TICKETS}`)}
                                    className="mt-5 w-full flex items-center justify-center gap-2 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-white text-xs font-bold transition-colors border border-white/20"
                                >
                                    {t("summary.viewAllBtn")} <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Today status quick card */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">{t("summary.todayTitle")}</p>
                            <div className="space-y-2.5">
                                {[
                                    { label: t("summary.todayOngoing"), val: ongoingCount,   color: "text-orange-600", bg: "bg-orange-50"  },
                                    { label: t("summary.todaySolved"),  val: solvedToday,    color: "text-emerald-600", bg: "bg-emerald-50" },
                                    { label: t("summary.todayTotal"),   val: tickets.length, color: "text-teal-600",   bg: "bg-teal-50"    },
                                ].map(({ label, val, color, bg }) => (
                                    <div key={label} className={cn("flex items-center justify-between rounded-xl px-3 py-2", bg)}>
                                        <span className="text-xs text-slate-500">{label}</span>
                                        <span className={cn("text-sm font-black", color)}>{loading ? "—" : val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
