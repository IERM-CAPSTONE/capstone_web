"use client";

import { Semester } from "@/types";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Calendar, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface SemesterTableProps {
    semesters: Semester[];
    onEdit?: (semester: Semester) => void;
    onDelete?: (id: string) => void;
    isLoading?: boolean;
}

import { useTranslations } from "next-intl";

export function SemesterTable({
    semesters,
    onEdit,
    onDelete,
    isLoading,
}: SemesterTableProps) {
    const t = useTranslations("Semesters.table");
    const tCommon = useTranslations("Common");

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
                <span className="ml-3 text-gray-500">{tCommon("loading")}</span>
            </div>
        );
    }

    if (semesters.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-full mb-4">
                    <Calendar className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-gray-500 font-medium">No semesters found</p>
                <p className="text-gray-400 text-sm">Get started by creating a new semester.</p>
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
                            {t("startDate")}
                        </th>
                        <th className="text-left px-6 py-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">
                            {t("endDate")}
                        </th>
                        {(onEdit || onDelete) && (
                            <th className="text-right px-6 py-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">
                                {t("actions")}
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {semesters.map((semester) => (
                        <tr
                            key={semester.id}
                            className="border-b border-gray-100 dark:border-gray-800 hover:bg-orange-50/30 dark:hover:bg-orange-900/10 transition-colors"
                        >
                            <td className="px-6 py-4">
                                <div className="font-bold text-slate-900 dark:text-slate-100">{semester.code}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-gray-700 dark:text-gray-300 font-medium">
                                    {semester.name || "—"}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <Calendar className="h-3.5 w-3.5 text-orange-500" />
                                    <span>{formatDate(semester.startDate)}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <Clock className="h-3.5 w-3.5 text-orange-500" />
                                    <span>{formatDate(semester.endDate)}</span>
                                </div>
                            </td>
                            {(onEdit || onDelete) && (
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        {onEdit && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onEdit(semester)}
                                                className="h-8 w-8 p-0 hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-orange-950"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {onDelete && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onDelete(semester.id)}
                                                className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
