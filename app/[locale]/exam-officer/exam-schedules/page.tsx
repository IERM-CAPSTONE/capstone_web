"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useExamSchedules, useArchiveExamSchedule } from "@/hooks/use-exam-schedules";
import { useRooms } from "@/hooks/use-rooms";
import { useUsers, useProctors } from "@/hooks/use-users";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ChevronLeft,
  ChevronRight,
  Filter,
  Archive,
  Upload,
  Users,
  Code,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { ROUTES } from "@/lib/constants/routes";
import { parseLocalDate } from "./utils";
import ImportScheduleDialog from "./components/ImportScheduleDialog";
import ImportProctorDialog from "./components/ImportProctorDialog";
import ImportExamCodeDialog from "./components/ImportExamCodeDialog";
import { EXAM_SUBJECTS, EXAM_STATUSES } from "@/lib/constants/exam";
import { useTranslations } from "next-intl";
import { getCurrentLocale } from "@/hooks/use-check-auth";
import { toast } from "sonner";

export default function ExamOfficerDashboardPage() {
  const router = useRouter();
  const t = useTranslations("Dashboard");
  const commonT = useTranslations("Common");
  const locale = getCurrentLocale();

  const [page, setPage] = useState(1);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState({
    subjectCode: "",
    examCode: "",
    fromDate: "",
    toDate: "",
    startTime: "",
    endTime: "",
    status: "",
    examRoomId: "",
    proctorId: "",
  });
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showProctorDialog, setShowProctorDialog] = useState(false);
  const [showExamCodeDialog, setShowExamCodeDialog] = useState(false);

  // Fetch rooms and proctors for filters
  const { data: roomsData } = useRooms({ limit: 100 });
  const { data: proctorsData } = useProctors({ limit: 100 });

  const { data, isLoading, error } = useExamSchedules({
    page,
    limit: 10,
    ...searchParams,
  });
  const archiveMutation = useArchiveExamSchedule();

  const schedules = data?.data || [];
  const visibleSchedules = schedules.filter((schedule) => !schedule.isArchived);
  const totalPages = data?.meta?.totalPages || 1;


  const clearFilters = () => {
    setSearchParams({
      subjectCode: "",
      examCode: "",
      fromDate: "",
      toDate: "",
      startTime: "",
      endTime: "",
      status: "",
      examRoomId: "",
      proctorId: "",
    });
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t("examOfficer.examSchedules")}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t("examOfficer.manageSchedules")}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            className="gap-2 bg-white hover:bg-blue-50 border-blue-200 text-blue-600 hover:text-blue-700 transition-all"
            onClick={() => setShowScheduleDialog(true)}
          >
            <Upload className="h-4 w-4" />
            {t("examOfficer.actions.importSchedule") || "Import Schedule + Students"}
          </Button>

          <Button
            variant="outline"
            className="gap-2 bg-white hover:bg-green-50 border-green-200 text-green-600 hover:text-green-700 transition-all"
            onClick={() => setShowProctorDialog(true)}
          >
            <Users className="h-4 w-4" />
            {t("examOfficer.actions.importProctors") || "Import Proctors"}
          </Button>

          <Button
            variant="outline"
            className="gap-2 bg-white hover:bg-purple-50 border-purple-200 text-purple-600 hover:text-purple-700 transition-all"
            onClick={() => setShowExamCodeDialog(true)}
          >
            <Code className="h-4 w-4" />
            {t("examOfficer.actions.importExamCodes") || "Import Exam Codes"}
          </Button>
        </div>
      </div>


      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-1 gap-6">
        <div className="space-y-6">
          {/* Search and Filters */}
          <Card className="border-none shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder={t("examOfficer.searchPlaceholder") || "Search by exam code or subject name..."}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
                      value={searchParams.examCode}
                      onChange={(e) => setSearchParams({ ...searchParams, examCode: e.target.value })}
                    />
                  </div>

                  <select
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 min-w-[200px]"
                    value={searchParams.subjectCode}
                    onChange={(e) => setSearchParams({ ...searchParams, subjectCode: e.target.value })}
                  >
                    <option value="">{t("examOfficer.allSubjects") || "All Subjects"}</option>
                    {EXAM_SUBJECTS.map((sub) => (
                      <option key={sub.value} value={sub.value}>{sub.label}</option>
                    ))}
                  </select>

                  <Button
                    className="bg-orange-500 hover:bg-orange-600 text-white gap-2 px-6"
                    onClick={() => router.push(`/${locale}${ROUTES.EXAMS_SCHEDULE_CREATE}`)}
                  >
                    <Plus className="h-4 w-4" />
                    {t("examOfficer.actions.createSchedule") || "Create Exam Schedule"}
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Filter className="h-4 w-4" />
                    {t("examOfficer.advancedFilters") || "Advanced Filters"}:
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-600">{t("examOfficer.date") || "Date"}:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer transition-all"
                        value={searchParams.fromDate}
                        onChange={(e) => setSearchParams({ ...searchParams, fromDate: e.target.value })}
                        placeholder="From"
                      />
                      <span className="text-slate-400 font-medium">to</span>
                      <input
                        type="date"
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer transition-all"
                        value={searchParams.toDate}
                        onChange={(e) => setSearchParams({ ...searchParams, toDate: e.target.value })}
                        placeholder="To"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-l border-slate-200 pl-6 ml-2">
                    <span className="text-sm font-semibold text-slate-600">{t("examOfficer.time") || "Time"}:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer transition-all"
                        value={searchParams.startTime}
                        onChange={(e) => setSearchParams({ ...searchParams, startTime: e.target.value })}
                        placeholder="Start"
                      />
                      <span className="text-slate-400 font-medium">to</span>
                      <input
                        type="time"
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer transition-all"
                        value={searchParams.endTime}
                        onChange={(e) => setSearchParams({ ...searchParams, endTime: e.target.value })}
                        placeholder="End"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-l border-slate-200 pl-6 ml-2">
                    <span className="text-sm font-semibold text-slate-600">{t("examOfficer.status") || "Status"}:</span>
                    <select
                      className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer min-w-[120px]"
                      value={searchParams.status}
                      onChange={(e) => setSearchParams({ ...searchParams, status: e.target.value })}
                    >
                      <option value="">{t("examOfficer.allStatuses") || "All Statuses"}</option>
                      {EXAM_STATUSES.map((status) => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 border-l border-slate-200 pl-6 ml-2">
                    <select
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer min-w-[140px]"
                      value={searchParams.examRoomId}
                      onChange={(e) => setSearchParams({ ...searchParams, examRoomId: e.target.value })}
                    >
                      <option value="">{t("examOfficer.roomId") || "Select Room"}</option>
                      {roomsData?.data?.map((room: any) => (
                        <option key={room.id} value={room.id}>{room.roomNumber}</option>
                      ))}
                    </select>
                    <select
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer min-w-[160px]"
                      value={searchParams.proctorId}
                      onChange={(e) => setSearchParams({ ...searchParams, proctorId: e.target.value })}
                    >
                      <option value="">{t("examOfficer.proctorId") || "Select Proctor"}</option>
                      {proctorsData?.data?.map((proctor: any) => (
                        <option key={proctor.id} value={proctor.id}>{proctor.fullName || proctor.email || proctor.code}</option>
                      ))}
                    </select>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-500 hover:text-slate-900 ml-auto"
                    onClick={clearFilters}
                  >
                    {t("examOfficer.clearFilters") || "Clear All Filters"}
                  </Button>
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
                      <th className="px-6 py-4 font-semibold">{t("examOfficer.table.examCode") || "Exam Code"}</th>
                      <th className="px-6 py-4 font-semibold">{t("examOfficer.table.openCode") || "Open Code"}</th>
                      <th className="px-6 py-4 font-semibold">{t("examOfficer.table.subject") || "Subject"}</th>
                      <th className="px-6 py-4 font-semibold">{t("examOfficer.table.date") || "Exam Date"}</th>
                      <th className="px-6 py-4 font-semibold">{t("examOfficer.table.time") || "Time"}</th>
                      <th className="px-6 py-4 font-semibold">{t("examOfficer.table.type") || "Type"}</th>
                      <th className="px-6 py-4 font-semibold">{t("examOfficer.table.room") || "Room"}</th>
                      <th className="px-6 py-4 font-semibold">{t("examOfficer.table.proctor") || "Proctor"}</th>
                      <th className="px-6 py-4 font-semibold">{t("examOfficer.table.status") || "Status"}</th>
                      <th className="px-6 py-4 font-semibold">{commonT("actions") || "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {isLoading ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center">
                          <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center text-red-500">
                          <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                          {t("examOfficer.failedLoad") || "Failed to load data"}
                        </td>
                      </tr>
                    ) : visibleSchedules.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                          {t("examOfficer.noSchedules") || "No exam schedules found"}
                        </td>
                      </tr>
                    ) : (
                      visibleSchedules.map((schedule) => {
                        // Calculate actual status based on current time
                        const getComputedStatus = (): "Upcoming" | "Ongoing" | "Completed" => {
                          const now = new Date();
                          const open = schedule.examOpenTime ? parseLocalDate(schedule.examOpenTime) : null;
                          const close = schedule.examCloseTime ? parseLocalDate(schedule.examCloseTime) : null;
                          
                          if (!open || !close) return schedule.status as any || "Scheduled";
                          
                          if (now < open) return "Upcoming";
                          if (now >= open && now <= close) return "Ongoing";
                          return "Completed";
                        };

                        const computedStatus = getComputedStatus();

                        const getStatusDisplay = (status: string | null | undefined) => {
                          switch (status) {
                            case "Ongoing":
                              return {
                                label: t("examOfficer.ongoing") || "Ongoing",
                                color: "bg-green-50 text-green-600 border-green-100",
                                icon: <div className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" />
                              };
                            case "Completed":
                              return {
                                label: t("examOfficer.completed") || "Completed",
                                color: "bg-slate-100 text-slate-600 border-slate-200",
                                icon: <CheckCircle2 className="h-3 w-3" />
                              };
                            case "Upcoming":
                            default:
                              return {
                                label: t("examOfficer.upcoming") || "Upcoming",
                                color: "bg-blue-50 text-blue-600 border-blue-100",
                                icon: <Clock className="h-3 w-3" />
                              };
                          }
                        };

                        const status = getStatusDisplay(computedStatus);
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
                              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50/50 border border-orange-100/50 w-fit">
                                <Calendar className="h-4 w-4 text-orange-500" />
                                <span className="font-bold text-slate-700">
                                  {open ? format(open, "dd/MM/yyyy") : "-"}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50/50 border border-blue-100/50 w-fit">
                                <Clock className="h-4 w-4 text-blue-500" />
                                <span className="font-bold text-slate-700">
                                  {open && close ? `${format(open, "HH:mm")} - ${format(close, "HH:mm")}` : "-"}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {schedule.examType && schedule.examType.length > 0 ? (
                                  schedule.examType.map((type: string) => (
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
                              <span className="text-slate-700 font-medium">{schedule.roomNumber || "-"}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-slate-700 font-medium">{schedule.proctorName || "-"}</span>
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
                                        router.push(`/${locale}${ROUTES.EXAMS_SCHEDULE_DETAIL(schedule.id)}`);
                                        setOpenDropdown(null);
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                      {t("examOfficer.actions.viewDetails") || "View Details"}
                                    </button>
                                    <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100"
                                      onClick={() => {
                                        router.push(`/${locale}${ROUTES.EXAMS_SCHEDULE_EDIT(schedule.id)}`);
                                        setOpenDropdown(null);
                                      }}
                                    >
                                      <FileText className="h-4 w-4" />
                                      {t("examOfficer.actions.update") || "Update Schedule"}
                                    </button>
                                    {computedStatus === "Completed" && !schedule.isArchived && (
                                      <button
                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                        onClick={async () => {
                                          const loadingToast = toast.loading(t("examOfficer.archiving") || "Archiving...");
                                          try {
                                            await archiveMutation.mutateAsync(schedule.id);
                                            toast.success(t("examOfficer.archiveSuccess") || "Archived successfully");
                                            setOpenDropdown(null);
                                          } catch (err: any) {
                                            toast.error(err?.message || t("examOfficer.archiveFailed") || "Failed to archive schedule");
                                          } finally {
                                            toast.dismiss(loadingToast);
                                          }
                                        }}
                                        disabled={archiveMutation.isPending}
                                      >
                                        <Archive className="h-4 w-4" />
                                        {archiveMutation.isPending ? t("examOfficer.archiving") : t("examOfficer.actions.archive")}
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
                  {t("pagination.showing") || "Showing page"} <span className="font-medium">{page}</span> {t("pagination.of") || "of"} <span className="font-medium">{totalPages || 1}</span> ({data?.meta?.total || 0} {t("examOfficer.schedules") || "exam schedules"})
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 bg-white disabled:opacity-40"
                    disabled={page === 1}
                    onClick={() => setPage(1)}
                  >
                    {t("pagination.first") || "First"}
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

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {(() => {
                      const pages = [];
                      const startPage = Math.max(1, page <= 5 ? 1 : page - 4);
                      const endPage = Math.min(totalPages, startPage + 4);

                      for (let p = startPage; p <= endPage; p++) {
                        pages.push(
                          <Button
                            key={p}
                            variant="outline"
                            size="sm"
                            className={`h-8 w-8 p-0 ${page === p ? "bg-orange-500 text-white border-orange-500" : "bg-white"}`}
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </Button>
                        );
                      }
                      return pages;
                    })()}
                  </div>

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
                    {t("pagination.last") || "Last"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      <ImportScheduleDialog
        isOpen={showScheduleDialog}
        onClose={() => setShowScheduleDialog(false)}
      />
      <ImportProctorDialog
        isOpen={showProctorDialog}
        onClose={() => setShowProctorDialog(false)}
      />
      <ImportExamCodeDialog
        isOpen={showExamCodeDialog}
        onClose={() => setShowExamCodeDialog(false)}
      />
    </div>
  );
}
