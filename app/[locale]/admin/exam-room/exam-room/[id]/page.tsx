"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { ChevronRight, Wifi, WifiOff } from "lucide-react";
import { mockRoomsApi } from "@/lib/api/mock-rooms";

export default function AdminExamRoomDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const [room, setRoom] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const data = await mockRoomsApi.getById(id);
        setRoom(data);
      } catch (error) {
        console.error("Failed to load room:", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Room not found</div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500 text-white";
      case "occupied":
        return "bg-yellow-500 text-white";
      case "maintenance":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "available":
        return "Available";
      case "occupied":
        return "In Use";
      case "maintenance":
        return "Under Repair";
      default:
        return status;
    }
  };

  const mockDevices = [
    { id: "CAMERA01", name: "CAMERA01", type: "Camera", status: "online" },
    { id: "CAMERA02", name: "CAMERA02", type: "Camera", status: "online" },
    { id: "MIC-01-A", name: "MIC-01-A", type: "Microphone", status: "online" },
    { id: "SPEAKER-01", name: "SPEAKER-01", type: "Speaker", status: "offline" },
  ];

  const mockActivity = [
    {
      user: "David Moore",
      action: "Device was changed for this room",
      timestamp: "A moment ago",
    },
    {
      user: "Michael Brown",
      action: "Room status changed from OK to In Use",
      timestamp: "2 hours ago",
    },
    {
      user: "Jessica Miller",
      action: "Room status changed from OK to In Use",
      timestamp: "2 hours ago",
    },
    {
      user: "Christopher Updated",
      action: "Room information updated",
      timestamp: "1 week ago",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href={ROUTES.ADMIN_DASHBOARD} className="text-gray-600 hover:text-gray-900">
          Dashboard
        </Link>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <Link href={ROUTES.ADMIN_EXAM_ROOMS} className="text-gray-600 hover:text-gray-900">
          Exam Room Management
        </Link>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className="text-gray-900">Exam Room Detail</span>
      </div>

      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Exam Room Detail</h1>
      </div>

      {/* Blue Card - Room Info */}
      <div className="rounded-lg bg-blue-600 p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20">
              <span className="text-xl">🏢</span>
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h2 className="text-2xl font-bold">{room.id.toUpperCase()}</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(room.status)}`}>
                  {getStatusLabel(room.status)}
                </span>
              </div>
              <p className="text-blue-100">{room.name}</p>
              <div className="mt-2 flex gap-4 text-sm text-blue-100">
                <span>📊 {room.capacity} seats</span>
                <span>📍 {room.location}</span>
                <span>🏢 Floor: {room.location.includes("Tầng") ? room.location.split(",")[0] : "-"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Room Information */}
        <div className="col-span-2 space-y-6">
          {/* Room Information */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Room Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Room Name</label>
                <p className="mt-1 text-gray-900">{room.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Location No / Building</label>
                <p className="mt-1 text-gray-900">{room.location.split(",")[1]?.trim() || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Building / Location</label>
                <p className="mt-1 text-gray-900">{room.location.split(",")[1]?.trim() || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Floor</label>
                <p className="mt-1 text-gray-900">{room.location.includes("Tầng") ? room.location.split(",")[0] : "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Capacity</label>
                <p className="mt-1 text-gray-900">{room.capacity} seats</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Wing</label>
                <p className="mt-1 text-gray-900">-</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500">Description / Notes</label>
                <p className="mt-1 text-gray-600">
                  Room is equipped with modern examination facilities, sensors, devices that can be integrated with other systems. The room can accommodate up to {room.capacity} students.
                </p>
              </div>
            </div>
          </div>

          {/* Registered Devices */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Registered Devices</h3>
              <Button variant="outline" size="sm">+ Add</Button>
            </div>
            <div className="space-y-3">
              {mockDevices.map((device) => (
                <div key={device.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-3">
                    {device.status === "online" ? (
                      <Wifi className="h-5 w-5 text-green-600" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{device.name}</p>
                      <p className="text-sm text-gray-500">{device.type} • Device ID: {device.id}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      device.status === "online"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {device.status === "online" ? "Online" : "Offline"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <button className="text-sm text-blue-600 hover:underline">View All</button>
            </div>
            <div className="space-y-4">
              {mockActivity.map((activity, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <span className="text-xs font-semibold text-blue-600">
                      {activity.user.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.user}</span>
                    </p>
                    <p className="text-sm text-gray-600">{activity.action}</p>
                    <p className="text-xs text-gray-400">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Actions</h3>
            <div className="space-y-3">
              <Link href={ROUTES.ADMIN_EXAM_ROOMS_EDIT(id)} className="block">
                <Button className="w-full bg-orange-500 hover:bg-orange-600">Change Status</Button>
              </Link>
              <Button variant="outline" className="w-full border-red-500 text-red-500 hover:bg-red-50">
                Delete Room
              </Button>
            </div>
          </div>

          {/* Quick Info */}
          <div className="rounded-lg border border-gray-200 bg-blue-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-blue-600">ℹ️</span>
              <span className="text-sm font-semibold text-blue-900">Quick Information</span>
            </div>
            <p className="text-xs text-blue-700">
              You can manage devices, cameras, IoT sensors or other devices in this exam room by clicking "Manage Devices". You can also set up notifications and monitoring.
            </p>
            <Link href="#" className="mt-2 block text-xs font-medium text-blue-600 hover:underline">
              Go to Device Management →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
