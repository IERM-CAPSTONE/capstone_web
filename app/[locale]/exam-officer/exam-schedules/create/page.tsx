"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCreateExamSchedule } from "@/hooks/use-exam-schedules";
import { useUsers, useSearchUsersByCodes, useProctors } from "@/hooks/use-users";
import { useSemesters } from "@/hooks/use-semesters";
import { useSubjects } from "@/hooks/use-subjects";
import { useRooms } from "@/hooks/use-rooms";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SearchableSelect from "@/components/ui/searchable-select";
import {
  ChevronLeft,
  AlertCircle,
  Calendar,
  Clock,
  Zap,
  Info,
  Users,
  UserPlus,
  Trash2,
  Download,
  FileUp,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { getCurrentLocale } from "@/hooks/use-check-auth";
import { ROUTES } from "@/lib/constants/routes";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  examSchedulesApi,
  CreateExamScheduleData
} from "@/lib/api/exam-schedules";

export default function CreateExamSchedulePage() {
  const router = useRouter();
  const createMutation = useCreateExamSchedule();
  const searchByCodesMutation = useSearchUsersByCodes();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const locale = getCurrentLocale();
  const t = useTranslations("Dashboard");
  const { user } = useAuthStore();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  type ExamPart = "Final_Exam" | "Theory_Exam" | "Retake" | "Practical" | "Multiple_choice" | "Speaking" | "Listening" | "Reading" | "Writing";
  const [formData, setFormData] = useState({
    examCode: "",
    semesterId: "",
    subjectCode: "",
    examPart: "Final_Exam" as ExamPart,
    examDate: "",
    startTime: "",
    endTime: "",
    duration: "60",
    openCode: "",
    campus: "",
    examRoomId: "",
    proctorId: "",
    hallInvigilatorId: "",
  });

  const [subjectSearch, setSubjectSearch] = useState("");
  const debouncedSubjectSearch = useDebounce(subjectSearch, 500);

  const [semesterSearch, setSemesterSearch] = useState("");
  const debouncedSemesterSearch = useDebounce(semesterSearch, 500);

  const [roomSearch, setRoomSearch] = useState("");
  const debouncedRoomSearch = useDebounce(roomSearch, 500);

  const [proctorSearch, setProctorSearch] = useState("");
  const debouncedProctorSearch = useDebounce(proctorSearch, 500);

  const [hallInvigilatorSearch, setHallInvigilatorSearch] = useState("");
  const debouncedHallInvigilatorSearch = useDebounce(hallInvigilatorSearch, 500);

  const [studentSearch, setStudentSearch] = useState("");
  const debouncedStudentSearch = useDebounce(studentSearch, 500);

  const { data: semestersData, isLoading: isLoadingSemesters } = useSemesters({
    limit: 100,
    search: debouncedSemesterSearch
  });
  const { data: subjectsData, isLoading: isLoadingSubjects } = useSubjects({
    limit: 100,
    search: debouncedSubjectSearch
  });
  const { data: roomsData, isLoading: isLoadingRooms } = useRooms({
    limit: 100,
    roomNumber: debouncedRoomSearch,
    campus: formData.campus || undefined
  });
  const { data: proctorsData, isLoading: isLoadingProctors } = useProctors({
    limit: 100,
    search: debouncedProctorSearch,
    isActive: true,
  });
  const { data: hallInvigilatorsData, isLoading: isLoadingHallInvigilators } = useUsers({
    role: "HALL_INVIGILATOR",
    limit: 100,
    isActive: true,
    search: debouncedHallInvigilatorSearch,
  });

  const semesterOptions = (semestersData?.data || []).map(s => ({
    value: s.id,
    label: s.name
  }));

  const subjectOptions = (subjectsData?.data || []).map(s => ({
    value: s.code,
    label: s.name ? `${s.code} - ${s.name}` : s.code
  }));

  const roomOptions = (roomsData?.data || []).map(r => ({
    value: r.id,
    label: `${r.roomNumber}${r.campus ? ` (${r.campus})` : ""}`
  }));

  const proctorOptions = (proctorsData?.data || []).map(p => ({
    value: p.id,
    label: `${p.fullName || p.username || p.code || "Unknown"} (${p.email || "No email"})`
  }));

  const hallInvigilatorOptions = (hallInvigilatorsData?.data || []).map(h => ({
    value: h.id,
    label: `${h.fullName || h.username || h.code || "Unknown"} (${h.email || "No email"})`
  }));

  const [selectedStudents, setSelectedStudents] = useState<{ id: string; code: string; fullName: string }[]>([]);
  const [currentStudentId, setCurrentStudentId] = useState("");

  const { data: studentsData, isLoading: isLoadingStudents } = useUsers({
    role: "STUDENT",
    limit: 100,
    isActive: true,
    search: debouncedStudentSearch
  });
  const studentOptions = (studentsData?.data || []).map(s => ({
    value: s.id,
    label: `${s.code} - ${s.fullName}`
  }));

  const handleAddStudent = () => {
    if (!currentStudentId) return;
    const student = studentsData?.data.find(s => s.id === currentStudentId);
    if (student && !selectedStudents.some(s => s.id === student.id)) {
      setSelectedStudents(prev => [...prev, {
        id: student.id,
        code: student.code || "",
        fullName: student.fullName || ""
      }]);
    }
    setCurrentStudentId("");
  };

  const handleRemoveStudent = (id: string) => {
    setSelectedStudents(prev => prev.filter(s => s.id !== id));
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await examSchedulesApi.downloadTemplate('student');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'StudentList_Template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Template downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download template");
    }
  };

  const handleImportStudents = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const codes = data
          .map(row => (row.studentCode || row['Mã sinh viên'] || row.StudentCode || row.code)?.toString().trim())
          .filter(Boolean);

        if (codes.length === 0) {
          toast.error("No student codes found in file");
          return;
        }

        const uniqueCodes = Array.from(new Set(codes));
        const users = await searchByCodesMutation.mutateAsync(uniqueCodes);

        if (users.length === 0) {
          toast.error("No matching students found in system");
          return;
        }

        const newStudents = users
          .filter(u => !selectedStudents.some(s => s.id === u.id))
          .map(u => ({
            id: u.id,
            code: u.code || "",
            fullName: u.fullName || ""
          }));

        if (newStudents.length === 0) {
          toast.info("All students in file are already added");
        } else {
          setSelectedStudents(prev => [...prev, ...newStudents]);
          toast.success(`Successfully imported ${newStudents.length} students`);
        }
      } catch (error) {
        console.error("Import error:", error);
        toast.error("Failed to parse file. Please use the provided template.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const campusOptions = [
    { value: "HCM", label: "Ho Chi Minh" },
    { value: "HN", label: "Ha Noi" },
    { value: "DN", label: "Da Nang" },
    { value: "QN", label: "Quy Nhon" },
    { value: "CT", label: "Can Tho" },
  ];

  const examPartMap: Record<ExamPart, string> = {
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
    if (!formData.campus) {
      setError("Campus is required to generate code");
      return;
    }

    const examPartCode = examPartMap[formData.examPart];
    const selectedSemester = semestersData?.data.find(s => s.id === formData.semesterId);
    const semesterCode = selectedSemester?.code || "XXXX";
    const randomCode = generateRandomCode();

    const generatedCode = `${formData.campus ? formData.campus + "_" : ""}${formData.subjectCode.toUpperCase()}_${examPartCode}_${semesterCode}_${randomCode}`;

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

  const getTodayDate = (): string => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      // Sync duration and end time
      if (name === "startTime" || name === "endTime") {
        if (newData.startTime && newData.endTime) {
          const [sH, sM] = newData.startTime.split(":").map(Number);
          const [eH, eM] = newData.endTime.split(":").map(Number);
          const diff = (eH * 60 + eM) - (sH * 60 + sM);
          if (diff > 0) {
            newData.duration = diff.toString();
          }
        }
      }

      return newData;
    });
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const durationMin = parseInt(value) || 0;

    setFormData((prev) => {
      const newData = { ...prev, duration: value };

      if (newData.startTime && durationMin > 0) {
        const [h, m] = newData.startTime.split(":").map(Number);
        const totalMinutes = h * 60 + m + durationMin;
        const newH = Math.floor(totalMinutes / 60) % 24;
        const newM = totalMinutes % 60;
        newData.endTime = `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
      }

      return newData;
    });
  };

  const validateForm = () => {
    if (!formData.campus) {
      setError("Campus is required");
      return false;
    }
    if (!formData.subjectCode.trim()) {
      setError("Subject is required");
      return false;
    }
    if (!formData.semesterId) {
      setError("Semester is required");
      return false;
    }
    if (!formData.examDate) {
      setError("Exam Date is required");
      return false;
    }

    // Validate exam date is from today onwards
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(formData.examDate);

    if (selectedDate < today) {
      setError("Cannot select past dates. Please choose today or later.");
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
        const apiData: CreateExamScheduleData = {
        examCode: formData.examCode || undefined,
        openCode: formData.openCode || undefined,
        semesterId: formData.semesterId || undefined,
        examPart: [],
        subjectCode: formData.subjectCode,
        campus: formData.campus,
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
        studentIds: selectedStudents.length > 0 ? selectedStudents.map(s => s.id) : undefined,
      };

      await createMutation.mutateAsync(apiData);
      toast.success(t("examOfficer.createSchedule.successMessage") || "Exam schedule created successfully");
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
                    {t("examOfficer.createSchedule.examCode")} <span className="text-xs text-slate-400 font-normal">{t("examOfficer.createSchedule.openCodeOptional")}</span>
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
                      disabled={!formData.subjectCode || !formData.semesterId || !formData.campus}
                    >
                      <Zap className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{t("examOfficer.createSchedule.generateCode")}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t("examOfficer.createSchedule.campus")} <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    value={formData.campus}
                    onChange={(val) => {
                      setFormData(prev => ({ ...prev, campus: val, examRoomId: "" }));
                    }}
                    options={campusOptions}
                    placeholder={t("examOfficer.createSchedule.campusPlaceholder")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t("examOfficer.createSchedule.semester")} <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    value={formData.semesterId}
                    onChange={(val) => setFormData(prev => ({ ...prev, semesterId: val }))}
                    options={semesterOptions}
                    placeholder={t("examOfficer.createSchedule.semesterPlaceholder")}
                    selectedLabel={semestersData?.data.find(s => s.id === formData.semesterId)?.name}
                    onSearchChange={setSemesterSearch}
                    isLoading={isLoadingSemesters}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t("examOfficer.createSchedule.subjectCode")} <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    value={formData.subjectCode}
                    onChange={(val) => setFormData(prev => ({ ...prev, subjectCode: val }))}
                    options={subjectOptions}
                    placeholder={t("examOfficer.createSchedule.subjectCodePlaceholder")}
                    selectedLabel={formData.subjectCode ? (subjectsData?.data.find(s => s.code === formData.subjectCode)?.name ? `${formData.subjectCode} - ${subjectsData?.data.find(s => s.code === formData.subjectCode)?.name}` : formData.subjectCode) : undefined}
                    onSearchChange={setSubjectSearch}
                    isLoading={isLoadingSubjects}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t("examOfficer.createSchedule.examRoom")}
                  </label>
                  <SearchableSelect
                    value={formData.examRoomId}
                    onChange={(val) => setFormData(prev => ({ ...prev, examRoomId: val }))}
                    options={roomOptions}
                    placeholder={t("examOfficer.createSchedule.roomPlaceholder")}
                    selectedLabel={formData.examRoomId ? roomsData?.data.find(r => r.id === formData.examRoomId)?.roomNumber : undefined}
                    onSearchChange={setRoomSearch}
                    isLoading={isLoadingRooms}
                    disabled={!formData.campus}
                  />
                  {!formData.campus && (
                    <p className="text-[10px] text-orange-500 mt-1">
                      {t("examOfficer.createSchedule.campusPlaceholder")}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t("examOfficer.proctor")}
                  </label>
                  <SearchableSelect
                    value={formData.proctorId}
                    onChange={(val) => setFormData(prev => ({ ...prev, proctorId: val }))}
                    options={proctorOptions}
                    placeholder={t("examOfficer.createSchedule.proctorPlaceholder")}
                    onSearchChange={setProctorSearch}
                    isLoading={isLoadingProctors}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t("examOfficer.createSchedule.hallInvigilator")}
                  </label>
                  <SearchableSelect
                    value={formData.hallInvigilatorId}
                    onChange={(val) => setFormData(prev => ({ ...prev, hallInvigilatorId: val }))}
                    options={hallInvigilatorOptions}
                    placeholder={t("examOfficer.createSchedule.hallInvigilatorPlaceholder")}
                    onSearchChange={setHallInvigilatorSearch}
                    isLoading={isLoadingHallInvigilators}
                  />
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
                    min={getTodayDate()}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {t("examOfficer.createSchedule.examDateHelper")}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t("examOfficer.createSchedule.duration")} ({t("examOfficer.durationMinutes") || "min"})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="duration"
                      value={formData.duration}
                      onChange={handleDurationChange}
                      min="1"
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                    <Clock className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
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
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Users className="h-5 w-5 text-purple-500" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">{t("examOfficer.createSchedule.addStudentsSection")}</h2>
                  <span className="text-xs text-slate-500 font-medium">{t("examOfficer.createSchedule.openCodeOptional")}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    className="text-slate-600 border-slate-200"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t("examOfficer.createSchedule.downloadTemplate")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-slate-600 border-slate-200"
                  >
                    <FileUp className="h-4 w-4 mr-2" />
                    {t("examOfficer.createSchedule.importStudents")}
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportStudents}
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SearchableSelect
                      value={currentStudentId}
                      onChange={setCurrentStudentId}
                      options={studentOptions}
                      placeholder={t("examOfficer.createSchedule.studentPlaceholder")}
                      onSearchChange={setStudentSearch}
                      isLoading={isLoadingStudents}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddStudent}
                    disabled={!currentStudentId}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-4 h-12 rounded-2xl"
                  >
                    <UserPlus className="h-4 w-4 mr-2" /> {t("examOfficer.createSchedule.addBtn")}
                  </Button>
                </div>

                {selectedStudents.length > 0 && (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-slate-600">{t("examOfficer.createSchedule.studentCodeCol")}</th>
                          <th className="px-4 py-2 text-left font-semibold text-slate-600">{t("examOfficer.createSchedule.fullNameCol")}</th>
                          <th className="px-4 py-2 text-right font-semibold text-slate-600 w-20">{t("examOfficer.createSchedule.actionCol")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {selectedStudents.map((student) => (
                          <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-2 font-medium text-slate-700">{student.code}</td>
                            <td className="px-4 py-2 text-slate-600">{student.fullName}</td>
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveStudent(student.id)}
                                className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-all"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="bg-slate-50 p-2 text-right">
                      <span className="text-xs font-medium text-slate-500">{t("examOfficer.createSchedule.totalStudents", { count: selectedStudents.length })}</span>
                    </div>
                  </div>
                )}
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
