"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DashboardStat } from "@/lib/api/mock-dashboard";
import { cn } from "@/lib/utils/cn";

interface StatsSectionProps {
  stats: DashboardStat[];
}

export function StatsSection({ stats }: StatsSectionProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="overflow-hidden bg-white border-gray-200">
            <CardContent className="p-6 bg-white">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Icon className={cn("h-8 w-8 text-primary opacity-80")} />
                  <p className="text-sm font-medium text-gray-600 mt-2">
                    {stat.label}
                  </p>
                  <div className="flex items-baseline space-x-2">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                      {stat.value}
                    </h2>
                  </div>
                  <p className="text-xs text-gray-500">
                    {stat.change}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
