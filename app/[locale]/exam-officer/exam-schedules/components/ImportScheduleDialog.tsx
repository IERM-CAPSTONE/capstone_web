"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Loader2,
    AlertCircle,
    FileText,
    Import,
    Upload,
    CheckCircle,
    Edit2,
    Trash2,
    X
} from "lucide-react";
import { useImportWithStudents, useValidateImportSchedulePreview } from "@/hooks/use-exam-schedules";
import { useImportDialog } from "../hooks/useImportDialog";
import { ImportCapacityCheckResult } from "@/lib/api/exam-schedules";
import { roomsApi } from "@/lib/api/rooms";

interface ImportScheduleDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ImportScheduleDialog({ isOpen, onClose }: ImportScheduleDialogProps) {
    const {
        selectedFile,
        fileInputRef,
        handleFileSelect,
        previewLoaded,
        schedulePreview,
        studentPreview,
        activeTab,
        setActiveTab,
        failureTab,
        setFailureTab,
        editingRow,
        setEditingRow,
        editingIndex,
        handleEditRow,
        handleSaveEdit,
        handleCancelEdit,
        handleDeleteRow,
        currentPage,
        setCurrentPage,
        errorPage,
        setErrorPage,
        importError,
        setImportError,
        importSuccess,
        importStatus,
        setImportStatus,
        isWaitingForWorker,
        setIsWaitingForWorker,
        workerProgress,
        setWorkerProgress,
        setCurrentBatchId,
        handleReset,
        chunkArray,
    } = useImportDialog({ importType: "schedule" });

    const scheduleMutation = useImportWithStudents();
    const capacityCheckMutation = useValidateImportSchedulePreview();
    const [capacityCheck, setCapacityCheck] = useState<ImportCapacityCheckResult | null>(null);
    const [isCheckingCapacity, setIsCheckingCapacity] = useState(false);
    const isPending = scheduleMutation.isPending || isWaitingForWorker;

    const ITEMS_PER_PAGE = 20;
    const ERRORS_PER_PAGE = 10;

    const currentData = activeTab === "schedules" ? schedulePreview : studentPreview;
    const totalPages = Math.ceil(currentData.length / ITEMS_PER_PAGE);
    const paginatedData = currentData.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const filteredErrors = workerProgress.failedItems.filter(item =>
        failureTab === "schedule"
            ? item.type === "schedule"
            : item.type === "student"
    );

    const totalErrorPages = Math.ceil(filteredErrors.length / ERRORS_PER_PAGE);
    const paginatedErrors = filteredErrors.slice(
        (errorPage - 1) * ERRORS_PER_PAGE,
        errorPage * ERRORS_PER_PAGE
    );

