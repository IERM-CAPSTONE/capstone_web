"use client";

import { Subject } from "@/types";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, BookOpen, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils/format";
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

    return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
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
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                        <th className="text-left px-6 py-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">
                            {t("code")}
                        </th>
                        <th className="text-left px-6 py-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">
                            {t("name")}
                        </th>
                        <th className="text-left px-6 py-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">
                            {t("semester")}
                        </th>
                        <th className="text-left px-6 py-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">
                            {t("department")}
                        </th>
                        <th className="text-left px-6 py-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">
                            {t("parts")}
                        </th>
                        <th className="text-right px-6 py-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">
                            {t("actions")}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {subjects.map((subject) => (
                        <tr
                            key={subject.id}
                            className="border-b border-gray-100 dark:border-gray-800 hover:bg-orange-50/30 dark:hover:bg-orange-900/10 transition-colors"
                        >
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-900 dark:text-slate-100">{subject.code}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-gray-700 dark:text-gray-300 font-medium">
                                    {subject.name || "—"}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-gray-700 dark:text-gray-300">
                                    {subject.semester?.name || subject.semesterId || "—"}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-gray-700 dark:text-gray-300">
                                    {subject.department || "—"}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-2">
                                    {subject.parts && subject.parts.length > 0 ? (
                                        subject.parts.map((part) => {
                                            const typeCode = part.examType?.code || "Type";
                                            const styles = getPartStyles(typeCode);

                                            return (
                                                <div
                                                    key={part.id}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-2 py-1 rounded-md border font-medium",
                                                        styles
                                                    )}
                                                >
                                                    <span className="text-[10px] font-bold uppercase">
                                                        {typeCode}
                                                    </span>
                                                    <div className="flex items-center gap-0.5 text-[10px] opacity-80">
                                                        <Clock className="h-2.5 w-2.5" />
                                                        <span>{part.duration}m</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">{t("noParts")}</span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-2">
                                    {onEdit && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onEdit(subject)}
                                            className="h-8 w-8 p-0 hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-orange-950"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {onDelete && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onDelete(subject.id)}
                                            className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950"
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
