"use client";

import { Button } from "@/components/ui/button";
import { UserPlus, Plus, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QuickActions() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500 bg-white">
          <CardContent className="p-4 flex items-center space-x-4 bg-white">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserPlus className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Create Account</p>
              <p className="text-xs text-gray-500">Add new student or staff account</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-orange-500 bg-white">
          <CardContent className="p-4 flex items-center space-x-4 bg-white">
             <div className="p-2 bg-orange-100 rounded-lg">
              <Plus className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Create Exam Room</p>
              <p className="text-xs text-gray-500">Register new examination room</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-purple-500 bg-white">
          <CardContent className="p-4 flex items-center space-x-4 bg-white">
             <div className="p-2 bg-purple-100 rounded-lg">
              <Monitor className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Register Device</p>
              <p className="text-xs text-gray-500">Add device to the system</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
