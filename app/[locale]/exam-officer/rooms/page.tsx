"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useRooms } from "@/hooks/use-rooms";
import { RoomTable } from "@/components/rooms/room-table";
import { Room } from "@/types";
import { useTranslations } from "next-intl";

export default function ExamOfficerRoomsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const t = useTranslations("Rooms");

  const { data, isLoading } = useRooms({
    page,
    limit: 10,
  });

  const filteredRooms =
    data?.data?.filter((room: Room) =>
      room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold">{t("listTitle") || "Exam Rooms"}</h1>
        <p className="text-gray-600 mt-1">
          {t("subtitle") || "View available exam rooms"}
        </p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by room code"
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <RoomTable
            rooms={filteredRooms}
            isLoading={isLoading}
            showActions={false}
            showCreateButton={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
