"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Search,
    X,
    User,
    Mail,
    Fingerprint,
    Loader2,
    Check,
} from "lucide-react";
import { useProctors } from "@/hooks/use-users";
import { useTranslations } from "next-intl";

interface AssignProctorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAssign: (proctorId: string) => void;
    currentProctorId?: string | null;
    isUpdating?: boolean;
}

export default function AssignProctorDialog({
    isOpen,
    onClose,
    onAssign,
    currentProctorId,
    isUpdating = false,
}: AssignProctorDialogProps) {
    const t = useTranslations("Dashboard.examOfficer.detailSchedule");
    const commonT = useTranslations("Common");
    const [searchTerm, setSearchTerm] = useState("");

    const { data: proctorsData, isLoading } = useProctors({
        isActive: true,
        search: searchTerm,
    });

    const proctors = proctorsData?.data || [];

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
            <Card className="w-full max-w-2xl border-none shadow-xl max-h-[90vh] flex flex-col">
                <CardContent className="p-0 flex flex-col h-full overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <User className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{t("assignProctor")}</h3>
                                <p className="text-sm text-slate-500">{t("selectProctor")}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="p-6 bg-slate-50 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name, email or code..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                            />
                        </div>
                    </div>

                    {/* Proctor List */}
                    <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                <p className="text-sm text-slate-500">{commonT("loading")}</p>
                            </div>
                        ) : proctors.length > 0 ? (
                            <div className="space-y-1">
                                {proctors.map((proctor) => (
                                    <button
                                        key={proctor.id}
                                        onClick={() => onAssign(proctor.id)}
                                        disabled={isUpdating}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl transition-all group ${currentProctorId === proctor.id
                                                ? "bg-blue-50 border-blue-100 ring-1 ring-blue-100"
                                                : "hover:bg-slate-50 border-transparent border"
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold ${currentProctorId === proctor.id
                                                    ? "bg-blue-500 text-white"
                                                    : "bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600"
                                                }`}>
                                                {proctor.fullName ? proctor.fullName.charAt(0) : "?"}
                                            </div>
                                            <div className="text-left">
                                                <h4 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                                                    {proctor.fullName || "Unnamed Proctor"}
                                                </h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <Mail className="h-3 w-3" />
                                                        {proctor.email || "No email"}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <Fingerprint className="h-3 w-3" />
                                                        {proctor.code || "No code"}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {currentProctorId === proctor.id && (
                                            <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                                                <Check className="h-4 w-4 text-white" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <div className="bg-slate-50 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <User className="h-6 w-6 text-slate-300" />
                                </div>
                                <p className="text-slate-500 text-sm">No proctors found matching your search</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 sticky bottom-0">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isUpdating}
                        >
                            {commonT("cancel") || "Cancel"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>,
        document.body
    );
}
