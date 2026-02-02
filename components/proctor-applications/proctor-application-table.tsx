"use client";

import { ProctorApplication } from "@/lib/api/proctor-applications";
import { Button } from "@/components/ui/button";
import { Edit, XCircle } from "lucide-react";
import { format as dateFnsFormat, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";

interface ProctorApplicationTableProps {
  applications: ProctorApplication[];
  onEdit?: (application: ProctorApplication) => void;
  onCancel?: (id: string) => void;
  isLoading?: boolean;
}

export function ProctorApplicationTable({
  applications,
  onEdit,
  onCancel,
  isLoading,
}: ProctorApplicationTableProps) {
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
        <p className="text-gray-500 mb-4">No applications yet</p>
      </div>
    );
  }

  const getStatusBadge = (status: ProctorApplication["status"]) => {
    const config = {
      PENDING: {
        label: "Pending",
        className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
      },
      APPROVED: {
        label: "Approved",
        className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      },
      REJECTED: {
        label: "Rejected",
        className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      },
      CANCELED: {
        label: "Canceled",
        className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/50">
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
              Created
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
          {applications.map((application) => {
            const canEdit = application.status === "PENDING";
            const canCancel =
              application.status === "PENDING" ||
              application.status === "APPROVED";

            return (
              <tr
                key={application.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {application.preferredDate
                    ? dateFnsFormat(parseISO(application.preferredDate), "MMM d, yyyy", {
                        locale: enUS,
                      })
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
                  <div className="flex items-center justify-end gap-2">
                    {canEdit && onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(application)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                    {canCancel && onCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCancel(application.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
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
