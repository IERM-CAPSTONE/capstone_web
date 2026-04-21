"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Calendar,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
} from "lucide-react";

import { useAuthStore } from "@/store/auth-store";
import { examSchedulesApi, ExamSchedule } from "@/lib/api/exam-schedules";
import { parseLocalDate } from "@/app/[locale]/exam-officer/exam-schedules/utils";
import { cn } from "@/lib/utils/cn";

function getSessionStatus(session: ExamSchedule): "Upcoming" | "In Progress" | "Completed" {
  const now = new Date();
  const open = session.examOpenTime ? parseLocalDate(session.examOpenTime) : null;
  const close = session.examCloseTime ? parseLocalDate(session.examCloseTime) : null;

  if (!open || now < open) return "Upcoming";
  if (close && now > close) return "Completed";
  return "In Progress";
}

function isToday(iso?: string | null): boolean {
  if (!iso) return false;
  const date = parseLocalDate(iso);
  if (!date) return false;

  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

function isThisWeek(iso?: string | null): boolean {
  if (!iso) return false;
  const date = parseLocalDate(iso);
  if (!date) return false;

  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return date >= weekStart && date <= weekEnd;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "--";
  const d = parseLocalDate(iso);
  if (!d) return "--";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso?: string | null): string {
  if (!iso) return "--";
  const d = parseLocalDate(iso);
  if (!d) return "--";
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  Upcoming: "bg-orange-100 text-orange-700 border-orange-200",
  "In Progress": "bg-green-100 text-green-700 border-green-200",
  Completed: "bg-gray-100 text-gray-700 border-gray-200",
};

const PROGRESS_STEPS = ["Not Started", "Check-in", "In Progress", "Completed"];

export default function StudentDashboardPage() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<ExamSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"today" | "week" | "all">("week");

  const fetchSchedule = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const res = await examSchedulesApi.list({
        studentId: user.id,
        limit: 100,
      });

      const data = Array.isArray(res.data) ? res.data : [];
      const sorted = [...data].sort((a, b) => {
        const aTime = a.examOpenTime ? parseLocalDate(a.examOpenTime)?.getTime() ?? 0 : 0;
        const bTime = b.examOpenTime ? parseLocalDate(b.examOpenTime)?.getTime() ?? 0 : 0;
        return aTime - bTime;
      });
      setSessions(sorted);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load exam schedule");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const dashboardStats = useMemo(() => {
    const upcoming = sessions.filter((s) => getSessionStatus(s) === "Upcoming").length;
    const ongoing = sessions.filter((s) => getSessionStatus(s) === "In Progress").length;
    const today = sessions.filter((s) => isToday(s.examOpenTime)).length;
    const unread = sessions.filter((s) => {
      const open = s.examOpenTime ? parseLocalDate(s.examOpenTime) : null;
      if (!open) return false;
      const now = new Date();
      const diffHours = (open.getTime() - now.getTime()) / (1000 * 60 * 60);
      return diffHours >= 0 && diffHours <= 24;
    }).length;

    return { upcoming, ongoing, today, unread };
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    if (activeFilter === "today") {
      return sessions.filter((s) => isToday(s.examOpenTime));
    }

    if (activeFilter === "week") {
      return sessions.filter((s) => isThisWeek(s.examOpenTime));
    }

    return sessions;
  }, [sessions, activeFilter]);

  const nextSession = useMemo(() => {
    const now = new Date().getTime();
    return sessions.find((s) => {
      const open = s.examOpenTime ? parseLocalDate(s.examOpenTime) : null;
      if (!open) return false;
      return open.getTime() >= now;
    });
  }, [sessions]);

  const progressStep = useMemo(() => {
    if (!nextSession) return 0;

    const status = getSessionStatus(nextSession);
    if (status === "Completed") return 3;
    if (status === "In Progress") return 2;

    const open = nextSession.examOpenTime ? parseLocalDate(nextSession.examOpenTime) : null;
    if (!open) return 0;

    const now = new Date();
    const minutesToOpen = Math.floor((open.getTime() - now.getTime()) / (1000 * 60));
    if (minutesToOpen <= 15) return 1;
    return 0;
  }, [nextSession]);

  const notifications = useMemo(() => {
    const items = sessions
      .slice()
      .sort((a, b) => {
        const aTime = a.examOpenTime ? parseLocalDate(a.examOpenTime)?.getTime() ?? 0 : 0;
        const bTime = b.examOpenTime ? parseLocalDate(b.examOpenTime)?.getTime() ?? 0 : 0;
        return aTime - bTime;
      })
      .slice(0, 5)
      .map((session) => {
        const status = getSessionStatus(session);
        const title = session.subjectCode ?? "Exam";

        if (status === "In Progress") {
          return {
            type: "success",
            text: `${title} is currently in progress`,
            time: "Now",
          };
        }

        if (status === "Completed") {
          return {
            type: "neutral",
            text: `${title} has ended`,
            time: formatDate(session.examCloseTime),
          };
        }

        return {
          type: "warning",
          text: `${title} starts at ${formatTime(session.examOpenTime)}`,
          time: formatDate(session.examOpenTime),
        };
      });

    return items;
  }, [sessions]);

  return (
    <div className="min-h-full bg-gray-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name ?? "Student"}</h1>
          <p className="text-sm text-gray-500">Here is your exam overview</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Upcoming Exams" value={dashboardStats.upcoming} tone="blue" icon={Calendar} />
          <StatCard title="Exams Today" value={dashboardStats.today} tone="orange" icon={Clock3} />
          <StatCard title="Ongoing Exams" value={dashboardStats.ongoing} tone="green" icon={CheckCircle2} />
          <StatCard title="Unread Notifications" value={dashboardStats.unread} tone="purple" icon={Bell} />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <section className="rounded-xl border border-gray-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 p-4">
                <h2 className="text-base font-bold text-gray-900">Upcoming Exams</h2>
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                  <FilterTab label="Today" active={activeFilter === "today"} onClick={() => setActiveFilter("today")} />
                  <FilterTab label="This Week" active={activeFilter === "week"} onClick={() => setActiveFilter("week")} />
                  <FilterTab label="All" active={activeFilter === "all"} onClick={() => setActiveFilter("all")} />
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 text-gray-500">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading exam schedule...
                </div>
              ) : error ? (
                <div className="p-4 text-sm text-red-600">{error}</div>
              ) : filteredSessions.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No exams found for this period.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Room</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSessions.map((session) => {
                        const status = getSessionStatus(session);

                        return (
                          <tr key={session.id} className="border-b border-gray-50 last:border-0">
                            <td className="px-4 py-3 font-semibold text-gray-800">{session.subjectCode ?? "Exam"}</td>
                            <td className="px-4 py-3 text-gray-600">{formatDate(session.examOpenTime)}</td>
                            <td className="px-4 py-3 text-gray-600">
                              {formatTime(session.examOpenTime)} - {formatTime(session.examCloseTime)}
                            </td>
                            <td className="px-4 py-3 text-gray-600">{session.roomNumber ?? "TBA"}</td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  "inline-flex rounded-full border px-2 py-1 text-xs font-semibold",
                                  STATUS_BADGE_CLASS[status]
                                )}
                              >
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="text-base font-bold text-gray-900">Exam Status</h2>
              <p className="mt-1 text-xs text-gray-500">
                {nextSession
                  ? `${nextSession.subjectCode ?? "Exam"} · ${formatDate(nextSession.examOpenTime)} · ${formatTime(nextSession.examOpenTime)}`
                  : "No upcoming exam session"}
              </p>

              <div className="mt-5 grid grid-cols-4 gap-2">
                {PROGRESS_STEPS.map((step, index) => {
                  const active = index <= progressStep;
                  return (
                    <div key={step} className="flex flex-col items-center gap-2">
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold",
                          active
                            ? "border-green-500 bg-green-100 text-green-700"
                            : "border-gray-300 bg-gray-100 text-gray-400"
                        )}
                      >
                        {index + 1}
                      </div>
                      <span className={cn("text-[11px] font-medium", active ? "text-gray-700" : "text-gray-400")}>{step}</span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Important Notice: Check-in opens 15 minutes before the exam starts. Make sure you bring your student ID.
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <h2 className="text-base font-bold text-gray-900">Recent Notifications</h2>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                {notifications.length} new
              </span>
            </div>

            <div className="space-y-2 p-3">
              {notifications.length === 0 ? (
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500">
                  No recent notifications.
                </div>
              ) : (
                notifications.map((notification, index) => (
                  <div
                    key={`${notification.text}-${index}`}
                    className={cn(
                      "rounded-lg border p-3",
                      notification.type === "warning" && "border-orange-200 bg-orange-50",
                      notification.type === "success" && "border-green-200 bg-green-50",
                      notification.type === "neutral" && "border-gray-200 bg-gray-50"
                    )}
                  >
                    <p className="text-xs font-semibold text-gray-800">{notification.text}</p>
                    <p className="mt-1 text-[11px] text-gray-500">{notification.time}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> Data source: live exam sessions from backend API
          </span>
        </div>
      </div>
    </div>
  );
}

type StatTone = "blue" | "orange" | "green" | "purple";

function StatCard({
  title,
  value,
  tone,
  icon: Icon,
}: {
  title: string;
  value: number;
  tone: StatTone;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const toneClass: Record<StatTone, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    green: "bg-green-50 border-green-200 text-green-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
  };

  return (
    <div className={cn("rounded-xl border p-4", toneClass[tone])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{title}</p>
          <p className="mt-1 text-3xl font-bold leading-none">{value}</p>
        </div>
        <Icon className="h-5 w-5 opacity-80" />
      </div>
    </div>
  );
}

function FilterTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1 text-xs font-semibold transition",
        active
          ? "bg-orange-500 text-white"
          : "text-gray-600 hover:bg-gray-200"
      )}
    >
      {label}
    </button>
  );
}
