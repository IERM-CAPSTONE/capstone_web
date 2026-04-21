"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Calendar, RefreshCcw } from "lucide-react";
import { SemesterTable } from "./semester-table";
import { SemesterDialog } from "./semester-dialog";
import { useSemesters, useDeleteSemester } from "@/hooks/use-semesters";
import { useDebounce } from "@/hooks/use-debounce";
import { Semester } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

import { useTranslations } from "next-intl";

export function SemesterManagement({ readonly = false }: { readonly?: boolean }) {
    const t = useTranslations("Semesters");
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [page, setPage] = useState(1);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSemester, setEditingSemester] = useState<Semester | null>(null);

    const limit = 10;
    const { data: response, isLoading, refetch } = useSemesters({
        page,
        limit,
        search: debouncedSearch,
    });

    const deleteSemester = useDeleteSemester();

    const handleCreate = () => {
        setEditingSemester(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (semester: Semester) => {
        setEditingSemester(semester);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this semester? This may affect subjects and exam schedules.")) {
            await deleteSemester.mutateAsync(id);
        }
    };

    const semesters = response?.data || [];
    const pagination = response?.pagination;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Calendar className="h-8 w-8 text-orange-600" />
                        {t("title")}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        {t("subtitle")}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => refetch()}
                        className="rounded-full h-11 px-4 border-slate-200"
                    >
                        <RefreshCcw className={isLoading ? "animate-spin" : ""} size={18} />
                    </Button>
                    {!readonly && (
                        <Button
                            onClick={handleCreate}
                            className="rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200 dark:shadow-none h-11 px-6 font-bold"
                        >
                            <Plus className="mr-2 h-5 w-5" />
                            {t("addSemester")}
                        </Button>
                    )}
                </div>
            </div>

            <Card className="border-none shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm dark:bg-slate-900/50">
                <CardHeader className="pb-0 pt-6 px-6">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder={t("searchPlaceholder")}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-11 bg-white dark:bg-slate-950 border-slate-200 rounded-xl focus:ring-orange-200 transition-all"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0 mt-4">
                    <SemesterTable
                        semesters={semesters}
                        onEdit={readonly ? undefined : handleEdit}
                        onDelete={readonly ? undefined : handleDelete}
                        isLoading={isLoading}
                    />

                    {/* Pagination */}
                    {pagination && pagination.total > 0 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
                            <p className="text-sm text-slate-500 font-medium italic">
                                {t("pagination.showing")} <span className="text-slate-900 dark:text-slate-200 font-bold">{(page - 1) * limit + 1}</span> {t("pagination.to")}{" "}
                                <span className="text-slate-900 dark:text-slate-200 font-bold">{Math.min(page * limit, pagination.total)}</span> {t("pagination.of")}{" "}
                                <span className="text-slate-900 dark:text-slate-200 font-bold">{pagination.total}</span> {t("pagination.results")}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page === 1}
                                    onClick={() => setPage(page - 1)}
                                    className="rounded-xl h-9 px-4 border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all font-semibold disabled:opacity-30"
                                >
                                    {t("pagination.previous")}
                                </Button>

                                <div className="flex items-center gap-1 mx-2">
                                    {[...Array(pagination.totalPages)].map((_, i) => (
                                        <Button
                                            key={i + 1}
                                            variant={page === i + 1 ? "primary" : "outline"}
                                            size="sm"
                                            onClick={() => setPage(i + 1)}
                                            className={cn(
                                                "h-9 w-9 p-0 rounded-xl font-bold transition-all",
                                                page === i + 1
                                                    ? "bg-orange-600 text-white shadow-md shadow-orange-200 dark:shadow-none border-orange-600 hover:bg-orange-700"
                                                    : "border-slate-200 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 text-slate-600"
                                            )}
                                        >
                                            {i + 1}
                                        </Button>
                                    ))}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page === pagination.totalPages || pagination.totalPages === 0}
                                    onClick={() => setPage(page + 1)}
                                    className="rounded-xl h-9 px-4 border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all font-semibold disabled:opacity-30"
                                >
                                    {t("pagination.next")}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {!readonly && isDialogOpen && (
                <SemesterDialog
                    semester={editingSemester}
                    onClose={() => {
                        setIsDialogOpen(false);
                        setEditingSemester(null);
                    }}
                />
            )}
        </div>
    );
}
