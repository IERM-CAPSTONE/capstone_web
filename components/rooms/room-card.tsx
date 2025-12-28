"use client";

import { Room } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, MapPin, CheckCircle, XCircle, Wrench } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { formatDate } from "@/lib/utils/format";

interface RoomCardProps {
  room: Room;
  onDelete?: (id: string) => void;
}

export function RoomCard({ room, onDelete }: RoomCardProps) {
  const statusConfig = {
    available: {
      label: "Sẵn sàng",
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    occupied: {
      label: "Đang sử dụng",
      icon: XCircle,
      color: "text-danger",
      bgColor: "bg-danger/10",
    },
    maintenance: {
      label: "Bảo trì",
      icon: Wrench,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  };

  const status = statusConfig[room.status];
  const StatusIcon = status.icon;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{room.name}</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {room.location}
              </p>
            </div>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full ${status.bgColor}`}
          >
            <StatusIcon className={`h-4 w-4 ${status.color}`} />
            <span className={`text-sm font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Users className="h-4 w-4" />
            <span>Sức chứa: {room.capacity} chỗ</span>
          </div>

          {room.equipment && room.equipment.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {room.equipment.map((item, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded"
                >
                  {item}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin className="h-3 w-3" />
            <span>Cập nhật: {formatDate(room.updatedAt)}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Link href={ROUTES.ROOMS_DETAIL(room.id)} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                Xem chi tiết
              </Button>
            </Link>
            {onDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => onDelete(room.id)}
              >
                Xóa
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


