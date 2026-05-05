"use client";

import { useEffect, useMemo, useState } from "react";
import { AxiosError } from "axios";
import { format } from "date-fns";
import { Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { useExamSchedules } from "@/hooks/use-exam-schedules";
import {
  CreateProctorApplicationData,
  PreferredShift,
  PreferredType,
  ProctorApplication,
  UpdateProctorApplicationData,
} from "@/lib/api/proctor-applications";
import { ExamSchedule } from "@/lib/api/exam-schedules";
import { useCreateProctorApplication, useUpdateProctorApplication } from "@/hooks/use-proctor-applications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

const formatSessionDate = (openTime: string | null, locale: string) => {
  const openDate = parseLocalDate(openTime);
  return openDate ? format(openDate, locale === "vi" ? "dd/MM/yyyy" : "MM/dd/yyyy") : "-";
};

const formatSessionTimeRange = (openTime: string | null, closeTime: string | null) => {
  const openDate = parseLocalDate(openTime);
  const closeDate = parseLocalDate(closeTime);

  if (!openDate) return "-";
  return `${format(openDate, "HH:mm")} - ${closeDate ? format(closeDate, "HH:mm") : "-"}`;
};

const normalizeSearchValue = (value: string) =>
  value.toLowerCase().replace(/\s+/g, "").replace(/[:/|-]/g, "");

interface ProctorApplicationFormModalProps {
  application?: ProctorApplication | null;
  existingApplications?: ProctorApplication[];
  onClose: () => void;
  semester?: string;
}

interface HallSessionCluster {
  key: string;
  representativeSessionId: string;
  hallInvigilatorId: string;
  hallInvigilatorName: string | null;
  examOpenTime: string | null;
  examCloseTime: string | null;
  rooms: string[];
  sessions: ExamSchedule[];
}

const SWAP_CONFLICT_ERROR_MESSAGE = "One of the invigilators would have another overlapping session after this swap";

const compareRooms = (left: string, right: string) =>
  left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });

const buildHallClusterKey = (session: ExamSchedule) =>
  [
    session.hallInvigilatorId || "",
    formatSessionDate(session.examOpenTime, "vi"),
    formatSessionTimeRange(session.examOpenTime, session.examCloseTime),
  ].join("|");

const buildHallClusters = (sessions: ExamSchedule[]) => {
  const clusters = new Map<string, HallSessionCluster>();

  sessions.forEach((session) => {
    if (!session.hallInvigilatorId || !session.roomNumber || !session.examOpenTime) return;

    const key = buildHallClusterKey(session);
    const existing = clusters.get(key);

    if (existing) {
      existing.sessions.push(session);
      existing.rooms.push(session.roomNumber);
      existing.rooms.sort(compareRooms);

      const sortedSessions = [...existing.sessions].sort((a, b) =>
        compareRooms(a.roomNumber || "", b.roomNumber || "")
      );
      existing.representativeSessionId = sortedSessions[0]?.id || existing.representativeSessionId;
      return;
    }

    clusters.set(key, {
      key,
      representativeSessionId: session.id,
      hallInvigilatorId: session.hallInvigilatorId,
      hallInvigilatorName: session.hallInvigilatorName || null,
      examOpenTime: session.examOpenTime,
      examCloseTime: session.examCloseTime,
      rooms: [session.roomNumber],
      sessions: [session],
    });
  });

  return Array.from(clusters.values()).sort((a, b) => {
    const leftDate = parseLocalDate(a.examOpenTime);
    const rightDate = parseLocalDate(b.examOpenTime);
    return (leftDate?.getTime() || 0) - (rightDate?.getTime() || 0);
  });
};

