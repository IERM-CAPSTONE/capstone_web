"use client";

import { useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Sidebar } from "@/components/layouts/sidebar";
import { Header } from "@/components/layouts/header";
import { CheckCircle2 } from "lucide-react";
import { useCheckAuth } from "@/hooks/use-check-auth";
import { DashboardLoadingSkeleton } from "@/components/ui/page-loading";
import { useSocket } from "@/hooks/use-socket";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";

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
function ProctorContent({ children }: { children: React.ReactNode }) {
    const { socket, isConnected, joinRoom } = useSocket();
    const user = useAuthStore((s) => s.user);
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
    const resolveIssue = (raw: string) => {
        if (KNOWN_KEYS.includes(raw)) {
            const m = INCIDENT_MAP[raw];
            return m ? (isVI ? m.vi : m.en) : raw;
        }
        return raw;
    };

    useEffect(() => {
        if (!socket) return;

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
                            <p className="text-xs text-green-700 mt-1 italic">"{payload.resolveNote}"</p>
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
        return () => {
            socket.off("ticket:resolved", handleResolved);
            socket.off("ticket:updated", handleUpdated);
        };
    }, [socket, user?.id]);

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
