"use client";

import { User } from "@/lib/api/users";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Eye, Lock, Unlock } from "lucide-react";
import { format as dateFnsFormat, parseISO } from "date-fns";
import { enUS, vi } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";

interface AccountTableProps {
  users: User[];
  onEdit?: (user: User) => void;
  onDelete?: (id: string) => void;
  onView?: (user: User) => void;
  onToggleLock?: (id: string, isActive: boolean) => void;
  isLoading?: boolean;
  currentPage?: number;
  pageSize?: number;
  total?: number;
}

export function AccountTable({
  users,
  onEdit,
  onDelete,
  onView,
  onToggleLock,
  isLoading,
  currentPage = 1,
  pageSize = 10,
  total = 0,
}: AccountTableProps) {
  const t = useTranslations("Accounts");
  const locale = useLocale();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">{t("table.loading")}</div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500 mb-4">{t("table.noAccounts")}</p>
      </div>
    );
  }

  const getRoleBadge = (role: User["role"]) => {
    const config = {
      ADMIN: {
        className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      },
      EXAM_OFFICER: {
        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      },
      PROCTOR: {
        className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
      },
      HALL_INVIGILATOR: {
        className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
      },
      IT_SUPPORT: {
        className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
      },
      STUDENT: {
        className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      },
    };

    if (!role) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {t("table.noRole")}
        </span>
      );
    }

    const roleConfig = config[role];
    if (!roleConfig) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {role}
        </span>
      );
    }

    const { className } = roleConfig;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${className}`}>
        {t(`roles.${role}`)}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400"></span>
          {t("statuses.active")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400"></span>
        {t("statuses.locked")}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("table.accountId")}</th>
            <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("table.fullName")}</th>
            <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("table.email")}</th>
            <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("table.username")}</th>
            <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("table.role")}</th>
            <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("table.status")}</th>
            <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("table.createdDate")}</th>
            <th className="text-right py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("table.actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {users.map((user, index) => {
            const accountNumber = index + 1 + (currentPage - 1) * pageSize;
            const accountId = user.code || `ACC${String(accountNumber).padStart(3, '0')}`;

            return (
              <tr
                key={user.id}
                className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td className="py-4 px-4 whitespace-nowrap">
                  <div className="font-bold text-sm text-gray-900 dark:text-gray-100">
                    {accountId}
                  </div>
                </td>
                <td className="py-4 px-4 whitespace-nowrap">
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{user.fullName || "N/A"}</div>
                </td>
                <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {user.email || <span className="text-gray-300 italic">N/A</span>}
                </td>
                <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {user.username || <span className="text-gray-300 italic">N/A</span>}
                </td>
                <td className="py-4 px-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>
                <td className="py-4 px-4 whitespace-nowrap">{getStatusBadge(user.isActive)}</td>
                <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {(() => {
                    try {
                      const date = typeof user.createdAt === "string" ? parseISO(user.createdAt) : user.createdAt;
                      return dateFnsFormat(date, "MMM dd, yyyy", { locale: locale === "vi" ? vi : enUS });
                    } catch {
                      return "";
                    }
                  })()}
                </td>
                <td className="py-4 px-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    {onView ? (
                      <button
                        onClick={() => onView(user)}
                        title={t("table.viewDetails")}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    ) : (
                      <a
                        href={`/dashboard/accounts/${user.id}`}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                        title={t("table.viewDetails")}
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                    )}
                    {onToggleLock && (
                      <button
                        onClick={() => onToggleLock(user.id, user.isActive)}
                        title={user.isActive ? t("table.lockAccount") : t("table.unlockAccount")}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                      >
                        {user.isActive ? (
                          <Lock className="h-4 w-4" />
                        ) : (
                          <Unlock className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(user)}
                        title={t("table.editAccount")}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

