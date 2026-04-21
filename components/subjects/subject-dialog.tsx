"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus, Trash2, Clock, BookOpen } from "lucide-react";
import { Subject, ExamPart, SubjectPart } from "@/types";
import { useCreateSubject, useUpdateSubject } from "@/hooks/use-subjects";
import { useExamParts } from "@/hooks/use-exam-parts";

interface SubjectDialogProps {
    subject?: Subject | null;
    onClose: () => void;
}

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useSemesters } from "@/hooks/use-semesters";

export function SubjectDialog({ subject, onClose }: SubjectDialogProps) {
    const t = useTranslations("Subjects.dialog");
    const tCommon = useTranslations("Common");
    const isEdit = !!subject;
    const { data: examParts = [] } = useExamParts();
    const { data: semestersResponse } = useSemesters({ limit: 100 });
    const semesters = semestersResponse?.data || [];

    const createSubject = useCreateSubject();
    const updateSubject = useUpdateSubject();

    const [formData, setFormData] = useState({
        code: subject?.code || "",
        name: subject?.name || "",
        semesterId: subject?.semesterId || "",
        department: subject?.department || "",
        parts: subject?.parts.map(p => ({
            examPartId: p.examPartId,
            duration: p.duration || 0,
        })) || [] as { examPartId: string; duration: number }[],
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (subject) {
            setFormData({
                code: subject.code,
                name: subject.name || "",
                semesterId: subject.semesterId || "",
                department: subject.department || "",
                parts: subject.parts.map(p => ({
                    examPartId: p.examPartId,
                    duration: p.duration || 0,
                })),
            });
        }
    }, [subject]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.code) newErrors.code = "Subject code is required";
        if (!formData.semesterId) newErrors.semesterId = "Semester is required";
        if (formData.parts.length === 0) newErrors.parts = "At least one exam part is required";

        formData.parts.forEach((part, index) => {
            if (!part.examPartId) newErrors[`part_${index}_type`] = "Type is required";
            if (!part.duration || part.duration <= 0) newErrors[`part_${index}_duration`] = "Invalid duration";
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const addPart = () => {
        setFormData({
            ...formData,
            parts: [...formData.parts, { examPartId: examParts[0]?.id || "", duration: 60 }],
        });
    };

    const removePart = (index: number) => {
        setFormData({
            ...formData,
            parts: formData.parts.filter((_, i) => i !== index),
        });
    };

    const updatePart = (index: number, field: string, value: any) => {
        const newParts = [...formData.parts];
        newParts[index] = { ...newParts[index], [field]: value };
        setFormData({ ...formData, parts: newParts });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            if (isEdit && subject) {
                await updateSubject.mutateAsync({ id: subject.id, data: formData });
            } else {
                await createSubject.mutateAsync(formData);
            }
            onClose();
        } catch (error) {
            console.error("Error saving subject:", error);
        }
    };

    const isSaving = createSubject.isPending || updateSubject.isPending;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transition-all">
                <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                    <div>
                        <CardTitle className="text-xl font-bold">
                            {isEdit ? `${t("editTitle")}: ${subject.code}` : t("createTitle")}
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-1">
                            {t("subtitle") || "Enter subject details and exam components"}
                        </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full h-8 w-8 p-0">
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto pt-6">
                    <form id="subject-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    {t("code")} *
                                </label>
                                <Input
                                    placeholder="e.g. PRN231"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    className={errors.code ? "border-red-500" : ""}
                                    disabled={isEdit || isSaving}
                                />
                                {errors.code && <p className="text-xs text-red-500 mt-1 font-medium">{errors.code}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    {t("name")}
                                </label>
                                <Input
                                    placeholder="e.g. Web Development"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    disabled={isSaving}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    {t("semester")} *
                                </label>
                                <select
                                    value={formData.semesterId}
                                    onChange={(e) => setFormData({ ...formData, semesterId: e.target.value })}
                                    className={cn(
                                        "w-full h-10 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm transition-all focus:ring-2 focus:ring-orange-500 outline-none",
                                        errors.semesterId ? "border-red-500" : ""
                                    )}
                                    disabled={isSaving}
                                >
                                    <option value="">Select Semester</option>
                                    {semesters.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} ({s.code})
                                        </option>
                                    ))}
                                </select>
                                {errors.semesterId && <p className="text-xs text-red-500 mt-1 font-medium">{errors.semesterId}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    {t("department")}
                                </label>
                                <Input
                                    placeholder="e.g. Computing"
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    disabled={isSaving}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 dark:text-slate-200">{t("parts")}</h3>
                                <Button
                                    type="button"
                                    onClick={addPart}
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-1.5 h-8 border-dashed hover:border-orange-500 hover:text-orange-600 transition-colors"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    {t("addPart")}
                                </Button>
                            </div>

                            {errors.parts && <p className="text-xs text-red-500 font-medium">{errors.parts}</p>}

                            <div className="space-y-3">
                                {formData.parts.map((part, index) => (
                                    <div
                                        key={index}
                                        className="flex items-end gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200"
                                    >
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[11px] font-bold text-slate-500 uppercase">{t("typeLabel") || "Type"}</label>
                                            <select
                                                value={part.examPartId}
                                                onChange={(e) => updatePart(index, "examPartId", e.target.value)}
                                                className="w-full h-9 px-3 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm transition-all focus:ring-2 focus:ring-orange-500 outline-none"
                                            >
                                                {Array.isArray(examParts) && examParts.map((type) => (
                                                    <option key={type.id} value={type.id}>
                                                        {type.name} ({type.code})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="w-32 space-y-2">
                                            <label className="text-[11px] font-bold text-slate-500 uppercase">{t("duration")}</label>
                                            <div className="relative">
                                                <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                                <Input
                                                    type="number"
                                                    value={part.duration}
                                                    onChange={(e) => updatePart(index, "duration", parseInt(e.target.value))}
                                                    className="pl-8 h-9 rounded-lg focus:ring-orange-500"
                                                />
                                            </div>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removePart(index)}
                                            className="h-9 w-9 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}

                                {formData.parts.length === 0 && (
                                    <div className="text-center py-8 px-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                                        <BookOpen className="h-8 w-8 text-slate-200 dark:text-slate-800 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400">{t("noParts")}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </form>
                </CardContent>

                <div className="p-4 border-t bg-slate-50/50 dark:bg-slate-900/50 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={isSaving} className="rounded-xl px-6">
                        {tCommon("cancel")}
                    </Button>
                    <Button type="submit" form="subject-form" disabled={isSaving} className="rounded-xl px-8 bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-200 dark:shadow-none font-bold">
                        {isSaving ? tCommon("processing") : isEdit ? tCommon("update") : tCommon("create")}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
