"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { useCreateRoom } from "@/hooks/use-rooms";
import { ROUTES } from "@/lib/constants/routes";
import { RoomStatus } from "@/types";
import { getCurrentLocale } from "@/hooks/use-check-auth";

// ✅ VALIDATION SCHEMA với Zod
const roomSchema = z.object({
  name: z.string().min(1, "Tên phòng không được để trống"),
  location: z.string().min(1, "Vị trí không được để trống"),
  capacity: z.number().min(1, "Sức chứa phải lớn hơn 0"),
  status: z.enum(["available", "occupied", "maintenance"]),
  equipment: z.array(z.string()).optional(),
});

type RoomFormData = z.infer<typeof roomSchema>;

export default function CreateRoomPage() {
  const router = useRouter();
  const createRoom = useCreateRoom();
  const locale = getCurrentLocale();

  // ✅ SỬ DỤNG REACT HOOK FORM với Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      status: "available",
      equipment: [],
    },
  });

  const onSubmit = async (data: RoomFormData) => {
    try {
      // ✅ SỬ DỤNG MUTATION để create
      await createRoom.mutateAsync(data);
      router.push(`/${locale}${ROUTES.ROOMS}`);
    } catch (error) {
      console.error("Error creating room:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
        <h1 className="text-3xl font-bold">Tạo phòng thi mới</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Thêm phòng thi mới vào hệ thống
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin phòng thi</CardTitle>
        </CardHeader>
        <CardContent>
          {/* ✅ FORM với validation */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Tên phòng"
              {...register("name")}
              error={errors.name?.message}
              placeholder="VD: Phòng A101"
            />

            <Input
              label="Vị trí"
              {...register("location")}
              error={errors.location?.message}
              placeholder="VD: Tầng 1, Tòa A"
            />

            <Input
              label="Sức chứa"
              type="number"
              {...register("capacity", { valueAsNumber: true })}
              error={errors.capacity?.message}
              placeholder="VD: 50"
            />

            <div>
              <label className="block text-sm font-medium mb-1">
                Trạng thái
              </label>
              <select
                {...register("status")}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="available">Sẵn sàng</option>
                <option value="occupied">Đang sử dụng</option>
                <option value="maintenance">Bảo trì</option>
              </select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Hủy
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Tạo phòng thi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


