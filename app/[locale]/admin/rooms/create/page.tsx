"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Upload } from "lucide-react";
import { useCreateRoom } from "@/hooks/use-rooms";
import { ROUTES } from "@/lib/constants/routes";
import { RoomStatus } from "@/types";
import { getCurrentLocale } from "@/hooks/use-check-auth";
import apiClient from "@/lib/api/client";

// ✅ VALIDATION SCHEMA với Zod
const roomSchema = z.object({
  roomNumber: z.string().min(1, "Room number is required"),
  capacity: z.number().min(1, "Capacity must be greater than 0").optional().nullable(),
  maxRows: z.number().min(1, "Max rows must be greater than 0").optional(),
  maxColumns: z.number().min(1, "Max columns must be greater than 0").optional(),
  status: z.enum(["Available", "Occupied", "Maintenance", "Exam_Ongoing", "For_Exam"]).optional(),
});

type RoomFormData = z.infer<typeof roomSchema>;

export default function CreateRoomPage() {
  const router = useRouter();
  const createRoom = useCreateRoom();
  const locale = getCurrentLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  // ✅ SỬ DỤNG REACT HOOK FORM với Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      status: "Available",
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

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post("/exam-rooms/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadMessage(response.data.message || "Import started successfully");
      setTimeout(() => {
        router.push(`/${locale}${ROUTES.ROOMS}`);
      }, 2000);
    } catch (error: any) {
      setUploadMessage(error.response?.data?.message || "Import failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileImport}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Importing..." : "Import from Excel"}
          </Button>
          {uploadMessage && (
            <p className={`text-sm mt-2 ${uploadMessage.includes("success") ? "text-green-600" : "text-red-600"}`}>
              {uploadMessage}
            </p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin phòng thi</CardTitle>
        </CardHeader>
        <CardContent>
          {/* ✅ FORM với validation */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Room Number"
              {...register("roomNumber")}
              error={errors.roomNumber?.message}
              placeholder="e.g., 101, A202"
            />

            <Input
              label="Capacity"
              type="number"
              {...register("capacity", { valueAsNumber: true })}
              error={errors.capacity?.message}
              placeholder="e.g., 30"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Max Rows"
                type="number"
                {...register("maxRows", { valueAsNumber: true })}
                error={errors.maxRows?.message}
                placeholder="e.g., 5"
              />

              <Input
                label="Max Columns"
                type="number"
                {...register("maxColumns", { valueAsNumber: true })}
                error={errors.maxColumns?.message}
                placeholder="e.g., 6"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Status
              </label>
              <select
                {...register("status")}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Exam_Ongoing">Exam Ongoing</option>
                <option value="For_Exam">For Exam</option>
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


