"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

export default function AdminCreateExamRoomPage() {
  const [formData, setFormData] = useState({
    roomCode: "",
    roomName: "",
    building: "",
    floor: "",
    wing: "",
    capacity: "",
    description: "",
    status: "available",
    devices: [] as string[],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (status: string) => {
    setFormData((prev) => ({ ...prev, status }));
  };

  const handleDeviceToggle = (device: string) => {
    setFormData((prev) => ({
      ...prev,
      devices: prev.devices.includes(device)
        ? prev.devices.filter((d) => d !== device)
        : [...prev.devices, device],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Creating room:", formData);
    // TODO: Call API to create room
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href={ROUTES.ADMIN_DASHBOARD} className="text-gray-600 hover:text-gray-900">
          Dashboard
        </Link>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <Link href={ROUTES.ADMIN_EXAM_ROOMS} className="text-gray-600 hover:text-gray-900">
          Exam Management
        </Link>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className="text-gray-900">Create Exam Room</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Create Exam Room</h1>
        <p className="text-sm text-gray-600">Add a new exam room to the system</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Room Basic Information */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Room Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Room Code *</label>
              <input
                type="text"
                name="roomCode"
                value={formData.roomCode}
                onChange={handleInputChange}
                placeholder="e.g., A101"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Room Name *</label>
              <input
                type="text"
                name="roomName"
                value={formData.roomName}
                onChange={handleInputChange}
                placeholder="e.g., Computer Lab 1"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Building</label>
              <input
                type="text"
                name="building"
                value={formData.building}
                onChange={handleInputChange}
                placeholder="e.g., Building A"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Room Location */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Room Location</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Floor</label>
              <input
                type="text"
                name="floor"
                value={formData.floor}
                onChange={handleInputChange}
                placeholder="e.g., 1st Floor"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Wing *</label>
              <input
                type="text"
                name="wing"
                value={formData.wing}
                onChange={handleInputChange}
                placeholder="e.g., Wing A"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* Capacity & Description */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Capacity & Description</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Capacity (Number of seats) *</label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                placeholder="e.g., 50"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description/Notes</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Additional notes..."
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Room Status */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Room Status</h2>
          <div className="space-y-3">
            <div className="flex items-center rounded-lg border-2 border-green-200 bg-green-50 p-3">
              <input
                type="radio"
                id="available"
                name="status"
                value="available"
                checked={formData.status === "available"}
                onChange={() => handleStatusChange("available")}
                className="h-4 w-4 text-green-600"
              />
              <label htmlFor="available" className="ml-2 flex-1 cursor-pointer">
                <div className="font-medium text-green-900">Available</div>
                <div className="text-xs text-green-700">Room is ready for examination</div>
              </label>
            </div>
            <div className="flex items-center rounded-lg border-2 border-gray-200 bg-gray-50 p-3">
              <input
                type="radio"
                id="disabled"
                name="status"
                value="disabled"
                checked={formData.status === "disabled"}
                onChange={() => handleStatusChange("disabled")}
                className="h-4 w-4 text-gray-600"
              />
              <label htmlFor="disabled" className="ml-2 flex-1 cursor-pointer">
                <div className="font-medium text-gray-900">Disabled</div>
                <div className="text-xs text-gray-700">Room is under maintenance</div>
              </label>
            </div>
          </div>
        </div>

        {/* Device Management */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Device Management</h2>
          <p className="mb-3 text-sm text-gray-600">
            Select devices available in this room. Click a device icon to manage its configuration
          </p>
          <div className="flex gap-3">
            {["camera", "microphone", "projector", "speaker"].map((device) => (
              <button
                key={device}
                type="button"
                onClick={() => handleDeviceToggle(device)}
                className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all ${
                  formData.devices.includes(device)
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300"
                }`}
              >
                {device.charAt(0).toUpperCase() + device.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="submit"
            className="flex-1 bg-orange-500 py-3 font-semibold text-white hover:bg-orange-600"
          >
            Create Room
          </Button>
          <Link href={ROUTES.ADMIN_EXAM_ROOMS} className="flex-1">
            <Button variant="outline" className="w-full py-3 font-semibold">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
