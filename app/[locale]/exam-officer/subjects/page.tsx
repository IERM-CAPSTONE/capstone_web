"use client";

import { useState } from "react";
import { Search, BookOpen, RefreshCcw, CheckCircle, LayoutGrid, Construction, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubjectTable } from "@/components/subjects/subject-table";
import { ImportSubjectButton } from "@/components/subjects/import-subject-button";
import { ExamPartManagementDialog } from "@/components/subjects/exam-part-management-dialog";
import { useSubjects } from "@/hooks/use-subjects";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuthStore } from "@/store/auth-store";
import { useTranslations } from "next-intl";

export default function SubjectManagementPage() {
    const t = useTranslations("Subjects");
    const tCommon = useTranslations("Common");
    const { user } = useAuthStore();
    const [searchTerm, setSearchTerm] = useState("");
    const [showExamPartDialog, setShowExamPartDialog] = useState(false);
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [page, setPage] = useState(1);

    const limit = 10;
    const { data, isLoading, refetch, isRefetching } = useSubjects({
        page,
        limit,
        search: debouncedSearch,
    });

    const subjects = data?.data || [];
    const pagination = data?.pagination;

    return (
        <div className="space-y-10 pb-20 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <section className="relative overflow-hidden rounded-[3rem] bg-white border border-slate-100 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.05)]">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/[0.03] rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-500/[0.02] rounded-full blur-[80px] pointer-events-none" />

                <div className="relative p-8 lg:p-14">
                    <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-10 mb-14">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-100">
                                <div className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)] animate-pulse" />
                                <span className="text-[11px] uppercase tracking-[0.2em] font-black text-orange-600">{t("curriculumRegistry")}</span>
                            </div>
                            <h1 className="text-4xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                                {t("title") || "Subject Management"}
                            </h1>
                            <p className="max-w-xl text-slate-500 font-semibold text-xl leading-relaxed opacity-80">
                                {t("subtitle") || "View academic subjects and examination blueprints for the current term."}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {user?.role === "admin" && (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowExamPartDialog(true)}
                                        className="h-14 px-6 border-slate-200 bg-white hover:bg-slate-50 hover:border-orange-200 text-slate-700 rounded-2xl transition-all active:scale-95 shadow-sm group"
                                    >
                                        <Settings className="mr-3 h-5 w-5 text-orange-500 group-hover:rotate-90 transition-transform duration-300" />
                                        <span className="font-bold text-sm tracking-tight">{t("manageExamParts")}</span>
                                    </Button>
                                    <ImportSubjectButton />
                                </>
                            )}
                            <Button
                                variant="outline"
                                onClick={() => refetch()}
                                disabled={isLoading || isRefetching}
                                className="h-14 px-6 border-slate-200 bg-white hover:bg-slate-50 hover:border-orange-200 text-slate-700 rounded-2xl transition-all active:scale-95 shadow-sm group"
                            >
                                <RefreshCcw className={`mr-3 h-5 w-5 text-orange-500 group-hover:rotate-180 transition-transform duration-500 ${isRefetching ? "animate-spin" : ""}`} />
                                <span className="font-bold text-sm tracking-tight">{tCommon("refresh")}</span>
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { label: t("totalSubjects") || "Total Subjects", value: data?.pagination?.total || 0, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
                            { label: t("coreSubjects") || "Core Courses", value: "0", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
                            { label: t("departments") || "Departments", value: "0", icon: LayoutGrid, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
                            { label: t("blueprints") || "Examination Blueprints", value: "0", icon: Construction, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100" },
                        ].map((stat, idx) => (
                            <div key={idx} className="relative group p-7 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
                                <div className="flex flex-col gap-4">
                                    <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} border ${stat.border} flex items-center justify-center shadow-inner`}>
                                        <stat.icon className="h-7 w-7" strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h3 className="text-4xl font-black text-slate-900 tabular-nums tracking-tight">{stat.value}</h3>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">{stat.label}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="space-y-8">
                <div className="flex flex-col lg:flex-row items-center gap-4">
                    <div className="flex-1 relative group w-full">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 group-focus-within:text-orange-500 transition-all duration-300" />
                        <Input
                            placeholder={t("searchPlaceholder") || "Search subjects by code or name..."}
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(1);
                            }}
                            className="w-full h-16 pl-16 pr-8 bg-white border-slate-100 focus-visible:ring-4 focus-visible:ring-orange-500/10 rounded-[1.5rem] text-lg font-semibold shadow-sm hover:shadow-md transition-all placeholder:text-slate-400"
                        />
                    </div>

                    <div className="h-16 px-10 flex items-center justify-center bg-white border border-slate-100 rounded-[1.5rem] text-slate-900 font-black text-sm tracking-[0.1em] shadow-sm">
                        <span className="text-orange-600 mr-2">{subjects.length}</span> {tCommon("items")?.toUpperCase() || "UNITS"}
                    </div>
                </div>

                <div className="bg-white rounded-[3rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.03)] border border-slate-100/50 overflow-hidden min-h-[600px] flex flex-col">
                    <div className="flex-1">
                        <SubjectTable subjects={subjects} isLoading={isLoading} />
                    </div>

                    {pagination && pagination.total > 0 && (
                        <div className="p-10 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-8 bg-slate-50/20">
                            <div className="flex items-center gap-4 text-slate-400 font-bold text-xs tracking-[0.1em] uppercase px-8 py-3 bg-white rounded-full border border-slate-100 shadow-sm">
                                <span>{tCommon("showing")}</span>
                                <span className="text-slate-900 font-black px-2 py-0.5 bg-slate-100 rounded-md tabular-nums">
                                    {((pagination.page - 1) * pagination.limit) + 1}
                                </span>
                                <span>{tCommon("to")}</span>
                                <span className="text-slate-900 font-black px-2 py-0.5 bg-slate-100 rounded-md tabular-nums">
                                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                                </span>
                                <span>{tCommon("of")}</span>
                                <span className="text-orange-600 font-black px-2 py-0.5 bg-orange-50 rounded-md tabular-nums">{pagination.total}</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={pagination.page === 1}
                                    className="h-14 w-14 p-0 border-slate-200 bg-white rounded-2xl hover:bg-slate-50 shadow-sm transition-all group disabled:opacity-30"
                                >
                                    <svg className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                                </Button>

                                <div className="flex items-center gap-3 px-8 h-14 bg-white border border-slate-100 rounded-2xl shadow-sm text-lg font-black tracking-tight">
                                    <span className="text-orange-600 px-3 py-1 bg-orange-50 rounded-lg">{pagination.page}</span>
                                    <span className="opacity-20 font-light text-2xl">/</span>
                                    <span className="text-slate-900">{pagination.totalPages}</span>
                                </div>

                                <Button
                                    variant="outline"
                                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="h-14 w-14 p-0 border-slate-200 bg-white rounded-2xl hover:bg-slate-50 shadow-sm transition-all group disabled:opacity-30"
                                >
                                    <svg className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showExamPartDialog && user?.role === "admin" && (
                <ExamPartManagementDialog onClose={() => setShowExamPartDialog(false)} />
            )}
        </div>
    );
}
