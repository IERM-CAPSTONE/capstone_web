"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_ACTIVITIES } from "@/lib/api/mock-dashboard";
import { UserPlus, Lock, Edit3, Monitor, Unlock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function RecentActivityList() {
  const getIcon = (type: string) => {
    switch (type) {
      case "account_created":
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case "account_locked":
        return <Lock className="h-4 w-4 text-red-500" />;
      case "room_updated":
        return <Edit3 className="h-4 w-4 text-orange-500" />;
      case "device_registered":
        return <Monitor className="h-4 w-4 text-purple-500" />;
      case "account_unlocked":
        return <Unlock className="h-4 w-4 text-blue-500" />;
      default:
        return <UserPlus className="h-4 w-4" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case "account_created":
        return "bg-green-100";
      case "account_locked":
        return "bg-red-100";
      case "room_updated":
         return "bg-orange-100";
      case "device_registered":
         return "bg-purple-100";
      case "account_unlocked":
        return "bg-blue-100";
      default:
        return "bg-gray-100";
    }
  }

  return (
    <Card className="col-span-1 lg:col-span-2 shadow-sm border-gray-100 bg-white h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-gray-900">
          <span className="text-gray-400 text-sm">⚡</span> Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {MOCK_ACTIVITIES.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4">
              <div
                className={cn(
                  "mt-0.5 rounded-full p-2 shrink-0",
                  getBgColor(activity.type)
                )}
              >
                {getIcon(activity.type)}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none text-gray-900">
                  {activity.type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </p>
                <p className="text-sm text-gray-500">
                  {activity.message}
                </p>
              </div>
              <div className="text-xs text-gray-400 shrink-0">
                {activity.time}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
            <button className="text-sm font-semibold text-primary hover:underline">View All Activity</button>
        </div>
      </CardContent>
    </Card>
  );
}
