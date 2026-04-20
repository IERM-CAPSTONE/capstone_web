"use client";

import { useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
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
  BarChart2,
  BookOpen,
  CalendarRange,
  Clock3,
  Loader2,
  RefreshCw,
  Ticket,
  Timer,
  Download,
  FileText,
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
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [selectedWeek, setSelectedWeek] = useState<string>("all");
  const [stats, setStats] = useState<TicketStatsResponse | null>(null);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadSemesters = async () => {
      setLoadingFilters(true);
      try {
        const response = await semestersApi.getAll({ page: 1, limit: 100 });
        const nextSemesters = [...response.data].sort(
          (left, right) => new Date(right.startDate).getTime() - new Date(left.startDate).getTime(),
        );

        if (!active) return;
        setSemesters(nextSemesters);
        if (!selectedSemesterId && nextSemesters.length > 0) {
          setSelectedSemesterId(nextSemesters[0].id);
        }
      } catch {
        if (!active) return;
        setError("Không thể tải danh sách semester.");
      } finally {
        if (active) {
          setLoadingFilters(false);
        }
      }
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
      }
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

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Semester</span>
              <select
                value={selectedSemesterId}
                onChange={(event) => handleSemesterChange(event.target.value)}
                disabled={loadingFilters}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none ring-0 transition-colors focus:border-orange-300"
              >
                {semesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    {semester.name ?? semester.code}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Week</span>
              <select
                value={selectedWeek}
                onChange={(event) => setSelectedWeek(event.target.value)}
                disabled={!selectedSemester || loadingFilters}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none ring-0 transition-colors focus:border-orange-300"
              >
                <option value="all">Toàn bộ semester</option>
                {weekOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <div className="w-full rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">Ghi chú</p>
                <p className="mt-2 text-sm font-medium text-orange-700">Week được tính từ ngày bắt đầu của semester.</p>
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
