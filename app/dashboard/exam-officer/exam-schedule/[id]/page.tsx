"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Calendar,
  Clock,
  FileText,
  MapPin,
  Users,
  AlertCircle,
  Edit,
  ArrowUp,
  Archive,
  Activity,
  LayoutGrid,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Zap,
  Download,
  Eye,
  MoreVertical,
  Plus,
} from "lucide-react";
import { format } from "date-fns";

export default function ExamScheduleDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  // Mock data - Replace with actual API call
  const schedule = {
    id: params.id,
    scheduleCode: "EXAM-30-2025-R1",
    subjectCode: "Database Management Systems",
    subjectName: "Database Management Systems",
    academicTerm: "Spring 2025",
    examType: "Final",
    examDate: "2026-01-15",
    examOpenTime: "08:00",
    examCloseTime: "11:30",
    examCode: "DB-2025-FE",
    proctor: "Dr. John Smith",
    status: "Published",
    description: "Final examination for Database Management Systems. Students must bring their student ID card and examination materials. No electronic devices allowed except calculators.",
    internalNotes: "Monitor room temperature. Ensure backup power supply is available for all exam stations.",
    linkedRooms: [
      {
        id: "room-1",
        number: "A201",
        building: "Building A",
        capacity: 60,
        enrolled: 45,
        status: "Active"
      },
      {
        id: "room-2",
        number: "B104",
        building: "Building B",
        capacity: 50,
        enrolled: 35,
        status: "Active"
      },
      {
        id: "room-3",
        number: "C302",
        building: "Building C",
        capacity: 40,
        enrolled: 0,
        status: "Upcoming"
      }
    ],
    statistics: {
      linkedRooms: 3,
      totalStudents: 80,
      totalCapacity: 150
    },
    lifecycle: [
      { status: "Draft", date: "2024-12-01", icon: "📝" },
      { status: "Submitted", date: "2024-12-15", icon: "✉️" },
      { status: "Approved", date: "2025-01-05", icon: "✅" },
      { status: "Published", date: "2025-01-10", icon: "🚀" },
      { status: "In Progress", date: "2026-01-15", icon: "⏳" },
    ],
    activityLog: [
      { action: "Exam exam_created", user: "Admin System", time: "2024-12-01 10:15 by logged in user", type: "create" },
      { action: "Exam exam-Bulk-Upload", user: "Admin System", time: "2024-12-01 10:15 by logged in user", type: "upload" },
      { action: "Exam exam-Room-Detail", user: "Admin System", time: "2024-12-02 14:30 by logged in user", type: "update" },
      { action: "Schedule published", user: "Admin System", time: "2025-01-10 09:45 by logged in user", type: "publish" },
    ]
  };

  const getRoomStatus = (enrolled: number, capacity: number) => {
    const percentage = (enrolled / capacity) * 100;
    if (percentage === 0) return { label: "Empty", color: "bg-gray-50 text-gray-600" };
    if (percentage < 80) return { label: "Available", color: "bg-green-50 text-green-600" };
    return { label: "Nearly Full", color: "bg-orange-50 text-orange-600" };
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-6 bg-slate-50/50 min-h-screen">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <LayoutGrid className="h-4 w-4" />
        <span>Dashboard</span>
        <ChevronRight className="h-3 w-3" />
        <button 
          onClick={() => router.push("/dashboard/exams")}
          className="hover:text-slate-900 cursor-pointer"
        >
          Exam Schedule
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-900 font-medium">Schedule Detail</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <FileText className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Schedule Code</p>
              <h1 className="text-2xl font-bold text-slate-900">{schedule.scheduleCode}</h1>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-slate-400" />
              <span className="text-slate-700 font-medium">{schedule.subjectName}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 bg-white">
            <Edit className="h-4 w-4" />
            Refresh
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
            <ArrowUp className="h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Schedule Overview */}
          <Card className="border-none shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-orange-50/50 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Schedule Overview
              </h2>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Academic Term</p>
                  <p className="font-semibold text-slate-900">{schedule.academicTerm}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Exam Type</p>
                  <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-500 border border-red-100">
                    {schedule.examType}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Exam Date</p>
                  <div className="flex items-center gap-2 text-slate-900 font-semibold">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {schedule.examDate}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Duration</p>
                  <div className="flex items-center gap-2 text-slate-900 font-semibold">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {schedule.examOpenTime} - {schedule.examCloseTime}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Exam Code</p>
                  <p className="font-semibold text-slate-900">{schedule.examCode}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Invigilator</p>
                  <p className="font-semibold text-slate-900">{schedule.proctor}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description & Notes */}
          <Card className="border-none shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-50/50 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Description & Notes
              </h2>
            </div>
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Exam Description</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{schedule.description}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-1">Internal Notes</h4>
                    <p className="text-sm text-yellow-700">{schedule.internalNotes}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Linked Exam Rooms */}
          <Card className="border-none shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-orange-50/50 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-orange-500" />
                Linked Exam Rooms ({schedule.linkedRooms.length})
              </h2>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white text-xs gap-1.5 h-8">
                <Plus className="h-3.5 w-3.5" />
                Manage Exam Rooms
              </Button>
            </div>
          <Card className="border-none shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-orange-50/50 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                Schedule Lifecycle
              </h2>
            </div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-2 overflow-x-auto">
                {schedule.lifecycle.map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-2 flex-shrink-0 relative">
                    <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-lg">
                      {item.icon}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-slate-900">{item.status}</p>
                    </div>
                    {idx < schedule.lifecycle.length - 1 && (
                      <div className="absolute top-5 left-[calc(50%+20px)] w-8 h-0.5 bg-orange-200" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card className="border-none shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-100 to-slate-100/50 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Activity className="h-5 w-5 text-slate-700" />
                Activity Log
              </h2>
            </div>
            <CardContent className="p-6">
              <div className="space-y-3">
                {schedule.activityLog.map((log, idx) => (
                  <div key={idx} className="flex gap-3 pb-3 border-b border-slate-100 last:border-b-0 last:pb-0">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <Activity className="h-3 w-3 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm">{log.action}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{log.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

            <CardContent className="p-6 space-y-3">
              {schedule.linkedRooms.map((room) => {
                const roomStatus = getRoomStatus(room.enrolled, room.capacity);
                return (
                  <div key={room.id} className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 hover:bg-slate-50/50 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-blue-500 mt-1" />
                        <div>
                          <h3 className="font-semibold text-slate-900">{room.number}</h3>
                          <p className="text-xs text-slate-500">{room.building}</p>
                        </div>
                      </div>
                      <button className="text-slate-400 hover:text-slate-600">
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

        </div>

        {/* Right Column - Quick Actions */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card className="border-none shadow-sm overflow-hidden bg-gradient-to-br from-blue-50 to-blue-50/50">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase bg-blue-500 text-white">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {schedule.status}
                </span>
              </div>
              <p className="text-center text-sm text-slate-600 leading-relaxed">
                This exam schedule has been published and is ready for students to view and enroll.
              </p>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-none shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-orange-50 to-orange-50/50 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-sm">Quick Actions</h2>
            </div>
            <CardContent className="p-4 space-y-3">
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-2 justify-center">
                <Edit className="h-4 w-4" />
                Edit Schedule
              </Button>
              <Button variant="outline" className="w-full gap-2 justify-center bg-white">
                <ArrowUp className="h-4 w-4" />
                Upgrade Schedule
              </Button>
              <Button variant="outline" className="w-full gap-2 justify-center text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 bg-white">
                <Archive className="h-4 w-4" />
                Archive Schedule
              </Button>
            </CardContent>
          </Card>

          {/* Schedule Statistics */}
          <Card className="border-none shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-100 to-slate-100/50 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-sm">Schedule Statistics</h2>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-600 uppercase tracking-wide mb-1 font-medium">Linked Rooms</p>
                <p className="text-3xl font-bold text-blue-900">{schedule.statistics.linkedRooms}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                <p className="text-xs text-green-600 uppercase tracking-wide mb-1 font-medium">Invigilator</p>
                <p className="text-3xl font-bold text-green-900">1</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-100">
                <p className="text-xs text-orange-600 uppercase tracking-wide mb-1 font-medium">Total Capacity</p>
                <p className="text-3xl font-bold text-orange-900">{schedule.statistics.totalCapacity}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