export function ProctorApplicationFormModal({
  application,
  existingApplications = [],
  onClose,
  semester,
}: ProctorApplicationFormModalProps) {
  const t = useTranslations("ProctorSwap.modal");
  const locale = useLocale();
  const { user } = useAuth();
  const isHallInvigilator = user?.role === "hall_invigilator";
  const swapType: PreferredType = isHallInvigilator ? "HALL" : "ROOM";
  const assigneeNameLabel =
    locale === "vi"
      ? isHallInvigilator
        ? "Giám thị hành lang hiện tại"
        : "Giám thị phòng hiện tại"
      : isHallInvigilator
        ? "Current Hall Invigilator"
        : "Current Proctor";
  const fallbackAssigneeLabel =
    locale === "vi"
      ? isHallInvigilator
        ? "giám thị hành lang khác"
        : "giám thị khác"
      : isHallInvigilator
        ? "another hall invigilator"
        : "another proctor";
  const isEdit = !!application;
  const createApplication = useCreateProctorApplication();
  const updateApplication = useUpdateProctorApplication();
  const { data: mySessionsResponse, isLoading: mySessionsLoading } = useExamSchedules(
    {
      page: 1,
      limit: 1000,
      semester: semester || undefined,
      proctorId: isHallInvigilator ? undefined : user?.id || undefined,
      hallInvigilatorId: isHallInvigilator ? user?.id || undefined : undefined,
      campus: user?.campus || undefined,
    },
    { enabled: Boolean(user?.id) }
  );
  const { data: examSchedulesResponse, isLoading: allSessionsLoading } = useExamSchedules(
    {
      page: 1,
      limit: 5000,
      semester: semester || undefined,
      campus: user?.campus || undefined,
    }
  );
  const sessionsLoading = mySessionsLoading || allSessionsLoading;

  const examSessions = (examSchedulesResponse?.data || []).filter(
    (session) => session.examOpenTime && session.examCloseTime && session.roomNumber
  );
  const myAvailableSessions = (mySessionsResponse?.data || []).filter(
    (session) => session.examOpenTime && session.examCloseTime && session.roomNumber
  );

  const [formData, setFormData] = useState({
    examSessionId: application?.examSessionId || "",
    targetExamSessionId: application?.targetExamSessionId || "",
    preferredShift: (application?.preferredShift || "MORNING") as PreferredShift,
    preferredType: (application?.preferredType || swapType) as PreferredType,
    preferredDate: application?.preferredDate || "",
    notes: application?.notes || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [targetSearch, setTargetSearch] = useState("");

  const getLocalizedSubmitError = (message: string) => {
    if (message === SWAP_CONFLICT_ERROR_MESSAGE) {
      return t("errors.overlappingSwapSession");
    }

    return message;
  };

  useEffect(() => {
    if (application) {
      setFormData({
        examSessionId: application.examSessionId || "",
        targetExamSessionId: application.targetExamSessionId || "",
        preferredShift: application.preferredShift,
        preferredType: application.preferredType || swapType,
        preferredDate: application.preferredDate || "",
        notes: application.notes || "",
      });
    }
  }, [application, swapType]);

  const activeSwapRequests = useMemo(
    () =>
      existingApplications.filter(
        (item) =>
          item.id !== application?.id &&
          item.preferredType === swapType &&
          item.status === "PENDING"
      ),
    [application?.id, existingApplications, swapType]
  );

  const myAssignedSessions = useMemo(
    () =>
      myAvailableSessions.filter(
        (session) =>
          isHallInvigilator
            ? session.hallInvigilatorId === user?.id
            : session.proctorId === user?.id
      ),
    [isHallInvigilator, myAvailableSessions, user?.id]
  );

  const myAssignedClusters = useMemo(
    () => (isHallInvigilator ? buildHallClusters(myAssignedSessions) : []),
    [isHallInvigilator, myAssignedSessions]
  );

  const selectedSourceCluster = useMemo(
    () =>
      isHallInvigilator
        ? myAssignedClusters.find(
            (cluster) =>
              cluster.representativeSessionId === formData.examSessionId ||
              cluster.sessions.some((session) => session.id === formData.examSessionId)
          ) || null
        : null,
    [formData.examSessionId, isHallInvigilator, myAssignedClusters]
  );

  const selectedSourceSession = useMemo(
    () =>
      isHallInvigilator
        ? selectedSourceCluster?.sessions[0] || null
        : myAssignedSessions.find((session) => session.id === formData.examSessionId) || null,
    [formData.examSessionId, isHallInvigilator, myAssignedSessions, selectedSourceCluster]
  );

  const candidateTargetSessions = useMemo(() => {
    if (!selectedSourceSession) return [];

    return examSessions.filter((session) => {
      const targetAssigneeId = isHallInvigilator ? session.hallInvigilatorId : session.proctorId;
      const targetAssigneeName = isHallInvigilator ? session.hallInvigilatorName : session.proctorName;

      if (!targetAssigneeId || targetAssigneeId === user?.id) return false;
      if (session.id === selectedSourceSession.id) return false;

      if (isHallInvigilator) return true;

      const searchValue = targetSearch.trim().toLowerCase();
      const compactSearchValue = normalizeSearchValue(targetSearch.trim());
      const sessionDate = formatSessionDate(session.examOpenTime, locale);
      const sessionTimeRange = formatSessionTimeRange(session.examOpenTime, session.examCloseTime);
      const searchCandidates = [
        session.roomNumber || "",
        targetAssigneeName || "",
        sessionDate,
        sessionTimeRange,
        `${sessionDate} ${sessionTimeRange}`,
      ];

      return (
        !searchValue ||
        searchCandidates.some((candidate) => candidate.toLowerCase().includes(searchValue)) ||
        searchCandidates.some((candidate) => normalizeSearchValue(candidate).includes(compactSearchValue))
      );
    });
  }, [examSessions, isHallInvigilator, locale, selectedSourceSession, targetSearch, user?.id]);

  const candidateTargetClusters = useMemo(() => {
    if (!isHallInvigilator || !selectedSourceSession) return [];

    const searchValue = targetSearch.trim().toLowerCase();
    const compactSearchValue = normalizeSearchValue(targetSearch.trim());

    return buildHallClusters(candidateTargetSessions).filter((cluster) => {
      const clusterDate = formatSessionDate(cluster.examOpenTime, locale);
      const clusterTimeRange = formatSessionTimeRange(cluster.examOpenTime, cluster.examCloseTime);
      const searchCandidates = [
        cluster.hallInvigilatorName || "",
        cluster.rooms.join(", "),
        clusterDate,
        clusterTimeRange,
        `${clusterDate} ${clusterTimeRange}`,
        `${cluster.rooms.length} ${locale === "vi" ? "phòng" : "rooms"}`,
      ];

      return (
        !searchValue ||
        searchCandidates.some((candidate) => candidate.toLowerCase().includes(searchValue)) ||
        searchCandidates.some((candidate) => normalizeSearchValue(candidate).includes(compactSearchValue))
      );
    });
  }, [candidateTargetSessions, isHallInvigilator, locale, selectedSourceSession, targetSearch]);

  const selectedTargetSession = useMemo(
    () =>
      isHallInvigilator
        ? candidateTargetClusters.find(
            (cluster) =>
              cluster.representativeSessionId === formData.targetExamSessionId ||
              cluster.sessions.some((session) => session.id === formData.targetExamSessionId)
          )?.sessions[0]
          || examSessions.find((session) => session.id === formData.targetExamSessionId)
          || null
        : candidateTargetSessions.find((session) => session.id === formData.targetExamSessionId)
          || examSessions.find((session) => session.id === formData.targetExamSessionId)
          || null,
    [candidateTargetClusters, candidateTargetSessions, examSessions, formData.targetExamSessionId, isHallInvigilator]
  );

  const getDuplicateReason = (targetSession: ExamSchedule) => {
    return activeSwapRequests.find((item) => {
      const sameDirection =
        item.examSessionId === formData.examSessionId &&
        item.targetExamSessionId === targetSession.id;
      const reverseDirection =
        item.examSessionId === targetSession.id &&
        item.targetExamSessionId === formData.examSessionId;

      return sameDirection || reverseDirection;
    });
  };

  const handleSourceSessionChange = (sourceSessionId: string) => {
    const sourceSession = isHallInvigilator
      ? myAssignedClusters.find((cluster) => cluster.representativeSessionId === sourceSessionId)?.sessions[0]
      : myAssignedSessions.find((session) => session.id === sourceSessionId);
    const sourceOpenDate = parseLocalDate(sourceSession?.examOpenTime || null);
    const preferredShift =
      sourceOpenDate && sourceOpenDate.getHours() < 12
        ? "MORNING"
        : "AFTERNOON";

    setFormData((current) => ({
      ...current,
      examSessionId: sourceSessionId,
      targetExamSessionId: "",
      preferredShift,
      preferredType: swapType,
      preferredDate: sourceSession?.examOpenTime || "",
    }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.examSessionId) {
      nextErrors.examSessionId = t("errors.chooseCurrentSession");
    }

    if (!formData.targetExamSessionId) {
      nextErrors.targetExamSessionId = t("errors.chooseTargetSession");
    }

    if (formData.examSessionId && formData.targetExamSessionId) {
      const duplicateRequest = activeSwapRequests.find((item) => {
        const sameDirection =
          item.examSessionId === formData.examSessionId &&
          item.targetExamSessionId === formData.targetExamSessionId;
        const reverseDirection =
          item.examSessionId === formData.targetExamSessionId &&
          item.targetExamSessionId === formData.examSessionId;

        return sameDirection || reverseDirection;
      });

      if (duplicateRequest) {
        nextErrors.targetExamSessionId = t("errors.duplicatePair");
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!validate()) return;

    try {
      if (isEdit && application) {
        const payload: UpdateProctorApplicationData = {
          examSessionId: formData.examSessionId,
          targetExamSessionId: formData.targetExamSessionId,
          preferredShift: formData.preferredShift,
          preferredType: swapType,
          preferredDate: formData.preferredDate || null,
          notes: formData.notes || null,
        };
        await updateApplication.mutateAsync({ id: application.id, data: payload });
      } else {
        const payload: CreateProctorApplicationData = {
          examSessionId: formData.examSessionId,
          targetExamSessionId: formData.targetExamSessionId,
          preferredShift: formData.preferredShift,
          preferredType: swapType,
          preferredDate: formData.preferredDate || null,
          notes: formData.notes || null,
        };
        await createApplication.mutateAsync(payload);
      }
      onClose();
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? ((error.response?.data as { message?: string })?.message || error.message)
          : error instanceof Error
            ? error.message
            : t("errors.saveFailed");
      setSubmitError(getLocalizedSubmitError(message));
    }
  };

  const isSubmitting = createApplication.isPending || updateApplication.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{isEdit ? t("titleEdit") : t("titleCreate")}</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              {t("description")}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <label className="block text-sm font-semibold">
                  {isHallInvigilator
                    ? (locale === "vi" ? "Cụm phòng hiện tại của bạn" : "Your Current Room Cluster")
                    : t("yourCurrentSession")} *
                </label>
                <select
                  value={formData.examSessionId}
                  onChange={(e) => handleSourceSessionChange(e.target.value)}
                  disabled={isSubmitting || sessionsLoading}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">{t("selectAssignedSession")}</option>
                  {isHallInvigilator
                    ? myAssignedClusters.map((cluster) => (
                        <option key={cluster.key} value={cluster.representativeSessionId}>
                          {formatSessionDate(cluster.examOpenTime, locale)} | {formatSessionTimeRange(cluster.examOpenTime, cluster.examCloseTime)} | {cluster.rooms.length} {locale === "vi" ? "phòng" : "rooms"}
                        </option>
                      ))
                    : myAssignedSessions.map((session) => (
                        <option key={session.id} value={session.id}>
                          {session.roomNumber} | {formatSessionDate(session.examOpenTime, locale)} | {formatSessionTimeRange(session.examOpenTime, session.examCloseTime)}
                        </option>
                      ))}
                </select>
                {errors.examSessionId && <p className="text-sm text-red-500">{errors.examSessionId}</p>}
                {!sessionsLoading && (isHallInvigilator ? myAssignedClusters.length === 0 : myAssignedSessions.length === 0) && (
                  <p className="text-sm text-amber-600">
                    {t("emptyAssignedSessions")}
                  </p>
                )}

                {selectedSourceSession && (
                  <div className="rounded-lg border bg-slate-50 p-4 text-sm">
                    <div className="font-semibold text-slate-800">
                      {isHallInvigilator
                        ? (locale === "vi" ? "Cụm phòng hiện tại của bạn" : "Your current room cluster")
                        : t("yourAssignedRoom")}
                    </div>
                    <div className="mt-1 text-slate-600">
                      {isHallInvigilator && selectedSourceCluster
                        ? `${selectedSourceCluster.rooms.join(", ")} | ${formatSessionDate(selectedSourceCluster.examOpenTime, locale)} | ${formatSessionTimeRange(selectedSourceCluster.examOpenTime, selectedSourceCluster.examCloseTime)}`
                        : `${t("roomLabel", { room: selectedSourceSession.roomNumber || "-" })} | ${formatSessionDate(selectedSourceSession.examOpenTime, locale)} | ${formatSessionTimeRange(selectedSourceSession.examOpenTime, selectedSourceSession.examCloseTime)}`}
                    </div>
                    {isHallInvigilator && selectedSourceCluster && (
                      <div className="mt-2 text-xs font-medium text-slate-500">
                        {locale === "vi"
                          ? `${selectedSourceCluster.rooms.length} phòng: ${selectedSourceCluster.rooms.join(", ")}`
                          : `${selectedSourceCluster.rooms.length} rooms: ${selectedSourceCluster.rooms.join(", ")}`}
                      </div>
                    )}
                  </div>
                )}

                {isHallInvigilator && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <span className="font-semibold">
                      {locale === "vi" ? "Lưu ý:" : "Note:"}
                    </span>{" "}
                    {locale === "vi"
                      ? "Đơn đổi lịch của giám thị hành lang sẽ áp dụng cho toàn bộ cụm phòng bạn đang phụ trách trong khung giờ này."
                      : "Hall invigilator swap requests apply to the entire room cluster you are responsible for in this time slot."}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-semibold">{t("swapNote")}</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((current) => ({ ...current, notes: e.target.value }))}
                  disabled={isSubmitting}
                  className="min-h-[146px] w-full rounded-md border px-3 py-2 text-sm"
                  placeholder={t("swapNotePlaceholder")}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="block text-sm font-semibold">
                  {isHallInvigilator
                    ? (locale === "vi" ? "Chọn cụm phòng của giám thị muốn đổi" : "Choose Target Hall Invigilator Cluster")
                    : t("chooseTargetSession")} *
                </label>
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={targetSearch}
                    onChange={(e) => setTargetSearch(e.target.value)}
                    placeholder={t("searchPlaceholder")}
                    className="w-full rounded-md border py-2 pl-9 pr-3 text-sm"
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left">
                        {isHallInvigilator
                          ? (locale === "vi" ? "Cụm phòng" : "Room Cluster")
                          : t("table.room")}
                      </th>
                      <th className="px-3 py-2 text-left">{assigneeNameLabel}</th>
                      <th className="px-3 py-2 text-left">{t("table.time")}</th>
                      <th className="px-3 py-2 text-left">{t("table.action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(isHallInvigilator ? candidateTargetClusters : candidateTargetSessions).map((item) => {
                      const session = isHallInvigilator
                        ? (item as HallSessionCluster).sessions[0]
                        : (item as ExamSchedule);
                      const cluster = isHallInvigilator ? (item as HallSessionCluster) : null;
                      const targetId = cluster?.representativeSessionId || session.id;
                      const duplicateRequest = getDuplicateReason(session);

                      return (
                        <tr
                          key={cluster?.key || session.id}
                          className={`border-t ${duplicateRequest ? "bg-amber-50" : "hover:bg-blue-50 cursor-pointer"} ${formData.targetExamSessionId === targetId ? "bg-blue-100" : ""}`}
                          onClick={() => {
                            if (!duplicateRequest) {
                              setFormData((current) => ({ ...current, targetExamSessionId: targetId }));
                            }
                          }}
                        >
                          <td className="px-3 py-2 font-medium">
                            {cluster
                              ? (
                                <div>
                                  <div>{cluster.rooms.join(", ")}</div>
                                  <div className="mt-1 text-xs font-medium text-slate-500">
                                    {locale === "vi" ? `${cluster.rooms.length} phòng` : `${cluster.rooms.length} rooms`}
                                  </div>
                                </div>
                              )
                              : t("roomLabel", { room: session.roomNumber || "-" })}
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-700">
                              {(isHallInvigilator ? session.hallInvigilatorName : session.proctorName) || fallbackAssigneeLabel}
                            </div>
                            {duplicateRequest && (
                              <div className="mt-1 text-xs text-amber-700">
                                {t("duplicateHint")}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {formatSessionDate(session.examOpenTime, locale)} | {formatSessionTimeRange(session.examOpenTime, session.examCloseTime)}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="radio"
                              checked={formData.targetExamSessionId === targetId}
                              disabled={Boolean(duplicateRequest)}
                              onChange={() => setFormData((current) => ({ ...current, targetExamSessionId: targetId }))}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {selectedSourceSession && (isHallInvigilator ? candidateTargetClusters.length === 0 : candidateTargetSessions.length === 0) && (
                  <div className="p-4 text-center text-sm text-slate-500">
                    {t("emptyTargetSessions")}
                  </div>
                )}
              </div>
              {errors.targetExamSessionId && <p className="text-sm text-red-500">{errors.targetExamSessionId}</p>}
              <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                {t("contactExamOfficeNote")}
              </div>
            </div>

            {selectedTargetSession && (
                  <div className="rounded-lg border bg-emerald-50 p-4 text-sm text-emerald-900">
                {isHallInvigilator
                  ? (() => {
                      const targetCluster = candidateTargetClusters.find(
                        (cluster) =>
                          cluster.representativeSessionId === formData.targetExamSessionId ||
                          cluster.sessions.some((session) => session.id === formData.targetExamSessionId)
                      );

                      return locale === "vi"
                        ? `Bạn đang chọn cụm ${targetCluster?.rooms.join(", ") || "-"} của ${(selectedTargetSession.hallInvigilatorName || fallbackAssigneeLabel)}.`
                        : `You are selecting the cluster ${targetCluster?.rooms.join(", ") || "-"} managed by ${(selectedTargetSession.hallInvigilatorName || fallbackAssigneeLabel)}.`;
                    })()
                  : t("swapTargetSummary", {
                      room: selectedTargetSession.roomNumber || "-",
                      proctor:
                        (isHallInvigilator ? selectedTargetSession.hallInvigilatorName : selectedTargetSession.proctorName)
                        || fallbackAssigneeLabel,
                    })}
              </div>
            )}

            {submitError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting || !selectedSourceSession}>
                {isSubmitting ? t("saving") : isEdit ? t("updateSwapRequest") : t("sendSwapRequest")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
