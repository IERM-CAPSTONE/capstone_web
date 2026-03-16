"use client";

import { Subject } from "@/types";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, BookOpen, Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const getPartStyles = (code: string) => {
    const c = code.toUpperCase();
    if (c.includes("MC"))
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800";
    if (c.includes("L") || c.includes("LISTENING"))
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800";
    if (c.includes("R") || c.includes("READING"))
        return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800";
    if (c.includes("W") || c.includes("WRITING"))
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800";
    if (c.includes("S") || c.includes("SPEAKING"))
        return "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800";

    return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
};

const getCodeStyles = () => {
    return 'bg-slate-50 text-slate-700 border-slate-200 group-hover:bg-orange-50 group-hover:border-orange-200 group-hover:text-orange-700';
};

// Since I don't see a badge component in components/ui, I'll implement a simple one here if not available
// Actually, I'll use a span with classes to match the theme

interface SubjectTableProps {
    subjects: Subject[];
    onEdit?: (subject: Subject) => void;
    onDelete?: (id: string) => void;
    isLoading?: boolean;
}

import { useTranslations } from "next-intl";

export function SubjectTable({
    subjects,
    onEdit,
    onDelete,
    isLoading,
}: SubjectTableProps) {
    const t = useTranslations("Subjects.table");
    const tCommon = useTranslations("Common");

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
                <span className="ml-3 text-gray-500">{tCommon("loading")}</span>
            </div>
        );
    }

    if (subjects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-full mb-4">
                    <BookOpen className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-gray-500 font-medium">{tCommon("noResults") || "No subjects found"}</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b border-slate-50 bg-slate-50/30">
                        <th className="text-left px-8 py-6 font-black text-[10px] text-slate-400 uppercase tracking-[0.2em]">
                            {t("code")}
                        </th>
                        <th className="text-left px-8 py-6 font-black text-[10px] text-slate-400 uppercase tracking-[0.2em]">
                            {t("name")}
                        </th>
                        <th className="text-left px-8 py-6 font-black text-[10px] text-slate-400 uppercase tracking-[0.2em]">
                            {t("semester")}
                        </th>
                        <th className="text-left px-8 py-6 font-black text-[10px] text-slate-400 uppercase tracking-[0.2em]">
                            {t("department")}
                        </th>
                        <th className="text-left px-8 py-6 font-black text-[10px] text-slate-400 uppercase tracking-[0.2em]">
                            {t("parts")}
                        </th>
                        <th className="text-right px-8 py-6 font-black text-[10px] text-slate-400 uppercase tracking-[0.2em]">
                            {tCommon("actions")}
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {subjects.map((subject) => (
                        <tr
                            key={subject.id}
                            className="group hover:bg-slate-50/50 transition-all duration-300"
                        >
                            <td className="px-8 py-6">
                                <div className={cn(
                                    "inline-flex items-center justify-center px-3 py-1.5 border rounded-lg font-black text-xs shadow-sm transition-all duration-300 group-hover:scale-105",
                                    getCodeStyles()
                                )}>
                                    {subject.code}
                                </div>
                            </td>
                            <td className="px-8 py-6">
                                <div className="text-slate-900 font-bold text-sm">
                                    {subject.name || "—"}
                                </div>
                            </td>
                            <td className="px-8 py-6">
                                <div className="text-slate-500 font-semibold text-sm">
                                    {subject.semester?.name || subject.semesterId || "—"}
                                </div>
                            </td>
                            <td className="px-8 py-6">
                                {subject.department ? (
                                    <div className="flex flex-col gap-1">
                                        <div className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[9px] font-black uppercase tracking-wider w-fit shadow-sm">
                                            {subject.department}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-slate-300 text-xs font-medium ml-3">—</span>
                                )}
                            </td>
                            <td className="px-8 py-6">
                                <div className="flex flex-wrap gap-2">
                                    {subject.parts && subject.parts.length > 0 ? (
                                        subject.parts.map((part) => {
                                            const typeCode = part.examPart?.code || "Type";
                                            const styles = getPartStyles(typeCode);

                                            return (
                                                <div
                                                    key={part.id}
                                                    className={cn(
                                                        "flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg border font-black text-xs shadow-sm uppercase tracking-tight transition-transform hover:scale-105",
                                                        styles
                                                    )}
                                                >
                                                    <span>{typeCode}</span>
                                                    <div className="flex items-center gap-1.5 opacity-60 border-l pl-2 border-current/20">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        <span>{part.duration}m</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">{t("noParts")}</span>
                                    )}
                                </div>
                            </td>
                            <td className="px-8 py-6">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    {onEdit && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onEdit(subject)}
                                            className="h-10 px-4 border-slate-100 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-all shadow-sm"
                                        >
                                            <Edit className="h-4 w-4 mr-2" />
                                            <span className="text-xs font-bold">{tCommon("edit")}</span>
                                        </Button>
                                    )}
                                    {onDelete && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onDelete(subject.id)}
                                            className="h-10 px-4 border-slate-100 hover:border-red-200 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all shadow-sm"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
