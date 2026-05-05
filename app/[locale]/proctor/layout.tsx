"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Sidebar } from "@/components/layouts/sidebar";
import { Header } from "@/components/layouts/header";
import { CheckCircle2, Megaphone } from "lucide-react";
import { useCheckAuth } from "@/hooks/use-check-auth";
import { DashboardLoadingSkeleton } from "@/components/ui/page-loading";
import { useSocket } from "@/hooks/use-socket";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface ProctorApplicationSocketPayload {
    id?: string;
    roomNumber?: string | null;
    preferredDate?: string | null;
    notes?: string | null;
    status?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";
}

export default function ProctorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isLoading, isAuthenticated, user } = useCheckAuth({
        redirectIfNotAuthenticated: true
    });

    const allowedRoles = ["admin", "proctor", "exam_officer"];

    if (isLoading || !isAuthenticated || (user && !allowedRoles.includes(user.role))) {
        return <DashboardLoadingSkeleton />;
    }

    return (
        <ProctorContent>{children}</ProctorContent>
    );
}

// ─── Notification sound ───────────────────────────────────────────────────────
// Pre-generate a tiny inline WAV (avoids AudioContext autoplay restriction)
function makeBeepWav(freqs: number[], durationSec = 0.12, sampleRate = 22050): string {
    const numSamples = Math.floor(sampleRate * durationSec * freqs.length);
    const buf = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buf);
    const write = (off: number, val: number, bytes: number) => {
        for (let i = 0; i < bytes; i++) view.setUint8(off + i, (val >> (8 * i)) & 0xff);
    };
    // RIFF header
    [0x52, 0x49, 0x46, 0x46].forEach((b, i) => view.setUint8(i, b));
    write(4, 36 + numSamples * 2, 4);
    [0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20].forEach((b, i) => view.setUint8(8 + i, b));
    write(16, 16, 4); write(20, 1, 2); write(22, 1, 2);
    write(24, sampleRate, 4); write(28, sampleRate * 2, 4); write(32, 2, 2); write(34, 16, 2);
    [0x64, 0x61, 0x74, 0x61].forEach((b, i) => view.setUint8(36 + i, b));
    write(40, numSamples * 2, 4);
    const chunkSamples = Math.floor(sampleRate * durationSec);
    freqs.forEach((freq, fi) => {
        for (let i = 0; i < chunkSamples; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 8);
            const sample = Math.sin(2 * Math.PI * freq * t) * envelope * 0.4 * 32767;
            view.setInt16(44 + (fi * chunkSamples + i) * 2, sample, true);
        }
    });
    const bytes = new Uint8Array(buf);
    let bin = '';
    bytes.forEach(b => bin += String.fromCharCode(b));
    return 'data:audio/wav;base64,' + btoa(bin);
}

let _resolvedSound: string | null = null;
function playResolvedSound() {
    try {
        if (!_resolvedSound) _resolvedSound = makeBeepWav([660, 880, 1100]);
        const audio = new Audio(_resolvedSound);
        audio.volume = 0.5;
        audio.play().catch(() => { });
    } catch { /* fail silently */ }
}

let _processingSound: string | null = null;
function playProcessingSound() {
    try {
        if (!_processingSound) _processingSound = makeBeepWav([440, 520], 0.1);
        const audio = new Audio(_processingSound);
        audio.volume = 0.4;
        audio.play().catch(() => { });
    } catch { /* fail silently */ }
}

