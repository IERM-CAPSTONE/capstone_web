"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";
import { PAGINATION } from "@/lib/constants";
import { mockRoomsApi } from "@/lib/api/mock-rooms";
import { Eye, Edit2, Trash2, ChevronLeft, ChevronRight, AlertCircle, AlertTriangle } from "lucide-react";

export default function AdminExamRoomsPage() {
  const [page, setPage] = useState<number>(PAGINATION.DEFAULT_PAGE);
  const [limit] = useState<number>(PAGINATION.DEFAULT_LIMIT);
  const [rooms, setRooms] = useState<any[]>([]);
  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [capacityFilter, setCapacityFilter] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);

  // Load all rooms on mount
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const data = await mockRoomsApi.getAll({ page: 1, limit: 100 });
        setAllRooms(data.data);
      } catch (error) {
        console.error("Failed to load rooms:", error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Apply filters and pagination
  useEffect(() => {
    let filtered = allRooms;

    if (searchTerm) {
      filtered = filtered.filter(
        (room) =>
          room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          room.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((room) => room.status === statusFilter);
    }

    if (capacityFilter) {
      const [min, max] = capacityFilter.split("-").map(Number);
      filtered = filtered.filter((room) => room.capacity >= min && room.capacity <= max);
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedRooms = filtered.slice(start, end);

    setRooms(paginatedRooms);
    setPagination({ page, limit, total, totalPages });
  }, [searchTerm, statusFilter, capacityFilter, page, allRooms, limit]);

  const total = pagination?.total ?? 0;
  const totalPages = pagination?.totalPages ?? 1;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "occupied":
        return "bg-yellow-100 text-yellow-800";
      case "maintenance":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
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

  const openDeleteModal = (room: any) => {
    setSelectedRoom(room);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedRoom(null);
  };

  const handleDisableRoom = () => {
    if (!selectedRoom) return;
    setAllRooms((prev) =>
      prev.map((room) =>
        room.id === selectedRoom.id
          ? {
              ...room,
              status: "maintenance",
            }
          : room
      )
    );
    closeDeleteModal();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exam Room Management</h1>
          <p className="text-sm text-gray-600">Manage and configure examination rooms</p>
        </div>
        <Link href={ROUTES.ADMIN_EXAM_ROOMS_CREATE}>
          <Button className="bg-orange-500 hover:bg-orange-600">+ Create Exam Room</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-4 gap-4 rounded-lg bg-white p-4">
        <div>
          <label className="block text-xs font-medium text-gray-700">Search by code/name</label>
          <input
            type="text"
            placeholder="Search by code/name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Capacity</label>
          <select
            value={capacityFilter}
            onChange={(e) => {
              setCapacityFilter(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">All Capacity</option>
            <option value="0-50">0-50</option>
            <option value="50-70">50-70</option>
            <option value="70-100">70-100</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">Devices</label>
          <select className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none">
            <option>All Devices</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-700">Room Code</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-700">Room Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-700">Capacity</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-700">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-700">Devices</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-gray-700">Last Updated</th>
              <th className="px-6 py-3 text-center text-xs font-semibold uppercase text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-600">
                  Loading...
                </td>
              </tr>
            ) : rooms.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-600">
                  No exam rooms found
                </td>
              </tr>
            ) : (
              rooms.map((room) => (
                <tr key={room.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{room.id.toUpperCase()}</td>
                  <td className="px-6 py-3 text-sm text-gray-900">{room.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">📊 {room.capacity} seats</td>
                  <td className="px-6 py-3">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(room.status)}`}>
                      {getStatusLabel(room.status)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    <div className="flex gap-1">
                      {room.equipment && room.equipment.length > 0 ? (
                        <>
                          {room.equipment.map((device: string) => (
                            <span key={device} className="inline-block rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                              {device.charAt(0).toUpperCase()}
                            </span>
                          ))}
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {new Date(room.updatedAt).toLocaleDateString("en-US")}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex justify-center gap-2">
                      <Link href={ROUTES.ADMIN_EXAM_ROOMS_DETAIL(room.id)}>
                        <button className="rounded-lg p-1 hover:bg-gray-100">
                          <Eye className="h-4 w-4 text-gray-600" />
                        </button>
                      </Link>
                      <Link href={ROUTES.ADMIN_EXAM_ROOMS_EDIT(room.id)}>
                        <button className="rounded-lg p-1 hover:bg-gray-100">
                          <Edit2 className="h-4 w-4 text-gray-600" />
                        </button>
                      </Link>
                      <button 
                        className="rounded-lg p-1 hover:bg-gray-100"
                        onClick={() => openDeleteModal(room)}
                      >
                        <Trash2 className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing <span className="font-medium">{rooms.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{" "}
          <span className="font-medium">{Math.min(page * limit, total)}</span> of <span className="font-medium">{total}</span> results
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!canPrev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-700">
            Page <span className="font-medium">{page}</span> of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!canNext}
            onClick={() => setPage((p) => (canNext ? p + 1 : p))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showDeleteModal && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="flex items-center gap-3 border-b border-red-100 bg-red-50 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-inner">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Disable Exam Room</p>
                <p className="text-xs text-gray-600">Confirm your action</p>
              </div>
            </div>

            <div className="space-y-3 px-4 py-4 text-sm text-gray-800">
              <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs">
                <div>
                  <p className="text-gray-500">Room Code:</p>
                  <p className="font-semibold text-gray-900">{selectedRoom.id.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Room Name:</p>
                  <p className="font-semibold text-gray-900">{selectedRoom.name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Capacity:</p>
                  <p className="font-semibold text-gray-900">{selectedRoom.capacity} seats</p>
                </div>
                <div>
                  <p className="text-gray-500">Devices:</p>
                  <p className="font-semibold text-gray-900">{selectedRoom.equipment?.length ?? 0} Devices</p>
                </div>
              </div>

              <div className="flex gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-gray-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
                <div>
                  <p className="font-semibold text-gray-900">Are you sure you want to disable this room now?</p>
                  <p className="text-gray-700">
                    This room will no longer be available for new scheduling once it is disabled. Any scheduled exams in this room may need to be rescheduled.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-4 py-3">
              <Button variant="outline" onClick={closeDeleteModal} className="min-w-[90px]">
                Cancel
              </Button>
              <Button
                onClick={handleDisableRoom}
                className="min-w-[120px] bg-red-500 hover:bg-red-600"
              >
                Disable Room
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
