"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { User as UserIcon, Mail, CreditCard, Lock, Save, AlertTriangle, X, ChevronLeft } from "lucide-react";
import { useUser, useUpdateUser } from "@/hooks/use-users";
import { UserRole } from "@/lib/api/users";
import { cn } from "@/lib/utils/cn";

export default function EditAccountPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { data: user, isLoading, error } = useUser(id);
    const updateUser = useUpdateUser();

    const [formData, setFormData] = useState({
        fullName: "",
        username: "",
        email: "",
        code: "",
        role: "STUDENT" as UserRole,
        isActive: true
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [apiError, setApiError] = useState<string | null>(null);

    // Sync user data to form state when loaded
    useEffect(() => {
        if (user) {
            setFormData({
                fullName: user.fullName || "",
                username: user.username || "",
                email: user.email,
                code: user.code || "",
                role: (user.role as UserRole) || "STUDENT",
                isActive: user.isActive
            });
        }
    }, [user]);

    const getAvatarUrl = (name: string) => {
        if (!name) return "";
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&bold=true`;
    };

    const validate = () => {
        setApiError(null);
        const newErrors: Record<string, string> = {};

        const fullName = formData.fullName.trim();
        if (!fullName) {
            newErrors.fullName = "Full name is required";
        } else if (fullName.length < 2 || fullName.length > 100) {
            newErrors.fullName = "Full name must be between 2 and 100 characters";
        }

        const email = formData.email.trim();
        if (!email) {
            newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@(fpt\.edu\.vn|fe\.edu\.vn)$/i.test(email)) {
            newErrors.email = "Email must end with @fpt.edu.vn or @fe.edu.vn";
        }

        if (!formData.code) {
            newErrors.code = "Code is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setApiError(null);

        try {
            await updateUser.mutateAsync({
                id,
                data: {
                    fullName: formData.fullName,
                    username: formData.username || undefined,
                    email: formData.email,
                    code: formData.code,
                    role: formData.role,
                    isActive: formData.isActive,
                    avatarUrl: getAvatarUrl(formData.fullName)
                }
            });
            router.push("/dashboard/accounts");
        } catch (error: any) {
            console.error("Failed to update user", error);
            const errorMessage = error.response?.data?.message || error.message || "An unexpected error occurred";
            setApiError(Array.isArray(errorMessage) ? errorMessage[0] : errorMessage);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F37021]"></div>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="p-8 text-center bg-red-50 rounded-lg text-red-600">
                User not found or an error occurred.
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            {/* Breadcrumbs and Header */}
            <div>
                <div className="flex items-center text-sm text-gray-500 mb-4 gap-2">
                    <span className="cursor-pointer hover:text-gray-700 flex items-center gap-1" onClick={() => router.push("/dashboard/accounts")}>
                        <ChevronLeft className="h-4 w-4" /> Back to Accounts
                    </span>
                    <span>›</span>
                    <span className="cursor-pointer hover:text-gray-700" onClick={() => router.push(`/dashboard/accounts/${id}`)}>User Details</span>
                    <span>›</span>
                    <span className="font-medium text-gray-900 border-b border-gray-900">Edit Account</span>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Edit Account</h1>
                        <p className="text-gray-500 mt-1">Update user account information</p>
                    </div>
                    <div className="bg-[#FFEAD8] p-3 rounded-lg text-[#F37021]">
                        <Save className="h-6 w-6" />
                    </div>
                </div>
            </div>

            {apiError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="text-red-500 mt-0.5">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-red-800">Update Error</h3>
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
                                <UserIcon className="inline mr-2 h-4 w-4" />
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
                                <UserIcon className="inline mr-2 h-4 w-4 text-blue-500" />
                                Username (Optional)
                            </label>
                            <Input
                                placeholder="Enter username (e.g. johndoe)"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                            />
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
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* Account Status */}
            <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-6 space-y-6">
                    <h2 className="text-lg font-bold text-gray-900">Account Status</h2>
                    <p className="text-sm text-gray-500">Update account availability</p>

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
                            <p className="text-xs text-gray-500">User can access the system</p>
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
                            <p className="text-xs text-gray-500">User access is restricted</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center gap-4 text-inter">
                <Button
                    className="bg-[#F37021] hover:bg-[#d95d15] text-white px-8 h-12 text-md font-bold flex-1"
                    onClick={handleSubmit}
                    disabled={updateUser.isPending}
                >
                    {updateUser.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                    variant="secondary"
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-8 h-12 text-md font-bold w-32"
                    onClick={() => router.back()}
                >
                    Cancel
                </Button>
            </div>
        </div>
    );
}
