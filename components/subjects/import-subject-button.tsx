"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2, Check, AlertCircle } from "lucide-react";
import { useImportSubjects } from "@/hooks/use-subjects";
import { toast } from "sonner";
import * as xlsx from "xlsx";
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
    const [isUploading, setIsUploading] = useState(false);
    const [allPreviewData, setAllPreviewData] = useState<PreviewData[]>([]);
    const [currentSheetIdx, setCurrentSheetIdx] = useState(0);
    const [showPreview, setShowPreview] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

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
                const workbook = xlsx.read(data, { type: "array" });

                const allSheetsData: PreviewData[] = workbook.SheetNames.map(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const json = xlsx.utils.sheet_to_json(worksheet) as any[];

                    const rows = json.slice(0, 50).map((row: any) => {
                        const keys = Object.keys(row);
                        const findValue = (keywords: string[]) => {
                            const foundKey = keys.find(k => keywords.some(kw => k.toUpperCase().includes(kw.toUpperCase())));
                            return foundKey ? row[foundKey] : null;
                        };

                        return {
                            code: findValue(["MÃ MÔN", "CODE"]) || Object.values(row)[1],
                            name: findValue(["TÊN MÔN", "NAME"]) || Object.values(row)[2],
                            block: findValue(["BLOCK"]) || "-",
                            duration: findValue(["THỜI LƯỢNG", "DURATION", "PHÚT"]) || "-",
                            description: findValue(["CHI TIẾT", "DETAILS", "THÔNG TIN"]) || "-",
                            department: findValue(["BỘ MÔN", "DEPARTMENT", "FACULTY"]) || "-",
                        };
                    });

                    return { sheetName, rows };
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
            const result = await importSubjects.mutateAsync(selectedFile);
            toast.success(result.message || "File uploaded successfully. Processing in background.", {
                icon: <Check className="h-4 w-4 text-emerald-500" />
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

    const currentData = allPreviewData[currentSheetIdx]?.rows || [];

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
                size="sm"
                onClick={handleClick}
                disabled={isUploading}
                className="rounded-full shadow-sm hover:bg-slate-50 dark:hover:bg-slate-900 border-dashed"
            >
                {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                    <FileUp className="h-4 w-4 mr-2 text-emerald-600" />
                )}
                {t("importSubjects")}
            </Button>

            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <FileUp className="h-5 w-5 text-emerald-600" />
                            {t("previewImportData") || "Preview Import Data"}
                        </DialogTitle>
                        <DialogDescription>
                            {t("previewDescription", { count: allPreviewData.length }) || `Review data across ${allPreviewData.length} sheets before importing.`}
                        </DialogDescription>
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
                                            ? "bg-emerald-100 text-emerald-700 font-medium"
                                            : "text-slate-500 hover:bg-slate-100"
                                    )}
                                >
                                    {sheet.sheetName} ({sheet.rows.length})
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="flex-1 overflow-hidden px-6">
                        <ScrollArea className="h-[60vh] border rounded-md">
                            <Table className="min-w-[800px]">
                                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead className="w-[100px] font-bold text-slate-900">{t("table.code")}</TableHead>
                                        <TableHead className="font-bold text-slate-900">{t("table.name")}</TableHead>
                                        <TableHead className="w-[100px] font-bold text-slate-900">Block</TableHead>
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

                    <DialogFooter className="p-6 pt-4 bg-slate-50 border-t">
                        <Button variant="ghost" onClick={() => setShowPreview(false)}>
                            {tCommon("cancel")}
                        </Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                            onClick={confirmImport}
                            disabled={allPreviewData.length === 0}
                        >
                            {t("confirmImportAll") || "Confirm Import All Sheets"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
