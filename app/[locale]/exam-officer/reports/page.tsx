"use client";

import type { ElementType, ReactNode } from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { ticketsApi, TicketFull } from "@/lib/api/tickets";
import { examSchedulesApi, ExamSchedule } from "@/lib/api/exam-schedules";
import { format, differenceInMinutes, parseISO, startOfDay, subDays } from "date-fns";
import * as XLSX from "xlsx";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Cell,
} from "recharts";
import {
  BarChart2, RefreshCw, Download, FileText, Filter, X,
  Ticket, CheckCircle2, TrendingUp, Clock, ChevronDown,
  Loader2, AlertCircle, Users, Search, ArrowLeftRight, UserCheck, CalendarClock, ShieldCheck,
  Timer, Clock3, BookOpen, CalendarRange,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { semestersApi } from "@/lib/api/semesters";
import type { TicketCountBucket, TicketStatsResponse } from "@/lib/api/tickets";
import type { Semester } from "@/types";
import { useTranslations } from "next-intl";

const CHART_COLORS = ["#F37021", "#2563EB", "#0F766E", "#F59E0B", "#7C3AED", "#64748B"];
const ISSUE_TYPES = ["Technical Issue", "Academic Violation", "Room Management", "Face Mismatch"];
const STATUSES = ["OPEN", "IN_PROGRESS", "SOLVED"];
const ISSUE_TYPE_KEYS: Record<string, string> = {
  "Technical Issue": "technicalIssue",
  "Academic Violation": "academicViolation",
  "Room Management": "roomManagement",
  "Face Mismatch": "faceMismatch",
  Other: "other",
};
const ROLE_KEYS: Record<string, string> = {
  HALL_INVIGILATOR: "hallInvigilator",
  IT_SUPPORT: "itSupport",
  EXAM_OFFICER: "examOfficer",
  ADMIN: "admin",
};

const STATUS_COLORS: Record<string, string> = {
  SOLVED: "#22c55e",
  IN_PROGRESS: "#f59e0b",
  OPEN: "#f97316",
  PENDING: "#94a3b8",
  REJECTED: "#ef4444",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  SOLVED: "Resolved",
  PENDING: "Pending",
  REJECTED: "Rejected",
};

type StatCardProps = {
  icon: ElementType;
  label: string;
  value: string | number;
  hint?: string;
  color: string;
  bg: string;
  loading?: boolean;
};

function StatCard({ icon: Icon, label, value, hint, color, bg, loading }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", bg)}>
          <Icon className={cn("h-5 w-5", color)} />
        </div>
        <div className="min-w-0 flex-1">
          {loading ? (
            <Loader2 className="mt-1 h-5 w-5 animate-spin text-slate-300" />
          ) : (
            <>
              <p className={cn("text-3xl font-black tracking-tight", color)}>{value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
              {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  loading,
  empty,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ElementType;
  loading?: boolean;
  empty?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("Reports");
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50">
          <Icon className="h-4 w-4 text-[#F37021]" />
        </div>
        <div>
          <h2 className="text-sm font-black text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-72 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      ) : empty ? (
        <div className="flex h-72 items-center justify-center text-sm font-medium text-slate-400">
          {t("states.noDataForFilter")}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function formatMinutes(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  if (value < 60) return `${Math.round(value)} min`;
  return `${(value / 60).toFixed(1)} h`;
}

function fmtDuration(value: number | null | undefined) {
  return formatMinutes(value);
}

function buildWeekOptions(semester: Semester | undefined) {
  if (!semester) return [];
  const start = new Date(semester.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(semester.endDate);
  end.setHours(23, 59, 59, 999);
  const totalWeeks = Math.max(1, Math.ceil((end.getTime() - start.getTime() + 1) / (7 * 24 * 60 * 60 * 1000)));

  return Array.from({ length: totalWeeks }, (_, index) => {
    const week = index + 1;
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + index * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    if (weekEnd > end) {
      weekEnd.setTime(end.getTime());
    }

    return {
      value: week,
      label: `Week ${week} • ${format(weekStart, "dd/MM")} - ${format(weekEnd, "dd/MM")}`,
    };
  });
}

function exportStatsToExcel(stats: TicketStatsResponse | null) {
  if (!stats) return;

  const summaryRows = [
    {
      Semester: stats.filters.semesterName,
      Week: stats.filters.week ?? "All",
      Range: `${format(parseISO(stats.filters.rangeStart), "dd/MM/yyyy")} - ${format(parseISO(stats.filters.rangeEnd), "dd/MM/yyyy")}`,
      TotalTickets: stats.summary.totalTickets,
      AvgTimeToStartMinutes: stats.summary.avgTimeToStartMinutes ?? "—",
      AvgTimeToResolveMinutes: stats.summary.avgTimeToResolveMinutes ?? "—",
    },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stats.byIssueType), "IssueType");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stats.byIssueName), "IssueName");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stats.topSubjects), "Subjects");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stats.bySemester), "Semester");
  XLSX.writeFile(wb, `ticket-stats-${stats.filters.semesterCode.toLowerCase()}-${stats.filters.week ?? "all"}.xlsx`);
}

