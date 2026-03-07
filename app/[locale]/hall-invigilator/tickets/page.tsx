"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
    Ticket, RefreshCw, Loader2, CheckCircle2, Clock,
    Hash, MapPin, X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ticketsApi, TicketFull } from "@/lib/api/tickets";
import { useSocket } from "@/hooks/use-socket";
import { toast } from "sonner";

const STATUS_COLOR: Record<string, string> = {
    OPEN: "bg-orange-100 text-orange-700 border border-orange-200",
    IN_PROGRESS: "bg-blue-100 text-blue-700 border border-blue-200",
    SOLVED: "bg-green-100 text-green-700 border border-green-200",
    CLOSED: "bg-slate-100 text-slate-500 border border-slate-200",
};
const STATUS_VI: Record<string, string> = {
    OPEN: "Mới", IN_PROGRESS: "Đang xử lý", SOLVED: "Đã xử lý", CLOSED: "Đóng",
};
const PRIORITY_COLOR: Record<string, string> = {
    Low: "bg-blue-50 text-blue-600 border-blue-200",
    Medium: "bg-yellow-50 text-yellow-600 border-yellow-200",
    High: "bg-orange-50 text-orange-600 border-orange-200",
    Urgent: "bg-red-50 text-red-600 border-red-200",
};

const FILTER_TABS = [
    { key: "all", label: "Tất cả" },
    { key: "IN_PROGRESS", label: "Đang xử lý" },
    { key: "OPEN", label: "Chờ xử lý" },
    { key: "SOLVED", label: "Đã xong" },
];

