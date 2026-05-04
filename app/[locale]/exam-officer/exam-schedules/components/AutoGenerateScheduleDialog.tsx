"use client";

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Loader2,
    AlertCircle,
    Zap,
    CheckCircle,
    X,
    Search,
    Building2,
    CalendarDays,
    Check,
    Upload,
    FileText,
    Users,
} from "lucide-react";
import { useAutoGenerateSchedule } from "@/hooks/use-exam-schedules";
import { useSemesters } from "@/hooks/use-semesters";
import { useRooms } from "@/hooks/use-rooms";
import { toast } from "sonner";
import { CAMPUSES } from "@/lib/constants/exam";
import { useLocale, useTranslations } from "next-intl";
import { useSocket } from "@/hooks/use-socket";
import { useEffect } from "react";

interface AutoGenerateScheduleDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AutoGenerateScheduleDialog({
    isOpen,
    onClose,
}: AutoGenerateScheduleDialogProps) {
    const locale = useLocale();
    const t = useTranslations("AutoGenerate");
    const tCommon = useTranslations("Common");
    const tDashboard = useTranslations("Dashboard.examOfficer");
    const [formData, setFormData] = useState({
        semesterId: "",
        campus: ["HCM"] as string[],
        selectedType: "FE" as "FE" | "RE" | "PE" | "COURSERA_FE" | "COURSERA_RE",
        targetWeek: "" as string,
        examDays: "6",
        selectedRooms: [] as string[],
        proctorFileName: "",
        proctorEmails: [] as string[],
        campusFiles: {} as Record<string, { fileData: string; fileName: string }>,
        classScheduleFiles: {} as Record<string, { fileData: string; fileName: string }>,
    });

    const { on: onSocket } = useSocket();

    const [failedItems, setFailedItems] = useState<any[]>([]);

    useEffect(() => {
        const cleanupCalc = onSocket?.("AUTO_GENERATE_CALCULATED", (data: any) => {
            if (data.failedCount > 0) {
                toast.warning(
                    locale === "vi"
                        ? `Đã tạo lịch nhưng còn ${data.failedCount} cụm chưa hoàn tất.`
                        : `Schedule generated with ${data.failedCount} incomplete pools.`,
                );
            }
            // Auto close this dialog because AutoGenerateReportDialog will open
            if (isOpen) {
                handleClose();
            }
        });

        const cleanupComp = onSocket?.("AUTO_GENERATE_COMPLETED", (data: any) => {
            toast.success(t("success_completed", { count: data.sessionCount }));
        });

        return () => {
            if (cleanupCalc) cleanupCalc();
            if (cleanupComp) cleanupComp();
        };
    }, [locale, onSocket, t, isOpen]);

    const [roomPage, setRoomPage] = useState(1);
    const roomsPerPage = 20;

    const [roomFilter, setRoomFilter] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");

    const semestersParams = useMemo(() => ({
        limit: 100,
    }), []);

    const { data: semestersData } = useSemesters(semestersParams);
    const { data: roomsData, isLoading: isLoadingRooms } = useRooms({
        limit: 99999, // Fetch all available rooms for multi-campus selection
        campus: formData.campus
    });

    const autoGenerateMutation = useAutoGenerateSchedule();

    const semesters = semestersData?.data || [];
    const allRooms = roomsData?.data || [];

    const filteredRooms = useMemo(() => {
        return allRooms.filter(room =>
            room.roomNumber?.toLowerCase().includes(roomFilter.toLowerCase())
        );
    }, [allRooms, roomFilter]);

    const paginatedRooms = useMemo(() => {
        const start = (roomPage - 1) * roomsPerPage;
        return filteredRooms.slice(start, start + roomsPerPage);
    }, [filteredRooms, roomPage, roomsPerPage]);

    const totalRoomPages = Math.ceil(filteredRooms.length / roomsPerPage);

    const selectedSemester = useMemo(() => {
        return semesters.find(sem => sem.id === formData.semesterId);
    }, [semesters, formData.semesterId]);

    const maxWeeks = useMemo(() => {
        if (!selectedSemester) return 20;
        const start = new Date(selectedSemester.startDate);
        const end = new Date(selectedSemester.endDate);
        const diffInMs = end.getTime() - start.getTime();
        return Math.ceil(diffInMs / (7 * 24 * 60 * 60 * 1000));
    }, [selectedSemester]);

    const getWeekRange = (weekNum: string) => {
        const week = parseInt(weekNum);
        if (isNaN(week) || !selectedSemester || week < 1) return null;

        const start = new Date(selectedSemester.startDate);
        // Align to Monday (same as backend logic)
        const currentDay = start.getDay();
        const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
        start.setDate(start.getDate() - diffToMonday);
        start.setHours(0, 0, 0, 0);

        const weekStart = new Date(start);
        weekStart.setDate(start.getDate() + (week - 1) * 7);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const formatDate = (date: Date) => {
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        };

        return `(${formatDate(weekStart)} - ${formatDate(weekEnd)})`;
    };

    const isInvalid = useMemo(() => {
        const w = parseInt(formData.targetWeek);

        if (!formData.semesterId || formData.selectedRooms.length === 0 || formData.campus.length === 0) return true;

        // Every selected campus must have a file
        const allHaveFiles = formData.campus.every(c => !!formData.campusFiles[c]?.fileData);
        if (!allHaveFiles) return true;

        if (isNaN(w) || w < 1 || w > maxWeeks) return true;

        return false;
    }, [formData, maxWeeks]);

    const parseCsvLine = (line: string) => {
        const values: string[] = [];
        let current = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const next = line[i + 1];

            if (char === '"' && inQuotes && next === '"') {
                current += '"';
                i++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === "," && !inQuotes) {
                values.push(current.trim());
                current = "";
            } else {
                current += char;
            }
        }

        values.push(current.trim());
        return values;
    };

    const handleProctorFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith(".csv")) {
            toast.error(locale === "vi" ? "Vui lòng tải lên file CSV giám thị." : "Please upload a proctor CSV file.");
            return;
        }

        try {
            const text = await file.text();
            const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
            if (lines.length < 2) {
                setError(locale === "vi" ? "File CSV giám thị cần có header và ít nhất 1 email." : "Proctor CSV needs a header and at least 1 email.");
                return;
            }

            const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase());
            const emailIndex = headers.findIndex(h => ["email", "proctoremail", "proctor_email", "giám thị", "giamthi", "giam_thi"].includes(h.replace(/\s+/g, "")));
            if (emailIndex < 0) {
                setError(locale === "vi" ? "File giám thị phải có cột email." : "Proctor file must contain an email column.");
                return;
            }

            const emailSet = new Set<string>();
            for (const line of lines.slice(1)) {
                const values = parseCsvLine(line);
                const email = String(values[emailIndex] || "").trim().toLowerCase();
                if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    emailSet.add(email);
                }
            }

            const proctorEmails = Array.from(emailSet);
            if (proctorEmails.length === 0) {
                setError(locale === "vi" ? "Không tìm thấy email giám thị hợp lệ trong file." : "No valid proctor emails found in file.");
                return;
            }

            setError("");
            setFormData(prev => ({
                ...prev,
                proctorFileName: file.name,
                proctorEmails,
            }));
        } catch (err: any) {
            setError(err?.message || (locale === "vi" ? "Không đọc được file giám thị." : "Cannot read proctor file."));
        }
    };

    const handleFileChange = (campus: string, type: "registration" | "classSchedule") => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith(".csv") && !file.name.endsWith(".xlsx")) {
            toast.error(t("errors.uploadFile"));
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            const content = base64.split(",")[1];
            setFormData(prev => ({
                ...prev,
                [type === "registration" ? "campusFiles" : "classScheduleFiles"]: {
                    ...prev[type === "registration" ? "campusFiles" : "classScheduleFiles"],
                    [campus]: { fileData: content, fileName: file.name }
                }
            }));
        };
        reader.readAsDataURL(file);
    };

    const handleToggleRoom = (roomId: string) => {
        setFormData(prev => {
            const isSelected = prev.selectedRooms.includes(roomId);
            if (isSelected) {
                return { ...prev, selectedRooms: prev.selectedRooms.filter(id => id !== roomId) };
            } else {
                return { ...prev, selectedRooms: [...prev.selectedRooms, roomId] };
            }
        });
    };

    const handleSelectAllRooms = () => {
        if (formData.selectedRooms.length === filteredRooms.length) {
            setFormData(prev => ({ ...prev, selectedRooms: [] }));
        } else {
            setFormData(prev => ({ ...prev, selectedRooms: filteredRooms.map(r => r.id) }));
        }
    };

    const handleAutoGenerate = async () => {
        if (!formData.semesterId) {
            setError(t("errors.selectSemester"));
            return;
        }
        const missingFile = formData.campus.find(c => !formData.campusFiles[c]?.fileData);
        if (missingFile) {
            setError(
                locale === "vi"
                    ? `Vui lòng tải lên file đăng ký sinh viên cho cơ sở: ${missingFile}`
                    : `Please upload student registration file for campus: ${missingFile}`,
            );
            return;
        }
        if (formData.selectedRooms.length === 0) {
            setError(t("errors.selectRoom"));
            return;
        }

        const weekNum = parseInt(formData.targetWeek);
        if (isNaN(weekNum) || weekNum < 1 || weekNum > maxWeeks) {
            setError(t("errors.finalWeekInvalid", { max: maxWeeks }));
            return;
        }

        try {
            setError("");
            // Build per-campus file data array
            const campusFilesArray = formData.campus.map(c => ({
                campus: c,
                fileData: formData.campusFiles[c]?.fileData,
            }));
            const classScheduleFilesArray = formData.campus
                .filter(c => !!formData.classScheduleFiles[c]?.fileData)
                .map(c => ({
                    campus: c,
                    fileData: formData.classScheduleFiles[c]?.fileData,
                }));

            const payload: any = {
                semesterId: formData.semesterId,
                campus: formData.campus,
                selectedType: formData.selectedType,
                roomIds: formData.selectedRooms,
                fileData: campusFilesArray[0]?.fileData,
                campusFiles: campusFilesArray,
                classScheduleFiles: classScheduleFilesArray,
                examDays: parseInt(formData.examDays),
                proctorEmails: formData.proctorEmails,
            };

            // Map selectedType to specific week field
            switch (formData.selectedType) {
                case "FE": payload.finalWeek = weekNum; break;
                case "RE": payload.retakeWeek = weekNum; break;
                case "PE": payload.practicalWeek = weekNum; break;
                case "COURSERA_FE": payload.courseraWeek = weekNum; break;
                case "COURSERA_RE": payload.courseraRetakeWeek = weekNum; break;
            }

            await autoGenerateMutation.mutateAsync(payload);
            setIsSuccess(true);
            toast.success(t("success"));
        } catch (err: any) {
            const apiMessage = err?.response?.data?.message;
            const message = Array.isArray(apiMessage)
                ? apiMessage.join(". ")
                : (apiMessage || err?.message || t("errors.failed"));
            setError(message);
        }
    };

    const handleClose = () => {
        setIsSuccess(false);
        setError("");
        setFormData({
            semesterId: "",
            campus: ["HCM"],
            selectedType: "FE",
            targetWeek: "",
            examDays: "6",
            selectedRooms: [],
            proctorFileName: "",
            proctorEmails: [],
            campusFiles: {},
            classScheduleFiles: {},
        });
        setFailedItems([]);
        setRoomPage(1);
        setRoomFilter("");
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
            <Card className="w-full max-w-2xl border-none shadow-xl max-h-[90vh] flex flex-col">
                <CardContent className="p-0 flex flex-col h-full overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-50 rounded-lg">
                                <Zap className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{t("title")}</h3>
                                <p className="text-sm text-slate-500">{t("description")}</p>
                            </div>
                        </div>
                        <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {!isSuccess ? (
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-600 font-medium">{error}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4 text-slate-400" />
                                        {t("semester")}
                                    </label>
                                    <select
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                        value={formData.semesterId}
                                        onChange={(e) => setFormData({ ...formData, semesterId: e.target.value })}
                                    >
                                        <option value="">{t("selectSemester")}</option>
                                        {semesters.map(sem => (
                                            <option key={sem.id} value={sem.id}>{sem.code} - {sem.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-slate-400" />
                                            {t("campus")}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const allSelected = formData.campus.length === CAMPUSES.length;
                                                setFormData({ ...formData, campus: allSelected ? ["HCM"] : [...CAMPUSES], selectedRooms: [] });
                                                setRoomPage(1);
                                            }}
                                            className="text-[10px] text-orange-600 font-bold hover:underline"
                                        >
                                            {formData.campus.length === CAMPUSES.length ? t("deselectAll") : t("selectAll")}
                                        </button>
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {CAMPUSES.map(campus => (
                                            <button
                                                key={campus}
                                                type="button"
                                                onClick={() => {
                                                    const isSelected = formData.campus.includes(campus);
                                                    let newCampuses = [];
                                                    if (isSelected) {
                                                        newCampuses = formData.campus.filter(c => c !== campus);
                                                        if (newCampuses.length === 0) newCampuses = [campus]; // Keep at least one or allow empty? Better keep one
                                                    } else {
                                                        newCampuses = [...formData.campus, campus];
                                                    }
                                                    setFormData({ ...formData, campus: newCampuses, selectedRooms: [] });
                                                    setRoomPage(1);
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${formData.campus.includes(campus)
                                                    ? "bg-orange-500 border-orange-500 text-white shadow-sm"
                                                    : "bg-white border-slate-200 text-slate-600 hover:border-orange-200"
                                                    }`}
                                            >
                                                {campus}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Users className="h-4 w-4 text-slate-400" />
                                    {locale === "vi" ? "Danh sách giám thị" : "Proctor list"}
                                    <span className="text-xs text-slate-400 font-normal">
                                        {locale === "vi" ? "(CSV có cột email)" : "(CSV with email column)"}
                                    </span>
                                </label>
                                <div
                                    onClick={() => document.getElementById("auto-proctor-file")?.click()}
                                    className={`border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all ${formData.proctorEmails.length > 0
                                        ? "border-emerald-500 bg-emerald-50"
                                        : "border-slate-200 hover:border-orange-400 hover:bg-slate-50"
                                        }`}
                                >
                                    <input
                                        type="file"
                                        id="auto-proctor-file"
                                        className="hidden"
                                        accept=".csv"
                                        onChange={handleProctorFileChange}
                                    />
                                    {formData.proctorEmails.length > 0 ? (
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-emerald-900 truncate">{formData.proctorFileName}</p>
                                                <p className="text-xs text-emerald-700">
                                                    {locale === "vi"
                                                        ? `${formData.proctorEmails.length} email giám thị hợp lệ`
                                                        : `${formData.proctorEmails.length} valid proctor emails`}
                                                </p>
                                            </div>
                                            <FileText className="h-6 w-6 text-emerald-500 shrink-0" />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 text-slate-400">
                                            <Upload className="h-6 w-6" />
                                            <p className="text-xs font-semibold text-slate-600">
                                                {locale === "vi" ? "Tải lên CSV email giám thị" : "Upload proctor email CSV"}
                                            </p>
                                            <p className="text-[10px]">
                                                {locale === "vi" ? "Cột bắt buộc: email" : "Required column: email"}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    {locale === "vi"
                                        ? "Hệ thống sẽ tự phân ngẫu nhiên giám thị, ưu tiên các ca trong cùng ngày nằm liền nhau để giảm thời gian chờ."
                                        : "The system randomly assigns proctors while preferring contiguous same-day slots to reduce waiting time."}
                                </p>
                            </div>

                            {/* Per-Campus File Upload */}
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Upload className="h-4 w-4 text-slate-400" />
                                        {locale === "vi" ? "File đăng ký" : "Registration Files"}
                                        <span className="text-xs text-slate-400 font-normal">
                                            {locale === "vi" ? "(bắt buộc cho từng cơ sở)" : "(required for each campus)"}
                                        </span>
                                    </label>
                                    <div className={`grid gap-3 ${formData.campus.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                        {formData.campus.map(campus => {
                                            const campusFile = formData.campusFiles[campus];
                                            return (
                                                <div key={campus} className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-white bg-orange-500 px-2 py-0.5 rounded-md">{campus}</span>
                                                        {campusFile && <span className="text-xs text-emerald-600 font-semibold">✓ Uploaded</span>}
                                                    </div>
                                                    <div
                                                        onClick={() => document.getElementById(`reg-file-${campus}`)?.click()}
                                                        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${campusFile
                                                            ? "border-orange-500 bg-orange-50"
                                                            : "border-slate-200 hover:border-orange-400 hover:bg-slate-50"
                                                            }`}
                                                    >
                                                        <input
                                                            type="file"
                                                            id={`reg-file-${campus}`}
                                                            className="hidden"
                                                            accept=".csv,.xlsx"
                                                            onChange={handleFileChange(campus, "registration")}
                                                        />
                                                        {campusFile ? (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <FileText className="h-6 w-6 text-orange-500" />
                                                                <p className="text-xs font-bold text-orange-900 truncate max-w-full">{campusFile.fileName}</p>
                                                                <p className="text-[10px] text-orange-600">{t("clickToChange")}</p>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-1 text-slate-400">
                                                                <Upload className="h-6 w-6" />
                                                                <p className="text-xs font-semibold text-slate-600">{t("uploadPlaceholder")}</p>
                                                                <p className="text-[10px]">.csv or .xlsx</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4 text-slate-400" />
                                        {locale === "vi" ? "File lịch học" : "Class Schedule Files"}
                                        <span className="text-xs text-slate-400 font-normal">
                                            {locale === "vi" ? "(tùy chọn, để tránh xung đột)" : "(optional, for conflict avoidance)"}
                                        </span>
                                    </label>
                                    <div className={`grid gap-3 ${formData.campus.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                        {formData.campus.map(campus => {
                                            const schedFile = formData.classScheduleFiles[campus];
                                            return (
                                                <div key={campus} className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-white bg-blue-500 px-2 py-0.5 rounded-md">{campus}</span>
                                                        {schedFile && <span className="text-xs text-emerald-600 font-semibold">✓ Uploaded</span>}
                                                    </div>
                                                    <div
                                                        onClick={() => document.getElementById(`sched-file-${campus}`)?.click()}
                                                        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${schedFile
                                                            ? "border-blue-500 bg-blue-50"
                                                            : "border-slate-200 hover:border-blue-400 hover:bg-slate-50"
                                                            }`}
                                                    >
                                                        <input
                                                            type="file"
                                                            id={`sched-file-${campus}`}
                                                            className="hidden"
                                                            accept=".csv,.xlsx"
                                                            onChange={handleFileChange(campus, "classSchedule")}
                                                        />
                                                        {schedFile ? (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <FileText className="h-6 w-6 text-blue-500" />
                                                                <p className="text-xs font-bold text-blue-900 truncate max-w-full">{schedFile.fileName}</p>
                                                                <p className="text-[10px] text-blue-600">{t("clickToChange")}</p>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-1 text-slate-400">
                                                                <Upload className="h-6 w-6" />
                                                                <p className="text-xs font-semibold text-slate-600">{locale === "vi" ? "Tải lên lịch học" : "Upload Class Schedule"}</p>
                                                                <p className="text-[10px]">.csv or .xlsx</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-slate-400" />
                                        {locale === "vi" ? "Loại kỳ thi" : "Exam Type"}
                                    </label>
                                    <select
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                        value={formData.selectedType}
                                        onChange={(e) => setFormData({ ...formData, selectedType: e.target.value as any })}
                                    >
                                        <option value="FE">{locale === "vi" ? "Thi cuối kỳ (FE)" : "Final Exam (FE)"}</option>
                                        <option value="RE">{locale === "vi" ? "Thi lại (RE)" : "Retake Exam (RE)"}</option>
                                        <option value="PE">{locale === "vi" ? "Thi thực hành (PE)" : "Practical Exam (PE)"}</option>
                                        <option value="COURSERA_FE">Coursera (FE)</option>
                                        <option value="COURSERA_RE">Coursera (RE)</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-semibold text-slate-700">{locale === "vi" ? "Tuần thi" : "Week Number"}</label>
                                        {selectedSemester && (
                                            <span className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-bold">
                                                {t("maxWeeks", { count: maxWeeks })}
                                            </span>
                                        )}
                                    </div>
                                    <input
                                        type="number"
                                        min={1}
                                        max={maxWeeks}
                                        placeholder={locale === "vi" ? "Nhập tuần (1-15)" : "Enter week (1-15)"}
                                        className={`w-full px-3 py-2 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${formData.targetWeek && (parseInt(formData.targetWeek) > maxWeeks || parseInt(formData.targetWeek) < 1)
                                            ? "border-red-500 bg-red-50" : "border-slate-200"
                                            }`}
                                        value={formData.targetWeek}
                                        onChange={(e) => setFormData({ ...formData, targetWeek: e.target.value })}
                                    />
                                    <div className="flex items-center justify-between px-1">
                                        <p className="text-[10px] text-slate-400 font-medium">{locale === "vi" ? "Ví dụ" : t("example")}: 11</p>
                                        {formData.targetWeek && !isNaN(parseInt(formData.targetWeek)) && (
                                            <p className="text-[10px] text-orange-600 font-bold">{getWeekRange(formData.targetWeek)}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4 text-slate-400" />
                                        {locale === "vi" ? "Số ngày thi / tuần" : "Exam Days / Week"}
                                    </label>
                                    <select
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                        value={formData.examDays}
                                        onChange={(e) => setFormData({ ...formData, examDays: e.target.value })}
                                    >
                                        <option value="1">{locale === "vi" ? "1 ngày" : "1 Day"}</option>
                                        <option value="2">{locale === "vi" ? "2 ngày (Thứ 2 - Thứ 3)" : "2 Days (Mon - Tue)"}</option>
                                        <option value="3">{locale === "vi" ? "3 ngày (Thứ 2 - Thứ 4)" : "3 Days (Mon - Wed)"}</option>
                                        <option value="4">{locale === "vi" ? "4 ngày (Thứ 2 - Thứ 5)" : "4 Days (Mon - Thu)"}</option>
                                        <option value="5">{locale === "vi" ? "5 ngày (Thứ 2 - Thứ 6)" : "5 Days (Mon - Fri)"}</option>
                                        <option value="6">{locale === "vi" ? "6 ngày (Thứ 2 - Thứ 7)" : "6 Days (Mon - Sat)"}</option>
                                        <option value="7">{locale === "vi" ? "7 ngày (Thứ 2 - Chủ nhật)" : "7 Days (Mon - Sun)"}</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-slate-700">{t("selectRooms", { count: formData.selectedRooms.length })}</label>
                                    <button
                                        type="button"
                                        onClick={handleSelectAllRooms}
                                        className="text-xs text-orange-600 hover:underline font-medium"
                                    >
                                        {formData.selectedRooms.length === filteredRooms.length ? t("deselectAll") : t("selectAll")}
                                    </button>
                                </div>

                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder={t("searchRoom")}
                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 transition-all font-medium"
                                        value={roomFilter}
                                        onChange={(e) => {
                                            setRoomFilter(e.target.value);
                                            setRoomPage(1);
                                        }}
                                    />
                                </div>

                                <div className="grid grid-cols-6 gap-2 p-3 border rounded-xl bg-slate-50/50 min-h-[120px] content-start">
                                    {isLoadingRooms ? (
                                        <div className="col-span-6 py-8 text-center text-xs text-slate-400">
                                            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 opacity-50" />
                                            {tCommon("loading")}
                                        </div>
                                    ) : paginatedRooms.length === 0 ? (
                                        <div className="col-span-6 py-8 text-center text-xs text-slate-400">{t("noRooms")}</div>
                                    ) : (
                                        paginatedRooms.map(room => (
                                            <button
                                                key={room.id}
                                                type="button"
                                                onClick={() => handleToggleRoom(room.id)}
                                                className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-bold border transition-all ${formData.selectedRooms.includes(room.id)
                                                    ? "bg-orange-600 border-orange-600 text-white shadow-sm"
                                                    : "bg-white border-slate-200 text-slate-600 hover:border-orange-400 hover:bg-orange-50/50"
                                                    }`}
                                            >
                                                <span className="truncate mr-1">{room.roomNumber}</span>
                                                {formData.selectedRooms.includes(room.id) ? (
                                                    <Check className="h-3 w-3 flex-shrink-0" />
                                                ) : (
                                                    <div className="h-3 w-3 border border-slate-200 rounded-sm flex-shrink-0" />
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>

                                {/* Room Pagination Footer */}
                                {totalRoomPages > 1 && (
                                    <div className="flex items-center justify-between px-1 pt-1">
                                        <div className="text-[10px] text-slate-400 font-medium italic">
                                            {tCommon("showing")} {(roomPage - 1) * roomsPerPage + 1}-
                                            {Math.min(roomPage * roomsPerPage, filteredRooms.length)} {tCommon("of")} {filteredRooms.length}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setRoomPage(p => Math.max(1, p - 1))}
                                                disabled={roomPage === 1}
                                                className="h-6 w-6 p-0 rounded-md"
                                            >
                                                <X className="h-3 w-3 rotate-90" /> {/* Chevron placeholder or use others */}
                                            </Button>

                                            <div className="flex items-center gap-0.5">
                                                {Array.from({ length: Math.min(5, totalRoomPages) }, (_, i) => {
                                                    let p = i + 1;
                                                    if (totalRoomPages > 5) {
                                                        if (roomPage > 3) p = roomPage - 2 + i;
                                                        if (roomPage > totalRoomPages - 2) p = totalRoomPages - 4 + i;
                                                    }
                                                    if (p < 1 || p > totalRoomPages) return null;
                                                    return (
                                                        <button
                                                            key={p}
                                                            onClick={() => setRoomPage(p)}
                                                            className={`h-6 w-6 text-[10px] font-bold rounded-md transition-all ${roomPage === p
                                                                ? "bg-orange-100 text-orange-700"
                                                                : "text-slate-400 hover:bg-slate-100"
                                                                }`}
                                                        >
                                                            {p}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setRoomPage(p => Math.min(totalRoomPages, p + 1))}
                                                disabled={roomPage === totalRoomPages}
                                                className="h-6 w-6 p-0 rounded-md"
                                            >
                                                <X className="h-3 w-3 -rotate-90" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 p-6 text-center space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                            <div className="flex justify-center">
                                <div className="p-4 bg-green-50 rounded-full">
                                    <CheckCircle className="h-16 w-16 text-green-500" />
                                </div>
                            </div>
                            <h4 className="text-xl font-bold text-slate-900">{t("success")}</h4>
                            <p className="text-slate-600 max-w-sm mx-auto">
                                {locale === "vi"
                                    ? "Hệ thống đang tạo và xử lý lịch thi ở nền. Vui lòng chờ."
                                    : "The exam schedules generation is running and processing in the background. Please wait."}
                            </p>
                            <div className="mt-6 pt-6">
                                <Button
                                    onClick={handleClose}
                                    className="bg-orange-500 hover:bg-orange-600 text-white min-w-[200px]"
                                >
                                    {tDashboard("detailSchedule.back")}
                                </Button>
                            </div>
                        </div>
                    )}

                    {!isSuccess && (
                        <div className="p-6 border-t flex items-center justify-end gap-3 flex-shrink-0 bg-slate-50/50">
                            <Button variant="outline" onClick={handleClose} disabled={autoGenerateMutation.isPending}>
                                {t("cancel")}
                            </Button>
                            <Button
                                className="bg-orange-500 hover:bg-orange-600 text-white min-w-[140px]"
                                onClick={handleAutoGenerate}
                                disabled={autoGenerateMutation.isPending || isInvalid}
                            >
                                {autoGenerateMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t("generating")}
                                    </>
                                ) : (
                                    <>
                                        <Zap className="mr-2 h-4 w-4" />
                                        {t("generate")}
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>,
        document.body
    );
}
