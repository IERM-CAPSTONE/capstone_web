"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, X as XIcon } from "lucide-react";
import { ProctorApplicationFormModal } from "@/components/proctor-applications/proctor-application-form-modal";
import {
  useMyProctorApplications,
  useCancelProctorApplication,
  useUpdateProctorApplication,
} from "@/hooks/use-proctor-applications";
import { ProctorApplication } from "@/lib/api/proctor-applications";
import { format as dateFnsFormat, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";

export default function ProctorApplicationsPage() {
  const { data: applications = [], isLoading } = useMyProctorApplications();
  const cancelApplication = useCancelProctorApplication();
  const [showForm, setShowForm] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ProctorApplication | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

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
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${className}`}>
        {label}
      </span>
    );
  };

  const getShiftLabel = (shift: string) => shift === "MORNING" ? "Morning" : "Afternoon";
  const getTypeLabel = (type: string) => type === "ROOM" ? "Room Proctor" : "Hall Invigilator";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Applications</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your proctor shift applications
          </p>
        </div>
        <Button onClick={handleCreate} className="bg-[#F37021] hover:bg-[#F37021]/90">
          <Plus className="h-4 w-4 mr-2" />
          Apply
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : applications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 mb-4">No applications yet</p>
            <Button onClick={handleCreate}>Create Your First Application</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {applications.map((application) => {
            const isPending = application.status === "PENDING";
            const canCancel = application.status === "PENDING" || application.status === "APPROVED";

            return (
              <Card key={application.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">
                      {getTypeLabel(application.preferredType)} • {getShiftLabel(application.preferredShift)}
                      {application.preferredDate && (
                        <span className="text-gray-500 dark:text-gray-400">
                          , {dateFnsFormat(parseISO(application.preferredDate), "MMM d", { locale: enUS })}
                        </span>
                      )}
                    </CardTitle>
                    {getStatusBadge(application.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Shift:</span>
                      <span className="font-medium">{getShiftLabel(application.preferredShift)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Type:</span>
                      <span className="font-medium">{getTypeLabel(application.preferredType)}</span>
                    </div>
                    {application.notes && (
                      <div className="text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Notes:</span>
                        <p className="mt-1 text-gray-900 dark:text-gray-100">{application.notes}</p>
                      </div>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t">
                      Applied: {dateFnsFormat(parseISO(application.createdAt), "MMM d, yyyy", { locale: enUS })}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {isPending && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEdit(application)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                    {canCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-600 hover:text-red-700"
                        onClick={() => setConfirmCancel(application.id)}
                      >
                        <XIcon className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showForm && (
        <ProctorApplicationFormModal
          application={selectedApplication}
          onClose={() => {
            setShowForm(false);
            setSelectedApplication(null);
          }}
        />
      )}

      {confirmCancel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Cancel Application</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to cancel this application?
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmCancel(null)}>
                  No, Keep It
                </Button>
                <Button
                  onClick={() => handleCancel(confirmCancel)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Yes, Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
