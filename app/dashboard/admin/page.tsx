"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Building2,
  CheckCircle2,
  Cpu,
  Plus,
  QrCode,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users
} from "lucide-react";

export default function DashboardPage() {
  const stats = [
    {
      title: "Total Accounts",
      value: "1,247",
      note: "+12% from last month",
      icon: Users,
      tone: "bg-blue-50 text-blue-600",
    },
    {
      title: "Active Accounts",
      value: "1,089",
      note: "87% active rate",
      icon: UserCheck,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Exam Rooms",
      value: "48",
      note: "5 buildings",
      icon: Building2,
      tone: "bg-orange-50 text-orange-600",
    },
    {
      title: "Registered Devices",
      value: "156",
      note: "142 online",
      icon: Cpu,
      tone: "bg-violet-50 text-violet-600",
    },
  ];

  const quickActions = [
    {
      title: "Create Account",
      description: "Add new student or staff account",
      icon: UserPlus,
      tone: "bg-blue-50 text-blue-600",
    },
    {
      title: "Create Exam Room",
      description: "Register new examination room",
      icon: Plus,
      tone: "bg-orange-50 text-orange-600",
    },
    {
      title: "Register Device",
      description: "Add device to the system",
      icon: QrCode,
      tone: "bg-violet-50 text-violet-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400">Home / Dashboard</p>
          <h1 className="text-2xl font-semibold text-gray-900">
            Admin Dashboard
          </h1>
          <p className="text-sm text-gray-500">System overview and configuration</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
          <Users className="h-5 w-5" />
        </div>
      </div>



      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium text-gray-500">
                    {item.title}
                  </CardTitle>
                  <div className="text-2xl font-semibold text-gray-900">
                    {item.value}
                  </div>
                </div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-400">{item.note}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="border-0 shadow-sm">
                <CardContent className="flex items-center gap-4 p-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-gray-600" />
              <CardTitle className="text-sm font-semibold text-gray-700">
                System Status
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-700">
                    All Systems Operational
                  </p>
                  <p className="text-xs text-emerald-700/80">
                    Everything is running smoothly
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                <span>Online Devices</span>
                <span className="text-emerald-600">142</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div className="h-2 w-[92%] rounded-full bg-emerald-500" />
              </div>
              <p className="text-xs text-gray-400">91% devices online</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                <span>Offline Devices</span>
                <span className="text-rose-600">14</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div className="h-2 w-[9%] rounded-full bg-rose-400" />
              </div>
              <p className="text-xs text-gray-400">9% devices offline</p>
            </div>

            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex items-center justify-between">
                <span>Server Uptime</span>
                <span className="font-semibold text-gray-700">99.98%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last Maintenance</span>
                <span className="font-semibold text-gray-700">Jan 01, 2026</span>
              </div>
              <div className="flex items-center justify-between">
                <span>System Version</span>
                <span className="font-semibold text-gray-700">v2.1.0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div >
  );
}

