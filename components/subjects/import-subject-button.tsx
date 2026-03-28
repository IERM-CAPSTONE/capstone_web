"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2, Check, AlertCircle, CalendarDays } from "lucide-react";
import { useImportSubjects } from "@/hooks/use-subjects";
import { useSemesters } from "@/hooks/use-semesters";
import { useSocket } from "@/hooks/use-socket";
import { toast } from "sonner";
import * as xlsx from "xlsx";
import { useQueryClient } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils/cn";

interface PreviewData {
    sheetName: string;
    totalRows: number;
    rows: {
        code: string;
        name: string;
        block: string;
        duration: string;
        description: string;
        department: string;
    }[];
}

import { useTranslations } from "next-intl";

export function ImportSubjectButton() {
    const t = useTranslations("Subjects");
    const tCommon = useTranslations("Common");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const importSubjects = useImportSubjects();
    const queryClient = useQueryClient();
    const [isUploading, setIsUploading] = useState(false);
    const [allPreviewData, setAllPreviewData] = useState<PreviewData[]>([]);
    const [currentSheetIdx, setCurrentSheetIdx] = useState(0);
    const [showPreview, setShowPreview] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");

    const { data: semestersData } = useSemesters({ limit: 100 });
    const semesters = semestersData?.data || [];
    const { on } = useSocket();

    // Listen for import completion or failure via socket
    useEffect(() => {
        if (!on) return;

        const onCompleted = (data: any) => {
            if (data.action === "subjects") {
                // Refresh the list immediately
                queryClient.invalidateQueries({ queryKey: ["subjects"] });
                toast.dismiss("import-processing");
                toast.success(data.message || "Subjects imported successfully!", {
                    icon: <Check className="h-4 w-4 text-emerald-500" />,
                    description: `Success: ${data.successCount}, Error: ${data.errorCount}`,
                });
            }
        };

        const onFailed = (data: any) => {
            if (data.action === "subjects") {
                toast.dismiss("import-processing");
                toast.error(data.message || "Import failed", {
                    icon: <AlertCircle className="h-4 w-4 text-red-500" />,
                });
            }
        };

        const cleanupSuccess = on("IMPORT_COMPLETED", onCompleted);
        const cleanupError = on("IMPORT_FAILED", onFailed);

        return () => {
            cleanupSuccess();
            cleanupError();
        };
    }, [on, queryClient]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Clear previous state to avoid stale data
        setAllPreviewData([]);
        setSelectedSemesterId("");
        setSelectedFile(null);

        const validExtensions = [".xlsx", ".xls", ".csv"];
        const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

        if (!validExtensions.includes(fileExtension)) {
            toast.error("Invalid file format. Please upload an Excel or CSV file.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        try {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = xlsx.read(data, { type: "array", cellDates: true });

                const allSheetsData: PreviewData[] = workbook.SheetNames.map(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const json = xlsx.utils.sheet_to_json(worksheet, { defval: "" }) as any[];

                    const rows = json.slice(0, 100).map((row: any) => {
                        const keys = Object.keys(row);
                        
                        // Strict helper to find value by keywords, avoiding duplicates
                        const getVal = (keywords: string[]) => {
                            const foundKey = keys.find(k => 
                                keywords.map(kw => kw.toUpperCase()).includes(String(k).toUpperCase().trim())
                            );
                            if (foundKey) return row[foundKey];
                            
                            // Try partial match if no exact match
                            const partialKey = keys.find(k => 
                                keywords.some(kw => String(k).toUpperCase().includes(kw.toUpperCase()))
                            );
                            return partialKey ? row[partialKey] : null;
                        };

                        const code = getVal(["MÃ MÔN", "CODE", "SUBCODE", "SUB CODE", "SUB_CODE"]);
                        const name = getVal(["TÊN MÔN", "NAME", "SUBJECT NAME", "SUBJECTNAME", "TITLE"]);
                        const duration = getVal(["THỜI LƯỢNG", "DURATION", "PHÚT", "EXAMDURATION", "EXAM DURATION"]);
                        const block = getVal(["BLOCK", "HỌC KỲ", "HOCKY"]);
                        const dept = getVal(["BỘ MÔN", "DEPARTMENT", "FACULTY", "DEPT"]);
                        
                        // Only map exam parts if specific columns exist, matching backend logic
                        const examPart = getVal(["EXAMPART", "PHẦN THI", "PHANTHI", "PARTS", "EXTRAPARTS", "CHI TIẾT", "DETAILS", "DETAIL"]);
                        
                        return {
                            code: String(code || Object.values(row)[0] || "-"),
                            name: String(name || "-"),
                            block: String(block || "-"),
                            duration: String(duration || "-"),
                            department: String(dept || "-"),
                            description: examPart ? String(examPart) : "MC",
                        };
                    });

                    return { sheetName, rows, totalRows: json.length };
                });

                setAllPreviewData(allSheetsData);
                setCurrentSheetIdx(0);
                setSelectedFile(file);
                setShowPreview(true);
            };
            reader.readAsArrayBuffer(file);
        } catch (error) {
            toast.error("Error reading file preview");
            console.error(error);
        }
    };

    const confirmImport = async () => {
        if (!selectedFile) return;

        try {
            setIsUploading(true);
            setShowPreview(false);
            const result = await importSubjects.mutateAsync({
                file: selectedFile,
                semesterId: selectedSemesterId
            });
            toast.info(result.message || "Processing subjects in background...", {
                id: "import-processing",
                icon: <Loader2 className="h-4 w-4 animate-spin" />,
                duration: Infinity,
            });
        } catch (error: any) {
            console.error("Import failed:", error);
            toast.error(error.response?.data?.message || "Failed to import subjects. Please try again.", {
                icon: <AlertCircle className="h-4 w-4 text-red-500" />
            });
        } finally {
            setIsUploading(false);
            setSelectedFile(null);
            setAllPreviewData([]);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const currentSheetData = allPreviewData[currentSheetIdx];
    const currentData = currentSheetData?.rows || [];
    const totalRows = currentSheetData?.totalRows || 0;

    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
                className="hidden"
            />

            <Button
                variant="outline"
                onClick={handleClick}
                disabled={isUploading}
                className="h-14 px-8 border-slate-200 bg-white hover:bg-slate-50 hover:border-orange-200 text-slate-700 rounded-2xl transition-all active:scale-95 shadow-sm group"
            >
                {isUploading ? (
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                ) : (
                    <FileUp className="mr-3 h-5 w-5 text-orange-500 group-hover:-translate-y-0.5 transition-transform" />
                )}
                <span className="font-bold text-base">{t("importSubjects")}</span>
            </Button>

            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white">
                    <DialogHeader className="p-6 pb-2">
                        <div className="flex items-center justify-between pr-8">
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <FileUp className="h-5 w-5 text-orange-600" />
                                {t("previewImportData")}
                            </DialogTitle>
                            
                            {totalRows > 0 && (
                                <div className="px-4 py-1.5 bg-orange-50 border border-orange-100 rounded-full flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 opacity-60">Total Items</span>
                                    <span className="text-sm font-black text-orange-700">{totalRows}</span>
                                </div>
                            )}
                        </div>
                        <DialogDescription>
                            {t("previewDescription", { count: allPreviewData.length })}
                        </DialogDescription>

                        <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-center gap-4">
                            <div className="flex-1 space-y-1">
                                <label className="text-xs font-bold text-orange-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    Target Semester
                                </label>
                                <select
                                    className="w-full h-10 px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                    value={selectedSemesterId}
                                    onChange={(e) => setSelectedSemesterId(e.target.value)}
                                >
                                    <option value="">Select semester to import into</option>
                                    {semesters.map((sem) => (
                                        <option key={sem.id} value={sem.id}>
                                            {sem.name} ({sem.code})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="text-[10px] text-orange-600 max-w-[200px] italic">
                                * Existing subjects in this semester will be updated, new ones will be created.
                            </div>
                        </div>
                    </DialogHeader>

                    {allPreviewData.length > 1 && (
                        <div className="px-6 flex gap-2 overflow-x-auto pb-2 border-b mx-6 mb-2">
                            {allPreviewData.map((sheet, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentSheetIdx(idx)}
                                    className={cn(
                                        "px-3 py-1 text-sm rounded-md whitespace-nowrap transition-colors",
                                        currentSheetIdx === idx
                                            ? "bg-orange-100 text-orange-700 font-medium"
                                            : "text-slate-500 hover:bg-slate-100"
                                    )}
                                >
                                    {sheet.sheetName} ({sheet.totalRows})
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="flex-1 overflow-hidden px-6">
                        <div className="mb-2 text-[11px] text-slate-400 font-medium">
                            {currentData.length < totalRows ? `* Showing first ${currentData.length} items for preview` : `* Showing all ${totalRows} items`}
                        </div>
                        <ScrollArea className="h-[55vh] border rounded-md">
                            <Table className="min-w-[800px]">
                                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead className="w-[100px] font-bold text-slate-900">{t("table.code")}</TableHead>
                                        <TableHead className="font-bold text-slate-900">{t("table.name")}</TableHead>
                                        <TableHead className="w-[100px] font-bold text-slate-900">{t("table.block")}</TableHead>
                                        <TableHead className="w-[100px] font-bold text-slate-900">{t("dialog.duration")}</TableHead>
                                        <TableHead className="w-[120px] font-bold text-slate-900">{t("table.department")}</TableHead>
                                        <TableHead className="font-bold text-slate-900">{t("dialog.parts")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currentData.length > 0 ? (
                                        currentData.map((row, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium text-slate-700">{String(row.code || "-")}</TableCell>
                                                <TableCell className="text-slate-600 text-xs">{String(row.name || "-")}</TableCell>
                                                <TableCell className="text-slate-600 text-xs">{String(row.block || "-")}</TableCell>
                                                <TableCell className="text-slate-600 text-xs">{String(row.duration || "-")}</TableCell>
                                                <TableCell className="text-slate-600 text-xs">{String(row.department || "-")}</TableCell>
                                                <TableCell className="text-slate-500 text-[10px] leading-tight">
                                                    {String(row.description || "-")}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10 text-slate-400 italic">
                                                {tCommon("noResults")}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>

                    <DialogFooter className="p-6 pt-4 bg-slate-50 border-t mt-auto">
                        <Button variant="ghost" onClick={() => setShowPreview(false)}>
                            {tCommon("cancel")}
                        </Button>
                        <Button
                            className="bg-orange-600 hover:bg-orange-700 text-white gap-2 font-bold"
                            onClick={confirmImport}
                            disabled={allPreviewData.length === 0 || !selectedSemesterId}
                        >
                            {t("confirmImportAll")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
