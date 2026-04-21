"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layouts/sidebar";
import { Header } from "@/components/layouts/header";
import { CheckCircle2 } from "lucide-react";
import { useCheckAuth, getCurrentLocale } from "@/hooks/use-check-auth";
import { DashboardLoadingSkeleton } from "@/components/ui/page-loading";
import { useSocket } from "@/hooks/use-socket";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { ROUTES } from "@/lib/constants/routes";

const ALLOWED_ROLES = ["admin", "hall_invigilator", "exam_officer"];

export default function HallInvigilatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isLoading, user } = useCheckAuth({ redirectIfNotAuthenticated: true });
    const router = useRouter();

    // If loading, show skeleton
    if (isLoading) return <DashboardLoadingSkeleton />;

    // If user loaded but wrong role, redirect them to their own dashboard
    if (user && !ALLOWED_ROLES.includes(user.role)) {
        const locale = getCurrentLocale();
        if (user.role === "proctor") router.replace(`/${locale}${ROUTES.DASHBOARD_PROCTOR}`);
        else if (user.role === "exam_officer") router.replace(`/${locale}${ROUTES.DASHBOARD_EXAM_OFFICER}`);
        else router.replace(`/${locale}/auth/login`);
        return <DashboardLoadingSkeleton />;
    }

    return <HallInvigilatorContent>{children}</HallInvigilatorContent>;
}

// ─── Sound ────────────────────────────────────────────────────────────────────
function makeBeepWav(freqs: number[], dur = 0.14, sr = 22050): string {
    const cs = Math.floor(sr * dur);
    const ns = cs * freqs.length;
    const buf = new ArrayBuffer(44 + ns * 2);
    const v = new DataView(buf);
    const w = (o: number, val: number, b: number) => { for (let i = 0; i < b; i++) v.setUint8(o + i, (val >> (8 * i)) & 0xff); };
    [0x52, 0x49, 0x46, 0x46].forEach((b, i) => v.setUint8(i, b));
    w(4, 36 + ns * 2, 4);
    [0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20].forEach((b, i) => v.setUint8(8 + i, b));
    w(16, 16, 4); w(20, 1, 2); w(22, 1, 2);
    w(24, sr, 4); w(28, sr * 2, 4); w(32, 2, 2); w(34, 16, 2);
    [0x64, 0x61, 0x74, 0x61].forEach((b, i) => v.setUint8(36 + i, b));
    w(40, ns * 2, 4);
    freqs.forEach((freq, fi) => {
        for (let i = 0; i < cs; i++) {
            const s = Math.sin(2 * Math.PI * freq * i / sr) * Math.exp(-i / sr * 8) * 0.4 * 32767;
            v.setInt16(44 + (fi * cs + i) * 2, s, true);
        }
    });
    const bytes = new Uint8Array(buf); let bin = "";
    bytes.forEach(b => bin += String.fromCharCode(b));
    return "data:audio/wav;base64," + btoa(bin);
}
let _snd: string | null = null;
function playAssignedSound() {
    try {
        if (!_snd) _snd = makeBeepWav([660, 880, 1100]);
        const a = new Audio(_snd); a.volume = 0.45; a.play().catch(() => { });
    } catch { }
}

// ─── Content with global ticket:resolved listener ─────────────────────────────
function HallInvigilatorContent({ children }: { children: React.ReactNode }) {
    const { socket, isConnected, joinRoom } = useSocket();
    const user = useAuthStore((s) => s.user);

    // Join room whenever socket connects (or reconnects) and user is available
    useEffect(() => {
        if (isConnected && user?.id) {
            joinRoom(user.id);
        }
    }, [isConnected, user?.id, joinRoom]);

    useEffect(() => {
        if (!socket) return;

        const myUserId = user?.id || (typeof window !== 'undefined' ? localStorage.getItem('userId') : null);

        const handleAssigned = (payload: {
            ticketId: string;
            assigneeId: string;
            issueName: string;
            studentCode?: string | null;
            officerName: string;
            reporterId: string;
        }) => {
            // Only react if this event is for this user
            if (payload.assigneeId !== myUserId) return;
            playAssignedSound();
            toast(
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">📋 Ticket được giao cho bạn</p>
                        <p className="text-xs text-slate-600 mt-0.5 truncate">{payload.issueName}</p>
                        {payload.studentCode && (
                            <p className="text-xs font-mono font-bold text-orange-600 mt-1"># {payload.studentCode}</p>
                        )}
                        <p className="text-[11px] text-slate-400 mt-1">Từ: {payload.officerName}</p>
                    </div>
                </div>,
                {
                    duration: 12000,
                    style: { borderLeft: "4px solid #3b82f6" },
                }
            );
        };

        socket.on("ticket:assigned", handleAssigned);
        // Also dispatch a plain window event so the tickets page can refresh without extra socket listeners
        const forwardRefresh = () => window.dispatchEvent(new CustomEvent("tickets:refresh"));
        socket.on("ticket:assigned", forwardRefresh);
        return () => {
            socket.off("ticket:assigned", handleAssigned);
            socket.off("ticket:assigned", forwardRefresh);
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
                    <footer className="border-t border-gray-200 bg-white px-6 py-4 text-center text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                        © {new Date().getFullYear()} Online Exam Proctor System. All rights reserved.
                    </footer>
                </main>
            </div>
        </div>
    );
}