// ─── Resolve Modal ─────────────────────────────────────────────────────────────
function ResolveModal({
    ticket,
    onClose,
    onConfirm,
}: {
    ticket: TicketFull;
    onClose: () => void;
    onConfirm: (note: string) => Promise<void>;
}) {
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await onConfirm(note);
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        Xác nhận đã xử lý xong
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="px-5 py-4 space-y-3">
                    <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-sm font-semibold text-slate-800">{ticket.issueName}</p>
                        {ticket.studentCode && (
                            <p className="text-xs font-mono font-bold text-orange-600 mt-1">
                                <Hash className="w-3 h-3 inline mr-1" />{ticket.studentCode}
                            </p>
                        )}
                        {ticket.session?.examRoom?.roomNumber && (
                            <p className="text-xs text-blue-600 font-semibold mt-1">
                                <MapPin className="w-3 h-3 inline mr-1" />Phòng {ticket.session.examRoom.roomNumber}
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Ghi chú <span className="text-slate-400 font-normal">(tuỳ chọn)</span>
                        </label>
                        <textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="Mô tả cách bạn đã xử lý vấn đề..."
                            rows={3}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-300 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                        />
                    </div>
                </div>
                <div className="flex gap-2 px-5 pb-5">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                        Huỷ
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Xác nhận
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function HallInvigilatorTicketsPage() {
    const [tickets, setTickets] = useState<TicketFull[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [imgOpen, setImgOpen] = useState<string | null>(null);
    const [resolvingTicket, setResolvingTicket] = useState<TicketFull | null>(null);
    const { socket } = useSocket();

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

    // Real-time: refresh list khi có ticket mới được giao
    useEffect(() => {
        if (!socket) return;
        const myUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
        const handle = (payload: { assigneeId?: string }) => {
            if (payload.assigneeId && myUserId && payload.assigneeId !== myUserId) return;
            fetchTickets();
        };
        socket.on("ticket:assigned", handle);
        return () => { socket.off("ticket:assigned", handle); };
    }, [socket, fetchTickets]);

    const handleResolve = async (note: string) => {
        if (!resolvingTicket) return;
        try {
            await ticketsApi.process(resolvingTicket.id, {
                action: "resolve",
                resolveNote: note || "Đã xử lý",
            });
            toast.success("Ticket đã được đánh dấu hoàn thành!");
            setTickets(prev => prev.map(t =>
                t.id === resolvingTicket.id
                    ? { ...t, status: "SOLVED" as any, resolveNote: note }
                    : t
            ));
        } catch {
            toast.error("Không thể cập nhật ticket");
            throw new Error();
        }
    };

    const filtered = tickets.filter(t =>
        filter === "all" ? true : t.status === filter
    );
    const counts: Record<string, number> = {
        all: tickets.length,
        IN_PROGRESS: tickets.filter(t => t.status === "IN_PROGRESS").length,
        OPEN: tickets.filter(t => t.status === "OPEN").length,
        SOLVED: tickets.filter(t => t.status === "SOLVED").length,
    };

    return (
        <div className="min-h-full p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Ticket className="w-6 h-6 text-blue-500" />
                        Ticket được giao cho tôi
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">Các ticket Khảo thí đã giao để bạn xử lý</p>
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
                                ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        )}
                    >
                        {tab.label}
                        <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded-full font-bold",
                            filter === tab.key ? "bg-blue-400 text-white" : "bg-slate-100 text-slate-500"
                        )}>
                            {counts[tab.key] ?? 0}
                        </span>
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                    <span className="text-sm">Đang tải...</span>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                    <CheckCircle2 className="w-12 h-12 text-slate-200" />
                    <p className="text-sm font-medium">Không có ticket nào</p>
                    <p className="text-xs text-slate-300">Khảo thí chưa giao ticket cho bạn</p>
                </div>
            ) : (
                <div className="grid gap-3 max-w-3xl">
                    {filtered.map(ticket => {
                        const roomNumber = ticket.session?.examRoom?.roomNumber ?? ticket.session?.roomNumber;
                        const canResolve = ticket.status === "OPEN" || ticket.status === "IN_PROGRESS";
                        return (
                            <div
                                key={ticket.id}
                                className={cn(
                                    "bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow",
                                    ticket.status === "IN_PROGRESS" ? "border-blue-200" : "border-slate-200"
                                )}
                            >
                                {/* Title + badges */}
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
                                    {ticket.reporter?.fullName && (
                                        <span className="font-semibold text-slate-600">
                                            Giám thị: {ticket.reporter.fullName}
                                        </span>
                                    )}
                                    {ticket.session?.subjectCode && (
                                        <span className="font-mono font-semibold text-slate-600">
                                            {ticket.session.subjectCode}
                                        </span>
                                    )}
                                    {roomNumber && (
                                        <span className="flex items-center gap-1 text-blue-600 font-semibold">
                                            <MapPin className="w-3 h-3" /> {roomNumber}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {format(new Date(ticket.createdAt), "dd/MM HH:mm")}
                                    </span>
                                </div>

                                {/* Description */}
                                {ticket.description && (
                                    <p className="mt-1.5 text-xs text-slate-500 italic">{ticket.description}</p>
                                )}

                                {/* Resolve note from Exam Officer */}
                                {ticket.resolveNote && (
                                    <div className="mt-2 flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[11px] font-semibold text-green-700 uppercase tracking-wide mb-0.5">Ghi chú từ Khảo thí</p>
                                            <p className="text-xs text-green-800">{ticket.resolveNote}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Attachment */}
                                {ticket.attachment && (
                                    <div className="mt-2">
                                        <img
                                            src={ticket.attachment}
                                            alt="evidence"
                                            onClick={() => setImgOpen(ticket.attachment!)}
                                            className="h-16 w-auto rounded-lg border border-slate-200 object-cover cursor-zoom-in hover:opacity-90"
                                        />
                                    </div>
                                )}

                                {/* ─── Resolve button ─── */}
                                {canResolve && (
                                    <div className="mt-3 pt-3 border-t border-slate-100">
                                        <button
                                            onClick={() => setResolvingTicket(ticket)}
                                            className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            Đã xử lý xong
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Resolve modal */}
            {resolvingTicket && (
                <ResolveModal
                    ticket={resolvingTicket}
                    onClose={() => setResolvingTicket(null)}
                    onConfirm={handleResolve}
                />
            )}

            {/* Full-screen image */}
            {imgOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
                    onClick={() => setImgOpen(null)}>
                    <img src={imgOpen} alt="attachment"
                        className="max-w-full max-h-[85vh] rounded-xl shadow-2xl" />
                </div>
            )}
        </div>
    );
}
