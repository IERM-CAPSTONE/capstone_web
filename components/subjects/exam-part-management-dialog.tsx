"use client";

import { useState } from "react";
import {
    X,
    Plus,
    Trash2,
    Edit2,
    Check,
    AlertCircle,
    Settings
} from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    useExamParts,
    useCreateExamPart,
    useUpdateExamPart,
    useDeleteExamPart
} from "@/hooks/use-exam-parts";
import { ExamPart } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

interface ExamPartManagementDialogProps {
    onClose: () => void;
}

export function ExamPartManagementDialog({ onClose }: ExamPartManagementDialogProps) {
    const { data: examParts = [], isLoading, refetch } = useExamParts();
    const createExamPart = useCreateExamPart();
    const updateExamPart = useUpdateExamPart();
    const deleteExamPart = useDeleteExamPart();

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        description: ""
    });

    const handleResetForm = () => {
        setFormData({ code: "", name: "", description: "" });
        setIsAdding(false);
        setEditingId(null);
    };

    const handleStartEdit = (type: ExamPart) => {
        setEditingId(type.id);
        setFormData({
            code: type.code,
            name: type.name || "",
            description: type.description || ""
        });
        setIsAdding(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.code.trim()) {
            toast.error("Code is required");
            return;
        }

        try {
            if (editingId) {
                await updateExamPart.mutateAsync({
                    id: editingId,
                    data: formData
                });
                toast.success("Exam type updated successfully");
            } else {
                await createExamPart.mutateAsync(formData);
                toast.success("Exam type created successfully");
            }
            handleResetForm();
            refetch();
        } catch (error: any) {
            console.error("Error saving exam type:", error);
            const message = error?.response?.data?.message || "Failed to save exam type";
            toast.error(message);
        }
    };

    const handleDelete = async (id: string, code: string) => {
        if (!confirm(`Are you sure you want to delete "${code}"? This might affect subjects using this type.`)) {
            return;
        }

        try {
            await deleteExamPart.mutateAsync(id);
            toast.success("Exam type deleted successfully");
            refetch();
        } catch (error: any) {
            console.error("Error deleting exam type:", error);
            toast.error(error?.response?.data?.message || "Failed to delete exam type");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
            <Card className="w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border-none rounded-3xl animate-in zoom-in-95 duration-300">
                <CardHeader className="flex flex-row items-center justify-between border-b pb-4 px-8 pt-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-orange-100 rounded-2xl">
                            <Settings className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold tracking-tight">Manage Exam Types</CardTitle>
                            <p className="text-sm text-slate-500 font-medium">Add or modify dynamic exam components</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="rounded-full h-10 w-10 p-0 hover:bg-slate-100 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-0">
                    <div className="p-8 space-y-8">
                        {/* Form Area */}
                        {(isAdding || editingId) ? (
                            <form onSubmit={handleSubmit} className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-4 animate-in slide-in-from-top-4 duration-300">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2 px-1">
                                    {editingId ? "Edit Exam Type" : "Add New Exam Type"}
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Code *</label>
                                        <Input
                                            placeholder="e.g. MC, L, R"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                            className="rounded-xl border-slate-200 focus:ring-orange-500"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Full Name</label>
                                        <Input
                                            placeholder="e.g. Multiple Choice"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="rounded-xl border-slate-200 focus:ring-orange-500"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Description</label>
                                    <Input
                                        placeholder="Optional description..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="rounded-xl border-slate-200 focus:ring-orange-500"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={handleResetForm}
                                        className="rounded-xl"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-6"
                                        disabled={createExamPart.isPending || updateExamPart.isPending}
                                    >
                                        {(createExamPart.isPending || updateExamPart.isPending) ? "Saving..." : (editingId ? "Save Changes" : "Create Type")}
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-800">Available Types</h3>
                                <Button
                                    onClick={() => setIsAdding(true)}
                                    className="rounded-full bg-slate-900 hover:bg-slate-800 text-white h-9"
                                    size="sm"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Type
                                </Button>
                            </div>
                        )}

                        {/* List Area */}
                        <div className="space-y-3">
                            {isLoading ? (
                                <div className="py-8 text-center text-slate-400">Loading exam types...</div>
                            ) : examParts.length === 0 ? (
                                <div className="py-12 text-center rounded-3xl border-2 border-dashed border-slate-100">
                                    <AlertCircle className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-400 font-medium">No exam types found</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {examParts.map((type: ExamPart) => (
                                        <div
                                            key={type.id}
                                            className={cn(
                                                "group flex items-center justify-between p-4 rounded-2xl border transition-all duration-200",
                                                editingId === type.id
                                                    ? "border-orange-200 bg-orange-50/30 scale-[1.01] shadow-sm"
                                                    : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-md hover:shadow-slate-100"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 flex items-center justify-center rounded-xl bg-slate-100 text-slate-900 font-bold text-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                                                    {type.code}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900">{type.name || type.code}</h4>
                                                    {type.description && (
                                                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{type.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleStartEdit(type)}
                                                    className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(type.id, type.code)}
                                                    className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>

                <div className="p-6 border-t bg-slate-50 flex justify-end">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="rounded-xl px-8 font-semibold text-slate-600"
                    >
                        Close
                    </Button>
                </div>
            </Card>
        </div>
    );
}
