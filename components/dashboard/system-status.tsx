"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_SYSTEM_STATUS } from "@/lib/api/mock-dashboard";
import { CheckCircle2, Monitor, Wifi, WifiOff } from "lucide-react";

export function SystemStatusCard() {
  const { onlineDevices, offlineDevices } = MOCK_SYSTEM_STATUS;
  const total = onlineDevices + offlineDevices;
  const onlinePercentage = Math.round((onlineDevices / total) * 100);

  return (
    <Card className="col-span-1 shadow-sm border-gray-100 bg-white h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-gray-900">
          <Monitor className="h-5 w-5 text-gray-500" /> System Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg bg-green-50 p-4 border border-green-100 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
                <p className="font-semibold text-green-800">All Systems Operational</p>
                <p className="text-xs text-green-600">Everything is running smoothly</p>
            </div>
        </div>

        <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Device Status</h4>
            
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                     <span className="flex items-center gap-2 text-green-600 font-medium"><Wifi className="h-4 w-4"/> Online Devices</span>
                     <span className="font-bold text-green-600">{onlineDevices}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${onlinePercentage}%` }} />
                </div>
                 <p className="text-xs text-gray-500">{onlineDevices}/{total} devices online</p>
            </div>

             <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                     <span className="flex items-center gap-2 text-orange-500 font-medium"><WifiOff className="h-4 w-4"/> Offline Devices</span>
                     <span className="font-bold text-orange-500">{offlineDevices}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${100 - onlinePercentage}%` }} />
                </div>
                <p className="text-xs text-gray-500">{offlineDevices} devices offline</p>
            </div>
        </div>
        
        <div className="pt-4 border-t space-y-2 text-xs text-gray-500">
             <div className="flex justify-between">
                <span>Server Uptime</span>
                <span className="font-medium text-gray-900">{MOCK_SYSTEM_STATUS.serverUptime}</span>
             </div>
             <div className="flex justify-between">
                <span>Last Maintenance</span>
                <span className="font-medium text-gray-900">{MOCK_SYSTEM_STATUS.lastMaintenance}</span>
             </div>
             <div className="flex justify-between">
                <span>System Version</span>
                <span className="font-medium text-gray-900">{MOCK_SYSTEM_STATUS.version}</span>
             </div>
        </div>

      </CardContent>
    </Card>
  );
}
