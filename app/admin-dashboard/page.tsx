"use client";

import { StatsSection } from "@/components/dashboard/stats-section";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivityList } from "@/components/dashboard/recent-activity";
import { SystemStatusCard } from "@/components/dashboard/system-status";
import { MOCK_STATS } from "@/lib/api/mock-dashboard";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span>Home</span> <span>&gt;</span> <span>Dashboard</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Admin Dashboard
        </h1>
        <p className="text-gray-600">
          System overview and configuration
        </p>
      </div>

      <StatsSection stats={MOCK_STATS} />
      
      <QuickActions />

      <div className="grid gap-6 lg:grid-cols-3">
        <RecentActivityList />
        <SystemStatusCard />
      </div>
    </div>
  );
}
