"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, X, Building2 } from "lucide-react";
import { CAMPUSES } from "@/lib/constants/exam";
import { useTranslations } from "next-intl";

interface ExportReportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (campus: string) => Promise<void>;
}

export default function ExportReportDialog({
    isOpen,
    onClose,
    onExport
}: ExportReportDialogProps) {
    const [campus, setCampus] = useState("");
    const [isExporting, setIsExporting] = useState(false);

    const handleExportClick = async () => {
        setIsExporting(true);
        try {
            await onExport(campus);
            onClose();
        } finally {
            setIsExporting(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={!isExporting ? onClose : undefined} />
            <Card className="w-full max-w-md relative z-10 shadow-2xl border-none overflow-hidden animate-in zoom-in-95 duration-200 rounded-[2rem]">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black flex items-center gap-2">
                            <Download className="h-5 w-5" /> Export Report
                        </h2>
                        <p className="text-white/80 text-xs font-bold mt-1 tracking-wider uppercase">Select campus to download</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={isExporting}
                        onClick={onClose}
                        className="text-white/80 hover:text-orange-600 hover:bg-white rounded-xl h-8 w-8 p-0 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <CardContent className="p-6">
                    <div className="space-y-3 mb-6">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-1.5"><Building2 className="w-3 h-3" /> Campus</label>
                        <select
                            className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500/20 hover:border-orange-200 transition-all"
                            value={campus}
                            onChange={(e) => setCampus(e.target.value)}
                            disabled={isExporting}
                        >
                            <option value="">All Campuses</option>
                            {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                        <Button 
                            variant="ghost" 
                            onClick={onClose} 
                            disabled={isExporting}
                            className="font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-orange-600 hover:bg-orange-700 text-white min-w-[140px] font-bold rounded-xl shadow-lg shadow-orange-200"
                            onClick={handleExportClick}
                            disabled={isExporting}
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download Excel
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>,
        document.body
    );
}
