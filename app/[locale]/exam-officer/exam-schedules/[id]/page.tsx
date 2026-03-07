"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Calendar,
  Clock,
  FileText,
  AlertCircle,
  Edit,
  ArrowUp,
  Archive,
  LayoutGrid,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Loader2,
  MoreVertical,
  Users,
  UserCheck,
} from "lucide-react";
import { format } from "date-fns";
import { useExamScheduleById, useArchiveExamSchedule } from "@/hooks/use-exam-schedules";
import SeatingPlan from "../components/SeatingPlan";
import { AssignProctorDialog } from "../components/AssignProctorDialog";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslations } from "next-intl";
import { getCurrentLocale } from "@/hooks/use-check-auth";
import { parseLocalDate } from "../utils";
import { toast } from "sonner";
import { examSchedulesApi } from "@/lib/api/exam-schedules";

export default function ExamScheduleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const scheduleId = params.id as string;
  const locale = getCurrentLocale();
  const t = useTranslations("Dashboard");
  const commonT = useTranslations("Common");

  const { data: schedule, isLoading, error, refetch } = useExamScheduleById(scheduleId);
  const archiveMutation = useArchiveExamSchedule();
  const [showAssignProctor, setShowAssignProctor] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !schedule) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-slate-600">{t("examOfficer.failedLoad") || "Failed to load schedule"}</p>
        <Button onClick={() => router.push(`/${locale}${ROUTES.EXAMS_SCHEDULE}`)}>
          {commonT("back") || "Back to Dashboard"}
        </Button>
      </div>
    );
  }

  const open = schedule.examOpenTime ? parseLocalDate(schedule.examOpenTime) : null;
  const close = schedule.examCloseTime ? parseLocalDate(schedule.examCloseTime) : null;

  // Calculate actual status based on current time
  const getComputedStatus = (): "Upcoming" | "Ongoing" | "Completed" => {
    const now = new Date();
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
          color: "bg-green-500 text-white",
          icon: <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
        };
      case "Completed":
        return {
          label: t("examOfficer.completed") || "Completed",
          color: "bg-slate-500 text-white",
          icon: <CheckCircle2 className="h-3.5 w-3.5" />
        };
      case "Upcoming":
      default:
        return {
          label: t("examOfficer.upcoming") || "Upcoming",
          color: "bg-blue-500 text-white",
          icon: <Clock className="h-3.5 w-3.5" />
        };
    }
  };

  const status = getStatusDisplay(computedStatus);

  const handleAssignProctor = async (proctorId: string | null) => {
    await examSchedulesApi.update(scheduleId, { proctorId });
    toast.success(proctorId ? "Proctor assigned successfully!" : "Proctor unassigned.");
    if (typeof refetch === 'function') refetch();
    else window.location.reload();
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6 bg-slate-50/50 min-h-screen">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <LayoutGrid className="h-4 w-4" />
        <span>{t("title")}</span>
        <ChevronRight className="h-3 w-3" />
        <button
          onClick={() => router.push(`/${locale}${ROUTES.EXAMS_SCHEDULE}`)}
          className="hover:text-slate-900 cursor-pointer"
        >
          {t("examOfficerPortal")}
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-900 font-medium">{t("examOfficer.detailSchedule.scheduleDetail")}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <FileText className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Exam Code</p>
              <h1 className="text-2xl font-bold text-slate-900">{schedule.examCode || "N/A"}</h1>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-slate-400" />
              <span className="text-slate-700 font-medium">{schedule.subjectCode || "N/A"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 bg-white"
            onClick={() => window.location.reload()}
          >
            {t("examOfficer.detailSchedule.refresh")}
          </Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
            onClick={() => router.push(`/${locale}${ROUTES.EXAMS_SCHEDULE_EDIT(schedule.id)}`)}
          >
            <Edit className="h-4 w-4" />
            {t("examOfficer.detailSchedule.editSchedule")}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Schedule Overview */}
          <Card className="border-none shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-orange-50/50 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                {t("examOfficer.detailSchedule.scheduleOverview")}
              </h2>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{t("examOfficer.detailSchedule.semester")}</p>
                  <p className="font-semibold text-slate-900">{schedule.semester || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{t("examOfficer.detailSchedule.examType")}</p>
                  <div className="flex flex-wrap gap-1">
                    {schedule.examType && schedule.examType.length > 0 ? (
                      schedule.examType.map((type) => (
                        <span key={type} className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-500 border border-red-100">
                          {type}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 text-sm">N/A</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{t("examOfficer.detailSchedule.examDate")}</p>
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    {open ? format(open, "dd/MM/yyyy") : "N/A"}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{t("examOfficer.detailSchedule.duration")}</p>
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <Clock className="h-4 w-4 text-blue-500" />
                    {open && close ? `${format(open, "HH:mm")} - ${format(close, "HH:mm")}` : "N/A"}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{t("examOfficer.detailSchedule.room")}</p>
                  <p className="font-semibold text-slate-900">{schedule.roomNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{t("examOfficer.detailSchedule.invigilator")}</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{schedule.proctorName || schedule.proctorId || "N/A"}</p>
                    <button
                      onClick={() => setShowAssignProctor(true)}
                      className="text-xs text-orange-500 hover:text-orange-700 underline ml-1"
                    >
                      {schedule.proctorId ? "Change" : "Assign"}
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description & Notes */}
          <Card className="border-none shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-50/50 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                {t("examOfficer.detailSchedule.descriptionNotes")}
              </h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">{t("examOfficer.detailSchedule.note")}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{schedule.note || t("examOfficer.detailSchedule.noNotesProvided")}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-1">{t("examOfficer.detailSchedule.internalInformation")}</h4>
                    <p className="text-sm text-yellow-700">{t("examOfficer.detailSchedule.openCode")}: <span className="font-bold">{schedule.openCode || "N/A"}</span></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visual Seating Plan */}
          <SeatingPlan
            examSessionId={schedule.id}
            maxRows={schedule.maxRows ?? null}
            maxColumns={schedule.maxColumns ?? null}
            totalSeats={schedule.totalSeats ?? null}
          />
        </div>

        {/* Right Column - Quick Actions */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card className="border-none shadow-sm overflow-hidden bg-gradient-to-br from-blue-50 to-blue-50/50">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase ${status.color}`}>
                  {status.icon}
                  {status.label}
                </span>
              </div>
              <p className="text-center text-sm text-slate-600 leading-relaxed">
                {computedStatus === "Ongoing" ? t("examOfficer.detailSchedule.statusOngoing") :
                  computedStatus === "Completed" ? t("examOfficer.detailSchedule.statusCompleted") :
                    t("examOfficer.detailSchedule.statusUpcoming")}
              </p>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-none shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-orange-50/50 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-sm">{t("examOfficer.detailSchedule.quickActions")}</h2>
            </div>
            <CardContent className="p-4 space-y-3">
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-2 justify-center"
                onClick={() => router.push(`/${locale}${ROUTES.EXAMS_SCHEDULE_EDIT(schedule.id)}`)}
              >
                <Edit className="h-4 w-4" />
                {t("examOfficer.detailSchedule.editSchedule")}
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 justify-center border-orange-200 bg-white hover:bg-orange-50 text-orange-700 font-semibold"
                onClick={() => setShowAssignProctor(true)}
              >
                <UserCheck className="h-4 w-4" />
                {schedule.proctorId ? "Change Proctor" : "Assign Proctor"}
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 justify-center border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
                onClick={() => router.push(`/${locale}${ROUTES.EXAMS_SCHEDULE_STUDENTS(schedule.id)}`)}
              >
                <Users className="h-4 w-4 text-blue-500" />
                {t("examOfficer.detailSchedule.viewStudents")}
              </Button>
              {computedStatus === "Completed" && !schedule.isArchived && (
                <Button
                  variant="outline"
                  className="w-full gap-2 justify-center text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 bg-white"
                  onClick={async () => {
                    const loadingToast = toast.loading(t("examOfficer.detailSchedule.archiving") || "Archiving...");
                    try {
                      await archiveMutation.mutateAsync(schedule.id);
                      toast.success(t("examOfficer.archiveSuccess") || "Archived successfully");
                      router.push(`/${locale}${ROUTES.EXAMS_SCHEDULE}`);
                    } catch (err: any) {
                      toast.error(err?.message || t("examOfficer.archiveFailed") || "Failed to archive schedule");
                    } finally {
                      toast.dismiss(loadingToast);
                    }
                  }}
                  disabled={archiveMutation.isPending}
                >
                  <Archive className="h-4 w-4" />
                  {archiveMutation.isPending ? t("examOfficer.detailSchedule.archiving") : t("examOfficer.detailSchedule.archiveSchedule")}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign Proctor Dialog */}
      <AssignProctorDialog
        isOpen={showAssignProctor}
        onClose={() => setShowAssignProctor(false)}
        currentProctorId={schedule.proctorId}
        currentProctorName={schedule.proctorName}
        onConfirm={handleAssignProctor}
      />
    </div>
  );
}
