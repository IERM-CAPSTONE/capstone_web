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
    X
} from "lucide-react";
import { useImportCodes } from "@/hooks/use-exam-schedules";
import { useImportDialog } from "../hooks/useImportDialog";

interface ImportExamCodeDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ImportExamCodeDialog({ isOpen, onClose }: ImportExamCodeDialogProps) {
    const t = useTranslations("Dashboard.examOfficer.importExamCodeDialog");
    const tCommon = useTranslations("Common");

    const {
        selectedFile,
        fileInputRef,
        handleFileSelect,
        previewLoaded,
        codePreview,
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
    } = useImportDialog({ importType: "examcode" });

    const codesMutation = useImportCodes();
    const isPending = codesMutation.isPending || isWaitingForWorker;

    const ITEMS_PER_PAGE = 20;
    const ERRORS_PER_PAGE = 10;

    const totalPages = Math.ceil(codePreview.length / ITEMS_PER_PAGE);
    const paginatedData = codePreview.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const totalErrorPages = Math.ceil(workerProgress.failedItems.length / ERRORS_PER_PAGE);
    const paginatedErrors = workerProgress.failedItems.slice(
        (errorPage - 1) * ERRORS_PER_PAGE,
        errorPage * ERRORS_PER_PAGE
    );

    const handleImport = async () => {
        if (!selectedFile) {
            setImportError(t("selectFileFirst"));
            return;
        }

        try {
            const codeChunks = chunkArray(codePreview, 100);
            const batchId = crypto.randomUUID();
            setCurrentBatchId(batchId);
            setWorkerProgress({ success: 0, errors: 0, failedItems: [] });

            for (let i = 0; i < codeChunks.length; i++) {
                setImportStatus(t("sendingBatch", { current: i + 1, total: codeChunks.length }));
                await codesMutation.mutateAsync({
                    importType: "examcode" as any,
                    codes: codeChunks[i],
                    batchId: batchId,
                    totalItems: codePreview.length
                } as any);
            }

            setImportStatus(t("processingBackground"));
            setIsWaitingForWorker(true);
            setImportError("");
        } catch (err: any) {
            console.error(err);
            setImportError(err?.response?.data?.message || err?.message || t("importFailed"));
            setImportStatus("");
        }
    };

    const handleClose = () => {
        handleReset();
        onClose();
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
                            <div className="p-2 bg-purple-50 rounded-lg">
                                <Import className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{t("title")}</h3>
                                <p className="text-sm text-slate-500">{t("description")}</p>
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
                                    {workerProgress.errors > 0 ? t("successWithErrorsTitle") : t("successTitle")}
                                </h4>
                                <p className="text-sm text-slate-600 mb-6">
                                    {t("processedSummary", { count: workerProgress.success + workerProgress.errors })}
                                    <span className="text-green-600 font-medium ml-1">{t("successCount", { count: workerProgress.success })}</span>,
                                    <span className="text-red-600 font-medium ml-1">{t("failureCount", { count: workerProgress.errors })}</span>.
                                </p>
                            </div>

                            {workerProgress.failedItems.length > 0 && (
                                <div className="text-left border rounded-lg overflow-hidden flex flex-col flex-1 min-h-0 bg-white shadow-sm">
                                    <div className="bg-slate-50 px-4 py-2 border-b">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-red-600">
                                            {t("errorSectionTitle", { count: workerProgress.failedItems.length })}
                                        </span>
                                    </div>

                                    <div className="overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-200 flex-1">
                                        <table className="w-full text-xs">
                                            <thead className="bg-slate-50 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-slate-500 font-medium w-1/3">{t("rowData")}</th>
                                                    <th className="px-4 py-2 text-left text-slate-500 font-medium">{t("errorMessage")}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {paginatedErrors.map((fail, idx) => (
                                                    <tr key={idx} className="hover:bg-red-50/30">
                                                        <td className="px-4 py-2 font-mono text-slate-600 break-all">
                                                            {(fail.data?.examRoom || fail.item?.examRoom || t("unknown")) + ' - ' + (fail.data?.dateExam || fail.item?.dateExam || '')}
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
                                                {t("prev")}
                                            </Button>
                                            <span className="text-[10px] text-slate-500">
                                                {tCommon("page")} {errorPage} {tCommon("of")} {totalErrorPages}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={errorPage === totalErrorPages}
                                                onClick={() => setErrorPage(p => p + 1)}
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
                                                    {t("uploadCta")}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {t("uploadHint")}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedFile && (
                                        <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-5 w-5 text-purple-500" />
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
                                                {t("fileFormatTitle")}
                                            </h4>
                                            <ul className="text-xs text-blue-700 space-y-1">
                                                <li>• {t("requiredColumns")}</li>
                                                <li>• {t("dateFormat")}</li>
                                                <li>• {t("examCodeFormat")}</li>
                                            </ul>
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : (
                                /* Preview Screen - Continues in next message due to length */
                                <>
                                    <div className="flex gap-4 border-b border-slate-200 mb-4">
                                        <button className="px-4 py-2 font-medium text-sm text-purple-600 border-b-2 border-purple-600">
                                            {t("tabLabel", { count: codePreview.length })}
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

                                    {/* Preview Table */}
                                    <div className="overflow-x-auto border border-slate-200 rounded-lg mb-4 max-h-[400px] overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50 sticky top-0">
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    <th className="px-4 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">{t("index")}</th>
                                                    {codePreview.length > 0 && Object.keys(codePreview[0])
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
                                                    <th className="px-4 py-2 text-center font-semibold text-slate-700">{t("actions")}</th>
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
                                                                        <Button size="sm" onClick={() => handleSaveEdit()}>{t("save")}</Button>
                                                                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>{tCommon("cancel")}</Button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <button
                                                                            onClick={() => handleEditRow(row, actualIndex)}
                                                                            className="p-1 hover:bg-blue-100 rounded text-blue-600 transition-colors"
                                                                            title={t("edit")}
                                                                        >
                                                                            <Edit2 className="h-4 w-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteRow(actualIndex)}
                                                                            className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                                                                            title={tCommon("delete")}
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
                                            {t("showingEntries", {
                                                from: Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, codePreview.length),
                                                to: Math.min(currentPage * ITEMS_PER_PAGE, codePreview.length),
                                                total: codePreview.length
                                            })}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                                                {t("first")}
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                                                {tCommon("previous")}
                                            </Button>
                                            <div className="flex items-center px-4 text-sm font-medium">
                                                {tCommon("page")} {currentPage} {tCommon("of")} {totalPages}
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
                                                {tCommon("next")}
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                                                {t("last")}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Change File Button */}
                                    <div className="mb-4">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                                        >
                                            ← {t("changeFile")}
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
                                <Button variant="outline" onClick={handleClose} disabled={isPending}>
                                    {tCommon("cancel")}
                                </Button>
                                {previewLoaded && (
                                    <Button onClick={handleImport} disabled={isPending || codePreview.length === 0}>
                                        {isPending ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {t("importing")}
                                            </>
                                        ) : (
                                            <>
                                                <Import className="mr-2 h-4 w-4" />
                                                {t("title")}
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
