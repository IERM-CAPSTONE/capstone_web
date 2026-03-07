"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Ticket, Plus, Calendar, ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { examSchedulesApi, ExamSchedule } from "@/lib/api/exam-schedules";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { getCurrentLocale } from "@/hooks/use-check-auth";
import { useTranslations } from "next-intl";

function getSessionStatus(session: ExamSchedule): "Upcoming" | "In Progress" | "Completed" {
  const now = new Date();
  const open = session.examOpenTime ? new Date(session.examOpenTime) : null;
  const close = session.examCloseTime ? new Date(session.examCloseTime) : null;
  if (!open) return "Upcoming";
  if (now < open) return "Upcoming";
  if (close && now > close) return "Completed";
  return "In Progress";
}

function getStatusColor(status: string) {
  switch (status) {
    case "Upcoming": return "bg-blue-500";
    case "In Progress": return "bg-orange-500";
    case "Completed": return "bg-gray-400";
    default: return "bg-gray-300";
  }
}

function getStatusBadgeColor(status: string) {
  switch (status) {
    case "Upcoming": return "bg-blue-100 text-blue-700 border-blue-200";
    case "In Progress": return "bg-orange-100 text-orange-700 border-orange-200";
    case "Completed": return "bg-gray-100 text-gray-700 border-gray-200";
    default: return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function formatTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function isToday(iso?: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

function isSameWeek(iso?: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  // Week starts on Monday (1), not Sunday (0)
  const dayOfWeek = n.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startOfWeek = new Date(n);
  startOfWeek.setDate(n.getDate() + diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return d >= startOfWeek && d <= endOfWeek;
}

const ITEMS_PER_PAGE = 5;

export default function ProctorDashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const locale = getCurrentLocale();
  const t = useTranslations("ProctorDashboard");
  const [sessions, setSessions] = useState<ExamSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"today" | "week">("today");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchSessions = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await examSchedulesApi.list({ proctorId: user.id, limit: 100 });
      setSessions(res.data ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load exam sessions.");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Compute filtered list
  const filtered = sessions.filter(s =>
    activeFilter === "today" ? isToday(s.examOpenTime) : isSameWeek(s.examOpenTime)
  );

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Stats
  const totalExams = sessions.length;
  const totalStudents = 0; // Not directly available from session list
  const upcomingToday = sessions.filter(s => isToday(s.examOpenTime) && getSessionStatus(s) === "Upcoming").length;

  // Week grouping for calendar view
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();

  // Translated status labels
  const STATUS_LABEL: Record<string, string> = {
    "Upcoming": t("statusUpcoming"),
    "In Progress": t("statusInProgress"),
    "Completed": t("statusCompleted"),
  };
  const weekStart = new Date(now);
  const dayOfWeekNow = now.getDay();
  const diffToMon = dayOfWeekNow === 0 ? -6 : 1 - dayOfWeekNow;
  weekStart.setDate(now.getDate() + diffToMon);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {user?.name ? t("welcomeBack", { name: user.name }) : t("welcomeDefault")} {t("examOverview")}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{t("quickActions")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button className="h-12 bg-green-600 hover:bg-green-700 text-white font-medium"
            onClick={() => router.push(ROUTES.EXAMS_SCHEDULE)}>
            <Building2 className="mr-2 h-5 w-5" /> {t("viewExamRooms")}
          </Button>
          <Button className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium">
            <Ticket className="mr-2 h-5 w-5" /> {t("viewTickets")}
          </Button>
          <Button className="h-12 bg-orange-600 hover:bg-orange-700 text-white font-medium">
            <Plus className="mr-2 h-5 w-5" /> {t("createTicket")}
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Statistics */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">{t("statistics")}</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t("totalExams")}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin inline" /> : totalExams}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t("upcomingToday")}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin inline" /> : upcomingToday}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Exam Schedule */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{t("mySchedule")}</h3>
                <div className="flex gap-2">
                  <Button variant={activeFilter === "today" ? "primary" : "outline"} size="sm"
                    onClick={() => { setActiveFilter("today"); setCurrentPage(1); }}
                    className={activeFilter === "today" ? "bg-orange-600 hover:bg-orange-700" : ""}>
                    {t("today")}
                  </Button>
                  <Button variant={activeFilter === "week" ? "primary" : "outline"} size="sm"
                    onClick={() => { setActiveFilter("week"); setCurrentPage(1); }}
                    className={activeFilter === "week" ? "bg-orange-600 hover:bg-orange-700" : ""}>
                    {t("thisWeek")}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  {activeFilter === "today"
                    ? new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
                    : `${weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                </span>
              </div>

              {/* Loading */}
              {isLoading && (
                <div className="flex flex-col items-center py-16 gap-3 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                  <p className="text-sm">{t("loading")}</p>
                </div>
              )}

              {/* Error */}
              {!isLoading && error && (
                <div className="flex flex-col items-center py-12 gap-3">
                  <AlertCircle className="h-8 w-8 text-red-400" />
                  <p className="text-sm text-red-500">{error}</p>
                  <Button variant="outline" size="sm" onClick={fetchSessions}>{t("tryAgain")}</Button>
                </div>
              )}

              {/* Empty */}
              {!isLoading && !error && filtered.length === 0 && (
                <div className="flex flex-col items-center py-16 gap-2 text-gray-400">
                  <Calendar className="h-10 w-10 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">
                    {activeFilter === "today" ? t("noExamsToday") : t("noExamsWeek")}
                  </p>
                  <p className="text-xs text-gray-400">{t("noPeriodSub")}</p>
                </div>
              )}

              {/* List */}
              {!isLoading && !error && filtered.length > 0 && (
                <>
                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mb-4">
                      <Button variant="outline" size="sm" disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <Button key={i + 1} variant="outline" size="sm"
                          className={currentPage === i + 1 ? "bg-orange-600 text-white hover:bg-orange-700" : ""}
                          onClick={() => setCurrentPage(i + 1)}>
                          {i + 1}
                        </Button>
                      ))}
                      <Button variant="outline" size="sm" disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <div className="space-y-3">
                    {paginated.map(session => {
                      const status = getSessionStatus(session);
                      return (
                        <div key={session.id}
                          className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer"
                          onClick={() => router.push(`/${locale}${ROUTES.PROCTOR_EXAM_SESSION_DETAIL(session.id)}`)}>
                          {/* Time */}
                          <div className="flex flex-col items-center justify-center w-16">
                            <div className={`w-12 h-12 rounded-full ${getStatusColor(status)} flex items-center justify-center`}>
                              <Calendar className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-xs font-medium text-gray-900 mt-1">{formatTime(session.examOpenTime)}</span>
                          </div>
                          {/* Details */}
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{session.subjectCode ?? "Exam"}</h4>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              {session.roomNumber && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-4 w-4" /> {t("room")} {session.roomNumber}
                                </span>
                              )}
                              {session.examCode && (
                                <span className="text-xs text-gray-400">{t("examCode")}: {session.examCode}</span>
                              )}
                            </div>
                          </div>
                          {/* Status */}
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(status)}`}>
                            {STATUS_LABEL[status] ?? status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
