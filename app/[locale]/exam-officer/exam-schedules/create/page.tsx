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
  Zap,
  BookOpen,
  Info,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { getCurrentLocale } from "@/hooks/use-check-auth";
import { ROUTES } from "@/lib/constants/routes";

export default function CreateExamSchedulePage() {
  const router = useRouter();
  const createMutation = useCreateExamSchedule();
  const locale = getCurrentLocale();
  const t = useTranslations("Dashboard");

  type ExamType = "Final_Exam" | "Theory_Exam" | "Retake" | "Practical" | "Multiple_choice" | "Speaking" | "Listening" | "Reading" | "Writing";
  const [formData, setFormData] = useState({
    examCode: "",
    semester: "",
    subjectCode: "",
    examType: "Final_Exam" as ExamType,
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

  const examTypeMap: Record<ExamType, string> = {
    Final_Exam: "FE",
    Theory_Exam: "TE",
    Retake: "RE",
    Practical: "PE",
    Multiple_choice: "MC",
    Speaking: "S",
    Listening: "L",
    Reading: "R",
    Writing: "W",

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

    const examTypeCode = examTypeMap[formData.examType];
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

  const getTomorrowDate = (): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

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

    // Validate exam date is from tomorrow onwards
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const selectedDate = new Date(formData.examDate);
    
    if (selectedDate < tomorrow) {
      setError("Cannot select today or past dates. Please choose tomorrow or later.");
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

    // End time must be after start time and at least 1 hour difference
    if (formData.startTime >= formData.endTime) {
      setError("End Time must be after Start Time");
      return false;
    }

    const [startHour, startMin] = formData.startTime.split(":").map(Number);
    const [endHour, endMin] = formData.endTime.split(":").map(Number);
    const durationMinutes = endHour * 60 + endMin - (startHour * 60 + startMin);
    
    if (durationMinutes < 60) {
      setError("Exam duration must be at least 1 hour");
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
      // Transform form data to API format aligned with API DTO
      const apiData = {
        examCode: formData.examCode || undefined,
        openCode: formData.openCode || undefined,
        semester: formData.semester || undefined,
        note: formData.note || undefined,
        examType: examTypeMap[formData.examType] ? [examTypeMap[formData.examType]] : [],
        subjectCode: formData.subjectCode,
        examOpenTime: (() => {
          if (!formData.examDate || !formData.startTime) return undefined;
          const [year, month, day] = formData.examDate.split('-').map(Number);
          const [hour, minute] = formData.startTime.split(':').map(Number);
          return new Date(year, month - 1, day, hour, minute).toISOString();
        })(),
        examCloseTime: (() => {
          if (!formData.examDate || !formData.endTime) return undefined;
          const [year, month, day] = formData.examDate.split('-').map(Number);
          const [hour, minute] = formData.endTime.split(':').map(Number);
          return new Date(year, month - 1, day, hour, minute).toISOString();
        })(),
        examRoomId: formData.examRoomId || undefined,
        proctorId: formData.proctorId || undefined,
        hallInvigilatorId: formData.hallInvigilatorId || undefined,
      };

      await createMutation.mutateAsync(apiData);
      router.push(`/${locale}${ROUTES.EXAMS_SCHEDULE}`);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Failed to create exam schedule";
      setError(Array.isArray(message) ? message.join(", ") : message);
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
          onClick={() => router.push(`/${locale}${ROUTES.EXAMS_SCHEDULE}`)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> {t("examOfficer.createSchedule.backToSchedules")}
        </Button>
        <span className="text-sm text-slate-400">{t("examOfficer.actions.createSchedule")}</span>
      </div>

      <div className="grid gap-6">
        <Card className="bg-gradient-to-r from-orange-50 to-white border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-orange-500 font-semibold">
                  {t("title")}
                </p>
                <h1 className="text-2xl font-bold text-slate-900 mt-2">{t("examOfficer.createSchedule.title")}</h1>
                <p className="text-sm text-slate-600 mt-2 max-w-2xl">
                  {t("examOfficer.createSchedule.description")}
                </p>
              </div>
              <div className="hidden md:block text-right">
                <p className="text-xs text-slate-500">{t("examOfficer.createSchedule.needHelp")}</p>
                <p className="text-sm font-semibold text-slate-800">{t("examOfficer.createSchedule.followGuidelines")}</p>
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
                <h2 className="text-lg font-bold text-slate-900">{t("examOfficer.createSchedule.scheduleInformation")}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t("examOfficer.createSchedule.examCode")} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="examCode"
                      placeholder={t("examOfficer.createSchedule.examCodePlaceholder")}
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
                  <p className="text-xs text-slate-400 mt-1">{t("examOfficer.createSchedule.generateCode")}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t("examOfficer.createSchedule.semester")}
                  </label>
                  <input
                    type="text"
                    name="semester"
                    placeholder={t("examOfficer.createSchedule.semesterPlaceholder")}
                    value={formData.semester}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t("examOfficer.createSchedule.subjectCode")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="subjectCode"
                    placeholder={t("examOfficer.createSchedule.subjectCodePlaceholder")}
                    value={formData.subjectCode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t("examOfficer.createSchedule.examType")} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    {Object.entries(examTypeMap).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, examType: key as ExamType }))}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${formData.examType === key
                          ? "bg-orange-50 text-orange-600 border-orange-300"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                          }`}
                      >
                        {label}
                      </button>
                    ))}

                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t("examOfficer.createSchedule.examDate")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="examDate"
                    value={formData.examDate}
                    onChange={handleInputChange}
                    min={getTomorrowDate()}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {t("examOfficer.createSchedule.examDateHelper")}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t("examOfficer.createSchedule.duration")}</label>
                  <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {duration ? duration : t("examOfficer.createSchedule.durationAuto")}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{t("examOfficer.createSchedule.durationHelper")}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t("examOfficer.createSchedule.startTime")} <span className="text-red-500">*</span>
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
                    {t("examOfficer.createSchedule.endTime")} <span className="text-red-500">*</span>
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
                <h2 className="text-lg font-bold text-slate-900">{t("examOfficer.createSchedule.openCodeSection")}</h2>
                <span className="text-xs text-slate-500 font-medium">{t("examOfficer.createSchedule.openCodeOptional")}</span>
              </div>

              <input
                type="text"
                name="openCode"
                placeholder={t("examOfficer.createSchedule.openCodePlaceholder")}
                value={formData.openCode}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              />
              <p className="text-xs text-slate-400 mt-2">
                {t("examOfficer.createSchedule.openCodeHelper")}
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">{t("examOfficer.createSchedule.notesSection")}</h2>
                <span className="text-xs text-slate-500 font-medium">{t("examOfficer.createSchedule.openCodeOptional")}</span>
              </div>

              <textarea
                name="note"
                placeholder={t("examOfficer.createSchedule.notesPlaceholder")}
                value={formData.note}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
              />
              <p className="text-xs text-slate-400 mt-2">
                {t("examOfficer.createSchedule.notesHelper")}
              </p>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">{t("examOfficer.createSchedule.requiredFields")}</p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="px-6 bg-white"
                onClick={() => router.push(`/${locale}${ROUTES.EXAMS_SCHEDULE}`)}
                disabled={isSubmitting}
              >
                {t("examOfficer.createSchedule.cancel")}
              </Button>
              <Button
                type="submit"
                className="px-6 bg-orange-500 hover:bg-orange-600 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? t("examOfficer.createSchedule.submitting") : t("examOfficer.createSchedule.submit")}
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
                <h3 className="font-bold text-slate-900 mb-3">{t("examOfficer.createSchedule.guidelines")}</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>• {t("examOfficer.createSchedule.guideline1")}</li>
                  <li>• {t("examOfficer.createSchedule.guideline2")}</li>
                  <li>• {t("examOfficer.createSchedule.guideline3")}</li>
                  <li>• {t("examOfficer.createSchedule.guideline4")}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
