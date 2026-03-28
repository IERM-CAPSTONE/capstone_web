"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    ChevronRight, Calendar, Clock, FileText, AlertCircle,
    LayoutGrid, CheckCircle2, BookOpen, Loader2, Ticket, X,
    User, MapPin, AlertTriangle, Users, CheckSquare,
    Square, LayoutList, Map as MapIcon, Search,
} from "lucide-react";
import { format } from "date-fns";
import { useExamScheduleById } from "@/hooks/use-exam-schedules";
import { useStudentExamsBySession } from "@/hooks/use-student-exams";
import { useSeatManagement, ExamSeat } from "@/hooks/use-seat-management";
import { useSocket } from "@/hooks/use-socket";
import { StudentExam } from "@/lib/api/student-exams";
import { ticketsApi, IssueType, TicketPriority } from "@/lib/api/tickets";
import { ROUTES } from "@/lib/constants/routes";
import { getCurrentLocale } from "@/hooks/use-check-auth";
import { parseLocalDate } from "@/app/[locale]/exam-officer/exam-schedules/utils";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";

// ─── Types & Constants ────────────────────────────────────────────────────────
type ExamStatus = "Upcoming" | "PreExam" | "Ongoing" | "GracePeriod" | "Completed";
type ViewMode = "seating" | "list";

interface IncidentConfig {
    id: string;
    icon: string;
    severity: "urgent" | "high" | "medium";
    backendType: IssueType;
    defaultPriority: TicketPriority;
}

const INCIDENTS: IncidentConfig[] = [
    { id: "eosClientError",  icon: "💻", severity: "high",   backendType: "Technical Issue", defaultPriority: "High"   },
    { id: "spinningScreen",  icon: "🔄", severity: "high",   backendType: "Technical Issue", defaultPriority: "High"   },
    { id: "needReassign",    icon: "🔒", severity: "urgent", backendType: "Technical Issue", defaultPriority: "Urgent" },
    { id: "lostServerConn",  icon: "📡", severity: "urgent", backendType: "Technical Issue", defaultPriority: "Urgent" },
    { id: "networkError",    icon: "📶", severity: "high",   backendType: "Technical Issue", defaultPriority: "High"   },
    { id: "cannotLogin",     icon: "🔑", severity: "urgent", backendType: "Technical Issue", defaultPriority: "Urgent" },
    { id: "wrongExamCode",   icon: "❌", severity: "high",   backendType: "Technical Issue", defaultPriority: "High"   },
    { id: "notInExamList",   icon: "📋", severity: "urgent", backendType: "Room Management", defaultPriority: "Urgent" },
];


const SEV_CARD: Record<string, string> = {
    urgent: "border-red-300 bg-red-50 hover:border-red-400 hover:bg-red-100",
    high: "border-orange-300 bg-orange-50 hover:border-orange-400 hover:bg-orange-100",
    medium: "border-yellow-200 bg-yellow-50 hover:border-yellow-300 hover:bg-yellow-100",
};
const SEV_CARD_ACTIVE: Record<string, string> = {
    urgent: "border-red-500 bg-red-50 ring-2 ring-red-400 ring-offset-1",
    high: "border-orange-500 bg-orange-50 ring-2 ring-orange-400 ring-offset-1",
    medium: "border-yellow-400 bg-yellow-50 ring-2 ring-yellow-300 ring-offset-1",
};
const SEV_BADGE: Record<string, string> = {
    urgent: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-yellow-100 text-yellow-700",
};
const PRIORITIES: TicketPriority[] = ["Low", "Medium", "High", "Urgent"];

const PRIORITY_STYLE: Record<TicketPriority, string> = {
    Low: "bg-blue-100 text-blue-700 border-blue-200",
    Medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    High: "bg-orange-100 text-orange-700 border-orange-200",
    Urgent: "bg-red-100 text-red-700 border-red-200",
};

const SEAT_STYLE: Record<string, { cell: string; text: string; label: string; ring: string }> = {
    Present:   { cell: "bg-emerald-50 border-emerald-300",   text: "text-emerald-700 font-black",  label: "text-emerald-500",  ring: "ring-emerald-400" },
    Assigned:  { cell: "bg-amber-50  border-amber-300",     text: "text-amber-700  font-black",  label: "text-amber-500",    ring: "ring-amber-400"  },
    Absent:    { cell: "bg-red-50    border-red-300",       text: "text-red-600    font-black",  label: "text-red-400",      ring: "ring-red-400"    },
    Available: { cell: "bg-slate-50  border-slate-200",     text: "text-slate-400  font-semibold",label: "text-slate-300",  ring: "ring-slate-300"  },
    Locked:    { cell: "bg-slate-100 border-slate-200 opacity-40", text: "text-slate-300 font-semibold", label: "text-slate-300", ring: "ring-slate-200" },
};

