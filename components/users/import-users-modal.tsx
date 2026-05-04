"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertCircle, Download, FileSpreadsheet, FileUp, X } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useImportAccounts } from "@/hooks/use-users";
import { cn } from "@/lib/utils/cn";

interface ImportUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportUsersModal({ isOpen, onClose }: ImportUsersModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportAccounts();
  const t = useTranslations("Accounts.importModal");

  if (!isOpen) return null;

  const validateFile = (selectedFile: File) => {
    const extension = selectedFile.name.split(".").pop()?.toLowerCase();
    if (extension !== "xlsx" && extension !== "xls" && extension !== "csv") {
      setError(t("invalidFormat"));
      return false;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError(t("fileTooLarge"));
      return false;
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);

    if (!selectedFile) return;
    if (!validateFile(selectedFile)) return;

    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    setError(null);

    if (!droppedFile) return;
    if (!validateFile(droppedFile)) return;

    setFile(droppedFile);
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      const response = await importMutation.mutateAsync(file);
      toast.success(response.message || "Đã gửi file import tài khoản. Hệ thống đang xử lý ở chế độ nền.");
      onClose();
      setFile(null);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || t("importFailed"));
    }
  };

  const downloadTemplate = () => {
    const headers = ["Code", "FullName", "Email", "Username", "Role", "IsActive", "Campus"];
    const sampleRows = [
      ["AD001", "System Admin", "admin@fpt.edu.vn", "admin001", "ADMIN", "TRUE", "DN"],
      ["EO001", "Officer X", "officerx@fpt.edu.vn", "officerx", "EXAM_OFFICER", "TRUE", "DN"],
      ["PR002", "Proctor Y", "proctory@fpt.edu.vn", "proctory", "PROCTOR", "TRUE", "DN"],
      ["HI003", "Hall Invigilator Z", "hallz@fpt.edu.vn", "hallz", "HALL_INVIGILATOR", "TRUE", "DN"],
      ["IT004", "IT Support A", "itsa@fpt.edu.vn", "itsa", "IT_SUPPORT", "FALSE", "DN"],
    ];

    const notesRows = [
      ["# NOTE (EN)", "Role accepts: ADMIN, EXAM_OFFICER, PROCTOR, HALL_INVIGILATOR, IT_SUPPORT, STUDENT"],
      ["# GHI CHÚ (VI)", "Vai trò hợp lệ: ADMIN, EXAM_OFFICER, PROCTOR, HALL_INVIGILATOR, IT_SUPPORT, STUDENT"],
      ["# NOTE (EN)", "Friendly role text also works: Admin, Exam Officer, Proctor, Hall Invigilator, IT Support, Student"],
      ["# GHI CHÚ (VI)", "Tên vai trò thân thiện cũng dùng được: Admin, Exam Officer, Proctor, Hall Invigilator, IT Support, Student"],
      ["# NOTE (EN)", "IsActive accepts TRUE/FALSE. Campus accepts HCM, HN, DN, QN, CT"],
      ["# GHI CHÚ (VI)", "IsActive nhận TRUE/FALSE. Campus nhận HCM, HN, DN, QN, CT"],
    ];

    const workbook = XLSX.utils.book_new();
    const templateSheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    const notesSheet = XLSX.utils.aoa_to_sheet([
      ["Key", "Description"],
      ...notesRows,
    ]);

    templateSheet["!cols"] = [
      { wch: 14 },
      { wch: 28 },
      { wch: 30 },
      { wch: 18 },
      { wch: 22 },
      { wch: 12 },
      { wch: 10 },
    ];

    notesSheet["!cols"] = [
      { wch: 16 },
      { wch: 110 },
    ];

    Object.keys(notesSheet).forEach((key) => {
      if (key.startsWith("!")) return;
      const cell = notesSheet[key] as XLSX.CellObject & { s?: Record<string, unknown> };
      cell.s = {
        fill: {
          fgColor: { rgb: key.startsWith("A1") || key.startsWith("B1") ? "FFF2E8" : "FFF7CC" },
        },
        font: {
          bold: true,
        },
      };
    });

    XLSX.utils.book_append_sheet(workbook, templateSheet, "Accounts");
    XLSX.utils.book_append_sheet(workbook, notesSheet, "Notes");
    XLSX.writeFile(workbook, "account_import_template.xlsx");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg animate-in zoom-in fade-in duration-200">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-bold">
            <FileSpreadsheet className="h-5 w-5 text-orange-600" />
            {t("title")}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={importMutation.isPending}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-gray-500">{t("description")}</p>

            <Button
              variant="outline"
              className="flex h-11 w-full items-center justify-center gap-2 border-[#F37021]/20 bg-[#F37021]/5 text-[#F37021] hover:bg-[#F37021]/10"
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
                "cursor-pointer rounded-xl border-2 border-dashed p-10 transition-all",
                "flex flex-col items-center justify-center gap-3",
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
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-orange-200 bg-orange-100 shadow-sm">
                    <FileSpreadsheet className="h-7 w-7 text-orange-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-900">{file.name}</p>
                    <p className="mt-1 text-xs font-medium text-orange-600">
                      {t("readyToImport")} • {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gray-100 bg-gray-50">
                    <FileUp className="h-7 w-7 text-gray-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-700">{t("uploadCta")}</p>
                    <p className="mt-1 text-xs text-gray-400">{t("uploadHint")}</p>
                  </div>
                </>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4 text-xs text-rose-700 shadow-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="font-medium leading-normal">{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={importMutation.isPending}
                className="h-10 px-6"
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={handleImport}
                disabled={!file || importMutation.isPending}
                className="h-10 bg-[#F37021] px-8 font-bold text-white shadow-sm hover:bg-[#d95d15] disabled:opacity-50"
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
