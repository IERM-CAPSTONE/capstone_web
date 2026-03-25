"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/layouts/sidebar";
import { Header } from "@/components/layouts/header";
import { Ticket, AlertTriangle } from "lucide-react";
import { useCheckAuth } from "@/hooks/use-check-auth";
import { DashboardLoadingSkeleton } from "@/components/ui/page-loading";
import { useSocket } from "@/hooks/use-socket";
import { useAuthStore } from "@/store/auth-store";
import { ROUTES } from "@/lib/constants/routes";
import { toast } from "sonner";

export default function ExamOfficerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isLoading, isAuthenticated, user } = useCheckAuth({
        redirectIfNotAuthenticated: true
    });

    const allowedRoles = ["admin", "exam_officer"];

    if (isLoading || !isAuthenticated || (user && !allowedRoles.includes(user.role))) {
        return <DashboardLoadingSkeleton />;
    }

    return (
        <ExamOfficerContent>{children}</ExamOfficerContent>
    );
}

// ─── Notification sound (Web Audio API) ─────────────────────────────────────
function makeBeepWav(freqs: number[], durationSec = 0.14, sampleRate = 22050): string {
    const chunkSamples = Math.floor(sampleRate * durationSec);
    const numSamples = chunkSamples * freqs.length;
    const buf = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buf);
    const write = (off: number, val: number, bytes: number) => {
        for (let i = 0; i < bytes; i++) view.setUint8(off + i, (val >> (8 * i)) & 0xff);
    };
    [0x52, 0x49, 0x46, 0x46].forEach((b, i) => view.setUint8(i, b));
    write(4, 36 + numSamples * 2, 4);
    [0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20].forEach((b, i) => view.setUint8(8 + i, b));
    write(16, 16, 4); write(20, 1, 2); write(22, 1, 2);
    write(24, sampleRate, 4); write(28, sampleRate * 2, 4); write(32, 2, 2); write(34, 16, 2);
    [0x64, 0x61, 0x74, 0x61].forEach((b, i) => view.setUint8(36 + i, b));
    write(40, numSamples * 2, 4);
    freqs.forEach((freq, fi) => {
        for (let i = 0; i < chunkSamples; i++) {
            const t = i / sampleRate;
            const s = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 8) * 0.4 * 32767;
            view.setInt16(44 + (fi * chunkSamples + i) * 2, s, true);
        }
    });
    const bytes = new Uint8Array(buf); let bin = '';
    bytes.forEach(b => bin += String.fromCharCode(b));
    return 'data:audio/wav;base64,' + btoa(bin);
}
let _ticketSound: string | null = null;
function playTicketSound() {
    try {
        if (!_ticketSound) _ticketSound = makeBeepWav([880, 1100]);
        const audio = new Audio(_ticketSound);
        audio.volume = 0.5;
        audio.play().catch(() => { });
    } catch { }
}

