"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useExamSchedules, useArchiveExamSchedule } from "@/hooks/use-exam-schedules";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Loader2,
  AlertCircle,
  Search,
  LayoutGrid,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  MoreVertical,
  Eye,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Filter,
  Archive,
  Upload,
  Users,
  Code
} from "lucide-react";
import { format } from "date-fns";
import { ROUTES } from "@/lib/constants/routes";
import { parseLocalDate } from "@/app/dashboard/exam-officer/exam-schedule/utils";
import ImportDialog from "@/app/dashboard/exam-officer/exam-schedule/components/ImportDialog";

export default function ExamsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState({
    subjectCode: "",
    examRoomId: "",
    proctorId: "",
  });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importType, setImportType] = useState<"schedule" | "proctor" | "examcode" | null>(null);

  const { data, isLoading, error } = useExamSchedules({
    page,
    limit: 10,
    ...searchParams,
  });
  const archiveMutation = useArchiveExamSchedule();

  const schedules = data?.data || [];
  const totalPages = data?.totalPages || 1;

  const stats = [
    {
      title: "Total Exam Schedules",
      value: data?.total || 0,
      subtitle: "This semester",
      icon: <Calendar className="h-5 w-5 text-blue-500" />,
      bg: "bg-blue-50",
    },
    {
      title: "Exams Today",
      value: schedules.filter(s => {
        const now = new Date();
        const open = s.examOpenTime ? parseLocalDate(s.examOpenTime) : null;
        return open && open.toDateString() === now.toDateString();
      }).length,
      subtitle: "Currently ongoing",
      icon: <Clock className="h-5 w-5 text-green-500" />,
      bg: "bg-green-50",
      status: "text-green-600"
    },
    {
      title: "Upcoming Exams",
      value: schedules.filter(s => {
        const now = new Date();
        const open = s.examOpenTime ? parseLocalDate(s.examOpenTime) : null;
        return open && open > now;
      }).length,
      subtitle: "Scheduled",
      icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
      bg: "bg-orange-50",
      status: "text-orange-600"
    },
    {
      title: "Completed Exams",
      value: schedules.filter(s => {
        const now = new Date();
        const close = s.examCloseTime ? parseLocalDate(s.examCloseTime) : null;
        return close && close < now;
      }).length,
      subtitle: "This semester",
      icon: <CheckCircle2 className="h-5 w-5 text-gray-500" />,
      bg: "bg-gray-50",
    },
  ];

  const clearFilters = () => {
    setSearchParams({
      subjectCode: "",
      examRoomId: "",
      proctorId: "",
    });
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6 bg-slate-50/50 min-h-screen">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
        <LayoutGrid className="h-4 w-4" />
        <span>Dashboard</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-900 font-medium">Exam Schedule</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exam Schedule</h1>
          <p className="text-slate-500 text-sm">Plan and manage examination schedules</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Import Schedule + Students */}
          <Button
            variant="outline"
            className="gap-2 bg-white hover:bg-blue-50 border-blue-200 text-blue-600 hover:text-blue-700 transition-all"
            onClick={() => {
              setImportType("schedule");
              setShowImportDialog(true);
            }}
          >
            <Upload className="h-4 w-4" />
            Import Schedule + Students
          </Button>

          {/* Import Proctors */}
          <Button
            variant="outline"
            className="gap-2 bg-white hover:bg-green-50 border-green-200 text-green-600 hover:text-green-700 transition-all"
            onClick={() => {
              setImportType("proctor");
              setShowImportDialog(true);
            }}
          >
            <Users className="h-4 w-4" />
            Import Proctors
          </Button>

          {/* Import Exam Codes */}
          <Button
            variant="outline"
            className="gap-2 bg-white hover:bg-purple-50 border-purple-200 text-purple-600 hover:text-purple-700 transition-all"
            onClick={() => {
              setImportType("examcode");
              setShowImportDialog(true);
            }}
          >
            <Code className="h-4 w-4" />
            Import Exam Codes
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                  <h3 className="text-3xl font-bold text-slate-900">{stat.value}</h3>
                  <p className={`text-xs ${stat.status || "text-slate-400"}`}>{stat.subtitle}</p>
                </div>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by subject name or schedule code..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  value={searchParams.subjectCode}
                  onChange={(e) => setSearchParams({ ...searchParams, subjectCode: e.target.value })}
                />
              </div>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white gap-2 px-6"
                onClick={() => router.push(ROUTES.EXAMS_SCHEDULE_CREATE)}
              >
                <Plus className="h-4 w-4" />
                Create Exam Schedule
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Filter className="h-4 w-4" />
                Filters:
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Room"
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs w-24 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  value={searchParams.examRoomId}
                  onChange={(e) => setSearchParams({ ...searchParams, examRoomId: e.target.value })}
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="text"
                  placeholder="Proctor"
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs w-24 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  value={searchParams.proctorId}
                  onChange={(e) => setSearchParams({ ...searchParams, proctorId: e.target.value })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-500 hover:text-slate-900"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">Exam Code</th>
                  <th className="px-6 py-4 font-semibold">Open Code</th>
                  <th className="px-6 py-4 font-semibold">Subject</th>
                  <th className="px-6 py-4 font-semibold">Exam Date</th>
                  <th className="px-6 py-4 font-semibold">Time</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-red-500">
                      <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                      Failed to load data
                    </td>
                  </tr>
                ) : schedules.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                      No exam schedules found
                    </td>
                  </tr>
                ) : (
                  schedules.map((schedule) => {
                    const getStatusDisplay = (apiStatus: string | null | undefined) => {
                      switch (apiStatus) {
                        case "Ongoing":
                          return {
                            label: "Ongoing",
                            color: "bg-green-50 text-green-600 border-green-100",
                            icon: <div className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" />
                          };
                        case "Ended":
                          return {
                            label: "Completed",
                            color: "bg-slate-100 text-slate-600 border-slate-200",
                            icon: <CheckCircle2 className="h-3 w-3" />
                          };
                        case "Scheduled":
                        default:
                          return {
                            label: "Upcoming",
                            color: "bg-blue-50 text-blue-600 border-blue-100",
                            icon: <Clock className="h-3 w-3" />
                          };
                      }
                    };

                    const status = getStatusDisplay(schedule.status);
                    const open = schedule.examOpenTime ? parseLocalDate(schedule.examOpenTime) : null;
                    const close = schedule.examCloseTime ? parseLocalDate(schedule.examCloseTime) : null;

                    return (
                      <tr key={schedule.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 rounded-lg">
                              <FileText className="h-4 w-4 text-purple-500" />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${schedule.examCode ? "text-slate-700" : "text-slate-400 italic font-normal"}`}>
                                {schedule.examCode || "Empty"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-700">{schedule.openCode || "-"}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">{schedule.subjectCode || "N/A"}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            {open ? format(open, "yyyy-MM-dd") : "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-slate-400" />
                            {open && close ? `${format(open, "HH:mm")} - ${format(close, "HH:mm")}` : "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {schedule.examType && schedule.examType.length > 0 ? (
                              schedule.examType.map((type) => (
                                <span key={type} className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                  {type}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                            {status.icon}
                            {status.label}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                              onClick={() => setOpenDropdown(openDropdown === schedule.id ? null : schedule.id)}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                            {openDropdown === schedule.id && (
                              <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                                <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100"
                                  onClick={() => {
                                    router.push(ROUTES.EXAMS_SCHEDULE_DETAIL(schedule.id));
                                    setOpenDropdown(null);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                  View Schedule Details
                                </button>
                                <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100"
                                  onClick={() => {
                                    router.push(ROUTES.EXAMS_SCHEDULE_EDIT(schedule.id));
                                    setOpenDropdown(null);
                                  }}
                                >
                                  <FileText className="h-4 w-4" />
                                  Update Schedule
                                </button>
                                {status.label === "Completed" && (
                                  <button
                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    onClick={async () => {
                                      try {
                                        await archiveMutation.mutateAsync(schedule.id);
                                        setOpenDropdown(null);
                                      } catch (err: any) {
                                        alert(err?.message || "Failed to archive schedule");
                                      }
                                    }}
                                    disabled={archiveMutation.isPending}
                                  >
                                    <Archive className="h-4 w-4" />
                                    {archiveMutation.isPending ? "Archiving..." : "Archive Schedule"}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              Showing page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages || 1}</span> ({data?.total || 0} exam schedules)
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 bg-white disabled:opacity-40"
                disabled={page === 1}
                onClick={() => setPage(1)}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 bg-white disabled:opacity-40"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {(() => {
                const maxVisible = 5;
                const pages: (number | string)[] = [];

                if (totalPages <= maxVisible + 2) {
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  pages.push(1);
                  let start = Math.max(2, page - 1);
                  let end = Math.min(totalPages - 1, page + 1);

                  if (page <= 3) {
                    start = 2;
                    end = maxVisible - 1;
                  }
                  if (page >= totalPages - 2) {
                    start = totalPages - maxVisible + 2;
                    end = totalPages - 1;
                  }
                  if (start > 2) pages.push('...');
                  for (let i = start; i <= end; i++) pages.push(i);
                  if (end < totalPages - 1) pages.push('...');
                  pages.push(totalPages);
                }

                return pages.map((pageNum, idx) => {
                  if (pageNum === '...') {
                    return <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">...</span>;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant="outline"
                      size="sm"
                      className={`h-8 w-8 p-0 ${page === pageNum
                        ? "bg-orange-500 text-white hover:bg-orange-600 border-orange-500"
                        : "bg-white hover:bg-slate-50"
                        }`}
                      onClick={() => setPage(pageNum as number)}
                    >
                      {pageNum}
                    </Button>
                  );
                });
              })()}

              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 bg-white disabled:opacity-40"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 bg-white disabled:opacity-40"
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
              >
                Last
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50/50 border-blue-100 border shadow-none">
        <CardContent className="p-4 flex items-start gap-4">
          <div className="p-2 bg-blue-500 rounded-md">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-blue-900">Exam Schedule Management</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li><span className="font-semibold">• Schedule Actions:</span> Update schedules before exam starts. Archive only completed exams.</li>
              <li><span className="font-semibold">• Status-Based Permissions:</span> Actions are automatically enabled/disabled based on exam status.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        importType={importType}
      />
    </div>
  );
}
