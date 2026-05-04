"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { ProctorApplication } from "@/lib/api/proctor-applications";
import { Button } from "@/components/ui/button";
import { Check, Clock3, MapPin, ShieldCheck, UserRound, X, ArrowRightLeft } from "lucide-react";
import { format as dateFnsFormat, parseISO } from "date-fns";
import { enUS, vi } from "date-fns/locale";

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
  const locale = useLocale();
  const isVi = locale === "vi";
  const showActions = Boolean(onApprove || onReject);
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    type: "approve" | "reject";
  } | null>(null);

  const totalPages = Math.ceil(total / pageSize);
  const text = {
    status: {
      PENDING: isVi ? "Chờ phản hồi" : "Pending",
      APPROVED: isVi ? "Đã chấp nhận" : "Accepted",
      REJECTED: isVi ? "Đã từ chối" : "Declined",
      CANCELED: isVi ? "Đã hủy" : "Canceled",
    },
    shift: {
      MORNING: isVi ? "Sáng" : "Morning",
      AFTERNOON: isVi ? "Chiều" : "Afternoon",
    },
    type: {
      ROOM: isVi ? "Giám thị phòng" : "Room Proctor",
      HALL: isVi ? "Giám thị hành lang" : "Hall Invigilator",
    },
    requester: isVi ? "Người gửi" : "Requester",
    swapRoute: isVi ? "Lộ trình đổi" : "Swap Route",
    shiftLabel: isVi ? "Ca" : "Shift",
    typeLabel: isVi ? "Loại" : "Type",
    statusLabel: isVi ? "Trạng thái" : "Status",
    notes: isVi ? "Ghi chú" : "Notes",
    appliedAt: isVi ? "Thời gian gửi" : "Applied At",
    actions: isVi ? "Thao tác" : "Actions",
    loading: isVi ? "Đang tải đơn..." : "Loading applications...",
    emptyTitle: isVi ? "Không có đơn nào" : "No applications found",
    emptyDescription: isVi
      ? "Hãy thử thay đổi bộ lọc hoặc chờ yêu cầu đổi lịch mới."
      : "Try adjusting the filters or wait for new invigilator swap requests.",
    noTeacherCode: isVi ? "Không có mã giám thị" : "No teacher code",
    sourceSession: isVi ? "Ca nguồn" : "Source Session",
    swapTo: isVi ? "Đổi sang" : "Swap To",
    roomNotSelected: isVi ? "Chưa chọn phòng" : "Room not selected",
    targetRoomNotSelected: isVi ? "Chưa chọn phòng đích" : "Target room not selected",
    notSpecified: isVi ? "Chưa xác định" : "Not specified",
    noAdditionalNotes: isVi ? "Không có ghi chú thêm" : "No additional notes",
    submissionTime: isVi ? "Thời điểm nộp đơn" : "Submission time",
    noActionsAvailable: isVi ? "Không có thao tác" : "No actions available",
    showing: isVi ? "Hiển thị" : "Showing",
    to: isVi ? "đến" : "to",
    of: isVi ? "trên" : "of",
    applications: isVi ? "đơn" : "applications",
    previous: isVi ? "Trước" : "Previous",
    next: isVi ? "Sau" : "Next",
    approveDialogTitle: isVi ? "Chấp nhận đơn" : "Approve application",
    rejectDialogTitle: isVi ? "Từ chối đơn" : "Reject application",
    approveDialogDescription: isVi
      ? "Đơn này sẽ được đánh dấu là đã chấp nhận để khảo thí theo dõi."
      : "This request will be marked as approved for exam officer follow-up.",
    rejectDialogDescription: isVi
      ? "Đơn này sẽ được đánh dấu là đã từ chối và giám thị sẽ thấy kết quả."
      : "This request will be marked as rejected and the invigilator will see the result.",
    cancel: isVi ? "Hủy" : "Cancel",
    confirmApprove: isVi ? "Xác nhận chấp nhận" : "Confirm approve",
    confirmReject: isVi ? "Xác nhận từ chối" : "Confirm reject",
    approve: isVi ? "Chấp nhận" : "Approve",
    reject: isVi ? "Từ chối" : "Reject",
  };

  const getStatusBadge = (status: ProctorApplication["status"]) => {
    const config = {
      PENDING: {
        label: text.status.PENDING,
        className: "border-amber-200 bg-amber-50 text-amber-700",
      },
      APPROVED: {
        label: text.status.APPROVED,
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      },
      REJECTED: {
        label: text.status.REJECTED,
        className: "border-rose-200 bg-rose-50 text-rose-700",
      },
      CANCELED: {
        label: text.status.CANCELED,
        className: "border-slate-200 bg-slate-100 text-slate-600",
      },
    };

    const { label, className } = config[status];
    return (
      <span
        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${className}`}
      >
        {label}
      </span>
    );
  };

  const getShiftLabel = (shift: string) => {
    return shift === "MORNING" ? text.shift.MORNING : text.shift.AFTERNOON;
  };

  const getTypeLabel = (type: string) => {
    return type === "ROOM" ? text.type.ROOM : text.type.HALL;
  };

  const getUnknownAssigneeLabel = (type: string) => {
    return type === "ROOM"
      ? (isVi ? "Giám thị phòng chưa xác định" : "Unknown proctor")
      : (isVi ? "Giám thị hành lang chưa xác định" : "Unknown hall invigilator");
  };

  const getTargetAssigneeLabel = (type: string) => {
    return type === "ROOM"
      ? (isVi ? "Giám thị phòng đích" : "Target proctor")
      : (isVi ? "Giám thị hành lang đích" : "Target hall invigilator");
  };

  const formatAppliedAt = (createdAt: string) => {
    return dateFnsFormat(parseISO(createdAt), "dd/MM/yyyy | HH:mm", {
      locale: isVi ? vi : enUS,
    });
  };

  const getSessionSummary = (application: ProctorApplication) => {
    if (application.examOpenTime) {
      const openTime = new Date(application.examOpenTime);
      const closeTime = application.examCloseTime ? new Date(application.examCloseTime) : null;
      return {
        date: openTime.toLocaleDateString("vi-VN"),
        time: closeTime
          ? `${openTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${closeTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : openTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
    }

    if (application.preferredDate) {
        return {
        date: dateFnsFormat(parseISO(application.preferredDate), "dd/MM/yyyy", {
          locale: isVi ? vi : enUS,
        }),
        time: text.notSpecified,
      };
    }

    return {
      date: text.notSpecified,
      time: text.notSpecified,
    };
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

  if (isLoading) {
    return (
        <div className="flex items-center justify-center rounded-[1.5rem] border border-slate-200 bg-white py-16">
        <div className="text-sm font-semibold text-slate-500">{text.loading}</div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
        <p className="text-base font-bold text-slate-700">{text.emptyTitle}</p>
        <p className="mt-2 text-sm text-slate-500">
          {text.emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                {text.requester}
              </th>
              <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                {text.swapRoute}
              </th>
              <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                {text.shiftLabel}
              </th>
              <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                {text.typeLabel}
              </th>
              <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                {text.statusLabel}
              </th>
              <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                {text.notes}
              </th>
              <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                {text.appliedAt}
              </th>
              {showActions && (
                <th className="px-6 py-4 text-right text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                  {text.actions}
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {applications.map((application) => {
              const session = getSessionSummary(application);

              return (
                <tr
                  key={application.id}
                  className="transition-colors hover:bg-orange-50/40"
                >
                  <td className="px-6 py-5 align-top">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                        <UserRound className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-900">
                          {application.teacherName || getUnknownAssigneeLabel(application.preferredType)}
                        </p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {application.teacherCode || text.noTeacherCode}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-5 align-top">
                    <div className="space-y-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                          {text.sourceSession}
                        </div>
                        <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5">
                          <MapPin className="h-3.5 w-3.5 text-orange-600" />
                          <span className="text-sm font-bold text-orange-700">
                            {application.roomNumber ? `Room ${application.roomNumber}` : text.roomNotSelected}
                          </span>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-700">
                          {application.teacherName || getUnknownAssigneeLabel(application.preferredType)}
                          {application.teacherCode ? ` | ${application.teacherCode}` : ""}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <Clock3 className="h-4 w-4 text-slate-400" />
                          <span>{session.date}</span>
                          <span className="text-slate-300">|</span>
                          <span>{session.time}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        {text.swapTo}
                      </div>

                      <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3">
                        <div className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-1.5">
                          <MapPin className="h-3.5 w-3.5 text-blue-600" />
                          <span className="text-sm font-bold text-blue-700">
                            {application.targetRoomNumber ? `Room ${application.targetRoomNumber}` : text.targetRoomNotSelected}
                          </span>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-700">
                          {application.targetTeacherName || getTargetAssigneeLabel(application.preferredType)}
                          {application.targetTeacherCode ? ` | ${application.targetTeacherCode}` : ""}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <Clock3 className="h-4 w-4 text-slate-400" />
                          <span>
                            {application.targetExamOpenTime
                              ? new Date(application.targetExamOpenTime).toLocaleDateString("vi-VN")
                              : text.notSpecified}
                          </span>
                          <span className="text-slate-300">|</span>
                          <span>
                            {application.targetExamOpenTime
                              ? `${new Date(application.targetExamOpenTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${application.targetExamCloseTime ? new Date(application.targetExamCloseTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}`
                              : text.notSpecified}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-5 align-top">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {getShiftLabel(application.preferredShift)}
                    </span>
                  </td>

                  <td className="px-6 py-5 align-top">
                    <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {getTypeLabel(application.preferredType)}
                    </div>
                  </td>

                  <td className="px-6 py-5 align-top">
                    {getStatusBadge(application.status)}
                  </td>

                  <td className="px-6 py-5 align-top">
                    <p className="max-w-[240px] whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {application.notes || text.noAdditionalNotes}
                    </p>
                  </td>

                  <td className="px-6 py-5 align-top">
                    <div className="text-sm font-semibold text-slate-800">
                      {formatAppliedAt(application.createdAt)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {text.submissionTime}
                    </div>
                  </td>

                  {showActions && (
                    <td className="px-6 py-5 align-top">
                      {application.status === "PENDING" ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            setConfirmAction({ id: application.id, type: "approve" })
                          }
                          className="rounded-xl bg-emerald-600 px-4 text-white hover:bg-emerald-700"
                        >
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                          {text.approve}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            setConfirmAction({ id: application.id, type: "reject" })
                          }
                          className="rounded-xl bg-rose-600 px-4 text-white hover:bg-rose-700"
                        >
                          <X className="mr-1.5 h-3.5 w-3.5" />
                          {text.reject}
                        </Button>
                      </div>
                      ) : (
                        <div className="text-right text-xs font-semibold text-slate-400">
                          {text.noActionsAvailable}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="text-sm text-slate-500">
            {text.showing} {(currentPage - 1) * pageSize + 1} {text.to}{" "}
            {Math.min(currentPage * pageSize, total)} {text.of} {total} {text.applications}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
            >
              {text.previous}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              {text.next}
            </Button>
          </div>
        </div>
      )}

      {showActions && confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-black text-slate-900">
              {confirmAction.type === "approve" ? text.approveDialogTitle : text.rejectDialogTitle}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {confirmAction.type === "approve"
                ? text.approveDialogDescription
                : text.rejectDialogDescription}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setConfirmAction(null)}
              >
                {text.cancel}
              </Button>
              <Button
                className={`rounded-xl ${
                  confirmAction.type === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
                onClick={handleConfirm}
              >
                {confirmAction.type === "approve" ? text.confirmApprove : text.confirmReject}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
