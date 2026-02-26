"use client";

import { Room } from "@/types";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Eye, Cpu } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { formatDate } from "@/lib/utils/format";

interface RoomTableProps {
  rooms: Room[];
  onEdit?: (room: Room) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
  showActions?: boolean;
  showCreateButton?: boolean;
}

export function RoomTable({
  rooms,
  onEdit,
  onDelete,
  isLoading,
  showActions = true,
  showCreateButton = true,
}: RoomTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500 mb-4">No exam rooms</p>
        {showCreateButton && (
          <Link href={ROUTES.ROOMS_CREATE}>
            <Button>Create First Exam Room</Button>
          </Link>
        )}
      </div>
    );
  }

  const getStatusBadge = (status: Room["status"]) => {
    const config: Record<string, { label: string; className: string }> = {
      available: {
        label: "Available",
        className: "bg-green-100 text-green-700 border border-green-200",
      },
      occupied: {
        label: "In Use",
        className: "bg-orange-100 text-orange-700 border border-orange-200",
      },
      inuse: {
        label: "In Use",
        className: "bg-orange-100 text-orange-700 border border-orange-200",
      },
      maintenance: {
        label: "Disabled",
        className: "bg-gray-100 text-gray-700 border border-gray-200",
      },
      disabled: {
        label: "Disabled",
        className: "bg-gray-100 text-gray-700 border border-gray-200",
      },
    };

    // Normalize status to lowercase for lookup
    const normalizedStatus = (status || '').toLowerCase();
    const statusConfig = config[normalizedStatus] || {
      label: status || "Unknown",
      className: "bg-gray-100 text-gray-700 border border-gray-200",
    };

    const { label, className } = statusConfig;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${className}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <th className="text-left px-6 py-4 font-semibold text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Code
            </th>
            <th className="text-left px-6 py-4 font-semibold text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Name
            </th>
            <th className="text-left px-6 py-4 font-semibold text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Capacity
            </th>
            <th className="text-left px-6 py-4 font-semibold text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="text-left px-6 py-4 font-semibold text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Devices
            </th>
            <th className="text-left px-6 py-4 font-semibold text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
              Updated
            </th>
            {showActions && (
              <th className="text-right px-6 py-4 font-semibold text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr
              key={room.id}
              className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors duration-150"
            >
              <td className="px-6 py-4">
                <div className="font-semibold text-gray-900 dark:text-gray-100">{room.roomNumber}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-gray-700 dark:text-gray-300 font-medium">
                  {/* Location placeholder - to be populated when schema includes location/building */}
                  <span className="text-gray-400">—</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-gray-700 dark:text-gray-300">
                  {room.capacity ? `${room.capacity} seats` : 'N/A'}
                </div>
              </td>
              <td className="px-6 py-4">{getStatusBadge(room.status)}</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Cpu className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">0</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDate(room.updatedAt)}
                </div>
              </td>
              {showActions && (
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={ROUTES.ROOMS_DETAIL(room.id)}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                        <Eye className="h-4 w-4 text-blue-600" />
                      </Button>
                    </Link>
                    <Link href={ROUTES.ROOMS_EDIT(room.id)}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                        <Edit className="h-4 w-4 text-amber-600" />
                      </Button>
                    </Link>
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(room.id)}
                        className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


