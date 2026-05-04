"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Import, Trash2, LayoutGrid, CheckCircle, Clock, Construction, RotateCw } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { useRooms, useDeleteRoom, useDeleteBulkRooms } from "@/hooks/use-rooms";
import { RoomTable } from "@/components/rooms/room-table";
import { ImportRoomDialog } from "@/components/rooms/import-room-dialog";
import { toast } from "sonner";

import { useTranslations } from "next-intl";
import { getCurrentLocale } from "@/hooks/use-check-auth";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function RoomsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCampus, setSelectedCampus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Confirmation states
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
    isLoading: boolean;
  }>({
    title: "",
    description: "",
    onConfirm: () => { },
    isLoading: false,
  });

  const t = useTranslations("Rooms");
  const commonT = useTranslations("Common");
  const locale = getCurrentLocale();

  // ✅ SỬ DỤNG HOOK để fetch data
  const { data, isLoading, refetch, isRefetching } = useRooms({
    page,
    limit: 10,
    campus: selectedCampus === "all" ? undefined : selectedCampus,
    roomNumber: searchTerm || undefined,
  });

  // ✅ SỬ DỤNG MUTATION để delete
  const deleteRoom = useDeleteRoom();
  const deleteBulkRooms = useDeleteBulkRooms();

  const handleDelete = (id: string) => {
    setConfirmConfig({
      title: t("deleteConfirmTitle") || "Confirm Delete",
      description: t("deleteConfirm") || "Are you sure you want to delete this room?",
      isLoading: false,
      onConfirm: async () => {
        try {
          setConfirmConfig(prev => ({ ...prev, isLoading: true }));
          await deleteRoom.mutateAsync(id);
          toast.success(t("deleteSuccess") || "Room deleted successfully");
          setConfirmOpen(false);
        } catch (error) {
          console.error("Error deleting room:", error);
          toast.error(t("deleteError") || "Failed to delete room");
        } finally {
          setConfirmConfig(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
    setConfirmOpen(true);
  };

  const handleDeleteBulk = () => {
    const filterDesc = [];
    if (selectedCampus !== "all") filterDesc.push(`campus ${selectedCampus}`);
    if (searchTerm) filterDesc.push(`search "${searchTerm}"`);

    const countMsg = data?.pagination?.total ? `(${data.pagination.total} ${t("roomCount") || "rooms"}) ` : "";
    const filterMsg = filterDesc.length > 0 ? `${t("matching") || "matching"} ${filterDesc.join(" and ")}` : `${t("all") || "ALL"} ${t("roomCount") || "rooms"}`;

    setConfirmConfig({
      title: t("deleteAllTitle") || "Delete All Filtered Rooms",
      description: `${t("confirmDeleteAll") || "ARE YOU SURE? This will delete"} ${countMsg}${filterMsg}. ${t("cannotUndo") || "This action CANNOT be undone."}`,
      isLoading: false,
      onConfirm: async () => {
        try {
          setConfirmConfig(prev => ({ ...prev, isLoading: true }));
          const result = await deleteBulkRooms.mutateAsync({
            campus: selectedCampus === "all" ? undefined : selectedCampus,
            roomNumber: searchTerm || undefined,
          });
          toast.success(`${t("deleteBulkSuccess") || "Successfully deleted"} ${result.deletedCount} ${t("roomCount") || "rooms"}.`);
          setPage(1);
          setConfirmOpen(false);
        } catch (error) {
          console.error("Error deleting rooms:", error);
          toast.error(t("deleteBulkError") || "Failed to delete rooms");
        } finally {
          setConfirmConfig(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
    setConfirmOpen(true);
  };

  const filteredRooms = data?.data || [];

  return (
    <div className="space-y-10 pb-20 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      {/* Premium Light Header & Stats Section */}
      <section className="relative overflow-hidden rounded-[3rem] bg-white border border-slate-100 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.05)]">
        {/* Soft Background Accents */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/[0.03] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-500/[0.02] rounded-full blur-[80px] pointer-events-none" />

        <div className="relative p-8 lg:p-14">
          <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-10 mb-14">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-100">
                <div className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)] animate-pulse" />
                <span className="text-[11px] uppercase tracking-[0.2em] font-black text-orange-600">{t("enterpriseRegistry")}</span>
              </div>
              <h1 className="text-4xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                {t("listTitle")}
              </h1>
              <p className="max-w-xl text-slate-500 font-semibold text-xl leading-relaxed opacity-80">
                {t("subtitle") || "Advanced configuration and monitoring for campus examination environments."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading || isRefetching}
                className="h-14 px-8 border-slate-200 bg-white hover:bg-slate-50 hover:border-orange-200 text-slate-700 rounded-2xl transition-all active:scale-95 shadow-sm flex items-center gap-3 group"
              >
                <RotateCw className={`h-5 w-5 text-orange-500 transition-transform duration-500 ${isRefetching ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                <span className="font-bold text-base">{commonT("refresh") || "Refresh"}</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsImportDialogOpen(true)}
                className="h-14 px-8 border-slate-200 bg-white hover:bg-slate-50 hover:border-orange-200 text-slate-700 rounded-2xl transition-all active:scale-95 shadow-sm group"
              >
                <Import className="mr-3 h-5 w-5 text-orange-500 group-hover:-translate-y-0.5 transition-transform" />
                <span className="font-bold text-base">{t("importRooms")}</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleDeleteBulk}
                className="h-14 px-8 border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-700 rounded-2xl transition-all active:scale-95 shadow-sm group"
                disabled={!data?.data || data.data.length === 0 || deleteBulkRooms.isPending}
              >
                <Trash2 className="mr-3 h-5 w-5 text-red-500 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-base">{t("deleteAll")}</span>
              </Button>
              <Link href={`/${locale}${ROUTES.ROOMS_CREATE}`}>
                <Button className="h-14 px-8 bg-orange-600 hover:bg-orange-500 text-white border-0 shadow-[0_10px_20px_-5px_rgba(234,88,12,0.4)] rounded-2xl transition-all active:scale-95 flex items-center gap-2">
                  <Plus className="h-5 w-5" strokeWidth={3} />
                  <span className="text-base font-bold">{t("createRoom")}</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Minimalist Stats Divider */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { label: t("roomTotal"), value: data?.pagination?.total || 0, icon: LayoutGrid, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
              { label: t("statusAvailable"), value: "0", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
              { label: t("statusOccupied"), value: "0", icon: Clock, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" },
              { label: t("statusMaintenance"), value: "0", icon: Construction, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-100" },
            ].map((stat, idx) => (
              <div key={idx} className={`relative group p-7 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden`}>
                <div className="flex flex-col gap-4">
                  <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} border ${stat.border} flex items-center justify-center shadow-inner`}>
                    <stat.icon className="h-7 w-7" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-slate-900 tabular-nums tracking-tight">{stat.value}</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modern Control Panel */}
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row items-center gap-4">
          <div className="flex-1 relative group w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 group-focus-within:text-orange-500 transition-all duration-300" />
            <Input
              placeholder={t("searchPlaceholder") || "Search rooms..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-16 pl-16 pr-8 bg-white border-slate-100 focus-visible:ring-4 focus-visible:ring-orange-500/10 rounded-[1.5rem] text-lg font-semibold shadow-sm hover:shadow-md transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="w-full lg:w-72 relative group h-16">
            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="w-full h-full bg-white px-6 rounded-[1.5rem] border border-slate-100 text-base font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all appearance-none cursor-pointer shadow-sm hover:shadow-md"
            >
              <option value="all">{t("allCampuses")}</option>
              {["HCM", "HN", "DN", "QN", "CT"].map((campus) => (
                <option key={campus} value={campus}>
                  {campus} Campus
                </option>
              ))}
            </select>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-orange-500 transition-colors">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
            </div>
          </div>

          <div className="h-16 px-10 flex items-center justify-center bg-white border border-slate-100 rounded-[1.5rem] text-slate-900 font-black text-sm tracking-[0.1em] shadow-sm">
            <span className="text-orange-600 mr-2">{filteredRooms.length}</span> {commonT("items").toUpperCase()}
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-[3rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.03)] border border-slate-100/50 overflow-hidden min-h-[600px] flex flex-col">
          <div className="flex-1">
            <RoomTable
              rooms={filteredRooms}
              onDelete={handleDelete}
              isLoading={isLoading}
            />
          </div>

          {/* Premium Pagination */}
          {data?.pagination && (
            <div className="p-10 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-8 bg-slate-50/20">
              <div className="flex items-center gap-4 text-slate-400 font-bold text-xs tracking-[0.1em] uppercase px-8 py-3 bg-white rounded-full border border-slate-100 shadow-sm">
                <span>{commonT("showing")}</span>
                <span className="text-slate-900 font-black px-2 py-0.5 bg-slate-100 rounded-md tabular-nums">{filteredRooms.length}</span>
                <span>{commonT("of")}</span>
                <span className="text-orange-600 font-black px-2 py-0.5 bg-orange-50 rounded-md tabular-nums">{data.pagination.total}</span>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                  className="h-14 w-14 p-0 border-slate-200 bg-white rounded-2xl hover:bg-slate-50 shadow-sm transition-all group disabled:opacity-30"
                >
                  <svg className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                </Button>

                <div className="flex items-center gap-3 px-8 h-14 bg-white border border-slate-100 rounded-2xl shadow-sm text-lg font-black tracking-tight">
                  <span className="text-orange-600 px-3 py-1 bg-orange-50 rounded-lg">{page}</span>
                  <span className="opacity-20 font-light text-2xl">/</span>
                  <span className="text-slate-900">{data.pagination.totalPages}</span>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page === data.pagination.totalPages || isLoading}
                  className="h-14 w-14 p-0 border-slate-200 bg-white rounded-2xl hover:bg-slate-50 shadow-sm transition-all group disabled:opacity-30"
                >
                  <svg className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ImportRoomDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        description={confirmConfig.description}
        isLoading={confirmConfig.isLoading}
      />
    </div>
  );
}

