"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import { examSchedulesApi, ExamSchedule } from "@/lib/api/exam-schedules";
import { ticketsApi, TicketFull } from "@/lib/api/tickets";
import { getCurrentLocale } from "@/hooks/use-check-auth";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import {
    LayoutDashboard, Building2, Ticket, Calendar,
    Clock, Loader2, AlertCircle, ChevronRight, CheckCircle2, Hash, MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { format } from "date-fns";
import { parseLocalDate } from "@/app/[locale]/exam-officer/exam-schedules/utils";

function getSessionStatus(s: ExamSchedule): "Upcoming" | "In Progress" | "Completed" {
    const now = new Date();
    const open = s.examOpenTime ? parseLocalDate(s.examOpenTime) : null;
    const close = s.examCloseTime ? parseLocalDate(s.examCloseTime) : null;
    if (!open || now < open) return "Upcoming";
    if (close && now > close) return "Completed";
    return "In Progress";
}

const STATUS_BADGE: Record<string, string> = {
    "Upcoming": "bg-blue-100 text-blue-700 border-blue-200",
    "In Progress": "bg-orange-100 text-orange-700 border-orange-200",
    "Completed": "bg-gray-100 text-gray-600 border-gray-200",
};
const STATUS_DOT: Record<string, string> = {
    "Upcoming": "bg-blue-400", "In Progress": "bg-orange-400", "Completed": "bg-gray-300",
};
const STATUS_VI: Record<string, string> = {
    "Upcoming": "Sắp diễn ra", "In Progress": "Đang diễn ra", "Completed": "Đã kết thúc",
};
const TICKET_STATUS_VI: Record<string, string> = {
    OPEN: "Mới", IN_PROGRESS: "Đang xử lý", SOLVED: "Đã xử lý",
};
const TICKET_STATUS_COLOR: Record<string, string> = {
    OPEN: "bg-orange-100 text-orange-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    SOLVED: "bg-green-100 text-green-700",
};

export default function HallInvigilatorDashboard() {
    const { user } = useAuthStore();
    const router = useRouter();
    const locale = getCurrentLocale();

    const [sessions, setSessions] = useState<ExamSchedule[]>([]);
    const [assignedTickets, setAssignedTickets] = useState<TicketFull[]>([]);
    const [loading, setLoading] = useState(true);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const [scheds, tickets] = await Promise.all([
                examSchedulesApi.list({ limit: 50 }),
                ticketsApi.list(),
            ]);
            const schedArr = Array.isArray(scheds) ? scheds : ((scheds as any).data ?? []);
            setSessions(schedArr);
            setAssignedTickets(tickets.filter((t: TicketFull) =>
                t.status === "IN_PROGRESS" || t.status === "OPEN"
            ).slice(0, 5));
        } catch { }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const todaySessions = sessions.filter(s => {
        if (!s.examOpenTime) return false;
        const d = parseLocalDate(s.examOpenTime);
        if (!d) return false;
        const n = new Date();
        return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    });

    const upcomingCount = sessions.filter(s => getSessionStatus(s) === "Upcoming").length;
    const ongoingCount = sessions.filter(s => getSessionStatus(s) === "In Progress").length;
    const pendingTicketCount = assignedTickets.filter(t => t.status !== "SOLVED").length;

    return (
        <div className="min-h-full p-4 md:p-6 space-y-6">
            {/* Welcome */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl px-6 py-5 text-white shadow-lg">
                <p className="text-blue-100 text-sm mb-1">Chào mừng trở lại 👋</p>
                <h1 className="text-2xl font-bold">{user?.name ?? "Giám thị hành lang"}</h1>
                <p className="text-blue-200 text-sm mt-1">Hệ thống quản lý kỳ thi – Giám thị hành lang</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { icon: Calendar, label: "Ca sắp diễn ra", val: upcomingCount, color: "bg-blue-50 text-blue-600" },
                    { icon: Building2, label: "Đang diễn ra", val: ongoingCount, color: "bg-orange-50 text-orange-600" },
                    { icon: Ticket, label: "Ticket cần xử lý", val: pendingTicketCount, color: "bg-red-50 text-red-600" },
                ].map(({ icon: Icon, label, val, color }) => (
                    <div key={label} className={cn("rounded-xl p-4 flex flex-col items-center text-center gap-1", color, "bg-opacity-60 border border-current border-opacity-10")}>
                        <Icon className="w-5 h-5 opacity-80" />
                        <span className="text-2xl font-bold">{val}</span>
                        <span className="text-xs opacity-70 font-medium">{label}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Today's sessions */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-blue-500" /> Lịch thi hôm nay
                        </h2>
                        <span className="text-xs text-slate-400">{todaySessions.length} ca</span>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {loading ? (
                            <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
                        ) : todaySessions.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-xs">Không có ca thi nào hôm nay</div>
                        ) : todaySessions.slice(0, 5).map(s => {
                            const st = getSessionStatus(s);
                            return (
                                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                                    <div className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[st])} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{s.subjectCode ?? "—"}</p>
                                        <p className="text-xs text-slate-400">
                                            {(() => { const d = parseLocalDate(s.examOpenTime); return d ? format(d, "HH:mm") : "—"; })()}–{(() => { const d = parseLocalDate(s.examCloseTime); return d ? format(d, "HH:mm") : "—"; })()}
                                            {s.roomNumber && <> · <span className="text-blue-500 font-semibold">P.{s.roomNumber}</span></>}
                                        </p>
                                    </div>
                                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", STATUS_BADGE[st])}>{STATUS_VI[st]}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Assigned tickets */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                            <Ticket className="w-4 h-4 text-orange-500" /> Ticket được giao
                        </h2>
                        <button
                            onClick={() => router.push(`/${locale}${ROUTES.HALL_INVIGILATOR_TICKETS}`)}
                            className="text-xs text-orange-500 font-semibold hover:text-orange-600 flex items-center gap-0.5"
                        >
                            Xem tất cả <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {loading ? (
                            <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
                        ) : assignedTickets.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                                <CheckCircle2 className="w-8 h-8 text-slate-200" />
                                Không có ticket nào được giao
                            </div>
                        ) : assignedTickets.map(t => (
                            <div key={t.id} className="px-4 py-3">
                                <div className="flex items-start justify-between gap-2">
                                    <span className="text-sm font-semibold text-slate-800 truncate">{t.issueName}</span>
                                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0", TICKET_STATUS_COLOR[t.status] ?? "bg-slate-100 text-slate-500")}>
                                        {TICKET_STATUS_VI[t.status] ?? t.status}
                                    </span>
                                </div>
                                {t.studentCode && (
                                    <p className="text-xs font-mono font-bold text-orange-600 mt-0.5">
                                        <Hash className="w-3 h-3 inline mr-0.5" />{t.studentCode}
                                    </p>
                                )}
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {t.reporter?.fullName ?? "—"} · {t.session?.examRoom?.roomNumber ? `P.${t.session.examRoom.roomNumber}` : ""}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