// ─── Proctor content with global ticket:resolved listener ─────────────────────
/* eslint-disable react-hooks/exhaustive-deps */
function ProctorContent({ children }: { children: React.ReactNode }) {
    const { socket, isConnected, joinRoom } = useSocket();
    const user = useAuthStore((s) => s.user);
    const queryClient = useQueryClient();
    const params = useParams();
    const locale = (params?.locale as string) || "vi";

    // Join the socket room so backend sendToUser events are received
    useEffect(() => {
        if (!user?.id) return;
        joinRoom(user.id);
        const t = setTimeout(() => joinRoom(user.id), 500);
        return () => clearTimeout(t);
    }, [isConnected, user?.id, joinRoom]);

    const isVI = locale === "vi";
    const L = {
        ticketResolved: isVI ? "Ticket của bạn đã được xử lý" : "Ticket has been resolved",
        resolvedBy:     isVI ? "Bởi" : "By",
    };

    const KNOWN_KEYS = ["eosClientError","spinningScreen","needReassign","lostServerConn","networkError","cannotLogin","wrongExamCode","notInExamList"];
    const INCIDENT_MAP: Record<string, { vi: string; en: string }> = {
        eosClientError: { vi: "EOSClient / Phần mềm thi bị lỗi",  en: "EOSClient / Software Error" },
        spinningScreen: { vi: "Màn hình xoay liên tục",            en: "Spinning Screen / Loading" },
        needReassign:   { vi: "Cần reassign (đã đăng nhập rồi)",  en: "Need Reassign (Already Logged In)" },
        lostServerConn: { vi: "Mất kết nối server thi",            en: "Lost Server Connection" },
        networkError:   { vi: "Lỗi mạng / Không có mạng",          en: "Network Error" },
        cannotLogin:    { vi: "Không đăng nhập được",              en: "Cannot Log In" },
        wrongExamCode:  { vi: "Sai mã thi",                        en: "Wrong Exam Code" },
        notInExamList:  { vi: "Không có trong danh sách thi",      en: "Not In Exam List" },
    };
    useEffect(() => {
        if (!socket) return;

        const resolveIssue = (raw: string) => {
            if (KNOWN_KEYS.includes(raw)) {
                const m = INCIDENT_MAP[raw];
                return m ? (isVI ? m.vi : m.en) : raw;
            }
            return raw;
        };

        const handleResolved = (payload: {
            ticketId: string;
            issueName: string;
            studentCode: string | null;
            resolveNote: string;
            officerName: string;
            reporterId: string;
        }) => {
            // Only show notification to the reporter of this ticket
            if (payload.reporterId && user?.id && payload.reporterId !== user.id) return;

            playResolvedSound();

            toast.success(
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">✅ {L.ticketResolved}</p>
                        <p className="text-xs text-slate-600 mt-0.5 truncate">{resolveIssue(payload.issueName)}</p>
                        {payload.studentCode && (
                            <p className="text-xs font-mono font-bold text-orange-600 mt-1"># {payload.studentCode}</p>
                        )}
                        {payload.resolveNote && (
                            <p className="text-xs text-green-700 mt-1 italic">&quot;{payload.resolveNote}&quot;</p>
                        )}
                        <p className="text-[11px] text-slate-400 mt-1">{L.resolvedBy}: {payload.officerName}</p>
                    </div>
                </div>,
                {
                    duration: 10000,
                    style: { borderLeft: "4px solid #22c55e" },
                }
            );
        };

        socket.on("ticket:resolved", handleResolved);

        const handleUpdated = (payload: {
            ticketId: string;
            status: string;
            officerName?: string;
            issueName?: string;
            studentCode?: string | null;
            reporterId?: string;
        }) => {
            // Only show to the reporter of this ticket
            if (payload.reporterId && user?.id && payload.reporterId !== user.id) return;
            if (payload.status !== "IN_PROGRESS") return;

            const issueLabel = payload.issueName ? resolveIssue(payload.issueName) : "";
            playProcessingSound();
            toast.info(
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">
                            🔧 {isVI ? "Đang được xử lý" : "Being Processed"}
                        </p>
                        {issueLabel && <p className="text-xs text-slate-600 mt-0.5 truncate">{issueLabel}</p>}
                        {payload.studentCode && (
                            <p className="text-xs font-mono font-bold text-orange-600 mt-1"># {payload.studentCode}</p>
                        )}
                        {payload.officerName && (
                            <p className="text-[11px] text-slate-400 mt-1">{L.resolvedBy}: {payload.officerName}</p>
                        )}
                    </div>
                </div>,
                {
                    duration: 8000,
                    style: { borderLeft: "4px solid #3b82f6" },
                }
            );
        };

        socket.on("ticket:updated", handleUpdated);

        const handleNewProctorApplication = (payload: ProctorApplicationSocketPayload) => {
            // payload is ProctorApplicationResponse
            playProcessingSound();
            toast.success(
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                        <Megaphone className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">New proctor application</p>
                        <p className="text-xs text-slate-600 mt-0.5">{payload.roomNumber ? `Room ${payload.roomNumber}` : "Room TBA"} • {payload.preferredDate ? new Date(payload.preferredDate).toLocaleString() : "Date TBA"}</p>
                        {payload.notes && <p className="text-xs text-slate-500 mt-1 truncate">{payload.notes}</p>}
                    </div>
                </div>,
                { duration: 8000, style: { borderLeft: "4px solid #fb923c" } }
            );

            // Invalidate proctor applications queries so UI refreshes
            try { queryClient.invalidateQueries({ queryKey: ["proctor-applications"] }); } catch {}
        };

        const handleIncomingSwapRequest = (payload: ProctorApplicationSocketPayload) => {
            playProcessingSound();
            toast.success(
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                        <Megaphone className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">
                            {isVI ? "Bạn vừa nhận được đơn đổi lịch mới" : "You received a new swap request"}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">
                            {payload.roomNumber ? `Room ${payload.roomNumber}` : "Room TBA"} • {payload.preferredDate ? new Date(payload.preferredDate).toLocaleString() : "Date TBA"}
                        </p>
                        {payload.notes && <p className="text-xs text-slate-500 mt-1 truncate">{payload.notes}</p>}
                    </div>
                </div>,
                { duration: 8000, style: { borderLeft: "4px solid #fb923c" } }
            );

            try { queryClient.invalidateQueries({ queryKey: ["proctor-applications"] }); } catch {}
        };

        const handleApplicationUpdated = (payload: ProctorApplicationSocketPayload) => {
            try { queryClient.invalidateQueries({ queryKey: ["proctor-applications"] }); } catch {}

            if (!payload.status) return;

            if (payload.status === "APPROVED") {
                playResolvedSound();
                toast.success(isVI ? "Đơn đổi lịch đã được chấp nhận." : "The swap request was approved.");
                return;
            }

            if (payload.status === "REJECTED") {
                playProcessingSound();
                toast.error(isVI ? "Đơn đổi lịch đã bị từ chối." : "The swap request was declined.");
                return;
            }

            if (payload.status === "CANCELED") {
                toast.info(isVI ? "Đơn đổi lịch đã bị hủy." : "The swap request was canceled.");
            }
        };

        socket.on('proctor:application:created', handleNewProctorApplication);
        socket.on("proctor:swap-request:created", handleIncomingSwapRequest);
        socket.on("proctor:application:updated", handleApplicationUpdated);

        const handleBroadcastAnnouncement = (payload: {
            title?: string;
            message?: string;
            type?: string;
            sentAt?: string;
        }) => {
            playProcessingSound();
            toast.info(
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <Megaphone className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">
                            {payload.title || (isVI ? "Thong bao" : "Announcement")}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">{payload.message || ""}</p>
                    </div>
                </div>,
                {
                    duration: 10000,
                    style: { borderLeft: "4px solid #f59e0b" },
                }
            );
        };

        socket.on("broadcast_announcement", handleBroadcastAnnouncement);
        return () => {
            socket.off("ticket:resolved", handleResolved);
            socket.off("ticket:updated", handleUpdated);
            socket.off('proctor:application:created', handleNewProctorApplication);
            socket.off("proctor:swap-request:created", handleIncomingSwapRequest);
            socket.off("proctor:application:updated", handleApplicationUpdated);
            socket.off("broadcast_announcement", handleBroadcastAnnouncement);
        };
    }, [INCIDENT_MAP, KNOWN_KEYS, L.resolvedBy, L.ticketResolved, isVI, queryClient, socket, user?.id]);

    return (
        <div className="flex h-screen flex-col overflow-hidden">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
                    <div className="flex-1 overflow-y-auto p-0 md:p-5">
                        {children}
                    </div>

                    {/* Footer */}
                    <footer className="border-t border-gray-200 bg-white px-6 py-4 text-center text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                        © {new Date().getFullYear()} Online Exam Proctor System. All rights reserved.
                    </footer>
                </main>
            </div>
        </div>
    );
}
/* eslint-enable react-hooks/exhaustive-deps */