    const buildFallbackCapacityCheck = async (): Promise<ImportCapacityCheckResult> => {
        const sessionToRoom = new Map<string, string>();
        const studentCountBySession = new Map<string, number>();

        schedulePreview.forEach((item: any) => {
            const session = String(item?.examSession || "").trim();
            const room = String(item?.room || "").trim();
            if (!session) return;
            if (room) {
                sessionToRoom.set(session, room);
            }
        });

        studentPreview.forEach((item: any) => {
            const session = String(item?.examSession || "").trim();
            if (!session) return;
            studentCountBySession.set(session, (studentCountBySession.get(session) || 0) + 1);
        });

        const sessions = Array.from(new Set([...sessionToRoom.keys(), ...studentCountBySession.keys()]));
        const rooms = Array.from(new Set(sessions.map((session) => sessionToRoom.get(session)).filter(Boolean) as string[]));

        const roomResults = await Promise.all(
            rooms.map(async (roomNumber) => {
                try {
                    const response = await roomsApi.getAll({ page: 1, limit: 1, roomNumber });
                    const room = response?.data?.[0] as any;
                    return [roomNumber.toLowerCase(), room || null] as const;
                } catch {
                    return [roomNumber.toLowerCase(), null] as const;
                }
            })
        );

        const roomMap = new Map<string, any>(roomResults);
        const errors: string[] = [];
        const warnings: string[] = [];
        const sessionResults: ImportCapacityCheckResult['sessions'] = [];

        let totalStudents = 0;
        let totalSeats = 0;
        let overloadedSessions = 0;

        sessions.forEach((session) => {
            const room = sessionToRoom.get(session) || "";
            const students = studentCountBySession.get(session) || 0;
            totalStudents += students;

            if (!room) {
                const reason = `Session "${session}" has no room value in preview data.`;
                errors.push(`${reason} Fix: add a valid room in the Room column.`);
                sessionResults.push({ examSession: session, room: "", students, totalSeats: null, canImport: false, reason });
                return;
            }

            const roomData = roomMap.get(room.toLowerCase());
            const totalSeatsForRoom = roomData?.total_seats ?? null;

            if (!roomData) {
                const reason = `Room "${room}" not found in system.`;
                errors.push(`${reason} Fix: correct room code in file or create room in Room Management.`);
                sessionResults.push({ examSession: session, room, students, totalSeats: null, canImport: false, reason });
                return;
            }

            if (totalSeatsForRoom === null || totalSeatsForRoom === undefined) {
                const reason = `Room "${room}" has no totalSeats configured.`;
                errors.push(`${reason} Fix: set totalSeats for this room before import.`);
                sessionResults.push({ examSession: session, room, students, totalSeats: null, canImport: false, reason });
                return;
            }

            totalSeats += Number(totalSeatsForRoom);

            if (students > Number(totalSeatsForRoom)) {
                overloadedSessions += 1;
                const overflow = students - Number(totalSeatsForRoom);
                const reason = `Session "${session}" has ${students} students but room "${room}" has ${totalSeatsForRoom} seats.`;
                errors.push(`${reason} Fix: reduce ${overflow} students for this session or move to a larger room.`);
                sessionResults.push({
                    examSession: session,
                    room,
                    students,
                    totalSeats: Number(totalSeatsForRoom),
                    canImport: false,
                    reason,
                });
                return;
            }

            if (students === 0) {
                warnings.push(`Session "${session}" has 0 students. Fix: verify student rows for this session in file.`);
            }

            sessionResults.push({
                examSession: session,
                room,
                students,
                totalSeats: Number(totalSeatsForRoom),
                canImport: true,
            });
        });

        return {
            canImport: errors.length === 0,
            errors,
            warnings,
            sessions: sessionResults,
            summary: {
                totalSessions: sessions.length,
                totalStudents,
                totalSeats,
                overloadedSessions,
            },
        };
    };

    const runCapacityCheck = async (): Promise<boolean> => {
        if (!previewLoaded) {
            setCapacityCheck(null);
            return false;
        }

        setIsCheckingCapacity(true);
        try {
            const response = await capacityCheckMutation.mutateAsync({
                importType: "schedule",
                validationMode: "preview",
                schedules: schedulePreview as any,
                students: studentPreview as any,
            });

            const result =
                (response as any)?.data?.capacityCheck ??
                (response as any)?.data?.data?.capacityCheck ??
                (response as any)?.capacityCheck;

            if (!result || typeof result.canImport !== "boolean") {
                console.error("Unexpected capacity-check response shape:", response);
                const fallback = await buildFallbackCapacityCheck();
                setCapacityCheck(fallback);
                setImportError(
                    fallback.canImport
                        ? "Using local capacity analysis because server response was incomplete."
                        : "Capacity check failed. See detailed fixes below."
                );
                return fallback.canImport;
            }

            setCapacityCheck(result);
            if (!result.canImport) {
                setImportError("Capacity check failed. Please fix the file content before importing.");
            } else {
                setImportError("");
            }

            return result.canImport;
        } catch (err: any) {
            setCapacityCheck(null);
            setImportError(err?.response?.data?.message || err?.message || "Failed to validate capacity.");
            return false;
        } finally {
            setIsCheckingCapacity(false);
        }
    };

