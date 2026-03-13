"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils/cn";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, BookOpen, RefreshCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { useSubjects, useDeleteSubject } from "@/hooks/use-subjects";
import { useDebounce } from "@/hooks/use-debounce";
import { SubjectTable } from "@/components/subjects/subject-table";
import { SubjectDialog } from "@/components/subjects/subject-dialog";
import { ExamTypeManagementDialog } from "@/components/subjects/exam-type-management-dialog";
import { ImportSubjectButton } from "@/components/subjects/import-subject-button";
import { Subject } from "@/types";
import { Settings } from "lucide-react";
import { toast } from "sonner";

import { useTranslations } from "next-intl";

export default function SubjectManagementPage() {
    const t = useTranslations("Subjects");
    const tCommon = useTranslations("Common");
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [page, setPage] = useState(1);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isExamTypeDialogOpen, setIsExamTypeDialogOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

    const limit = 10;
    const { data, isLoading, refetch, isRefetching } = useSubjects({
        page,
        limit,
        search: debouncedSearch,
    });

    const deleteSubject = useDeleteSubject();

    const handleEdit = (subject: Subject) => {
        setEditingSubject(subject);
        setIsDialogOpen(true);
    };

    const handleCreate = () => {
        setEditingSubject(null);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this subject? This will also remove all associated exam parts.")) {
            try {
                await deleteSubject.mutateAsync(id);
                toast.success("Subject deleted successfully");
            } catch (error) {
                console.error("Error deleting subject:", error);
                toast.error("Failed to delete subject");
            }
        }
    };

    const subjects = data?.data || [];
    const pagination = data?.pagination;

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto p-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
                        <BookOpen className="h-8 w-8 text-orange-600" />
                        {t("title")}
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">
                        {t("subtitle")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isLoading || isRefetching}
                        className="rounded-full shadow-sm"
                    >
                        <RefreshCcw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
                        {tCommon("refresh")}
                    </Button>
                    <ImportSubjectButton />
                    <Button
                        variant="outline"
                        onClick={() => setIsExamTypeDialogOpen(true)}
                        className="rounded-full border-slate-200 hover:border-orange-500 hover:text-orange-600 transition-all font-medium"
                    >
                        <Settings className="h-4 w-4 mr-2" />
                        {t("manageExamTypes")}
                    </Button>
                    <Button
                        onClick={handleCreate}
                        className="rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200 dark:shadow-none font-medium"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        {t("addSubject")}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm dark:bg-slate-900/50 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardHeader className="pb-2 border-b">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Search className="h-4 w-4 text-slate-400" />
                            {t("quickSearch")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder={t("searchPlaceholder")}
                                className="pl-10 h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
                    <CardContent className="p-0">
                        <SubjectTable
                            subjects={subjects}
                            isLoading={isLoading}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />

                        {pagination && pagination.total > 0 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                    {tCommon("showing")} <span className="font-semibold text-slate-900 dark:text-slate-100">
                                        {((pagination.page - 1) * pagination.limit) + 1}
                                    </span> {tCommon("to")} <span className="font-semibold text-slate-900 dark:text-slate-100">
                                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                                    </span> {tCommon("of")} <span className="font-semibold text-slate-900 dark:text-slate-100">
                                        {pagination.total}
                                    </span> {t("table.results")}
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={pagination.page === 1}
                                        className="rounded-lg h-9 w-9 p-0"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>

                                    <div className="flex gap-1">
                                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                            let pageNum;
                                            if (pagination.totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (pagination.page <= 3) {
                                                pageNum = i + 1;
                                            } else if (pagination.page >= pagination.totalPages - 2) {
                                                pageNum = pagination.totalPages - 4 + i;
                                            } else {
                                                pageNum = pagination.page - 2 + i;
                                            }
                                            return (
                                                <Button
                                                    key={pageNum}
                                                    variant={pagination.page === pageNum ? "primary" : "outline"}
                                                    size="sm"
                                                    onClick={() => setPage(pageNum)}
                                                    className={cn(
                                                        "h-9 w-9 p-0 rounded-lg",
                                                        pagination.page === pageNum
                                                            ? "bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
                                                            : "text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                                                    )}
                                                >
                                                    {pageNum}
                                                </Button>
                                            );
                                        })}
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                                        disabled={pagination.page === pagination.totalPages}
                                        className="rounded-lg h-9 w-9 p-0"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {isDialogOpen && (
                <SubjectDialog
                    subject={editingSubject}
                    onClose={() => {
                        setIsDialogOpen(false);
                        setEditingSubject(null);
                    }}
                />
            )}
            {isExamTypeDialogOpen && (
                <ExamTypeManagementDialog
                    onClose={() => setIsExamTypeDialogOpen(false)}
                />
            )}
        </div>
    );
}
