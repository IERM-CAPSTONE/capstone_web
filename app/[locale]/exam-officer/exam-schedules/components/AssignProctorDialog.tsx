"use client";

import { useState, useEffect } from "react";
import { Search, UserCheck, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usersApi, User, UserRole } from "@/lib/api/users";
import { cn } from "@/lib/utils/cn";

interface AssignProctorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    currentProctorId?: string | null;
    currentProctorName?: string | null;
    onConfirm: (proctorId: string | null) => Promise<void>;
    title?: string;
    currentLabel?: string;
    searchPlaceholder?: string;
    unassignLabel?: string;
    loadingLabel?: string;
    emptyLabel?: string;
    confirmLabel?: string;
    assigningLabel?: string;
    loadErrorLabel?: string;
    assignErrorLabel?: string;
    roleFilter?: UserRole;
}

export function AssignProctorDialog({
    isOpen,
    onClose,
    currentProctorId,
    currentProctorName,
    onConfirm,
    title = "Assign Proctor",
    currentLabel = "Current",
    searchPlaceholder = "Search by name, code, or email...",
    unassignLabel = "No Proctor (Unassign)",
    loadingLabel = "Loading proctors...",
    emptyLabel = "No proctors found.",
    confirmLabel = "Assign Proctor",
    assigningLabel = "Assigning...",
    loadErrorLabel = "Failed to load proctors.",
    assignErrorLabel = "Failed to assign proctor.",
    roleFilter = "PROCTOR",
}: AssignProctorDialogProps) {
    const [proctors, setProctors] = useState<User[]>([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(currentProctorId ?? null);

    useEffect(() => {
        if (!isOpen) return;
        setSelectedId(currentProctorId ?? null);
        setSearch("");
        setError(null);
        const fetchProctors = async () => {
            setIsLoading(true);
            try {
                const res = roleFilter === "PROCTOR"
                    ? await usersApi.getProctors({ limit: 100, isActive: true })
                    : await usersApi.getAll({ limit: 100, isActive: true, role: roleFilter });
                setProctors(res.data ?? []);
            } catch {
                setError(loadErrorLabel);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProctors();
    }, [isOpen, currentProctorId, loadErrorLabel, roleFilter]);

    const filtered = proctors.filter(p => {
        const q = search.toLowerCase();
        return (p.fullName ?? "").toLowerCase().includes(q) ||
            (p.code ?? "").toLowerCase().includes(q) ||
            (p.email ?? "").toLowerCase().includes(q);
    });

    const handleConfirm = async () => {
        setIsSubmitting(true);
        try {
            await onConfirm(selectedId);
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message ?? assignErrorLabel);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 dark:border-gray-800">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
                        {currentProctorName && (
                            <p className="text-xs text-gray-400 mt-0.5">{currentLabel}: {currentProctorName}</p>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-4 space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Unassign option */}
                    <button
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 transition-all text-left",
                            selectedId === null
                                ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20"
                                : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-100 dark:border-gray-700"
                        )}
                        onClick={() => setSelectedId(null)}
                    >
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 text-sm font-bold">—</div>
                        <span className="text-sm text-gray-600 dark:text-gray-400 italic">{unassignLabel}</span>
                        {selectedId === null && <CheckCircle2 className="w-4 h-4 text-orange-500 ml-auto" />}
                    </button>

                    {/* Proctor list */}
                    <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-sm">{loadingLabel}</span>
                            </div>
                        ) : error ? (
                            <div className="flex items-center justify-center py-8 gap-2 text-red-400">
                                <AlertCircle className="w-5 h-5" />
                                <span className="text-sm">{error}</span>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="py-8 text-center text-sm text-gray-400">{emptyLabel}</div>
                        ) : (
                            filtered.map(p => (
                                <button
                                    key={p.id}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                                        selectedId === p.id
                                            ? "bg-orange-50 dark:bg-orange-900/20"
                                            : "hover:bg-gray-50 dark:hover:bg-gray-800"
                                    )}
                                    onClick={() => setSelectedId(p.id)}
                                >
                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-sm font-bold shrink-0">
                                        {(p.fullName ?? p.email ?? "?")[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.fullName ?? "—"}</p>
                                        <p className="text-xs text-gray-400 truncate">{p.code} · {p.email}</p>
                                    </div>
                                    {selectedId === p.id && <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" />}
                                </button>
                            ))
                        )}
                    </div>

                    {error && !isLoading && (
                        <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button
                        variant="primary"
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{assigningLabel}</> : confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
