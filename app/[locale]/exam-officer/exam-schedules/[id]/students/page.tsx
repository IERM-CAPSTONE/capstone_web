"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users,
    Search,
    ChevronRight,
    ArrowLeft,
    MapPin,
    RotateCcw,
    XCircle,
    AlertCircle,
    LayoutGrid,
    FileText,
    Calendar,
    Download,
    Eye,
    Settings2,
    Lock,
    CheckCircle,
    AlertTriangle,
    Monitor,
    ChevronLeft,
    ChevronDown
} from "lucide-react";
import { useStudentExamsBySession } from "@/hooks/use-student-exams";
import { useExamScheduleById } from "@/hooks/use-exam-schedules";
import { useTranslations } from "next-intl";
import { getCurrentLocale } from "@/hooks/use-check-auth";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import { format } from "date-fns";
import SeatingPlan from "../../components/SeatingPlan";
import { parseLocalDate } from "../../utils";

export default function ExamSessionStudentsPage() {
    const router = useRouter();
    const params = useParams();
    const scheduleId = params.id as string;
    const locale = getCurrentLocale();
    const t = useTranslations("Dashboard");
    const commonT = useTranslations("Common");

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [verificationFilter, setVerificationFilter] = useState("ALL");
    const [view, setView] = useState<"list" | "seating">("list");

    const { data: schedule } = useExamScheduleById(scheduleId);
    const { data, isLoading } = useStudentExamsBySession(scheduleId);

    const studentExams = data?.data || [];

    const filteredStudents = useMemo(() => {
        return studentExams.filter(item => {
            const studentName = (item.studentName || "").toLowerCase();
            const studentCode = (item.studentCode || "").toLowerCase();
            const searchLow = searchTerm.toLowerCase();

            const matchesSearch = studentName.includes(searchLow) || studentCode.includes(searchLow);
            const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
            const matchesVerification = verificationFilter === "ALL" ||
                (verificationFilter === "VERIFIED" ? item.isValid : !item.isValid);

            return matchesSearch && matchesStatus && matchesVerification;
        });
    }, [studentExams, searchTerm, statusFilter, verificationFilter]);

    const stats = useMemo(() => {
        const total = studentExams.length;
        const checkedIn = studentExams.filter(s => s.status === "CHECKEDIN" || s.status === "CHECKEDOUT").length;
        const notCheckedIn = total - checkedIn;
        const issues = studentExams.filter(s => !s.isValid).length;
        return { total, checkedIn, notCheckedIn, issues };
    }, [studentExams]);

    const openDate = schedule?.examOpenTime ? parseLocalDate(schedule.examOpenTime) : null;
    const closeDate = schedule?.examCloseTime ? parseLocalDate(schedule.examCloseTime) : null;

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans transition-all duration-300">
            {/* 1. Top Section: Breadcrumbs & Back */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                <nav className="flex items-center gap-2 text-[13px] font-medium text-slate-500 mb-4 md:mb-0">
                    <div className="p-1.5 bg-white rounded-md shadow-sm border border-slate-100 flex items-center justify-center">
                        <LayoutGrid className="h-3.5 w-3.5" />
                    </div>
                    <span className="hover:text-slate-900 cursor-pointer transition-colors">Dashboard</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                    <span className="hover:text-slate-900 cursor-pointer transition-colors">Exam Rooms</span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                    <span
                        className="hover:text-slate-900 cursor-pointer transition-colors"
                        onClick={() => router.push(`/${locale}${ROUTES.EXAMS_SCHEDULE_DETAIL(scheduleId)}`)}
                    >
                        Room Detail
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                    <span className="text-slate-900 font-bold">Candidates</span>
                </nav>

                <button
                    onClick={() => router.push(`/${locale}${ROUTES.EXAMS_SCHEDULE_DETAIL(scheduleId)}`)}
                    className="flex items-center gap-2.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 text-sm font-bold transition-all shadow-sm group"
                >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Room Detail
                </button>
            </div>

            {/* 2. Page Header: Title & Info Cards */}
            <div className="mb-10">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-[900] text-slate-900 tracking-tighter">
                                Candidates in <span className="text-[#F37021]">Exam Room</span>
                            </h1>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#F0FDF4] border border-[#DCFCE7] rounded-full text-[11px] font-black uppercase text-[#15803D] tracking-wide animate-in fade-in slide-in-from-left-4 duration-500">
                                <div className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                                In Progress
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InfoCard
                        icon={<MapPin className="h-5 w-5 text-[#8B5CF6]" />}
                        label="ROOM CODE"
                        value={schedule?.roomNumber || "N/A"}
                        bg="bg-white"
                    />
                    <InfoCard
                        icon={<FileText className="h-5 w-5 text-[#3B82F6]" />}
                        label="SUBJECT"
                        value={schedule?.subjectCode || "N/A"}
                        subValue={schedule?.examCode}
                        bg="bg-white"
                    />
                    <InfoCard
                        icon={<Calendar className="h-5 w-5 text-[#10B981]" />}
                        label="DATE & TIME"
                        value={openDate ? format(openDate, "yyyy-MM-dd") : "N/A"}
                        subValue={openDate && closeDate ? `${format(openDate, "HH:mm")} - ${format(closeDate, "HH:mm")}` : "N/A"}
                        bg="bg-white"
                    />
                </div>
            </div>

            {/* 3. Stats Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatSummaryCard
                    icon={<Users className="h-6 w-6 text-[#3B82F6]" />}
                    value={stats.total}
                    label="Total Candidates"
                    color="blue"
                />
                <StatSummaryCard
                    icon={<CheckCircle className="h-6 w-6 text-[#10B981]" />}
                    value={stats.checkedIn}
                    label="Checked-in (Present)"
                    color="emerald"
                />
                <StatSummaryCard
                    icon={<XCircle className="h-6 w-6 text-[#EF4444]" />}
                    value={stats.notCheckedIn}
                    label="Not Checked-in"
                    color="rose"
                />
                <StatSummaryCard
                    icon={<AlertTriangle className="h-6 w-6 text-[#F59E0B]" />}
                    value={stats.issues}
                    label="Verification Issues"
                    color="amber"
                />
            </div>

            {/* 5. View Switcher & Action Buttons */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 flex items-center w-fit">
                    <button
                        onClick={() => setView("list")}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all",
                            view === "list" ? "bg-[#F37021] text-white shadow-md shadow-orange-500/20" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <LayoutGrid className="h-4 w-4" />
                        List View
                    </button>
                    <button
                        onClick={() => setView("seating")}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all",
                            view === "seating" ? "bg-[#F37021] text-white shadow-md shadow-orange-500/20" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <Monitor className="h-4 w-4" />
                        Seating View
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <Button variant="outline" className="h-12 px-6 rounded-xl border-slate-200 text-slate-700 font-bold gap-2.5 shadow-sm hover:bg-slate-50 transition-all">
                        <Settings2 className="h-4 w-4 text-slate-400" />
                        Generate Seating Plan
                    </Button>
                    <Button variant="outline" className="h-12 px-6 rounded-xl border-slate-200 text-slate-700 font-bold gap-2.5 shadow-sm hover:bg-slate-50 transition-all">
                        <Download className="h-4 w-4 text-slate-400" />
                        Export Roster
                    </Button>
                    <Button className="h-12 px-6 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-black gap-2.5 shadow-lg shadow-purple-500/20 transition-all">
                        <Lock className="h-4 w-4" />
                        Lock Roster
                    </Button>
                </div>
            </div>

            {/* 6. List Section: Search & Table / Seating View */}
            {view === "list" ? (
                <Card className="border-none shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] bg-white overflow-hidden rounded-[2.5rem]">
                    <div className="p-8 pb-4">
                        <div className="flex flex-col lg:flex-row items-center gap-5 mb-6">
                            <div className="relative flex-1 group w-full">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-[#F37021] transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search candidates..."
                                    className="w-full h-14 pl-14 pr-4 bg-slate-50/80 border border-slate-100 rounded-2xl text-[15px] font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-[#F37021]/10 focus:border-[#F37021]/20 transition-all placeholder:text-slate-400"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                                <div className="relative min-w-[160px]">
                                    <select
                                        className="w-full h-14 pl-4 pr-10 bg-slate-50/80 border border-slate-100 rounded-2xl text-[14px] font-bold text-slate-700 appearance-none focus:outline-none focus:ring-4 focus:ring-[#F37021]/10 transition-all cursor-pointer"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <option value="ALL">All Status</option>
                                        <option value="REGISTERED">Registered</option>
                                        <option value="CHECKEDIN">Checked-in</option>
                                        <option value="CHECKEDOUT">Checked-out</option>
                                        <option value="ABSENT">Absent</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <ChevronDown className="h-4 w-4" />
                                    </div>
                                </div>

                                <div className="relative min-w-[180px]">
                                    <select
                                        className="w-full h-14 pl-4 pr-10 bg-slate-50/80 border border-slate-100 rounded-2xl text-[14px] font-bold text-slate-700 appearance-none focus:outline-none focus:ring-4 focus:ring-[#F37021]/10 transition-all cursor-pointer"
                                        value={verificationFilter}
                                        onChange={(e) => setVerificationFilter(e.target.value)}
                                    >
                                        <option value="ALL">All Verification</option>
                                        <option value="VERIFIED">Verified Only</option>
                                        <option value="NOT_VERIFIED">Not Verified</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <ChevronDown className="h-4 w-4" />
                                    </div>
                                </div>

                                <Button
                                    variant="ghost"
                                    className="h-14 w-14 p-0 rounded-2xl bg-slate-50/80 border border-slate-100 text-slate-400 hover:text-[#F37021] hover:bg-white transition-all shadow-sm"
                                    onClick={() => {
                                        setSearchTerm("");
                                        setStatusFilter("ALL");
                                        setVerificationFilter("ALL");
                                    }}
                                >
                                    <RotateCcw className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto px-4 pb-8">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">SEAT NO.</th>
                                    <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">CANDIDATE ID</th>
                                    <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">FULL NAME</th>
                                    <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">CHECK-IN STATUS</th>
                                    <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">FACE VERIFICATION</th>
                                    <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400">NOTES</th>
                                    <th className="px-6 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">ACTION</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50/50">
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={7} className="px-6 py-6"><div className="h-4 bg-slate-100 rounded-full w-full" /></td>
                                        </tr>
                                    ))
                                ) : filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-32 text-center">
                                            <div className="flex flex-col items-center justify-center opacity-30">
                                                <Users className="h-16 w-16 text-slate-300 mb-4" />
                                                <p className="text-lg font-black text-slate-500">No candidates found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map((item, index) => (
                                        <tr key={item.id} className="group hover:bg-[#F8FAFC] transition-all duration-200">
                                            <td className="px-6 py-6">
                                                <span className="text-slate-400 font-black text-xs mr-1 opacity-50">#</span>
                                                <span className="text-slate-900 font-black text-sm">{index + 1}</span>
                                            </td>
                                            <td className="px-6 py-6 font-black text-[#F37021] text-[13.5px] tabular-nums tracking-tight">
                                                {item.studentCode || "N/A"}
                                            </td>
                                            <td className="px-6 py-6 font-bold text-slate-900 text-sm">
                                                {item.studentName || "Chưa cập nhật"}
                                            </td>
                                            <td className="px-6 py-6">
                                                {getStatusBadge(item.status)}
                                            </td>
                                            <td className="px-6 py-6">
                                                <VerificationBadge status={item.isValid ? "Verified" : "Not Verified"} />
                                            </td>
                                            <td className="px-6 py-6 text-slate-300 text-xs">-</td>
                                            <td className="px-6 py-6 text-right">
                                                <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-white hover:shadow-md hover:border-slate-100 border border-transparent transition-all">
                                                    <Eye className="h-4.5 w-4.5 text-slate-400" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-[13px] font-bold text-slate-400">
                            Showing <span className="text-slate-900 font-black tabular-nums">{filteredStudents.length}</span> of <span className="text-slate-900 font-black tabular-nums">{studentExams.length}</span> candidates
                        </p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" className="h-9 w-9 p-0 rounded-lg border-slate-200">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" className="h-9 w-9 p-0 rounded-lg bg-[#F37021] text-white border-[#F37021]">1</Button>
                            <Button variant="outline" className="h-9 w-9 p-0 rounded-lg border-slate-200">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </Card>
            ) : (
                <SeatingPlan
                    examSessionId={scheduleId}
                    maxRows={schedule?.maxRows || 5}
                    maxColumns={schedule?.maxColumns || 6}
                    totalSeats={schedule?.totalSeats || 30}
                />
            )}
        </div>
    );
}

// Helper Components
function InfoCard({ icon, label, value, subValue, bg }: any) {
    return (
        <div className={cn("p-6 rounded-[2rem] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 transition-all hover:shadow-lg hover:-translate-y-1 group", bg)}>
            <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:shadow-sm transition-colors border border-transparent group-hover:border-slate-100">
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-lg font-black text-slate-900 truncate leading-tight">{value}</p>
                    {subValue && <p className="text-xs font-bold text-slate-400 mt-1 truncate">{subValue}</p>}
                </div>
            </div>
        </div>
    );
}

function StatSummaryCard({ icon, value, label, color }: any) {
    const colorMap: any = {
        blue: "text-[#3B82F6] bg-[#EFF6FF] border-[#DBEAFE]",
        emerald: "text-[#10B981] bg-[#ECFDF5] border-[#D1FAE5]",
        rose: "text-[#EF4444] bg-[#FEF2F2] border-[#FEE2E2]",
        amber: "text-[#F59E0B] bg-[#FFFBEB] border-[#FEF3C7]",
    };

    return (
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex items-center gap-6 transition-all hover:shadow-xl hover:-translate-y-1">
            <div className={cn("w-16 h-16 rounded-[1.7rem] flex items-center justify-center shrink-0 border", colorMap[color])}>
                {icon}
            </div>
            <div>
                <div className="text-3xl font-[1000] text-slate-900 leading-tight tabular-nums tracking-tighter">{value}</div>
                <div className="text-[12px] font-bold text-slate-400 leading-none mt-1">{label}</div>
            </div>
        </div>
    );
}


function getStatusBadge(status: string) {
    const configs: Record<string, { color: string, label: string }> = {
        REGISTERED: { color: "bg-blue-50 text-[#3B82F6] border-[#DBEAFE]", label: "Registered" },
        CHECKEDIN: { color: "bg-[#F0FDF4] text-[#15803D] border-[#DCFCE7]", label: "Present" },
        CHECKEDOUT: { color: "bg-purple-50 text-[#7C3AED] border-[#EDE9FE]", label: "Checked-out" },
        ABSENT: { color: "bg-[#FEF2F2] text-[#EF4444] border-[#FEE2E2]", label: "Absent" },
    };

    const config = configs[status] || configs.REGISTERED;

    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full text-[11px] font-black border uppercase tracking-wide",
            config.color
        )}>
            <div className={cn("h-1.5 w-1.5 rounded-full", config.color.split(' ')[1].replace('text-', 'bg-'))} />
            {config.label}
        </span>
    );
}

function VerificationBadge({ status }: { status: string }) {
    const colors: any = {
        Verified: "bg-[#F0FDF4] text-[#15803D] border-[#DCFCE7]",
        "Not Verified": "bg-slate-50 text-slate-500 border-slate-100",
        Error: "bg-[#FEF2F2] text-[#EF4444] border-[#FEE2E2]",
    };

    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full text-[11px] font-black border uppercase tracking-wide",
            colors[status]
        )}>
            {status === "Verified" ? <CheckCircle className="h-3 w-3" /> : status === "Error" ? <XCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {status}
        </span>
    );
}