function calcDuration(t: TicketFull): number | null {
  if (t.status !== "SOLVED") return null;
  const diff = differenceInMinutes(parseISO(t.updatedAt), parseISO(t.createdAt));
  return diff > 0 ? diff : null;
}

function ticketSeqId(idx: number): string {
  const year = new Date().getFullYear();
  return `TKT-${year}-${String(idx + 1).padStart(3, "0")}`;
}

export default function ExamOfficerReportsPage() {
  const t = useTranslations("Reports");
  // ── State ──
  const [allTickets, setAllTickets] = useState<TicketFull[]>([]);
  const [sessions, setSessions] = useState<ExamSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Filter state
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [examRoom, setExamRoom] = useState("");
  const [issueType, setIssueType] = useState("");
  const [status, setStatus] = useState("");

  // Applied filters (only updated on Apply)
  const [applied, setApplied] = useState({
    fromDate: "", toDate: "", sessionId: "", examRoom: "", issueType: "", status: "",
  });
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("all");
  const [stats, setStats] = useState<TicketStatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const issueTypeLabels = useMemo(
    () =>
      Object.fromEntries(
        ISSUE_TYPES.map((type) => [type, t(`issueTypes.${ISSUE_TYPE_KEYS[type]}`)])
      ) as Record<string, string>,
    [t]
  );
  const statusLabels = useMemo(
    () => ({
      OPEN: t("status.open"),
      IN_PROGRESS: t("status.inProgress"),
      SOLVED: t("status.solved"),
      PENDING: t("status.pending"),
      REJECTED: t("status.rejected"),
    }),
    [t]
  );
  const roleLabels = useMemo(
    () => ({
      HALL_INVIGILATOR: t("roles.hallInvigilator"),
      IT_SUPPORT: t("roles.itSupport"),
      EXAM_OFFICER: t("roles.examOfficer"),
      ADMIN: t("roles.admin"),
    }),
    [t]
  );

  // ── Fetch ──
  const fetchData = useCallback(async (filters: typeof applied) => {
    setLoading(true);
    try {
      const [tks, scheds] = await Promise.all([
        ticketsApi.list({
          sessionId: filters.sessionId || undefined,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          issueType: filters.issueType || undefined,
          status: filters.status || undefined,
        }),
        examSchedulesApi.list({ limit: 200 }),
      ]);
      setAllTickets(tks);
      const arr = Array.isArray(scheds) ? scheds : (scheds as any).data ?? [];
      setSessions(arr);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(applied); }, []);// eslint-disable-line

  // ── Filter handlers ──
  const handleApply = () => {
    const next = { fromDate, toDate, sessionId, examRoom, issueType, status };
    setApplied(next);
    fetchData(next);
  };

  const handleReset = () => {
    setFromDate("");
    setToDate("");
    setSessionId("");
    setExamRoom("");
    setIssueType("");
    setStatus("");
    const blank = { fromDate: "", toDate: "", sessionId: "", examRoom: "", issueType: "", status: "" };
    setApplied(blank);
    fetchData(blank);
  };

  useEffect(() => {
    let active = true;

    const loadSemesters = async () => {
      const response = await semestersApi.getAll({ limit: 200 });
      if (!active) return;

      const nextSemesters = [...(response.data ?? [])].sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
      );
      setSemesters(nextSemesters);

      if (!selectedSemesterId && nextSemesters.length > 0) {
        const now = new Date();
        const currentSemester =
          nextSemesters.find((semester) => {
            const start = new Date(semester.startDate);
            const end = new Date(semester.endDate);
            return start <= now && now <= end;
          }) ?? nextSemesters[0];

        setSelectedSemesterId(currentSemester.id);
      }
    };

    void loadSemesters();

    return () => {
      active = false;
    };
  }, [selectedSemesterId]);

  const selectedSemester = useMemo(
    () => semesters.find((semester) => semester.id === selectedSemesterId),
    [semesters, selectedSemesterId],
  );
  const weekOptions = useMemo(() => buildWeekOptions(selectedSemester), [selectedSemester]);

  useEffect(() => {
    if (!selectedSemester) return;

    let active = true;

    const loadStats = async () => {
      setLoadingStats(true);
      setError(null);
      try {
        const result = await ticketsApi.getStats({
          semesterId: selectedSemester.id,
          week: selectedWeek === "all" ? undefined : Number(selectedWeek),
        });

        if (!active) return;
        setStats(result);
      } catch {
        if (!active) return;
        setError(t("errors.loadStats"));
        setStats(null);
      } finally {
        if (active) {
          setLoadingStats(false);
        }
      }
    };

    void loadStats();

    return () => {
      active = false;
    };
  }, [selectedSemester, selectedWeek]);

  const filtered = useMemo(() => {
    let ts = [...allTickets];
    if (applied.examRoom) {
      ts = ts.filter(t => {
        const room = t.session?.examRoom?.roomNumber ?? (t.session as any)?.roomNumber ?? "";
        return room.toLowerCase().includes(applied.examRoom.toLowerCase());
      });
    }
    return ts;
  }, [allTickets, applied.examRoom]);

  // Stats
  const totalTickets = filtered.length;
  const resolvedTickets = filtered.filter(t => t.status === "SOLVED").length;
  const resolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;
  const avgResolutionTime = useMemo(() => {
    const solved = filtered.filter(t => t.status === "SOLVED");
    if (!solved.length) return "—";
    const total = solved.reduce((sum, t) => sum + (calcDuration(t) ?? 0), 0);
    return `${Math.round(total / solved.length)} min`;
  }, [filtered]);

  // Extra summary stats
  const totalHallTickets = useMemo(() => {
    return allTickets.filter(t => t.assignee?.role === "HALL_INVIGILATOR").length;
  }, [allTickets]);

  // Pie chart data
  const statusGroups = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(t => { map[t.status] = (map[t.status] ?? 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Bar chart data
  const typeGroups = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(t => {
      const k = t.issueType || "Other";
      map[k] = (map[k] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // ── Proctor Slot Statistics ──
  const [proctorSearch, setProctorSearch] = useState("");
  const proctorSlotData = useMemo(() => {
    const map: Record<string, { name: string; slots: number }> = {};
    sessions.forEach(s => {
      if (!s.proctorId || !s.proctorName || s.proctorName === "Unassigned") return;
      const pid = s.proctorId;
      const name = s.proctorName;
      if (!map[pid]) map[pid] = { name, slots: 0 };
      map[pid].slots += 1;
    });
    return Object.values(map)
      .sort((a, b) => b.slots - a.slots);
  }, [sessions]);

  const filteredProctorData = useMemo(() => {
    if (!proctorSearch.trim()) return proctorSlotData;
    return proctorSlotData.filter(d =>
      d.name.toLowerCase().includes(proctorSearch.toLowerCase())
    );
  }, [proctorSlotData, proctorSearch]);

  // ── Hall Invigilator Ticket Handling ──
  const [hallSearch, setHallSearch] = useState("");
  const hallInvigilatorData = useMemo(() => {
    const map: Record<string, { name: string; role: string; total: number; solved: number; inProgress: number; resolvedRate: number }> = {};
    allTickets.forEach(t => {
      const a = t.assignee;
      if (!a) return;
      const key = a.id;
      if (!map[key]) map[key] = { name: a.fullName, role: a.role, total: 0, solved: 0, inProgress: 0, resolvedRate: 0 };
      map[key].total += 1;
      if (t.status === "SOLVED") map[key].solved += 1;
      else if (t.status === "IN_PROGRESS") map[key].inProgress += 1;
    });
    return Object.values(map)
      .map(item => ({
        ...item,
        resolvedRate: item.total > 0 ? Math.round((item.solved / item.total) * 100) : 0,
      }))
      .sort((a, b) => b.resolvedRate - a.resolvedRate || b.total - a.total);
  }, [allTickets]);

  const filteredHallData = useMemo(() => {
    if (!hallSearch.trim()) return hallInvigilatorData;
    return hallInvigilatorData.filter(d =>
      d.name.toLowerCase().includes(hallSearch.toLowerCase())
    );
  }, [hallInvigilatorData, hallSearch]);

  // Line chart: trend over last 14 days
  const trendData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = startOfDay(subDays(new Date(), 13 - i));
      return { date: format(d, "MMM d"), dateKey: format(d, "yyyy-MM-dd"), created: 0, resolved: 0 };
    });
    filtered.forEach(t => {
      const created = format(parseISO(t.createdAt), "yyyy-MM-dd");
      const d = days.find(x => x.dateKey === created);
      if (d) d.created += 1;
      if (t.status === "SOLVED") {
        const resolved = format(parseISO(t.updatedAt), "yyyy-MM-dd");
        const dr = days.find(x => x.dateKey === resolved);
        if (dr) dr.resolved += 1;
      }
    });
    return days;
  }, [filtered]);

  // Unique rooms for display
  const rooms = useMemo(() => {
    const set = new Set<string>();
    allTickets.forEach(t => {
      const r = t.session?.examRoom?.roomNumber ?? (t.session as any)?.roomNumber;
      if (r) set.add(r);
    });
    return [...set].sort();
  }, [allTickets]);

  // ── Export Excel ──
  const handleExportExcel = () => {
    const rows = filtered.map((t, i) => ({
      "Ticket ID": ticketSeqId(i),
      "Category": t.issueType ?? "—",
      "Issue Name": t.issueName,
      "Exam Room": t.session?.examRoom?.roomNumber ?? "—",
      "Created Time": format(parseISO(t.createdAt), "yyyy-MM-dd HH:mm"),
      "Resolved Time": t.status === "SOLVED" ? format(parseISO(t.updatedAt), "yyyy-MM-dd HH:mm") : "—",
      "Duration (min)": calcDuration(t) ?? "—",
      "Status": STATUS_LABEL[t.status] ?? t.status,
      "Priority": t.priority ?? "—",
      "Student Code": t.studentCode ?? "—",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ticket Report");
    XLSX.writeFile(wb, `ticket-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const handleSemesterChange = (semesterId: string) => {
    setSelectedSemesterId(semesterId);
    setSelectedWeek("all");
  };

  const handleRefresh = async () => {
    if (!selectedSemesterId) return;
    setLoadingStats(true);
    setError(null);
    try {
      const result = await ticketsApi.getStats({
        semesterId: selectedSemesterId,
        week: selectedWeek === "all" ? undefined : Number(selectedWeek),
      });
      setStats(result);
    } catch {
      setError(t("errors.loadStats"));
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const issueTypeData = useMemo(
    () =>
      (stats?.byIssueType ?? []).map((item) => ({
        ...item,
        name: issueTypeLabels[item.name] ?? item.name,
      })),
    [stats, issueTypeLabels]
  );
  const issueNameData = (stats?.byIssueName ?? []).slice(0, 8);
  const subjectData = (stats?.topSubjects ?? []).slice(0, 8);
  const semesterData = stats?.bySemester ?? [];

  const rangeLabel = useMemo(() => {
    if (!stats) return t("scope.noData");
    return `${format(parseISO(stats.filters.rangeStart), "dd/MM/yyyy")} - ${format(parseISO(stats.filters.rangeEnd), "dd/MM/yyyy")}`;
  }, [stats, t]);

  const hasStats = Boolean(stats);
  const isEmpty = hasStats && stats?.summary.totalTickets === 0;

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,#fff7ed,white_28%,#f8fafc_72%)]">
      <div className="border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100">
              <BarChart2 className="h-5 w-5 text-[#F37021]" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-950">{t("header.title")}</h1>
              <p className="text-sm text-slate-500">{t("header.subtitle")}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              {t("actions.refresh")}
            </button>
            <button
              onClick={() => exportStatsToExcel(stats)}
              disabled={!stats}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F37021] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              {t("actions.exportExcel")}
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-[#F37021] transition-colors hover:bg-orange-100"
            >
              <FileText className="h-4 w-4" />
              {t("actions.exportPdf")}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-6 print:p-4">
        <div className="order-1 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t("scope.title")}</p>
              <p className="mt-2 text-base font-black text-slate-900">{selectedSemester?.name ?? selectedSemester?.code ?? t("scope.selectSemester")}</p>
              <p className="mt-1 text-sm text-slate-500">{rangeLabel}</p>
            </div>

            <div className="space-y-5">
              {/* ── Filters ── */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm print:hidden">
                <button
                  onClick={() => setFiltersOpen(v => !v)}
                  className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#F37021]" />
                    <span>{t("filters.title")}</span>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", filtersOpen && "rotate-180")} />
                </button>

                {filtersOpen && (
                  <div className="px-5 pb-5 border-t border-gray-100">
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mt-4">
                      {/* From Date */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{t("filters.fromDate")}</label>
                        <input
                          type="date"
                          value={fromDate}
                          onChange={e => setFromDate(e.target.value)}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-700"
                        />
                      </div>
                      {/* To Date */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{t("filters.toDate")}</label>
                        <input
                          type="date"
                          value={toDate}
                          onChange={e => setToDate(e.target.value)}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-700"
                        />
                      </div>
                      {/* Exam Schedule */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{t("filters.examSchedule")}</label>
                        <select
                          value={sessionId}
                          onChange={e => setSessionId(e.target.value)}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-700 bg-white"
                        >
                          <option value="">{t("filters.allSessions")}</option>
                          {sessions.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.subjectCode ?? "—"} · {s.examOpenTime ? format(new Date(s.examOpenTime), "dd/MM HH:mm") : "?"}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Exam Room */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{t("filters.examRoom")}</label>
                        <select
                          value={examRoom}
                          onChange={e => setExamRoom(e.target.value)}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-700 bg-white"
                        >
                          <option value="">{t("filters.allRooms")}</option>
                          {rooms.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                      {/* Ticket Category */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{t("filters.ticketCategory")}</label>
                        <select
                          value={issueType}
                          onChange={e => setIssueType(e.target.value)}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-700 bg-white"
                        >
                          <option value="">{t("filters.allCategories")}</option>
                          {ISSUE_TYPES.map(tp => (
                            <option key={tp} value={tp}>{issueTypeLabels[tp] ?? tp}</option>
                          ))}
                        </select>
                      </div>
                      {/* Ticket Status */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{t("filters.ticketStatus")}</label>
                        <select
                          value={status}
                          onChange={e => setStatus(e.target.value)}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-700 bg-white"
                        >
                          <option value="">{t("filters.allStatuses")}</option>
                          {STATUSES.map(s => (
                            <option key={s} value={s}>{statusLabels[s] ?? STATUS_LABEL[s]}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={handleApply}
                        className="px-5 py-2 bg-[#F37021] text-white text-sm font-bold rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        {t("filters.apply")}
                      </button>
                      <button
                        onClick={handleReset}
                        className="px-5 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {t("filters.reset")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}
        </div>

        <div className="order-1 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatCard
            icon={Ticket}
            label={t("stats.totalTickets")}
            value={stats?.summary.totalTickets ?? "—"}
            hint={stats ? `${stats.filters.semesterName}${stats.filters.week ? ` • ${t("scope.week", { week: stats.filters.week })}` : ""}` : undefined}
            color="text-orange-600"
            bg="bg-orange-50"
            loading={loadingStats}
          />
          <StatCard
            icon={Timer}
            label={t("stats.avgStartTime")}
            value={formatMinutes(stats?.summary.avgTimeToStartMinutes)}
            hint={stats ? t("stats.startedHint", { count: stats.summary.startedSampleSize }) : undefined}
            color="text-blue-600"
            bg="bg-blue-50"
            loading={loadingStats}
          />
          <StatCard
            icon={Clock3}
            label={t("stats.avgResolveTime")}
            value={formatMinutes(stats?.summary.avgTimeToResolveMinutes)}
            hint={stats ? t("stats.resolvedHint", { count: stats.summary.resolvedSampleSize }) : undefined}
            color="text-emerald-600"
            bg="bg-emerald-50"
            loading={loadingStats}
          />
        </div>

        <div className="order-1 grid gap-5 xl:grid-cols-2">
          <ChartCard
            title={t("charts.issueType.title")}
            subtitle={t("charts.issueType.subtitle")}
            icon={BarChart2}
            loading={loadingStats}
            empty={!loadingStats && (!!error || isEmpty || issueTypeData.length === 0)}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={issueTypeData} margin={{ top: 8, right: 8, left: -10, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <ReTooltip formatter={(value: number) => [t("tooltips.ticketCount", { count: value }), t("tooltips.quantity")]} />
                <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                  {issueTypeData.map((_, index) => (
                    <Cell key={`type-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title={t("charts.subjects.title")}
            subtitle={t("charts.subjects.subtitle")}
            icon={BookOpen}
            loading={loadingStats}
            empty={!loadingStats && (!!error || isEmpty || subjectData.length === 0)}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subjectData} margin={{ top: 8, right: 8, left: -10, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <ReTooltip formatter={(value: number) => [t("tooltips.ticketCount", { count: value }), t("tooltips.quantity")]} />
                <Bar dataKey="count" radius={[10, 10, 0, 0]} fill="#2563EB" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="order-1 grid gap-5 xl:grid-cols-2">
          <ChartCard
            title={t("charts.issueName.title")}
            subtitle={t("charts.issueName.subtitle")}
            icon={Ticket}
            loading={loadingStats}
            empty={!loadingStats && (!!error || isEmpty || issueNameData.length === 0)}
          >
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={issueNameData} layout="vertical" margin={{ top: 8, right: 16, left: 48, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 11, fill: "#475569" }}
                />
                <ReTooltip formatter={(value: number) => [t("tooltips.ticketCount", { count: value }), t("tooltips.quantity")]} />
                <Bar dataKey="count" radius={[0, 10, 10, 0]} fill="#0F766E" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title={t("charts.semester.title")}
            subtitle={t("charts.semester.subtitle")}
            icon={CalendarRange}
            loading={loadingStats}
            empty={!loadingStats && (!!error || semesterData.length === 0)}
          >
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={semesterData} margin={{ top: 8, right: 8, left: -10, bottom: 36 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="code"
                  angle={-18}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <ReTooltip formatter={(value: number, _name: string, item: any) => [t("tooltips.ticketCount", { count: value }), item?.payload?.name ?? t("tooltips.semester")]} />
                <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                  {semesterData.map((bucket) => (
                    <Cell
                      key={bucket.semesterId}
                      fill={bucket.semesterId === selectedSemesterId ? "#F37021" : "#CBD5E1"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
        {/* ── Proctor Slot Statistics ── */}
        <div className="order-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-indigo-500" />
              <div>
                <h2 className="text-sm font-black text-gray-800">{t("proctor.title")}</h2>
                <p className="text-[10px] text-gray-400">{t("proctor.subtitle")}</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder={t("proctor.searchPlaceholder")}
                value={proctorSearch}
                onChange={e => setProctorSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 w-48"
              />
            </div>
          </div>

          {loading ? (
            <div className="h-44 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
          ) : filteredProctorData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm text-gray-400">{t("proctor.noData")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["#", t("proctor.headers.proctor"), t("proctor.headers.assignedSlots")].map(h => (
                      <th
                        key={h}
                        className={cn(
                          "px-4 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-wide whitespace-nowrap",
                          h === t("proctor.headers.assignedSlots") ? "text-center" : "text-left"
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProctorData.map((d, idx) => (
                    <tr key={d.name} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <span className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black",
                          idx === 0 ? "bg-amber-100 text-amber-700" :
                            idx === 1 ? "bg-gray-100 text-gray-600" :
                              idx === 2 ? "bg-orange-100 text-orange-600" : "bg-gray-50 text-gray-400"
                        )}>{idx + 1}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-semibold text-gray-700">{d.name}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="text-sm font-black text-[#F37021]">{d.slots}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Hall Invigilator Ticket Handling ── */}
        <div className="order-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-teal-500" />
              <div>
                <h2 className="text-sm font-black text-gray-800">{t("hall.title")}</h2>
                <p className="text-[10px] text-gray-400">{t("hall.subtitle")}</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder={t("hall.searchPlaceholder")}
                value={hallSearch}
                onChange={e => setHallSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 w-48"
              />
            </div>
          </div>

          {loading ? (
            <div className="h-44 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
          ) : filteredHallData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm text-gray-400">{t("hall.noData")}</div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <ResponsiveContainer width="100%" height={Math.max(180, filteredHallData.length * 40)}>
                <BarChart
                  layout="vertical"
                  data={filteredHallData.slice(0, 15)}
                  margin={{ top: 4, right: 40, left: 10, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    allowDecimals={false}
                    domain={[0, 100]}
                    tickFormatter={(value: number) => `${value}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 17) + "…" : v}
                  />
                  <ReTooltip
                    formatter={(val: number, _name: string, item: any) => [
                      `${val}%`,
                      t("hall.tooltipResolved", { solved: item?.payload?.solved ?? 0, total: item?.payload?.total ?? 0 }),
                    ]}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="resolvedRate" name={t("hall.successRate")} fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="overflow-y-auto max-h-80">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {["#", t("hall.headers.staffName"), t("hall.headers.role"), t("hall.headers.total"), t("hall.headers.successRate"), t("hall.headers.inProgress")].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHallData.map((d, idx) => {
                      const roleLabel: Record<string, string> = {
                        HALL_INVIGILATOR: roleLabels.HALL_INVIGILATOR,
                        IT_SUPPORT: roleLabels.IT_SUPPORT,
                        EXAM_OFFICER: roleLabels.EXAM_OFFICER,
                        ADMIN: roleLabels.ADMIN,
                      };
                      const roleColor: Record<string, string> = {
                        HALL_INVIGILATOR: "bg-blue-100 text-blue-700",
                        IT_SUPPORT: "bg-purple-100 text-purple-700",
                        EXAM_OFFICER: "bg-orange-100 text-orange-700",
                        ADMIN: "bg-gray-100 text-gray-700",
                      };
                      return (
                        <tr key={d.name + idx} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                          <td className="px-3 py-2.5">
                            <span className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black",
                              idx === 0 ? "bg-amber-100 text-amber-700" :
                                idx === 1 ? "bg-gray-100 text-gray-600" :
                                  idx === 2 ? "bg-orange-100 text-orange-600" : "bg-gray-50 text-gray-400"
                            )}>{idx + 1}</span>
                          </td>
                          <td className="px-3 py-2.5 text-xs font-semibold text-gray-700">{d.name}</td>
                          <td className="px-3 py-2.5">
                            <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold", roleColor[d.role] ?? "bg-gray-100 text-gray-500")}>
                              {roleLabel[d.role] ?? d.role}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="text-sm font-black text-[#F37021]">{d.total}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-green-600">{d.solved}/{d.total}</span>
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${d.resolvedRate}%` }} />
                              </div>
                              <span className="text-[10px] text-gray-400">{d.resolvedRate}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">{d.inProgress}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>


        <div className="order-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">{t("summary.title")}</h2>
              <p className="text-xs text-slate-500">{t("summary.subtitle")}</p>
            </div>
            {stats ? (
              <p className="text-xs font-medium text-slate-400">
                {t("summary.scopePrefix")} {stats.filters.semesterCode}
                {stats.filters.week ? ` • ${t("scope.week", { week: stats.filters.week })}` : ` • ${t("summary.allWeeks")}`}
              </p>
            ) : null}
          </div>

          {!stats || loadingStats ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
          ) : (
            <div className="grid gap-4 pt-4 md:grid-cols-3">
              <SummaryList
                title={t("summary.issueType")}
                items={issueTypeData}
              />
              <SummaryList
                title={t("summary.issueName")}
                items={issueNameData}
              />
              <SummaryList
                title={t("summary.topSubjects")}
                items={subjectData}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryList({ title, items }: { title: string; items: TicketCountBucket[] }) {
  const t = useTranslations("Reports");
  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
        <p className="mt-6 text-sm text-slate-400">{t("states.noData")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <div key={`${title}-${item.name}`} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              >
                {index + 1}
              </span>
              <span className="truncate font-medium text-slate-700">{item.name}</span>
            </div>
            <span className="font-black text-slate-900">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
