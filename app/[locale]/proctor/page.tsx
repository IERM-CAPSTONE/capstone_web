"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Ticket, Plus, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

type ViewMode = "list" | "calendar";

export default function ProctorDashboardPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<"today" | "week">("today");

  // Mock data
  const stats = {
    totalExams: 12,
    totalStudents: 248,
    upcomingToday: 3,
  };

  const todayExams = [
    {
      id: "1",
      subject: "Mathematics Final Exam",
      time: "09:00 AM",
      room: "A-101",
      students: 45,
      status: "Upcoming",
      color: "blue",
    },
    {
      id: "2",
      subject: "Physics Midterm",
      time: "11:30 AM",
      room: "B-203",
      students: 38,
      status: "Upcoming",
      color: "blue",
    },
    {
      id: "3",
      subject: "Chemistry Quiz",
      time: "02:00 PM",
      room: "C-302",
      students: 32,
      status: "In Progress",
      color: "orange",
    },
  ];

  const weekExams = [
    {
      day: "Mon",
      date: "Jan 6",
      exams: [
        { subject: "Mathematics Final Exam", time: "09:00", room: "A-101" },
      ],
    },
    {
      day: "Tue",
      date: "Jan 7",
      exams: [
        { subject: "Biology Lab Exam", time: "10:00", room: "B-105" },
      ],
    },
    {
      day: "Wed",
      date: "Jan 8",
      exams: [],
    },
    {
      day: "Thu",
      date: "Jan 9",
      exams: [
        { subject: "Statistics Exam", time: "10:00", room: "A-104" },
      ],
    },
    {
      day: "Fri",
      date: "Jan 10",
      exams: [],
    },
  ];

  const calendarExams = [
    { day: "Mon", date: "Jan 6", time: "09:00", subject: "Mathematics Final Exam", room: "A-101", color: "blue" },
    { day: "Mon", date: "Jan 6", time: "14:00", subject: "Chemistry Quiz", room: "C-302", color: "orange" },
    { day: "Tue", date: "Jan 7", time: "10:00", subject: "Biology Lab Exam", room: "B-105", color: "blue" },
    { day: "Wed", date: "Jan 8", time: "11:00", subject: "Physics Midterm", room: "B-203", color: "blue" },
    { day: "Wed", date: "Jan 8", time: "13:00", subject: "Computer Science Quiz", room: "C-105", color: "blue" },
    { day: "Fri", date: "Jan 10", time: "14:00", subject: "Economics Final", room: "D-201", color: "orange" },
  ];

  const timeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00"];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Upcoming":
        return "bg-blue-500";
      case "In Progress":
        return "bg-orange-500";
      case "Completed":
        return "bg-gray-400";
      default:
        return "bg-gray-300";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Upcoming":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "In Progress":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "Completed":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">Welcome back! Here's your exam overview</p>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button className="h-12 bg-green-600 hover:bg-green-700 text-white font-medium">
            <Building2 className="mr-2 h-5 w-5" />
            View Exam Rooms
          </Button>
          <Button className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium">
            <Ticket className="mr-2 h-5 w-5" />
            View Tickets
          </Button>
          <Button className="h-12 bg-orange-600 hover:bg-orange-700 text-white font-medium">
            <Plus className="mr-2 h-5 w-5" />
            Create New Ticket
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Statistics Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Statistics</h3>
              
              <div className="space-y-4">
                {/* Total Exams */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Exams</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalExams}</p>
                  </div>
                </div>

                {/* Total Students */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                  </div>
                </div>

                {/* Upcoming Today */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Upcoming Today</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.upcomingToday}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Exam Schedule */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Exam Schedule</h3>
                <div className="flex gap-2">
                  <Button
                    variant={activeFilter === "today" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveFilter("today")}
                    className={activeFilter === "today" ? "bg-orange-600 hover:bg-orange-700" : ""}
                  >
                    Today
                  </Button>
                  <Button
                    variant={activeFilter === "week" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveFilter("week")}
                    className={activeFilter === "week" ? "bg-orange-600 hover:bg-orange-700" : ""}
                  >
                    This Week
                  </Button>
                </div>
              </div>

              {/* Date Display */}
              <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  {activeFilter === "today" 
                    ? "Tuesday, January 6, 2026" 
                    : "January 6 - January 10, 2026"}
                </span>
              </div>

              {/* List View */}
              {activeFilter === "today" && (
                <>
                  {/* Pagination for list view */}
                  {todayExams.length > 0 && (
                    <div className="flex justify-center gap-2 mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="bg-[#F37021] text-white hover:bg-[#F37021]/90">
                        {currentPage}
                      </Button>
                      <Button variant="outline" size="sm">
                        2
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <div className="space-y-3">
                    {todayExams.map((exam) => (
                      <div
                        key={exam.id}
                        className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                      >
                        {/* Time */}
                        <div className="flex flex-col items-center justify-center w-16">
                          <div className={`w-12 h-12 rounded-full ${getStatusColor(exam.status)} flex items-center justify-center`}>
                            <Calendar className="h-6 w-6 text-white" />
                          </div>
                          <span className="text-xs font-medium text-gray-900 mt-1">{exam.time}</span>
                        </div>

                        {/* Details */}
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{exam.subject}</h4>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              Room {exam.room}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              {exam.students} students
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(exam.status)}`}>
                            {exam.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Calendar View */}
              {activeFilter === "week" && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border border-gray-200 bg-gray-50 p-2 text-left text-sm font-medium text-gray-600 w-24">
                          Time
                        </th>
                        {weekExams.map((day) => (
                          <th
                            key={day.day}
                            className={`border border-gray-200 bg-gray-50 p-2 text-center text-sm font-medium ${
                              day.day === "Mon" ? "text-orange-600" : "text-gray-600"
                            }`}
                          >
                            <div className="font-semibold">{day.day}</div>
                            <div className="text-xs font-normal">{day.date}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map((time) => (
                        <tr key={time}>
                          <td className="border border-gray-200 p-2 text-sm text-gray-600 bg-gray-50">
                            {time}
                          </td>
                          {weekExams.map((day) => {
                            const exam = calendarExams.find(
                              (e) => e.day === day.day && e.time === time
                            );
                            return (
                              <td key={day.day} className="border border-gray-200 p-1 align-top">
                                {exam && (
                                  <div className={`p-2 rounded text-xs ${
                                    exam.color === "orange" 
                                      ? "bg-orange-50 border border-orange-200" 
                                      : "bg-blue-50 border border-blue-200"
                                  }`}>
                                    <div className="font-semibold text-gray-900">{exam.subject}</div>
                                    <div className="text-gray-600 flex items-center gap-1 mt-1">
                                      <Building2 className="h-3 w-3" />
                                      Room {exam.room}
                                    </div>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
