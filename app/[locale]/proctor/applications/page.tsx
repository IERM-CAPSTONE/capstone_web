"use client";

import { useMemo, useState } from "react";
import { ArrowRightLeft, Check, Edit, Inbox, Plus, Send, X as XIcon } from "lucide-react";
import { format as dateFnsFormat, parseISO } from "date-fns";
import { enUS, vi } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { useExamSchedules } from "@/hooks/use-exam-schedules";
import {
  useCancelProctorApplication,
  useMyProctorApplications,
  useUpdateProctorApplicationStatus,
} from "@/hooks/use-proctor-applications";
import { ProctorApplicationFormModal } from "@/components/proctor-applications/proctor-application-form-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProctorApplication, UpdateProctorApplicationStatusData } from "@/lib/api/proctor-applications";
import { ExamSchedule } from "@/lib/api/exam-schedules";
import { AxiosError } from "axios";

const parseLocalDate = (dateStr: string | null): Date | null => {
  if (!dateStr) return null;

  let cleaned = dateStr.replace(/Z$/i, "").replace(/[+-]\d{2}:?\d{2}$/, "");
  cleaned = cleaned.replace("T", " ").trim();

  const match = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):?(\d{2})?/);
  if (!match) return null;

  const [, y, mo, d, h, mi, s] = match;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s || 0));
  return Number.isNaN(date.getTime()) ? null : date;
};

interface HallSessionCluster {
  key: string;
  hallInvigilatorId: string;
  hallInvigilatorName: string | null;
  examOpenTime: string | null;
  examCloseTime: string | null;
  rooms: string[];
  sessions: ExamSchedule[];
}

const formatSessionDate = (openTime: string | null, locale: string) => {
  const openDate = parseLocalDate(openTime);
  return openDate ? dateFnsFormat(openDate, locale === "vi" ? "dd/MM/yyyy" : "MM/dd/yyyy") : "-";
};

const formatSessionTimeRange = (openTime: string | null, closeTime: string | null) => {
  const openDate = parseLocalDate(openTime);
  const closeDate = parseLocalDate(closeTime);
  if (!openDate) return "-";
  return `${dateFnsFormat(openDate, "HH:mm")} - ${closeDate ? dateFnsFormat(closeDate, "HH:mm") : "-"}`;
};

const compareRooms = (left: string, right: string) =>
  left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });

const buildHallClusterKey = (hallInvigilatorId: string, examOpenTime: string | null, examCloseTime: string | null) =>
  [hallInvigilatorId, examOpenTime || "", examCloseTime || ""].join("|");

const buildHallClusterMap = (sessions: ExamSchedule[]) => {
  const clusters = new Map<string, HallSessionCluster>();

  sessions.forEach((session) => {
    if (!session.hallInvigilatorId || !session.roomNumber || !session.examOpenTime) return;

    const key = buildHallClusterKey(session.hallInvigilatorId, session.examOpenTime, session.examCloseTime);
    const current = clusters.get(key);

    if (current) {
      current.sessions.push(session);
      current.rooms.push(session.roomNumber);
      current.rooms.sort(compareRooms);
      return;
    }

    clusters.set(key, {
      key,
      hallInvigilatorId: session.hallInvigilatorId,
      hallInvigilatorName: session.hallInvigilatorName || null,
      examOpenTime: session.examOpenTime,
      examCloseTime: session.examCloseTime,
      rooms: [session.roomNumber],
      sessions: [session],
    });
  });

  return clusters;
};

