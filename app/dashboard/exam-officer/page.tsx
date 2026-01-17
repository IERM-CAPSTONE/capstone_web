"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Eye,
  Calendar,
  AlertCircle,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useExamSchedules } from "@/hooks/use-exam-schedules";

export default function ExamOfficerDashboardPage() {
  const router = useRouter();
  const { data: schedulesData } = useExamSchedules({ limit: 5 });
  const [stats, setStats] = useState({
    totalRooms: 24,
    examsToday: 12,
    totalStudents: 1847,
    activeProctors: 18,
  });

  const schedules = schedulesData?.data || [];

  // Parse date strings as local time (avoid timezone conversion)
  const parseLocalDate = (dateStr: string | null): Date | null => {
    if (!dateStr) return null;
    // If it's an ISO string with timezone, extract local components
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (isoMatch) {
      // Create date using local time components (no timezone conversion)
      return new Date(
        parseInt(isoMatch[1]),
        parseInt(isoMatch[2]) - 1,
        parseInt(isoMatch[3]),
        parseInt(isoMatch[4]),
        parseInt(isoMatch[5]),
        parseInt(isoMatch[6])
      );
    }
    return new Date(dateStr);
  };

  // Calculate exam status
  const getExamStatus = (schedule: any) => {
    const now = new Date();
    const open = schedule.examOpenTime
      ? parseLocalDate(schedule.examOpenTime)
      : null;
    const close = schedule.examCloseTime
      ? parseLocalDate(schedule.examCloseTime)
      : null;

    if (open && close) {
      if (now >= open && now <= close) {
        return { status: "Ongoing", color: "bg-green-100 text-green-800" };
      } else if (now > close) {
        return { status: "Completed", color: "bg-gray-100 text-gray-800" };
      }
    }
    return { status: "Upcoming", color: "bg-yellow-100 text-yellow-800" };
  };

  const ongoingExams = schedules.filter(
    (s) => getExamStatus(s).status === "Ongoing"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Overview of exam operations and monitoring
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Button
            onClick={() => router.push("/dashboard/rooms")}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-12"
          >
            <Eye className="h-4 w-4" />
            View Exam Rooms
          </Button>
          <Button
            onClick={() => router.push("/dashboard/exams")}
            className="bg-green-600 hover:bg-green-700 text-white gap-2 h-12"
          >
            <Calendar className="h-4 w-4" />
            View Schedules
          </Button>
          <Button
            onClick={() => router.push("/dashboard/monitoring")}
            className="bg-orange-600 hover:bg-orange-700 text-white gap-2 h-12"
          >
            <AlertCircle className="h-4 w-4" />
            View Events
          </Button>
          <Button
            onClick={() => router.push("/dashboard/exams")}
            className="bg-red-600 hover:bg-red-700 text-white gap-2 h-12"
          >
            <Plus className="h-4 w-4" />
            Create Schedule
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Exam Rooms
                </p>
                <Eye className="h-4 w-4 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold">{stats.totalRooms}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Exams Today
                </p>
                <Calendar className="h-4 w-4 text-orange-500" />
              </div>
              <h3 className="text-2xl font-bold">{stats.examsToday}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Students
                </p>
                <Users className="h-4 w-4 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold">{stats.totalStudents}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Active Proctors
                </p>
                <CheckCircle2 className="h-4 w-4 text-purple-500" />
              </div>
              <h3 className="text-2xl font-bold">{stats.activeProctors}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exam Schedule Overview */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">Exam Schedule Overview</CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-orange-600 text-white hover:bg-orange-700 border-0"
              >
                Orange
              </Button>
              <span className="text-xs text-gray-500">This Week</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {schedules.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                No exam schedules
              </p>
            ) : (
              schedules.map((schedule) => {
                const { status, color } = getExamStatus(schedule);
                return (
                  <div
                    key={schedule.id}
                    className="space-y-2 pb-4 border-b last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-sm">
                          {schedule.subjectCode || "Unknown Subject"}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {schedule.examRoomId && (
                            <>
                              <Clock className="inline h-3 w-3 mr-1" />
                              {schedule.examOpenTime
                                ? (() => {
                                    try {
                                      const date = parseLocalDate(schedule.examOpenTime);
                                      return date ? format(date, "HH:mm") : "-";
                                    } catch {
                                      return "-";
                                    }
                                  })()
                                : "-"}
                              -{" "}
                              {schedule.examCloseTime
                                ? (() => {
                                    try {
                                      const date = parseLocalDate(schedule.examCloseTime);
                                      return date ? format(date, "HH:mm") : "-";
                                    } catch {
                                      return "-";
                                    }
                                  })()
                                : "-"}
                            </>
                          )}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
                        {status}
                      </span>
                    </div>
                    {schedule.proctorId && (
                      <p className="text-xs text-gray-500">
                        Proctor: {schedule.proctorId}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Ticket Alert */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Ticket Alert
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-red-800 dark:text-red-300">
                  Ticket alert
                </p>
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                  High
                </span>
              </div>
              <p className="text-xs text-red-700 dark:text-red-300">
                Exam Room A203
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                01:45 AM
              </p>
            </div>

            <div className="space-y-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                  Ticket alert
                </p>
                <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                  Medium
                </span>
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Exam Room B105
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                03:30 AM
              </p>
            </div>

            <div className="space-y-2 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-green-800 dark:text-green-300">
                  Ticket alert
                </p>
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                  Low
                </span>
              </div>
              <p className="text-xs text-green-700 dark:text-green-300">
                Exam Room C301
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                03:15 AM
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full text-orange-600 hover:text-orange-700 text-xs"
              onClick={() => router.push("/dashboard/monitoring")}
            >
              View All Alerts
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Invigilator Applications and Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invigilator Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Applicant</th>
                    <th className="text-left py-2 px-2">Exam Room</th>
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-center py-2 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="py-2 px-2">
                      <div>
                        <p className="font-medium">Dr. Tran Minh Hieu</p>
                        <p className="text-gray-500">tran@example.edu</p>
                      </div>
                    </td>
                    <td className="py-2 px-2">Room A-301</td>
                    <td className="py-2 px-2">Jan 5, 2026</td>
                    <td className="py-2 px-2">
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                        Pending
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="text-green-600 cursor-pointer">✓</span>
                      <span className="text-red-600 cursor-pointer ml-2">✕</span>
                    </td>
                  </tr>
                  <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="py-2 px-2">
                      <div>
                        <p className="font-medium">Ms. Le Thi Thu</p>
                        <p className="text-gray-500">lethu@example.edu</p>
                      </div>
                    </td>
                    <td className="py-2 px-2">Room B-105</td>
                    <td className="py-2 px-2">Jan 5, 2026</td>
                    <td className="py-2 px-2">
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                        Pending
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="text-green-600 cursor-pointer">✓</span>
                      <span className="text-red-600 cursor-pointer ml-2">✕</span>
                    </td>
                  </tr>
                  <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="py-2 px-2">
                      <div>
                        <p className="font-medium">Mr. Nguyen Quang Dung</p>
                        <p className="text-gray-500">dung@example.edu</p>
                      </div>
                    </td>
                    <td className="py-2 px-2">Room C-202</td>
                    <td className="py-2 px-2">Jan 5, 2026</td>
                    <td className="py-2 px-2">
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                        Pending
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="text-green-600 cursor-pointer">✓</span>
                      <span className="text-red-600 cursor-pointer ml-2">✕</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <Button
              variant="outline"
              className="w-full text-orange-600 hover:text-orange-700 text-xs mt-4"
              onClick={() => router.push("/dashboard/accounts")}
            >
              View All Applications
            </Button>
          </CardContent>
        </Card>

        {/* Reports & Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reports & Analytics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
              onClick={() => router.push("/dashboard/reports")}
            >
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm">Exam Reports</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    View detailed statistics
                  </p>
                </div>
              </div>
            </div>

            <div
              className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
              onClick={() => router.push("/dashboard/reports")}
            >
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm">
                    Performance Analytics
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Student & proctor metrics
                  </p>
                </div>
              </div>
            </div>

            <div
              className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
              onClick={() => router.push("/dashboard/reports")}
            >
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-purple-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm">Exam Data</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Download schedule payloads
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <h4 className="font-semibold text-sm text-orange-800 dark:text-orange-200">
                Monthly Summary
              </h4>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                488 exams completed this month
              </p>
              <Button
                variant="outline"
                className="w-full text-orange-600 hover:text-orange-700 text-xs mt-3"
                onClick={() => router.push("/dashboard/reports")}
              >
                View Full Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
