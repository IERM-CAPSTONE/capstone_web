"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { ticketsApi, TicketFull } from "@/lib/api/tickets";
import { examSchedulesApi, ExamSchedule } from "@/lib/api/exam-schedules";
import { proctorApplicationsApi, ProctorApplication } from "@/lib/api/proctor-applications";
import { format, differenceInMinutes, parseISO, startOfDay, subDays } from "date-fns";
import * as XLSX from "xlsx";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { semestersApi } from "@/lib/api/semesters";
import {
  ticketsApi,
} from "@/lib/api/tickets";
import type { TicketCountBucket, TicketStatsResponse } from "@/lib/api/tickets";
import type { Semester } from "@/types";

const CHART_COLORS = ["#F37021", "#2563EB", "#0F766E", "#F59E0B", "#7C3AED", "#64748B"];

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
          Không có dữ liệu cho bộ lọc hiện tại.
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function formatMinutes(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  if (value < 60) return `${Math.round(value)} phút`;
  return `${(value / 60).toFixed(1)} giờ`;
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

export default function ExamOfficerReportsPage() {
    // ── State ──
    const [allTickets, setAllTickets] = useState<TicketFull[]>([]);
    const [sessions, setSessions] = useState<ExamSchedule[]>([]);
    const [proctorApplications, setProctorApplications] = useState<ProctorApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtersOpen, setFiltersOpen] = useState(true);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

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

    // ── Fetch ──
    const fetchData = useCallback(async (filters: typeof applied) => {
        setLoading(true);
        try {
            const [tks, scheds, apps] = await Promise.all([
                ticketsApi.list({
                    sessionId: filters.sessionId || undefined,
                    fromDate: filters.fromDate || undefined,
                    toDate: filters.toDate || undefined,
                    issueType: filters.issueType || undefined,
                    status: filters.status || undefined,
                }),
                examSchedulesApi.list({ limit: 200 }),
                proctorApplicationsApi.getAllApplications({ limit: 500 }).catch(() => ({ data: [] })),
            ]);
            setAllTickets(tks);
            const arr = Array.isArray(scheds) ? scheds : (scheds as any).data ?? [];
            setSessions(arr);
            const appsArr: ProctorApplication[] = Array.isArray(apps)
                ? apps
                : (apps as any)?.data ?? [];
            setProctorApplications(appsArr);
        } catch { }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(applied); }, []);// eslint-disable-line

    // ── Filter handlers ──
    const handleApply = () => {
        const next = { fromDate, toDate, sessionId, examRoom, issueType, status };
        setApplied(next);
        setPage(1);
        fetchData(next);
    };

    void loadSemesters();

    return () => {
      active = false;
    };
  }, []);

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
        setError("Không thể tải thống kê ticket.");
        setStats(null);
      } finally {
        if (active) {
          setLoadingStats(false);
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
    const totalScheduleChanges = proctorApplications.length;
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
            const pid = s.proctorId ?? "__unknown";
            const name = s.proctorName ?? s.proctorId ?? "Unassigned";
            if (!map[pid]) map[pid] = { name, slots: 0 };
            map[pid].slots += 1;
        });
        return Object.values(map)
            .filter(d => d.name !== "Unassigned" || d.slots > 0)
            .sort((a, b) => b.slots - a.slots);
    }, [sessions]);

    const filteredProctorData = useMemo(() => {
        if (!proctorSearch.trim()) return proctorSlotData;
        return proctorSlotData.filter(d =>
            d.name.toLowerCase().includes(proctorSearch.toLowerCase())
        );
    }, [proctorSlotData, proctorSearch]);

    // ── Schedule Change Statistics (Proctor Applications) ──
    const [scheduleSearch, setScheduleSearch] = useState("");
    const scheduleChangesData = useMemo(() => {
        const map: Record<string, { name: string; code: string | null; total: number; approved: number; rejected: number; pending: number }> = {};
        proctorApplications.forEach(a => {
            const key = a.teacherId;
            const name = a.teacherName ?? a.teacherId;
            if (!map[key]) map[key] = { name, code: a.teacherCode, total: 0, approved: 0, rejected: 0, pending: 0 };
            map[key].total += 1;
            if (a.status === "APPROVED") map[key].approved += 1;
            else if (a.status === "REJECTED") map[key].rejected += 1;
            else if (a.status === "PENDING") map[key].pending += 1;
        });
        return Object.values(map).sort((a, b) => b.total - a.total);
    }, [proctorApplications]);

    const filteredScheduleData = useMemo(() => {
        if (!scheduleSearch.trim()) return scheduleChangesData;
        return scheduleChangesData.filter(d =>
            d.name.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
            (d.code ?? "").toLowerCase().includes(scheduleSearch.toLowerCase())
        );
    }, [scheduleChangesData, scheduleSearch]);

    // ── Hall Invigilator Ticket Handling ──
    const [hallSearch, setHallSearch] = useState("");
    const hallInvigilatorData = useMemo(() => {
        const map: Record<string, { name: string; role: string; total: number; solved: number; inProgress: number }> = {};
        allTickets.forEach(t => {
            const a = t.assignee;
            if (!a) return;
            const key = a.id;
            if (!map[key]) map[key] = { name: a.fullName, role: a.role, total: 0, solved: 0, inProgress: 0 };
            map[key].total += 1;
            if (t.status === "SOLVED") map[key].solved += 1;
            else if (t.status === "IN_PROGRESS") map[key].inProgress += 1;
        });
        return Object.values(map).sort((a, b) => b.total - a.total);
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

    // Table pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageTickets = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

    void loadStats();

    return () => {
      active = false;
    };
  }, [selectedSemester, selectedWeek]);

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
      setError("Không thể tải thống kê ticket.");
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const issueTypeData = stats?.byIssueType ?? [];
  const issueNameData = (stats?.byIssueName ?? []).slice(0, 8);
  const subjectData = (stats?.topSubjects ?? []).slice(0, 8);
  const semesterData = stats?.bySemester ?? [];

  const rangeLabel = useMemo(() => {
    if (!stats) return "Chưa có dữ liệu";
    return `${format(parseISO(stats.filters.rangeStart), "dd/MM/yyyy")} - ${format(parseISO(stats.filters.rangeEnd), "dd/MM/yyyy")}`;
  }, [stats]);

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
              <h1 className="text-lg font-black text-slate-950">Ticket Statistics Dashboard</h1>
              <p className="text-sm text-slate-500">Theo dõi lỗi phát sinh và hiệu quả xử lý ticket theo học kỳ.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={() => exportStatsToExcel(stats)}
              disabled={!stats}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F37021] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-[#F37021] transition-colors hover:bg-orange-100"
            >
              <FileText className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6 print:p-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Phạm vi báo cáo</p>
              <p className="mt-2 text-base font-black text-slate-900">{selectedSemester?.name ?? selectedSemester?.code ?? "Chọn semester"}</p>
              <p className="mt-1 text-sm text-slate-500">{rangeLabel}</p>
            </div>

            <div className="p-6 space-y-5 print:p-4">
                {/* ── Filters ── */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm print:hidden">
                    <button
                        onClick={() => setFiltersOpen(v => !v)}
                        className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors rounded-xl"
                    >
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-[#F37021]" />
                            <span>FILTERS</span>
                        </div>
                        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", filtersOpen && "rotate-180")} />
                    </button>

                    {filtersOpen && (
                        <div className="px-5 pb-5 border-t border-gray-100">
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mt-4">
                                {/* From Date */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">From Date</label>
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={e => setFromDate(e.target.value)}
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-700"
                                    />
                                </div>
                                {/* To Date */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">To Date</label>
                                    <input
                                        type="date"
                                        value={toDate}
                                        onChange={e => setToDate(e.target.value)}
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-700"
                                    />
                                </div>
                                {/* Exam Schedule */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Exam Schedule</label>
                                    <select
                                        value={sessionId}
                                        onChange={e => setSessionId(e.target.value)}
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-700 bg-white"
                                    >
                                        <option value="">All sessions</option>
                                        {sessions.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.subjectCode ?? "—"} · {s.examOpenTime ? format(new Date(s.examOpenTime), "dd/MM HH:mm") : "?"}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {/* Exam Room */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Exam Room</label>
                                    <select
                                        value={examRoom}
                                        onChange={e => setExamRoom(e.target.value)}
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-700 bg-white"
                                    >
                                        <option value="">All rooms</option>
                                        {rooms.map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                                {/* Ticket Category */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Ticket Category</label>
                                    <select
                                        value={issueType}
                                        onChange={e => setIssueType(e.target.value)}
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-700 bg-white"
                                    >
                                        <option value="">All categories</option>
                                        {ISSUE_TYPES.map(tp => (
                                            <option key={tp} value={tp}>{tp}</option>
                                        ))}
                                    </select>
                                </div>
                                {/* Ticket Status */}
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Ticket Status</label>
                                    <select
                                        value={status}
                                        onChange={e => setStatus(e.target.value)}
                                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-gray-700 bg-white"
                                    >
                                        <option value="">All statuses</option>
                                        {STATUSES.map(s => (
                                            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-4">
                                <button
                                    onClick={handleApply}
                                    className="px-5 py-2 bg-[#F37021] text-white text-sm font-bold rounded-lg hover:bg-orange-600 transition-colors"
                                >
                                    Apply Filters
                                </button>
                                <button
                                    onClick={handleReset}
                                    className="px-5 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Stat Cards ── */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    <StatCard
                        icon={Ticket}
                        label="Total Tickets"
                        value={totalTickets}
                        color="text-orange-600"
                        bg="bg-orange-50"
                        loading={loading}
                    />
                    <StatCard
                        icon={CheckCircle2}
                        label="Resolved Tickets"
                        value={resolvedTickets}
                        sub="Successfully handled"
                        color="text-green-600"
                        bg="bg-green-50"
                        loading={loading}
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="Resolution Success Rate"
                        value={`${resolutionRate}%`}
                        sub="Quality indicator"
                        color="text-violet-600"
                        bg="bg-violet-50"
                        loading={loading}
                    />
                    <StatCard
                        icon={Clock}
                        label="Avg. Resolution Time"
                        value={avgResolutionTime}
                        sub="Efficiency metric"
                        color="text-blue-600"
                        bg="bg-blue-50"
                        loading={loading}
                    />
                </div>

                {/* ── Extra Summary Stat Cards ── */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl border border-indigo-100 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                            <CalendarClock className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-gray-300 mt-1" />
                            ) : (
                                <>
                                    <p className="text-2xl font-black text-indigo-600">{totalScheduleChanges}</p>
                                    <p className="text-xs text-gray-500 font-medium mt-0.5">Total Schedule Change Requests</p>
                                    <p className="text-[11px] text-indigo-500 font-semibold mt-1">Submitted by all Proctors</p>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-teal-100 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
                        <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-5 h-5 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-gray-300 mt-1" />
                            ) : (
                                <>
                                    <p className="text-2xl font-black text-teal-600">{totalHallTickets}</p>
                                    <p className="text-xs text-gray-500 font-medium mt-0.5">Tickets Handled by Hall Invigilators</p>
                                    <p className="text-[11px] text-teal-500 font-semibold mt-1">Assigned to Hall Invigilators</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Charts Row 1: Pie + Line ── */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {/* Pie: Status Distribution */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertCircle className="w-4 h-4 text-[#F37021]" />
                            <div>
                                <h2 className="text-sm font-black text-gray-800">Ticket Status Distribution</h2>
                                <p className="text-[10px] text-gray-400">Current ticket status breakdown</p>
                            </div>
                        </div>
                        {loading ? (
                            <div className="h-52 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                            </div>
                        ) : statusGroups.length === 0 ? (
                            <div className="h-52 flex items-center justify-center text-sm text-gray-400">No data</div>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie
                                            data={statusGroups}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={85}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {statusGroups.map((entry, idx) => (
                                                <Cell key={idx} fill={STATUS_COLORS[entry.name] ?? "#94a3b8"} />
                                            ))}
                                        </Pie>
                                        <ReTooltip
                                            formatter={(val: number, name: string) => [val, STATUS_LABEL[name] ?? name]}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="mt-3 space-y-1.5">
                                    {statusGroups.map((entry, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ background: STATUS_COLORS[entry.name] ?? "#94a3b8" }} />
                                                <span className="text-gray-600 font-medium">{STATUS_LABEL[entry.name] ?? entry.name}</span>
                                            </div>
                                            <span className="font-black text-gray-800 tabular-nums">{entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Line: Trend Over Time */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="w-4 h-4 text-[#F37021]" />
                            <div>
                                <h2 className="text-sm font-black text-gray-800">Ticket Trend Over Time</h2>
                                <p className="text-[10px] text-gray-400">Created vs. Resolved tickets by date</p>
                            </div>
                        </div>
                        {loading ? (
                            <div className="h-52 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                                    <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} allowDecimals={false} />
                                    <ReTooltip />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                                    <Line type="monotone" dataKey="created" stroke="#F37021" strokeWidth={2} dot={{ r: 3 }} name="Created" />
                                    <Line type="monotone" dataKey="resolved" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Resolved" />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* ── Chart Row 2: Bar ── */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart2 className="w-4 h-4 text-[#F37021]" />
                        <div>
                            <h2 className="text-sm font-black text-gray-800">Ticket Category Breakdown</h2>
                            <p className="text-[10px] text-gray-400">Number of tickets by incident category</p>
                        </div>
                    </div>
                    {loading ? (
                        <div className="h-44 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                        </div>
                    ) : typeGroups.length === 0 ? (
                        <div className="h-44 flex items-center justify-center text-sm text-gray-400">No data</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={typeGroups} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} />
                                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                                <ReTooltip />
                                <Bar dataKey="value" name="Tickets" radius={[4, 4, 0, 0]}>
                                    {typeGroups.map((_, idx) => (
                                        <Cell key={idx} fill={TYPE_COLORS[idx % TYPE_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* ── Proctor Slot Statistics ── */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#F37021]" />
                            <div>
                                <h2 className="text-sm font-black text-gray-800">Proctor Slot Statistics</h2>
                                <p className="text-[10px] text-gray-400">Number of exam slots each proctor is assigned to</p>
                            </div>
                        </div>
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search proctor..."
                                value={proctorSearch}
                                onChange={e => setProctorSearch(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 w-48"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="h-52 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                        </div>
                    ) : filteredProctorData.length === 0 ? (
                        <div className="h-52 flex items-center justify-center text-sm text-gray-400">No proctor data available</div>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                            {/* Bar Chart */}
                            <ResponsiveContainer width="100%" height={Math.max(180, filteredProctorData.length * 36)}>
                                <BarChart
                                    layout="vertical"
                                    data={filteredProctorData.slice(0, 15)}
                                    margin={{ top: 4, right: 40, left: 10, bottom: 4 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={130}
                                        tick={{ fontSize: 10, fill: "#64748b" }}
                                        tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 17) + "…" : v}
                                    />
                                    <ReTooltip formatter={(val: number) => [`${val} slot(s)`, "Assigned Slots"]} />
                                    <Bar dataKey="slots" name="Slots" radius={[0, 4, 4, 0]}>
                                        {filteredProctorData.slice(0, 15).map((_, idx) => (
                                            <Cell key={idx} fill={TYPE_COLORS[idx % TYPE_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>

                            {/* Ranked Table */}
                            <div className="overflow-y-auto max-h-80">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-white">
                                        <tr className="border-b border-gray-100 bg-gray-50">
                                            <th className="px-4 py-2.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wide">#</th>
                                            <th className="px-4 py-2.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wide">Proctor Name</th>
                                            <th className="px-4 py-2.5 text-right text-[10px] font-black text-gray-400 uppercase tracking-wide">Slots Assigned</th>
                                            <th className="px-4 py-2.5 text-right text-[10px] font-black text-gray-400 uppercase tracking-wide">Share</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProctorData.map((d, idx) => {
                                            const totalSlots = proctorSlotData.reduce((s, x) => s + x.slots, 0);
                                            const pct = totalSlots > 0 ? Math.round((d.slots / totalSlots) * 100) : 0;
                                            return (
                                                <tr key={d.name} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                                                    <td className="px-4 py-2.5">
                                                        <span className={cn(
                                                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black",
                                                            idx === 0 ? "bg-amber-100 text-amber-700" :
                                                            idx === 1 ? "bg-gray-100 text-gray-600" :
                                                            idx === 2 ? "bg-orange-100 text-orange-600" :
                                                            "bg-gray-50 text-gray-400"
                                                        )}>{idx + 1}</span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-xs font-semibold text-gray-700">{d.name}</td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <span className="text-sm font-black text-[#F37021]">{d.slots}</span>
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="w-16 bg-gray-100 rounded-full h-1.5">
                                                                <div
                                                                    className="h-1.5 rounded-full bg-[#F37021]"
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] text-gray-500 w-8 text-right">{pct}%</span>
                                                        </div>
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

                {/* ── Schedule Change Statistics ── */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <ArrowLeftRight className="w-4 h-4 text-indigo-500" />
                            <div>
                                <h2 className="text-sm font-black text-gray-800">Proctor — Schedule Change Requests</h2>
                                <p className="text-[10px] text-gray-400">Number of schedule swap applications submitted by each proctor — ranked by most changes</p>
                            </div>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search proctor..."
                                value={scheduleSearch}
                                onChange={e => setScheduleSearch(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 w-48"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="h-44 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                        </div>
                    ) : filteredScheduleData.length === 0 ? (
                        <div className="h-44 flex items-center justify-center text-sm text-gray-400">No schedule change data available</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        {["#", "Proctor", "Code", "Total Requests", "Approved", "Rejected", "Pending"].map(h => (
                                            <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredScheduleData.map((d, idx) => (
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
                                            <td className="px-4 py-2.5 text-xs font-mono text-gray-400">{d.code ?? "—"}</td>
                                            <td className="px-4 py-2.5 text-center">
                                                <span className="text-sm font-black text-[#F37021]">{d.total}</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">{d.approved}</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">{d.rejected}</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">{d.pending}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ── Hall Invigilator Ticket Handling ── */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-teal-500" />
                            <div>
                                <h2 className="text-sm font-black text-gray-800">Hall Invigilator — Ticket Handling</h2>
                                <p className="text-[10px] text-gray-400">Number of tickets assigned and handled by each Hall Invigilator</p>
                            </div>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search staff..."
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
                        <div className="h-44 flex items-center justify-center text-sm text-gray-400">No ticket assignment data available</div>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                            {/* Bar Chart */}
                            <ResponsiveContainer width="100%" height={Math.max(180, filteredHallData.length * 40)}>
                                <BarChart
                                    layout="vertical"
                                    data={filteredHallData.slice(0, 15)}
                                    margin={{ top: 4, right: 40, left: 10, bottom: 4 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        width={130}
                                        tick={{ fontSize: 10, fill: "#64748b" }}
                                        tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 17) + "…" : v}
                                    />
                                    <ReTooltip formatter={(val: number, name: string) => [val, name === "total" ? "Total" : name === "solved" ? "Resolved" : "In Progress"]} />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                                    <Bar dataKey="total" name="Total" fill="#F37021" radius={[0, 4, 4, 0]} />
                                    <Bar dataKey="solved" name="Resolved" fill="#22c55e" radius={[0, 4, 4, 0]} />
                                    <Bar dataKey="inProgress" name="In Progress" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>

                            {/* Table */}
                            <div className="overflow-y-auto max-h-80">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-white">
                                        <tr className="border-b border-gray-100 bg-gray-50">
                                            {["#", "Staff Name", "Role", "Total", "Resolved", "In Progress"].map(h => (
                                                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredHallData.map((d, idx) => {
                                            const solvedPct = d.total > 0 ? Math.round((d.solved / d.total) * 100) : 0;
                                            const roleLabel: Record<string, string> = {
                                                HALL_INVIGILATOR: "Hall Invigilator",
                                                IT_SUPPORT: "IT Support",
                                                EXAM_OFFICER: "Exam Officer",
                                                ADMIN: "Admin",
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
                                                            <span className="text-xs font-bold text-green-600">{d.solved}</span>
                                                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                                                <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${solvedPct}%` }} />
                                                            </div>
                                                            <span className="text-[10px] text-gray-400">{solvedPct}%</span>
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

                {/* ── Detailed Ticket Table ── */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 bg-orange-50/40">
                        <div className="flex items-center gap-2">
                            <Ticket className="w-4 h-4 text-[#F37021]" />
                            <div>
                                <h2 className="text-sm font-black text-gray-800">Detailed Ticket Data</h2>
                                <p className="text-[10px] text-[#F37021] font-medium">Click on any row to view ticket details</p>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    {["TICKET ID", "CATEGORY", "EXAM ROOM", "CREATED TIME", "RESOLVED TIME", "DURATION", "STATUS"].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wide whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="py-14 text-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-gray-300 mx-auto" />
                                        </td>
                                    </tr>
                                ) : pageTickets.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-14 text-center text-sm text-gray-400">
                                            No tickets found for the selected filters.
                                        </td>
                                    </tr>
                                ) : pageTickets.map((t, i) => {
                                    const globalIdx = (page - 1) * PAGE_SIZE + i;
                                    const room = t.session?.examRoom?.roomNumber ?? (t.session as any)?.roomNumber ?? "—";
                                    const dur = calcDuration(t);
                                    const statusColor: Record<string, string> = {
                                        SOLVED: "bg-green-100 text-green-700",
                                        IN_PROGRESS: "bg-amber-100 text-amber-700",
                                        OPEN: "bg-orange-100 text-orange-700",
                                        PENDING: "bg-gray-100 text-gray-500",
                                        REJECTED: "bg-red-100 text-red-700",
                                    };
                                    return (
                                        <tr key={t.id} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors cursor-pointer group">
                                            <td className="px-4 py-3 font-mono text-xs font-bold text-gray-600">{ticketSeqId(globalIdx)}</td>
                                            <td className="px-4 py-3 text-xs text-gray-600">{t.issueType ?? "—"}</td>
                                            <td className="px-4 py-3 text-xs font-semibold text-gray-700">{room}</td>
                                            <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                                {format(parseISO(t.createdAt), "yyyy-MM-dd HH:mm")}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                                {t.status === "SOLVED" ? format(parseISO(t.updatedAt), "yyyy-MM-dd HH:mm") : "—"}
                                            </td>
                                            <td className={cn("px-4 py-3 text-xs font-bold whitespace-nowrap", dur !== null ? "text-emerald-600" : "text-gray-400")}>
                                                {fmtDuration(dur)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold", statusColor[t.status] ?? "bg-gray-100 text-gray-600")}>
                                                    {STATUS_LABEL[t.status] ?? t.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                        <p className="text-xs text-gray-500">
                            Showing {Math.min((page - 1) * PAGE_SIZE + 1, totalTickets)}–{Math.min(page * PAGE_SIZE, totalTickets)} of {totalTickets} tickets
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
                            >
                                Previous
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                                return (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={cn(
                                            "w-8 h-8 text-xs font-bold rounded-lg transition-colors",
                                            page === p ? "bg-[#F37021] text-white" : "border border-gray-200 text-gray-600 hover:bg-white"
                                        )}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          </div>

          {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatCard
            icon={Ticket}
            label="Tổng ticket"
            value={stats?.summary.totalTickets ?? "—"}
            hint={stats ? `${stats.filters.semesterName}${stats.filters.week ? ` • Week ${stats.filters.week}` : ""}` : undefined}
            color="text-orange-600"
            bg="bg-orange-50"
            loading={loadingStats}
          />
          <StatCard
            icon={Timer}
            label="Thời gian bắt đầu xử lý TB"
            value={formatMinutes(stats?.summary.avgTimeToStartMinutes)}
            hint={stats ? `Dựa trên ${stats.summary.startedSampleSize} ticket có timeline hợp lệ` : undefined}
            color="text-blue-600"
            bg="bg-blue-50"
            loading={loadingStats}
          />
          <StatCard
            icon={Clock3}
            label="Thời gian xử lý xong TB"
            value={formatMinutes(stats?.summary.avgTimeToResolveMinutes)}
            hint={stats ? `Dựa trên ${stats.summary.resolvedSampleSize} ticket có timeline hợp lệ` : undefined}
            color="text-emerald-600"
            bg="bg-emerald-50"
            loading={loadingStats}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <ChartCard
            title="Ticket theo loại lỗi"
            subtitle="So sánh số lượng ticket theo issue type trong phạm vi đã chọn"
            icon={BarChart2}
            loading={loadingStats}
            empty={!loadingStats && (!!error || isEmpty || issueTypeData.length === 0)}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={issueTypeData} margin={{ top: 8, right: 8, left: -10, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <ReTooltip formatter={(value: number) => [`${value} ticket`, "Số lượng"]} />
                <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                  {issueTypeData.map((_, index) => (
                    <Cell key={`type-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Môn thi có nhiều ticket nhất"
            subtitle="Top môn thi phát sinh nhiều ticket nhất trong phạm vi đã chọn"
            icon={BookOpen}
            loading={loadingStats}
            empty={!loadingStats && (!!error || isEmpty || subjectData.length === 0)}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subjectData} margin={{ top: 8, right: 8, left: -10, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <ReTooltip formatter={(value: number) => [`${value} ticket`, "Số lượng"]} />
                <Bar dataKey="count" radius={[10, 10, 0, 0]} fill="#2563EB" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <ChartCard
            title="Top lỗi chi tiết"
            subtitle="Issue name xuất hiện nhiều nhất, ưu tiên hiển thị dạng ngang để đọc label dài"
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
                <ReTooltip formatter={(value: number) => [`${value} ticket`, "Số lượng"]} />
                <Bar dataKey="count" radius={[0, 10, 10, 0]} fill="#0F766E" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Phân bố ticket theo semester"
            subtitle="So sánh tổng ticket giữa các học kỳ trong hệ thống"
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
                <ReTooltip formatter={(value: number, _name: string, item: any) => [`${value} ticket`, item?.payload?.name ?? "Semester"]} />
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

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">Tóm tắt dữ liệu đang hiển thị</h2>
              <p className="text-xs text-slate-500">Khối này giúp người dùng đọc nhanh khi không muốn nhìn chart.</p>
            </div>
            {stats ? (
              <p className="text-xs font-medium text-slate-400">
                Phạm vi: {stats.filters.semesterCode}
                {stats.filters.week ? ` • Week ${stats.filters.week}` : " • All weeks"}
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
                title="Issue type"
                items={issueTypeData}
              />
              <SummaryList
                title="Issue name"
                items={issueNameData}
              />
              <SummaryList
                title="Top subjects"
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
  if (items.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
        <p className="mt-6 text-sm text-slate-400">Không có dữ liệu.</p>
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