const STATUS_DOT: Record<string, string> = {
    REGISTERED: "bg-slate-400",
    CHECKEDIN: "bg-green-500 animate-pulse",
    CHECKEDOUT: "bg-blue-400",
    MOVED: "bg-yellow-400",
    REMOVED: "bg-red-400",
};

const GRACE_PERIOD_MS = 30 * 60 * 1000; // 30 minutes
const PRE_EXAM_MS = 15 * 60 * 1000;    // 15 minutes before start

function computeStatus(open: Date | null, close: Date | null): ExamStatus {
    const now = new Date();
    if (!open || !close) return "Upcoming";
    if (now < new Date(open.getTime() - PRE_EXAM_MS)) return "Upcoming";
    if (now < open) return "PreExam";
    if (now <= close) return "Ongoing";
    if (now.getTime() - close.getTime() <= GRACE_PERIOD_MS) return "GracePeriod";
    return "Completed";
}

function getGraceMinutesLeft(close: Date | null): number {
    if (!close) return 0;
    const remaining = GRACE_PERIOD_MS - (Date.now() - close.getTime());
    return Math.max(0, Math.ceil(remaining / 60000));
}

function getPreExamMinutesLeft(open: Date | null): number {
    if (!open) return 0;
    return Math.max(0, Math.ceil((open.getTime() - Date.now()) / 60000));
}

// ─── Create Ticket Dialog ─────────────────────────────────────────────────────
interface CreateTicketDialogProps {
    sessionId: string;
    roomNumber: string | null;
    selectedStudents: StudentExam[];
    onClose: () => void;
    onSuccess: () => void;
}

