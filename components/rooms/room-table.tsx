"use client";

import { Room } from "@/types";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Eye, Cpu } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { formatDate } from "@/lib/utils/format";
import { useTranslations } from "next-intl";

interface RoomTableProps {
  rooms: Room[];
  onEdit?: (room: Room) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
  showActions?: boolean;
  showCreateButton?: boolean;
}

export function RoomTable({
  rooms,
  onDelete,
  isLoading,
  showActions = true,
}: RoomTableProps) {
  const t = useTranslations("Rooms");
  const commonT = useTranslations("Common");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500 mb-4">{t("notFound") || "No exam rooms"}</p>
      </div>
    );
  }

  const getStatusBadge = (status: Room["status"]) => {
    const config: Record<string, { label: string; className: string }> = {
      available: {
        label: t("statusAvailable") || "Available",
        className: "bg-green-100 text-green-700 border border-green-200",
      },
      occupied: {
        label: t("statusOccupied") || "In Use",
        className: "bg-orange-100 text-orange-700 border border-orange-200",
      },
      inuse: {
        label: t("statusOccupied") || "In Use",
        className: "bg-orange-100 text-orange-700 border border-orange-200",
      },
      maintenance: {
        label: t("statusMaintenance") || "Disabled",
        className: "bg-gray-100 text-gray-700 border border-gray-200",
      },
      disabled: {
        label: t("statusMaintenance") || "Disabled",
        className: "bg-gray-100 text-gray-700 border border-gray-200",
      },
    };

    const normalizedStatus = (status || '').toLowerCase();
    const statusConfig = config[normalizedStatus] || {
      label: status || "Unknown",
      className: "bg-gray-100 text-gray-700 border border-gray-200",
    };

    const { label, className } = statusConfig;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${className}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/20">
              <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 dark:border-slate-800 first:rounded-tl-[2rem]">
                {t("roomNumber")}
              </th>
              <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 dark:border-slate-800">
                {t("campus")}
              </th>
              <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 dark:border-slate-800 font-mono">
                {t("capacity")}
              </th>
              <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 dark:border-slate-800">
                {t("status")}
              </th>
              <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 dark:border-slate-800 font-mono">
                {t("equipment")}
              </th>
              <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 dark:border-slate-800">
                {t("updatedAt")}
              </th>
              {showActions && (
                <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 dark:border-slate-800 last:rounded-tr-[2rem]">
                  {commonT("actions")}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {rooms.map((room) => (
              <tr
                key={room.id}
                className="group hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-all duration-300 transform"
              >
                <td className="px-8 py-6 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 font-black text-sm border border-orange-500/20 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
                      {room.roomNumber.toString().slice(0, 1)}
                    </div>
                    <span className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">
                      {room.roomNumber}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-6 whitespace-nowrap">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-500/5 border border-blue-500/10 text-blue-600 dark:text-blue-400 font-black text-[11px] tracking-widest uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {room.campus || 'Global'}
                  </div>
                </td>
                <td className="px-8 py-6 whitespace-nowrap font-mono">
                  <div className="flex items-baseline gap-1 text-slate-600 dark:text-slate-300">
                    <span className="font-black text-slate-900 dark:text-white text-base">{room.capacity || 0}</span>
                    <span className="text-[10px] uppercase font-bold opacity-50">{t("seats")}</span>
                  </div>
                </td>
                <td className="px-8 py-6 whitespace-nowrap">
                  {getStatusBadge(room.status)}
                </td>
                <td className="px-8 py-6 whitespace-nowrap font-mono">
                  <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    <Cpu className="h-4 w-4" />
                    <span className="text-sm font-bold">0</span>
                  </div>
                </td>
                <td className="px-8 py-6 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                      {formatDate(room.updatedAt)}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 italic">Official Update</span>
                  </div>
                </td>
                {showActions && (
                  <td className="px-8 py-6 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                      <Link href={ROUTES.ROOMS_DETAIL(room.id)}>
                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl hover:bg-white dark:hover:bg-slate-700 shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all">
                          <Eye className="h-5 w-5 text-blue-500" />
                        </Button>
                      </Link>
                      <Link href={ROUTES.ROOMS_EDIT(room.id)}>
                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl hover:bg-white dark:hover:bg-slate-700 shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all">
                          <Edit className="h-5 w-5 text-emerald-500" />
                        </Button>
                      </Link>
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(room.id)}
                          className="h-10 w-10 p-0 rounded-xl hover:bg-white dark:hover:bg-slate-700 shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all"
                        >
                          <Trash2 className="h-5 w-5 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