    useEffect(() => {
        if (previewLoaded) {
            void runCapacityCheck();
            return;
        }

        setCapacityCheck(null);
    }, [previewLoaded]);

    const handleImport = async () => {
        if (!selectedFile) {
            setImportError("Please select a file first");
            return;
        }

        try {
            const canImport = await runCapacityCheck();
            if (!canImport) {
                return;
            }

            const STUDENT_CHUNK_SIZE = 100;
            const studentChunks = chunkArray(studentPreview, STUDENT_CHUNK_SIZE);
            const totalBatches = Math.max(1, studentChunks.length);
            const batchId = crypto.randomUUID();

            setCurrentBatchId(batchId);
            setWorkerProgress({ success: 0, errors: 0, failedItems: [] });

            for (let i = 0; i < totalBatches; i++) {
                const isFirstBatch = i === 0;
                const currentSchedules = isFirstBatch ? schedulePreview : [];
                const currentStudents = (studentChunks[i] || []);

                setImportStatus(`Sending batch ${i + 1}/${totalBatches}...`);

                await scheduleMutation.mutateAsync({
                    importType: "schedule",
                    schedules: currentSchedules as any,
                    students: currentStudents as any,
                    validationMode: "import",
                    batchId: batchId,
                    totalItems: schedulePreview.length + studentPreview.length
                });
            }

            setImportStatus("Data sent to server. Processing in background...");
            setIsWaitingForWorker(true);
            setImportError("");
        } catch (err: any) {
            console.error(err);
            setImportError(err?.response?.data?.message || err?.message || "Failed to import.");
            setImportStatus("");
        }
    };

    const handleClose = () => {
        setCapacityCheck(null);
        handleReset();
        onClose();
    };

    const handleSaveEditAndCheck = () => {
        handleSaveEdit();
        setTimeout(() => {
            void runCapacityCheck();
        }, 0);
    };

