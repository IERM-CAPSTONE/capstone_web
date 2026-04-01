"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useLocale } from "next-intl";
import {
  ScanFace,
  RefreshCw,
  Filter,
  Loader2,
  ShieldCheck,
  ShieldX,
  ChevronDown,
  X,
} from "lucide-react";
import { attendanceLogsApi, AttendanceLogItem, AttendanceLogStatus } from "@/lib/api/attendance-logs";
import { cn } from "@/lib/utils/cn";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const STATUS_STYLES: Record<AttendanceLogStatus, string> = {
  SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ERROR: "bg-rose-50 text-rose-700 border-rose-200",
};

const TEXT = {
  vi: {
    title: "Nhật ký điểm danh",
    subtitle: "Theo dõi nhật ký điểm danh bằng khuôn mặt",
    refresh: "Làm mới",
    toastLoadError: "Không thể tải nhật ký điểm danh",
    filters: "BỘ LỌC",
    examSessionId: "Mã ca thi",
    deviceId: "Mã thiết bị",
    studentCode: "Mã sinh viên",
    studentName: "Tên sinh viên",
    status: "Trạng thái",
    allStatuses: "Tất cả trạng thái",
    roomStatus: "Trạng thái phòng",
    allRoomStatuses: "Tất cả phòng",
    correctOnly: "Đúng phòng",
    wrongOnly: "Sai phòng",
    reset: "Đặt lại",
    success: "Thành công",
    error: "Lỗi",
    successfulLogs: "Lượt điểm danh thành công",
    failedLogs: "Lượt điểm danh thất bại",
    headers: ["Sinh viên", "Ca thi", "Trạng thái", "Độ tin cậy", "Phòng", "Thiết bị", "Thời gian"],
    loading: "Đang tải dữ liệu...",
    empty: "Không có dữ liệu log.",
    correctRoom: "Đúng phòng",
    wrongRoom: "Sai phòng",
    page: "Trang",
    prev: "Trước",
    next: "Sau",
    details: "Chi tiết log điểm danh",
    roomCheck: "Kiểm tra phòng",
    timestamp: "Thời gian",
    message: "Thông điệp",
  },
  en: {
    title: "Attendance Logs",
    subtitle: "Track face attendance logs",
    refresh: "Refresh",
    toastLoadError: "Unable to load attendance logs",
    filters: "FILTERS",
    examSessionId: "Exam Session ID",
    deviceId: "Device ID",
    studentCode: "Student Code",
    studentName: "Student Name",
    status: "Status",
    allStatuses: "All statuses",
    roomStatus: "Room status",
    allRoomStatuses: "All rooms",
    correctOnly: "Correct room",
    wrongOnly: "Wrong room",
    reset: "Reset",
    success: "Success",
    error: "Error",
    successfulLogs: "Successful logs",
    failedLogs: "Failed logs",
    headers: ["Student", "Exam Session", "Status", "Confidence", "Room", "Device", "Time"],
    loading: "Loading data...",
    empty: "No attendance logs found.",
    correctRoom: "Correct room",
    wrongRoom: "Wrong room",
    page: "Page",
    prev: "Previous",
    next: "Next",
    details: "Attendance Log Details",
    roomCheck: "Room Check",
    timestamp: "Timestamp",
    message: "Message",
  },
};

