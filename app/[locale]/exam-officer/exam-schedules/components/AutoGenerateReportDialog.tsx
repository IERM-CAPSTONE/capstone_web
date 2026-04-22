"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertCircle, X, Download, Users, DoorOpen, ChevronDown, ChevronUp } from "lucide-react";
import { useSocket } from "@/hooks/use-socket";
import * as XLSX from "xlsx";

export default function AutoGenerateReportDialog() {
    const locale = useLocale();
    const [isOpen, setIsOpen] = useState(false);
    const [failedItems, setFailedItems] = useState<any[]>([]);
    const [failedCount, setFailedCount] = useState(0);
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
    const { on: onSocket } = useSocket();

    useEffect(() => {
        const cleanupCalc = onSocket?.("AUTO_GENERATE_CALCULATED", (data: any) => {
            if (data.failedCount > 0) {
                setFailedCount(data.failedCount);
                setFailedItems(data.failedItems || []);
                setIsOpen(true);
                setExpandedIdx(null);
            }
        });

        return () => {
            if (cleanupCalc) cleanupCalc();
        };
    }, [onSocket]);

    const handleClose = () => {
        setIsOpen(false);
        setFailedItems([]);
        setExpandedIdx(null);
    };

    const handleExport = () => {
        if (failedItems.length === 0) return;

        const rows = failedItems
            .filter((item) => !isSummarySeparator(item) && !isSummaryMetric(item))
            .flatMap((item) => {
                if (Array.isArray(item.students) && item.students.length > 0) {
                    return item.students.map((studentCode: string) => ({
                        Roll: studentCode || "",
                        SubCode: item.subjectCode || "",
                        Login: "",
                        Online: "",
                    }));
                }

                return [];
            });

        if (rows.length === 0) return;

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "StudSub");
        XLSX.writeFile(wb, `StudSub_Failed_${new Date().getTime()}.xlsx`);
    };

    if (!isOpen) return null;

    const summaryRows = failedItems.filter((item) => isSummaryMetric(item));
    const detailRows = failedItems.filter((item) => !isSummarySeparator(item) && !isSummaryMetric(item));

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex justify-end p-4 pointer-events-none">
            <div className="w-[480px] bg-white h-full max-h-[90vh] mt-16 right-0 rounded-2xl shadow-2xl border border-red-100 flex flex-col overflow-hidden pointer-events-auto animate-in slide-in-from-right duration-300">
                <div className="p-4 bg-red-50 border-b border-red-100 flex items-center justify-between sticky top-0 z-10 shrink-0">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-5 w-5" />
                            <h3 className="font-black">
                                {locale === "vi" ? "Lập lịch chưa hoàn tất" : "Partial Scheduling"}
                            </h3>
                        </div>
                        <p className="text-xs font-bold text-red-800/60 mt-1">
                            {locale === "vi"
                                ? `Không thể xếp lịch ${failedCount} môn`
                                : `Failed to schedule ${failedCount} subjects`}
                        </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0 rounded-full hover:bg-red-100 text-red-600 hover:text-red-700">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-200 bg-slate-50">
                    <div className="flex flex-col gap-3">
                        {summaryRows.length > 0 && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                    <div>
                                        <h4 className="text-sm font-black uppercase tracking-wide text-slate-900">
                                            {locale === "vi" ? "Thống kê tổng hợp" : "Summary Statistics"}
                                        </h4>
                                        <p className="mt-1 text-xs font-medium text-slate-500">
                                            {locale === "vi" ? "Các kết quả chính của lần xếp lịch này" : "Key outcomes from the scheduling run"}
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-black text-red-600">
                                        {locale === "vi" ? `${failedCount} cụm lỗi` : `${failedCount} failed pools`}
                                    </span>
                                </div>

                                <div className="mt-4 grid grid-cols-1 gap-3">
                                    {summaryRows.map((item, idx) => (
                                        <div key={`summary-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                                            <p className="text-sm font-black text-slate-800">
                                                {normalizeMetricLabel(item.subjectCode, locale)}
                                            </p>
                                            <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
                                                {item.reason || "0"}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {detailRows.map((item, idx) => {
                            const hasStudents = item.students && item.students.length > 0;
                            const hasRooms = !!item.rooms;
                            const isExpanded = expandedIdx === idx;

                            return (
                                <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-slate-800 text-base">{item.subjectCode}</span>
                                                {item.examType && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-black">{item.examType}</span>}
                                            </div>
                                            {item.campus && <span className="text-[10px] bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-black tracking-widest">{item.campus}</span>}
                                        </div>
                                        <p className="text-sm text-slate-600 font-medium leading-tight mb-3">{item.reason}</p>

                                        <div className="flex flex-wrap gap-2">
                                            {hasStudents && (
                                                <button
                                                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                                                    className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl hover:bg-rose-100 transition-colors"
                                                >
                                                    <Users className="h-3 w-3" />
                                                    {locale === "vi"
                                                        ? `${item.students.length} sinh viên xung đột`
                                                        : `${item.students.length} students conflict`}
                                                    {isExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                                                </button>
                                            )}
                                            {hasRooms && (
                                                <button
                                                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                                                    className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl hover:bg-amber-100 transition-colors"
                                                >
                                                    <DoorOpen className="h-3 w-3" />
                                                    {locale === "vi"
                                                        ? `Cần ${item.rooms.needed} phòng, hiện có ${item.rooms.available}`
                                                        : `Needs ${item.rooms.needed} rooms, ${item.rooms.available} available`}
                                                    {isExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="border-t border-slate-100 bg-slate-50 p-4">
                                            {hasStudents && (
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                                        <Users className="h-3 w-3" /> {locale === "vi" ? "Sinh viên xung đột" : "Conflicting Students"}
                                                    </p>
                                                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                                                        {item.students.map((s: string) => (
                                                            <span key={s} className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg">{s}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {hasRooms && (
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                                        <DoorOpen className="h-3 w-3" /> {locale === "vi" ? `Cơ sở ${item.rooms.campus} - Phòng trống` : `Campus ${item.rooms.campus} - Available Rooms`}
                                                    </p>
                                                    {item.rooms.roomNumbers && item.rooms.roomNumbers.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {item.rooms.roomNumbers.map((r: string) => (
                                                                <span key={r} className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">{r}</span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-slate-500 italic">{locale === "vi" ? "Không còn phòng trống" : "No rooms available at all"}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4 bg-white border-t border-slate-100 shrink-0 flex gap-3">
                    <Button onClick={handleClose} variant="outline" className="flex-1 rounded-xl h-11 font-bold border-slate-200">
                        {locale === "vi" ? "Đóng" : "Close"}
                    </Button>
                    <Button onClick={handleExport} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl h-11">
                        <Download className="h-4 w-4 mr-2" /> {locale === "vi" ? "Xuất Excel" : "Export Excel"}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
}

function isSummarySeparator(item: any) {
    const subjectCode = String(item?.subjectCode || "").trim();
    return /^=+$/.test(subjectCode) || /^=+.*=+$/.test(subjectCode);
}

function isSummaryMetric(item: any) {
    const subjectCode = String(item?.subjectCode || "").trim();
    return (
        subjectCode === "Total Excel Records" ||
        subjectCode === "Successfully Scheduled Students" ||
        subjectCode === "Unscheduled Students" ||
        subjectCode === "Total Failed Subject Pools" ||
        subjectCode.startsWith("Count by Reason:")
    );
}

function normalizeMetricLabel(subjectCode: string, locale: string) {
    const value = String(subjectCode || "").trim();

    if (value.startsWith("Count by Reason:")) {
        return locale === "vi"
            ? value.replace("Count by Reason:", "Lý do:")
            : value.replace("Count by Reason:", "Reason:");
    }

    if (locale !== "vi") {
        return value;
    }

    const labels: Record<string, string> = {
        "Total Excel Records": "Tổng số dòng Excel",
        "Successfully Scheduled Students": "Số sinh viên xếp lịch thành công",
        "Unscheduled Students": "Số sinh viên chưa xếp được lịch",
        "Total Failed Subject Pools": "Tổng số cụm môn bị lỗi",
    };

    return labels[value] || value;
}
