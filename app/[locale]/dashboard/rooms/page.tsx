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

export default function RoomsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const t = useTranslations("Rooms");
  const commonT = useTranslations("Common");

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
        room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.location.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("listTitle")}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t("listTitle")} ({data?.pagination?.total || 0} {t("roomCount")})
          </p>
        </div>
        <Link href={ROUTES.ROOMS_CREATE}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t("createRoom")}
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Room Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("listTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-4 mb-4 bg-danger/10 text-danger rounded-lg">
              {commonT("error")}
            </div>
          )}

          {/* ✅ SỬ DỤNG COMPONENT */}
          <RoomTable
            rooms={filteredRooms}
            onDelete={handleDelete}
            isLoading={isLoading}
          />

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {commonT("page")} {data.pagination.page} / {data.pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  {commonT("previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((p) =>
                      Math.min(data.pagination.totalPages, p + 1)
                    )
                  }
                  disabled={page === data.pagination.totalPages}
                >
                  {commonT("next")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

