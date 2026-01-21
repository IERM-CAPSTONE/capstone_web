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
} from "lucide-react";
import { format } from "date-fns";
import { useExamScheduleById, useArchiveExamSchedule } from "@/hooks/use-exam-schedules";
import SeatingPlan from "../components/SeatingPlan";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslations } from "next-intl";
import { getCurrentLocale } from "@/hooks/use-check-auth";
import { parseLocalDate } from "../utils";

export default function ExamScheduleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const scheduleId = params.id as string;
  const locale = getCurrentLocale();
  const t = useTranslations("Dashboard");
  const commonT = useTranslations("Common");

  const { data: schedule, isLoading, error } = useExamScheduleById(scheduleId);
  const archiveMutation = useArchiveExamSchedule();

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

  const getStatusDisplay = (apiStatus: string | null | undefined) => {
    switch (apiStatus) {
      case "Ongoing":
        return {
          label: t("examOfficer.ongoing") || "Ongoing",
          color: "bg-green-500 text-white",
          icon: <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
        };
      case "Ended":
        return {
          label: t("examOfficer.completed") || "Completed",
          color: "bg-slate-500 text-white",
          icon: <CheckCircle2 className="h-3.5 w-3.5" />
        };
      case "Scheduled":
      default:
        return {
          label: t("examOfficer.upcoming") || "Upcoming",
          color: "bg-blue-500 text-white",
          icon: <Clock className="h-3.5 w-3.5" />
        };
    }
  };

  const status = getStatusDisplay(schedule.status);

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
        <span className="text-slate-900 font-medium">Schedule Detail</span>
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
            Refresh
          </Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
            onClick={() => router.push(`/${locale}${ROUTES.EXAMS_SCHEDULE_EDIT(schedule.id)}`)}
          >
            <Edit className="h-4 w-4" />
            Edit
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
                Schedule Overview
              </h2>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Semester</p>
                  <p className="font-semibold text-slate-900">{schedule.semester || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Exam Type</p>
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
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Exam Date</p>
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    {open ? format(open, "dd/MM/yyyy") : "N/A"}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Duration</p>
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <Clock className="h-4 w-4 text-blue-500" />
                    {open && close ? `${format(open, "HH:mm")} - ${format(close, "HH:mm")}` : "N/A"}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Room</p>
                  <p className="font-semibold text-slate-900">{schedule.roomNumber || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Invigilator</p>
                  <p className="font-semibold text-slate-900">{schedule.proctorId || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description & Notes */}
          <Card className="border-none shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-50/50 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Description & Notes
              </h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Note</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{schedule.note || "No notes provided."}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-1">Internal Information</h4>
                    <p className="text-sm text-yellow-700">Open Code: <span className="font-bold">{schedule.openCode || "N/A"}</span></p>
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
                {schedule.status === "Ongoing" ? "This exam session is currently in progress." :
                  schedule.status === "Ended" ? "This exam session has been completed." :
                    "This exam session is scheduled for the future."}
              </p>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-none shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-orange-50/50 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-sm">Quick Actions</h2>
            </div>
            <CardContent className="p-4 space-y-3">
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-2 justify-center"
                onClick={() => router.push(`/${locale}${ROUTES.EXAMS_SCHEDULE_EDIT(schedule.id)}`)}
              >
                <Edit className="h-4 w-4" />
                Edit Schedule
              </Button>
              {schedule.status === "Ended" && (
                <Button
                  variant="outline"
                  className="w-full gap-2 justify-center text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 bg-white"
                  onClick={async () => {
                    try {
                      await archiveMutation.mutateAsync(schedule.id);
                      router.push(`/${locale}${ROUTES.EXAMS_SCHEDULE}`);
                    } catch (err: any) {
                      alert(err?.message || "Failed to archive schedule");
                    }
                  }}
                  disabled={archiveMutation.isPending}
                >
                  <Archive className="h-4 w-4" />
                  {archiveMutation.isPending ? "Archiving..." : "Archive Schedule"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
