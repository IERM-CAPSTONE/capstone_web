"use client";

import { useEffect, useCallback } from "react";
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
    } catch {
        // fail silently
    }
}

// ─── Proctor content with global ticket:resolved listener ─────────────────────
function ProctorContent({ children }: { children: React.ReactNode }) {
    const { socket } = useSocket();
    const user = useAuthStore((s) => s.user);

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
                        <p className="text-sm font-bold text-slate-900">✅ Ticket đã được xử lý</p>
                        <p className="text-xs text-slate-600 mt-0.5 truncate">{payload.issueName}</p>
                        {payload.studentCode && (
                            <p className="text-xs font-mono font-bold text-orange-600 mt-1"># {payload.studentCode}</p>
                        )}
                        {payload.resolveNote && (
                            <p className="text-xs text-green-700 mt-1 italic">"{payload.resolveNote}"</p>
                        )}
                        <p className="text-[11px] text-slate-400 mt-1">Bởi: {payload.officerName}</p>
                    </div>
                </div>,
                {
                    duration: 10000,
                    style: { borderLeft: "4px solid #22c55e" },
                }
            );
        };

        socket.on("ticket:resolved", handleResolved);
        return () => { socket.off("ticket:resolved", handleResolved); };
    }, [socket, user?.id]);

    return (
        <div className="flex h-screen flex-col overflow-hidden">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
                    <div className="flex-1 overflow-y-auto p-0 md:p-6">
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
