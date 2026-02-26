"use client";

import { useState } from "react";
import { ProctorApplication } from "@/lib/api/proctor-applications";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { format as dateFnsFormat, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";

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
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    type: "approve" | "reject";
  } | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500 mb-4">No applications found</p>
      </div>
    );
  }

  const getStatusBadge = (status: ProctorApplication["status"]) => {
    const config = {
      PENDING: {
        label: "Pending",
        className:
          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
      },
      APPROVED: {
        label: "Approved",
        className:
          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      },
      REJECTED: {
        label: "Rejected",
        className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      },
      CANCELED: {
        label: "Canceled",
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
    return shift === "MORNING" ? "Morning" : "Afternoon";
  };

  const getTypeLabel = (type: string) => {
    return type === "ROOM" ? "Room Proctor" : "Hall Invigilator";
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
                Proctor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Shift
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Notes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Applied
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
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
                      {application.teacherName || "Unknown"}
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
                          { locale: enUS }
                        )
                      : "Not specified"}
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
                      locale: enUS,
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
                          Approve
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
                          Reject
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
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, total)} of {total} results
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {confirmAction.type === "approve" ? "Approve" : "Reject"} Application
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to {confirmAction.type} this application?
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                className={
                  confirmAction.type === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }
              >
                {confirmAction.type === "approve" ? "Approve" : "Reject"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
