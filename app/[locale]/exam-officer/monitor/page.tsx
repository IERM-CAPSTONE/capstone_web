"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Users,
  UserCheck,
  Ticket,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  AlertTriangle,
  LayoutDashboard,
  Activity,
  Monitor,
  UserPlus,
  CheckCircle,
  ChevronRight,
  Send,
  Square,
  CheckSquare,
  MinusSquare,
  Zap,
  MessageSquare,
  X,
  History
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { monitorApi, SubjectMonitorSummary, SessionRoomDetail, SessionActivityItem } from "@/lib/api/monitor";
import { ticketsApi, TicketPriority, IssueType } from "@/lib/api/tickets";
import { studentExamsApi, StudentExam } from "@/lib/api/student-exams";
import { useSocket } from "@/hooks/use-socket";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { parseLocalDate } from "../exam-schedules/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ActiveStudentMatch = {
  studentExam: StudentExam;
  subject: SubjectMonitorSummary;
  session: SessionRoomDetail;
};

const ATTENDANCE_OPEN_BEFORE_MS = 40 * 60 * 1000;
const ATTENDANCE_CLOSE_AFTER_OPEN_MS = 10 * 60 * 1000;

type MonitorPhase = "Upcoming" | "Ongoing" | "Completed";
type AttendancePhase = "NotOpen" | "Open" | "Locked" | "Completed";

function getAttendanceOpenAt(examOpenTime: Date | null) {
  return examOpenTime ? new Date(examOpenTime.getTime() - ATTENDANCE_OPEN_BEFORE_MS) : null;
}

function getAttendanceCloseAt(examOpenTime: Date | null) {
  return examOpenTime ? new Date(examOpenTime.getTime() + ATTENDANCE_CLOSE_AFTER_OPEN_MS) : null;
}

