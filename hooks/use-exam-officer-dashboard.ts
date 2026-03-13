import { useState, useEffect } from "react";
import { HttpClient } from "@/lib/api/http-client";
import { ApiResponse } from "@/types";

export interface DashboardStats {
  totalExamRooms: number;
  totalExamsToday: number;
  totalStudents: number;
  activeProctors: number;
}

export interface ExamSchedule {
  id: string;
  name: string;
  status: "completed" | "ongoing" | "upcoming" | "scheduled";
  time: string;
  room: string;
  students: number;
  startTime?: string;
  endTime?: string;
}

export interface InvigilatorApplication {
  id: string;
  name: string;
  email: string;
  room: string;
  date: string;
  status: "pending" | "approved" | "rejected";
}

export interface TicketAlert {
  id: string;
  severity: "high" | "medium" | "low";
  room: string;
  time: string;
  label: string;
  description?: string;
}

export interface DashboardData {
  stats: DashboardStats;
  examSchedules: ExamSchedule[];
  invigilatorApplications: InvigilatorApplication[];
  ticketAlerts: TicketAlert[];
}

export function useExamOfficerDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // For now, use mock data
      // TODO: Replace with actual API call when backend is ready
      // const response = await httpClient.get<ApiResponse<DashboardData>>('/dashboard/exam-officer');
      
      const mockData: DashboardData = {
        stats: {
          totalExamRooms: 24,
          totalExamsToday: 12,
          totalStudents: 1847,
          activeProctors: 18,
        },
        examSchedules: [
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
        ],
        invigilatorApplications: [
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
        ],
        ticketAlerts: [
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
        ],
      };

      setData(mockData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchDashboardData,
  };
}
