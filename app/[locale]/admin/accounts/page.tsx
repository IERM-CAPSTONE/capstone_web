"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileUp,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUsers, useDeleteUser, useToggleUserStatus } from "@/hooks/use-users";
import { useSocket } from "@/hooks/use-socket";
import { AccountTable } from "@/components/users/account-table";
import { DeleteConfirmModal } from "@/components/users/delete-confirm-modal";
import { ImportUsersModal } from "@/components/users/import-users-modal";
import { User, UserRole } from "@/lib/api/users";
import { ROUTES } from "@/lib/constants/routes";
import { getCurrentLocale } from "@/hooks/use-check-auth";
import { toast } from "sonner";

const ROLE_OPTIONS: UserRole[] = [
  "ADMIN",
  "EXAM_OFFICER",
  "PROCTOR",
  "HALL_INVIGILATOR",
  "IT_SUPPORT",
  "STUDENT",
];

export default function AccountsPage() {
  const t = useTranslations("Accounts");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { on } = useSocket();
  const locale = getCurrentLocale();

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [statusFilter, setStatusFilter] = useState<boolean | "">("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const summaryFilters = {
    search: searchTerm || undefined,
    role: roleFilter || undefined,
  };

  const { data, isLoading, error } = useUsers({
    page,
    limit: 10,
    search: searchTerm || undefined,
    role: roleFilter || undefined,
    isActive: statusFilter !== "" ? (statusFilter as boolean) : undefined,
  });
  const { data: activeUsersSummary } = useUsers({
    page: 1,
    limit: 1,
    ...summaryFilters,
    isActive: true,
  });
  const { data: lockedUsersSummary } = useUsers({
    page: 1,
    limit: 1,
    ...summaryFilters,
    isActive: false,
  });

  const deleteUser = useDeleteUser();
  const toggleUserStatus = useToggleUserStatus();

  useEffect(() => {
    if (!on) return;

    const handleImportCompleted = (payload?: {
      action?: string;
      message?: string;
      successCount?: number;
      errorCount?: number;
    }) => {
      if (payload?.action && payload.action !== "users") {
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["users"] });

      if (payload) {
        toast.success(
          payload.message ||
            `Import tài khoản hoàn tất. Thành công ${payload.successCount ?? 0}, lỗi ${payload.errorCount ?? 0}.`
        );
      } else {
        toast.success("Import tài khoản hoàn tất.");
      }
    };

    const cleanup = on("IMPORT_COMPLETED", handleImportCompleted);
    return cleanup;
  }, [on, queryClient]);

  const users = data?.data || [];
  const activeCount = activeUsersSummary?.total ?? 0;
  const lockedCount = lockedUsersSummary?.total ?? 0;
  const totalCount = activeCount + lockedCount;
  const hasActiveFilters = searchTerm !== "" || roleFilter !== "" || statusFilter !== "";

  const handleCreate = () => {
    router.push(`/${locale}${ROUTES.ADMIN_ACCOUNTS_CREATE}`);
  };

  const handleEdit = (user: User) => {
    router.push(`/${locale}${ROUTES.ADMIN_ACCOUNTS_EDIT(user.id)}`);
  };

  const handleView = (user: User) => {
    router.push(`/${locale}${ROUTES.ADMIN_ACCOUNTS_DETAIL(user.id)}`);
  };

  const handleDelete = (id: string) => {
    const user = users.find((item) => item.id === id);
    if (!user) return;
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    try {
      await deleteUser.mutateAsync(selectedUser.id);
      setIsDeleteOpen(false);
      setSelectedUser(null);
    } catch (deleteError) {
      console.error("Error deleting user:", deleteError);
    }
  };

  const handleToggleLock = async (id: string, isActive: boolean) => {
    try {
      await toggleUserStatus.mutateAsync({ id, isActive: !isActive });
    } catch (toggleError) {
      console.error("Error toggling user status:", toggleError);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setRoleFilter("");
    setStatusFilter("");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <span className="font-medium">{t("breadcrumbDashboard")}</span>
        <span>›</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">{t("breadcrumbTitle")}</span>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-orange-700">
            <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
            {t("breadcrumbTitle")}
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-gray-100">{t("title")}</h1>
            <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsImportOpen(true)}
            className="h-11 rounded-2xl border-gray-300 px-4 font-semibold text-gray-700 hover:bg-gray-50"
          >
            <FileUp className="mr-2 h-4 w-4" />
            {t("importExcel")}
          </Button>
          <Button
            onClick={handleCreate}
            className="h-11 rounded-2xl bg-[#F37021] px-5 font-semibold text-white hover:bg-[#d95d15]"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("createAccount")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <span className="text-lg font-black">#</span>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">{t("pagination.accounts")}</p>
              <div className="mt-1 text-3xl font-black text-gray-900">{totalCount}</div>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <span className="text-lg font-black">A</span>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">{t("statuses.active")}</p>
              <div className="mt-1 text-3xl font-black text-emerald-600">{activeCount}</div>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <span className="text-lg font-black">L</span>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-400">{t("statuses.locked")}</p>
              <div className="mt-1 text-3xl font-black text-rose-600">{lockedCount}</div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-[1.75rem] border border-gray-200 shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50/80 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-900 text-white">
                <Search className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900">{t("search")}</h2>
                <p className="text-sm text-gray-500">{t("subtitle")}</p>
              </div>
            </div>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="rounded-xl border-gray-300 text-gray-700 hover:bg-white"
              >
                <span className="mr-2 inline-block text-sm">↺</span>
                Reset
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-5 px-6 py-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-[0.18em] text-gray-500">{t("search")}</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="h-12 rounded-2xl border-gray-300 pl-11 text-sm font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-[0.18em] text-gray-500">{t("role")}</label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as UserRole | "");
                setPage(1);
              }}
              className="h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            >
              <option value="">{t("allRoles")}</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {t(`roles.${role}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-[0.18em] text-gray-500">{t("status")}</label>
            <select
              value={statusFilter === "" ? "" : statusFilter === true ? "true" : "false"}
              onChange={(e) => {
                setStatusFilter(e.target.value === "" ? "" : e.target.value === "true");
                setPage(1);
              }}
              className="h-12 w-full rounded-2xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            >
              <option value="">{t("allStatus")}</option>
              <option value="true">{t("statuses.active")}</option>
              <option value="false">{t("statuses.locked")}</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden rounded-[1.75rem] border border-gray-200 shadow-sm">
        <div className="p-0">
          {error && (
            <div className="m-4 rounded-2xl bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {t("errorLoading")}
            </div>
          )}

          <div className="overflow-x-auto">
            <AccountTable
              users={users}
              onEdit={handleEdit}
              onView={handleView}
              onDelete={handleDelete}
              onToggleLock={handleToggleLock}
              isLoading={isLoading}
              currentPage={page}
              pageSize={data?.limit || 10}
              total={data?.total || 0}
            />
          </div>

          {data && data.total > 0 && (
            <div className="flex flex-col gap-4 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t("pagination.showing")}{" "}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {(page - 1) * (data.limit || 10) + 1}
                </span>{" "}
                {t("pagination.to")}{" "}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {Math.min(page * (data.limit || 10), data.total)}
                </span>{" "}
                {t("pagination.of")}{" "}
                <span className="font-medium text-gray-900 dark:text-gray-100">{data.total}</span>{" "}
                {t("pagination.accounts")}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t("pagination.show")}:</span>
                  <input
                    type="number"
                    value={data.limit || 10}
                    readOnly
                    className="h-9 w-16 rounded-xl border border-gray-300 px-3 text-center text-sm"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    className="h-9 rounded-xl border-gray-300 px-3 text-gray-600 hover:bg-gray-50"
                  >
                    {t("pagination.previous")}
                  </Button>

                  {Array.from({ length: Math.min(5, data.totalPages) }, (_, index) => {
                    let pageNum;
                    if (data.totalPages <= 5) {
                      pageNum = index + 1;
                    } else if (page <= 3) {
                      pageNum = index + 1;
                    } else if (page >= data.totalPages - 2) {
                      pageNum = data.totalPages - 4 + index;
                    } else {
                      pageNum = page - 2 + index;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "primary" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className={`h-9 w-9 rounded-xl p-0 ${
                          page === pageNum
                            ? "border-[#F37021] bg-[#F37021] text-white hover:bg-[#d95d15]"
                            : "border-gray-300 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((prev) => Math.min(data.totalPages, prev + 1))}
                    disabled={page === data.totalPages}
                    className="h-9 rounded-xl border-gray-300 px-3 text-gray-600 hover:bg-gray-50"
                  >
                    {t("pagination.next")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {isDeleteOpen && selectedUser && (
        <DeleteConfirmModal
          user={selectedUser}
          onConfirm={confirmDelete}
          onCancel={() => {
            setIsDeleteOpen(false);
            setSelectedUser(null);
          }}
          isLoading={deleteUser.isPending}
        />
      )}

      <ImportUsersModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
    </div>
  );
}
