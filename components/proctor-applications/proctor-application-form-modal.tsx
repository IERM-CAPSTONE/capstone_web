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
  semesterId?: string;
}

export function ProctorApplicationFormModal({
  application,
  onClose,
  semesterId,
}: ProctorApplicationFormModalProps) {
  const isEdit = !!application;
  const createApplication = useCreateProctorApplication();
  const updateApplication = useUpdateProctorApplication();
  const {
    data: availableDates = [],
    isLoading: datesLoading,
    error: datesError,
  } = useAvailableDates(semesterId);

  const getInitialPreferredDates = (source?: ProctorApplication | null) => {
    if (!source) {
      return [] as string[];
    }

    if (Array.isArray(source.preferredDates) && source.preferredDates.length > 0) {
      return source.preferredDates.map((date) => {
        const dateObj = date instanceof Date ? date : new Date(date);
        return dateObj.toISOString().split("T")[0];
      });
    }

    return [] as string[];
  };

  const [formData, setFormData] = useState({
    preferredShift: (application?.preferredShift || "MORNING") as PreferredShift,
    preferredType: (application?.preferredType || "ROOM") as PreferredType,
    preferredDates: getInitialPreferredDates(application),
    notes: application?.notes || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (application) {
      setFormData({
        preferredShift: application.preferredShift,
        preferredType: application.preferredType,
        preferredDates: getInitialPreferredDates(application),
        notes: application.notes || "",
      });
    }
  }, [application]);

  const togglePreferredDate = (date: string) => {
    setFormData((prev) => {
      const exists = prev.preferredDates.includes(date);
      return {
        ...prev,
        preferredDates: exists
          ? prev.preferredDates.filter((item) => item !== date)
          : [...prev.preferredDates, date],
      };
    });
  };

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
          preferredDates: formData.preferredDates,
          notes: formData.notes || null,
        };
        await updateApplication.mutateAsync({ id: application.id, data: updateData });
      } else {
        const createData: CreateProctorApplicationData = {
          preferredShift: formData.preferredShift,
          preferredType: formData.preferredType,
          preferredDates: formData.preferredDates,
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
                Preferred Dates
              </label>
              {datesLoading ? (
                <p className="text-sm text-gray-500">Loading available dates...</p>
              ) : datesError ? (
                <p className="text-sm text-red-500">
                  {(datesError as Error).message || "Failed to load available dates"}
                </p>
              ) : availableDates.length === 0 ? (
                <p className="text-sm text-gray-500">No exam sessions available</p>
              ) : (
                <div className="space-y-2 border rounded-md p-3 max-h-44 overflow-y-auto">
                  {availableDates.map((dateInfo) => (
                    <label key={dateInfo.date} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.preferredDates.includes(dateInfo.date)}
                        onChange={() => togglePreferredDate(dateInfo.date)}
                        disabled={isLoading}
                      />
                      <span>
                        {new Date(dateInfo.date).toLocaleDateString()} ({dateInfo.count} sessions)
                      </span>
                    </label>
                  ))}
                </div>
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
