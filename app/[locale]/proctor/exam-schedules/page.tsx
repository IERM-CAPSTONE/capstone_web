"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData } from "@tanstack/react-query";
import { addDays, eachDayOfInterval, format, parseISO, startOfWeek } from "date-fns";
import {
  Activity,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Layers,
  MapPin,
  MoreVertical,
  RotateCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SearchableSelect from "@/components/ui/searchable-select";
import { useAuthStore } from "@/store/auth-store";
import { useExamSchedules } from "@/hooks/use-exam-schedules";
import { useRooms } from "@/hooks/use-rooms";
import { useSubjects } from "@/hooks/use-subjects";
import { ROUTES } from "@/lib/constants/routes";
import { parseLocalDate } from "@/app/[locale]/exam-officer/exam-schedules/utils";
import { CAMPUSES } from "@/lib/constants/exam";
import { useTranslations } from "next-intl";
import { getCurrentLocale } from "@/hooks/use-check-auth";
import { usersApi } from "@/lib/api/users";

const FIXED_SLOTS = [
  { id: 1, start: "07:30", timeRange: "07:30 - 09:00" },
  { id: 2, start: "09:10", timeRange: "09:10 - 10:40" },
  { id: 3, start: "10:50", timeRange: "10:50 - 12:20" },
  { id: 4, start: "12:50", timeRange: "12:50 - 14:20" },
  { id: 5, start: "14:30", timeRange: "14:30 - 16:00" },
  { id: 6, start: "16:10", timeRange: "16:10 - 17:40" },
];

const campusThemes: Record<string, { badge: string; bg: string; border: string; text: string; shadow: string }> = {
  HN: { badge: "bg-blue-600", bg: "bg-blue-50/30", border: "border-blue-100", text: "text-blue-700", shadow: "shadow-blue-100" },
  HCM: { badge: "bg-orange-600", bg: "bg-orange-50/30", border: "border-orange-100", text: "text-orange-700", shadow: "shadow-orange-100" },
  DN: { badge: "bg-emerald-600", bg: "bg-emerald-50/30", border: "border-emerald-100", text: "text-emerald-700", shadow: "shadow-emerald-100" },
  QN: { badge: "bg-rose-600", bg: "bg-rose-50/30", border: "border-rose-100", text: "text-rose-700", shadow: "shadow-rose-100" },
  CT: { badge: "bg-indigo-600", bg: "bg-indigo-50/30", border: "border-indigo-100", text: "text-indigo-700", shadow: "shadow-indigo-100" },
};

function getSlotLogicForTime(time: string) {
  if (time === "Unknown") return "07:30";
  const exactSlot = FIXED_SLOTS.find((slot) => slot.start === time);
  if (exactSlot) return exactSlot.start;
  const [h, m] = time.split(":").map(Number);
  const totalMinutes = h * 60 + m;
  if (totalMinutes < 9 * 60 + 10) return "07:30";
  if (totalMinutes < 10 * 60 + 50) return "09:10";
  if (totalMinutes < 12 * 60 + 50) return "10:50";
  if (totalMinutes < 14 * 60 + 30) return "12:50";
  if (totalMinutes < 16 * 60 + 10) return "14:30";
  return "16:10";
}

function getFormattedTimeRange(open: string | null, close: string | null) {
  if (!open) return "N/A";
  const openDate = parseLocalDate(open);
  const closeDate = close ? parseLocalDate(close) : null;
  if (!openDate) return "N/A";
  return `${format(openDate, "HH:mm")}${closeDate ? ` - ${format(closeDate, "HH:mm")}` : ""}`;
}

function getHallInvigilatorDisplay(schedule: { hallInvigilatorUsername?: string | null; hallInvigilatorName?: string | null }) {
  return schedule.hallInvigilatorName || schedule.hallInvigilatorUsername || "CHƯA GÁN";
}

export default function ProctorExamSchedulesPage() {
  const router = useRouter();
  const t = useTranslations("Dashboard");
  const tCommon = useTranslations("Common");
  const locale = getCurrentLocale();
  const { user } = useAuthStore();

  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useState({
    subjectCode: "",
    examCode: "",
    fromDate: "",
    toDate: "",
    startTime: "",
    endTime: "",
    status: "",
    examRoomId: "",
    campus: "",
  });
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");

  useEffect(() => {
    if (!user?.campus) return;
    setSearchParams((prev) => {
      if (prev.campus === user.campus) return prev;
      return { ...prev, campus: user.campus };
    });
  }, [user?.campus]);

  const { data: subjectsData } = useSubjects({ limit: 1000 });
  const { data: roomsData } = useRooms({ limit: 1000 });

  const currentWeekStart = searchParams.fromDate
    ? parseISO(searchParams.fromDate)
    : startOfWeek(new Date(), { weekStartsOn: 1 });

  const gridFromDate = format(currentWeekStart, "yyyy-MM-dd");
  const gridToDate = format(addDays(currentWeekStart, 6), "yyyy-MM-dd");

  const { data, isLoading, refetch, isRefetching } = useExamSchedules(
    {
      page: viewMode === "grid" ? 1 : page,
      limit: viewMode === "grid" ? 99999 : 10,
      ...searchParams,
      campus: user?.campus ?? searchParams.campus,
      ...(viewMode === "grid" ? { fromDate: gridFromDate, toDate: gridToDate } : {}),
    },
    { placeholderData: keepPreviousData }
  );

  const schedules = data?.data || [];
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
      campus: "",
    });
    setPage(1);
  };

  const stats = {
    totalExams: data?.meta?.total || 0,
    totalStudents: schedules.reduce((acc, s) => acc + (s.studentCount || 0), 0),
    totalRooms: new Set(schedules.map((s) => s.examRoomId).filter(Boolean)).size,
    campuses: new Set(schedules.map((s) => s.campus).filter(Boolean)).size,
  };

  const matrix = useMemo(
    () =>
      schedules.reduce((acc, s) => {
        const dateStr = s.examOpenTime ? format(parseLocalDate(s.examOpenTime) || new Date(), "yyyy-MM-dd") : "Unknown";
        const rawTime = s.examOpenTime ? format(parseLocalDate(s.examOpenTime) || new Date(), "HH:mm") : "Unknown";
        const slotTime = getSlotLogicForTime(rawTime);
        const campus = s.campus || "Unknown";
        if (!acc[dateStr]) acc[dateStr] = {};
        if (!acc[dateStr][slotTime]) acc[dateStr][slotTime] = {};
        if (!acc[dateStr][slotTime][campus]) acc[dateStr][slotTime][campus] = [];
        acc[dateStr][slotTime][campus].push(s);
        return acc;
      }, {} as Record<string, Record<string, Record<string, typeof schedules>>>),
    [schedules]
  );

  const [proctorNamesById, setProctorNamesById] = useState<Record<string, string>>({});

  // If backend returns username instead of full name, try to fetch fullName by proctorId
  useEffect(() => {
    const idsToFetch = Array.from(
      new Set(
        schedules
          .filter((s) => s.proctorId && s.proctorId !== "" )
          .filter((s) => {
            const name = s.proctorName || "";
            // if name contains a space, assume it's already full name
            return !name || !name.includes(" ");
          })
          .map((s) => s.proctorId as string)
      )
    ).filter(Boolean) as string[];

    if (idsToFetch.length === 0) return;

    let mounted = true;

    (async () => {
      const map: Record<string, string> = {};
      await Promise.all(
        idsToFetch.map(async (id) => {
          try {
            const u = await usersApi.getById(id);
            if (u && u.fullName) map[id] = u.fullName;
          } catch (err) {
            // ignore
          }
        })
      );
      if (mounted) setProctorNamesById((prev) => ({ ...prev, ...map }));
    })();

    return () => {
      mounted = false;
    };
  }, [schedules]);

  const gridDates = eachDayOfInterval({
    start: currentWeekStart,
    end: addDays(currentWeekStart, 6),
  }).map((d) => format(d, "yyyy-MM-dd"));

  return (
    <div className="flex min-h-screen flex-col gap-5 bg-[#f0f2f5] p-3 md:p-5">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div className="flex items-center gap-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-200">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="mb-1 text-[28px] font-black leading-none tracking-tight text-slate-900">
              {t("examOfficer.examSchedules")}
            </h1>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <p className="text-[10px] font-black uppercase tracking-[3px] text-slate-500">
                Proctor mission control
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-orange-100 bg-orange-50/30 px-4 py-2 text-xs font-black uppercase tracking-widest text-orange-600">
            {user?.campus ? `${user.campus} campus` : "My campus"}
          </div>
          <Button
            variant="outline"
            disabled={isLoading || isRefetching}
            onClick={() => refetch()}
            className="h-12 rounded-2xl border-orange-100 bg-orange-50/30 px-5 font-bold text-orange-600 transition-all hover:bg-white hover:shadow-lg disabled:opacity-50"
          >
            <RotateCw className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <div className="ml-2 flex gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <Button
              size="sm"
              variant={viewMode === "grid" ? "outline" : "ghost"}
              className={`h-9 rounded-xl px-6 text-xs font-black uppercase tracking-wider transition-all ${
                viewMode === "grid"
                  ? "border-orange-200 bg-orange-50/50 text-orange-600 shadow-md"
                  : "border-transparent text-slate-400"
              }`}
              onClick={() => setViewMode("grid")}
            >
              {t("examOfficer.schedulesPage.board.boardView")}
            </Button>
            <Button
              size="sm"
              variant={viewMode === "list" ? "outline" : "ghost"}
              className={`h-9 rounded-xl px-6 text-xs font-black uppercase tracking-wider transition-all ${
                viewMode === "list"
                  ? "border-orange-200 bg-orange-50/50 text-orange-600 shadow-md"
                  : "border-transparent text-slate-400"
              }`}
              onClick={() => setViewMode("list")}
            >
              {t("examOfficer.schedulesPage.board.listView")}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: t("examOfficer.schedulesPage.stats.examsThisBatch"), value: stats.totalExams, color: "text-blue-600", icon: Layers, bg: "bg-blue-100/50" },
          { label: t("examOfficer.schedulesPage.stats.totalStudents"), value: stats.totalStudents, color: "text-orange-600", icon: Users, bg: "bg-orange-100/50" },
          { label: t("examOfficer.schedulesPage.stats.availableRooms"), value: stats.totalRooms, color: "text-emerald-600", icon: MapPin, bg: "bg-emerald-100/50" },
          { label: t("examOfficer.schedulesPage.stats.activeCampuses"), value: stats.campuses, color: "text-purple-600", icon: Building2, bg: "bg-purple-100/50" },
        ].map((stat) => (
          <Card key={stat.label} className="overflow-hidden rounded-[1.6rem] border-none bg-white shadow-sm transition-all duration-300 hover:shadow-xl">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`rounded-[1.1rem] p-3.5 ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-black uppercase leading-none tracking-widest text-slate-400">{stat.label}</p>
                <p className="text-[28px] font-black leading-none text-slate-900">{stat.value.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden rounded-[2rem] border-none bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <h2 className="text-xl font-black leading-none tracking-tight text-slate-900">{t("examOfficer.schedulesPage.smartFilter.title")}</h2>
              <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">{t("examOfficer.schedulesPage.smartFilter.subtitle")}</p>
            </div>
            <div className="ml-auto flex items-center gap-4">
              <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-orange-600" onClick={clearFilters}>
                {t("examOfficer.schedulesPage.smartFilter.clear")}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("examOfficer.schedulesPage.filters.subject")}</label>
              <SearchableSelect
                value={searchParams.subjectCode}
                onChange={(v) => setSearchParams({ ...searchParams, subjectCode: v })}
                placeholder={t("examOfficer.schedulesPage.allOptions.allSubjects")}
                options={(subjectsData?.data || []).map((s) => ({ value: s.code, label: s.code }))}
              />
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("examOfficer.schedulesPage.filters.room")}</label>
              <SearchableSelect
                value={searchParams.examRoomId}
                onChange={(v) => setSearchParams({ ...searchParams, examRoomId: v })}
                placeholder={t("examOfficer.schedulesPage.allOptions.allRooms")}
                options={(roomsData?.data || []).map((r) => ({ value: r.id, label: r.roomNumber }))}
              />
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("examOfficer.schedulesPage.filters.status")}</label>
              <SearchableSelect
                value={searchParams.status}
                onChange={(v) => setSearchParams({ ...searchParams, status: v })}
                placeholder={t("examOfficer.schedulesPage.allOptions.allStatuses")}
                options={[
                  { value: "Draft", label: tCommon("statuses.Draft") },
                  { value: "Scheduled", label: tCommon("statuses.Scheduled") },
                  { value: "Published", label: tCommon("statuses.Published") },
                ]}
              />
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("examOfficer.schedulesPage.filters.campus")}</label>
              <SearchableSelect
                value={user?.campus ?? searchParams.campus}
                onChange={() => {}}
                placeholder={t("examOfficer.schedulesPage.allOptions.allCampuses")}
                options={user?.campus ? [{ value: user.campus, label: user.campus }] : CAMPUSES.map((c) => ({ value: c, label: c }))}
                disabled
              />
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("examOfficer.schedulesPage.filters.fromDate")}</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="date" className="h-11 w-full rounded-xl border border-slate-100 bg-slate-50 pl-11 pr-4 text-xs font-bold outline-none transition-all focus:ring-2 focus:ring-orange-500/20" value={searchParams.fromDate} onChange={(e) => setSearchParams({ ...searchParams, fromDate: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("examOfficer.schedulesPage.filters.toDate")}</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="date" className="h-11 w-full rounded-xl border border-slate-100 bg-slate-50 pl-11 pr-4 text-xs font-bold outline-none transition-all focus:ring-2 focus:ring-orange-500/20" value={searchParams.toDate} onChange={(e) => setSearchParams({ ...searchParams, toDate: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("examOfficer.schedulesPage.filters.startTime")}</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="time" className="h-11 w-full rounded-xl border border-slate-100 bg-slate-50 pl-11 pr-4 text-xs font-bold outline-none transition-all focus:ring-2 focus:ring-orange-500/20" value={searchParams.startTime} onChange={(e) => setSearchParams({ ...searchParams, startTime: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("examOfficer.schedulesPage.filters.endTime")}</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="time" className="h-11 w-full rounded-xl border border-slate-100 bg-slate-50 pl-11 pr-4 text-xs font-bold outline-none transition-all focus:ring-2 focus:ring-orange-500/20" value={searchParams.endTime} onChange={(e) => setSearchParams({ ...searchParams, endTime: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("examOfficer.schedulesPage.filters.examCode")}</label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder={t("examOfficer.schedulesPage.filters.examCodePlaceholder")} className="h-11 w-full rounded-xl border border-slate-100 bg-slate-50 pl-11 pr-4 text-xs font-bold outline-none transition-all focus:ring-2 focus:ring-orange-500/20" value={searchParams.examCode} onChange={(e) => setSearchParams({ ...searchParams, examCode: e.target.value })} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        viewMode === "grid" ? (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 lg:grid-cols-7">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-[2rem] border border-slate-100 bg-white p-5">
                  <div className="mb-3 h-2 w-16 rounded-full bg-slate-200" />
                  <div className="mb-2 h-8 w-12 rounded-xl bg-slate-200" />
                  <div className="h-2 w-24 rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
            <div className="flex min-h-[700px] flex-col gap-4 rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-2xl animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-36 w-28 shrink-0 rounded-2xl bg-slate-100" />
                  {Array.from({ length: 5 }).map((__, j) => (
                    <div key={j} className="h-36 flex-1 rounded-2xl border border-slate-100 bg-slate-50" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Card className="overflow-hidden rounded-[2rem] animate-pulse border-none shadow-sm">
            <CardContent className="p-0">
              <div className="h-14 rounded-t-[2rem] bg-slate-800" />
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-4 border-b border-slate-100 p-5">
                  <div className="h-4 w-12 rounded-full bg-slate-200" />
                  <div className="h-4 w-24 rounded-full bg-slate-200" />
                  <div className="ml-auto h-4 w-16 rounded-full bg-slate-100" />
                </div>
              ))}
            </CardContent>
          </Card>
        )
      ) : viewMode === "grid" ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {gridDates.map((date) => {
              const daySessionsCount = schedules.filter(
                (s) => s.examOpenTime && format(parseLocalDate(s.examOpenTime)!, "yyyy-MM-dd") === date
              ).length;
              const isToday = format(new Date(), "yyyy-MM-dd") === date;

              let theme = {
                card: "bg-white border-slate-100",
                icon: "text-slate-400 bg-slate-50",
                text: "text-slate-900",
                label: "text-slate-400",
                indicator: "bg-slate-200",
              };

              if (isToday) {
                theme = {
                  card: "bg-gradient-to-br from-orange-500 to-orange-600 border-orange-400 shadow-lg shadow-orange-100 ring-2 ring-orange-200",
                  icon: "text-white bg-white/20",
                  text: "text-white",
                  label: "text-white/70",
                  indicator: "bg-white",
                };
              } else if (daySessionsCount > 0) {
                theme = {
                  card: "bg-emerald-50/50 border-emerald-100 hover:border-emerald-200",
                  icon: "text-emerald-600 bg-emerald-100/50",
                  text: "text-emerald-700",
                  label: "text-emerald-400",
                  indicator: "bg-emerald-400",
                };
              }

              return (
                <Card key={date} className={`group relative overflow-hidden rounded-[2rem] border-none ${theme.card} transition-all duration-300 hover:scale-[1.02]`}>
                  <CardContent className="p-5">
                    <div className="mb-4 flex items-start justify-between">
                      <div className={`rounded-xl p-2.5 ${theme.icon}`}>
                        <Activity className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase tracking-[2px]">
                          {tCommon("days." + format(parseISO(date), "EEEE").toLowerCase())}
                        </span>
                        <span className={`text-[9px] font-bold ${theme.label} opacity-60`}>
                          {format(parseISO(date), "dd MMM")}
                        </span>
                      </div>
                    </div>

                    <div className="relative z-10 flex items-end justify-between">
                      <div>
                        <p className={`text-3xl font-black leading-none tracking-tighter ${theme.text}`}>{daySessionsCount}</p>
                        <p className={`mt-1 text-[10px] font-black uppercase tracking-widest ${theme.label}`}>
                          {t("examOfficer.schedules")}
                        </p>
                      </div>
                      {daySessionsCount > 0 && <div className={`h-1.5 w-1.5 rounded-full ${theme.indicator}`} />}
                    </div>
                    <div className={`absolute -bottom-4 -right-4 h-20 w-20 rounded-full opacity-[0.03] transition-opacity group-hover:opacity-[0.07] ${isToday ? "bg-white" : "bg-slate-900"}`} />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex items-center justify-between rounded-[1.6rem] border border-slate-100 bg-white p-3.5 shadow-sm">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-10 rounded-xl border-slate-200 px-4 text-xs font-black hover:bg-slate-50"
                onClick={() => setSearchParams({ ...searchParams, fromDate: format(addDays(currentWeekStart, -7), "yyyy-MM-dd") })}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> {t("examOfficer.schedulesPage.board.prevWeek")}
              </Button>
              <div className="flex h-10 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-6 font-bold text-slate-700">
                <Calendar className="h-4 w-4 text-orange-600" />
                <span>{format(currentWeekStart, "dd MMM")} — {format(addDays(currentWeekStart, 6), "dd MMM, yyyy")}</span>
              </div>
              <Button
                variant="outline"
                className="h-10 rounded-xl border-slate-200 px-4 text-xs font-black hover:bg-slate-50"
                onClick={() => setSearchParams({ ...searchParams, fromDate: format(addDays(currentWeekStart, 7), "yyyy-MM-dd") })}
              >
                {t("examOfficer.schedulesPage.board.nextWeek")} <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-3">
              <select
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-orange-500/20"
                value={user?.campus ?? searchParams.campus}
                onChange={() => {}}
                disabled
              >
                {user?.campus ? (
                  <option value={user.campus}>{user.campus}</option>
                ) : (
                  <>
                    <option value="">{t("examOfficer.schedulesPage.allOptions.allCampuses")}</option>
                    {CAMPUSES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </>
                )}
              </select>
              <Button variant="ghost" className="h-10 text-[10px] font-black text-slate-400 hover:text-orange-600" onClick={clearFilters}>
                {t("examOfficer.schedulesPage.board.reset")}
              </Button>
            </div>
          </div>

          <div className="relative min-h-[560px] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              <div className="flex" style={{ width: "max-content" }}>
                <div className="sticky left-0 z-40 flex flex-col border-r border-slate-200 bg-white/95 pt-[72px] backdrop-blur-md">
                  {FIXED_SLOTS.map((slot) => (
                    <div key={slot.id} className="flex h-[320px] w-20 flex-col justify-center border-b border-slate-100 px-1.5">
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center shadow-sm">
                        <p className="border-b-2 border-orange-500 pb-1 text-lg font-black uppercase tracking-widest text-slate-900">
                          Slot {slot.id}
                        </p>
                        <p className="mt-2 flex items-center justify-center gap-1 text-[10px] font-bold tracking-tighter text-slate-500">
                          <Clock className="h-3 w-3 text-slate-400" /> {slot.timeRange}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-1">
                  {gridDates.map((date) => (
                    <div key={date} className={`flex w-[320px] flex-col border-r border-slate-100 bg-white ${format(new Date(), "yyyy-MM-dd") === date ? "bg-orange-50/10" : ""}`}>
                      <div className={`sticky top-0 z-30 flex h-[72px] flex-col justify-center border-b border-slate-100 p-4 text-center ${format(new Date(), "yyyy-MM-dd") === date ? "bg-orange-600 text-white shadow-xl" : "bg-slate-900 text-white shadow-lg"}`}>
                        <p className="mb-0.5 text-[10px] font-black uppercase tracking-[2px] opacity-70">
                          {tCommon("days." + format(parseISO(date), "EEEE").toLowerCase())}
                        </p>
                        <h3 className="text-sm font-black tracking-tight">{format(parseISO(date), "dd MMM, yyyy")}</h3>
                        {format(new Date(), "yyyy-MM-dd") === date && (
                          <div className="absolute -bottom-1.5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-orange-100 bg-white px-3 py-0.5 text-[8px] font-black text-orange-600 shadow-lg">
                            TODAY
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col">
                        {FIXED_SLOTS.map((slot) => {
                          const campusGroups = matrix[date]?.[slot.start] || {};
                          const campusesInSlot = CAMPUSES.filter((campus) => campusGroups[campus] && campusGroups[campus].length > 0);
                          return (
                            <div key={slot.id} className="h-[320px] overflow-hidden border-b border-slate-100 p-1.5 transition-colors hover:bg-slate-50/5">
                              <div className="flex h-full w-full flex-col gap-3 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                {campusesInSlot.length > 0 ? (
                                  campusesInSlot.map((campus) => {
                                    const theme = campusThemes[campus] || campusThemes.HN;
                                    const campusSessions = campusGroups[campus];
                                    return (
                                      <div key={campus} className={`${theme.bg} ${theme.border} flex flex-col gap-2 rounded-[1rem] border-2 p-2.5 shadow-sm`}>
                                        <div className="flex items-center justify-between border-b border-white/50 pb-2">
                                          <div className="flex items-center gap-2">
                                            <span className={`${theme.badge} rounded-lg px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-white shadow-sm`}>
                                              {campus}
                                            </span>
                                            <span className={`text-[11px] font-black tracking-tight ${theme.text} opacity-70`}>
                                              {t("examOfficer.schedulesPage.campusLabel", { campus })}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5 rounded-full border border-white bg-white/80 px-3 py-1.5 shadow-sm ring-4 ring-white/20">
                                            <span className={`text-sm font-black leading-none ${theme.text}`}>{campusSessions.length}</span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${theme.text} opacity-60`}>
                                              {t("examOfficer.schedulesPage.board.roomsSuffix")}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-1.5">
                                          {campusSessions.map((s) => (
                                            <div
                                              key={s.id}
                                              onClick={() => router.push(`/${locale}${ROUTES.PROCTOR_EXAM_SESSION_DETAIL(s.id)}`)}
                                              className="group/card relative flex cursor-pointer flex-col gap-1 overflow-hidden rounded-[0.9rem] border border-slate-100 bg-white p-1.5 shadow-sm transition-all hover:border-orange-400"
                                            >
                                              <div className="flex items-start justify-between">
                                                <h4 className="truncate text-[13px] font-black uppercase leading-none tracking-tight text-slate-900">
                                                  {s.subjectCode}
                                                </h4>
                                                <div className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-2 py-0.5 text-[10px] font-black leading-none text-white shadow-sm shadow-indigo-100">
                                                  {s.examType}
                                                </div>
                                              </div>
                                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                                                <div className="flex items-center gap-1.5">
                                                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                                                  <span className="font-black text-slate-600">{getFormattedTimeRange(s.examOpenTime, s.examCloseTime)}</span>
                                                </div>
                                                <div className="flex items-center gap-1 rounded-md bg-orange-100/50 px-1.5 py-0.5 text-orange-700">
                                                  <Users className="h-3 w-3" />
                                                  <span className="font-black tracking-tighter">{s.studentCount || 0}</span>
                                                </div>
                                              </div>
                                              <div className="mt-1 flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2.5 rounded-lg border border-blue-100/50 bg-blue-50/50 px-2 py-1 text-xs font-black text-blue-700">
                                                  <MapPin className="h-3.5 w-3.5" />
                                                  <span className="truncate font-black uppercase">{s.roomNumber || "---"}</span>
                                                </div>
                                                <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-black text-slate-800 shadow-sm">
                                                  <Users className="h-3.5 w-3.5" />
                                                  <span title={proctorNamesById[s.proctorId || ""] || s.proctorName || "CHƯA GÁN"} className="font-black uppercase whitespace-normal break-words">{proctorNamesById[s.proctorId || ""] || s.proctorName || "CHƯA GÁN"}</span>
                                                </div>
                                                <div className="flex items-center gap-2.5 rounded-lg border border-emerald-100/60 bg-emerald-50/50 px-2 py-1 text-[11px] font-black text-emerald-800 shadow-sm">
                                                  <ShieldCheck className="h-3.5 w-3.5" />
                                                  <span className="truncate font-black uppercase">{getHallInvigilatorDisplay(s)}</span>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="group/ready flex h-full min-h-[100px] flex-col items-center justify-center opacity-20">
                                    <Calendar className="h-8 w-8 text-slate-300 transition-transform group-hover/ready:scale-125" />
                                    <span className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                      {t("examOfficer.schedulesPage.board.ready")}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Card className="overflow-hidden rounded-3xl border-none bg-white shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#1e293b] text-[10px] font-black uppercase tracking-widest text-white">
                <tr>
                  <th className="p-6">{t("examOfficer.table.campus")}</th>
                  <th className="p-6">{t("examOfficer.table.subject")}</th>
                  <th className="p-6">{t("examOfficer.table.date")}</th>
                  <th className="p-6 text-center">{t("examOfficer.table.time")}</th>
                  <th className="p-6">{t("examOfficer.table.type")}</th>
                  <th className="p-6">{t("examOfficer.table.room")}</th>
                  <th className="p-6">{t("examOfficer.schedulesPage.board.studentSuffix")}</th>
                  <th className="p-6">{t("examOfficer.table.status")}</th>
                  <th className="p-6 pr-10 text-right">{tCommon("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-24 text-center font-bold italic text-slate-400">{tCommon("noResults")}</td>
                  </tr>
                ) : (
                  schedules.map((s) => (
                    <tr
                      key={s.id}
                      className="group cursor-pointer transition-colors hover:bg-slate-50"
                      onClick={() => router.push(`/${locale}${ROUTES.PROCTOR_EXAM_SESSION_DETAIL(s.id)}`)}
                    >
                      <td className="p-5 px-6">
                        <span className={`${campusThemes[s.campus || "HN"].badge} rounded-xl px-3 py-1 text-[10px] font-black text-white shadow-sm`}>
                          {s.campus}
                        </span>
                      </td>
                      <td className="p-5 text-base font-black uppercase text-slate-800 transition-colors group-hover:text-orange-600">{s.subjectCode}</td>
                      <td className="p-5 font-bold text-slate-500">{s.examOpenTime ? format(parseLocalDate(s.examOpenTime)!, "dd/MM/yyyy") : "-"}</td>
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-black italic text-slate-700">
                          <Clock className="h-4 w-4 text-orange-500" />
                          {s.examOpenTime ? format(parseLocalDate(s.examOpenTime)!, "HH:mm") : "-"}
                        </div>
                      </td>
                      <td className="p-5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.examType}</td>
                      <td className="p-5 font-black text-slate-700">{s.roomNumber}</td>
                      <td className="p-5 font-black text-orange-600">{s.studentCount || 0}</td>
                      <td className="p-5">
                        <span className={`rounded-full border px-4 py-1.5 text-[10px] font-black shadow-sm ${
                          s.status === "Draft" ? "border-orange-100 bg-orange-50 text-orange-600" : "border-green-100 bg-green-50 text-green-600"
                        }`}>
                          {tCommon(`statuses.${s.status}` as any)}
                        </span>
                      </td>
                      <td className="p-5 pr-10 text-right">
                        <Button variant="ghost" size="sm" className="h-10 w-10 rounded-2xl p-0 hover:bg-white hover:shadow-lg">
                          <MoreVertical className="h-5 w-5 text-slate-300" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 p-6">
            <div className="text-xs font-black uppercase tracking-widest italic text-slate-400">
              {tCommon("showing")} {schedules.length} {t("examOfficer.schedules")} / {tCommon("page")} {page}
            </div>
            <div className="flex gap-3">
              <Button size="sm" variant="outline" className="h-10 rounded-2xl border-slate-200 bg-white px-6 font-black shadow-sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                {tCommon("previous")}
              </Button>
              <Button size="sm" variant="outline" className="h-10 rounded-2xl border-slate-200 bg-white px-6 font-black shadow-sm" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
                {tCommon("next")}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-8 rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-xl">
        {Object.entries(campusThemes).map(([campus, theme]) => (
          <div key={campus} className="flex items-center gap-3">
            <div className={`h-4 w-4 rounded-xl ${theme.badge} shadow-lg ${theme.shadow}`} />
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">
              {t("examOfficer.schedulesPage.campusLabel", { campus })}
            </span>
            <div className="ml-1 h-1.5 w-12 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
