import { LucideIcon } from "lucide-react";
import { Users, UserCheck, Layout, Monitor } from "lucide-react";

export interface DashboardStat {
  label: string;
  value: number | string;
  change?: string;
  changeType?: "increase" | "decrease" | "neutral";
  icon: any; // Using any for LucideIcon compat
  description?: string;
}

export interface RecentActivity {
  id: string;
  type: "account_created" | "account_locked" | "room_updated" | "device_registered" | "account_unlocked";
  message: string;
  time: string;
  user?: string;
}

export interface SystemStatus {
  onlineDevices: number;
  offlineDevices: number;
  serverUptime: string;
  lastMaintenance: string;
  version: string;
}

export const MOCK_STATS: DashboardStat[] = [
  {
    label: "Total Accounts",
    value: "1,247",
    change: "+12% from last month",
    changeType: "increase",
    icon: Users,
    description: "Total registered",
  },
  {
    label: "Active Accounts",
    value: "1,089",
    change: "87.3% active rate",
    changeType: "increase",
    icon: UserCheck,
    description: "Currently active",
  },
  {
    label: "Exam Rooms",
    value: "48",
    change: "5 buildings",
    changeType: "neutral",
    icon: Layout,
    description: "Available rooms",
  },
  {
    label: "Registered Devices",
    value: "156",
    change: "142 online",
    changeType: "increase",
    icon: Monitor,
    description: "Total devices",
  },
];

export const MOCK_ACTIVITIES: RecentActivity[] = [
  {
    id: "1",
    type: "account_created",
    message: "Student account 'SE160123' created successfully",
    time: "5 minutes ago",
  },
  {
    id: "2",
    type: "account_locked",
    message: "Staff account 'admin005' has been locked",
    time: "10 minutes ago",
  },
  {
    id: "3",
    type: "room_updated",
    message: "Room A101 capacity changed to 35 seats",
    time: "1 hour ago",
  },
  {
    id: "4",
    type: "device_registered",
    message: "Camera device 'CAM-A301-01' added to room A101",
    time: "2 hours ago",
  },
  {
    id: "5",
    type: "account_unlocked",
    message: "Student account 'SE160059' has been unlocked",
    time: "2 hours ago",
  },
  {
    id: "6",
    type: "account_created",
    message: "Staff account 'staff045' created successfully",
    time: "3 hours ago",
  },
];

export const MOCK_SYSTEM_STATUS: SystemStatus = {
  onlineDevices: 142,
  offlineDevices: 14,
  serverUptime: "99.99%",
  lastMaintenance: "Jan 01, 2026",
  version: "v1.1.0",
};