    const handleDeleteRowAndCheck = (index: number) => {
        handleDeleteRow(index);
        setTimeout(() => {
            void runCapacityCheck();
        }, 0);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
            <Card className="w-full max-w-7xl border-none shadow-xl max-h-[90vh] overflow-y-auto">
                <CardContent className="p-6">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-50 rounded-lg">
                                <Import className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Import Exam Schedule</h3>
                                <p className="text-sm text-slate-500">Upload exam schedule file (Ca thi + Students)</p>
                            </div>
                        </div>
                        <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {importSuccess ? (
                        /* Success Screen */
                        <div className={`${workerProgress.errors > 0 ? 'py-6' : 'py-12'} text-center overflow-hidden flex flex-col max-h-[70vh]`}>
                            <div className="flex-shrink-0">
                                <div className="flex justify-center mb-4">
                                    <div className={`p-3 ${workerProgress.errors > 0 ? 'bg-orange-50' : 'bg-green-50'} rounded-full`}>
                                        {workerProgress.errors > 0 ? (
                                            <AlertCircle className="h-12 w-12 text-orange-500" />
                                        ) : (
                                            <CheckCircle className="h-12 w-12 text-green-500" />
                                        )}
                                    </div>
                                </div>
                                <h4 className="text-lg font-semibold text-slate-900 mb-2">
                                    {workerProgress.errors > 0 ? 'Import Completed with Errors' : 'Import Successful!'}
                                </h4>
                                <p className="text-sm text-slate-600 mb-6">
                                    Processed {workerProgress.success + workerProgress.errors} items:
                                    <span className="text-green-600 font-medium ml-1">{workerProgress.success} success</span>,
                                    <span className="text-red-600 font-medium ml-1">{workerProgress.errors} failures</span>.
                                </p>
                            </div>

                            {workerProgress.failedItems.length > 0 && (
                                <div className="text-left border rounded-lg overflow-hidden flex flex-col flex-1 min-h-0 bg-white shadow-sm">
                                    <div className="bg-slate-50 px-4 py-2 border-b">
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => { setFailureTab("schedule"); setErrorPage(1); }}
                                                className={`text-xs font-semibold uppercase tracking-wider py-1 border-b-2 transition-colors ${failureTab === "schedule" ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                                            >
                                                Schedule Errors ({workerProgress.failedItems.filter(f => f.type === 'schedule').length})
                                            </button>
                                            <button
                                                onClick={() => { setFailureTab("student"); setErrorPage(1); }}
                                                className={`text-xs font-semibold uppercase tracking-wider py-1 border-b-2 transition-colors ${failureTab === "student" ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
                                            >
                                                Student Errors ({workerProgress.failedItems.filter(f => f.type === 'student').length})
                                            </button>
                                        </div>
                                    </div>

                                    <div className="overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-200 flex-1">
                                        <table className="w-full text-xs">
                                            <thead className="bg-slate-50 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-slate-500 font-medium w-1/3">Row Data</th>
                                                    <th className="px-4 py-2 text-left text-slate-500 font-medium">Error Message</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {paginatedErrors.map((fail, idx) => (
                                                    <tr key={idx} className="hover:bg-red-50/30">
                                                        <td className="px-4 py-2 font-mono text-slate-600 break-all">
                                                            {failureTab === "schedule" && (fail.data?.examSession || fail.item?.examSession || 'Unknown')}
                                                            {failureTab === "student" && (fail.data?.studentCode || fail.item?.studentCode || 'Unknown')}
                                                        </td>
                                                        <td className="px-4 py-2 text-red-600 italic">
                                                            {fail.message || fail.error}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination - Sticky at bottom */}
                                    {totalErrorPages > 1 && (
                                        <div className="p-2 border-t bg-slate-50 flex items-center justify-center gap-2 flex-shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={errorPage === 1}
                                                onClick={() => setErrorPage(p => p - 1)}
                                                className="h-7 text-[10px]"
                                            >
                                                Prev
                                            </Button>
                                            <span className="text-[10px] text-slate-500">
                                                Page {errorPage} of {totalErrorPages}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={errorPage === totalErrorPages}
                                                onClick={() => setErrorPage(p => p + 1)}
                                                className="h-7 text-[10px]"
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {!previewLoaded ? (
                                /* Upload Screen */
                                <div className="space-y-4">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:border-purple-500 transition-colors cursor-pointer bg-slate-50/50"
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="p-3 bg-white rounded-lg shadow-sm">
                                                <Upload className="h-8 w-8 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-700">
                                                    Click to upload or drag and drop
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    CSV or Excel files only (Max 10MB)
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedFile && (
                                        <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-5 w-5 text-orange-500" />
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {(selectedFile.size / 1024).toFixed(2)} KB
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    handleReset();
                                                }}
                                                className="text-slate-400 hover:text-slate-600"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}

                                    {importError && (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-red-600">{importError}</p>
                                        </div>
                                    )}

                                    {/* File Format Info */}
                                    <Card className="bg-blue-50/50 border-blue-100 border shadow-none">
                                        <CardContent className="p-4">
                                            <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                                <FileText className="h-4 w-4" />
                                                File Format Requirements
                                            </h4>
                                            <ul className="text-xs text-blue-700 space-y-1">
                                                <li>• Columns: Ca thi, Mã SV, MemberCode, Họ tên, CCCD, STT, Môn thi</li>
                                                <li>• Ca thi format: DD/MM/YYYY HHhMM-HHhMM ROOM</li>
                                                <li>• First row should contain column headers</li>
                                            </ul>
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : (
                                /* Preview Screen - Continues in next message due to length */
                                <>
                                    <div className="flex gap-4 border-b border-slate-200 mb-4">
                                        <button
                                            onClick={() => { setActiveTab("schedules"); setCurrentPage(1); }}
                                            className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === "schedules"
                                                ? "text-orange-600 border-b-2 border-orange-600"
                                                : "text-slate-600 hover:text-slate-900"
                                                }`}
                                        >
                                            Exam Schedules ({schedulePreview.length})
                                        </button>
                                        <button
                                            onClick={() => { setActiveTab("students"); setCurrentPage(1); }}
                                            className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === "students"
                                                ? "text-orange-600 border-b-2 border-orange-600"
                                                : "text-slate-600 hover:text-slate-900"
                                                }`}
                                        >
                                            Students ({studentPreview.length})
                                        </button>
                                    </div>

                                    {importError && (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 mb-4">
                                            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-red-600">{importError}</p>
                                        </div>
                                    )}

                                    {importStatus && (
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                                            <p className="text-sm text-blue-700">{importStatus}</p>
                                        </div>
                                    )}

                                    {previewLoaded && (
                                        <div className={`p-3 border rounded-lg mb-4 ${capacityCheck?.canImport ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className={`text-sm font-semibold ${capacityCheck?.canImport ? "text-emerald-700" : "text-red-700"}`}>
                                                        {capacityCheck?.canImport ? "Capacity Check Passed" : "Capacity Check Failed"}
                                                    </p>
                                                    {capacityCheck && (
                                                        <p className="text-xs text-slate-700 mt-1">
                                                            Sessions: {capacityCheck.summary.totalSessions} | Students: {capacityCheck.summary.totalStudents} | Total Seats: {capacityCheck.summary.totalSeats}
                                                        </p>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={isCheckingCapacity || isPending}
                                                    onClick={() => void runCapacityCheck()}
                                                >
                                                    {isCheckingCapacity ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Checking...
                                                        </>
                                                    ) : (
                                                        "Re-check Capacity"
                                                    )}
                                                </Button>
                                            </div>

                                            {capacityCheck && capacityCheck.errors.length > 0 && (
                                                <div className="mt-2">
                                                    <p className="text-xs font-semibold text-red-700">Errors and Fix Guidance</p>
                                                    <ul className="mt-1 text-xs text-red-700 space-y-1">
                                                        {capacityCheck.errors.slice(0, 5).map((error, index) => (
                                                            <li key={index}>- {error}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {capacityCheck && capacityCheck.warnings.length > 0 && (
                                                <div className="mt-2">
                                                    <p className="text-xs font-semibold text-amber-700">Warnings and Recommendations</p>
                                                    <ul className="mt-1 text-xs text-amber-700 space-y-1">
                                                        {capacityCheck.warnings.slice(0, 5).map((warning, index) => (
                                                            <li key={index}>- {warning}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {capacityCheck && capacityCheck.sessions.some(s => !s.canImport) && (
                                                <div className="mt-3 border border-red-200 rounded-md bg-white">
                                                    <div className="px-3 py-2 border-b border-red-100 text-xs font-semibold text-red-700">
                                                        Sessions that must be fixed before import
                                                    </div>
                                                    <div className="max-h-40 overflow-y-auto">
                                                        <table className="w-full text-xs">
                                                            <thead className="bg-red-50">
                                                                <tr>
                                                                    <th className="px-2 py-1 text-left">Session</th>
                                                                    <th className="px-2 py-1 text-left">Room</th>
                                                                    <th className="px-2 py-1 text-left">Students</th>
                                                                    <th className="px-2 py-1 text-left">Seats</th>
                                                                    <th className="px-2 py-1 text-left">How to fix</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {capacityCheck.sessions.filter(s => !s.canImport).slice(0, 10).map((s, idx) => {
                                                                    const overflow = (s.totalSeats ?? 0) > 0 ? s.students - (s.totalSeats ?? 0) : null;
                                                                    const fix =
                                                                        !s.room
                                                                            ? 'Add room value in file'
                                                                            : s.totalSeats == null
                                                                                ? 'Configure totalSeats for room'
                                                                                : overflow && overflow > 0
                                                                                    ? `Move/reduce ${overflow} students or use bigger room`
                                                                                    : 'Check room/session mapping';
                                                                    return (
                                                                        <tr key={`${s.examSession}-${idx}`} className="border-t border-red-50">
                                                                            <td className="px-2 py-1">{s.examSession}</td>
                                                                            <td className="px-2 py-1">{s.room || '-'}</td>
                                                                            <td className="px-2 py-1">{s.students}</td>
                                                                            <td className="px-2 py-1">{s.totalSeats ?? '-'}</td>
                                                                            <td className="px-2 py-1">{fix}</td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Preview Table */}
                                    <div className="overflow-x-auto border border-slate-200 rounded-lg mb-4 max-h-[400px] overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 sticky top-0">
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    <th className="px-4 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">No.</th>
                                                    {currentData.length > 0 && Object.keys(currentData[0])
                                                        .filter(k => k !== "stt")
                                                        .map(key => {
                                                            const headerName = key.replace(/([A-Z])/g, ' $1')
                                                                .replace(/^./, str => str.toUpperCase());
                                                            return (
                                                                <th key={key} className="px-4 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">
                                                                    {headerName}
                                                                </th>
                                                            );
                                                        })}
                                                    <th className="px-4 py-2 text-center font-semibold text-slate-700">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedData.map((row, idx) => {
                                                    const actualIndex = (currentPage - 1) * ITEMS_PER_PAGE + idx;
                                                    const isEditing = editingIndex === actualIndex;

                                                    return (
                                                        <tr key={actualIndex} className="border-b border-slate-100 hover:bg-slate-50">
                                                            <td className="px-4 py-2 text-slate-500 font-medium">
                                                                {actualIndex + 1}
                                                            </td>
                                                            {Object.entries(row)
                                                                .filter(([k]) => k !== "stt")
                                                                .map(([key, value]) => (
                                                                    <td key={key} className="px-4 py-2 text-slate-600">
                                                                        {isEditing ? (
                                                                            <input
                                                                                type="text"
                                                                                value={editingRow?.[key] || ''}
                                                                                onChange={(e) => setEditingRow({ ...editingRow, [key]: e.target.value })}
                                                                                className="w-full px-2 py-1 border rounded text-sm"
                                                                            />
                                                                        ) : (
                                                                            String(value || "")
                                                                        )}
                                                                    </td>
                                                                ))}
                                                            <td className="px-4 py-2 text-center">
                                                                {isEditing ? (
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <Button size="sm" onClick={handleSaveEditAndCheck}>Save</Button>
                                                                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <button
                                                                            onClick={() => handleEditRow(row, actualIndex)}
                                                                            className="p-1 hover:bg-blue-100 rounded text-blue-600 transition-colors"
                                                                            title="Edit"
                                                                        >
                                                                            <Edit2 className="h-4 w-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteRowAndCheck(actualIndex)}
                                                                            className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-sm text-slate-500">
                                            Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, currentData.length)} to {Math.min(currentPage * ITEMS_PER_PAGE, currentData.length)} of {currentData.length} entries
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                                                First
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                                                Previous
                                            </Button>
                                            <div className="flex items-center px-4 text-sm font-medium">
                                                Page {currentPage} of {totalPages}
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
                                                Next
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                                                Last
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Change File Button */}
                                    <div className="mb-4">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                                        >
                                            ← Change file
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
                                <Button variant="outline" onClick={handleClose} disabled={isPending}>
                                    Cancel
                                </Button>
                                {previewLoaded && (
                                    <Button onClick={handleImport} disabled={isPending || isCheckingCapacity || !capacityCheck?.canImport || (schedulePreview.length === 0 && studentPreview.length === 0)}>
                                        {isPending ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Importing...
                                            </>
                                        ) : (
                                            <>
                                                <Import className="mr-2 h-4 w-4" />
                                                Import Prepared Schedule
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>,
        document.body
    );
}
