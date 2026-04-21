"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit, Trash2, Users, Grid3x3 } from "lucide-react";
import SeatMapComponent from "@/components/seat-map/SeatMapComponent";
import { generateSeatMap } from "@/lib/utils/seat-map";
import { useRoom, useDeleteRoom } from "@/hooks/use-rooms";
import { ROUTES } from "@/lib/constants/routes";
import Link from "next/link";
import { formatDate } from "@/lib/utils/format";
import { getCurrentLocale } from "@/hooks/use-check-auth";

export default function RoomDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const locale = getCurrentLocale();

  const { data: room, isLoading, error } = useRoom(id);
  const deleteRoom = useDeleteRoom();

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this room?")) {
      try {
        await deleteRoom.mutateAsync(id);
        router.push(`/${locale}${ROUTES.ROOMS}`);
      } catch (error) {
        console.error("Error deleting room:", error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">Room not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generate SeatGrid for SeatMapComponent
  const seatGrid = generateSeatMap([], {
    id: room.id,
    roomNumber: room.roomNumber,
    max_rows: room.maxRows ?? 0,
    max_columns: room.maxColumns ?? 0,
    total_seats: room.totalSeats ?? (room.maxRows ?? 0) * (room.maxColumns ?? 0),
  });

  const getStatusConfig = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === 'available') {
      return { label: 'Available', className: 'bg-green-100 text-green-700 border border-green-200' };
    } else if (normalized === 'occupied' || normalized === 'inuse') {
      return { label: 'In Use', className: 'bg-orange-100 text-orange-700 border border-orange-200' };
    } else {
      return { label: 'Disabled', className: 'bg-gray-100 text-gray-700 border border-gray-200' };
    }
  };

  const statusConfig = getStatusConfig(room.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white rounded-lg p-3">
                <Grid3x3 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{room.roomNumber}</h1>
                <p className="text-sm text-gray-500">Exam Room Detail</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/${locale}${ROUTES.ROOMS_EDIT(id)}`}>
            <Button className="bg-orange-500 hover:bg-orange-600">
              <Edit className="mr-2 h-4 w-4" />
              Edit Room
            </Button>
          </Link>
          <Button variant="outline" onClick={handleDelete} className="text-red-600 border-red-200 hover:bg-red-50">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Room Information Card with Seat Map */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="text-lg font-semibold">Room Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Seat Map with Search & Stats */}
          <div className="mb-6">
            <SeatMapComponent seatGrid={seatGrid} />
          </div>

          {/* Room Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-2">
                Room Code
              </label>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {room.roomNumber}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-2">
                Location
              </label>
              <p className="text-base text-gray-700 dark:text-gray-300">
                <span className="text-gray-400">—</span>
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-2">
                Capacity
              </label>
              <p className="text-base text-gray-700 dark:text-gray-300">
                {room.capacity || room.totalSeats || 'N/A'} seats
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-2">
                Status
              </label>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.className}`}>
                {statusConfig.label}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity and Metadata in separate cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Registered Devices */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              Registered Devices
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No devices registered yet</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b border-gray-200 dark:border-gray-700">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Room Created</p>
                  <p className="text-xs text-gray-500">Room was created on {formatDate(room.createdAt)}</p>
                </div>
              </div>
              {room.updatedAt !== room.createdAt && (
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Configuration Updated</p>
                    <p className="text-xs text-gray-500">Last updated on {formatDate(room.updatedAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}