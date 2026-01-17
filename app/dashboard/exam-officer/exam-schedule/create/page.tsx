"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateExamSchedule } from "@/hooks/use-exam-schedules";
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
} from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";

type ExamType = "Final" | "Midterm" | "Retake" | "Quiz";

export default function CreateExamSchedulePage() {
  const router = useRouter();
  const createMutation = useCreateExamSchedule();

  const [formData, setFormData] = useState({
    examCode: "",
    semester: "",
    subjectCode: "",
    examType: "Final" as ExamType,
    examDate: "",
    startTime: "",
    endTime: "",
    openCode: "",
    note: "",
    examRoomId: "",
    proctorId: "",
    hallInvigilatorId: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const examTypeAbbr: Record<ExamType, string> = {
    Final: "FE",
    Midterm: "MI",
    Retake: "RE",
    Quiz: "QZ",
  };

  const generateSemesterAbbr = (semester: string): string => {
    const parts = semester.trim().split(/\s+/);
    if (parts.length < 2) return "XX00";

    const seasonMap: Record<string, string> = {
      spring: "SP",
      summer: "SU",
      fall: "FA",
    };

    const season = seasonMap[parts[0].toLowerCase()] || "XX";
    const year = parts[1]?.slice(-2) || "00";

    return `${season}${year}`;
  };

  const generateRandomCode = (): string => {
    const min = 100000;
    const max = 999999;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  };

  const handleGenerateCode = () => {
    if (!formData.subjectCode.trim()) {
      setError("Subject Code is required to generate code");
      return;
    }

    const examTypeCode = examTypeAbbr[formData.examType];
    const semesterCode = formData.semester
      ? generateSemesterAbbr(formData.semester)
      : "XXXX";
    const randomCode = generateRandomCode();

    const generatedCode = `${formData.subjectCode.toUpperCase()}_${examTypeCode}_${semesterCode}_${randomCode}`;

    setFormData((prev) => ({
      ...prev,
      examCode: generatedCode,
    }));

    setError("");
  };

  const duration = (() => {
    if (!formData.startTime || !formData.endTime) return null;
    const [startHour, startMin] = formData.startTime.split(":").map(Number);
    const [endHour, endMin] = formData.endTime.split(":").map(Number);
    const minutes = endHour * 60 + endMin - (startHour * 60 + startMin);
    if (minutes <= 0) return null;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  })();

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
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
    if (!formData.subjectCode.trim()) {
      setError("Subject Code is required");
      return false;
    }
    if (!formData.examDate) {
      setError("Exam Date is required");
      return false;
    }
    if (!formData.startTime) {
      setError("Start Time is required");
      return false;
    }
    if (!formData.endTime) {
      setError("End Time is required");
      return false;
    }
    if (formData.startTime >= formData.endTime) {
      setError("End Time must be after Start Time");
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
      // Transform form data to API format
      const apiData = {
        examCode: formData.examCode,
        semester: formData.semester || undefined,
        subjectCode: formData.subjectCode,
        examType: formData.examType,
        openCode: formData.openCode || undefined,
        note: formData.note || undefined,
        examOpenTime: formData.examDate && formData.startTime 
          ? `${formData.examDate}T${formData.startTime}:00.000Z` 
          : undefined,
        examCloseTime: formData.examDate && formData.endTime 
          ? `${formData.examDate}T${formData.endTime}:00.000Z` 
          : undefined,
        examRoomId: formData.examRoomId || undefined,
        proctorId: formData.proctorId || undefined,
        hallInvigilatorId: formData.hallInvigilatorId || undefined,
      };

      await createMutation.mutateAsync(apiData);
      router.push(ROUTES.DASHBOARD_EXAM_OFFICER);
    } catch (err: any) {
      const message = err?.message || "Failed to create exam schedule";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-600 hover:text-slate-900"
          onClick={() => router.push(ROUTES.DASHBOARD_EXAM_OFFICER)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to schedules
        </Button>
        <span className="text-sm text-slate-400">Create Exam Schedule</span>
      </div>

      <div className="grid gap-6">
        <Card className="bg-gradient-to-r from-orange-50 to-white border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-orange-500 font-semibold">
                  Exam Management
                </p>
                <h1 className="text-2xl font-bold text-slate-900 mt-2">Create exam schedule</h1>
                <p className="text-sm text-slate-600 mt-2 max-w-2xl">
                  Define schedule details, generate a unique schedule code, and assign time and room information. You can update proctoring and room assignments later.
                </p>
              </div>
              <div className="hidden md:block text-right">
                <p className="text-xs text-slate-500">Need help?</p>
                <p className="text-sm font-semibold text-slate-800">Follow the guidelines below</p>
              </div>
            </div>
          </CardContent>
        </Card>

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

          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Schedule Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Exam Code <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="examCode"
                      placeholder="e.g. HCM202_FE_SP26_123456"
                      value={formData.examCode}
                      onChange={handleInputChange}
                      className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                    <Button
                      type="button"
                      className="bg-orange-500 hover:bg-orange-600 text-white px-4 h-auto"
                      onClick={handleGenerateCode}
                    >
                      <Zap className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Click "Generate" or input manually</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Semester
                  </label>
                  <input
                    type="text"
                    name="semester"
                    placeholder="e.g. Fall 2025"
                    value={formData.semester}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Subject / Course Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="subjectCode"
                    placeholder="e.g. CHEM201"
                    value={formData.subjectCode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Exam Type <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    {(["Final", "Midterm", "Retake", "Quiz"] as ExamType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, examType: type }))}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                          formData.examType === type
                            ? "bg-orange-50 text-orange-600 border-orange-300"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Exam Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="examDate"
                    value={formData.examDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Duration</label>
                  <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {duration ? duration : "Auto-calculated"}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Calculated from start and end time</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Clock className="h-5 w-5 text-green-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Open Code</h2>
                <span className="text-xs text-slate-500 font-medium">(Optional)</span>
              </div>

              <input
                type="text"
                name="openCode"
                placeholder="e.g. OP2025123"
                value={formData.openCode}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              />
              <p className="text-xs text-slate-400 mt-2">
                Code for opening the exam if needed
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Notes</h2>
                <span className="text-xs text-slate-500 font-medium">(Optional)</span>
              </div>

              <textarea
                name="note"
                placeholder="Add notes, special instructions, or additional information about the exam..."
                value={formData.note}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
              />
              <p className="text-xs text-slate-400 mt-2">
                This information will be visible to proctors and can guide exam conduct
              </p>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">*Required fields</p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="px-6 bg-white"
                onClick={() => router.push(ROUTES.EXAMS_SCHEDULE)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-6 bg-orange-500 hover:bg-orange-600 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Exam Schedule"}
              </Button>
            </div>
          </div>
        </form>

        <Card className="bg-slate-50 border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Info className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 mb-3">Schedule Creation Guidelines</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>• Schedule code must be unique across all exam schedules</li>
                  <li>• Duration is automatically calculated based on start and end times</li>
                  <li>• The system will check for potential room conflicts with existing schedules</li>
                  <li>• You can assign rooms, students, and proctors after creating the schedule</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
