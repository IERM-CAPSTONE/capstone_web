"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { useRooms, useDeleteRoom } from "@/hooks/use-rooms";
import { RoomTable } from "@/components/rooms/room-table";
import { Room } from "@/types";

import { useTranslations } from "next-intl";
import { getCurrentLocale } from "@/hooks/use-check-auth";

export default function RoomsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const t = useTranslations("Rooms");
  const commonT = useTranslations("Common");
  const locale = getCurrentLocale();

  // ✅ SỬ DỤNG HOOK để fetch data
  const { data, isLoading, error } = useRooms({
    page,
    limit: 10,
  });

  // ✅ SỬ DỤNG MUTATION để delete
  const deleteRoom = useDeleteRoom();

  const handleDelete = async (id: string) => {
    if (confirm(t("deleteConfirm"))) {
      try {
        await deleteRoom.mutateAsync(id);
      } catch (error) {
        console.error("Error deleting room:", error);
      }
    }
  };

  // Filter rooms by search term
  const filteredRooms =
    data?.data?.filter(
      (room: Room) =>
        room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("listTitle")}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t("subtitle") || "Manage and configure examination rooms"}
          </p>
        </div>
        <Link href={`/${locale}${ROUTES.ROOMS_CREATE}`}>
          <Button className="bg-orange-500 hover:bg-orange-600">
            <Plus className="mr-2 h-4 w-4" />
            {t("createRoom") || "Create Exam Room"}
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t("searchPlaceholder") || "Search by room code or name"}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs text-gray-500">
              <div>Status</div>
              <div>Capacity</div>
              <div>Devices</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Room Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          {error && (
            <div className="p-4 mb-4 bg-red-50 text-red-600 rounded-lg">
              {commonT("error") || "An error occurred"}
            </div>
          )}

          {/* ✅ SỬ DỤNG COMPONENT */}
          <RoomTable
            rooms={filteredRooms}
            onDelete={handleDelete}
            isLoading={isLoading}
          />

          {/* Pagination */}
          {data?.pagination && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span>{commonT("showing") || "Showing"}</span>{" "}
                <span className="font-medium">{filteredRooms.length}</span>{" "}
                <span>{commonT("of") || "of"}</span>{" "}
                <span className="font-medium">{data.pagination.total || 0}</span>{" "}
                <span>{commonT("items") || "rooms"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                  className="px-4"
                >
                  {commonT("previous") || "Previous"}
                </Button>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 px-2">
                  <span className="font-medium">{page}</span>
                  <span>/</span>
                  <span className="font-medium">{data.pagination.totalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((p) =>
                      Math.min(data.pagination.totalPages, p + 1)
                    )
                  }
                  disabled={page === data.pagination.totalPages || isLoading}
                  className="px-4"
                >
                  {commonT("next") || "Next"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