export default function ProctorApplicationsPage() {
  const t = useTranslations("ProctorSwap");
  const locale = useLocale();
  const { user } = useAuth();
  const isHallInvigilator = user?.role === "hall_invigilator";
  const otherInvigilatorLabel =
    locale === "vi"
      ? isHallInvigilator
        ? "giám thị hành lang khác"
        : "giám thị khác"
      : isHallInvigilator
        ? "another hall invigilator"
        : "another proctor";
  const { data: applications = [], isLoading } = useMyProctorApplications();
  const { data: examSchedulesResponse } = useExamSchedules(
    {
      page: 1,
      limit: 5000,
      campus: user?.campus || undefined,
    },
    { enabled: Boolean(isHallInvigilator && user?.campus) }
  );
  const cancelApplication = useCancelProctorApplication();
  const respondToApplication = useUpdateProctorApplicationStatus();
  const [showForm, setShowForm] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ProctorApplication | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [declineApplication, setDeclineApplication] = useState<ProctorApplication | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declineError, setDeclineError] = useState("");

  const visibleApplications = applications.filter((application) => application.status !== "CANCELED");
  const hallClusterMap = useMemo(
    () => buildHallClusterMap(examSchedulesResponse?.data || []),
    [examSchedulesResponse?.data]
  );

  const { outgoingRequests, incomingRequests } = useMemo(() => {
    return {
      outgoingRequests: visibleApplications.filter((item) => item.teacherId === user?.id),
      incomingRequests: visibleApplications.filter((item) => item.targetTeacherId === user?.id),
    };
  }, [visibleApplications, user?.id]);

  const getStatusBadge = (status: ProctorApplication["status"]) => {
    const config = {
      PENDING: {
        label: t("status.pending"),
        className: "bg-yellow-100 text-yellow-700",
      },
      APPROVED: {
        label: t("status.accepted"),
        className: "bg-green-100 text-green-700",
      },
      REJECTED: {
        label: t("status.declined"),
        className: "bg-red-100 text-red-700",
      },
      CANCELED: {
        label: t("status.canceled"),
        className: "bg-gray-100 text-gray-700",
      },
    };

    const item = config[status];
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${item.className}`}>
        {item.label}
      </span>
    );
  };

  const formatSession = (room: string | null, openTime: string | null, closeTime: string | null) => {
    if (!openTime) return t("sessionNotAvailable");
    const open = parseLocalDate(openTime);
    const close = parseLocalDate(closeTime);
    if (!open) return t("sessionNotAvailable");
    return t("sessionFormat", {
      room: room || t("roomTba"),
      date: dateFnsFormat(open, locale === "vi" ? "dd/MM/yyyy" : "MM/dd/yyyy"),
      time: `${dateFnsFormat(open, "HH:mm")} - ${close ? dateFnsFormat(close, "HH:mm") : "-"}`,
    });
  };

  const formatHallClusterSession = (
    application: ProctorApplication,
    direction: "source" | "target"
  ) => {
    const ownerId = direction === "source" ? application.teacherId : application.targetTeacherId;
    const ownerName = direction === "source" ? application.teacherName : application.targetTeacherName;
    const openTime = direction === "source" ? application.examOpenTime : application.targetExamOpenTime;
    const closeTime = direction === "source" ? application.examCloseTime : application.targetExamCloseTime;

    if (!ownerId || !openTime) return t("sessionNotAvailable");

    const cluster = hallClusterMap.get(buildHallClusterKey(ownerId, openTime, closeTime));

    if (!cluster) {
      return formatSession(
        direction === "source" ? application.roomNumber : application.targetRoomNumber,
        openTime,
        closeTime
      );
    }

    const roomsLabel = cluster.rooms.join(", ");
    const dateLabel = formatSessionDate(cluster.examOpenTime, locale);
    const timeLabel = formatSessionTimeRange(cluster.examOpenTime, cluster.examCloseTime);
    const countLabel =
      locale === "vi"
        ? `${cluster.rooms.length} phòng`
        : `${cluster.rooms.length} rooms`;

    return `${roomsLabel} | ${dateLabel} | ${timeLabel} | ${countLabel}${ownerName ? ` | ${ownerName}` : ""}`;
  };

  const handleEdit = (application: ProctorApplication) => {
    setSelectedApplication(application);
    setShowForm(true);
  };

  const handleCreate = () => {
    setSelectedApplication(null);
    setShowForm(true);
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelApplication.mutateAsync(id);
      setConfirmCancel(null);
    } catch (error) {
      console.error("Error canceling application:", error);
    }
  };

  const handleRespond = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      await respondToApplication.mutateAsync({ id, data: { status } });
    } catch (error) {
      console.error("Error responding to swap request:", error);
    }
  };

  const handleOpenDeclineDialog = (application: ProctorApplication) => {
    setDeclineApplication(application);
    setDeclineReason("");
    setDeclineError("");
  };

  const handleDeclineSubmit = async () => {
    const trimmedReason = declineReason.trim();
    if (!declineApplication) return;

    if (!trimmedReason) {
      setDeclineError(t("declineDialog.reasonRequired"));
      return;
    }

    try {
      const data: UpdateProctorApplicationStatusData = {
        status: "REJECTED",
        responseNote: trimmedReason,
      };
      await respondToApplication.mutateAsync({ id: declineApplication.id, data });
      setDeclineApplication(null);
      setDeclineReason("");
      setDeclineError("");
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? ((error.response?.data as { message?: string })?.message || error.message)
          : error instanceof Error
            ? error.message
            : t("declineDialog.submitError");
      setDeclineError(message);
    }
  };

  const renderRequestCard = (application: ProctorApplication, direction: "incoming" | "outgoing") => {
    const isPending = application.status === "PENDING";

    return (
      <Card key={application.id} className="border-l-4 border-l-[#F37021] hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {direction === "incoming" ? <Inbox className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                {direction === "incoming" ? t("incomingBadge") : t("outgoingBadge")}
              </div>
              <CardTitle className="text-xl font-bold text-slate-900">
                {direction === "incoming"
                  ? t("incomingTitle", { name: application.teacherName || otherInvigilatorLabel })
                  : t("outgoingTitle", { name: application.targetTeacherName || otherInvigilatorLabel })}
              </CardTitle>
            </div>
            {getStatusBadge(application.status)}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr]">
            <div className="rounded-lg border bg-slate-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {direction === "incoming" ? t("theirCurrentSession") : t("yourCurrentSession")}
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-800">
                {isHallInvigilator
                  ? formatHallClusterSession(application, "source")
                  : formatSession(application.roomNumber, application.examOpenTime, application.examCloseTime)}
              </div>
            </div>

            <div className="flex items-center justify-center text-slate-400">
              <ArrowRightLeft className="h-5 w-5" />
            </div>

            <div className="rounded-lg border bg-orange-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                {direction === "incoming" ? t("yourTargetSession") : t("requestedTargetSession")}
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-800">
                {isHallInvigilator
                  ? formatHallClusterSession(application, "target")
                  : formatSession(application.targetRoomNumber, application.targetExamOpenTime, application.targetExamCloseTime)}
              </div>
            </div>
          </div>

          {application.notes && (
            <div className="rounded-lg border bg-white p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("reason")}</div>
              <p className="mt-2 text-sm text-slate-700">{application.notes}</p>
            </div>
          )}

          <div className="text-xs text-slate-500">
            {t("submittedLabel")}: {dateFnsFormat(parseISO(application.createdAt), locale === "vi" ? "dd/MM/yyyy | HH:mm" : "MMM d, yyyy | HH:mm", { locale: locale === "vi" ? vi : enUS })}
          </div>

          <div className="flex gap-2 pt-2">
            {direction === "outgoing" && isPending && (
              <>
                <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleEdit(application)}>
                  <Edit className="mr-1 h-3.5 w-3.5" />
                  {t("actions.edit")}
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-red-100 hover:bg-red-200 text-red-700"
                  onClick={() => setConfirmCancel(application.id)}
                >
                  <XIcon className="mr-1 h-3.5 w-3.5" />
                  {t("actions.cancel")}
                </Button>
              </>
            )}

            {direction === "incoming" && isPending && (
              <>
                <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleRespond(application.id, "APPROVED")}>
                  <Check className="mr-1 h-3.5 w-3.5" />
                  {t("actions.acceptSwap")}
                </Button>
                <Button size="sm" className="flex-1 bg-rose-600 hover:bg-rose-700 text-white" onClick={() => handleOpenDeclineDialog(application)}>
                  <XIcon className="mr-1 h-3.5 w-3.5" />
                  {t("actions.decline")}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("pageTitle")}</h1>
          <p className="mt-1 text-gray-600">
            {isHallInvigilator
              ? locale === "vi"
                ? "Gửi yêu cầu đổi ca giám thị hành lang với giám thị khác sau khi lịch thi đã được công bố."
                : "Request a hall invigilator swap with another invigilator after the exam schedule has been published."
              : t("pageDescription")}
          </p>
        </div>
        <Button onClick={handleCreate} className="bg-[#F37021] hover:bg-[#F37021]/90">
          <Plus className="mr-2 h-4 w-4" />
          {t("newSwapRequest")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">{t("loading")}</div>
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Send className="h-5 w-5 text-[#F37021]" />
              <h2 className="text-xl font-bold">{t("outgoingRequests")}</h2>
            </div>
            {outgoingRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-slate-500">
                  {t("emptyOutgoing")}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {outgoingRequests.map((application) => renderRequestCard(application, "outgoing"))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center gap-2">
              <Inbox className="h-5 w-5 text-[#F37021]" />
              <h2 className="text-xl font-bold">{t("incomingRequests")}</h2>
            </div>
            {incomingRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-slate-500">
                  {t("emptyIncoming")}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {incomingRequests.map((application) => renderRequestCard(application, "incoming"))}
              </div>
            )}
          </section>
        </div>
      )}

      {showForm && (
        <ProctorApplicationFormModal
          application={selectedApplication}
          existingApplications={applications}
          onClose={() => {
            setShowForm(false);
            setSelectedApplication(null);
          }}
        />
      )}

      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>{t("cancelDialog.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-gray-600">
                {t("cancelDialog.description")}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmCancel(null)}>
                  {t("cancelDialog.keep")}
                </Button>
                <Button onClick={() => handleCancel(confirmCancel)} className="bg-red-600 hover:bg-red-700">
                  {t("cancelDialog.confirm")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {declineApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <CardTitle>{t("declineDialog.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-gray-600">
                {t("declineDialog.description")}
              </p>
              <textarea
                value={declineReason}
                onChange={(e) => {
                  setDeclineReason(e.target.value);
                  if (declineError) setDeclineError("");
                }}
                placeholder={t("declineDialog.reasonPlaceholder")}
                className="min-h-[140px] w-full rounded-md border px-3 py-2 text-sm"
                disabled={respondToApplication.isPending}
              />
              {declineError && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {declineError}
                </div>
              )}
              <div className="mt-6 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeclineApplication(null);
                    setDeclineReason("");
                    setDeclineError("");
                  }}
                  disabled={respondToApplication.isPending}
                >
                  {t("declineDialog.cancel")}
                </Button>
                <Button
                  onClick={handleDeclineSubmit}
                  className="bg-rose-600 hover:bg-rose-700"
                  disabled={respondToApplication.isPending}
                >
                  {respondToApplication.isPending ? t("declineDialog.submitting") : t("declineDialog.confirm")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
