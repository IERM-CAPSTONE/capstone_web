"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building2,
  Ticket,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Clock,
  BookOpen,
  ScanLine,
  PhoneCall,
  FileText,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Radio,
  ClipboardList,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { examSchedulesApi, ExamSchedule } from "@/lib/api/exam-schedules";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/constants/routes";
import { getCurrentLocale } from "@/hooks/use-check-auth";
import { parseLocalDate } from "@/app/[locale]/exam-officer/exam-schedules/utils";

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type FilterMode = "today" | "this-week" | "next-week";

function getSessionStatus(session: ExamSchedule): "Upcoming" | "In Progress" | "Completed" {
  const now = new Date();
  const open = session.examOpenTime ? parseLocalDate(session.examOpenTime) : null;
  const close = session.examCloseTime ? parseLocalDate(session.examCloseTime) : null;
  if (!open) return "Upcoming";
  if (now < open) return "Upcoming";
  if (close && now > close) return "Completed";
  return "In Progress";
}

function formatTime(iso?: string | null) {
  if (!iso) return "—";
  const d = parseLocalDate(iso);
  if (!d) return "—";
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(iso?: string | null) {
  if (!iso) return "";
  const d = parseLocalDate(iso);
  if (!d) return "";
  return d.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "numeric" });
}

