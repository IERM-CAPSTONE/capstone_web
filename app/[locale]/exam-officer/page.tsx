"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format, isToday, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Calendar, Clock, Users, UserCheck, Building2, Ticket,
  ClipboardList, ChevronRight, CheckCircle2, XCircle,
  AlertCircle, BookOpen, Loader2, RefreshCw, Plus,
  FileSpreadsheet, UserCog, Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useExamSchedules } from "@/hooks/use-exam-schedules";
import {
  useProctorApplications,
  useUpdateProctorApplicationStatus,
} from "@/hooks/use-proctor-applications";
import { ExamSchedule } from "@/lib/api/exam-schedules";
import { toast } from "sonner";
import { parseLocalDate } from "@/app/[locale]/exam-officer/exam-schedules/utils";

// ── helpers ──────────────────────────────────────────────────────────────────
function computeStatus(open: string | null, close: string | null) {
  if (!open || !close) return "upcoming";
  const now = new Date();
  const o = parseLocalDate(open), c = parseLocalDate(close);
  if (!o || !c) return "upcoming";
  if (now < o) return "upcoming";
  if (now <= c) return "ongoing";
  return "completed";
}

const STATUS_LABEL: Record<string, string> = {
  upcoming: "Sắp diễn ra",
  ongoing: "Đang diễn ra",
  completed: "Đã kết thúc",
};
const STATUS_COLOR: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  ongoing: "bg-green-100 text-green-700",
  completed: "bg-slate-100 text-slate-500",
};
const STATUS_DOT: Record<string, string> = {
  upcoming: "bg-blue-500",
  ongoing: "bg-green-500 animate-pulse",
  completed: "bg-slate-400",
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  sub?: string;
}
function StatCard({ label, value, icon: Icon, iconBg, iconColor, sub }: StatCardProps) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", iconBg)}>
          <Icon className={cn("w-6 h-6", iconColor)} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ExamOfficerDashboard() {
  // Real data: today's schedule
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const { data: scheduleResp, isLoading: schedLoading, refetch: refetchSched } = useExamSchedules({
    fromDate: todayStr,
    toDate: todayStr,
    limit: 50,
  });

  // Pending proctor applications
  const { data: appsResp, isLoading: appsLoading, refetch: refetchApps } = useProctorApplications({
    status: "PENDING",
    limit: 10,
  });

  const { mutate: updateStatus } = useUpdateProctorApplicationStatus();

  const schedules: ExamSchedule[] = scheduleResp?.data ?? [];
  const applications = appsResp?.data ?? [];

  // Derive stats from real data
  const stats = useMemo(() => {
    const ongoing = schedules.filter(s => computeStatus(s.examOpenTime, s.examCloseTime) === "ongoing").length;
    const upcoming = schedules.filter(s => computeStatus(s.examOpenTime, s.examCloseTime) === "upcoming").length;
    const completed = schedules.filter(s => computeStatus(s.examOpenTime, s.examCloseTime) === "completed").length;
    const assignedRooms = new Set(schedules.map(s => s.examRoomId).filter(Boolean)).size;
    return { ongoing, upcoming, completed, total: schedules.length, pendingApps: applications.length, assignedRooms };
  }, [schedules, applications]);

  const handleApprove = (id: string) => {
    updateStatus({ id, data: { status: "APPROVED" } }, {
      onSuccess: () => { toast.success("Đã duyệt đơn đăng ký"); refetchApps(); },
      onError: () => toast.error("Không thể duyệt đơn này"),
    });
  };
  const handleReject = (id: string) => {
    updateStatus({ id, data: { status: "REJECTED" } }, {
      onSuccess: () => { toast.success("Đã từ chối đơn đăng ký"); refetchApps(); },
      onError: () => toast.error("Không thể từ chối đơn này"),
    });
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bảng điều khiển Khảo thí</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {format(new Date(), "EEEE, dd/MM/yyyy", { locale: vi })} · Hệ thống quản lý phòng thi
          </p>
        </div>
        <button
          onClick={() => { refetchSched(); refetchApps(); }}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-600 transition-colors mt-1"
        >
          <RefreshCw className="w-4 h-4" /> Làm mới
        </button>
      </div>

      {/* ── Quick Actions ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/vi/exam-officer/exam-schedules/create", icon: Plus, label: "Tạo lịch thi", bg: "bg-orange-500 hover:bg-orange-600" },
          { href: "/vi/exam-officer/exam-schedules", icon: Calendar, label: "Quản lý lịch thi", bg: "bg-blue-500 hover:bg-blue-600" },
          { href: "/vi/exam-officer/proctor-applications", icon: UserCog, label: "Đơn giám thị", bg: "bg-purple-500 hover:bg-purple-600" },
          { href: "/vi/exam-officer/rooms", icon: Building2, label: "Phòng thi", bg: "bg-slate-600 hover:bg-slate-700" },
        ].map(({ href, icon: Icon, label, bg }) => (
          <Link key={href} href={href}>
            <button className={cn("w-full h-14 flex items-center justify-center gap-2 rounded-xl text-white text-sm font-semibold transition-colors", bg)}>
              <Icon className="w-4 h-4" />{label}
            </button>
          </Link>
        ))}
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ca thi hôm nay" value={stats.total} icon={Calendar}
          iconBg="bg-orange-100" iconColor="text-orange-600"
          sub={`${stats.ongoing} đang diễn ra`} />
        <StatCard label="Đang thi" value={stats.ongoing} icon={Clock}
          iconBg="bg-green-100" iconColor="text-green-600"
          sub={`${stats.upcoming} sắp diễn ra`} />
        <StatCard label="Phòng được sử dụng" value={stats.assignedRooms} icon={Building2}
          iconBg="bg-blue-100" iconColor="text-blue-600"
          sub="hôm nay" />
        <StatCard label="Đơn chờ duyệt" value={stats.pendingApps} icon={UserCheck}
          iconBg="bg-purple-100" iconColor="text-purple-600"
          sub="đơn đăng ký giám thị" />
      </div>

      {/* ── Main Grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Today's Schedule (2 cols) */}
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader className="pb-2 px-5 pt-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-500" />
                Lịch thi hôm nay
                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">{schedules.length}</span>
              </CardTitle>
              <Link href="/vi/exam-officer/exam-schedules" className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-0.5">
                Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {schedLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> <span className="text-sm">Đang tải...</span>
              </div>
            ) : schedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <BookOpen className="w-10 h-10 opacity-30 mb-2" />
                <p className="text-sm">Không có ca thi nào hôm nay</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {schedules.map((s) => {
                  const status = computeStatus(s.examOpenTime, s.examCloseTime);
                  const openTime = s.examOpenTime ? (() => { const d = parseLocalDate(s.examOpenTime); return d ? format(d, "HH:mm") : "--"; })() : "--";
                  const closeTime = s.examCloseTime ? (() => { const d = parseLocalDate(s.examCloseTime); return d ? format(d, "HH:mm") : "--"; })() : "--";
                  return (
                    <Link key={s.id} href={`/vi/exam-officer/exam-schedules/${s.id}`}>
                      <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 hover:border-orange-200 hover:bg-orange-50/40 transition-all cursor-pointer group">
                        <div className="shrink-0 w-10 h-10 rounded-lg bg-slate-100 flex flex-col items-center justify-center text-center">
                          <span className="text-[10px] text-slate-500 font-semibold leading-none">{openTime}</span>
                          <div className="w-4 h-px bg-slate-300 my-0.5" />
                          <span className="text-[10px] text-slate-400 leading-none">{closeTime}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm truncate">{s.subjectCode || s.examCode || "—"}</span>
                            {s.examCode && <span className="text-xs text-slate-400 font-mono">{s.examCode}</span>}
                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", STATUS_COLOR[status])}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_DOT[status])} />
                              {STATUS_LABEL[status]}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            {s.roomNumber && (
                              <span className="flex items-center gap-0.5">
                                <Building2 className="w-3 h-3" /> {s.roomNumber}
                              </span>
                            )}
                            {s.proctorName && (
                              <span className="flex items-center gap-0.5">
                                <Users className="w-3 h-3" /> {s.proctorName}
                              </span>
                            )}
                            {s.semester && <span className="text-slate-400">{s.semester}</span>}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-orange-400 shrink-0" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar: Status Summary + Quick Links */}
        <div className="space-y-4">
          {/* Status breakdown */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" /> Tổng quan hôm nay
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-2">
              {[
                { label: "Đang diễn ra", count: stats.ongoing, color: "bg-green-500" },
                { label: "Sắp diễn ra", count: stats.upcoming, color: "bg-blue-500" },
                { label: "Đã kết thúc", count: stats.completed, color: "bg-slate-300" },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", color)} />
                    <span className="text-sm text-slate-600">{label}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{count}</span>
                </div>
              ))}
              <div className="pt-2 mt-1 border-t border-slate-100">
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex gap-0.5">
                  {stats.total > 0 && <>
                    <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${(stats.ongoing / stats.total) * 100}%` }} />
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${(stats.upcoming / stats.total) * 100}%` }} />
                    <div className="bg-slate-300 h-1.5 rounded-full transition-all" style={{ width: `${(stats.completed / stats.total) * 100}%` }} />
                  </>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick shortcuts */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2 px-5 pt-5">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-slate-400" /> Truy cập nhanh
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-1.5">
              {[
                { href: "/vi/exam-officer/subjects", label: "Quản lý môn học", icon: BookOpen },
                { href: "/vi/exam-officer/semesters", label: "Học kỳ", icon: Calendar },
                { href: "/vi/exam-officer/students", label: "Sinh viên", icon: Users },
                { href: "/vi/exam-officer/rooms", label: "Phòng thi", icon: Building2 },
              ].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}>
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors group">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-orange-500" />
                    <span className="text-sm text-slate-700 group-hover:text-slate-900">{label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-orange-400 ml-auto" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Proctor Applications ───────────────────────────────── */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2 px-5 pt-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-500" />
              Đơn đăng ký giám thị chờ duyệt
              {applications.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">{applications.length}</span>
              )}
            </CardTitle>
            <Link href="/vi/exam-officer/proctor-applications" className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-0.5">
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {appsLoading ? (
            <div className="flex items-center gap-2 py-6 justify-center text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" /> <span className="text-sm">Đang tải...</span>
            </div>
          ) : applications.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-slate-400">
              <CheckCircle2 className="w-8 h-8 opacity-30 mb-2" />
              <p className="text-sm">Không có đơn nào chờ duyệt</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 px-2 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                <div className="col-span-3">Giảng viên</div>
                <div className="col-span-2">Mã giảng viên</div>
                <div className="col-span-2">Ca ưu tiên</div>
                <div className="col-span-2">Loại ưu tiên</div>
                <div className="col-span-2">Ngày mong muốn</div>
                <div className="col-span-1 text-center">Hành động</div>
              </div>
              {applications.map((app) => (
                <div key={app.id} className="grid grid-cols-12 gap-2 px-2 py-3 items-center hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="col-span-3">
                    <p className="font-semibold text-sm text-slate-900 truncate">{app.teacherName || "—"}</p>
                  </div>
                  <div className="col-span-2 text-xs text-slate-500 font-mono">{app.teacherCode || "—"}</div>
                  <div className="col-span-2">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold",
                      app.preferredShift === "MORNING" ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700")}>
                      {app.preferredShift === "MORNING" ? "Sáng" : "Chiều"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold",
                      app.preferredType === "ROOM" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700")}>
                      {app.preferredType === "ROOM" ? "Phòng thi" : "Hội trường"}
                    </span>
                  </div>
                  <div className="col-span-2 text-xs text-slate-500">
                    {app.preferredDate ? format(new Date(app.preferredDate), "dd/MM/yyyy") : "—"}
                  </div>
                  <div className="col-span-1 flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleApprove(app.id)}
                      title="Duyệt"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReject(app.id)}
                      title="Từ chối"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
