"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Calendar,
  Ticket,
  ClipboardList,
  Users,
  GraduationCap,
  UserCheck,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  TrendingUp,
  Download
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export default function ExamOfficerDashboard() {
  const [activeTab, setActiveTab] = useState<'today' | 'week'>('today');

  // Mock data - sẽ thay thế bằng API calls sau
  const stats = [
    {
      label: "Total Exam Rooms",
      value: "24",
      icon: Building2,
      color: "blue",
    },
    {
      label: "Total Exams Today",
      value: "12",
      icon: Calendar,
      color: "orange",
    },
    {
      label: "Total Students",
      value: "1,847",
      icon: GraduationCap,
      color: "green",
    },
    {
      label: "Active Proctors",
      value: "18",
      icon: UserCheck,
      color: "purple",
    },
  ];

  const examSchedules = [
    {
      id: "1",
      name: "Advanced Algorithms",
      status: "completed",
      time: "08:00 - 10:00",
      room: "Room A001",
      students: 45,
    },
    {
      id: "2",
      name: "Database Management I",
      status: "ongoing",
      time: "10:30 - 12:30",
      room: "Room B105",
      students: 50,
    },
    {
      id: "3",
      name: "Software Engineering",
      status: "upcoming",
      time: "14:00 - 16:00",
      room: "Room A003",
      students: 52,
    },
    {
      id: "4",
      name: "Machine Learning",
      status: "upcoming",
      time: "14:30 - 16:30",
      room: "Room C001",
      students: 38,
    },
  ];

  const invigilatorApplications = [
    {
      id: "1",
      name: "Dr. Trần Minh Hiếu",
      email: "hieu.tranminh.edu",
      room: "Room A301",
      date: "Jan 8, 2026",
      status: "pending",
    },
    {
      id: "2",
      name: "Ms. Lê Thị Thu",
      email: "thu.le@fpt.edu",
      room: "Room B105",
      date: "Jan 9, 2026",
      status: "pending",
    },
    {
      id: "3",
      name: "Mr. Nguyễn Quang Dũng",
      email: "dung.nguyenquang@fpt.edu",
      room: "Room C302",
      date: "Jan 10, 2026",
      status: "pending",
    },
  ];

  const ticketAlerts = [
    {
      id: "1",
      severity: "high",
      room: "Room A308",
      time: "10:45 AM",
      label: "Ticket alert",
    },
    {
      id: "2",
      severity: "medium",
      room: "Room B201",
      time: "10:30 AM",
      label: "Ticket alert",
    },
    {
      id: "3",
      severity: "low",
      room: "Room C102",
      time: "10:15 AM",
      label: "Ticket alert",
    },
    {
      id: "4",
      severity: "high",
      room: "Room A301",
      time: "09:52 AM",
      label: "Ticket alert",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-gray-600 bg-gray-100";
      case "ongoing":
        return "text-green-700 bg-green-100";
      case "upcoming":
        return "text-blue-700 bg-blue-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-50 border-red-200";
      case "medium":
        return "bg-yellow-50 border-yellow-200";
      case "low":
        return "bg-green-50 border-green-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "low":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Overview of exam operations and monitoring
        </p>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/vi/exam-officer/exam-rooms">
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white border-none"
              >
                <Building2 className="h-5 w-5" />
                <span className="font-medium">View Exam Rooms</span>
              </Button>
            </Link>
            <Link href="/vi/exam-officer/exam-schedules">
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white border-none"
              >
                <Calendar className="h-5 w-5" />
                <span className="font-medium">View Schedules</span>
              </Button>
            </Link>
            <Link href="/vi/exam-officer/tickets">
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white border-none"
              >
                <Ticket className="h-5 w-5" />
                <span className="font-medium">View Tickets</span>
              </Button>
            </Link>
            <Link href="/vi/exam-officer/exam-schedules/create">
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white border-none"
              >
                <ClipboardList className="h-5 w-5" />
                <span className="font-medium">Create Schedule</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Icon className={cn("h-8 w-8 mb-2", {
                      "text-blue-500": stat.color === "blue",
                      "text-orange-500": stat.color === "orange",
                      "text-green-500": stat.color === "green",
                      "text-purple-500": stat.color === "purple",
                    })} />
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.label}
                    </p>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                      {stat.value}
                    </h2>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exam Schedule Overview - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Exam Schedule Overview</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={activeTab === 'today' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('today')}
                  className={activeTab === 'today' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                >
                  Today
                </Button>
                <Button
                  variant={activeTab === 'week' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('week')}
                >
                  This Week
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {examSchedules.map((exam) => (
                <div
                  key={exam.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{exam.name}</h3>
                      <span className={cn("px-3 py-1 rounded-full text-xs font-medium capitalize", getStatusColor(exam.status))}>
                        {exam.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{exam.time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{exam.room}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{exam.students} students</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="link" className="w-full text-orange-500 hover:text-orange-600">
                View All Schedules
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Ticket Alert
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ticketAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "p-4 rounded-lg border-l-4 transition-colors",
                    getSeverityColor(alert.severity)
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className={cn("h-4 w-4", {
                        "text-red-600": alert.severity === "high",
                        "text-yellow-600": alert.severity === "medium",
                        "text-green-600": alert.severity === "low",
                      })} />
                      <span className="text-sm font-medium text-gray-900">{alert.label}</span>
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-medium capitalize",
                      getSeverityBadge(alert.severity)
                    )}>
                      {alert.severity}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 font-medium mb-1">{alert.room}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Clock className="h-3 w-3" />
                    {alert.time}
                  </div>
                </div>
              ))}
              <Button variant="link" className="w-full text-orange-500 hover:text-orange-600">
                View All Alerts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invigilator Applications and Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invigilator Applications - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Invigilator Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-gray-600 border-b">
                <div className="col-span-3">Applicant</div>
                <div className="col-span-3">Exam Room</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2 text-center">Actions</div>
              </div>
              {invigilatorApplications.map((app) => (
                <div
                  key={app.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="col-span-3">
                    <div className="font-medium text-gray-900">{app.name}</div>
                    <div className="text-xs text-gray-500">{app.email}</div>
                  </div>
                  <div className="col-span-3 text-sm text-gray-700">{app.room}</div>
                  <div className="col-span-2 text-sm text-gray-600">{app.date}</div>
                  <div className="col-span-2">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 capitalize">
                      {app.status}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-center gap-2">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50">
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="link" className="w-full text-orange-500 hover:text-orange-600 mt-2">
                View All Applications
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reports & Analytics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Reports & Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <button className="w-full p-4 rounded-lg border bg-blue-50 hover:bg-blue-100 transition-colors text-left">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">Exam Reports</h4>
                    <p className="text-xs text-gray-600">View detailed statistics</p>
                  </div>
                </div>
              </button>

              <button className="w-full p-4 rounded-lg border bg-green-50 hover:bg-green-100 transition-colors text-left">
                <div className="flex items-start gap-3">
                  <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">Performance Analytics</h4>
                    <p className="text-xs text-gray-600">Students & proctor metrics</p>
                  </div>
                </div>
              </button>

              <button className="w-full p-4 rounded-lg border bg-purple-50 hover:bg-purple-100 transition-colors text-left">
                <div className="flex items-start gap-3">
                  <Download className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">Export Data</h4>
                    <p className="text-xs text-gray-600">Download CSV/PDF reports</p>
                  </div>
                </div>
              </button>

              <button className="w-full p-4 rounded-lg border bg-orange-50 hover:bg-orange-100 transition-colors text-left">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">Monthly Summary</h4>
                    <p className="text-xs text-gray-600">188 exams completed this month</p>
                  </div>
                </div>
              </button>

              <Button variant="link" className="w-full text-orange-500 hover:text-orange-600">
                View Full Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
