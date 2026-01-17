"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { User, Mail, CreditCard, Lock, Eye, EyeOff, UserPlus, AlertTriangle, X } from "lucide-react";
import { useCreateUser } from "@/hooks/use-users";
import { UserRole } from "@/lib/api/users";
import { cn } from "@/lib/utils/cn";

export default function CreateAccountPage() {
    const router = useRouter();
    const createUser = useCreateUser();

    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        code: "",
        role: "STUDENT" as UserRole,
        isActive: true
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [apiError, setApiError] = useState<string | null>(null);

    const getAvatarUrl = (name: string) => {
        if (!name) return "";
        // Use UI Avatars API for automatic avatar generation with random background
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&bold=true`;
    };

    const validate = () => {
        setApiError(null);
        const newErrors: Record<string, string> = {};
        //Fullname
        const fullName = formData.fullName.trim();
        if (!fullName) {
            newErrors.fullName = "Full name is required";
        } else if (fullName.length < 2 || fullName.length > 100) {
            newErrors.fullName = "Full name must be between 2 and 100 characters";
        } else if (!/^[A-Za-zÀ-ỹ\s'-]+$/.test(fullName)) {
            newErrors.fullName = "Full name contains invalid characters";
        }

        // Email
        const email = formData.email.trim();
        if (!email) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@(fpt\.edu\.vn|fe\.edu\.vn)$/i.test(email)) {
            newErrors.email = "Email must end with @fpt.edu.vn or @fe.edu.vn";
        }

        // Code
        if (!formData.code) {
            newErrors.code = "Code is required";
        } else if (!/^[a-zA-Z0-9_]{4,20}$/.test(formData.code)) {
            newErrors.code =
                "Code must be 4–20 characters and contain only letters, numbers, or underscores";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setApiError(null);

        try {
            await createUser.mutateAsync({
                fullName: formData.fullName,
                email: formData.email,
                code: formData.code,
                role: formData.role,
                isActive: formData.isActive,
                avatarUrl: getAvatarUrl(formData.fullName)
            });
            router.push("/dashboard/accounts");
        } catch (error: any) {
            console.error("Failed to create user", error);
            const errorMessage = error.response?.data?.message || error.message || "An unexpected error occurred";
            setApiError(Array.isArray(errorMessage) ? errorMessage[0] : errorMessage);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            {/* Breadcrumbs and Header */}
            <div>
                <div className="flex items-center text-sm text-gray-500 mb-4">
                    <span className="cursor-pointer hover:text-gray-700" onClick={() => router.push("/dashboard")}>Dashboard</span>
                    <span className="mx-2">›</span>
                    <span className="cursor-pointer hover:text-gray-700" onClick={() => router.push("/dashboard/accounts")}>Account Management</span>
                    <span className="mx-2">›</span>
                    <span className="font-medium text-gray-900 border-b border-gray-900">Create Account</span>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
                        <p className="text-gray-500 mt-1">Add a new user to the system</p>
                    </div>
                    <div className="bg-[#FFEAD8] p-3 rounded-lg text-[#F37021]">
                        <UserPlus className="h-6 w-6" />
                    </div>
                </div>
            </div>

            {apiError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="text-red-500 mt-0.5">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-red-800">Registration Error</h3>
                        <p className="text-sm text-red-700 mt-1">{apiError}</p>
                    </div>
                    <button
                        onClick={() => setApiError(null)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Account Information */}
            <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-6 space-y-6">
                    <h2 className="text-lg font-bold text-gray-900">Account Information</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                <User className="inline mr-2 h-4 w-4" />
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                placeholder="Enter full name"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className={cn(errors.fullName && "border-red-500")}
                            />
                            {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                <Mail className="inline mr-2 h-4 w-4" />
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <Input
                                placeholder="user@fpt.edu.vn"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className={cn(errors.email && "border-red-500")}
                            />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                <CreditCard className="inline mr-2 h-4 w-4" />
                                Code <span className="text-red-500">*</span>
                            </label>
                            <Input
                                placeholder="Enter user code (e.g. SE123456)"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className={cn(errors.code && "border-red-500")}
                            />
                            {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                <span className="inline-block w-4 mr-2"></span>
                                Role <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                {["ADMIN", "EXAM_OFFICER", "PROCTOR", "STUDENT"].map((role) => (
                                    <div
                                        key={role}
                                        onClick={() => setFormData({ ...formData, role: role as UserRole })}
                                        className={cn(
                                            "cursor-pointer border rounded-lg p-3 text-center text-sm font-medium transition-colors",
                                            formData.role === role
                                                ? "border-[#F37021] text-[#F37021] bg-[#aaa09a1a]"
                                                : "border-gray-200 text-gray-600 hover:border-gray-300"
                                        )}
                                    >
                                        {role === "ADMIN" ? "Admin" :
                                            role === "EXAM_OFFICER" ? "Exam Officer" :
                                                role === "PROCTOR" ? "Proctor" : "Student"}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Authentication and Password section removed for Google Login only system */}

            {/* Account Status */}
            <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-6 space-y-6">
                    <h2 className="text-lg font-bold text-gray-900">Account Status</h2>
                    <p className="text-sm text-gray-500">Set the initial status for this account</p>

                    <div className="grid grid-cols-2 gap-4">
                        <div
                            onClick={() => setFormData({ ...formData, isActive: true })}
                            className={cn(
                                "cursor-pointer border rounded-lg p-4 text-center transition-colors flex flex-col items-center gap-2",
                                formData.isActive
                                    ? "border-green-500 bg-green-50"
                                    : "border-gray-200 hover:border-gray-300"
                            )}
                        >
                            <div className={cn("flex items-center gap-2 font-bold", formData.isActive ? "text-green-600" : "text-gray-500")}>
                                <div className={cn("w-2 h-2 rounded-full", formData.isActive ? "bg-green-600" : "bg-gray-400")} />
                                Active
                            </div>
                            <p className="text-xs text-gray-500">User can access the system immediately</p>
                        </div>

                        <div
                            onClick={() => setFormData({ ...formData, isActive: false })}
                            className={cn(
                                "cursor-pointer border rounded-lg p-4 text-center transition-colors flex flex-col items-center gap-2",
                                !formData.isActive
                                    ? "border-gray-500 bg-gray-50"
                                    : "border-gray-200 hover:border-gray-300"
                            )}
                        >
                            <div className={cn("flex items-center gap-2 font-bold", !formData.isActive ? "text-gray-700" : "text-gray-500")}>
                                <div className={cn("w-2 h-2 rounded-full", !formData.isActive ? "bg-gray-700" : "bg-gray-400")} />
                                Locked
                            </div>
                            <p className="text-xs text-gray-500">User cannot access the system</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center gap-4">
                <Button
                    className="bg-[#F37021] hover:bg-[#d95d15] text-white px-8 h-12 text-md font-medium flex-1"
                    onClick={handleSubmit}
                    disabled={createUser.isPending}
                >
                    {createUser.isPending ? "Creating..." : "Create Account"}
                </Button>
                <Button
                    variant="secondary"
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-8 h-12 text-md font-medium w-32"
                    onClick={() => router.push("/dashboard/accounts")}
                >
                    Cancel
                </Button>
            </div>
        </div>
    );
}
