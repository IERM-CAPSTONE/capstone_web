"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layouts/sidebar";
import { Header } from "@/components/layouts/header";
import { CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useCheckAuth } from "@/hooks/use-check-auth";
import { DashboardLoadingSkeleton } from "@/components/ui/page-loading";

export default function ExamOfficerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Sử dụng hook để kiểm tra auth, redirect về login nếu chưa đăng nhập
    const { isLoading, isAuthenticated, user } = useCheckAuth({
        redirectIfNotAuthenticated: true
    });

    const allowedRoles = ["admin", "exam_officer"]; // Only admin and exam_officer should access this area

    if (isLoading || !isAuthenticated || (user && !allowedRoles.includes(user.role))) {
        return <DashboardLoadingSkeleton />;
    }

    return (
        <ExamOfficerContent>{children}</ExamOfficerContent>
    );
}

function ExamOfficerContent({ children }: { children: React.ReactNode }) {
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'info' } | null>(null);

    return (
        <div className="flex h-screen flex-col overflow-hidden">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
                    <div className="flex-1 overflow-y-auto p-0 md:p-6">
                        {children}
                    </div>

                    {/* Global Notification */}
                    {notification && (
                        <div className={cn(
                            "fixed top-6 right-6 z-[9999] animate-in fade-in slide-in-from-right-4 duration-300",
                            "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border",
                            notification.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-blue-50 border-blue-100 text-blue-800"
                        )}>
                            {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Info className="h-5 w-5 text-blue-600" />}
                            <span className="text-sm font-semibold">{notification.message}</span>
                            <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-70">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}

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
