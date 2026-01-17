"use client";

import { useState, useRef, useEffect } from "react";
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
import { useImportWithStudents, useImportProctors, useImportCodes } from "@/hooks/use-exam-schedules";
import { readFileContent, processImportData } from "../utils";

interface ImportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    importType: "schedule" | "proctor" | "examcode" | null;
}

export default function ImportDialog({ isOpen, onClose, importType }: ImportDialogProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [importError, setImportError] = useState("");
    const [importSuccess, setImportSuccess] = useState(false);

    // State for Schedule Import
    const [activeTab, setActiveTab] = useState<"schedules" | "students">("schedules");
    const [schedulePreview, setSchedulePreview] = useState<any[]>([]);
    const [studentPreview, setStudentPreview] = useState<any[]>([]);

    // State for Proctor Import
    const [proctorPreview, setProctorPreview] = useState<any[]>([]);

    // State for Exam Code Import
    const [codePreview, setCodePreview] = useState<any[]>([]);

    const [previewLoaded, setPreviewLoaded] = useState(false);
    const [editingRow, setEditingRow] = useState<any>(null);
    const [editingType, setEditingType] = useState<"schedules" | "students" | "proctors" | "codes" | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helper to determine active preview type based on loaded data
    const previewType = codePreview.length > 0 ? "examcode" : (proctorPreview.length > 0 ? "proctor" : "schedule");

    const scheduleMutation = useImportWithStudents();
    const proctorMutation = useImportProctors();
    const codesMutation = useImportCodes();

    const isPending = scheduleMutation.isPending || proctorMutation.isPending || codesMutation.isPending;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
                setImportError("Please select a valid CSV or Excel file");
                return;
            }
            setSelectedFile(file);
            setImportError("");
            parseFile(file);
        }
    };

    const parseFile = async (file: File) => {
        try {
            const { headers, data } = await readFileContent(file);
            const result = processImportData(headers, data);

            // Strict Validation
            if (importType === "schedule" && result.type !== "schedule") {
                setImportError("Incorrect file type. Please upload a Schedule file (must contain 'Ca thi' or 'Mã SV').");
                setPreviewLoaded(false);
                return;
            }
            if (importType === "proctor" && result.type !== "proctor") {
                setImportError("Incorrect file type. Please upload a Proctor file (must contain 'ProctorEmail').");
                setPreviewLoaded(false);
                return;
            }
            if (importType === "examcode" && result.type !== "examcode") {
                setImportError("Incorrect file type. Please upload an Exam Code file (must contain 'Exam Code' or 'Mã đề').");
                setPreviewLoaded(false);
                return;
            }

            if (result.type === "schedule") {
                setSchedulePreview(result.schedules || []);
                setStudentPreview(result.students || []);
                setProctorPreview([]);
                setCodePreview([]);
                setActiveTab("schedules");
            } else if (result.type === "proctor") {
                setProctorPreview(result.proctors || []);
                setSchedulePreview([]);
                setStudentPreview([]);
                setCodePreview([]);
            } else if (result.type === "examcode") {
                setCodePreview(result.codes || []);
                setSchedulePreview([]);
                setStudentPreview([]);
                setProctorPreview([]);
            } else {
                setImportError("Could not determine file type from headers. Please check the file format.");
                return;
            }

            setPreviewLoaded(true);
            setImportError("");
            setCurrentPage(1);
        } catch (err: any) {
            setImportError("Failed to parse file: " + err.message);
            setPreviewLoaded(false);
        }
    };

    const handleDeleteRow = (type: "schedules" | "students" | "proctors" | "codes", index: number) => {
        if (type === "schedules") {
            setSchedulePreview(prev => prev.filter((_, i) => i !== index));
        } else if (type === "students") {
            setStudentPreview(prev => prev.filter((_, i) => i !== index));
        } else if (type === "proctors") {
            setProctorPreview(prev => prev.filter((_, i) => i !== index));
        } else if (type === "codes") {
            setCodePreview(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleEditRow = (type: "schedules" | "students" | "proctors" | "codes", row: any) => {
        setEditingRow({ ...row });
        setEditingType(type);
    };

    const handleSaveEdit = () => {
        if (!editingRow || !editingType) return;

        if (editingType === "schedules") {
            setSchedulePreview(prev =>
                prev.map(row => row.stt === editingRow.stt ? editingRow : row)
            );
        } else if (editingType === "students") {
            setStudentPreview(prev =>
                prev.map(row => row.stt === editingRow.stt ? editingRow : row)
            );
        } else if (editingType === "proctors") {
            setProctorPreview(prev =>
                prev.map(row => row.stt === editingRow.stt ? editingRow : row)
            );
        } else if (editingType === "codes") {
            setCodePreview(prev =>
                prev.map(row => row.stt === editingRow.stt ? editingRow : row)
            );
        }
        setEditingRow(null);
        setEditingType(null);
    };

    const [importStatus, setImportStatus] = useState("");

    const chunkArray = <T,>(array: T[], size: number): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    };

    const handleImport = async () => {
        if (!selectedFile) {
            setImportError("Please select a file first");
            return;
        }

        try {
            if (previewType === "schedule") {
                // Phase 1: Import Schedules (Chunk size: 50)
                const scheduleChunks = chunkArray(schedulePreview, 50);
                for (let i = 0; i < scheduleChunks.length; i++) {
                    setImportStatus(`Importing schedules: batch ${i + 1}/${scheduleChunks.length}...`);
                    await scheduleMutation.mutateAsync({
                        importType: "schedule",
                        schedules: scheduleChunks[i],
                        students: [] // Don't send students yet
                    });
                }

                // Phase 2: Import Students (Chunk size: 200)
                if (studentPreview.length > 0) {
                    const studentChunks = chunkArray(studentPreview, 200);
                    for (let i = 0; i < studentChunks.length; i++) {
                        setImportStatus(`Importing students: batch ${i + 1}/${studentChunks.length}...`);
                        await scheduleMutation.mutateAsync({
                            importType: "schedule",
                            schedules: [], // Don't resend schedules
                            students: studentChunks[i]
                        });
                    }
                }

            } else if (previewType === "proctor") {
                // Import Proctors (Chunk size: 100)
                const proctorChunks = chunkArray(proctorPreview, 100);
                for (let i = 0; i < proctorChunks.length; i++) {
                    setImportStatus(`Importing proctors: batch ${i + 1}/${proctorChunks.length}...`);
                    await proctorMutation.mutateAsync({
                        importType: "proctor",
                        proctors: proctorChunks[i]
                    });
                }
            } else if (previewType === "examcode") {
                // Import Exam Codes (Chunk size: 100)
                const codeChunks = chunkArray(codePreview, 100);
                for (let i = 0; i < codeChunks.length; i++) {
                    setImportStatus(`Importing exam codes: batch ${i + 1}/${codeChunks.length}...`);
                    await codesMutation.mutateAsync({
                        importType: "examcode",
                        codes: codeChunks[i]
                    });
                }
            }

            setImportStatus("Finalizing...");
            setImportSuccess(true);
            setImportError("");
            setTimeout(() => {
                handleClose();
            }, 2000);
        } catch (err: any) {
            console.error(err);
            setImportError(err?.response?.data?.message || err?.message || "Failed to import.");
            setImportSuccess(false);
            setImportStatus("");
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setImportError("");
        setImportSuccess(false);
        setPreviewLoaded(false);
        setSchedulePreview([]);
        setStudentPreview([]);
        setProctorPreview([]);
        setCodePreview([]);
        setEditingRow(null);
        setEditingType(null);
        setCurrentPage(1);
        if (fileInputRef.current) fileInputRef.current.value = "";
        onClose();
    };

    const ITEMS_PER_PAGE = 20;

    const [currentPage, setCurrentPage] = useState(1);

    // Determine current data array
    let currentData: any[] = [];
    if (previewType === "schedule") {
        currentData = activeTab === "schedules" ? schedulePreview : studentPreview;
    } else if (previewType === "proctor") {
        currentData = proctorPreview;
    } else if (previewType === "examcode") {
        currentData = codePreview;
    }

    const totalPages = Math.ceil(currentData.length / ITEMS_PER_PAGE);
    const paginatedData = currentData.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-7xl border-none shadow-xl max-h-[90vh] overflow-y-auto">
                <CardContent className="p-6">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-50 rounded-lg">
                                <Import className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    {importType === "schedule" && "Import Exam Schedule"}
                                    {importType === "proctor" && "Import Giám Thị"}
                                    {importType === "examcode" && "Import Exam Code & Open Code"}
                                </h3>
                                <p className="text-sm text-slate-500">
                                    {importType === "schedule" && "Upload exam schedule file (Ca thi + Students)"}
                                    {importType === "proctor" && "Upload proctor assignment file"}
                                    {importType === "examcode" && "Upload exam code and open code file"}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {importSuccess ? (
                        <div className="py-12 text-center">
                            <div className="flex justify-center mb-4">
                                <div className="p-3 bg-green-50 rounded-full">
                                    <CheckCircle className="h-12 w-12 text-green-500" />
                                </div>
                            </div>
                            <h4 className="text-lg font-semibold text-slate-900 mb-2">Import Successful!</h4>
                            <p className="text-sm text-slate-600">Data has been imported successfully.</p>
                        </div>
                    ) : (
                        <>
                            {!previewLoaded ? (
                                <div className="space-y-4">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:border-orange-500 transition-colors cursor-pointer bg-slate-50/50"
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
                                                    setSelectedFile(null);
                                                    if (fileInputRef.current) fileInputRef.current.value = "";
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
                                            {importType === "schedule" && (
                                                <ul className="text-xs text-blue-700 space-y-1">
                                                    <li>• Columns: Ca thi, Mã SV, MemberCode, Họ tên, CCCD, STT, Môn thi</li>
                                                    <li>• Ca thi format: DD/MM/YYYY HHhMM-HHhMM ROOM</li>
                                                    <li>• First row should contain column headers</li>
                                                </ul>
                                            )}
                                            {importType === "proctor" && (
                                                <ul className="text-xs text-blue-700 space-y-1">
                                                    <li>• Required columns: DateExam, TimeExam, ExamRoom, ProctorEmail</li>
                                                    <li>• Date format: DD/MM/YYYY</li>
                                                    <li>• Time format: HHhMM-HHhMM</li>
                                                </ul>
                                            )}
                                            {importType === "examcode" && (
                                                <ul className="text-xs text-blue-700 space-y-1">
                                                    <li>• Required columns: Start Date, Exam Code, Rooms</li>
                                                    <li>• Start Date format: DD/MM/YYYY HH:mm</li>
                                                    <li>• Exam Code supports "CODE (OPEN)" specific format</li>
                                                </ul>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : (
                                <>
                                    {/* Tabs */}
                                    {previewType === "schedule" ? (
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
                                    ) : previewType === "proctor" ? (
                                        <div className="flex gap-4 border-b border-slate-200 mb-4">
                                            <button
                                                className="px-4 py-2 font-medium text-sm text-orange-600 border-b-2 border-orange-600"
                                            >
                                                Proctors ({proctorPreview.length})
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-4 border-b border-slate-200 mb-4">
                                            <button
                                                className="px-4 py-2 font-medium text-sm text-orange-600 border-b-2 border-orange-600"
                                            >
                                                Exam Codes ({codePreview.length})
                                            </button>
                                        </div>
                                    )}

                                    {importError && (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 mb-4">
                                            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-red-600">{importError}</p>
                                        </div>
                                    )}

                                    {/* Preview Table */}
                                    <div className="overflow-x-auto border border-slate-200 rounded-lg mb-4 max-h-[400px] overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 sticky top-0">
                                                <tr className="border-b border-slate-200">
                                                    <th className="px-4 py-2 text-left font-semibold text-slate-700">STT</th>
                                                    {(() => {
                                                        const sampleRow = currentData.length > 0 ? currentData[0] : null;

                                                        if (sampleRow) {
                                                            return Object.keys(sampleRow)
                                                                .filter(k => k !== "stt" && k !== "examSession" && k !== "proctorType")
                                                                .map(key => (
                                                                    <th key={key} className="px-4 py-2 text-left font-semibold text-slate-700">
                                                                        {key}
                                                                    </th>
                                                                ));
                                                        }
                                                        return null;
                                                    })()}
                                                    <th className="px-4 py-2 text-center font-semibold text-slate-700">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    if (paginatedData.length === 0) {
                                                        return (
                                                            <tr>
                                                                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                                                                    No data to preview
                                                                </td>
                                                            </tr>
                                                        );
                                                    }

                                                    return paginatedData.map((row, idx) => (
                                                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                                            <td className="px-4 py-2 font-medium text-slate-700">{row.stt}</td>
                                                            {Object.entries(row)
                                                                .filter(([k]) => k !== "stt" && k !== "examSession" && k !== "proctorType")
                                                                .map(([key, value]) => (
                                                                    <td key={key} className="px-4 py-2 text-slate-600">
                                                                        {String(value || "")}
                                                                    </td>
                                                                ))}
                                                            <td className="px-4 py-2 text-center">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <button
                                                                        onClick={() => handleEditRow(
                                                                            previewType === "schedule" ? activeTab :
                                                                                previewType === "proctor" ? "proctors" : "codes",
                                                                            row
                                                                        )}
                                                                        className="p-1 hover:bg-blue-100 rounded text-blue-600 transition-colors"
                                                                        title="Edit"
                                                                    >
                                                                        <Edit2 className="h-4 w-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteRow(
                                                                            previewType === "schedule" ? activeTab :
                                                                                previewType === "proctor" ? "proctors" : "codes",
                                                                            (currentPage - 1) * ITEMS_PER_PAGE + idx
                                                                        )}
                                                                        className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ));
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination Controls */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="text-sm text-slate-500">
                                            Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, currentData.length)} to {Math.min(currentPage * ITEMS_PER_PAGE, currentData.length)} of {currentData.length} entries
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePageChange(1)}
                                                disabled={currentPage === 1}
                                            >
                                                First
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                            >
                                                Previous
                                            </Button>
                                            <div className="flex items-center px-4 text-sm font-medium">
                                                Page {currentPage} of {totalPages}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                            >
                                                Next
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handlePageChange(totalPages)}
                                                disabled={currentPage === totalPages}
                                            >
                                                Last
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Change File Button */}
                                    <div className="mb-4">
                                        <button
                                            onClick={() => {
                                                fileInputRef.current?.click();
                                            }}
                                            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                                        >
                                            ← Change file
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
                                <Button
                                    variant="outline"
                                    onClick={handleClose}
                                    disabled={isPending}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                                    onClick={handleImport}
                                    disabled={(!selectedFile || isPending || !previewLoaded) && !importSuccess}
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            {importStatus || "Importing..."}
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4" />
                                            Import
                                        </>
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Edit Modal */}
            {editingRow && editingType && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-lg border-none shadow-xl">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-slate-900">Edit Row</h3>
                                <button
                                    onClick={() => {
                                        setEditingRow(null);
                                        setEditingType(null);
                                    }}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4 max-h-[500px] overflow-y-auto">
                                {Object.entries(editingRow)
                                    .filter(([k]) => k !== "stt" && k !== "examSession" && k !== "proctorType")
                                    .map(([key, value]) => (
                                        <div key={key}>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                {key}
                                            </label>
                                            <input
                                                type="text"
                                                value={String(value)}
                                                onChange={(e) =>
                                                    setEditingRow({ ...editingRow, [key]: e.target.value })
                                                }
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                                            />
                                        </div>
                                    ))}
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setEditingRow(null);
                                        setEditingType(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-orange-500 hover:bg-orange-600 text-white"
                                    onClick={handleSaveEdit}
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
