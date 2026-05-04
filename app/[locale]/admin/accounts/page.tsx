"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileUp } from "lucide-react";
import { useUsers, useDeleteUser, useToggleUserStatus } from "@/hooks/use-users";
import { AccountTable } from "@/components/users/account-table";
import { User, UserRole } from "@/lib/api/users";
import { AccountFormModal } from "@/components/users/account-form-modal";
import { DeleteConfirmModal } from "@/components/users/delete-confirm-modal";
import { ImportUsersModal } from "@/components/users/import-users-modal";

import { useRouter } from "next/navigation";
// import { useSocket } from "@/lib/socket/socket-provider";
import { useSocket } from "@/hooks/use-socket";
import { useQueryClient } from "@tanstack/react-query";
import { ROUTES } from "@/lib/constants/routes";
import { getCurrentLocale } from "@/hooks/use-check-auth";
import { on } from "events";

export default function AccountsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // const { socket } = useSocket();
  const { on } = useSocket();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [statusFilter, setStatusFilter] = useState<boolean | "">("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const { data, isLoading, error } = useUsers({
    page,
    limit: 10,
    search: searchTerm || undefined,
    role: roleFilter || undefined,
    isActive: statusFilter !== "" ? (statusFilter as boolean) : undefined,
  });

  const deleteUser = useDeleteUser();
  const toggleUserStatus = useToggleUserStatus();

  useEffect(() => {
    // if (!socket) return;
    if (!on) return;

    const handleImportCompleted = () => {
      // Refresh the user list when an import finishes
      queryClient.invalidateQueries({ queryKey: ["users"] });
    };

    // socket.on("IMPORT_COMPLETED", handleImportCompleted);
    const cleanup = on("IMPORT_COMPLETED", handleImportCompleted);
    return cleanup;
  }, [on, queryClient]);
  //   return () => {
  //     socket.off("IMPORT_COMPLETED", handleImportCompleted);
  //   };
  // }, [socket, queryClient]);

  const locale = getCurrentLocale();

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
    const user = data?.data.find((u) => u.id === id);
    if (user) {
      setSelectedUser(user);
      setIsDeleteOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (selectedUser) {
      try {
        await deleteUser.mutateAsync(selectedUser.id);
        setIsDeleteOpen(false);
        setSelectedUser(null);
      } catch (error) {
        console.error("Error deleting user:", error);
      }
    }
  };

  const handleToggleLock = async (id: string, isActive: boolean) => {
    try {
      await toggleUserStatus.mutateAsync({ id, isActive: !isActive });
    } catch (error) {
      console.error("Error toggling user status:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center text-sm text-gray-500">
        <span className="hover:text-gray-700 cursor-pointer">{t("breadcrumbDashboard")}</span>
        <span className="mx-2">›</span>
        <span className="font-medium text-gray-900 dark:text-gray-100">{t("breadcrumbTitle")}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{t("title")}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsImportOpen(true)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2"
          >
            <FileUp className="mr-2 h-4 w-4" />
            {t("importExcel")}
          </Button>
          <Button onClick={handleCreate} className="bg-[#F37021] hover:bg-[#d95d15] text-white font-medium px-4 py-2">
            <Plus className="mr-2 h-4 w-4" />
            {t("createAccount")}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="border border-gray-200 dark:border-gray-800 shadow-sm rounded-lg overflow-hidden">
        <div className="p-5">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-6">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">
                {t("search")}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10 h-10 border-gray-300 focus:border-orange-500 focus:ring-orange-500 rounded-md"
                />
              </div>
            </div>

            <div className="col-span-12 md:col-span-3">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">
                {t("role")}
              </label>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as UserRole | "");
                  setPage(1);
                }}
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="">{t("allRoles")}</option>
                <option value="ADMIN">{t("roles.ADMIN")}</option>
                <option value="EXAM_OFFICER">{t("roles.EXAM_OFFICER")}</option>
                <option value="PROCTOR">{t("roles.PROCTOR")}</option>
                <option value="STUDENT">{t("roles.STUDENT")}</option>
              </select>
            </div>

            <div className="col-span-12 md:col-span-3">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">
                {t("status")}
              </label>
              <select
                value={statusFilter === "" ? "" : statusFilter === true ? "true" : "false"}
                onChange={(e) => {
                  setStatusFilter(
                    e.target.value === "" ? "" : e.target.value === "true"
                  );
                  setPage(1);
                }}
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="">{t("allStatus")}</option>
                <option value="true">{t("statuses.active")}</option>
                <option value="false">{t("statuses.locked")}</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Accounts Table */}
      <Card className="border border-gray-200 dark:border-gray-800 shadow-sm rounded-lg overflow-hidden">
        <div className="p-0">
          {error && (
            <div className="p-4 m-4 bg-red-50 text-red-600 rounded-lg dark:bg-red-900/20 dark:text-red-400">
              {t("errorLoading")}
            </div>
          )}

          <div className="overflow-x-auto">
            <AccountTable
              users={data?.data || []}
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

          {/* Pagination */}
          {data && data.total > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t("pagination.showing")} <span className="font-medium text-gray-900 dark:text-gray-100">{((page - 1) * (data.limit || 10)) + 1}</span> {t("pagination.to")}{" "}
                <span className="font-medium text-gray-900 dark:text-gray-100">{Math.min(page * (data.limit || 10), data.total)}</span> {t("pagination.of")} <span className="font-medium text-gray-900 dark:text-gray-100">{data.total}</span> {t("pagination.accounts")}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t("pagination.show")}:</span>
                  <div className="relative">
                    <input
                      type="number"
                      value={data.limit || 10}
                      readOnly
                      className="w-16 h-9 pl-3 pr-2 py-1 text-sm border border-gray-300 rounded-md focus:border-orange-500 focus:ring-orange-500 text-center"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-9 px-3 text-gray-600 border-gray-300 hover:bg-gray-50"
                  >
                    {t("pagination.previous")}
                  </Button>
                  {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                    let pageNum;
                    if (data.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= data.totalPages - 2) {
                      pageNum = data.totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "primary" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className={`h-9 w-9 p-0 ${page === pageNum
                          ? "bg-[#F37021] hover:bg-[#d95d15] text-white border-[#F37021]"
                          : "text-gray-600 border-gray-300 hover:bg-gray-50"
                          }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page === data.totalPages}
                    className="h-9 px-3 text-gray-600 border-gray-300 hover:bg-gray-50"
                  >
                    {t("pagination.next")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Delete Confirm Modal */}
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
      {/* Import Users Modal */}
      <ImportUsersModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />
    </div>
  );
}