function formatCountdownMs(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function resolveMonitorPhase(subject: SubjectMonitorSummary) {
  const now = new Date();
  const openTime = parseLocalDate(subject.examOpenTime);
  const closeTime = parseLocalDate(subject.examCloseTime);
  const attendanceOpenAt = getAttendanceOpenAt(openTime);

  if (!openTime || !closeTime) {
    return subject.status === "Completed" ? "Completed" : "Upcoming";
  }

  const isCompleted = subject.status === "Completed" || now >= closeTime;
  const isOngoing =
    subject.status === "Ongoing" ||
    (!!attendanceOpenAt && now >= attendanceOpenAt && now < closeTime);

  if (isCompleted) return "Completed";
  if (isOngoing) return "Ongoing";
  return "Upcoming";
}

function isExamOngoing(subject: SubjectMonitorSummary) {
  const now = new Date();
  const openTime = parseLocalDate(subject.examOpenTime);
  const closeTime = parseLocalDate(subject.examCloseTime);
  if (!openTime || !closeTime) return false;
  return now >= openTime && now < closeTime;
}

function resolveAttendancePhase(subject: SubjectMonitorSummary): AttendancePhase {
  const now = new Date();
  const openTime = parseLocalDate(subject.examOpenTime);
  const closeTime = parseLocalDate(subject.examCloseTime);

  if (!openTime || !closeTime) {
    return "NotOpen";
  }

  const attendanceOpenAt = getAttendanceOpenAt(openTime);
  const attendanceCloseAt = getAttendanceCloseAt(openTime);

  if (!attendanceOpenAt || !attendanceCloseAt) {
    return "NotOpen";
  }

  if (now >= closeTime) return "Completed";
  if (now < attendanceOpenAt) return "NotOpen";
  if (now < attendanceCloseAt) return "Open";
  return "Locked";
}

export default function MonitorDashboardPage() {
  const t = useTranslations("MonitorDashboard");
  const commonT = useTranslations("Common");
  const locale = useLocale();
  const { user } = useAuthStore();

  const [data, setData] = useState<SubjectMonitorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<SubjectMonitorSummary | null>(null);
  
  // Selection & Broadcast States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [sessionPhase, setSessionPhase] = useState<"CHECKIN" | "ONGOING">("CHECKIN");
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketStudentCode, setTicketStudentCode] = useState("");
  const [ticketIssueType, setTicketIssueType] = useState<IssueType>("Academic Violation");
  const [ticketIssueName, setTicketIssueName] = useState("Sinh viÃªn vi pháº¡m trong giá» thi");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketPriority, setTicketPriority] = useState<TicketPriority>("Normal");
  const [studentLookupLoading, setStudentLookupLoading] = useState(false);
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<ActiveStudentMatch[]>([]);

  const { on } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      const summary = await monitorApi.getSummary({});
      setData(summary);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch monitor summary:", error);
      toast.error("Failed to load monitor data");
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  // Real-time ticket updates
  useEffect(() => {
    const handleRefresh = () => {
      fetchData(); // Simplest way to update counts
    };

    const cleanups = [
      on?.("monitor:student_anomaly", handleRefresh),
      on?.("monitor:broadcast_sent", handleRefresh),
      on?.("monitor:ticket_count_changed", handleRefresh),
    ].filter(Boolean) as Array<() => void>;

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [on, fetchData]);

  useEffect(() => {
    const handleProctorCheckIn = () => {
      fetchData();
    };

    const cleanup = on?.("monitor:proctor-checkin", handleProctorCheckIn);
    return () => {
      if (cleanup) cleanup();
    };
  }, [on, fetchData]);

  useEffect(() => {
    const handleStudentCheckIn = () => {
      fetchData();
    };

    const cleanup = on?.("face_authenticated", handleStudentCheckIn);
    return () => {
      if (cleanup) cleanup();
    };
  }, [on, fetchData]);


  const globalStats = useMemo(() => {
    return data.reduce((acc, sub) => ({
      proctors: acc.proctors + sub.presentProctors,
      totalProctors: acc.totalProctors + sub.totalProctors,
      hall: acc.hall + sub.presentHallInvigilators,
      totalHall: acc.totalHall + sub.totalHallInvigilators,
      students: acc.students + sub.checkedInStudents,
      totalStudents: acc.totalStudents + sub.totalStudents,
      tickets: acc.tickets + sub.pendingTickets,
    }), { proctors: 0, totalProctors: 0, hall: 0, totalHall: 0, students: 0, totalStudents: 0, tickets: 0 });
  }, [data]);

  const filteredData = useMemo(() => {
    let result = data;

    // 1. Filter by monitor working mode
    result = result.filter(subject => {
      if (sessionPhase === "CHECKIN") return resolveAttendancePhase(subject) === "Open";
      return isExamOngoing(subject);
    });

    // 2. Filter by search term
    if (searchTerm) {
      result = result.filter(s =>
        s.subjectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.sessions.some(session => session.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (activeFilter === "missingProctor") {
      result = result.filter(s => s.presentProctors < s.totalProctors);
    } else if (activeFilter === "hasTickets") {
      result = result.filter(s => s.pendingTickets > 0);
    } else if (activeFilter === "lowAttendance") {
      result = result.filter(s => (s.checkedInStudents / s.totalStudents) < 0.5);
    }

    return result;
  }, [data, searchTerm, activeFilter, sessionPhase]);

  const activeSessionIndex = useMemo(() => {
    const entries = data
      .filter((subject) => resolveMonitorPhase(subject) === "Ongoing")
      .flatMap((subject) =>
        subject.sessions.map((session) => [
          session.sessionId,
          { subject, session },
        ] as const),
      );

    return new Map(entries);
  }, [data]);

  const defaultTicketIssueName =
    locale === "vi" ? "Sinh viên vi phạm trong giờ thi" : "Student violation during exam";

  useEffect(() => {
    setTicketIssueName((prev) => {
      if (
        !prev ||
        prev === "Sinh viên vi phạm trong giờ thi" ||
        prev === "Student violation during exam" ||
        prev.includes("vi phạm")
      ) {
        return defaultTicketIssueName;
      }
      return prev;
    });
  }, [defaultTicketIssueName]);

  const resetTicketModal = useCallback(() => {
    setTicketStudentCode("");
    setTicketIssueType("Academic Violation");
    setTicketIssueName(defaultTicketIssueName);
    setTicketDescription("");
    setTicketPriority("Normal");
    setStudentLookupLoading(false);
    setTicketSubmitting(false);
    setSelectedStudents([]);
  }, [defaultTicketIssueName]);

  const handleLookupStudent = useCallback(async () => {
    const normalizedCode = ticketStudentCode.trim().toUpperCase();
    if (!normalizedCode) {
      toast.error(locale === "vi" ? "Vui lòng nhập mã sinh viên" : "Please enter a student code");
      return;
    }

    setStudentLookupLoading(true);
    try {
      const response = await studentExamsApi.list({
        studentCode: normalizedCode,
        limit: 20,
      });

      const matchedExam = response.data.find((item) => activeSessionIndex.has(item.examSessionId));
      if (!matchedExam) {
        toast.error(locale === "vi" ? "Không tìm thấy sinh viên đang thi trong các ca đang diễn ra" : "No student found in the currently ongoing sessions");
        return;
      }

      const activeMatch = activeSessionIndex.get(matchedExam.examSessionId);
      if (!activeMatch) {
        toast.error(locale === "vi" ? "Không xác định được ca thi hiện tại của sinh viên" : "Could not determine the student's active session");
        return;
      }

      const nextMatch = {
        studentExam: matchedExam,
        subject: activeMatch.subject,
        session: activeMatch.session,
      };

      setSelectedStudents((prev) => {
        if (prev.some((item) => item.studentExam.id === nextMatch.studentExam.id)) {
          toast.info(locale === "vi" ? "Sinh viên này đã có trong danh sách" : "This student is already in the list");
          return prev;
        }

        toast.success(locale === "vi" ? "Đã thêm sinh viên vào danh sách ticket" : "Student added to ticket list");
        return [...prev, nextMatch];
      });
      setTicketStudentCode("");
    } catch (error) {
      console.error("Failed to lookup student by code", error);
      toast.error(locale === "vi" ? "Không thể tra cứu mã sinh viên lúc này" : "Unable to look up the student code right now");
    } finally {
      setStudentLookupLoading(false);
    }
  }, [activeSessionIndex, locale, ticketStudentCode]);

  const handleCreateTicketFromMonitor = useCallback(async () => {
    if (selectedStudents.length === 0) {
      toast.error(locale === "vi" ? "Vui lòng thêm ít nhất một sinh viên trước khi tạo ticket" : "Please add at least one student before creating a ticket");
      return;
    }

    const issueName = ticketIssueName.trim();
    if (!issueName) {
      toast.error(locale === "vi" ? "Vui lòng nhập tên ticket" : "Please enter a ticket title");
      return;
    }

    setTicketSubmitting(true);
    try {
      await Promise.all(
        selectedStudents.map((student) =>
          ticketsApi.create({
            issueName,
            issueType: ticketIssueType,
            description: ticketDescription.trim() || undefined,
            priority: ticketPriority,
            sessionId: student.session.sessionId,
            studentCode: student.studentExam.studentCode ?? "",
            confirmedAssignmentType: "HALL_INVIGILATOR",
          }),
        ),
      );

      toast.success(
        locale === "vi"
          ? `Đã tạo ${selectedStudents.length} ticket và chuyển cho giám thị hành lang`
          : `${selectedStudents.length} tickets created and assigned to the hall invigilator`,
      );
      setTicketModalOpen(false);
      resetTicketModal();
      fetchData();
    } catch (error) {
      console.error("Failed to create ticket from monitor", error);
      toast.error(locale === "vi" ? "Không thể tạo ticket lúc này" : "Unable to create the ticket right now");
    } finally {
      setTicketSubmitting(false);
    }
  }, [
    selectedStudents,
    ticketIssueName,
    ticketIssueType,
    ticketDescription,
    ticketPriority,
    resetTicketModal,
    fetchData,
    locale,
  ]);

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4 bg-[#F1F5F9] min-h-screen">
      {/* Sticky HUD Section */}
      <div className="sticky top-0 z-40 -mx-4 px-4 pt-2 pb-0 bg-[#F1F5F9]/95 backdrop-blur-sm space-y-2">
        {/* Super Compact Header & Stats Combined */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-3 rounded-t-2xl shadow-md border border-slate-200 border-b-0">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-100">
               <Monitor className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-none">{t("title")}</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {locale === "vi" ? "Cơ sở" : "Campus"} {user?.campus || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
             <MinimalStat icon={<UserCheck className="w-4 h-4 text-indigo-500" />} label={t("stats.totalProctors")} current={globalStats.proctors} total={globalStats.totalProctors} />
             <MinimalStat icon={<Users className="w-4 h-4 text-blue-500" />} label={t("stats.totalHall")} current={globalStats.hall} total={globalStats.totalHall} />
             <MinimalStat icon={<Activity className="w-4 h-4 text-emerald-500" />} label={t("stats.totalStudents")} current={globalStats.students} total={globalStats.totalStudents} />
             <MinimalStat 
                icon={<Ticket className="w-4 h-4" />} 
                label={t("stats.pendingTickets")} 
                current={globalStats.tickets} 
                total={0} 
                isAlert={globalStats.tickets > 0} 
                onClick={() => setActiveFilter(activeFilter === "hasTickets" ? null : "hasTickets")}
             />
          </div>

          <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-9 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs gap-2 shadow-sm"
                onClick={() => setTicketModalOpen(true)}
              >
                <Ticket className="w-3.5 h-3.5" />
                {locale === "vi" ? "Tạo ticket theo MSSV" : "Create Ticket by Student ID"}
              </Button>
              {false && (<Button
                size="sm"
                className="h-9 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs gap-2 shadow-sm"
                onClick={() => setTicketModalOpen(true)}
              >
                <Ticket className="w-3.5 h-3.5" />
                Táº¡o ticket theo MSSV
              </Button>)}
              <div className="relative group">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                 <Input 
                    placeholder={t("filters.searchPlaceholder")}
                    className="pl-9 h-9 w-40 bg-slate-50 border-slate-200 text-xs font-bold rounded-lg focus:ring-orange-500/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>
              <Button variant="outline" size="sm" className="h-9 border-slate-200 font-bold text-xs gap-2 shadow-sm" onClick={() => fetchData()}>
                <Clock className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                {commonT("refresh")}
              </Button>
          </div>
        </div>

        {/* Compact Filters & Counter */}
        <div className="flex items-center justify-between px-2 py-1">
            <div className="flex gap-2">
               <FilterTab
                 active={sessionPhase === "CHECKIN"}
                 onClick={() => setSessionPhase("CHECKIN")}
                 label={locale === "vi" ? "Đang check-in" : "Check-in Open"}
               />
               <FilterTab
                 active={sessionPhase === "ONGOING"}
                 onClick={() => setSessionPhase("ONGOING")}
                 label={locale === "vi" ? "Đang diễn ra" : "Ongoing Exam"}
               />
            </div>
            
            <div className="flex items-center">
              <div className="text-[11px] font-black text-slate-500 bg-slate-100/50 px-4 py-1.5 rounded-full border border-slate-200 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  {filteredData.length}{" "}
                  {sessionPhase === "CHECKIN"
                    ? (locale === "vi" ? "môn đang mở điểm danh" : "subjects open for check-in")
                    : (locale === "vi" ? "môn đang diễn ra" : "ongoing subjects")}
              </div>

              <div className="flex gap-2 ml-4">
                  <Button 
                    variant={isSelectionMode ? "primary" : "outline"} 
                    size="sm" 
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      setSelectedSubjectIds(new Set());
                    }}
                    className={cn(
                      "h-9 rounded-xl font-bold text-[10px] uppercase tracking-wider gap-2 px-4 transition-all active:scale-95 shadow-sm",
                      isSelectionMode ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "bg-white border-slate-100 text-slate-400"
                    )}
                  >
                    {isSelectionMode ? <X className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    {isSelectionMode
                      ? (locale === "vi" ? "Thoát chế độ phát thông báo" : "Exit Broadcast Mode")
                      : (locale === "vi" ? "Chế độ phát thông báo" : "Broadcast Mode")}
                  </Button>
                  
                  {isSelectionMode && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const allIds = new Set(filteredData.map(s => s.subjectCode));
                        setSelectedSubjectIds(selectedSubjectIds.size === filteredData.length ? new Set() : allIds);
                      }}
                      className="h-9 rounded-xl font-bold text-[10px] uppercase tracking-wider bg-white border-slate-100 text-slate-400 px-4 transition-all shadow-sm"
                    >
                      {selectedSubjectIds.size === filteredData.length
                        ? (locale === "vi" ? "Bỏ chọn tất cả" : "Deselect All")
                        : (locale === "vi" ? "Chọn tất cả" : "Select All")}
                    </Button>
                  )}
              </div>
            </div>
        </div>
      </div>

      <div className="pb-8">
          {filteredData.length === 0 ? (
            <Card className="p-12 text-center text-slate-400 font-medium bg-white/50 border-dashed">
                {commonT("noResults")}
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredData.map(subject => {
                const isSelected = selectedSubjectIds.has(subject.subjectCode);
                return (
                  <div 
                    key={subject.subjectCode} 
                    onClick={() => {
                      if (isSelectionMode) {
                        const next = new Set(selectedSubjectIds);
                        if (next.has(subject.subjectCode)) next.delete(subject.subjectCode);
                        else next.add(subject.subjectCode);
                        setSelectedSubjectIds(next);
                      } else {
                        setSelectedSubject(subject);
                      }
                    }} 
                    className={cn(
                      "cursor-pointer transition-all duration-300 relative",
                      isSelectionMode && isSelected ? "scale-95" : isSelectionMode ? "scale-[0.98] opacity-80" : ""
                    )}
                  >
                    {isSelectionMode && (
                      <div className={cn(
                        "absolute -top-1.5 -right-1.5 z-20 w-8 h-8 rounded-full border-4 border-white shadow-lg flex items-center justify-center transition-all duration-500",
                        isSelected ? "bg-orange-500 text-white scale-110 rotate-0" : "bg-slate-200 text-slate-400 scale-90 -rotate-12"
                      )}>
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <MinusSquare className="w-4 h-4" />}
                      </div>
                    )}
                    <SubjectCard
                      subject={subject}
                      t={t}
                      locale={locale}
                      isSelected={isSelectionMode && isSelected}
                    />
                  </div>
                );
              })}
            </div>
          )}
      </div>

      {/* Modern Room Details Popup */}
      <Dialog open={!!selectedSubject} onOpenChange={(open) => !open && setSelectedSubject(null)}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[85vh] p-0 overflow-hidden border-none rounded-[40px] shadow-2xl bg-slate-50/95 backdrop-blur-2xl">
          {selectedSubject && (
            <div className="flex max-h-[85vh] flex-col">
               {/* Custom Modal Header */}
               <div className="p-8 bg-white/80 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div className="flex flex-col">
                     <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-orange-100 text-orange-600">
                           <LayoutDashboard className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">
                           {selectedSubject.subjectCode}
                        </h2>
                        <StatusBadge subject={selectedSubject} t={t} />
                     </div>
                     <p className="text-sm font-bold text-slate-400 mt-2 ml-14 uppercase tracking-widest">
                        {locale === "vi" ? "Chi tiết phòng & điều phối" : "Room Details & Management Control"}
                     </p>
                  </div>
                  
                  <div className="flex gap-4 px-6 py-3 rounded-3xl bg-slate-50 border border-slate-100 shadow-inner">
                     <CompactStat label="Proctors" current={selectedSubject.presentProctors} total={selectedSubject.totalProctors} color="text-indigo-600" />
                     <div className="w-px h-10 bg-slate-200" />
                     <CompactStat label="Hall" current={selectedSubject.presentHallInvigilators} total={selectedSubject.totalHallInvigilators} color="text-blue-600" />
                     <div className="w-px h-10 bg-slate-200" />
                     <CompactStat label="Students" current={selectedSubject.checkedInStudents} total={selectedSubject.totalStudents} color="text-emerald-600" />
                  </div>
               </div>

               {/* Left insights + Right rooms */}
               <div className="flex-1 overflow-y-auto p-8">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                    <SubjectSessionBoards subject={selectedSubject} />

                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {selectedSubject.sessions.map((room) => (
                          <div key={room.sessionId} className="transform transition-all duration-300 hover:scale-[1.02]">
                            <RoomCard session={room} t={t} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={ticketModalOpen}
        onOpenChange={(open) => {
          setTicketModalOpen(open);
          if (!open) resetTicketModal();
        }}
      >
        <DialogContent className="max-w-[540px] rounded-[18px] border-none bg-white p-0 shadow-2xl overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/80 px-3.5 py-3">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[15px] font-black text-slate-900">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <Ticket className="h-3.5 w-3.5" />
                </div>
                {locale === "vi" ? "Tạo ticket theo mã sinh viên" : "Create ticket by student code"}
              </DialogTitle>
            </DialogHeader>
            <p className="mt-1.5 text-[11px] text-slate-500">
              {locale === "vi"
                ? "Dùng khi khảo thí phát hiện sinh viên vi phạm từ log hệ thống trong giờ thi."
                : "Use this when the exam office detects a student violation from system logs during an exam."}
            </p>
          </div>

          <div className="space-y-2.5 p-3">
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-[1fr_auto]">
              <div className="space-y-1">
                <label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                  {locale === "vi" ? "Mã sinh viên" : "Student code"}
                </label>
                <Input
                  value={ticketStudentCode}
                  onChange={(event) => setTicketStudentCode(event.target.value.toUpperCase())}
                  placeholder={locale === "vi" ? "Ví dụ: DE200143" : "Example: DE200143"}
                  className="h-7 rounded-lg border-slate-200 font-mono text-[12px] font-bold uppercase"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={handleLookupStudent}
                  disabled={studentLookupLoading}
                  className="h-7 rounded-lg bg-orange-600 px-3 text-[12px] text-white hover:bg-orange-500"
                >
                  {studentLookupLoading ? (locale === "vi" ? "Đang tra cứu..." : "Looking up...") : (locale === "vi" ? "Tra cứu" : "Lookup")}
                </Button>
              </div>
            </div>

            {selectedStudents.length > 0 ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
                      {locale === "vi" ? "Danh sách sinh viên đã chọn" : "Selected students"}
                    </p>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      {locale === "vi"
                        ? `${selectedStudents.length} sinh viên sẽ được tạo ticket`
                        : `${selectedStudents.length} students will receive tickets`}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white px-2 py-1.5 text-right shadow-sm ring-1 ring-emerald-100">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{locale === "vi" ? "Phân công mặc định" : "Default assignment"}</p>
                    <p className="mt-1 text-sm font-black text-emerald-700">{locale === "vi" ? "Giám thị hành lang" : "Hall invigilator"}</p>
                  </div>
                </div>

                <div className="max-h-36 overflow-y-auto pr-1">
                  <div className="flex flex-wrap gap-2">
                  {selectedStudents.map((student) => (
                    <div
                      key={student.studentExam.id}
                      className="relative min-w-[220px] max-w-[240px] flex-1 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-emerald-100"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-6 w-6 p-0 text-slate-400 hover:text-rose-600"
                        onClick={() =>
                          setSelectedStudents((prev) => prev.filter((item) => item.studentExam.id !== student.studentExam.id))
                        }
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <div className="min-w-0 pr-6">
                        <h3 className="truncate text-[13px] font-black text-slate-900">
                          {student.studentExam.studentCode}
                        </h3>
                        <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-700">
                          {student.subject.subjectCode} · {locale === "vi" ? "Phòng" : "Room"} {student.session.roomNumber}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">
                          {student.studentExam.studentName || (locale === "vi" ? "Không có tên" : "No name")}
                        </p>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-2.5 text-[12px] text-slate-500">
                {locale === "vi"
                  ? "Nhập từng MSSV rồi bấm tra cứu để thêm sinh viên vào danh sách tạo ticket."
                  : "Enter each student code and look it up to add students to the ticket list."}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                {locale === "vi" ? "Loại ticket" : "Ticket type"}
              </label>
              <select
                value={ticketIssueType}
                onChange={(event) => setTicketIssueType(event.target.value as IssueType)}
                className="h-7 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] font-bold text-slate-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
              >
                <option value="Academic Violation">{locale === "vi" ? "Vi phạm học vụ" : "Academic Violation"}</option>
                <option value="Technical Issue">{locale === "vi" ? "Sự cố kỹ thuật" : "Technical Issue"}</option>
                <option value="Room Management">{locale === "vi" ? "Quản lý phòng thi" : "Room Management"}</option>
                <option value="Face Mismatch">{locale === "vi" ? "Sai lệch khuôn mặt" : "Face Mismatch"}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                {locale === "vi" ? "Tên ticket" : "Ticket title"}
              </label>
              <Input
                value={ticketIssueName}
                onChange={(event) => setTicketIssueName(event.target.value)}
                placeholder={locale === "vi" ? "Ví dụ: Sinh viên vi phạm trong giờ thi" : "Example: Student violation during exam"}
                className="h-7 rounded-lg border-slate-200 text-[12px] font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                {locale === "vi" ? "Mô tả" : "Description"}
              </label>
              <textarea
                value={ticketDescription}
                onChange={(event) => setTicketDescription(event.target.value)}
                placeholder={locale === "vi" ? "Mô tả ngắn hành vi vi phạm được phát hiện từ log hệ thống..." : "Briefly describe the violation detected from the system logs..."}
                className="min-h-[52px] w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                {locale === "vi" ? "Mức ưu tiên" : "Priority"}
              </label>
              <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
                {(["Normal", "Urgent"] as TicketPriority[]).map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setTicketPriority(priority)}
                    className={cn(
                      "rounded-lg border px-2.5 py-1.5 text-[12px] font-black transition",
                      ticketPriority === priority
                        ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300",
                    )}
                  >
                    {locale === "vi"
                      ? ({ Normal: "Bình thường", Urgent: "Khẩn" } as Record<TicketPriority, string>)[priority]
                      : priority}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-3 py-2.5">
            <Button
              variant="outline"
              onClick={() => {
                setTicketModalOpen(false);
                resetTicketModal();
              }}
              className="h-7 rounded-lg px-3"
            >
              {commonT("cancel")}
            </Button>
            <Button
              onClick={handleCreateTicketFromMonitor}
              disabled={selectedStudents.length === 0 || ticketSubmitting}
              className="h-7 rounded-lg bg-orange-600 px-3 text-white hover:bg-orange-500"
            >
              {ticketSubmitting ? (locale === "vi" ? "Đang tạo..." : "Creating...") : (locale === "vi" ? "Tạo ticket" : "Create ticket")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Action Bar for Selection Mode */}
      {isSelectionMode && selectedSubjectIds.size > 0 && (
         <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-bottom-10 duration-500">
            <div className="bg-slate-900 text-white px-6 py-3 rounded-[24px] shadow-[0_25px_60px_rgba(0,0,0,0.3)] flex items-center gap-8 border border-white/10 backdrop-blur-xl">
               <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">{locale === "vi" ? "Mục tiêu" : "Targets"}</span>
                  <div className="flex items-center gap-2">
                     <span className="text-xl font-black tabular-nums">{selectedSubjectIds.size}</span>
                     <span className="text-xs font-bold text-slate-400 uppercase">{locale === "vi" ? "Môn" : "Subjects"}</span>
                  </div>
               </div>
               
               <div className="h-8 w-px bg-white/10" />
               
               <div className="flex gap-4">
                  <Button 
                    onClick={() => setSelectedSubjectIds(new Set())}
                    variant="ghost" 
                    className="h-10 px-4 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 font-black uppercase tracking-widest text-[9px]"
                  >
                    {locale === "vi" ? "Bỏ chọn" : "Clear"}
                  </Button>
                  <Button 
                    onClick={() => setIsBroadcastModalOpen(true)}
                    className="h-10 px-6 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest text-[10px] gap-2 shadow-xl shadow-orange-900/20 active:scale-95 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {locale === "vi" ? "Phát thông báo" : "Broadcast"}
                  </Button>
               </div>
            </div>
         </div>
      )}

      {/* Broadcast Center Modal */}
      <BroadcastModal 
         isOpen={isBroadcastModalOpen} 
         onClose={() => setIsBroadcastModalOpen(false)}
         targetCount={selectedSubjectIds.size}
         targetSubjectCodes={Array.from(selectedSubjectIds)}
         t={t}
      />
    </div>
  );
}

function BroadcastModal({ isOpen, onClose, targetCount, targetSubjectCodes, t }: { isOpen: boolean, onClose: () => void, targetCount: number, targetSubjectCodes: string[], t: any }) {
  const locale = useLocale();
  const commonT = useTranslations("Common");
  const [broadcastTitle, setBroadcastTitle] = useState("Official Announcement");
  const [customMsg, setCustomMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sentHistory, setSentHistory] = useState<Array<{ id: string; sentAt: string; title: string; content: string; deliveries: Array<{ sessionId: string; subjectCode: string; roomNumber: string; campus: string }> }>>([]);

  const targetSubjectCodesKey = targetSubjectCodes.join(",");

  useEffect(() => {
    if (!isOpen) return;

    import("@/lib/api/templates")
      .then((m) => m.templatesApi.getBroadcastMessages({ subjectCodes: targetSubjectCodes, limit: 100 }))
      .then((messages) => {
        setSentHistory(
          messages.map((item) => ({
            id: item.id,
            sentAt: item.createdAt,
            title: item.title,
            content: item.content,
            deliveries: item.deliveries || [],
          })),
        );
      })
      .catch((error) => {
        console.error("Failed to load persisted broadcast messages:", error);
      });
  }, [isOpen, targetSubjectCodesKey]);

  const handleSend = async () => {
    if (targetSubjectCodes.length === 0) {
      toast.error(locale === "vi" ? "Vui lòng chọn ít nhất một môn để phát thông báo" : "Please select at least one subject to broadcast");
      return;
    }

    setSending(true);
    try {
      const { templatesApi } = await import("@/lib/api/templates");
      const result = await templatesApi.broadcast({
        subjectCodes: targetSubjectCodes,
        content: customMsg,
        type: "INFO",
        title: broadcastTitle,
      });

      toast.success(locale === "vi" ? `Đã gửi thông báo tới ${targetCount} môn thành công!` : `Announcement sent to ${targetCount} subjects successfully!`);
      const refreshed = await templatesApi.getBroadcastMessages({ subjectCodes: targetSubjectCodes, limit: 100 });
      setSentHistory(
        refreshed.map((item) => ({
          id: item.id,
          sentAt: item.createdAt,
          title: item.title,
          content: item.content,
          deliveries: item.deliveries || [],
        })),
      );
    } catch (error) {
      console.error("Failed to broadcast announcement:", error);
      toast.error(locale === "vi" ? "Không thể gửi thông báo" : "Failed to send announcement");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl p-0 border-none rounded-3xl shadow-2xl overflow-hidden bg-white">
        <div className="flex h-[80vh]">
          {/* Sidebar: Message Board */}
           <div className="w-[40%] min-w-[340px] max-w-[500px] bg-slate-50 border-r border-slate-100 flex flex-col">
              <div className="p-6 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                     <MessageSquare className="w-4 h-4 text-orange-600" />
                {locale === "vi" ? "Bảng tin phát thông báo" : "Broadcast Message Board"}
                  </h3>
              <p className="text-xs text-slate-500 mt-1">{locale === "vi" ? "Tất cả thông báo đã gửi trong phiên phát này" : "All messages sent in this broadcast session"}</p>
              </div>
              
              <ScrollArea className="flex-1 p-4">
             {sentHistory.length === 0 ? (
               <p className="text-xs text-slate-400">{locale === "vi" ? "Chưa có thông báo nào được gửi." : "No broadcast messages sent yet."}</p>
             ) : (
              <div className="space-y-3">
                {sentHistory.map((item) => (
                 <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-slate-800">{item.title}</p>
                    <span className="text-[10px] text-slate-400">{new Date(item.sentAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{item.content}</p>
                  <p className="mt-2 text-[11px] text-slate-500">
                    {locale === "vi" ? "Phòng" : "Rooms"}: {item.deliveries.map((d) => `${d.subjectCode}-${d.roomNumber}`).join(", ") || "N/A"}
                  </p>
                 </div>
                ))}
              </div>
             )}
              </ScrollArea>
           </div>

           {/* Content Area */}
           <div className="flex-1 flex flex-col bg-white">
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
                 <div>
                    <h2 className="text-xl font-bold text-slate-900">{locale === "vi" ? "Phát thông báo" : "Broadcast Announcement"}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{locale === "vi" ? `Thông điệp sẽ được gửi tới ${targetCount} môn đang hoạt động.` : `Your message will be sent to ${targetCount} active subjects.`}</p>
                  </div>
                  <div className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-xs font-bold border border-orange-100 flex items-center gap-2 shadow-sm">
                    <Zap className="w-3.5 h-3.5 fill-orange-500" />
                    {locale === "vi" ? `${targetCount} môn mục tiêu` : `${targetCount} Subjects Target`}
                  </div>
              </div>

              <div className="flex-1 flex flex-col p-8 gap-6 overflow-hidden">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">{locale === "vi" ? "Tiêu đề thông báo" : "Announcement Title"}</label>
                    <Input
                     className="h-11 rounded-xl border-slate-200 text-sm font-semibold"
                     value={broadcastTitle}
                     onChange={(e) => setBroadcastTitle(e.target.value)}
                     placeholder={locale === "vi" ? "Thông báo chính thức" : "Official Announcement"}
                    />
                  </div>

                 {/* Message Editor */}
                 <div className="flex-1 flex flex-col">
                     <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">{locale === "vi" ? "Xem trước nội dung" : "Live Content Preview"}</label>
                    <textarea
                      className="w-full flex-1 bg-white border border-slate-200 rounded-xl p-6 text-sm sm:text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none shadow-inner leading-relaxed"
                      placeholder={locale === "vi" ? "Nhập nội dung thông báo tại đây..." : "Type your announcement here..."}
                      value={customMsg}
                      onChange={(e) => setCustomMsg(e.target.value)}
                    />
                    <div className="mt-2 flex justify-between items-center px-2">
                       <span className="text-[11px] text-slate-400 font-medium">{locale === "vi" ? `${customMsg.length} ký tự` : `${customMsg.length} characters`}</span>
                       <span className="text-[11px] text-orange-600 font-bold flex items-center gap-1">
                          <Activity className="w-3 h-3 animate-pulse" /> {locale === "vi" ? "Đang bật xem trước" : "Live Preview Enabled"}
                       </span>
                    </div>
                 </div>
              </div>

              {/* Action Footer */}
              <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
                 <Button 
                    variant="outline" 
                    onClick={onClose}
                    className="flex-1 h-11 rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-slate-100"
                 >
                    {commonT("cancel")}
                 </Button>
                 <Button 
                    onClick={handleSend}
                    disabled={sending || customMsg.trim() === ""}
                    className="flex-[2] h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold gap-2 shadow-lg shadow-orange-200 disabled:opacity-50 active:scale-95 transition-all"
                 >
                    {sending ? (
                       <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> {locale === "vi" ? "Đang gửi..." : "Sending..."}</>
                    ) : (
                       <><Send className="w-4 h-4" /> {locale === "vi" ? "Gửi thông báo" : "Send Announcement"}</>
                    )}
                 </Button>
              </div>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


function CompactStat({ label, current, total, color }: { label: string, current: number, total: number, color: string }) {
   return (
      <div className="flex flex-col items-center px-4">
         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</span>
         <span className={cn("text-lg font-black tabular-nums", color)}>{current}/{total}</span>
      </div>
   );
}

// --- MINIMAL HUD COMPONENTS ---

function MinimalStat({ icon, label, current, total, isAlert, onClick }: any) {
  return (
     <div 
        onClick={onClick}
        className={cn(
           "flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all",
           onClick && "cursor-pointer hover:bg-slate-50 active:scale-95",
           isAlert ? "bg-red-50 text-red-600 border border-red-100" : "bg-white"
        )}
     >
        <div className={cn("shrink-0", isAlert && "animate-bounce")}>{icon}</div>
        <div className="flex flex-col">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-none">{label}</span>
           <div className="flex items-baseline gap-1 mt-1">
              <span className={cn("text-base font-black tabular-nums leading-none", isAlert ? "text-red-600" : "text-slate-900")}>{current}</span>
              {total > 0 && <span className="text-[10px] font-bold text-slate-400">/ {total}</span>}
           </div>
        </div>
     </div>
  );
}

function FilterBtn({ active, onClick, label }: any) {
   return (
      <button 
         onClick={onClick}
         className={cn(
            "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
            active ? "bg-slate-900 text-white shadow-md shadow-slate-200" : "text-slate-500 hover:bg-white"
         )}
      >
         {label}
      </button>
   );
}

function StatCard({ icon, label, current, total, color, onClick, active, alert, showTotal = true }: any) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  
  const colors: any = {
    blue: "from-blue-500 to-cyan-500 text-blue-600 bg-blue-50 border-blue-100 shadow-blue-100",
    indigo: "from-indigo-600 to-blue-600 text-indigo-600 bg-indigo-50 border-indigo-100 shadow-indigo-100",
    emerald: "from-emerald-600 to-teal-500 text-emerald-600 bg-emerald-50 border-emerald-100 shadow-emerald-100",
    orange: "from-orange-600 to-amber-500 text-orange-600 bg-orange-50 border-orange-100 shadow-orange-100",
  };

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "cursor-pointer group relative overflow-hidden transition-all duration-300 rounded-[2rem] border-2",
        active ? "border-slate-900 bg-white shadow-2xl -translate-y-1" : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-lg",
        alert && !active && "animate-pulse border-red-200 ring-4 ring-red-50"
      )}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br transition-transform group-hover:scale-110",
            colors[color]
          )}>
            <div className="text-white drop-shadow-sm">
              {icon}
            </div>
          </div>
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Utilization</span>
             <span className={cn("text-xs font-black", percentage >= 90 ? "text-emerald-500" : percentage >= 50 ? "text-indigo-500" : "text-orange-500")}>
                {Math.round(percentage)}%
             </span>
          </div>
        </div>
        
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5 leading-none">{label}</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">{current}</p>
            {showTotal && (
              <p className="text-slate-400 font-bold tracking-tight">/ {total}</p>
            )}
          </div>
        </div>
        
        {/* Glow effect */}
        <div className={cn(
          "absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-[0.03] blur-3xl transition-opacity group-hover:opacity-[0.08]",
          color === 'blue' ? 'bg-blue-600' : 
          color === 'indigo' ? 'bg-indigo-600' : 
          color === 'emerald' ? 'bg-emerald-600' : 'bg-orange-600'
        )} />
      </CardContent>
    </Card>
  );
}

function FilterTab({ active, onClick, label }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px- w-full sm:w-28 py-2.5 rounded-xl text-[11px] font-black transition-all duration-200 uppercase tracking-widest",
        active 
          ? "bg-white text-slate-900 shadow-md ring-1 ring-slate-200" 
          : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
      )}
    >
      {label}
    </button>
  );
}

function SubjectCard({ subject, t, locale, isSelected }: { subject: SubjectMonitorSummary, t: any, locale: string, isSelected?: boolean }) {
  const hasTickets = subject.pendingTickets > 0;
  const openTime = parseLocalDate(subject.examOpenTime);
  const closeTime = parseLocalDate(subject.examCloseTime);
  const displayTime =
    openTime && closeTime
      ? `${openTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${closeTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : (openTime || new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  
  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-500 rounded-[30px] group shrink-0",
        isSelected 
          ? "ring-4 ring-slate-900 bg-white shadow-[0_30px_70px_rgba(0,0,0,0.15)] border-transparent" 
          : "border-slate-200/50 bg-white backdrop-blur-md shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:shadow-[0_25px_60px_rgba(249,115,22,0.15)] hover:-translate-y-1.5",
        hasTickets && !isSelected ? "ring-2 ring-orange-500 bg-orange-50/20 shadow-orange-100" : ""
      )}
    >
      <div className={cn("absolute top-0 left-0 right-0 h-1", isSelected ? "bg-slate-900" : hasTickets ? "bg-orange-500" : "bg-slate-100")} />

      <div className="p-4 flex flex-col h-full gap-4">
        {/* Header: Distinct */}
          <div className="flex justify-between items-start">
             <div className="flex flex-col">
               <div className="text-lg font-black text-slate-900 tracking-tighter uppercase leading-none group-hover:text-orange-600 transition-colors">{subject.subjectCode}</div>
               <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                {displayTime}
               </div>
             </div>
           <StatusBadge subject={subject} t={t} isSmall />
        </div>

        {/* High Impact Stats Row */}
        <div className="flex items-center justify-between px-1">
           <CircularMetric label={t("table.proctorRate")} current={subject.presentProctors} total={subject.totalProctors} color="indigo" />
           <CircularMetric label={t("table.hallRate")} current={subject.presentHallInvigilators} total={subject.totalHallInvigilators} color="blue" />
           <CircularMetric label={t("table.studentRate")} current={subject.checkedInStudents} total={subject.totalStudents} color="emerald" />
        </div>

        {/* Footer info: Compact */}
        <div className={cn(
           "flex items-center justify-between p-2 rounded-2xl transition-all gap-3",
           hasTickets ? "bg-orange-600 text-white shadow-lg animate-pulse" : "bg-slate-50 border border-slate-100"
        )}>
           <CountdownTimer
             endTime={subject.examCloseTime}
             startTime={subject.examOpenTime}
             status={subject.status}
             locale={locale}
             size="small"
             inverse={hasTickets}
           />
           {hasTickets ? (
             <div className="flex items-center gap-1 font-black text-xs uppercase">
               <Ticket className="w-4 h-4" />
               {subject.pendingTickets}
             </div>
           ) : (
           <div className="text-[9px] font-black text-slate-400 uppercase group-hover:text-orange-600 transition-colors">
                {locale === "vi" ? "Chi tiết" : "Detail"} <ChevronRight className="inline w-3 h-3" />
              </div>
           )}
        </div>
      </div>
    </Card>
  );
}

function CircularMetric({ label, current, total, color }: { label: string, current: number, total: number, color: string }) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  const ringConfigs: Record<string, { main: string, bg: string, text: string, label: string }> = {
    indigo: { main: "stroke-indigo-500", bg: "stroke-indigo-50", text: "text-indigo-600", label: "Proctor" },
    blue: { main: "stroke-blue-500", bg: "stroke-blue-50", text: "text-blue-600", label: "Hall" },
    emerald: { main: "stroke-emerald-500", bg: "stroke-emerald-50", text: "text-emerald-600", label: "Stud" },
  };

  const config = ringConfigs[color];

  return (
    <div className="flex flex-col items-center gap-2 group/metric">
      <div className="relative w-14 h-14">
        <svg className="w-full h-full -rotate-90">
          <circle cx="28" cy="28" r={radius} strokeWidth="4.5" fill="transparent" className={cn("transition-colors duration-300", config.bg)} />
          <circle cx="28" cy="28" r={radius} strokeWidth="5" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" fill="transparent" className={cn("transition-all duration-1000 drop-shadow-sm", config.main)} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
           <span className={cn("text-xs font-black tabular-nums leading-none tracking-tighter", config.text)}>{Math.round(percentage)}%</span>
        </div>
      </div>
      <div className="flex flex-col items-center leading-none">
         <span className={cn("text-[9px] font-black uppercase tracking-wider", config.text)}>{config.label}</span>
         <span className="text-[8px] font-bold text-slate-300 mt-0.5 tabular-nums">{current}/{total}</span>
      </div>
    </div>
  );
}

function StatusBadge({ subject, t, isSmall = false }: { subject: SubjectMonitorSummary, t: any, isSmall?: boolean }) {
  const locale = useLocale();
  const phase = resolveMonitorPhase(subject);
  const attendancePhase = resolveAttendancePhase(subject);
  const now = new Date();
  const openTime = parseLocalDate(subject.examOpenTime);
  
  const configs: Record<string, { label: string, color: string, icon: any }> = {
    "Checking In": {
      label: locale === "vi" ? "Mở điểm danh" : "Check-in Open",
      color: "bg-blue-50 text-blue-600 border-blue-200 shadow-blue-50",
      icon: <UserPlus className="w-3.5 h-3.5" />
    },
    "Ongoing": { label: t("phases.ongoing") || "Ongoing", color: "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-emerald-50", icon: <Activity className="w-3.5 h-3.5" /> },
    "Upcoming": { label: t("phases.upcoming") || "Upcoming", color: "bg-amber-50 text-amber-700 border-amber-200 shadow-amber-50", icon: <Clock className="w-3.5 h-3.5" /> },
    "Completed": { label: t("phases.completed") || "Completed", color: "bg-slate-50 text-slate-500 border-slate-200 shadow-slate-50", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  };

  const displayPhase =
    attendancePhase === "Completed"
      ? "Completed"
      : attendancePhase === "Open" && !!openTime && now < openTime
        ? "Checking In"
        : phase;
  const config = configs[displayPhase] || configs["Upcoming"];

  if (isSmall) {
    return (
      <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase border shadow-sm", config.color)}>
        {config.icon}
        <span className="hidden sm:inline">{config.label}</span>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase border shadow-md transition-all hover:scale-105", config.color)}>
      {config.icon}
      {config.label}
    </div>
  );
}

function SubjectSessionBoards({ subject }: { subject: SubjectMonitorSummary }) {
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<Array<SessionActivityItem & { roomNumber: string }>>([]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all(
      subject.sessions.map((session) =>
        monitorApi.getSessionActivities(session.sessionId, { limit: 80 }).then((items) =>
          items.map((item) => ({
            ...item,
            roomNumber: session.roomNumber,
          })),
        ),
      ),
    )
      .then((result) => {
        if (!isMounted) return;
        const merged = result
          .flat()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setActivities(merged);
      })
      .catch((error) => {
        console.error('Failed to load subject activities', error);
        if (isMounted) {
          setActivities([]);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [subject]);

  const broadcasts = activities.filter((item) => item.event === 'BROADCAST_SENT');

  return (
    <div className="grid grid-rows-2 gap-6 h-full min-h-0">
      <Card className="rounded-3xl border-slate-200/80 h-full min-h-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-black tracking-wide uppercase text-slate-700">{locale === "vi" ? "Bảng tin" : "Message Board"}</CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-64px)] min-h-0">
          <ScrollArea className="h-full pr-3">
            {loading ? (
              <p className="text-sm text-slate-500">{locale === "vi" ? "Đang tải thông báo..." : "Loading messages..."}</p>
            ) : broadcasts.length === 0 ? (
              <p className="text-sm text-slate-500">{locale === "vi" ? "Chưa có thông báo nào cho môn này." : "No broadcast messages for this subject yet."}</p>
            ) : (
              <div className="space-y-3">
                {broadcasts.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                      <span className="text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{item.message}</p>
                    <p className="mt-2 text-[11px] text-indigo-600 font-semibold">{locale === "vi" ? `Phòng ${item.roomNumber}` : `Room ${item.roomNumber}`}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-slate-200/80 h-full min-h-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-black tracking-wide uppercase text-slate-700">{locale === "vi" ? "Nhật ký hoạt động" : "Activity Log"}</CardTitle>
        </CardHeader>
        <CardContent className="h-[calc(100%-64px)] min-h-0">
          <ScrollArea className="h-full pr-3">
            {loading ? (
              <p className="text-sm text-slate-500">{locale === "vi" ? "Đang tải hoạt động..." : "Loading activities..."}</p>
            ) : activities.length === 0 ? (
              <p className="text-sm text-slate-500">{locale === "vi" ? "Chưa có hoạt động nào cho môn này." : "No activity recorded for this subject yet."}</p>
            ) : (
              <div className="space-y-3">
                {activities.map((item) => (
                  <div key={`${item.id}-${item.roomNumber}`} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                      <span className="text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{item.message}</p>
                    <p className="mt-2 text-[11px] font-semibold text-orange-600">{locale === "vi" ? `Phòng ${item.roomNumber}` : `Room ${item.roomNumber}`}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function CountdownTimer({
  endTime,
  startTime,
  status,
  locale,
  size = "normal",
  inverse = false,
}: {
  endTime: string,
  startTime: string,
  status: string,
  locale: string,
  size?: "normal" | "small",
  inverse?: boolean
}) {
  const [attendanceLine, setAttendanceLine] = useState("--");
  const [examLine, setExamLine] = useState<string | null>(null);
  const [attendanceTone, setAttendanceTone] = useState<"normal" | "active" | "locked" | "done">("normal");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      const startDate = parseLocalDate(startTime);
      const endDate = parseLocalDate(endTime);
      const phase = resolveMonitorPhase({
        subjectCode: "",
        examOpenTime: startTime,
        examCloseTime: endTime,
        status,
        totalProctors: 0,
        presentProctors: 0,
        totalHallInvigilators: 0,
        presentHallInvigilators: 0,
        totalStudents: 0,
        checkedInStudents: 0,
        pendingTickets: 0,
        sessions: [],
      });
      const attendancePhase = resolveAttendancePhase({
        subjectCode: "",
        examOpenTime: startTime,
        examCloseTime: endTime,
        status,
        totalProctors: 0,
        presentProctors: 0,
        totalHallInvigilators: 0,
        presentHallInvigilators: 0,
        totalStudents: 0,
        checkedInStudents: 0,
        pendingTickets: 0,
        sessions: [],
      });

      if (!startDate || !endDate) {
        setAttendanceLine("--");
        setExamLine(null);
        setAttendanceTone("normal");
        return;
      }

      const now = Date.now();
      const attendanceOpenAt = getAttendanceOpenAt(startDate)?.getTime() ?? 0;
      const attendanceCloseAt = getAttendanceCloseAt(startDate)?.getTime() ?? 0;
      const examOpenAt = startDate.getTime();
      const examCloseAt = endDate.getTime();

      if (phase === "Completed" || now >= examCloseAt) {
        setAttendanceLine(locale === "vi" ? "Đã kết thúc" : "Completed");
        setExamLine(null);
        setAttendanceTone("done");
        setIsUrgent(false);
        return;
      }

      if (attendancePhase === "NotOpen" && now < attendanceOpenAt) {
        setAttendanceLine(
          `${locale === "vi" ? "Mở điểm danh sau" : "Check-in opens in"}: ${formatCountdownMs(attendanceOpenAt - now)}`
        );
        setAttendanceTone("normal");
      } else if (attendancePhase === "Open" && now < attendanceCloseAt) {
        setAttendanceLine(
          `${locale === "vi" ? "Đang mở điểm danh" : "Check-in open"}: ${formatCountdownMs(attendanceCloseAt - now)}`
        );
        setAttendanceTone("active");
      } else {
        setAttendanceLine(locale === "vi" ? "Đã khóa điểm danh" : "Check-in locked");
        setAttendanceTone("locked");
      }

      if (now >= examOpenAt && now < examCloseAt) {
        const remainingExam = examCloseAt - now;
        setExamLine(
          `${locale === "vi" ? "Thời gian thi" : "Exam time"}: ${formatCountdownMs(remainingExam)}`
        );
        setIsUrgent(remainingExam < 5 * 60 * 1000);
      } else {
        setExamLine(null);
        setIsUrgent(false);
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [endTime, startTime, status, locale]);

  return (
    <div className="flex flex-col items-start gap-1 min-w-0">
      <div className={cn(
        "flex items-center gap-1.5 font-bold tabular-nums min-w-0",
        inverse
          ? "text-white"
          : attendanceTone === "active"
            ? "text-emerald-600"
            : attendanceTone === "locked"
              ? "text-rose-600"
              : attendanceTone === "done"
                ? "text-slate-500"
                : "text-slate-700",
        size === "normal" ? "text-sm" : "text-[11px]"
      )}>
        <Clock className={cn(size === "normal" ? "w-4 h-4" : "w-3 h-3")} />
        <span className="truncate">{attendanceLine}</span>
      </div>
      {examLine && (
        <div className={cn(
          "flex items-center gap-1.5 font-semibold tabular-nums min-w-0",
          isUrgent && !inverse ? "text-red-600 animate-pulse" : inverse ? "text-white/90" : "text-indigo-600",
          size === "normal" ? "text-xs" : "text-[10px]"
        )}>
          <Clock className={cn(size === "normal" ? "w-3.5 h-3.5" : "w-3 h-3")} />
          <span className="truncate">{examLine}</span>
        </div>
      )}
    </div>
  );
}

function RoomCard({ session, t }: { session: SessionRoomDetail, t: any }) {
  const router = useRouter();
  const locale = useLocale();
  const [activityOpen, setActivityOpen] = useState(false);

  return (
    <>
      <Card
        className="shadow-lg border-slate-200/80 hover:border-orange-500/50 hover:shadow-orange-100/30 transition-all duration-300 overflow-hidden group/room cursor-pointer"
        onClick={() => router.push(`/${locale}/exam-officer/exam-schedules/${session.sessionId}`)}
      >
        <div className="p-4 border-b bg-slate-50/50 flex flex-row justify-between items-center group-hover/room:bg-orange-50/20 transition-colors">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
             <span className="text-sm font-black text-slate-800">{t("drilldown.room")} {session.roomNumber}</span>
          </div>
          {session.pendingTickets > 0 && (
            <div className="bg-orange-600 text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-lg shadow-orange-100">
              <Ticket className="w-3 h-3" />
              {session.pendingTickets}
            </div>
          )}
        </div>
        <CardContent className="p-4 flex flex-col gap-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex flex-col">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                 {t("drilldown.proctor")} • {session.proctorOnline ? (locale === "vi" ? "Đã check-in" : "Checked in") : (locale === "vi" ? "Chưa check-in" : "Not checked in")}
               </span>
               <span className={cn("text-xs font-black", !session.proctorOnline && 'text-red-500')}>
                  {session.proctorName || t("drilldown.notInRoom") || (locale === "vi" ? "Chưa phân công" : "Not Assigned")}
               </span>
            </div>
            <span className={cn("w-2.5 h-2.5 rounded-full ring-4 shadow-sm", session.proctorOnline ? "bg-green-500 ring-green-50 shadow-green-100" : "bg-red-400 ring-red-50")} />
          </div>

          <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex flex-col">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("drilldown.hall")}</span>
               <span className={cn("text-xs font-black", !session.hallInvigilatorOnline && 'text-red-500')}>
                  {session.hallInvigilatorName || t("drilldown.notInRoom") || (locale === "vi" ? "Chưa phân công" : "Not Assigned")}
               </span>
            </div>
            <span className={cn("w-2.5 h-2.5 rounded-full ring-4 shadow-sm", session.hallInvigilatorOnline ? "bg-green-500 ring-green-50 shadow-green-100" : "bg-red-400 ring-red-50")} />
          </div>
        </div>

        <div className="pt-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("drilldown.checkin")}</span>
            <span className="text-sm font-black text-slate-900">{session.checkedIn}/{session.totalStudents}</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-700", session.checkedIn < session.totalStudents ? "bg-orange-500" : "bg-emerald-500")} 
              style={{ width: `${session.totalStudents > 0 ? (session.checkedIn / session.totalStudents) * 100 : 0}%` }}
            />
          </div>
        </div>
        <Button
          variant="outline"
          className="h-9 w-full rounded-lg border-slate-200 text-xs font-bold text-slate-600 gap-2"
          onClick={(event) => {
            event.stopPropagation();
            setActivityOpen(true);
          }}
        >
          <History className="w-3.5 h-3.5" />
          {locale === "vi" ? "Nhật ký hoạt động" : "Activity Log"}
        </Button>
      </CardContent>
      </Card>

      <RoomActivityDialog
        sessionId={session.sessionId}
        roomNumber={session.roomNumber}
        open={activityOpen}
        onOpenChange={setActivityOpen}
      />
    </>
  );
}

function RoomActivityDialog({
  sessionId,
  roomNumber,
  open,
  onOpenChange,
}: {
  sessionId: string;
  roomNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [activities, setActivities] = useState<SessionActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    monitorApi
      .getSessionActivities(sessionId, { limit: 80 })
      .then((result) => setActivities(result))
      .catch((error) => {
        console.error("Failed to load session activities", error);
        toast.error("Failed to load activity history");
      })
      .finally(() => setLoading(false));
  }, [open, sessionId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>Room {roomNumber} Activity Timeline</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[420px] pr-3">
          {loading ? (
            <p className="text-sm text-slate-500">Loading activity history...</p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-slate-500">No activities recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {activities.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-3 bg-slate-50/60">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <span className="text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{item.message}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

