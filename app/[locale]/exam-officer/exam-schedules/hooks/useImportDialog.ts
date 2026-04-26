import { useState, useRef, useEffect } from "react";
import { readFileContent, processImportData } from "../utils";
import { useSocket } from "@/hooks/use-socket";
import { toast } from "sonner";

export type ImportType = "schedule" | "proctor" | "examcode";

interface UseImportDialogOptions {
    importType: ImportType;
    onImportComplete?: () => void;
}

export function useImportDialog({ importType, onImportComplete }: UseImportDialogOptions) {
    const DEFAULT_SCHEDULE_CAMPUS = "DN";
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [importError, setImportError] = useState("");
    const [importSuccess, setImportSuccess] = useState(false);
    const [previewLoaded, setPreviewLoaded] = useState(false);
    const [editingRow, setEditingRow] = useState<any>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [isWaitingForWorker, setIsWaitingForWorker] = useState(false);
    const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
    const [workerProgress, setWorkerProgress] = useState<{ success: number; errors: number; failedItems: any[] }>({
        success: 0,
        errors: 0,
        failedItems: []
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [errorPage, setErrorPage] = useState(1);
    const [importStatus, setImportStatus] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Schedule-specific states
    const [activeTab, setActiveTab] = useState<"schedules" | "students">("schedules");
    const [schedulePreview, setSchedulePreview] = useState<any[]>([]);
    const [studentPreview, setStudentPreview] = useState<any[]>([]);
    const [failureTab, setFailureTab] = useState<"schedule" | "student">("schedule");

    // Proctor-specific states
    const [proctorPreview, setProctorPreview] = useState<any[]>([]);

    // Exam code-specific states
    const [codePreview, setCodePreview] = useState<any[]>([]);

    const { on } = useSocket();

    // WebSocket listener for import completion
    useEffect(() => {
        const handleImportCompleted = (data: any) => {
            if (data.action !== importType) return;

            if (currentBatchId && data.batchId === currentBatchId) {
                setWorkerProgress(prev => {
                    const newSuccess = prev.success + data.successCount;
                    const newErrors = prev.errors + data.errorCount;
                    const newFailed = [...prev.failedItems, ...(data.failedItems || [])];
                    const totalProcessed = newSuccess + newErrors;

                    const totalExpected = importType === "schedule"
                        ? (schedulePreview.length + studentPreview.length)
                        : (importType === "proctor" ? proctorPreview.length : codePreview.length);

                    if (totalProcessed >= totalExpected) {
                        setIsWaitingForWorker(false);
                        setImportSuccess(true);
                        toast.success(`Import completed: ${newSuccess} success, ${newErrors} errors`);
                        setCurrentBatchId(null);
                        onImportComplete?.();
                    }

                    return {
                        success: newSuccess,
                        errors: newErrors,
                        failedItems: newFailed
                    };
                });
            }
        };

        const cleanup = on("IMPORT_COMPLETED", handleImportCompleted);
        return cleanup;
    }, [on, currentBatchId, importType, schedulePreview.length, studentPreview.length, proctorPreview.length, codePreview.length, onImportComplete]);

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

            // Validate file type
            if (result.type !== importType) {
                setImportError(`Incorrect file type. Please upload a ${importType} file.`);
                setPreviewLoaded(false);
                return;
            }

            if (result.type === "schedule") {
                setSchedulePreview((result.schedules || []).map((item) => ({
                    ...item,
                    campus: item.campus || DEFAULT_SCHEDULE_CAMPUS,
                })));
                setStudentPreview((result.students || []).map((item) => ({
                    ...item,
                    campus: item.campus || DEFAULT_SCHEDULE_CAMPUS,
                })));
                setActiveTab("schedules");
            } else if (result.type === "proctor") {
                setProctorPreview(result.proctors || []);
            } else if (result.type === "examcode") {
                setCodePreview(result.codes || []);
            }

            setPreviewLoaded(true);
            setImportError("");
            setCurrentPage(1);
        } catch (err: any) {
            setImportError("Failed to parse file: " + err.message);
            setPreviewLoaded(false);
        }
    };

    const handleDeleteRow = (index: number, type?: "schedules" | "students") => {
        if (importType === "schedule" && type) {
            if (type === "schedules") {
                setSchedulePreview(prev => prev.filter((_, i) => i !== index));
            } else {
                setStudentPreview(prev => prev.filter((_, i) => i !== index));
            }
        } else if (importType === "proctor") {
            setProctorPreview(prev => prev.filter((_, i) => i !== index));
        } else if (importType === "examcode") {
            setCodePreview(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleEditRow = (row: any, index: number) => {
        setEditingRow({ ...row });
        setEditingIndex(index);
    };

    const handleSaveEdit = (type?: "schedules" | "students") => {
        if (!editingRow || editingIndex === null) return;

        const updateArray = (prev: any[]) => {
            const newArr = [...prev];
            newArr[editingIndex] = editingRow;
            return newArr;
        };

        if (importType === "schedule" && type) {
            if (type === "schedules") {
                setSchedulePreview(updateArray);
            } else {
                setStudentPreview(updateArray);
            }
        } else if (importType === "proctor") {
            setProctorPreview(updateArray);
        } else if (importType === "examcode") {
            setCodePreview(updateArray);
        }

        setEditingRow(null);
        setEditingIndex(null);
    };

    const handleCancelEdit = () => {
        setEditingRow(null);
        setEditingIndex(null);
    };

    const handleReset = () => {
        setSelectedFile(null);
        setImportError("");
        setImportSuccess(false);
        setPreviewLoaded(false);
        setSchedulePreview([]);
        setStudentPreview([]);
        setProctorPreview([]);
        setCodePreview([]);
        setEditingRow(null);
        setEditingIndex(null);
        setCurrentPage(1);
        setErrorPage(1);
        setWorkerProgress({ success: 0, errors: 0, failedItems: [] });
        setCurrentBatchId(null);
        setIsWaitingForWorker(false);
        setImportStatus("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const chunkArray = <T,>(array: T[], size: number): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    };

    return {
        // File handling
        selectedFile,
        setSelectedFile,
        fileInputRef,
        handleFileSelect,

        // Preview states
        previewLoaded,
        schedulePreview,
        studentPreview,
        proctorPreview,
        codePreview,

        // Schedule-specific
        activeTab,
        setActiveTab,
        failureTab,
        setFailureTab,

        // Editing
        editingRow,
        setEditingRow,
        editingIndex,
        handleEditRow,
        handleSaveEdit,
        handleCancelEdit,
        handleDeleteRow,

        // Pagination
        currentPage,
        setCurrentPage,
        errorPage,
        setErrorPage,

        // Import status
        importError,
        setImportError,
        importSuccess,
        importStatus,
        setImportStatus,
        isWaitingForWorker,
        setIsWaitingForWorker,
        workerProgress,
        setWorkerProgress,
        currentBatchId,
        setCurrentBatchId,

        // Utilities
        handleReset,
        chunkArray,
    };
}
