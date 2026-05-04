"use client";

import { useMemo, useState } from "react";
import { ArrowRightLeft, Check, Edit, Inbox, Plus, Send, X as XIcon } from "lucide-react";
import { format as dateFnsFormat, parseISO } from "date-fns";
import { enUS, vi } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import {
  useCancelProctorApplication,
  useMyProctorApplications,
  useUpdateProctorApplicationStatus,
} from "@/hooks/use-proctor-applications";
import { ProctorApplicationFormModal } from "@/components/proctor-applications/proctor-application-form-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProctorApplication } from "@/lib/api/proctor-applications";

export default function ProctorApplicationsPage() {
  const t = useTranslations("ProctorSwap");
  const locale = useLocale();
  const { user } = useAuth();
  const { data: applications = [], isLoading } = useMyProctorApplications();
  const cancelApplication = useCancelProctorApplication();
  const respondToApplication = useUpdateProctorApplicationStatus();
  const [showForm, setShowForm] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ProctorApplication | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  const visibleApplications = applications.filter((application) => application.status !== "CANCELED");

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
    const open = parseISO(openTime);
    const close = closeTime ? parseISO(closeTime) : null;
    return t("sessionFormat", {
      room: room || t("roomTba"),
      date: dateFnsFormat(open, locale === "vi" ? "dd/MM/yyyy" : "MM/dd/yyyy"),
      time: `${dateFnsFormat(open, "HH:mm")} - ${close ? dateFnsFormat(close, "HH:mm") : "-"}`,
    });
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
                  ? t("incomingTitle", { name: application.teacherName || t("anotherProctor") })
                  : t("outgoingTitle", { name: application.targetTeacherName || t("anotherProctorLower") })}
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
                {formatSession(application.roomNumber, application.examOpenTime, application.examCloseTime)}
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
                {formatSession(application.targetRoomNumber, application.targetExamOpenTime, application.targetExamCloseTime)}
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
                <Button size="sm" className="flex-1 bg-rose-600 hover:bg-rose-700 text-white" onClick={() => handleRespond(application.id, "REJECTED")}>
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
            {t("pageDescription")}
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
    </div>
  );
}
