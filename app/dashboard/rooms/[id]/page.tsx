"use client";

import { use } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { useRoom, useDeleteRoom } from "@/hooks/use-rooms";
import { ROUTES } from "@/lib/constants/routes";
import Link from "next/link";
import { formatDate } from "@/lib/utils/format";

export default function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  // ✅ SỬ DỤNG HOOK để fetch room detail
  const { data: room, isLoading, error } = useRoom(id);
  const deleteRoom = useDeleteRoom();

  const handleDelete = async () => {
    if (confirm("Bạn có chắc chắn muốn xóa phòng thi này?")) {
      try {
        await deleteRoom.mutateAsync(id);
        router.push(ROUTES.ROOMS);
      } catch (error) {
        console.error("Error deleting room:", error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-danger">Không tìm thấy phòng thi</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{room.name}</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Chi tiết phòng thi
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`${ROUTES.ROOMS_DETAIL(id)}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Chỉnh sửa
            </Button>
          </Link>
          <Button variant="danger" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Xóa
          </Button>
        </div>
      </div>

      {/* Room Information */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin cơ bản</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Tên phòng
              </label>
              <p className="text-lg font-semibold">{room.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Vị trí
              </label>
              <p className="text-lg">{room.location}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Sức chứa
              </label>
              <p className="text-lg">{room.capacity} chỗ</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Trạng thái
              </label>
              <p className="text-lg">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    room.status === "available"
                      ? "bg-success/10 text-success"
                      : room.status === "occupied"
                      ? "bg-danger/10 text-danger"
                      : "bg-warning/10 text-warning"
                  }`}
                >
                  {room.status === "available"
                    ? "Sẵn sàng"
                    : room.status === "occupied"
                    ? "Đang sử dụng"
                    : "Bảo trì"}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thông tin bổ sung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {room.equipment && room.equipment.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Thiết bị
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {room.equipment.map((item, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Ngày tạo
              </label>
              <p className="text-sm">{formatDate(room.createdAt)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Cập nhật lần cuối
              </label>
              <p className="text-sm">{formatDate(room.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

