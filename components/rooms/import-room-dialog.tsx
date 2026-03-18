"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { useImportRooms } from "@/hooks/use-rooms";
import {
  Upload,
  Loader2,
  Table as TableIcon,
  X,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Search
} from "lucide-react";
import { readFileContent } from "@/lib/utils/import-utils";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

const CAMPUSES = ["HCM", "HN", "DN", "QN", "CT"];

interface ImportRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportRoomDialog({ isOpen, onClose }: ImportRoomDialogProps) {
  const t = useTranslations("Rooms");
  const commonT = useTranslations("Common");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCampus, setSelectedCampus] = useState<string>("");
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importRooms = useImportRooms();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setIsParsing(true);
      setSearchQuery("");
      try {
        const { headers: fileHeaders, data } = await readFileContent(file);
        setHeaders(fileHeaders || []);
        setPreviewData(data || []);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to parse file";
        toast.error(message);
        setSelectedFile(null);
      } finally {
        setIsParsing(false);
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    if (!selectedCampus) {
      toast.error(t("chooseCampus") || "Please select a campus");
      return;
    }

    try {
      await importRooms.mutateAsync({
        file: selectedFile,
        campus: selectedCampus,
      });
      toast.success(t("importSuccess") || "Import request sent successfully");
      handleClose();
    } catch (error) {
      console.error("Import failed:", error);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setSelectedCampus("");
    setPreviewData([]);
    setHeaders([]);
    setSearchQuery("");
    onClose();
  };

  const removeRow = (rowToRemove: Record<string, string>) => {
    setPreviewData(prev => prev.filter(r => r !== rowToRemove));
  };

  const filteredPreviewData = previewData.filter(row =>
    Object.values(row).some(val =>
      String(val).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden border-0 rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] bg-white">
        {/* Soft Background Accents */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/[0.02] rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-20 left-10 w-64 h-64 bg-blue-500/[0.02] rounded-full blur-[60px] pointer-events-none" />

        <DialogHeader className="relative p-6 lg:p-8 pb-4 flex-shrink-0">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center border border-orange-100 shadow-inner">
              <TableIcon className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">
                {t("importRooms")}
              </DialogTitle>
              <DialogDescription className="text-slate-400 font-semibold text-sm">
                {t("importDescription") || "Batch register examination environments via standardized data sheets."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="relative flex-1 min-h-0 overflow-hidden flex flex-col px-8 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 flex-shrink-0">
            {/* Campus Selection */}
            <div className="space-y-3 flex-shrink-0">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">
                {t("selectCampus")} <span className="text-orange-500">*</span>
              </label>
              <div className="relative group">
                <select
                  value={selectedCampus}
                  onChange={(e) => setSelectedCampus(e.target.value)}
                  className="w-full h-14 bg-slate-50 border-transparent rounded-2xl px-5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all appearance-none cursor-pointer group-hover:bg-slate-100"
                >
                  <option value="">{t("chooseCampus")}</option>
                  {CAMPUSES.map((campusCode) => (
                    <option key={campusCode} value={campusCode}>
                      {t(`campuses.${campusCode}`) || campusCode} Campus
                    </option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                </div>
              </div>
            </div>

            {/* File Dropzone */}
            <div className="space-y-3 flex-shrink-0">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">
                {t("uploadHint") || "DATA SOURCE (CSV/EXCEL)"}
              </label>
              <div
                onClick={() => !isParsing && fileInputRef.current?.click()}
                className={`relative h-14 flex items-center gap-4 px-5 rounded-2xl cursor-pointer transition-all border-2 border-dashed ${selectedFile
                  ? 'border-orange-500 bg-orange-50 shadow-[0_0_20px_-5px_rgba(249,115,22,0.1)]'
                  : 'border-slate-200 bg-slate-50 hover:border-orange-400 hover:bg-slate-100'
                  }`}
              >
                <Input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                />
                <div className="flex-shrink-0">
                  {isParsing ? (
                    <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                  ) : selectedFile ? (
                    <CheckCircle2 className="h-5 w-5 text-orange-600" />
                  ) : (
                    <Upload className="h-5 w-5 text-slate-400 group-hover:text-orange-500 transition-colors" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${selectedFile ? 'text-orange-700' : 'text-slate-600'}`}>
                    {selectedFile ? selectedFile.name : (commonT("clickToUpload") || "Choose resource file...")}
                  </p>

                </div>
                {selectedFile && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setPreviewData([]);
                      setSearchQuery("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="flex-shrink-0 h-8 w-8 rounded-lg hover:bg-orange-200/50 flex items-center justify-center transition-colors"
                  >
                    <X className="h-4 w-4 text-orange-600" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preview Section */}
          {previewData.length > 0 && (
            <div className="flex-1 flex flex-col min-h-0 bg-white rounded-3xl border border-slate-100 shadow-sm mb-0 overflow-hidden transition-all duration-500">
              <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="px-3 py-1 bg-white rounded-lg border border-slate-100 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {filteredPreviewData.length} / {previewData.length} {commonT("items").toUpperCase()}
                  </div>
                  <span className="text-[10px] text-orange-500 font-bold italic">
                    {t("tableHint") === "Rooms.tableHint" ? "Xác nhận dữ liệu trước khi nhập" : t("tableHint")}
                  </span>
                </div>
                <div className="w-full md:w-64 relative group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                  <Input
                    placeholder="Search records..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 pl-10 bg-white border-slate-200 rounded-xl text-xs font-semibold focus-visible:ring-4 focus-visible:ring-orange-500/5 transition-all"
                  />
                </div>
              </div>

              <div className="h-[650px] overflow-y-auto relative border-t border-slate-100">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm">
                    <tr>
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 w-16 bg-slate-50/95 border-b border-slate-100">#</th>
                      {headers.map((header) => (
                        <th key={header} className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-slate-50/95 border-b border-slate-100">
                          {header}
                        </th>
                      ))}
                      <th className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right w-20 bg-slate-50/95 border-b border-slate-100">
                        {commonT("actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredPreviewData.map((row) => {
                      const originalIdx = previewData.indexOf(row);
                      return (
                        <tr key={originalIdx} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-2.5 text-xs font-black text-slate-300">
                            {originalIdx + 1}
                          </td>
                          {headers.map((header) => (
                            <td key={header} className="px-6 py-2.5 text-sm font-bold text-slate-700">
                              {row[header]}
                            </td>
                          ))}
                          <td className="px-6 py-2.5 text-right">
                            <button
                              onClick={() => removeRow(row)}
                              className="h-8 w-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedFile && previewData.length === 0 && !isParsing && (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200 mb-8 p-10">
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm mb-6 border border-slate-100">
                <AlertCircle className="h-10 w-10 text-slate-200" />
              </div>
              <p className="text-xl font-black text-slate-900 mb-2">Zero datasets detected</p>
              <p className="text-sm text-slate-400 font-semibold max-w-xs text-center leading-relaxed">
                We couldn&apos;t parse any room identifiers from this file. Please verify CSV/Excel compatibility.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="relative p-6 lg:p-8 lg:pt-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row sm:justify-between items-center gap-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            {selectedCampus && (
              <div className="px-5 py-2 bg-white rounded-full border border-slate-100 shadow-sm flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
                  Target: <span className="text-slate-900">{t(`campuses.${selectedCampus}`) || selectedCampus}</span>
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={importRooms.isPending}
              className="px-8 h-12 text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
            >
              {commonT("cancel")}
            </Button>
            <Button
              onClick={handleImport}
              disabled={!selectedFile || !selectedCampus || previewData.length === 0 || importRooms.isPending}
              className="flex-1 sm:flex-none h-14 px-10 bg-orange-600 hover:bg-orange-500 text-white border-0 shadow-[0_15px_30px_-5px_rgba(234,88,12,0.4)] rounded-2xl transition-all active:scale-95 font-black text-base"
            >
              {importRooms.isPending ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  {commonT("processing")}...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-3 h-5 w-5" />
                  {t("importRooms")}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