function CreateTicketDialog({ sessionId, roomNumber, selectedStudents, onClose, onSuccess }: CreateTicketDialogProps) {
    const t = useTranslations("ProctorSession");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [issueName, setIssueName] = useState("");
    const [nameEdited, setNameEdited] = useState(false);
    const [description, setDescription] = useState("");
    const [studentCode, setStudentCode] = useState<string>(
        selectedStudents?.[0]?.studentCode ?? ""
    );
    const [priority, setPriority] = useState<TicketPriority>("Medium");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [incidentSearch, setIncidentSearch] = useState("");

    const incidentLabels: Record<string, { label: string; sub: string; sevLabel: string }> = {
        eosClientError:  { label: t("incident.eosClientError"),  sub: t("incident.eosClientErrorSub"),  sevLabel: t("incident.sevHigh")   },
        spinningScreen:  { label: t("incident.spinningScreen"),  sub: t("incident.spinningScreenSub"),  sevLabel: t("incident.sevHigh")   },
        needReassign:    { label: t("incident.needReassign"),    sub: t("incident.needReassignSub"),    sevLabel: t("incident.sevUrgent") },
        lostServerConn:  { label: t("incident.lostServerConn"),  sub: t("incident.lostServerConnSub"),  sevLabel: t("incident.sevUrgent") },
        networkError:    { label: t("incident.networkError"),    sub: t("incident.networkErrorSub"),    sevLabel: t("incident.sevHigh")   },
        cannotLogin:     { label: t("incident.cannotLogin"),     sub: t("incident.cannotLoginSub"),     sevLabel: t("incident.sevUrgent") },
        wrongExamCode:   { label: t("incident.wrongExamCode"),   sub: t("incident.wrongExamCodeSub"),   sevLabel: t("incident.sevHigh")   },
        notInExamList:   { label: t("incident.notInExamList"),   sub: t("incident.notInExamListSub"),   sevLabel: t("incident.sevUrgent") },
    };

    // Simple label+sub keyword filter
    const filteredIncidents = incidentSearch.trim()
        ? INCIDENTS.filter(inc => {
            const q = incidentSearch.toLowerCase();
            const meta = incidentLabels[inc.id];
            return meta?.label.toLowerCase().includes(q) || meta?.sub.toLowerCase().includes(q);
        })
        : INCIDENTS;

    const handleSelect = (inc: IncidentConfig) => {
        setSelectedId(inc.id);
        setPriority(inc.defaultPriority);
        // Store the incident ID (key) — not the translated label — so the DB is locale-agnostic
        if (!nameEdited) setIssueName(inc.id);
    };

    const handleSubmit = async () => {
        const inc = INCIDENTS.find(i => i.id === selectedId);
        if (!inc) { toast.error(t("ticket.pleaseSelectIncident")); return; }
        // issueName is the incident ID (key); if user manually edited it, use their text
        const finalIssueName = nameEdited ? issueName.trim() : inc.id;
        if (!finalIssueName) { toast.error(t("ticket.pleaseEnterIssueName")); return; }
        setIsSubmitting(true);
        try {
            if (selectedStudents.length > 1) {
                // Multiple students → one ticket per student, sent in parallel
                const results = await Promise.allSettled(
                    selectedStudents.map(s =>
                        ticketsApi.create({
                            issueName: finalIssueName,
                            issueType: inc.backendType,
                            description: description.trim() || undefined,
                            priority,
                            sessionId,
                            studentCode: s.studentCode ?? undefined,
                        })
                    )
                );
                const ok = results.filter(r => r.status === "fulfilled").length;
                const fail = results.filter(r => r.status === "rejected").length;
                if (fail === 0) {
                    toast.success(`✅ Đã tạo ${ok} ticket (${ok} sinh viên). Đang thông báo chọn khảo thí.`);
                } else {
                    toast.warning(`Tạo ${ok} thành công, ${fail} lỗi.`);
                }
            } else {
                // Single student (or no student selected)
                await ticketsApi.create({
                    issueName: finalIssueName,
                    issueType: inc.backendType,
                    description: description.trim() || undefined,
                    priority,
                    sessionId,
                    studentCode: (selectedStudents[0]?.studentCode ?? studentCode.trim()) || undefined,
                });
                toast.success(t("ticket.successMsg"));
            }
            onSuccess(); onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? t("ticket.errorMsg"));
        } finally { setIsSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
                            <Ticket className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900">{t("ticket.title")}</h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {t("room")} <span className="font-semibold text-gray-600">{roomNumber || "N/A"}</span>
                                {selectedStudents.length > 0 && <> · {selectedStudents.length} sinh viên</>}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
                    {/* Students tags */}
                    {selectedStudents.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {selectedStudents.map(s => (
                                <span key={s.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs font-medium text-orange-700">
                                    <User className="w-3 h-3" /> {s.studentName || s.studentCode}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Incident type cards */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                {t("ticket.selectIncident")} *
                            </label>
                            {selectedId && (
                                <span className="text-[10px] text-orange-600 font-semibold">
                                    ✓ {incidentLabels[selectedId]?.label}
                                </span>
                            )}
                        </div>

                        {/* 🔍 Quick search */}
                        <div className="relative mb-3">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm lỗi… VD: xoay, mất mạng, reassign"
                                value={incidentSearch}
                                onChange={e => setIncidentSearch(e.target.value)}
                                className="w-full pl-8 pr-8 py-2 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none placeholder:text-gray-400"
                            />
                            {incidentSearch && (
                                <button onClick={() => setIncidentSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* 2-col incident grid */}
                        {filteredIncidents.length === 0 ? (
                            <div className="flex flex-col items-center py-5 gap-2 text-gray-400">
                                <Search className="w-5 h-5 opacity-40" />
                                <p className="text-xs">Không tìm thấy loại lỗi.</p>
                                <button onClick={() => setIncidentSearch("")} className="text-[11px] text-orange-500 hover:underline">Xem tất cả</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {filteredIncidents.map(inc => {
                                    const meta = incidentLabels[inc.id];
                                    const isActive = selectedId === inc.id;
                                    return (
                                        <button
                                            key={inc.id}
                                            onClick={() => { handleSelect(inc); setIncidentSearch(""); }}
                                            className={cn(
                                                "flex items-center gap-3 text-left px-3 py-3 rounded-xl border-2 transition-all",
                                                isActive ? SEV_CARD_ACTIVE[inc.severity] : SEV_CARD[inc.severity]
                                            )}
                                        >
                                            <span className="text-2xl shrink-0 leading-none">{inc.icon}</span>
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-bold text-gray-800 leading-tight truncate">{meta?.label}</p>
                                                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight line-clamp-2">{meta?.sub}</p>
                                                <span className={cn("inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide", SEV_BADGE[inc.severity])}>
                                                    {meta?.sevLabel}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* MSSV – auto-filled from selected student(s) */}
                    {selectedStudents.length > 0 && (
                        <div>
                            <label className="block text-xs font-semibold text-orange-500 mb-1.5 uppercase tracking-wide">
                                MSSV <span className="text-orange-300 font-normal normal-case">(tự điền từ ghế đã chọn)</span>
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {selectedStudents.map(s => (
                                    <span key={s.id}
                                        onClick={() => setStudentCode(s.studentCode ?? "")}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold cursor-pointer transition-colors",
                                            studentCode === (s.studentCode ?? "")
                                                ? "bg-orange-500 border-orange-500 text-white"
                                                : "bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200"
                                        )}
                                    >
                                        {s.studentCode && <span className="font-mono">{s.studentCode}</span>}
                                        {s.studentName && <span className="font-normal opacity-80">– {s.studentName}</span>}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Issue name */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{t("ticket.issueName")} *</label>
                        <input type="text" placeholder={t("ticket.issueNamePlaceholder")}
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
                            value={issueName}
                            onChange={e => { setIssueName(e.target.value); setNameEdited(true); }} />
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{t("ticket.priority")}</label>
                        <div className="flex flex-wrap gap-1.5">
                            {PRIORITIES.map(p => (
                                <button key={p} onClick={() => setPriority(p)}
                                    className={cn("px-3 py-1 rounded-full text-xs font-semibold border transition-all",
                                        priority === p ? `${PRIORITY_STYLE[p]} ring-2 ring-offset-1` : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100")}>
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{t("ticket.description")}</label>
                        <textarea rows={3} placeholder={t("ticket.descriptionPlaceholder")}
                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-orange-400"
                            value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 px-6 py-4 border-t shrink-0">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>{t("ticket.cancel")}</Button>
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleSubmit} disabled={isSubmitting || !selectedId}>
                        {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("ticket.submitting")}</> : <><Ticket className="w-4 h-4 mr-2" />{t("ticket.submit")}</>}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Student Detail Side Panel ────────────────────────────────────────────────
interface StudentPanelProps {
    student: StudentExam | null;
    seat: ExamSeat | null;
    isSelected: boolean;
    onToggleSelect: () => void;
    onClose: () => void;
    onCreateTicket: () => void;
}

function StudentPanel({ student, seat, isSelected, onToggleSelect, onClose, onCreateTicket }: StudentPanelProps) {
    const t = useTranslations("ProctorSession");
    if (!student) return null;

    const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
        CHECKEDIN:  { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500 animate-pulse" },
        REGISTERED: { bg: "bg-slate-100",   text: "text-slate-600",   dot: "bg-slate-400" },
        CHECKEDOUT: { bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500" },
        MOVED:      { bg: "bg-yellow-100",  text: "text-yellow-700",  dot: "bg-yellow-500" },
        REMOVED:    { bg: "bg-red-100",     text: "text-red-700",     dot: "bg-red-500" },
    };
    const sc = statusColors[student.status ?? "REGISTERED"] ?? statusColors.REGISTERED;
    const initial = (student.studentName ?? student.studentCode ?? "?")[0].toUpperCase();

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-orange-400" />
                    {t("studentDetail")}
                </h3>
                <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Avatar gradient card */}
            <div className="rounded-2xl bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 border border-orange-100 p-4 mb-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white text-2xl font-black mx-auto mb-3 shadow-lg shadow-orange-200">
                    {initial}
                </div>
                <p className="font-bold text-slate-900 text-sm leading-tight">{student.studentName || "—"}</p>
                <p className="text-xs text-slate-400 mt-0.5 font-mono tracking-wide">{student.studentCode}</p>
                <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-2.5", sc.bg, sc.text)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", sc.dot)} />
                    {student.status ? t(`studentStatus.${student.status}` as any) : t("studentStatus.REGISTERED")}
                </span>
            </div>

            {/* Info rows */}
            <div className="space-y-1 flex-1">
                {[
                    { icon: <MapPin className="w-3.5 h-3.5" />, label: t("seat"), value: seat ? `R${seat.row}C${seat.col}` : `Bàn ${student.seatNumber || "N/A"}`, color: "text-violet-500" },
                    { icon: <Clock className="w-3.5 h-3.5" />, label: t("checkIn"), value: student.checkinTime ? format(new Date(student.checkinTime), "HH:mm:ss") : "—", color: "text-emerald-500" },
                    { icon: <Clock className="w-3.5 h-3.5" />, label: t("checkOut"), value: student.checkoutTime ? format(new Date(student.checkoutTime), "HH:mm:ss") : "—", color: "text-blue-500" },
                    { icon: <User className="w-3.5 h-3.5" />, label: t("identityId"), value: student.identityId || "—", color: "text-slate-400" },
                ].map(({ icon, label, value, color }) => (
                    <div key={label} className="flex items-center gap-2.5 py-2 px-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                        <span className={cn("shrink-0", color)}>{icon}</span>
                        <span className="text-xs text-slate-400 font-medium flex-1">{label}</span>
                        <span className="text-xs font-bold text-slate-800 text-right truncate max-w-[50%]">{value}</span>
                    </div>
                ))}
            </div>

            {/* Action buttons */}
            <div className="pt-3 space-y-2 border-t border-slate-100 mt-3">
                <button
                    onClick={onToggleSelect}
                    className={cn("w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all",
                        isSelected
                            ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-200"
                            : "bg-white text-slate-600 border-slate-200 hover:border-orange-200 hover:text-orange-600"
                    )}
                >
                    {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    {isSelected ? t("selectedForTicket") : t("selectForTicket")}
                </button>
                <Button
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white gap-2 text-sm shadow-md shadow-orange-200 border-0"
                    onClick={onCreateTicket}
                >
                    <Ticket className="w-4 h-4" /> {t("createTicketForStudent")}
                </Button>
            </div>
        </div>
    );
}

// ─── Seating Floor Plan ───────────────────────────────────────────────────────
interface SeatingFloorPlanProps {
    seats: ExamSeat[];
    students: StudentExam[];
    cols: number;
    rows: number;
    selectedIds: Set<string>;
    onSeatClick: (seat: ExamSeat, student: StudentExam | null) => void;
    activeSeatId: string | null;
}

function SeatingFloorPlan({ seats, students, cols, rows, selectedIds, onSeatClick, activeSeatId }: SeatingFloorPlanProps) {
    const t = useTranslations("ProctorSession");
    const seatMap: Map<string, ExamSeat> = new Map();
    seats.forEach(s => seatMap.set(`${s.row}-${s.col}`, s));

    const studentBySeat: Map<string, StudentExam> = new Map();
    students.forEach(st => {
        if (!st.seatNumber) return;
        studentBySeat.set(st.seatNumber, st);
    });

    return (
        <div>
            {/* Compact legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-4 px-1">
                {([
                    [t("seatStatus.present"),   "bg-emerald-500"],
                    [t("seatStatus.assigned"),  "bg-amber-500"],
                    [t("seatStatus.absent"),    "bg-red-500"],
                    [t("seatStatus.available"), "bg-slate-300"],
                    [t("seatStatus.locked"),    "bg-slate-200"],
                ] as [string, string][]).map(([label, dot]) => (
                    <span key={label} className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                        <span className={cn("w-2.5 h-2.5 rounded-full", dot)} />{label}
                    </span>
                ))}
                <span className="ml-auto text-[11px] text-slate-400 italic">{t("clickSeatHint")}</span>
            </div>

            {/* Seat grid */}
            <div
                className="grid gap-1.5"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
                {Array.from({ length: rows }, (_, r) =>
                    Array.from({ length: cols }, (_, c) => {
                        const row = r + 1, col = c + 1;
                        const seat = seatMap.get(`${row}-${col}`);
                        const seatNum = ((row - 1) * cols + col).toString();
                        const seatRowCol = `${row}-${col}`;
                        const student = studentBySeat.get(seatRowCol) ?? studentBySeat.get(seatNum);
                        const style = SEAT_STYLE[seat?.status ?? "Available"];
                        const isActive = seat?.id === activeSeatId;
                        const isSelected = student ? selectedIds.has(student.id) : false;

                        return (
                            <div
                                key={`${row}-${col}`}
                                onClick={() => seat && onSeatClick(seat, student ?? null)}
                                className={cn(
                                    "relative flex flex-col items-center justify-center rounded-xl border-2 transition-all cursor-pointer select-none",
                                    "h-[76px] px-1",
                                    style.cell,
                                    !seat && "opacity-30 cursor-default",
                                    isActive && `ring-2 ${style.ring} ring-offset-1 scale-[1.06] z-10 shadow-lg`,
                                    isSelected && !isActive && "ring-2 ring-orange-300 ring-offset-1",
                                    seat && "hover:scale-[1.04] hover:shadow-md hover:z-10"
                                )}
                            >
                                {isSelected && (
                                    <div className="absolute top-1 left-1">
                                        <CheckSquare className="w-3 h-3 text-orange-500" />
                                    </div>
                                )}
                                <p className={cn("text-[9px] font-bold uppercase tracking-tight mb-0.5 opacity-60", style.label)}>
                                    R{row}C{col}
                                </p>
                                {student ? (
                                    <>
                                        <p className={cn("text-[10px] leading-tight text-center truncate w-full px-0.5", style.text)}>
                                            {student.studentCode}
                                        </p>
                                        <p className="text-[8.5px] text-slate-400 truncate w-full text-center px-0.5 mt-0.5">
                                            {student.studentName?.split(" ").slice(-1)[0]}
                                        </p>
                                    </>
                                ) : (
                                    <p className={cn("text-[9px] font-semibold opacity-40", style.text)}>
                                        {seat?.status ?? "·"}
                                    </p>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Teacher desk */}
            <div className="mt-6 flex justify-center">
                <div className="px-12 py-2 bg-slate-100 rounded-xl text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200">
                    {t("teacherDesk")}
                </div>
            </div>
        </div>
    );
}

// ─── Student List View ────────────────────────────────────────────────────────
interface StudentListViewProps {
    students: StudentExam[];
    selectedIds: Set<string>;
    onToggle: (id: string) => void;
    onStudentClick: (student: StudentExam) => void;
    activeSeat: ExamSeat | null;
}

function StudentListView({ students, selectedIds, onToggle, onStudentClick, activeSeat }: StudentListViewProps) {
    const t = useTranslations("ProctorSession");
    return (
        <div className="divide-y divide-slate-50">
            {students.map(s => {
                const isSelected = selectedIds.has(s.id);
                const statusColor = {
                    CHECKEDIN: "text-green-600 bg-green-50 border-green-200",
                    REGISTERED: "text-slate-500 bg-slate-50 border-slate-200",
                    CHECKEDOUT: "text-blue-600 bg-blue-50 border-blue-200",
                }[s.status] ?? "text-slate-500 bg-slate-50 border-slate-200";

                return (
                    <div
                        key={s.id}
                        className={cn("flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors", isSelected ? "bg-orange-50" : "hover:bg-slate-50/80")}
                    >
                        <button onClick={() => onToggle(s.id)} className="shrink-0">
                            {isSelected ? <CheckSquare className="w-4 h-4 text-orange-500" /> : <Square className="w-4 h-4 text-slate-300" />}
                        </button>
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-sm font-bold shrink-0 select-none">
                            {(s.studentName ?? "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0" onClick={() => onStudentClick(s)}>
                            <p className="text-sm font-semibold text-slate-900 truncate">{s.studentName || "—"}</p>
                            <p className="text-xs text-slate-400">{s.studentCode} · Desk {s.seatNumber || "N/A"}</p>
                        </div>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase", statusColor)}>
                            {s.status ? t(`studentStatus.${s.status}` as any) : t("studentStatus.REGISTERED")}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProctorExamSessionDetailPage() {
    const router = useRouter();
    const params = useParams();
    const scheduleId = params.id as string;
    const locale = getCurrentLocale();
    const t = useTranslations("ProctorSession");
    const { on } = useSocket();

    const { data: schedule, isLoading, error } = useExamScheduleById(scheduleId);
    const {
        data: studentsResp,
        isLoading: studentsLoading,
        refetch: refetchStudents,
    } = useStudentExamsBySession(scheduleId);
    const { seats, loading: seatsLoading, fetchSeats } = useSeatManagement(scheduleId);

    const students = studentsResp?.data ?? [];
    const rows = schedule?.maxRows ?? 5;
    const cols = schedule?.maxColumns ?? 6;

    const [viewMode, setViewMode] = useState<ViewMode>("seating");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [activeStudent, setActiveStudent] = useState<StudentExam | null>(null);
    const [activeSeat, setActiveSeat] = useState<ExamSeat | null>(null);
    const [showTicketDialog, setShowTicketDialog] = useState(false);

    useEffect(() => { fetchSeats(); }, [scheduleId, fetchSeats]);

    useEffect(() => {
        const cleanup = on?.("face_authenticated", (data: any) => {
            if (data?.examSessionId && data.examSessionId !== scheduleId) return;
            refetchStudents();
            fetchSeats();
        });

        return () => {
            if (cleanup) cleanup();
        };
    }, [on, scheduleId, refetchStudents, fetchSeats]);

    const toggleStudent = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const handleSeatClick = (seat: ExamSeat, student: StudentExam | null) => {
        setActiveSeat(seat);
        setActiveStudent(student);
    };

    const handleStudentClick = (student: StudentExam) => {
        setActiveStudent(student);
        const seatNum = student.seatNumber;
        const seat = seats.find(s => ((s.row - 1) * cols + s.col).toString() === seatNum);
        setActiveSeat(seat ?? null);
    };

    const selectedStudents = students.filter(s => selectedIds.has(s.id));

    if (isLoading) return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
    );

    if (error || !schedule) return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-slate-600">{t("failedToLoad")}</p>
            <Button onClick={() => router.push(`/${locale}${ROUTES.DASHBOARD_PROCTOR}`)}>{t("backToDashboard")}</Button>
        </div>
    );

    const open = schedule.examOpenTime ? parseLocalDate(schedule.examOpenTime) : null;
    const close = schedule.examCloseTime ? parseLocalDate(schedule.examCloseTime) : null;
    const status = computeStatus(open, close);

    const canCreateTicket = status === "PreExam" || status === "Ongoing" || status === "GracePeriod";
    const graceMinutes = status === "GracePeriod" ? getGraceMinutesLeft(close) : 0;
    const preExamMinutes = status === "PreExam" ? getPreExamMinutesLeft(open) : 0;

    const STATUS_CFG = {
        Upcoming: { color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500", label: t("status.upcoming") },
        PreExam: { color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500 animate-pulse", label: `Sắp thi (${preExamMinutes}m)` },
        Ongoing: { color: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500 animate-pulse", label: t("status.ongoing") },
        GracePeriod: { color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500 animate-pulse", label: `Grace Period (${graceMinutes}m left)` },
        Completed: { color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400", label: t("status.completed") },
    };
    const sc = STATUS_CFG[status];
    const checkedInCount = students.filter(s => s.status === "CHECKEDIN").length;

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-6 bg-slate-50/50 min-h-screen space-y-4">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-slate-500">
                <LayoutGrid className="h-4 w-4" />
                <button onClick={() => router.push(`/${locale}${ROUTES.DASHBOARD_PROCTOR}`)} className="hover:text-slate-900">{t("dashboard")}</button>
                <ChevronRight className="h-3 w-3" />
                <span className="text-slate-900 font-medium">{t("sessionDetail")}</span>
            </nav>

            {/* ── Top bar ─────────────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-2.5 bg-purple-50 rounded-xl shrink-0">
                        <FileText className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg font-bold text-slate-900">{schedule.subjectCode || "N/A"}</h1>
                            <span className="text-slate-300">·</span>
                            <span className="text-sm text-slate-500 font-mono">{schedule.examCode || "N/A"}</span>
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border", sc.color)}>
                                <span className={cn("w-1.5 h-1.5 rounded-full", sc.dot)} />
                                {sc.label}
                            </span>
                        </div>
                        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                            {open && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(open, "dd/MM/yyyy")}</span>}
                            {open && close && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(open, "HH:mm")} – {format(close, "HH:mm")}</span>}
                            {schedule.roomNumber && <span className="font-semibold text-slate-700">{t("room")} {schedule.roomNumber}</span>}
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" /><strong className="text-slate-700">{checkedInCount}/{students.length}</strong> {t("checkedIn")}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {canCreateTicket && selectedIds.size > 0 && (
                        <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2 text-sm" onClick={() => setShowTicketDialog(true)}>
                            <Ticket className="h-4 w-4" />{t("ticketFor")} ({selectedIds.size})
                        </Button>
                    )}
                    {canCreateTicket ? (
                        <Button variant="outline" className="gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 text-sm" onClick={() => { setSelectedIds(new Set()); setActiveStudent(null); setShowTicketDialog(true); }}>
                            <Ticket className="h-4 w-4" />{t("createTicket")}
                        </Button>
                    ) : (
                        <Button variant="outline" className="gap-2 border-slate-200 text-slate-400 cursor-not-allowed text-sm" disabled>
                            <Ticket className="h-4 w-4" />{t("createTicket")}
                        </Button>
                    )}
                    {selectedIds.size > 0 && (
                        <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
                            <X className="w-3 h-3" />{t("clearSelection")}
                        </button>
                    )}
                </div>
            </div>

            {/* ── Main Layout ──────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">

                {/* Left: session info */}
                <div className="xl:col-span-1 space-y-4">
                    <Card className="border-none shadow-sm overflow-hidden">
                        {/* Colored header */}
                        <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-3">
                            <h2 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5" />{t("sessionInfo")}
                            </h2>
                        </div>
                        <CardContent className="p-0">
                            {[
                                { icon: <BookOpen className="h-3.5 w-3.5 text-violet-500" />, label: t("subject"), value: schedule.subjectCode || "N/A", bold: true },
                                { icon: <Calendar className="h-3.5 w-3.5 text-blue-500" />,   label: t("semester"), value: schedule.semester || "N/A" },
                                { icon: <MapPin className="h-3.5 w-3.5 text-emerald-500" />,    label: t("room"),     value: schedule.roomNumber || "N/A", bold: true },
                                { icon: <User className="h-3.5 w-3.5 text-orange-500" />,       label: t("proctor"), value: schedule.proctorName || schedule.proctorId || "N/A" },
                                { icon: <Users className="h-3.5 w-3.5 text-slate-400" />,       label: t("hallInvigilator"), value: (schedule as any).hallInvigilatorName || "N/A" },
                            ].map(({ icon, label, value, bold }, idx) => (
                                <div key={label} className={cn("flex items-center gap-3 px-4 py-3", idx !== 4 && "border-b border-slate-50")}>
                                    <span className="shrink-0">{icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
                                        <p className={cn("text-xs text-slate-800 truncate mt-0.5", bold && "font-bold")}>{value}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Stats mini-cards */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-3 py-3 text-center">
                            <p className="text-2xl font-black text-emerald-600">{checkedInCount}</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{t("checkedIn")}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-3 py-3 text-center">
                            <p className="text-2xl font-black text-slate-700">{students.length}</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{t("students")}</p>
                        </div>
                    </div>

                    {/* Note / Open Code */}
                    {(schedule.note || schedule.openCode) && (
                        <Card className="border-none shadow-sm overflow-hidden">
                            <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-3">
                                <h2 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                                    <BookOpen className="h-3.5 w-3.5" />{t("notes")}
                                </h2>
                            </div>
                            <CardContent className="p-4 space-y-3">
                                {schedule.note && <p className="text-xs text-slate-600 leading-relaxed">{schedule.note}</p>}
                                {schedule.openCode && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide mb-0.5">{t("openCode")}</p>
                                            <p className="text-sm font-black text-amber-900 tracking-widest">{schedule.openCode}</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Center: seating plan / list */}
                <div className="xl:col-span-2">
                    <Card className="border-none shadow-sm overflow-hidden h-full">
                        {/* View toggle + header */}
                        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-white">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                                    {viewMode === "seating" ? <MapIcon className="h-4 w-4 text-slate-500" /> : <LayoutList className="h-4 w-4 text-slate-500" />}
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-900 text-sm">
                                        {viewMode === "seating" ? t("seatingPlan") : t("students")}
                                    </h2>
                                    <p className="text-[11px] text-slate-400">{students.length} sinh viên · {checkedInCount} có mặt</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setViewMode("seating")}
                                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                        viewMode === "seating" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                                >
                                    <MapIcon className="w-3.5 h-3.5" />{t("plan")}
                                </button>
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                        viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                                >
                                    <LayoutList className="w-3.5 h-3.5" />{t("list")}
                                </button>
                            </div>
                        </div>

                        <div className={cn("overflow-y-auto", viewMode === "seating" ? "p-5" : "")}>
                            {seatsLoading || studentsLoading ? (
                                <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
                                    <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">{t("loading")}</span>
                                </div>
                            ) : viewMode === "seating" ? (
                                <SeatingFloorPlan
                                    seats={seats}
                                    students={students}
                                    rows={rows}
                                    cols={cols}
                                    selectedIds={selectedIds}
                                    onSeatClick={handleSeatClick}
                                    activeSeatId={activeSeat?.id ?? null}
                                />
                            ) : (
                                <StudentListView
                                    students={students}
                                    selectedIds={selectedIds}
                                    onToggle={toggleStudent}
                                    onStudentClick={handleStudentClick}
                                    activeSeat={activeSeat}
                                />
                            )}
                        </div>

                        {/* Bottom bar when students selected */}
                        {selectedIds.size > 0 && (
                            <div className="px-5 py-3.5 border-t border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-black">
                                        {selectedIds.size}
                                    </div>
                                    <span className="text-sm text-orange-700 font-semibold">
                                        {t("students")} {t("selected")}
                                    </span>
                                </div>
                                <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2 text-sm py-2 h-9 shadow-sm shadow-orange-200"
                                    onClick={() => setShowTicketDialog(true)}>
                                    <Ticket className="h-4 w-4" />{t("createTicketForSelected")}
                                </Button>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right: student detail panel */}
                <div className="xl:col-span-1">
                    {activeStudent ? (
                        <Card className="border-none shadow-sm p-5 h-full">
                            <StudentPanel
                                student={activeStudent}
                                seat={activeSeat}
                                isSelected={selectedIds.has(activeStudent.id)}
                                onToggleSelect={() => toggleStudent(activeStudent.id)}
                                onClose={() => { setActiveStudent(null); setActiveSeat(null); }}
                                onCreateTicket={() => {
                                    if (!selectedIds.has(activeStudent.id)) toggleStudent(activeStudent.id);
                                    setShowTicketDialog(true);
                                }}
                            />
                        </Card>
                    ) : activeSeat ? (
                        <Card className="border-none shadow-sm p-5 h-full">
                            <div className="flex flex-col h-full">
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                                    <h3 className="font-bold text-slate-900 text-sm">Chi tiết ghế</h3>
                                    <button onClick={() => setActiveSeat(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 p-5 text-center mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-slate-300 flex items-center justify-center text-slate-500 text-xl mx-auto mb-3">
                                        <User className="w-6 h-6" />
                                    </div>
                                    <p className="font-bold text-slate-600 text-sm">Ghế {activeSeat.status}</p>
                                    <p className="text-xs text-slate-400 mt-0.5 font-mono">R{activeSeat.row}C{activeSeat.col}</p>
                                </div>
                                <div className="space-y-1 text-xs">
                                    {[
                                        { label: "Trạng thái", value: activeSeat.status },
                                        { label: "Vị trí", value: `Hàng ${activeSeat.row}, Cột ${activeSeat.col}` },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="flex items-center justify-between py-2 px-2.5 rounded-xl bg-slate-50">
                                            <span className="text-slate-400 font-medium">{label}</span>
                                            <span className="font-bold text-slate-700">{value}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-400 text-center mt-4 italic">Ghế trống — không có sinh viên</p>
                            </div>
                        </Card>
                    ) : (
                        <Card className="border-none shadow-sm h-full flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-white">
                            <div className="text-center text-slate-400">
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                    <Users className="w-8 h-8 opacity-30" />
                                </div>
                                <p className="text-sm font-semibold text-slate-500">{t("clickSeatOrStudent")}</p>
                                <p className="text-xs mt-1.5 opacity-60 leading-relaxed">{t("toViewDetail")}</p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            {/* Ticket Dialog */}
            {showTicketDialog && (
                <CreateTicketDialog
                    sessionId={scheduleId}
                    roomNumber={schedule.roomNumber}
                    selectedStudents={selectedStudents}
                    onClose={() => setShowTicketDialog(false)}
                    onSuccess={() => setSelectedIds(new Set())}
                />
            )}
        </div>
    );
}
