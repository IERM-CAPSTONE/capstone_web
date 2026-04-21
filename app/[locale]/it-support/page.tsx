"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth-store";
import { ticketsApi, TicketFull } from "@/lib/api/tickets";
import { getCurrentLocale } from "@/hooks/use-check-auth";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { useSocket } from "@/hooks/use-socket";
import {
    Ticket, CheckCircle2, Clock, Loader2, ChevronRight,
    Hash, MapPin, Wrench, AlertCircle, Activity, Zap,
    TrendingUp, Shield, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { format } from "date-fns";

const PRIORITY_CFG: Record<string, { bar: string; badge: string; dot: string }> = {
    Urgent: { bar: "bg-red-500",    badge: "bg-red-50 text-red-600 border-red-200",    dot: "bg-red-500 animate-pulse" },
    Normal: { bar: "bg-slate-400",  badge: "bg-slate-50 text-slate-700 border-slate-200", dot: "bg-slate-400" },
};
const STATUS_CFG: Record<string, { label: string; cls: string }> = {
    OPEN:        { label: "Chờ xử lý",  cls: "bg-orange-100 text-orange-700 border-orange-200" },
    IN_PROGRESS: { label: "Đang xử lý", cls: "bg-blue-100 text-blue-700 border-blue-200" },
    SOLVED:      { label: "Đã xử lý",   cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    CLOSED:      { label: "Đóng",       cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

export default function ITSupportDashboard() {
    const { user } = useAuthStore();
    const router = useRouter();
    const locale = getCurrentLocale();
    const { socket } = useSocket();
    const [tickets, setTickets] = useState<TicketFull[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try { setTickets(await ticketsApi.list()); }
        catch { }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (!socket) return;
        const refresh = () => fetchData();
        socket.on("ticket:assigned", refresh);
        socket.on("ticket:updated", refresh);
        return () => { socket.off("ticket:assigned", refresh); socket.off("ticket:updated", refresh); };
    }, [socket, fetchData]);

    const open = tickets.filter(t => t.status === "OPEN").length;
    const inProgress = tickets.filter(t => t.status === "IN_PROGRESS").length;
    const solvedToday = tickets.filter(t => {
        if (t.status !== "SOLVED") return false;
        const d = new Date(t.updatedAt), n = new Date();
        return d.toDateString() === n.toDateString();
    }).length;
    const urgent = tickets.filter(t => t.priority === "Urgent" && t.status !== "SOLVED").length;

    const activeTickets = tickets
        .filter(t => t.status === "OPEN" || t.status === "IN_PROGRESS")
        .sort((a, b) => ["Urgent", "Normal"].indexOf(a.priority) - ["Urgent", "Normal"].indexOf(b.priority));

    const solvedTickets = tickets
        .filter(t => t.status === "SOLVED")
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 4);

    return (
        <div className="min-h-full bg-gradient-to-br from-slate-50 via-purple-50/20 to-slate-50">
            {/* Hero Banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-purple-700 via-purple-600 to-violet-600 px-8 py-7">
                <div className="absolute -top-8 -right-8 w-56 h-56 rounded-full bg-white/5 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full bg-violet-300/10 blur-xl pointer-events-none" />
                <div className="absolute top-2 right-40 w-20 h-20 rounded-full bg-purple-300/10 blur-xl pointer-events-none" />

                <div className="relative flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2.5">
                            <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                                <Wrench className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-purple-200 text-sm font-medium">IT Support Portal</span>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">
                            Xin chào, {user?.name?.split(" ").pop() ?? "Tech"}! 👋
                        </h1>
                        <p className="text-purple-200 text-sm mt-1.5">
                            {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        </p>
                    </div>

                    {/* Right side: urgent beacon */}
                    {urgent > 0 ? (
                        <div className="hidden md:flex items-center gap-3 bg-red-500/20 border border-red-400/30 rounded-2xl px-5 py-4 backdrop-blur">
                            <AlertCircle className="w-6 h-6 text-red-300 animate-pulse" />
                            <div>
                                <p className="text-white font-black text-2xl leading-none">{urgent}</p>
                                <p className="text-red-200 text-xs mt-0.5">Ticket khẩn cấp</p>
                            </div>
                        </div>
                    ) : (
                        <div className="hidden md:flex items-center gap-3 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl px-5 py-4 backdrop-blur">
                            <Shield className="w-6 h-6 text-emerald-300" />
                            <div>
                                <p className="text-white font-black text-sm leading-tight">Không có</p>
                                <p className="text-emerald-200 text-xs">Ticket khẩn cấp</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Stat cards — 4 across */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    {[
                        { icon: Ticket,        label: "Chờ xử lý",    val: open,       gradient: "from-orange-500 to-amber-500",   bg: "bg-orange-50",    txt: "text-orange-600",  ring: "ring-orange-200",  desc: "ticket mới" },
                        { icon: Activity,      label: "Đang xử lý",   val: inProgress, gradient: "from-blue-500 to-cyan-500",       bg: "bg-blue-50",      txt: "text-blue-600",    ring: "ring-blue-200",    desc: "đang xử lý" },
                        { icon: CheckCircle2,  label: "Xong hôm nay", val: solvedToday,gradient: "from-emerald-500 to-teal-500",   bg: "bg-emerald-50",   txt: "text-emerald-600", ring: "ring-emerald-200", desc: "hoàn thành" },
                        { icon: TrendingUp,    label: "Tổng cộng",    val: tickets.length,gradient: "from-purple-500 to-violet-500",bg: "bg-purple-50",   txt: "text-purple-600",  ring: "ring-purple-200",  desc: "ticket được giao" },
                    ].map(({ icon: Icon, label, val, gradient, bg, txt, ring, desc }) => (
                        <div key={label} className={cn("relative overflow-hidden rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all duration-300 group cursor-default ring-1", ring)}>
                            <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300", bg)} />
                            <div className="relative p-5 flex items-center gap-4">
                                <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-sm shrink-0", gradient)}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={cn("text-3xl font-black", txt)}>{val}</p>
                                    <p className="text-xs text-slate-500 font-medium">{label}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{val} {desc}</p>
                                </div>
                            </div>
                            <div className={cn("h-1 w-full bg-gradient-to-r", gradient)} />
                        </div>
                    ))}
                </div>

                {/* Main content: 2-column on XL */}
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
                    {/* Active tickets — 3 of 5 columns */}
                    <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center">
                                    <Zap className="w-4 h-4 text-orange-500" />
                                </div>
                                <div>
                                    <h2 className="font-black text-slate-900 text-sm">Ticket cần xử lý</h2>
                                    <p className="text-[10px] text-slate-400">Theo mức độ ưu tiên</p>
                                </div>
                            </div>
                            <button onClick={() => router.push(`/${locale}${ROUTES.IT_SUPPORT_TICKETS}`)}
                                className="flex items-center gap-1 text-xs text-purple-600 font-bold hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors">
                                Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {loading ? (
                            <div className="py-16 flex flex-col items-center gap-3">
                                <Loader2 className="w-7 h-7 animate-spin text-purple-300" />
                                <span className="text-xs text-slate-400">Đang tải...</span>
                            </div>
                        ) : activeTickets.length === 0 ? (
                            <div className="py-16 flex flex-col items-center gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                                    <CheckCircle2 className="w-7 h-7 text-slate-200" />
                                </div>
                                <p className="text-sm font-semibold text-slate-400">Không có ticket nào chờ xử lý</p>
                                <p className="text-xs text-slate-300">Bạn đã hoàn thành tất cả!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {activeTickets.slice(0, 8).map(t => {
                                    const cfg = PRIORITY_CFG[t.priority] ?? PRIORITY_CFG.Normal;
                                    const sts = STATUS_CFG[t.status];
                                    const room = t.session?.examRoom?.roomNumber ?? (t.session as any)?.roomNumber;
                                    return (
                                        <div key={t.id} onClick={() => router.push(`/${locale}${ROUTES.IT_SUPPORT_TICKETS}`)}
                                            className="flex items-center gap-3 px-5 py-3 hover:bg-purple-50/40 transition-colors cursor-pointer group">
                                            <div className={cn("w-1 h-10 rounded-full shrink-0", cfg.bar)} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-800 truncate group-hover:text-purple-700 transition-colors">{t.issueName}</p>
                                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                                    {t.studentCode && <span className="font-mono font-bold text-orange-600 flex items-center gap-0.5"><Hash className="w-2.5 h-2.5" />{t.studentCode}</span>}
                                                    {room && <span className="text-purple-500 font-semibold flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{room}</span>}
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
                                        <button onClick={() => router.push(`/${locale}${ROUTES.IT_SUPPORT_TICKETS}`)}
                                            className="text-xs text-purple-500 font-bold hover:text-purple-700 flex items-center gap-1 mx-auto">
                                            Xem thêm {activeTickets.length - 8} ticket <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right panel: solved + quick stats */}
                    <div className="xl:col-span-2 flex flex-col gap-5">
                        {/* Recently solved */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex-1">
                            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 to-white">
                                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                    <h2 className="font-black text-slate-900 text-sm">Vừa hoàn thành</h2>
                                    <p className="text-[10px] text-slate-400">Ticket đã xử lý gần đây</p>
                                </div>
                            </div>
                            {solvedTickets.length === 0 ? (
                                <div className="py-10 flex flex-col items-center gap-2">
                                    <p className="text-xs text-slate-300 font-medium">Chưa có ticket nào hoàn thành</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {solvedTickets.map(t => (
                                        <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-700 truncate">{t.issueName}</p>
                                                {(t.techNote || t.resolveNote) && (
                                                    <p className="text-[10px] text-slate-400 truncate italic">
                                                        {t.techNote || t.resolveNote}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="text-[9px] text-slate-300 shrink-0">{format(new Date(t.updatedAt), "HH:mm")}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Activity summary card */}
                        <div className="bg-gradient-to-br from-purple-600 to-violet-700 rounded-2xl p-5 relative overflow-hidden">
                            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/5 blur-xl" />
                            <div className="relative">
                                <p className="text-purple-200 text-xs font-semibold mb-3 uppercase tracking-wider">Tổng quan hoạt động</p>
                                <div className="space-y-2.5">
                                    {[
                                        { label: "Tỉ lệ hoàn thành", val: tickets.length ? `${Math.round((tickets.filter(t => t.status === "SOLVED").length / tickets.length) * 100)}%` : "—", icon: TrendingUp },
                                        { label: "Ticket khẩn cấp", val: `${urgent} chờ`, icon: AlertCircle },
                                        { label: "Đang xử lý", val: `${inProgress} ticket`, icon: Activity },
                                    ].map(({ label, val, icon: Icon }) => (
                                        <div key={label} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Icon className="w-3.5 h-3.5 text-purple-300" />
                                                <p className="text-purple-200 text-xs">{label}</p>
                                            </div>
                                            <p className="text-white font-black text-sm">{val}</p>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => router.push(`/${locale}${ROUTES.IT_SUPPORT_TICKETS}`)}
                                    className="mt-4 w-full flex items-center justify-center gap-2 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-white text-xs font-bold transition-colors border border-white/20"
                                >
                                    Xem toàn bộ ticket <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
