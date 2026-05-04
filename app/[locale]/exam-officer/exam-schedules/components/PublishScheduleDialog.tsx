"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, X, Building2, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { CAMPUSES } from "@/lib/constants/exam";
import { usePublishExamSessions } from "@/hooks/use-exam-schedules";
import { useSemesters } from "@/hooks/use-semesters";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface PublishScheduleDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PublishScheduleDialog({ isOpen, onClose }: PublishScheduleDialogProps) {
    const t = useTranslations("Dashboard.examOfficer.publishScheduleDialog");
    const tCommon = useTranslations("Common");
    const [semesterId, setSemesterId] = useState("");
    const [campus, setCampus] = useState("");
    const [confirmed, setConfirmed] = useState(false);
    const [publishedCount, setPublishedCount] = useState<number | null>(null);

    const { data: semestersData } = useSemesters({ limit: 50 });
    const semesters = semestersData?.data || [];

    const publishMutation = usePublishExamSessions();

    const handlePublish = async () => {
        if (!semesterId) {
            toast.error(t("errorSelectSemester"));
            return;
        }
        try {
            const payload: any = { semesterId };
            if (campus) payload.campus = campus;
            const res: any = await publishMutation.mutateAsync(payload);
            setPublishedCount(res?.count ?? 0);
            toast.success(t("publishSuccess", { count: res?.count ?? 0 }));
        } catch (err: any) {
            toast.error(t("publishError", { error: err?.message || "Unknown error" }));
        }
    };

    const handleClose = () => {
        setSemesterId("");
        setCampus("");
        setConfirmed(false);
        setPublishedCount(null);
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={!publishMutation.isPending ? handleClose : undefined} />
            <Card className="w-full max-w-md relative z-10 shadow-2xl border-none overflow-hidden animate-in zoom-in-95 duration-200 rounded-[2rem]">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black flex items-center gap-2">
                            <Send className="h-5 w-5" /> {t("title")}
                        </h2>
                        <p className="text-white/80 text-xs font-bold mt-1 tracking-wider uppercase">
                            {t("subtitle")}
                        </p>
                    </div>
                    <Button
                        variant="ghost" size="sm" disabled={publishMutation.isPending}
                        onClick={handleClose}
                        className="text-white/80 hover:text-green-600 hover:bg-white rounded-xl h-8 w-8 p-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <CardContent className="p-6 flex flex-col gap-4">
                    {publishedCount !== null ? (
                        // Success state
                        <div className="flex flex-col items-center text-center py-6 gap-4">
                            <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="h-9 w-9 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-900">{publishedCount.toLocaleString()}</p>
                                <p className="text-sm font-bold text-slate-500 mt-1">{t("successDescription", { count: publishedCount })}</p>
                            </div>
                            <Button onClick={handleClose} className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-8">
                                {tCommon("success.update")}
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Semester Select */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{t("semesterLabel")}</label>
                                <select
                                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 hover:border-emerald-200 transition-all"
                                    value={semesterId}
                                    onChange={(e) => setSemesterId(e.target.value)}
                                    disabled={publishMutation.isPending}
                                >
                                    <option value="">{t("semesterPlaceholder")}</option>
                                    {semesters.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.name || s.id}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Campus Select */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-1.5">
                                    <Building2 className="w-3 h-3" /> {t("campusLabel")}
                                </label>
                                <select
                                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 hover:border-emerald-200 transition-all"
                                    value={campus}
                                    onChange={(e) => setCampus(e.target.value)}
                                    disabled={publishMutation.isPending}
                                >
                                    <option value="">{t("allCampuses")}</option>
                                    {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            {/* Warning */}
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start">
                                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-black text-amber-800">{t("warningTitle")}</p>
                                    <p className="text-xs text-amber-600 mt-1 font-medium">
                                        {t("warningDescription", { campus: campus ? ` (${campus})` : "" })}
                                    </p>
                                </div>
                            </div>

                            {/* Confirmation checkbox */}
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={confirmed}
                                    onChange={e => setConfirmed(e.target.checked)}
                                    className="w-4 h-4 rounded accent-emerald-600"
                                    disabled={publishMutation.isPending}
                                />
                                <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">
                                    {t("confirmationLabel")}
                                </span>
                            </label>

                            {/* Footer */}
                            <div className="flex gap-3 pt-2 border-t border-slate-100">
                                <Button variant="ghost" onClick={handleClose} disabled={publishMutation.isPending}
                                    className="flex-1 font-bold text-slate-500 hover:text-slate-700 rounded-xl">
                                    {tCommon("cancel")}
                                </Button>
                                <Button
                                    onClick={handlePublish}
                                    disabled={!semesterId || !confirmed || publishMutation.isPending}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 disabled:opacity-50"
                                >
                                    {publishMutation.isPending ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("publishing")}</>
                                    ) : (
                                        <><Send className="mr-2 h-4 w-4" /> {t("publishBtn")}</>
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>,
        document.body
    );
}
