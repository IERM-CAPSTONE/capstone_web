"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Calendar, Clock } from "lucide-react";
import { Semester } from "@/types";
import { cn } from "@/lib/utils/cn";
import { useCreateSemester, useUpdateSemester } from "@/hooks/use-semesters";

interface SemesterDialogProps {
    semester?: Semester | null;
    onClose: () => void;
}

export function SemesterDialog({ semester, onClose }: SemesterDialogProps) {
    const isEdit = !!semester;
    const createSemester = useCreateSemester();
    const updateSemester = useUpdateSemester();

    const [formData, setFormData] = useState({
        code: semester?.code || "",
        name: semester?.name || "",
        startDate: semester?.startDate ? new Date(semester.startDate).toISOString().split('T')[0] : "",
        endDate: semester?.endDate ? new Date(semester.endDate).toISOString().split('T')[0] : "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (semester) {
            setFormData({
                code: semester.code,
                name: semester.name || "",
                startDate: new Date(semester.startDate).toISOString().split('T')[0],
                endDate: new Date(semester.endDate).toISOString().split('T')[0],
            });
        }
    }, [semester]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.code) newErrors.code = "Semester code is required (e.g., SU25)";
        if (!formData.startDate) newErrors.startDate = "Start date is required";
        if (!formData.endDate) newErrors.endDate = "End date is required";

        if (formData.startDate && formData.endDate) {
            if (new Date(formData.startDate) >= new Date(formData.endDate)) {
                newErrors.endDate = "End date must be after start date";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            if (isEdit && semester) {
                await updateSemester.mutateAsync({
                    id: semester.id,
                    data: {
                        name: formData.name,
                        startDate: new Date(formData.startDate).toISOString(),
                        endDate: new Date(formData.endDate).toISOString(),
                    }
                });
            } else {
                await createSemester.mutateAsync({
                    code: formData.code,
                    name: formData.name,
                    startDate: new Date(formData.startDate).toISOString(),
                    endDate: new Date(formData.endDate).toISOString(),
                });
            }
            onClose();
        } catch (error) {
            console.error("Error saving semester:", error);
        }
    };

    const isSaving = createSemester.isPending || updateSemester.isPending;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-md shadow-2xl overflow-hidden border-none scale-in-center">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white relative">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {isEdit ? `Edit ${semester.code}` : "New Semester"}
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="absolute right-4 top-4 rounded-full h-8 w-8 p-0 text-white hover:bg-white/20"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>

                <CardContent className="pt-6">
                    <form id="semester-form" onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                Semester Code *
                            </label>
                            <Input
                                placeholder="e.g. SU25, FA25"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className={cn("h-11 rounded-xl", errors.code ? "border-red-500 focus:ring-red-200" : "focus:ring-orange-200")}
                                disabled={isEdit || isSaving}
                            />
                            {errors.code && <p className="text-xs text-red-500 font-medium">{errors.code}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                Display Name
                            </label>
                            <Input
                                placeholder="e.g. Summer 2025"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="h-11 rounded-xl focus:ring-orange-200"
                                disabled={isSaving}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-orange-500" />
                                    Start Date *
                                </label>
                                <Input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className={cn("h-11 rounded-xl focus:ring-orange-200", errors.startDate ? "border-red-500" : "")}
                                    disabled={isSaving}
                                />
                                {errors.startDate && <p className="text-xs text-red-500 font-medium">{errors.startDate}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-orange-500" />
                                    End Date *
                                </label>
                                <Input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className={cn("h-11 rounded-xl focus:ring-orange-200", errors.endDate ? "border-red-500" : "")}
                                    disabled={isSaving}
                                />
                                {errors.endDate && <p className="text-xs text-red-500 font-medium">{errors.endDate}</p>}
                            </div>
                        </div>
                    </form>

                    <div className="mt-8 flex gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isSaving}
                            className="flex-1 h-11 rounded-xl font-medium border-slate-200"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="semester-form"
                            disabled={isSaving}
                            className="flex-1 h-11 rounded-xl font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-100 dark:shadow-none"
                        >
                            {isSaving ? "Saving..." : isEdit ? "Update" : "Create"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
