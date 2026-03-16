"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
    Ticket, RefreshCw, Loader2, Clock,
    CheckCircle2, AlertCircle, Hash, MapPin, User, X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ticketsApi, TicketFull, TicketStatus } from "@/lib/api/tickets";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
    OPEN: "bg-orange-100 text-orange-700 border border-orange-200",
    IN_PROGRESS: "bg-blue-100 text-blue-700 border border-blue-200",
    SOLVED: "bg-green-100 text-green-700 border border-green-200",
    CLOSED: "bg-slate-100 text-slate-500 border border-slate-200",
};
const STATUS_VI: Record<string, string> = {
    OPEN: "Mới",
    IN_PROGRESS: "Đang xử lý",
    SOLVED: "Đã xử lý",
    CLOSED: "Đóng",
};
const PRIORITY_COLOR: Record<string, string> = {
    Low: "bg-blue-50 text-blue-600 border-blue-200",
    Medium: "bg-yellow-50 text-yellow-600 border-yellow-200",
    High: "bg-orange-50 text-orange-600 border-orange-200",
    Urgent: "bg-red-50 text-red-600 border-red-200",
};

const FILTER_TABS = [
    { key: "all", label: "Tất cả" },
    { key: "OPEN", label: "Mới" },
    { key: "IN_PROGRESS", label: "Đang xử lý" },
    { key: "SOLVED", label: "Đã xử lý" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProctorTicketsPage() {
    const [tickets, setTickets] = useState<TicketFull[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [imgOpen, setImgOpen] = useState<string | null>(null);

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            const data = await ticketsApi.list();
            setTickets(data);
        } catch {
            toast.error("Không thể tải danh sách ticket");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    const filtered = tickets.filter(t =>
        filter === "all" ? true : t.status === filter
    );

    const counts: Record<string, number> = {
        all: tickets.length,
        OPEN: tickets.filter(t => t.status === "OPEN").length,
        IN_PROGRESS: tickets.filter(t => t.status === "IN_PROGRESS").length,
        SOLVED: tickets.filter(t => t.status === "SOLVED").length,
    };

    return (
        <div className="min-h-full p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Ticket className="w-6 h-6 text-orange-500" />
                        Ticket của tôi
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Danh sách các ticket bạn đã tạo</p>
                </div>
                <button
                    onClick={fetchTickets}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Làm mới
                </button>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                {FILTER_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={cn(
                            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all",
                            filter === tab.key
                                ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        )}
                    >
                        {tab.label}
                        <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded-full font-bold",
                            filter === tab.key ? "bg-orange-400 text-white" : "bg-slate-100 text-slate-500"
                        )}>
                            {counts[tab.key] ?? 0}
                        </span>
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
                    <span className="text-sm">Đang tải...</span>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                    <Ticket className="w-12 h-12 text-slate-200" />
                    <p className="text-sm font-medium">Không có ticket nào</p>
                </div>
            ) : (
                <div className="grid gap-3 max-w-3xl">
                    {filtered.map(ticket => {
                        const roomNumber = ticket.session?.examRoom?.roomNumber ?? ticket.session?.roomNumber;
                        return (
                            <div
                                key={ticket.id}
                                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                            >
                                {/* Title row */}
                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-slate-900">{ticket.issueName}</span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", PRIORITY_COLOR[ticket.priority] ?? "bg-slate-100 text-slate-600 border-slate-200")}>
                                            {ticket.priority}
                                        </span>
                                        <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-semibold", STATUS_COLOR[ticket.status] ?? "bg-slate-100 text-slate-500")}>
                                            {STATUS_VI[ticket.status] ?? ticket.status}
                                        </span>
                                    </div>
                                </div>

                                {/* MSSV */}
                                {ticket.studentCode && (
                                    <div className="mt-1.5 flex items-center gap-1.5">
                                        <Hash className="w-3.5 h-3.5 text-orange-500" />
                                        <span className="text-sm font-bold text-orange-600 font-mono tracking-wide">{ticket.studentCode}</span>
                                    </div>
                                )}

                                {/* Meta */}
                                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
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
                                        {format(new Date(ticket.createdAt), "dd/MM/yyyy HH:mm")}
                                    </span>
                                </div>

                                {/* Description */}
                                {ticket.description && (
                                    <p className="mt-1.5 text-xs text-slate-500">{ticket.description}</p>
                                )}

                                {/* Resolve note */}
                                {ticket.resolveNote && (
                                    <div className="mt-2 flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[11px] font-semibold text-green-700 uppercase tracking-wide mb-0.5">Ghi chú xử lý</p>
                                            <p className="text-xs text-green-800">{ticket.resolveNote}</p>
                                            {ticket.assignee && (
                                                <p className="text-[11px] text-green-600 mt-0.5">Bởi: {ticket.assignee.fullName}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Attachment thumbnail */}
                                {ticket.attachment && (
                                    <div className="mt-2">
                                        <img
                                            src={ticket.attachment}
                                            alt="evidence"
                                            onClick={() => setImgOpen(ticket.attachment!)}
                                            className="h-16 w-auto rounded-lg border border-slate-200 object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Fullscreen image */}
            {imgOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
                    onClick={() => setImgOpen(null)}
                >
                    <div className="relative max-w-3xl max-h-[85vh]">
                        <img src={imgOpen} alt="attachment" className="max-w-full max-h-[85vh] rounded-xl shadow-2xl" />
                        <button className="absolute top-3 right-3 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
