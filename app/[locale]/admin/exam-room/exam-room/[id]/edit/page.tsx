"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { ChevronRight } from "lucide-react";
import { mockRoomsApi } from "@/lib/api/mock-rooms";

export default function AdminEditExamRoomPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const room = await mockRoomsApi.getById(id);
        if (room) {
          setFormData({
            roomCode: room.id.toUpperCase(),
            roomName: room.name,
            building: room.location.split(",")[1]?.trim() || "",
            floor: room.location.includes("Tầng") ? room.location.split(",")[0] : "",
            wing: "-",
            capacity: room.capacity.toString(),
            description: `Room is equipped with modern examination facilities, sensors, devices that can be integrated with other systems. The room can accommodate up to ${room.capacity} students.`,
            status: room.status,
            devices: room.equipment || [],
          });
        }
      } catch (error) {
        console.error("Failed to load room:", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
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
    console.log("Updating room:", formData);
    // TODO: Implement actual update logic
    alert(`Room ${formData.roomCode} updated successfully!`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

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
        <Link href={ROUTES.ADMIN_EXAM_ROOMS_DETAIL(id)} className="text-gray-600 hover:text-gray-900">
          {formData.roomCode}
        </Link>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className="text-gray-900">Edit</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Update Exam Room</h1>
        <p className="mt-2 text-gray-600">Update the exam room information and configuration.</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Room Basic Information */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Room Basic Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Room Code / ID *
              </label>
              <input
                type="text"
                name="roomCode"
                value={formData.roomCode}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="e.g., A101"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Room Name *
              </label>
              <input
                type="text"
                name="roomName"
                value={formData.roomName}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="e.g., Computer Lab A"
                required
              />
            </div>
          </div>
        </div>

        {/* Room Location */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Room Location</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Building / Location *
              </label>
              <input
                type="text"
                name="building"
                value={formData.building}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="e.g., Building A"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Floor *
              </label>
              <input
                type="text"
                name="floor"
                value={formData.floor}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="e.g., 1st Floor"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Wing
              </label>
              <input
                type="text"
                name="wing"
                value={formData.wing}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="e.g., East Wing"
              />
            </div>
          </div>
        </div>

        {/* Capacity & Description */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Capacity & Description</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Capacity (Number of Seats) *
              </label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="e.g., 30"
                min="1"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Description / Notes
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                placeholder="Enter room description, notes, or special requirements..."
              />
            </div>
          </div>
        </div>

        {/* Room Status */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Room Status</h3>
          <div className="flex gap-4">
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 px-6 py-3 transition-all ${
                formData.status === "available"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="status"
                value="available"
                checked={formData.status === "available"}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="h-4 w-4 text-green-500"
              />
              <span className="text-sm font-medium text-gray-700">Available</span>
            </label>
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 px-6 py-3 transition-all ${
                formData.status === "occupied"
                  ? "border-yellow-500 bg-yellow-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="status"
                value="occupied"
                checked={formData.status === "occupied"}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="h-4 w-4 text-yellow-500"
              />
              <span className="text-sm font-medium text-gray-700">In Use</span>
            </label>
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 px-6 py-3 transition-all ${
                formData.status === "maintenance"
                  ? "border-red-500 bg-red-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="status"
                value="maintenance"
                checked={formData.status === "maintenance"}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="h-4 w-4 text-red-500"
              />
              <span className="text-sm font-medium text-gray-700">Under Repair</span>
            </label>
          </div>
        </div>

        {/* Device Management */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Device Management</h3>
          <p className="mb-4 text-sm text-gray-600">
            Select the devices available in this exam room
          </p>
          <div className="grid grid-cols-4 gap-3">
            {["Camera", "Microphone", "Speaker", "Computer", "Projector", "Tablet", "Printer", "Scanner"].map(
              (device) => (
                <button
                  key={device}
                  type="button"
                  onClick={() => handleDeviceToggle(device)}
                  className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                    formData.devices.includes(device)
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {device}
                </button>
              )
            )}
          </div>
          <p className="mt-4 text-xs text-gray-500">
            Selected devices: {formData.devices.length > 0 ? formData.devices.join(", ") : "None"}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-6">
          <Link
            href={ROUTES.ADMIN_EXAM_ROOMS_DETAIL(id)}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to Detail
          </Link>
          <div className="flex gap-3">
            <Link href={ROUTES.ADMIN_EXAM_ROOMS}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
              Update Room
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
