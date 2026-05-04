"use client";

import { useState } from "react";
import { ProctorApplication } from "@/lib/api/proctor-applications";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { format as dateFnsFormat, parseISO } from "date-fns";
import { enUS, vi } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";

interface ProctorApplicationManagementTableProps {
  applications: ProctorApplication[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  isLoading?: boolean;
  currentPage?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
}

export function ProctorApplicationManagementTable({
  applications,
  onApprove,
  onReject,
  isLoading,
  currentPage = 1,
  pageSize = 10,
  total = 0,
  onPageChange,
}: ProctorApplicationManagementTableProps) {
  const t = useTranslations("ProctorApplications");
  const locale = useLocale();
  const dateLocale = locale === "vi" ? vi : enUS;
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    type: "approve" | "reject";
  } | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">{t("table.loading")}</div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500 mb-4">{t("messages.noApplications")}</p>
      </div>
    );
  }

  const getStatusBadge = (status: ProctorApplication["status"]) => {
    const config = {
      PENDING: {
        label: t("statuses.pending"),
        className:
          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
      },
      APPROVED: {
        label: t("statuses.approved"),
        className:
          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      },
      REJECTED: {
        label: t("statuses.rejected"),
        className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      },
      CANCELED: {
        label: t("statuses.canceled"),
        className:
          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      },
    };

    const { label, className } = config[status];
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${className}`}
      >
        {label}
      </span>
    );
  };

  const getShiftLabel = (shift: string) => {
    return shift === "MORNING" ? t("shifts.morning") : t("shifts.afternoon");
  };

  const getTypeLabel = (type: string) => {
    return type === "ROOM" ? t("types.room") : t("types.hall");
  };

  const handleConfirm = () => {
    if (!confirmAction) return;

    if (confirmAction.type === "approve" && onApprove) {
      onApprove(confirmAction.id);
    } else if (confirmAction.type === "reject" && onReject) {
      onReject(confirmAction.id);
    }

    setConfirmAction(null);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("table.proctor")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("table.date")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("table.shift")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("table.type")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("table.status")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("table.notes")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("table.applied")}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("table.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
            {applications.map((application) => {
              const isPending = application.status === "PENDING";

              return (
                <tr
                  key={application.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {application.teacherName || t("table.unknown")}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {application.teacherCode || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {application.preferredDate
                      ? dateFnsFormat(
                          parseISO(application.preferredDate),
                          "MMM d, yyyy",
                          { locale: dateLocale }
                        )
                      : t("table.notSpecified")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {getShiftLabel(application.preferredShift)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {getTypeLabel(application.preferredType)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(application.status)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {application.notes || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {dateFnsFormat(parseISO(application.createdAt), "MMM d, yyyy", {
                      locale: dateLocale,
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {isPending && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setConfirmAction({ id: application.id, type: "approve" })
                          }
                          className="text-green-600 hover:text-green-700 hover:border-green-600"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          {t("buttons.approve")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setConfirmAction({ id: application.id, type: "reject" })
                          }
                          className="text-red-600 hover:text-red-700 hover:border-red-600"
                        >
                          <X className="h-4 w-4 mr-1" />
                          {t("buttons.reject")}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t dark:border-gray-800">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {t("table.showing", {
              from: (currentPage - 1) * pageSize + 1,
              to: Math.min(currentPage * pageSize, total),
              total,
            })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
            >
              {t("pagination.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              {t("pagination.next")}
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {confirmAction.type === "approve" ? t("confirm.approveTitle") : t("confirm.rejectTitle")}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {confirmAction.type === "approve" ? t("confirm.approveDescription") : t("confirm.rejectDescription")}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmAction(null)}
              >
                {t("buttons.cancel")}
              </Button>
              <Button
                onClick={handleConfirm}
                className={
                  confirmAction.type === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }
              >
                {confirmAction.type === "approve" ? t("buttons.approve") : t("buttons.reject")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
