"use client";

import { User } from "@/lib/api/users";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Eye, Lock, Unlock } from "lucide-react";
import { format as dateFnsFormat, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";

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
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500 mb-4">Chưa có tài khoản nào</p>
      </div>
    );
  }

  const getRoleBadge = (role: User["role"]) => {
    const config = {
      ADMIN: {
        label: "Admin",
        className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
      },
      EXAM_OFFICER: {
        label: "Exam Officer",
        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      },
      PROCTOR: {
        label: "Proctor",
        className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
      },
      STUDENT: {
        label: "Student",
        className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      },
    };

    if (!role) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          No Role
        </span>
      );
    }

    const { label, className } = config[role];
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${className}`}>
        {label}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400"></span>
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400"></span>
        Locked
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">ACCOUNT ID</th>
            <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">FULL NAME</th>
            <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">EMAIL</th>
            <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">ROLE</th>
            <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">STATUS</th>
            <th className="text-left py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">CREATED DATE</th>
            <th className="text-right py-3 px-4 font-bold text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">ACTIONS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {users.map((user, index) => {
            const accountNumber = index + 1 + (currentPage - 1) * pageSize;
            const accountId = `ACC${String(accountNumber).padStart(3, '0')}`;

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
                  {user.email}
                </td>
                <td className="py-4 px-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>
                <td className="py-4 px-4 whitespace-nowrap">{getStatusBadge(user.isActive)}</td>
                <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {(() => {
                    try {
                      const date = typeof user.createdAt === "string" ? parseISO(user.createdAt) : user.createdAt;
                      return dateFnsFormat(date, "MMM dd, yyyy", { locale: enUS });
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
                        title="View details"
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    ) : (
                      <a
                        href={`/dashboard/accounts/${user.id}`}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                    )}
                    {onToggleLock && (
                      <button
                        onClick={() => onToggleLock(user.id, user.isActive)}
                        title={user.isActive ? "Lock account" : "Unlock account"}
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
                        title="Edit account"
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