export default function ExamOfficerAttendanceLogsPage() {
  const locale = useLocale();
  const t = locale === "vi" ? TEXT.vi : TEXT.en;

  const [logs, setLogs] = useState<AttendanceLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const [examSessionId, setExamSessionId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [status, setStatus] = useState<AttendanceLogStatus | "">("");
  const [roomStatus, setRoomStatus] = useState<"" | "CORRECT" | "WRONG">("");
  const [studentCode, setStudentCode] = useState("");
  const [studentName, setStudentName] = useState("");

  const [selectedLog, setSelectedLog] = useState<AttendanceLogItem | null>(null);
  const [debouncedExamSessionId, setDebouncedExamSessionId] = useState("");
  const [debouncedDeviceId, setDebouncedDeviceId] = useState("");
  const [debouncedStudentCode, setDebouncedStudentCode] = useState("");
  const [debouncedStudentName, setDebouncedStudentName] = useState("");

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await attendanceLogsApi.list({
        page,
        limit: 20,
        examSessionId: debouncedExamSessionId || undefined,
        deviceId: debouncedDeviceId || undefined,
        status: status || undefined,
        isCorrectRoom:
          roomStatus === "CORRECT" ? true : roomStatus === "WRONG" ? false : undefined,
      });
      setLogs(response.data ?? []);
      setTotalPages(response.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch attendance logs", error);
      toast.error(t.toastLoadError);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedExamSessionId, debouncedDeviceId, status, roomStatus, t.toastLoadError]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    const codeQuery = debouncedStudentCode.trim().toLowerCase();
    const nameQuery = debouncedStudentName.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesCode = codeQuery ? log.studentCode?.toLowerCase().includes(codeQuery) : true;
      const matchesName = nameQuery ? log.studentName?.toLowerCase().includes(nameQuery) : true;
      return matchesCode && matchesName;
    });
  }, [logs, debouncedStudentCode, debouncedStudentName]);

  const successCount = logs.filter((log) => log.status === "SUCCESS").length;
  const errorCount = logs.filter((log) => log.status === "ERROR").length;

  const handleReset = () => {
    setExamSessionId("");
    setDeviceId("");
    setStatus("");
    setRoomStatus("");
    setStudentCode("");
    setStudentName("");
    setPage(1);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedExamSessionId(examSessionId.trim());
      setDebouncedDeviceId(deviceId.trim());
      setDebouncedStudentCode(studentCode.trim());
      setDebouncedStudentName(studentName.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [examSessionId, deviceId, studentCode, studentName]);

  return (
    <div className="min-h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <ScanFace className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900">{t.title}</h1>
              <p className="text-xs text-slate-400">{t.subtitle}</p>
            </div>
          </div>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            {t.refresh}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors rounded-xl"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-orange-500" />
              <span>{t.filters}</span>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", filtersOpen && "rotate-180")} />
          </button>

          {filtersOpen && (
            <div className="px-5 pb-5 border-t border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3 mt-4">
                <InputField label={t.examSessionId} value={examSessionId} onChange={setExamSessionId} placeholder={t.examSessionId} />
                <InputField label={t.deviceId} value={deviceId} onChange={setDeviceId} placeholder={t.deviceId} />
                <InputField label={t.studentCode} value={studentCode} onChange={setStudentCode} placeholder={t.studentCode} />
                <InputField label={t.studentName} value={studentName} onChange={setStudentName} placeholder={t.studentName} />
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{t.status}</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as AttendanceLogStatus | "")}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                  >
                    <option value="">{t.allStatuses}</option>
                    <option value="SUCCESS">{t.success}</option>
                    <option value="ERROR">{t.error}</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{t.roomStatus}</label>
                  <select
                    value={roomStatus}
                    onChange={(e) => setRoomStatus(e.target.value as "" | "CORRECT" | "WRONG")}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                  >
                    <option value="">{t.allRoomStatuses}</option>
                    <option value="CORRECT">{t.correctOnly}</option>
                    <option value="WRONG">{t.wrongOnly}</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={handleReset}
                  className="px-5 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <X className="w-3.5 h-3.5" /> {t.reset}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />} value={successCount} label={t.successfulLogs} color="text-emerald-600" bg="bg-emerald-50" />
          <StatCard icon={<ShieldX className="w-5 h-5 text-rose-600" />} value={errorCount} label={t.failedLogs} color="text-rose-600" bg="bg-rose-50" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {t.headers.map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wide">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="py-16 text-center text-slate-400"><div className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />{t.loading}</div></td></tr>
                ) : filteredLogs.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center text-slate-400">{t.empty}</td></tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-orange-50/40 cursor-pointer" onClick={() => setSelectedLog(log)}>
                      <td className="px-4 py-3"><div className="text-xs font-bold text-slate-800">{log.studentName ?? "—"}</div><div className="text-[11px] text-slate-400 font-mono">{log.studentCode ?? "—"}</div></td>
                      <td className="px-4 py-3 text-xs text-slate-600 font-mono">{log.examSessionId ?? "—"}</td>
                      <td className="px-4 py-3"><span className={cn("px-2 py-1 rounded-full text-[10px] font-bold border", STATUS_STYLES[log.status])}>{log.status === "SUCCESS" ? t.success : t.error}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-600">{log.confidence !== null && log.confidence !== undefined ? `${(log.confidence * 100).toFixed(1)}%` : "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{log.isCorrectRoom === null || log.isCorrectRoom === undefined ? "—" : log.isCorrectRoom ? t.correctRoom : t.wrongRoom}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 font-mono">{log.deviceId ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{log.timestamp ? format(new Date(log.timestamp), "dd/MM/yyyy HH:mm") : format(new Date(log.createdAt), "dd/MM/yyyy HH:mm")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/60">
            <span className="text-xs text-slate-500">{t.page} {page} / {totalPages}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1} className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-white">{t.prev}</button>
              <button onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages} className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-white">{t.next}</button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{t.details}</DialogTitle></DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[70vh] pr-2">
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.headers[0]}</div>
                  <div className="mt-2 text-sm font-semibold text-slate-800">{selectedLog.studentName ?? "—"}</div>
                  <div className="text-xs text-slate-500 font-mono">{selectedLog.studentCode ?? "—"}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailItem label={t.examSessionId} value={selectedLog.examSessionId ?? "—"} mono />
                  <DetailItem label={t.deviceId} value={selectedLog.deviceId ?? "—"} mono />
                  <DetailItem label="UID" value={selectedLog.uid?.toString() ?? "—"} mono />
                  <DetailItem label={t.studentCode} value={selectedLog.studentId ?? "—"} mono />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailItem label={t.status} value={selectedLog.status === "SUCCESS" ? t.success : t.error} badgeClass={STATUS_STYLES[selectedLog.status]} />
                  <DetailItem label="Confidence" value={selectedLog.confidence !== null && selectedLog.confidence !== undefined ? `${(selectedLog.confidence * 100).toFixed(2)}%` : "—"} />
                  <DetailItem label={t.roomCheck} value={selectedLog.isCorrectRoom === null || selectedLog.isCorrectRoom === undefined ? "—" : selectedLog.isCorrectRoom ? t.correctRoom : t.wrongRoom} />
                  <DetailItem label={t.timestamp} value={selectedLog.timestamp ? format(new Date(selectedLog.timestamp), "dd/MM/yyyy HH:mm:ss") : format(new Date(selectedLog.createdAt), "dd/MM/yyyy HH:mm:ss")} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.message}</div>
                  <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">{selectedLog.message ?? "—"}</div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
      />
    </div>
  );
}

function StatCard({ icon, value, label, color, bg }: { icon: React.ReactNode; value: number; label: string; color: string; bg: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", bg)}>{icon}</div>
      <div>
        <p className={cn("text-2xl font-black", color)}>{value}</p>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
      </div>
    </div>
  );
}

function DetailItem({ label, value, mono, badgeClass }: { label: string; value: string; mono?: boolean; badgeClass?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</div>
      {badgeClass ? (
        <span className={cn("mt-2 inline-flex px-2 py-1 rounded-full text-[10px] font-bold border", badgeClass)}>{value}</span>
      ) : (
        <div className={cn("mt-2 text-sm font-semibold text-slate-800", mono && "font-mono")}>{value}</div>
      )}
    </div>
  );
}
