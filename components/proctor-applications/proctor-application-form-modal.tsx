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

const isSameExamDay = (left: string | null, right: string | null) => {
  const leftDate = parseLocalDate(left);
  const rightDate = parseLocalDate(right);

  if (!leftDate || !rightDate) return false;
  return format(leftDate, "yyyy-MM-dd") === format(rightDate, "yyyy-MM-dd");
};

interface ProctorApplicationFormModalProps {
  application?: ProctorApplication | null;
  existingApplications?: ProctorApplication[];
  onClose: () => void;
  semester?: string;
}

export function ProctorApplicationFormModal({
  application,
  existingApplications = [],
  onClose,
  semester,
}: ProctorApplicationFormModalProps) {
  const t = useTranslations("ProctorSwap.modal");
  const locale = useLocale();
  const { user } = useAuth();
  const isEdit = !!application;
  const createApplication = useCreateProctorApplication();
  const updateApplication = useUpdateProctorApplication();
  const { data: mySessionsResponse, isLoading: mySessionsLoading } = useExamSchedules(
    {
      page: 1,
      limit: 1000,
      semester: semester || undefined,
      proctorId: user?.id || undefined,
      campus: user?.campus || undefined,
    } as any,
    { enabled: Boolean(user?.id) }
  );
  const { data: examSchedulesResponse, isLoading: allSessionsLoading } = useExamSchedules(
    {
      page: 1,
      limit: 5000,
      semester: semester || undefined,
      campus: user?.campus || undefined,
    } as any
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
    preferredType: "ROOM" as PreferredType,
    preferredDate: application?.preferredDate || "",
    notes: application?.notes || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [targetSearch, setTargetSearch] = useState("");

  useEffect(() => {
    if (application) {
      setFormData({
        examSessionId: application.examSessionId || "",
        targetExamSessionId: application.targetExamSessionId || "",
        preferredShift: application.preferredShift,
        preferredType: "ROOM",
        preferredDate: application.preferredDate || "",
        notes: application.notes || "",
      });
    }
  }, [application]);

  const activeSwapRequests = useMemo(
    () =>
      existingApplications.filter(
        (item) =>
          item.id !== application?.id &&
          item.status === "PENDING"
      ),
    [application?.id, existingApplications]
  );

  const myAssignedSessions = useMemo(
    () =>
      myAvailableSessions.filter(
        (session) => session.proctorId === user?.id
      ),
    [myAvailableSessions, user?.id]
  );

  const selectedSourceSession = useMemo(
    () => myAssignedSessions.find((session) => session.id === formData.examSessionId) || null,
    [formData.examSessionId, myAssignedSessions]
  );

  const candidateTargetSessions = useMemo(() => {
    if (!selectedSourceSession) return [];

    return examSessions.filter((session) => {
      if (!session.proctorId || session.proctorId === user?.id) return false;
      if (session.id === selectedSourceSession.id) return false;
      if (!isSameExamDay(session.examOpenTime, selectedSourceSession.examOpenTime)) return false;

      const matchesSearch =
        !targetSearch ||
        session.roomNumber?.toLowerCase().includes(targetSearch.toLowerCase()) ||
        session.proctorName?.toLowerCase().includes(targetSearch.toLowerCase());

      return matchesSearch;
    });
  }, [examSessions, selectedSourceSession, targetSearch, user?.id]);

  const selectedTargetSession = useMemo(
    () => candidateTargetSessions.find((session) => session.id === formData.targetExamSessionId)
      || examSessions.find((session) => session.id === formData.targetExamSessionId)
      || null,
    [candidateTargetSessions, examSessions, formData.targetExamSessionId]
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
    const sourceSession = myAssignedSessions.find((session) => session.id === sourceSessionId);
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
          preferredType: "ROOM",
          preferredDate: formData.preferredDate || null,
          notes: formData.notes || null,
        };
        await updateApplication.mutateAsync({ id: application.id, data: payload });
      } else {
        const payload: CreateProctorApplicationData = {
          examSessionId: formData.examSessionId,
          targetExamSessionId: formData.targetExamSessionId,
          preferredShift: formData.preferredShift,
          preferredType: "ROOM",
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
      setSubmitError(message);
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
                <label className="block text-sm font-semibold">{t("yourCurrentSession")} *</label>
                <select
                  value={formData.examSessionId}
                  onChange={(e) => handleSourceSessionChange(e.target.value)}
                  disabled={isSubmitting || sessionsLoading}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">{t("selectAssignedSession")}</option>
                  {myAssignedSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.roomNumber} | {formatSessionDate(session.examOpenTime, locale)} | {formatSessionTimeRange(session.examOpenTime, session.examCloseTime)}
                    </option>
                  ))}
                </select>
                {errors.examSessionId && <p className="text-sm text-red-500">{errors.examSessionId}</p>}
                {!sessionsLoading && myAssignedSessions.length === 0 && (
                  <p className="text-sm text-amber-600">
                    {t("emptyAssignedSessions")}
                  </p>
                )}

                {selectedSourceSession && (
                  <div className="rounded-lg border bg-slate-50 p-4 text-sm">
                    <div className="font-semibold text-slate-800">{t("yourAssignedRoom")}</div>
                    <div className="mt-1 text-slate-600">
                      {t("roomLabel", { room: selectedSourceSession.roomNumber || "-" })} | {formatSessionDate(selectedSourceSession.examOpenTime, locale)} | {formatSessionTimeRange(selectedSourceSession.examOpenTime, selectedSourceSession.examCloseTime)}
                    </div>
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
                <label className="block text-sm font-semibold">{t("chooseTargetSession")} *</label>
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
                      <th className="px-3 py-2 text-left">{t("table.room")}</th>
                      <th className="px-3 py-2 text-left">{t("table.currentProctor")}</th>
                      <th className="px-3 py-2 text-left">{t("table.time")}</th>
                      <th className="px-3 py-2 text-left">{t("table.action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidateTargetSessions.map((session) => {
                      const duplicateRequest = getDuplicateReason(session);
                      return (
                        <tr
                          key={session.id}
                          className={`border-t ${duplicateRequest ? "bg-amber-50" : "hover:bg-blue-50 cursor-pointer"} ${formData.targetExamSessionId === session.id ? "bg-blue-100" : ""}`}
                          onClick={() => {
                            if (!duplicateRequest) {
                              setFormData((current) => ({ ...current, targetExamSessionId: session.id }));
                            }
                          }}
                        >
                          <td className="px-3 py-2 font-medium">{t("roomLabel", { room: session.roomNumber || "-" })}</td>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-700">{session.proctorName || t("assignedProctor")}</div>
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
                              checked={formData.targetExamSessionId === session.id}
                              disabled={Boolean(duplicateRequest)}
                              onChange={() => setFormData((current) => ({ ...current, targetExamSessionId: session.id }))}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {selectedSourceSession && candidateTargetSessions.length === 0 && (
                  <div className="p-4 text-center text-sm text-slate-500">
                    {t("emptyTargetSessions")}
                  </div>
                )}
              </div>
              {errors.targetExamSessionId && <p className="text-sm text-red-500">{errors.targetExamSessionId}</p>}
            </div>

            {selectedTargetSession && (
              <div className="rounded-lg border bg-emerald-50 p-4 text-sm text-emerald-900">
                {t("swapTargetSummary", {
                  room: selectedTargetSession.roomNumber || "-",
                  proctor: selectedTargetSession.proctorName || t("anotherProctor"),
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