function getMondayOfWeek(refDate: Date, offsetWeeks = 0): Date {
  const d = new Date(refDate);
  const dayOfWeek = d.getDay();
  const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diffToMon + offsetWeeks * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isInDateRange(iso: string | null | undefined, start: Date, end: Date): boolean {
  if (!iso) return false;
  const d = parseLocalDate(iso);
  if (!d) return false;
  return d >= start && d <= end;
}

function getWeekDates(weekOffset: 0 | 1): { start: Date; end: Date } {
  const now = new Date();
  const start = getMondayOfWeek(now, weekOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getTodayRange(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getExamTypeBadge(examType?: string | null) {
  const map: Record<string, { label: string; color: string }> = {
    PE: { label: "PE", color: "bg-violet-100 text-violet-700" },
    FE: { label: "FE", color: "bg-teal-100 text-teal-700" },
    TE: { label: "TE", color: "bg-sky-100 text-sky-700" },
    RE: { label: "RE", color: "bg-rose-100 text-rose-700" },
  };
  return examType ? map[examType] ?? { label: examType, color: "bg-gray-100 text-gray-600" } : null;
}

// Countdown hook
function useCountdown(targetTime?: string | null) {
  const [diff, setDiff] = useState<number | null>(null);
  useEffect(() => {
    if (!targetTime) { setDiff(null); return; }
    const target = parseLocalDate(targetTime);
    if (!target) { setDiff(null); return; }
    const tick = () => {
      const ms = target.getTime() - Date.now();
      setDiff(ms > 0 ? ms : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetTime]);
  return diff;
}

function CountdownBadge({ targetTime }: { targetTime?: string | null }) {
  const diff = useCountdown(targetTime);
  if (diff === null) return null;
  if (diff === 0) return <span className="text-xs font-bold text-orange-500 animate-pulse">{t("inProgress")}</span>;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const parts = [
    h > 0 ? `${h}g` : "",
    `${String(m).padStart(2, "0")}p`,
    `${String(s).padStart(2, "0")}s`,
  ].filter(Boolean);
  return (
    <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
      <Clock className="h-3 w-3" />
      {parts.join(" ")}
    </span>
  );
}

// â”€â”€â”€ Status styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STATUS_STYLES = {
  "Upcoming": {
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <Clock className="h-3.5 w-3.5" />,
    bar: "bg-blue-400",
  },
  "In Progress": {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <Radio className="h-3.5 w-3.5 animate-pulse" />,
    bar: "bg-emerald-400",
  },
  "Completed": {
    dot: "bg-gray-400",
    badge: "bg-gray-50 text-gray-600 border-gray-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    bar: "bg-gray-300",
  },
};

const ITEMS_PER_PAGE = 6;

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ProctorDashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const locale = getCurrentLocale();
  const t = useTranslations("ProctorDashboard");

  const [sessions, setSessions] = useState<ExamSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterMode>("today");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchSessions = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await examSchedulesApi.list({ proctorId: user.id, limit: 200 });
      setSessions(res.data ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "KhÃ´ng thá»ƒ táº£i lá»‹ch thi.");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // â”€â”€ Filtered sessions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filtered = useMemo(() => {
    let range: { start: Date; end: Date };
    if (activeFilter === "today") range = getTodayRange();
    else if (activeFilter === "this-week") range = getWeekDates(0);
    else range = getWeekDates(1);

    return sessions
      .filter(s => isInDateRange(s.examOpenTime, range.start, range.end))
      .sort((a, b) => {
        const ta = a.examOpenTime ? parseLocalDate(a.examOpenTime)?.getTime() ?? 0 : 0;
        const tb = b.examOpenTime ? parseLocalDate(b.examOpenTime)?.getTime() ?? 0 : 0;
        return ta - tb;
      });
  }, [sessions, activeFilter]);

  // â”€â”€ Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const todaySessions = useMemo(() => {
    const { start, end } = getTodayRange();
    return sessions.filter(s => isInDateRange(s.examOpenTime, start, end));
  }, [sessions]);

  const nextUpcoming = useMemo(() =>
    todaySessions.find(s => getSessionStatus(s) === "Upcoming"),
    [todaySessions]
  );
  const inProgress = useMemo(() =>
    todaySessions.filter(s => getSessionStatus(s) === "In Progress"),
    [todaySessions]
  );
  const completedToday = useMemo(() =>
    todaySessions.filter(s => getSessionStatus(s) === "Completed").length,
    [todaySessions]
  );

  // â”€â”€ Pagination â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  // â”€â”€ Week range label â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const weekRangeLabel = useMemo(() => {
    const w = activeFilter === "next-week" ? getWeekDates(1) : getWeekDates(0);
    const fmt = (d: Date) => d.toLocaleDateString(dateLocale, { day: "numeric", month: "numeric" });
    return `${fmt(w.start)} - ${fmt(w.end)}`;
  }, [activeFilter]);

  const todayLabel = new Date().toLocaleDateString(dateLocale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  // â”€â”€ Filter change â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleFilterChange = (f: FilterMode) => {
    setActiveFilter(f);
    setCurrentPage(1);
  };

  const STATUS_LABELS = {
    "Upcoming": t("statusUpcoming"),
    "In Progress": t("statusInProgress"),
    "Completed": t("statusCompleted"),
  } as const;

  return (
    <div className="min-h-screen bg-[#f6f7fb] p-4 md:p-6 lg:p-8">

      {/* â”€â”€ Page Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-indigo-500 uppercase tracking-widest">{t("roleLabel")}</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
          {t("hello", { name: user?.name?.split(" ").pop() ?? t("roleFallback") })} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1 capitalize">{todayLabel}</p>
      </div>

      {/* â”€â”€ Hero Stats Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {/* Today sessions */}
        <div className="col-span-2 lg:col-span-1 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 p-5 text-white shadow-md shadow-indigo-200 flex flex-col justify-between min-h-[130px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold opacity-80 uppercase tracking-wider">{t("todaySessions")}</span>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-white" />
            </div>
          </div>
          <div>
            <p className="text-4xl font-extrabold">{isLoading ? "â€”" : todaySessions.length}</p>
            <p className="text-xs opacity-75 mt-1">{t("assignedSessions")}</p>
          </div>
        </div>

        {/* In Progress */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 flex flex-col justify-between min-h-[130px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("inProgress")}</span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
              <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
            </div>
          </div>
          <div>
            <p className="text-4xl font-extrabold text-gray-900">{isLoading ? "â€”" : inProgress.length}</p>
            <p className="text-xs text-gray-400 mt-1">{t("examRooms")}</p>
          </div>
        </div>

        {/* Completed */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 flex flex-col justify-between min-h-[130px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("completed")}</span>
            <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-teal-500" />
            </div>
          </div>
          <div>
            <p className="text-4xl font-extrabold text-gray-900">{isLoading ? "â€”" : completedToday}</p>
            <p className="text-xs text-gray-400 mt-1">{t("todaySessionsCount")}</p>
          </div>
        </div>

        {/* Next session */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 flex flex-col justify-between min-h-[130px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("nextSession")}</span>
            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
              <Clock className="h-4 w-4 text-orange-500" />
            </div>
          </div>
          {nextUpcoming ? (
            <div>
              <p className="text-sm font-bold text-gray-900 truncate">{nextUpcoming.subjectCode ?? "—"}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t("room")} {nextUpcoming.roomNumber ?? "?"}</p>
              <div className="mt-1">
                <CountdownBadge targetTime={nextUpcoming.examOpenTime} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">{isLoading ? "..." : t("noNextSession")}</p>
          )}
        </div>
      </div>

      {/* â”€â”€ Main layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* â”€â”€ Session List (main) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="xl:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">{t("mySchedule")}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {activeFilter === "today" ? todayLabel : weekRangeLabel}
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-0.5">
                {(
                  [
                    { key: "today", label: t("today") },
                    { key: "this-week", label: t("thisWeek") },
                    { key: "next-week", label: t("nextWeek") },
                  ] as { key: FilterMode; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => handleFilterChange(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                      activeFilter === tab.key
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-4 md:p-6">
              {/* Loading */}
              {isLoading && (
                <div className="flex flex-col items-center py-16 gap-3 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                  <p className="text-sm">{t("loading")}</p>
                </div>
              )}

              {/* Error */}
              {!isLoading && error && (
                <div className="flex flex-col items-center py-12 gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-red-400" />
                  </div>
                  <p className="text-sm text-red-500">{error}</p>
                  <button
                    onClick={fetchSessions}
                    className="text-xs font-medium text-indigo-600 hover:underline"
                  >
                    {t("tryAgain")}
                  </button>
                </div>
              )}

              {/* Empty */}
              {!isLoading && !error && filtered.length === 0 && (
                <div className="flex flex-col items-center py-16 gap-3 text-gray-400">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
                    <Calendar className="h-7 w-7 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">
                    {activeFilter === "today"
                      ? t("noExamsToday") : activeFilter === "this-week" ? t("noExamsWeek") : t("noExamsNextWeek")}
                  </p>
                  <p className="text-xs text-gray-400">{t("noPeriodSub")}</p>
                </div>
              )}

              {/* Session Cards */}
              {!isLoading && !error && filtered.length > 0 && (
                <>
                  <div className="space-y-3">
                    {paginated.map((session) => {
                      const status = getSessionStatus(session);
                      const st = STATUS_STYLES[status];
                      const statusLabel = STATUS_LABELS[status];
                      const examBadge = getExamTypeBadge(session.examType);
                      const isOngoing = status === "In Progress";

                      return (
                        <div
                          key={session.id}
                          onClick={() =>
                            router.push(`/${locale}${ROUTES.PROCTOR_EXAM_SESSION_DETAIL(session.id)}`)
                          }
                          className={`group relative flex items-stretch gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                            isOngoing
                              ? "bg-gradient-to-r from-emerald-50/60 to-white border-emerald-200"
                              : "bg-white border-gray-100 hover:border-indigo-200"
                          }`}
                        >
                          {/* Left accent bar */}
                          <div className={`w-1 rounded-full flex-shrink-0 ${st.bar}`} />

                          {/* Time column */}
                          <div className="flex flex-col items-center justify-center w-14 flex-shrink-0 gap-1">
                            <span className="text-sm font-bold text-gray-900 tabular-nums">
                              {formatTime(session.examOpenTime)}
                            </span>
                            <div className="w-px h-4 bg-gray-200" />
                            <span className="text-xs text-gray-400 tabular-nums">
                              {formatTime(session.examCloseTime)}
                            </span>
                          </div>

                          {/* Main info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-bold text-gray-900 text-sm">
                                {session.subjectCode ?? t("examFallback")}
                              </h3>
                              {examBadge && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${examBadge.color}`}>
                                  {examBadge.label}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                              {session.roomNumber && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {t("room")} {session.roomNumber}
                                </span>
                              )}
                              {session.examCode && (
                                <span className="flex items-center gap-1 text-gray-400">
                                  <ClipboardList className="h-3 w-3" />
                                  {session.examCode}
                                </span>
                              )}
                              {session.studentCount > 0 && (
                                <span className="flex items-center gap-1 text-gray-400">
                                  <BookOpen className="h-3 w-3" />
                                  {t("studentCount", { count: session.studentCount })}
                                </span>
                              )}
                              {activeFilter !== "today" && session.examOpenTime && (
                                <span className="text-gray-400">{formatDateLabel(session.examOpenTime)}</span>
                              )}
                            </div>
                          </div>

                          {/* Right: status + countdown + action */}
                          <div className="flex flex-col items-end justify-between flex-shrink-0 gap-2">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${st.badge}`}>
                              {st.icon}
                              {statusLabel}
                            </span>
                            {status === "Upcoming" && (
                              <CountdownBadge targetTime={session.examOpenTime} />
                            )}
                            {status === "In Progress" && (
                              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {t("live")}
                              </span>
                            )}
                            <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${
                            currentPage === i + 1
                              ? "bg-indigo-600 text-white shadow"
                              : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* â”€â”€ Right sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="xl:col-span-1 space-y-5">

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">{t("quickActions")}</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  icon: <Building2 className="h-5 w-5" />,
                  label: t("examRoomsAction"),
                  color: "bg-indigo-50 text-indigo-600",
                  onClick: () => router.push(ROUTES.EXAMS_SCHEDULE),
                },
                {
                  icon: <Ticket className="h-5 w-5" />,
                  label: t("viewTickets"),
                  color: "bg-blue-50 text-blue-600",
                  onClick: () => router.push(ROUTES.PROCTOR_TICKETS),
                },
                {
                  icon: <Plus className="h-5 w-5" />,
                  label: t("createTicket"),
                  color: "bg-orange-50 text-orange-600",
                  onClick: () => router.push(ROUTES.PROCTOR_TICKETS),
                },
                {
                  icon: <ScanLine className="h-5 w-5" />,
                  label: t("checkIn"),
                  color: "bg-emerald-50 text-emerald-600",
                  onClick: () => {},
                },
                {
                  icon: <PhoneCall className="h-5 w-5" />,
                  label: t("support"),
                  color: "bg-teal-50 text-teal-600",
                  onClick: () => {},
                },
                {
                  icon: <FileText className="h-5 w-5" />,
                  label: t("guide"),
                  color: "bg-violet-50 text-violet-600",
                  onClick: () => {},
                },
              ].map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.onClick}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color}`}>
                    {action.icon}
                  </div>
                  <span className="text-[11px] font-medium text-gray-600 text-center leading-tight">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Alerts / Reminders */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">{t("reminders")}</h3>
            <div className="space-y-3">
              {nextUpcoming ? (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-50 border border-orange-100">
                  <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-orange-700">{t("nextSessionStarting")}</p>
                    <p className="text-[11px] text-orange-600 mt-0.5">
                      {nextUpcoming.subjectCode} · {t("room")} {nextUpcoming.roomNumber ?? "?"} · {formatTime(nextUpcoming.examOpenTime)}
                    </p>
                  </div>
                </div>
              ) : inProgress.length > 0 ? (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Radio className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-700">{t("hasOngoingSession")}</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">
                      {inProgress[0].subjectCode} · {t("room")} {inProgress[0].roomNumber ?? "?"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{t("noReminders")}</p>
                </div>
              )}

              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ClipboardList className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-700">{t("totalExamSchedules")}</p>
                  <p className="text-[11px] text-blue-600 mt-0.5">
                    {t("assignedSessionSummary", { count: sessions.length })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

