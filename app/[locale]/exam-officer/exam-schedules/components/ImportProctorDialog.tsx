"use client";

import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
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
    X,
} from "lucide-react";
import { useImportProctors } from "@/hooks/use-exam-schedules";
import { useImportDialog } from "../hooks/useImportDialog";

interface ImportProctorDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ImportProctorDialog({ isOpen, onClose }: ImportProctorDialogProps) {
    const t = useTranslations("AutoGenerate.importProctor");

    const {
        selectedFile,
        fileInputRef,
        handleFileSelect,
        previewLoaded,
        proctorPreview,
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
    } = useImportDialog({ importType: "proctor" });

    const proctorMutation = useImportProctors();
    const isPending = proctorMutation.isPending || isWaitingForWorker;

    const ITEMS_PER_PAGE = 20;
    const ERRORS_PER_PAGE = 10;

    const totalPages = Math.ceil(proctorPreview.length / ITEMS_PER_PAGE);
    const paginatedData = proctorPreview.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE,
    );

    const totalErrorPages = Math.ceil(workerProgress.failedItems.length / ERRORS_PER_PAGE);
    const paginatedErrors = workerProgress.failedItems.slice(
        (errorPage - 1) * ERRORS_PER_PAGE,
        errorPage * ERRORS_PER_PAGE,
    );

    const handleImport = async () => {
        if (!selectedFile) {
            setImportError(t("selectFileFirst"));
            return;
        }

        try {
            const proctorChunks = chunkArray(proctorPreview, 100);
            const batchId = crypto.randomUUID();
            setCurrentBatchId(batchId);
            setWorkerProgress({ success: 0, errors: 0, failedItems: [] });

            for (let i = 0; i < proctorChunks.length; i++) {
                setImportStatus(t("sendingBatch", { current: i + 1, total: proctorChunks.length }));
                await proctorMutation.mutateAsync({
                    importType: "proctor" as any,
                    proctors: proctorChunks[i],
                    batchId,
                    totalItems: proctorPreview.length,
                } as any);
            }

            setImportStatus(t("processingBackground"));
            setIsWaitingForWorker(true);
            setImportError("");
        } catch (err: any) {
            console.error(err);
            setImportError(
                err?.response?.data?.message || err?.message || t("importFailed"),
            );
            setImportStatus("");
        }
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <Card className="max-h-[90vh] w-full max-w-7xl overflow-y-auto border-none shadow-xl">
                <CardContent className="p-6">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-green-50 p-2">
                                <Import className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">
                                    {t("title")}
                                </h3>
                                <p className="text-sm text-slate-500">
                                    {t("description")}
                                </p>
                            </div>
                        </div>
                        <button onClick={handleClose} className="text-slate-400 transition-colors hover:text-slate-600">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {importSuccess ? (
                        <div className={`${workerProgress.errors > 0 ? "py-6" : "py-12"} flex max-h-[70vh] flex-col overflow-hidden text-center`}>
                            <div className="shrink-0">
                                <div className="mb-4 flex justify-center">
                                    <div className={`rounded-full p-3 ${workerProgress.errors > 0 ? "bg-orange-50" : "bg-green-50"}`}>
                                        {workerProgress.errors > 0 ? (
                                            <AlertCircle className="h-12 w-12 text-orange-500" />
                                        ) : (
                                            <CheckCircle className="h-12 w-12 text-green-500" />
                                        )}
                                    </div>
                                </div>
                                <h4 className="mb-2 text-lg font-semibold text-slate-900">
                                    {workerProgress.errors > 0
                                        ? t("successWithErrorsTitle")
                                        : t("successTitle")}
                                </h4>
                                <p className="mb-6 text-sm text-slate-600">
                                    {t("processedSummary", { count: workerProgress.success + workerProgress.errors })}
                                    <span className="ml-1 font-medium text-green-600">
                                        {t("successCount", { count: workerProgress.success })}
                                    </span>
                                    ,
                                    <span className="ml-1 font-medium text-red-600">
                                        {t("failureCount", { count: workerProgress.errors })}
                                    </span>
                                    .
                                </p>
                            </div>

                            {workerProgress.failedItems.length > 0 && (
                                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-white text-left shadow-sm">
                                    <div className="border-b bg-slate-50 px-4 py-2">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-red-600">
                                            {t("errorSectionTitle", { count: workerProgress.failedItems.length })}
                                        </span>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-200">
                                        <table className="w-full text-xs">
                                            <thead className="sticky top-0 bg-slate-50">
                                                <tr>
                                                    <th className="w-1/3 px-4 py-2 text-left font-medium text-slate-500">
                                                        {t("rowData")}
                                                    </th>
                                                    <th className="px-4 py-2 text-left font-medium text-slate-500">
                                                        {t("errorMessage")}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {paginatedErrors.map((fail, idx) => (
                                                    <tr key={idx} className="hover:bg-red-50/30">
                                                        <td className="break-all px-4 py-2 font-mono text-slate-600">
                                                            {fail.data?.proctorEmail ||
                                                                (fail.data
                                                                    ? `${fail.data.dateExam || ""} ${fail.data.timeExam || ""} ${fail.data.examRoom || ""}`
                                                                    : t("unknown"))}
                                                        </td>
                                                        <td className="px-4 py-2 italic text-red-600">
                                                            {fail.message || fail.error}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {totalErrorPages > 1 && (
                                        <div className="flex shrink-0 items-center justify-center gap-2 border-t bg-slate-50 p-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={errorPage === 1}
                                                onClick={() => setErrorPage((p) => p - 1)}
                                                className="h-7 text-[10px]"
                                            >
                                                {t("prev")}
                                            </Button>
                                            <span className="text-[10px] text-slate-500">
                                                {t("pageOf", { current: errorPage, total: totalErrorPages })}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={errorPage === totalErrorPages}
                                                onClick={() => setErrorPage((p) => p + 1)}
                                                className="h-7 text-[10px]"
                                            >
                                                {t("next")}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {!previewLoaded ? (
                                <div className="space-y-4">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="cursor-pointer rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center transition-colors hover:border-purple-500"
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="rounded-lg bg-white p-3 shadow-sm">
                                                <Upload className="h-8 w-8 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-700">
                                                    {t("uploadCta")}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {t("uploadHint")}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedFile && (
                                        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3">
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-5 w-5 text-green-500" />
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
                                        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                                            <p className="text-sm text-red-600">{importError}</p>
                                        </div>
                                    )}

                                    <Card className="border border-blue-100 bg-blue-50/50 shadow-none">
                                        <CardContent className="p-4">
                                            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-900">
                                                <FileText className="h-4 w-4" />
                                                {t("fileFormatTitle")}
                                            </h4>
                                            <ul className="space-y-1 text-xs text-blue-700">
                                                <li>• {t("requiredColumns")}</li>
                                                <li>• {t("dateFormat")}</li>
                                                <li>• {t("timeFormat")}</li>
                                            </ul>
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4 flex gap-4 border-b border-slate-200">
                                        <button className="border-b-2 border-green-600 px-4 py-2 text-sm font-medium text-green-600">
                                            {t("tabLabel", { count: proctorPreview.length })}
                                        </button>
                                    </div>

                                    {importError && (
                                        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                                            <p className="text-sm text-red-600">{importError}</p>
                                        </div>
                                    )}

                                    {importStatus && (
                                        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                                            <p className="text-sm text-blue-700">{importStatus}</p>
                                        </div>
                                    )}

                                    <div className="mb-4 max-h-[400px] overflow-y-auto overflow-x-auto rounded-lg border border-slate-200">
                                        <table className="w-full text-sm">
                                            <thead className="sticky top-0 bg-slate-50">
                                                <tr className="border-b border-slate-200 bg-slate-50">
                                                    <th className="whitespace-nowrap px-4 py-2 text-left font-semibold text-slate-700">
                                                        {t("index")}
                                                    </th>
                                                    {proctorPreview.length > 0 &&
                                                        Object.keys(proctorPreview[0])
                                                            .filter((k) => k !== "stt")
                                                            .map((key) => {
                                                                const headerName = key
                                                                    .replace(/([A-Z])/g, " $1")
                                                                    .replace(/^./, (str) => str.toUpperCase());

                                                                return (
                                                                    <th key={key} className="whitespace-nowrap px-4 py-2 text-left font-semibold text-slate-700">
                                                                        {headerName}
                                                                    </th>
                                                                );
                                                            })}
                                                    <th className="px-4 py-2 text-center font-semibold text-slate-700">
                                                        {t("actions")}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedData.map((row, idx) => {
                                                    const actualIndex = (currentPage - 1) * ITEMS_PER_PAGE + idx;
                                                    const isEditing = editingIndex === actualIndex;

                                                    return (
                                                        <tr key={actualIndex} className="border-b border-slate-100 hover:bg-slate-50">
                                                            <td className="px-4 py-2 font-medium text-slate-500">{actualIndex + 1}</td>
                                                            {Object.entries(row)
                                                                .filter(([k]) => k !== "stt")
                                                                .map(([key, value]) => (
                                                                    <td key={key} className="px-4 py-2 text-slate-600">
                                                                        {isEditing ? (
                                                                            <input
                                                                                type="text"
                                                                                value={editingRow?.[key] || ""}
                                                                                onChange={(e) => setEditingRow({ ...editingRow, [key]: e.target.value })}
                                                                                className="w-full rounded border px-2 py-1 text-sm"
                                                                            />
                                                                        ) : (
                                                                            String(value || "")
                                                                        )}
                                                                    </td>
                                                                ))}
                                                            <td className="px-4 py-2 text-center">
                                                                {isEditing ? (
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <Button size="sm" onClick={() => handleSaveEdit()}>
                                                                            {t("save")}
                                                                        </Button>
                                                                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                                                            {t("cancel")}
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <button
                                                                            onClick={() => handleEditRow(row, actualIndex)}
                                                                            className="rounded p-1 text-blue-600 transition-colors hover:bg-blue-100"
                                                                            title={t("edit")}
                                                                        >
                                                                            <Edit2 className="h-4 w-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteRow(actualIndex)}
                                                                            className="rounded p-1 text-red-600 transition-colors hover:bg-red-100"
                                                                            title={t("delete")}
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

                                    <div className="mb-4 flex items-center justify-between">
                                        <div className="text-sm text-slate-500">
                                            {t("showingEntries", {
                                                from: Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, proctorPreview.length),
                                                to: Math.min(currentPage * ITEMS_PER_PAGE, proctorPreview.length),
                                                total: proctorPreview.length
                                            })}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                                                {t("first")}
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => p - 1)} disabled={currentPage === 1}>
                                                {t("prev")}
                                            </Button>
                                            <div className="flex items-center px-4 text-sm font-medium">
                                                {t("pageOf", { current: currentPage, total: totalPages })}
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => p + 1)} disabled={currentPage === totalPages}>
                                                {t("next")}
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                                                {t("last")}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-sm font-medium text-green-600 hover:text-green-700"
                                        >
                                            {t("changeFile")}
                                        </button>
                                    </div>
                                </>
                            )}

                            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
                                <Button variant="outline" onClick={handleClose} disabled={isPending}>
                                    {t("cancel")}
                                </Button>
                                {previewLoaded && (
                                    <Button onClick={handleImport} disabled={isPending || proctorPreview.length === 0}>
                                        {isPending ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {t("importing")}
                                            </>
                                        ) : (
                                            <>
                                                <Import className="mr-2 h-4 w-4" />
                                                {t("importBtn")}
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
        document.body,
    );
}
