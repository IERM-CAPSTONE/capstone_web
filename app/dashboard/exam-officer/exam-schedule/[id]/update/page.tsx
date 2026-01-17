"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useExamScheduleById, useUpdateExamSchedule } from "@/hooks/use-exam-schedules";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    ChevronLeft,
    AlertCircle,
    Calendar,
    Clock,
    BookOpen,
    Info,
    Zap,
    Loader2,
    MapPin,
} from "lucide-react";
import { format } from "date-fns";
import { ROUTES } from "@/lib/constants/routes";

export default function UpdateExamSchedulePage() {
    const router = useRouter();
    const params = useParams();
    const scheduleId = params.id as string;

    const { data: schedule, isLoading: isLoadingSchedule } = useExamScheduleById(scheduleId);
    const updateMutation = useUpdateExamSchedule();

    const [formData, setFormData] = useState({
        examCode: "",
        openCode: "",
        note: "",
    });

    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (schedule) {
            setFormData({
                examCode: schedule.examCode || "",
                openCode: schedule.openCode || "",
                note: schedule.note || "",
            });
        }
    }, [schedule]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const validateForm = () => {
        if (!formData.examCode.trim()) {
            setError("Exam Code is required");
            return false;
        }
        setError("");
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            await updateMutation.mutateAsync({
                id: scheduleId,
                data: {
                    examCode: formData.examCode.trim() || undefined,
                    openCode: formData.openCode.trim() || undefined,
                    note: formData.note.trim() || undefined,
                },
            });
            router.push(ROUTES.EXAMS_SCHEDULE);
        } catch (err: any) {
            const message = err?.message || "Failed to update exam schedule";
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingSchedule) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                    <p className="text-slate-600">Loading schedule...</p>
                </div>
            </div>
        );
    }

    if (!schedule) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Card className="bg-red-50 border-red-200 border">
                    <CardContent className="p-6">
                        <p className="text-red-600 font-medium">Schedule not found</p>
                        <Button
                            onClick={() => router.push(ROUTES.EXAMS_SCHEDULE)}
                            className="mt-4 bg-orange-500 hover:bg-orange-600 text-white"
                        >
                            Back to schedules
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Parse date strings as local time (avoid timezone conversion)
    const parseLocalDate = (dateStr: string | null): Date | null => {
      if (!dateStr) return null;
      // If it's an ISO string with timezone, extract local components
      const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
      if (isoMatch) {
        // Create date using local time components (no timezone conversion)
        return new Date(
          parseInt(isoMatch[1]),
          parseInt(isoMatch[2]) - 1,
          parseInt(isoMatch[3]),
          parseInt(isoMatch[4]),
          parseInt(isoMatch[5]),
          parseInt(isoMatch[6])
        );
      }
      return new Date(dateStr);
    };
    const examOpenTime = schedule.examOpenTime ? parseLocalDate(schedule.examOpenTime) : null;
    const examCloseTime = schedule.examCloseTime ? parseLocalDate(schedule.examCloseTime) : null;

    const duration = (() => {
        if (!examOpenTime || !examCloseTime) return null;
        const minutes = (examCloseTime.getTime() - examOpenTime.getTime()) / (1000 * 60);
        if (minutes <= 0) return null;
        return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    })();

    return (
        <div className="max-w-6xl mx-auto py-6 space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-600 hover:text-slate-900"
                    onClick={() => router.back()}
                >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <span className="text-sm text-slate-400">Update Exam Schedule</span>
            </div>

            <div className="grid gap-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <Card className="bg-red-50 border-red-200 border shadow-none">
                            <CardContent className="p-4 flex items-start gap-4">
                                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-red-900">{error}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Schedule Information Section */}
                    <Card className="border-none shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-orange-50 rounded-lg">
                                    <Calendar className="h-5 w-5 text-orange-500" />
                                </div>
                                <h2 className="text-lg font-bold text-slate-900">Schedule Information</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Exam Code */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Exam Code <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="examCode"
                                        placeholder="e.g. HCM202_FE_SP26"
                                        value={formData.examCode}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                                    />
                                </div>

                                {/* Open Code */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Open Code
                                    </label>
                                    <input
                                        type="text"
                                        name="openCode"
                                        placeholder="e.g. 123456"
                                        value={formData.openCode}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                                    />
                                </div>

                                {/* Subject / Course Name */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Subject / Course Name
                                    </label>
                                    <input
                                        type="text"
                                        value={schedule.subjectCode || ""}
                                        disabled
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 cursor-not-allowed"
                                    />
                                </div>

                                {/* Semester */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Semester
                                    </label>
                                    <input
                                        type="text"
                                        value={schedule.semester || ""}
                                        disabled
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 cursor-not-allowed"
                                    />
                                </div>

                                {/* Exam Type */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Exam Type
                                    </label>
                                    <input
                                        type="text"
                                        value={schedule.examType || ""}
                                        disabled
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 cursor-not-allowed"
                                    />
                                </div>

                                {/* Exam Date */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Exam Date
                                    </label>
                                    <input
                                        type="text"
                                        value={examOpenTime ? format(examOpenTime, "yyyy-MM-dd") : ""}
                                        disabled
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 cursor-not-allowed"
                                    />
                                </div>

                                {/* Duration */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Duration</label>
                                    <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-slate-400" />
                                        {duration || "N/A"}
                                    </div>
                                </div>

                                {/* Start Time */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Start Time
                                    </label>
                                    <input
                                        type="text"
                                        value={examOpenTime ? format(examOpenTime, "HH:mm") : ""}
                                        disabled
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 cursor-not-allowed"
                                    />
                                </div>

                                {/* End Time */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        End Time
                                    </label>
                                    <input
                                        type="text"
                                        value={examCloseTime ? format(examCloseTime, "HH:mm") : ""}
                                        disabled
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Exam Notes Section */}
                    <Card className="border-none shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <BookOpen className="h-5 w-5 text-blue-500" />
                                </div>
                                <h2 className="text-lg font-bold text-slate-900">Notes & Description</h2>
                                <span className="text-xs text-slate-500 font-medium">(Optional)</span>
                            </div>

                            <textarea
                                name="note"
                                placeholder="Add notes, special instructions, or additional information about the exam..."
                                rows={4}
                                value={formData.note}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                            />
                        </CardContent>
                    </Card>

                    {/* Linked Information Section */}
                    <Card className="border-none shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-green-50 rounded-lg">
                                    <MapPin className="h-5 w-5 text-green-500" />
                                </div>
                                <h2 className="text-lg font-bold text-slate-900">Linked Information</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        EXAM ROOM
                                    </label>
                                    <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                                        <p className="text-slate-700 font-medium">{schedule.examRoomNumber || "No room assigned"}</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        LINKED STUDENTS
                                    </label>
                                    <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                                        <p className="text-slate-700 font-medium">0 students</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-xs text-yellow-700">
                                    ⚠ To modify linked information, please use the schedule detail page.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <p className="text-xs text-slate-400">*Required fields</p>
                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                className="px-6 bg-white"
                                onClick={() => router.back()}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="px-6 bg-orange-500 hover:bg-orange-600 text-white"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                </form>

                {/* Guidelines Section */}
                <Card className="bg-slate-50 border-none shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-orange-50 rounded-lg">
                                <Info className="h-5 w-5 text-orange-500" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-900 mb-3">Update Guidelines</h3>
                                <ul className="space-y-2 text-sm text-slate-700">
                                    <li>• You can edit exam code, open code, and notes only</li>
                                    <li>• Exam details (date, time, duration, semester, exam type) are read-only and can only be changed in the detail page</li>
                                    <li>• Subject and linked information cannot be modified here</li>
                                    <li>• All changes are effective immediately</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
