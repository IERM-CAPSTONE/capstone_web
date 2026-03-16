"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import { ticketsApi, TicketFull } from "@/lib/api/tickets";
import { getCurrentLocale } from "@/hooks/use-check-auth";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { useSocket } from "@/hooks/use-socket";
import {
    Ticket, CheckCircle2,
    Clock, Loader2, ChevronRight, Hash, MapPin, Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { format } from "date-fns";

const TICKET_STATUS_VI: Record<string, string> = {
    OPEN: "Mới", IN_PROGRESS: "Đang xử lý", SOLVED: "Đã xử lý", CLOSED: "Đóng",
};
const TICKET_STATUS_COLOR: Record<string, string> = {
    OPEN: "bg-orange-100 text-orange-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    SOLVED: "bg-green-100 text-green-700",
    CLOSED: "bg-slate-100 text-slate-500",
};
const PRIORITY_COLOR: Record<string, string> = {
    Low: "text-blue-600", Medium: "text-yellow-600", High: "text-orange-600", Urgent: "text-red-600",
};

export default function ITSupportDashboard() {
    const { user } = useAuthStore();
    const router = useRouter();
    const locale = getCurrentLocale();

    const [tickets, setTickets] = useState<TicketFull[]>([]);
    const [loading, setLoading] = useState(true);
    const { socket } = useSocket();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await ticketsApi.list();
            setTickets(data);
        } catch { }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Real-time: auto-refresh khi có ticket được giao
    useEffect(() => {
        if (!socket) return;
        const myUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
        const handle = (payload: { assigneeId?: string }) => {
            if (payload.assigneeId && myUserId && payload.assigneeId !== myUserId) return;
            fetchData();
        };
        socket.on("ticket:assigned", handle);
        return () => { socket.off("ticket:assigned", handle); };
    }, [socket, fetchData]);

    const openCount = tickets.filter(t => t.status === "OPEN").length;
    const inProgressCount = tickets.filter(t => t.status === "IN_PROGRESS").length;
    const solvedTodayCount = tickets.filter(t => {
        if (t.status !== "SOLVED") return false;
        const d = new Date(t.updatedAt);
        const n = new Date();
        return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    }).length;

    const activeTickets = tickets
        .filter(t => t.status === "OPEN" || t.status === "IN_PROGRESS")
        .slice(0, 5);

    return (
        <div className="min-h-full p-4 md:p-6 space-y-6">
            {/* Welcome */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl px-6 py-5 text-white shadow-lg">
                <p className="text-purple-100 text-sm mb-1">Chào mừng trở lại 👋</p>
                <h1 className="text-2xl font-bold">{user?.name ?? "IT Support"}</h1>
                <p className="text-purple-200 text-sm mt-1">Hệ thống quản lý kỳ thi – Kỹ thuật viên</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { icon: Ticket, label: "Chờ xử lý", val: openCount, color: "bg-orange-50 text-orange-600" },
                    { icon: Clock, label: "Đang xử lý", val: inProgressCount, color: "bg-blue-50 text-blue-600" },
                    { icon: CheckCircle2, label: "Xong hôm nay", val: solvedTodayCount, color: "bg-green-50 text-green-600" },
                ].map(({ icon: Icon, label, val, color }) => (
                    <div key={label} className={cn("rounded-xl p-4 flex flex-col items-center text-center gap-1", color, "bg-opacity-60 border border-current border-opacity-10")}>
                        <Icon className="w-5 h-5 opacity-80" />
                        <span className="text-2xl font-bold">{val}</span>
                        <span className="text-xs opacity-70 font-medium">{label}</span>
                    </div>
                ))}
            </div>

            {/* Active tickets */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                        <Wrench className="w-4 h-4 text-purple-500" /> Ticket kỹ thuật đang chờ
                    </h2>
                    <button
                        onClick={() => router.push(`/${locale}${ROUTES.IT_SUPPORT_TICKETS}`)}
                        className="text-xs text-purple-500 font-semibold hover:text-purple-600 flex items-center gap-0.5"
                    >
                        Xem tất cả <ChevronRight className="w-3 h-3" />
                    </button>
                </div>
                <div className="divide-y divide-slate-50">
                    {loading ? (
                        <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
                    ) : activeTickets.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                            <CheckCircle2 className="w-8 h-8 text-slate-200" />
                            Không có ticket kỹ thuật nào đang chờ xử lý
                        </div>
                    ) : activeTickets.map(t => (
                        <div key={t.id} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-semibold text-slate-800 truncate block">{t.issueName}</span>
                                    {t.studentCode && (
                                        <p className="text-xs font-mono font-bold text-orange-600 mt-0.5">
                                            <Hash className="w-3 h-3 inline mr-0.5" />{t.studentCode}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                                        {t.session?.examRoom?.roomNumber && (
                                            <span className="flex items-center gap-1 text-purple-600 font-semibold">
                                                <MapPin className="w-3 h-3" />{t.session.examRoom.roomNumber}
                                            </span>
                                        )}
                                        <span className={cn("font-semibold", PRIORITY_COLOR[t.priority] ?? "text-slate-500")}>{t.priority}</span>
                                        <span><Clock className="w-3 h-3 inline mr-0.5" />{format(new Date(t.createdAt), "HH:mm")}</span>
                                    </div>
                                </div>
                                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0", TICKET_STATUS_COLOR[t.status] ?? "bg-slate-100 text-slate-500")}>
                                    {TICKET_STATUS_VI[t.status] ?? t.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
