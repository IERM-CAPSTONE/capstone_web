"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import {
  ProctorApplication,
  CreateProctorApplicationData,
  UpdateProctorApplicationData,
  PreferredShift,
  PreferredType,
} from "@/lib/api/proctor-applications";
import {
  useCreateProctorApplication,
  useUpdateProctorApplication,
  useAvailableDates,
} from "@/hooks/use-proctor-applications";

interface ProctorApplicationFormModalProps {
  application?: ProctorApplication | null;
  onClose: () => void;
  semester?: string;
}

export function ProctorApplicationFormModal({
  application,
  onClose,
  semester,
}: ProctorApplicationFormModalProps) {
  const isEdit = !!application;
  const createApplication = useCreateProctorApplication();
  const updateApplication = useUpdateProctorApplication();
  const { data: availableDates = [], isLoading: datesLoading } = useAvailableDates(semester);

  const [formData, setFormData] = useState({
    preferredShift: (application?.preferredShift || "MORNING") as PreferredShift,
    preferredType: (application?.preferredType || "ROOM") as PreferredType,
    preferredDate: application?.preferredDate || "",
    notes: application?.notes || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (application) {
      setFormData({
        preferredShift: application.preferredShift,
        preferredType: application.preferredType,
        preferredDate: application.preferredDate || "",
        notes: application.notes || "",
      });
    }
  }, [application]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.preferredShift) {
      newErrors.preferredShift = "Preferred shift is required";
    }

    if (!formData.preferredType) {
      newErrors.preferredType = "Preferred type is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      if (isEdit && application) {
        const updateData: UpdateProctorApplicationData = {
          preferredShift: formData.preferredShift,
          preferredType: formData.preferredType,
          preferredDate: formData.preferredDate || null,
          notes: formData.notes || null,
        };
        await updateApplication.mutateAsync({ id: application.id, data: updateData });
      } else {
        const createData: CreateProctorApplicationData = {
          preferredShift: formData.preferredShift,
          preferredType: formData.preferredType,
          preferredDate: formData.preferredDate || null,
          notes: formData.notes || null,
        };
        await createApplication.mutateAsync(createData);
      }
      onClose();
    } catch (error) {
      console.error("Error saving application:", error);
    }
  };

  const isLoading = createApplication.isPending || updateApplication.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {isEdit ? "Edit Application" : "Create Application"}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Preferred Shift *
              </label>
              <select
                value={formData.preferredShift}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    preferredShift: e.target.value as PreferredShift,
                  })
                }
                disabled={isLoading}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.preferredShift ? "border-red-500" : ""
                }`}
              >
                <option value="MORNING">Morning</option>
                <option value="AFTERNOON">Afternoon</option>
              </select>
              {errors.preferredShift && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.preferredShift}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Preferred Type *
              </label>
              <select
                value={formData.preferredType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    preferredType: e.target.value as PreferredType,
                  })
                }
                disabled={isLoading}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.preferredType ? "border-red-500" : ""
                }`}
              >
                <option value="ROOM">Room Proctor</option>
                <option value="HALL">Hall Invigilator</option>
              </select>
              {errors.preferredType && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.preferredType}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Preferred Date
              </label>
              {datesLoading ? (
                <p className="text-sm text-gray-500">Loading available dates...</p>
              ) : availableDates.length === 0 ? (
                <p className="text-sm text-gray-500">No exam sessions available</p>
              ) : (
                <select
                  value={formData.preferredDate}
                  onChange={(e) =>
                    setFormData({ ...formData, preferredDate: e.target.value })
                  }
                  disabled={isLoading}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">-- Select a date --</option>
                  {availableDates.map((dateInfo) => (
                    <option key={dateInfo.date} value={dateInfo.date}>
                      {new Date(dateInfo.date).toLocaleDateString()} ({dateInfo.count}{" "}
                      sessions)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                disabled={isLoading}
                className="w-full px-3 py-2 border rounded-md min-h-[100px]"
                placeholder="Additional information about your availability..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : isEdit ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
