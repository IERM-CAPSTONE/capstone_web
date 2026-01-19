"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useRoom, useUpdateRoom } from "@/hooks/use-rooms";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslations } from "next-intl";
import { getCurrentLocale } from "@/hooks/use-check-auth";

export default function RoomEditPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const t = useTranslations("Rooms");
  const commonT = useTranslations("Common");
  const locale = getCurrentLocale();

  const { data: room, isLoading, error } = useRoom(id);
  const updateRoom = useUpdateRoom();

  const [formData, setFormData] = useState({
    roomNumber: room?.roomNumber || "",
    capacity: room?.capacity || "",
  });

  // Update form when room data loads
  useEffect(() => {
    if (room) {
      setFormData({
        roomNumber: room.roomNumber || "",
        capacity: room.capacity?.toString() || "",
      });
    }
  }, [room]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateRoom.mutateAsync({
        id,
        data: {
          roomNumber: formData.roomNumber,
          capacity: formData.capacity ? parseInt(formData.capacity) : null,
        },
      });
      router.push(`/${locale}${ROUTES.ROOMS_DETAIL(id)}`);
    } catch (error) {
      console.error("Error updating room:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">{commonT("loading")}</div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("actions.back")}
        </Button>
        <div className="text-danger">{commonT("error")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("actions.back")}
          </Button>
        </div>
        <h1 className="text-3xl font-bold">{t("editTitle")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("editForm")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("fields.roomNumber")}
              </label>
              <Input
                type="text"
                value={formData.roomNumber}
                onChange={(e) =>
                  setFormData({ ...formData, roomNumber: e.target.value })
                }
                placeholder={t("fields.roomNumber")}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {t("fields.capacity")}
              </label>
              <Input
                type="number"
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({ ...formData, capacity: e.target.value })
                }
                placeholder={t("fields.capacity")}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                {commonT("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={updateRoom.isPending}
              >
                {updateRoom.isPending ? commonT("saving") : commonT("save")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
