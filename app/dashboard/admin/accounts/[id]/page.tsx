"use client";

import { useUser, useToggleUserStatus } from "@/hooks/use-users";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    User as UserIcon,
    Mail,
    CreditCard,
    Calendar,
    Clock,
    Lock,
    Unlock,
    Edit,
    ChevronRight,
    FileText,
    ShieldAlert,
} from "lucide-react";
import { format as dateFnsFormat, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";
import { cn } from "@/lib/utils/cn";
import { useState } from "react";

export default function AccountDetailPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { data: user, isLoading, error } = useUser(id);
    const toggleStatus = useToggleUserStatus();
    const [isLocking, setIsLocking] = useState(false);

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

    const handleToggleStatus = async () => {
        setIsLocking(true);
        try {
            await toggleStatus.mutateAsync({ id, isActive: !user.isActive });
        } catch (err) {
            console.error("Failed to toggle status", err);
        } finally {
            setIsLocking(false);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "N/A";
        try {
            const date = parseISO(dateStr);
            return dateFnsFormat(date, "MMM dd, yyyy", { locale: enUS });
        } catch {
            return "Invalid Date";
        }
    };

    const formatDateTime = (dateStr: string | null) => {
        if (!dateStr) return "Jan 08, 2026 at 09:15 AM"; // Mock for 'Last Login'
        try {
            const date = parseISO(dateStr);
            return dateFnsFormat(date, "MMM dd, yyyy 'at' hh:mm a", { locale: enUS });
        } catch {
            return "N/A";
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            {/* Breadcrumbs */}
            <nav className="flex items-center text-sm text-gray-500 gap-2">
                <span className="cursor-pointer hover:text-gray-700 flex items-center gap-1" onClick={() => router.push("/dashboard")}>
                    <ChevronRight className="h-4 w-4 rotate-180" /> Dashboard
                </span>
                <span>›</span>
                <span className="cursor-pointer hover:text-gray-700" onClick={() => router.push("/dashboard/accounts")}>
                    Account Management
                </span>
                <span>›</span>
                <span className="font-medium text-gray-900 border-b border-gray-900">Account Detail</span>
            </nav>

            {/* Header Title */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Account Detail</h1>
                    <p className="text-gray-500 mt-1">View and manage user account information</p>
                </div>
                <div className="bg-[#FFEAD8] p-3 rounded-lg text-[#F37021]">
                    <FileText className="h-6 w-6" />
                </div>
            </div>

            {/* Profile Banner */}
            <Card className="bg-[#F37021] border-none shadow-lg overflow-hidden relative">
                <CardContent className="p-8 flex items-center gap-6 relative z-10">
                    <div className="h-24 w-24 rounded-2xl bg-white flex items-center justify-center p-1 shadow-inner overflow-hidden">
                        {user.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={user.avatarUrl} alt={user.fullName || ""} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                            <UserIcon className="h-12 w-12 text-gray-300" />
                        )}
                    </div>
                    <div className="text-white space-y-2">
                        <h2 className="text-2xl font-bold">{user.fullName}</h2>
                        <div className="flex items-center gap-2 text-white/90">
                            <Mail className="h-4 w-4" />
                            <span className="text-sm">{user.email}</span>
                        </div>
                        <div className="flex gap-3 pt-1">
                            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-white/20">
                                <ShieldAlert className="h-3 w-3" />
                                {user.role ? (user.role.charAt(0) + user.role.slice(1).toLowerCase()) : "N/A"}
                            </span>
                            <span className={cn(
                                "px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border backdrop-blur-md",
                                user.isActive
                                    ? "bg-green-400/20 text-white border-green-400/30"
                                    : "bg-red-400/20 text-white border-red-400/30"
                            )}>
                                <span className={cn("w-1.5 h-1.5 rounded-full", user.isActive ? "bg-green-400" : "bg-red-400")} />
                                {user.isActive ? "Active" : "Locked"}
                            </span>
                        </div>
                    </div>
                </CardContent>
                <div className="absolute top-0 right-0 w-64 h-full bg-white/5 skew-x-12 -mr-16" />
            </Card>

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <Card className="border border-gray-200 shadow-sm">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 font-inter">
                                Account Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <InfoItem
                                    icon={<CreditCard className="h-4 w-4" />}
                                    label="Account ID"
                                    value={user.id.substring(0, 8).toUpperCase()}
                                />
                                <InfoItem
                                    icon={<UserIcon className="h-4 w-4" />}
                                    label="Username"
                                    value={user.code || "N/A"}
                                />
                                <InfoItem
                                    icon={<UserIcon className="h-4 w-4" />}
                                    label="Full Name"
                                    value={user.fullName || "N/A"}
                                />
                                <InfoItem
                                    icon={<Mail className="h-4 w-4" />}
                                    label="Email Address"
                                    value={user.email}
                                />
                                <InfoItem
                                    icon={<ShieldAlert className="h-4 w-4" />}
                                    label="Role"
                                    value={user.role || "N/A"}
                                />
                                <InfoItem
                                    icon={<Calendar className="h-4 w-4" />}
                                    label="Created Date"
                                    value={formatDate(user.createdAt)}
                                />
                                <div className="col-span-1 md:col-span-2">
                                    <InfoItem
                                        icon={<Clock className="h-4 w-4" />}
                                        label="Last Login"
                                        value={formatDateTime(null)}
                                    />
                                </div>
                            </div>

                            <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 text-blue-700">
                                <FileText className="h-5 w-5 shrink-0 mt-0.5" />
                                <p className="text-sm leading-relaxed">
                                    Account information is managed by system administrators. Changes to core account
                                    details require proper authorization and are logged for audit purposes.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <Card className="border border-gray-200 shadow-sm">
                        <CardContent className="p-6 space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Edit className="h-4 w-4 text-gray-500" /> Actions
                            </h3>

                            <Button
                                onClick={handleToggleStatus}
                                disabled={isLocking}
                                className={cn(
                                    "w-full h-12 flex items-center justify-center gap-2 font-bold text-white transition-all",
                                    user.isActive
                                        ? "bg-red-600 hover:bg-red-700"
                                        : "bg-green-600 hover:bg-green-700"
                                )}
                            >
                                {user.isActive ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
                                {isLocking ? "Processing..." : user.isActive ? "Lock Account" : "Unlock Account"}
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => router.push(`/dashboard/accounts/edit/${id}`)}
                                className="w-full h-12 flex items-center justify-center gap-2 font-bold text-[#F37021] border-[#F37021] hover:bg-[#F37021] hover:text-white transition-all bg-white"
                            >
                                <Edit className="h-5 w-5" />
                                Edit Account
                            </Button>

                            <div className={cn(
                                "p-4 rounded-xl mt-6 border",
                                user.isActive ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                            )}>
                                <h4 className={cn("text-xs font-bold uppercase mb-2", user.isActive ? "text-green-800" : "text-red-800")}>
                                    Current Status:
                                </h4>
                                <p className={cn("text-sm font-medium", user.isActive ? "text-green-700 font-bold" : "text-red-700 font-bold")}>
                                    {user.isActive ? "Active" : "Locked"}
                                </p>
                                <p className={cn("text-xs mt-1 leading-relaxed", user.isActive ? "text-green-600/80" : "text-red-600/80")}>
                                    {user.isActive
                                        ? "The account is active and can access the system normally."
                                        : "The account is restricted from signing in to the portal."}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
        <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                {icon} {label}
            </label>
            <div className="h-11 px-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center text-sm font-medium text-gray-700">
                {value}
            </div>
        </div>
    );
}
