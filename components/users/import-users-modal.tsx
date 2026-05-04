"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUp, FileSpreadsheet, X, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { useImportStudents } from "@/hooks/use-users";
import { cn } from "@/lib/utils/cn";
import { useTranslations } from "next-intl";

interface ImportUsersModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ImportUsersModal({ isOpen, onClose }: ImportUsersModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const importMutation = useImportStudents();
    const t = useTranslations("Accounts.importModal");

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        setError(null);

        if (selectedFile) {
            const extension = selectedFile.name.split(".").pop()?.toLowerCase();
            if (extension !== "xlsx" && extension !== "xls" && extension !== "csv") {
                setError(t("invalidFormat"));
                return;
            }
            if (selectedFile.size > 5 * 1024 * 1024) {
                setError(t("fileTooLarge"));
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            const extension = droppedFile.name.split(".").pop()?.toLowerCase();
            if (extension !== "xlsx" && extension !== "xls" && extension !== "csv") {
                setError(t("invalidFormat"));
                return;
            }
            setFile(droppedFile);
        }
    };

    const handleImport = async () => {
        if (!file) return;

        try {
            await importMutation.mutateAsync(file);
            onClose();
            setFile(null);
        } catch (err: any) {
            setError(err.response?.data?.message || t("importFailed"));
        }
    };

    const downloadTemplate = () => {
        const headers = ["StudentCode", "Name", "Email", "Role"];
        const sampleRows = [
            ["SE160123", "Nguyen Van A", "anv@fpt.edu.vn", "STUDENT"],
            ["SE160456", "Tran Thi B", "btt@fpt.edu.vn", "STUDENT"],
            ["EO001", "Officer X", "officerx@fpt.edu.vn", "EXAM_OFFICER"],
            ["PR002", "Proctor Y", "proctory@fpt.edu.vn", "PROCTOR"],
            ["SE160789", "Le Van C", "clv@fpt.edu.vn", "STUDENT"],
        ];

        const csvContent = [
            headers.join(","),
            ...sampleRows.map(row => row.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "account_import_template.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <Card className="w-full max-w-lg animate-in fade-in zoom-in duration-200">
                <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-orange-600" />
                        {t("title")}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={importMutation.isPending} className="h-8 w-8 p-0">
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>

                <CardContent className="pt-6">
                    <div className="space-y-5">
                        <p className="text-sm text-gray-500 leading-relaxed">
                            {t("description")}
                        </p>

                        <Button
                            variant="outline"
                            className="flex items-center gap-2 text-[#F37021] border-[#F37021]/20 bg-[#F37021]/5 hover:bg-[#F37021]/10 w-full justify-center h-11"
                            onClick={downloadTemplate}
                        >
                            <Download className="h-4 w-4" />
                            {t("downloadTemplate")}
                        </Button>

                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.add("border-orange-400", "bg-orange-50");
                            }}
                            onDragLeave={(e) => {
                                e.currentTarget.classList.remove("border-orange-400", "bg-orange-50");
                            }}
                            onDrop={(e) => {
                                e.currentTarget.classList.remove("border-orange-400", "bg-orange-50");
                                handleDrop(e);
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all",
                                file ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-[#F37021]/50 hover:bg-orange-50/30"
                            )}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept=".xlsx,.xls,.csv"
                            />
                            {file ? (
                                <>
                                    <div className="h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center border border-orange-200 shadow-sm">
                                        <FileSpreadsheet className="h-7 w-7 text-orange-600" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-semibold text-gray-900">{file.name}</p>
                                        <p className="text-xs text-orange-600 font-medium mt-1">{t("readyToImport")} • {(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="h-14 w-14 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:border-orange-200 transition-colors">
                                        <FileUp className="h-7 w-7 text-gray-400 group-hover:text-orange-500" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-semibold text-gray-700">{t("uploadCta")}</p>
                                        <p className="text-xs text-gray-400 mt-1">{t("uploadHint")}</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {error && (
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-100 shadow-sm">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span className="font-medium leading-normal">{error}</span>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="outline" onClick={onClose} disabled={importMutation.isPending} className="px-6 h-10">
                                {t("cancel")}
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={!file || importMutation.isPending}
                                className="bg-[#F37021] hover:bg-[#d95d15] text-white px-8 h-10 font-bold shadow-sm disabled:opacity-50"
                            >
                                {importMutation.isPending ? t("starting") : t("importAccounts")}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

