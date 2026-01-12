"use client";

import { Room } from "@/types";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Eye } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { formatDate } from "@/lib/utils/format";

interface RoomTableProps {
  rooms: Room[];
  onEdit?: (room: Room) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

export function RoomTable({ rooms, onEdit, onDelete, isLoading }: RoomTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500 mb-4">Chưa có phòng thi nào</p>
        <Link href={ROUTES.ROOMS_CREATE}>
          <Button>Tạo phòng thi đầu tiên</Button>
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: Room["status"]) => {
    const config = {
      available: {
        label: "Sẵn sàng",
        className: "bg-success/10 text-success",
      },
      occupied: {
        label: "Đang sử dụng",
        className: "bg-danger/10 text-danger",
      },
      maintenance: {
        label: "Bảo trì",
        className: "bg-warning/10 text-warning",
      },
    };

    const { label, className } = config[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left p-4 font-semibold text-sm">Tên phòng</th>
            <th className="text-left p-4 font-semibold text-sm">Vị trí</th>
            <th className="text-left p-4 font-semibold text-sm">Sức chứa</th>
            <th className="text-left p-4 font-semibold text-sm">Trạng thái</th>
            <th className="text-left p-4 font-semibold text-sm">Cập nhật</th>
            <th className="text-right p-4 font-semibold text-sm">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr
              key={room.id}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <td className="p-4">
                <div className="font-medium">{room.name}</div>
              </td>
              <td className="p-4 text-gray-600">
                {room.location}
              </td>
              <td className="p-4">{room.capacity} chỗ</td>
              <td className="p-4">{getStatusBadge(room.status)}</td>
              <td className="p-4 text-sm text-gray-500">
                {formatDate(room.updatedAt)}
              </td>
              <td className="p-4">
                <div className="flex items-center justify-end gap-2">
                  <Link href={ROUTES.ROOMS_DETAIL(room.id)}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(room)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(room.id)}
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