// ─── Main content with global ticket listener ────────────────────────────────
function ExamOfficerContent({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { socket, isConnected, joinRoom } = useSocket();
    const user = useAuthStore((s) => s.user);
    const params = useParams();
    const locale = (params?.locale as string) || "vi";
    const anomalyThrottleRef = useRef<Map<string, number>>(new Map());

    // i18n strings for toast notifications (avoid hook for stability)
    const isVI = locale === "vi";
    const L = {
        newTicketFrom: isVI ? "Ticket mới từ" : "New ticket from",
        newTicket:     isVI ? "Ticket mới" : "New ticket",
        defaultReporter: isVI ? "Giám thị" : "Proctor",
        clickToProcess:  isVI ? "Nhấn để xử lý" : "Click to handle",
        processNow:      isVI ? "Xử lý ngay" : "Handle now",
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

    // Join socket room so backend can sendToUser(userId, ...) and sendToCampus(campus, ...)
    // Trigger when: user data loads, socket connects, or socket instance changes
    useEffect(() => {
        if (user?.id && (isConnected || socket?.connected)) {
            joinRoom(user.id, user.campus ?? undefined);
        }
    }, [isConnected, socket, user?.id, user?.campus, joinRoom]);

    const navigateToTickets = useCallback(() => {
        router.push(`/${locale}${ROUTES.EXAM_OFFICER_TICKETS}`);
    }, [router, locale]);

    const navigateToMonitor = useCallback(() => {
        router.push(`/${locale}${ROUTES.EXAM_OFFICER_MONITS}`);
    }, [router, locale]);

    useEffect(() => {
        if (!socket) return;

        const handleNewTicket = (payload: { ticket: any; reporter?: any }) => {
            // 1. Play alert sound
            playTicketSound();

            // 2. Show persistent clickable toast
            const reporterName = payload.reporter?.fullName ?? L.defaultReporter;
            const issueName = resolveIssue(payload.ticket?.issueName ?? "") || L.newTicket;
            const studentCode = payload.ticket?.studentCode;
            const roomNumber = payload.ticket?.session?.examRoom?.roomNumber
                ?? payload.ticket?.session?.roomNumber;

            toast(
                <div className="flex items-start gap-3 cursor-pointer w-full" onClick={navigateToTickets}>
                    <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                        <Ticket className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900">🎫 {L.newTicketFrom} {reporterName}</p>
                        <p className="text-xs text-slate-600 truncate mt-0.5">{issueName}</p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                            {studentCode && <span className="font-mono font-bold text-orange-600">{studentCode}</span>}
                            {roomNumber && <span className="text-blue-600">📍 {roomNumber}</span>}
                        </div>
                        <p className="text-[11px] text-orange-500 font-semibold mt-1">{L.clickToProcess} →</p>
                    </div>
                </div>,
                {
                    duration: 12000,
                    style: {
                        padding: "12px",
                        borderLeft: "4px solid #f97316",
                        cursor: "pointer",
                    },
                    action: {
                        label: L.processNow,
                        onClick: navigateToTickets,
                    },
                }
            );
        };

        const handleStudentAnomaly = (payload: any) => {
            const key = `${payload?.eventType || 'student_anomaly'}:${payload?.examSessionId || ''}:${payload?.studentId || ''}`;
            const now = Date.now();
            const lastTime = anomalyThrottleRef.current.get(key) ?? 0;
            // Suppress duplicate anomaly notifications in a short window.
            if (now - lastTime < 10000) return;
            anomalyThrottleRef.current.set(key, now);

            playTicketSound();
            toast(
                <div className="flex items-start gap-3 cursor-pointer w-full" onClick={navigateToMonitor}>
                    <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900">Student anomaly detected</p>
                        <p className="text-xs text-slate-600 truncate mt-0.5">
                            {payload?.studentName || "Unknown student"} {payload?.studentCode ? `(${payload.studentCode})` : ""}
                        </p>
                    </div>
                </div>,
                {
                    duration: 9000,
                    action: {
                        label: "Open Monitor",
                        onClick: navigateToMonitor,
                    },
                }
            );
        };

        const handleBroadcastSent = (payload: any) => {
            toast(
                <div className="flex items-start gap-3 cursor-pointer w-full" onClick={navigateToMonitor}>
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900">Broadcast sent</p>
                        <p className="text-xs text-slate-600 truncate mt-0.5">{payload?.title || 'Official Announcement'}</p>
                        <p className="text-[11px] text-slate-500 mt-1 truncate">{payload?.message || ''}</p>
                    </div>
                </div>,
                {
                    duration: 9000,
                    action: {
                        label: 'Open Monitor',
                        onClick: navigateToMonitor,
                    },
                }
            );
        };

        socket.on("ticket:created", handleNewTicket);
        socket.on("monitor:student_anomaly", handleStudentAnomaly);
        socket.on("monitor:broadcast_sent", handleBroadcastSent);

        return () => {
            socket.off("ticket:created", handleNewTicket);
            socket.off("monitor:student_anomaly", handleStudentAnomaly);
            socket.off("monitor:broadcast_sent", handleBroadcastSent);
        };
    }, [socket, navigateToTickets, navigateToMonitor]);

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
                    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <div>
                            © 2026 FPT University - Intelligent Examination Room Management System
                        </div>
                        <div>
                            Version 1.0.0
                        </div>
                    </footer>
                </main>
            </div>
        </div>
    );
}
