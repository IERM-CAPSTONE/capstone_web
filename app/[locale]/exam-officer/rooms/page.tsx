"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, LayoutGrid, CheckCircle, Clock, Construction, RotateCw } from "lucide-react";
import { useRooms } from "@/hooks/use-rooms";
import { RoomTable } from "@/components/rooms/room-table";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function ExamOfficerRoomsPage() {
  const t = useTranslations("Rooms");
  const commonT = useTranslations("Common");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCampus, setSelectedCampus] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isRefetching } = useRooms({
    page,
    limit: 10,
    campus: selectedCampus === "all" ? undefined : selectedCampus,
    roomNumber: searchTerm || undefined,
  });

  const rooms = data?.data || [];

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
                <span className="text-[11px] uppercase tracking-[0.2em] font-black text-orange-600">Officer Portal</span>
              </div>
              <h1 className="text-4xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                {t("listTitle") || "Room Management"}
              </h1>
              <p className="max-w-xl text-slate-500 font-semibold text-xl leading-relaxed opacity-80">
                {t("subtitle") || "Monitor and coordinate available examination environments across all campuses."}
              </p>
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
            </div>
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
              <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
            </div>
          </div>

          <div className="h-16 px-10 flex items-center justify-center bg-white border border-slate-100 rounded-[1.5rem] text-slate-900 font-black text-sm tracking-[0.1em] shadow-sm">
            <span className="text-orange-600 mr-2">{rooms.length}</span> {commonT("items").toUpperCase()}
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-[3rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.03)] border border-slate-100/50 overflow-hidden min-h-[600px] flex flex-col">
          <div className="flex-1">
            <RoomTable
              rooms={rooms}
              isLoading={isLoading}
              showActions={false}
            />
          </div>

          {/* Premium Pagination */}
          {data?.pagination && (
            <div className="p-10 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-8 bg-slate-50/20">
              <div className="flex items-center gap-4 text-slate-400 font-bold text-xs tracking-[0.1em] uppercase px-8 py-3 bg-white rounded-full border border-slate-100 shadow-sm">
                <span>{commonT("showing")}</span>
                <span className="text-slate-900 font-black px-2 py-0.5 bg-slate-100 rounded-md tabular-nums">{rooms.length}</span>
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
    </div>
  );
}
