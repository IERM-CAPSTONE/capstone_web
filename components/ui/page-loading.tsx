import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/ui/skeleton";

/**
 * Loading skeleton cho trang chung (đơn giản)
 */
export function PageLoadingSkeleton() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="flex flex-col items-center gap-4">
                {/* Logo shimmer */}
                <div className="relative">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 animate-pulse" />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </div>

                {/* Loading text */}
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-orange-500 animate-bounce [animation-delay:-0.3s]" />
                    <div className="h-2 w-2 rounded-full bg-orange-500 animate-bounce [animation-delay:-0.15s]" />
                    <div className="h-2 w-2 rounded-full bg-orange-500 animate-bounce" />
                </div>
            </div>
        </div>
    );
}

/**
 * Loading skeleton cho Dashboard (với sidebar và header)
 */
export function DashboardLoadingSkeleton() {
    return (
        <div className="flex h-screen flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
            {/* Header skeleton */}
            <div className="h-16 bg-[#F37021] flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg bg-orange-400" />
                    <Skeleton className="h-6 w-32 bg-orange-400" />
                </div>
                <div className="flex items-center gap-4">
                    <Skeleton className="h-8 w-16 rounded-lg bg-orange-400" />
                    <Skeleton className="h-9 w-9 rounded-full bg-orange-400" />
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar skeleton */}
                <div className="hidden lg:flex w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-4">
                    <div className="space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full rounded-lg" />
                        ))}
                    </div>
                </div>

                {/* Main content skeleton */}
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        {/* Title */}
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-64" />
                            <Skeleton className="h-4 w-96" />
                        </div>

                        {/* Stats cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <SkeletonCard key={i} />
                            ))}
                        </div>

                        {/* Table */}
                        <SkeletonTable rows={5} columns={5} />
                    </div>
                </main>
            </div>
        </div>
    );
}

/**
 * Loading skeleton cho form/detail page
 */
export function FormLoadingSkeleton() {
    return (
        <div className="space-y-6 p-6">
            {/* Back button */}
            <Skeleton className="h-10 w-24" />

            {/* Title */}
            <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>

            {/* Form fields */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full rounded-lg" />
                        </div>
                    ))}
                </div>

                {/* Buttons */}
                <div className="flex gap-4 mt-8">
                    <Skeleton className="h-10 w-32 rounded-lg" />
                    <Skeleton className="h-10 w-24 rounded-lg" />
                </div>
            </div>
        </div>
    );
}

/**
 * Loading skeleton cho list/table page
 */
export function ListLoadingSkeleton() {
    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-10 w-36 rounded-lg" />
            </div>

            {/* Search & filters */}
            <div className="flex gap-4">
                <Skeleton className="h-10 w-80 rounded-lg" />
                <Skeleton className="h-10 w-32 rounded-lg" />
            </div>

            {/* Table */}
            <SkeletonTable rows={8} columns={6} />

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <Skeleton className="h-10 w-10 rounded-lg" />
                </div>
            </div>
        </div>
    );
}

/**
 * Loading skeleton cho Auth pages (Login/Callback)
 */
export function AuthLoadingSkeleton() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#1e3a8a] to-[#f97316] p-4">
            <div className="mb-8 flex flex-col items-center text-center">
                <div className="mb-4 h-20 w-20 rounded-2xl bg-white/90 animate-pulse" />
                <Skeleton className="h-8 w-64 bg-white/30 mb-2" />
                <Skeleton className="h-4 w-48 bg-white/20" />
            </div>

            <div className="w-full max-w-[450px] rounded-2xl bg-white p-8 shadow-2xl">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-7 w-40" />
                        <Skeleton className="h-4 w-56" />
                    </div>
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <div className="rounded-lg bg-orange-50 p-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4 mt-2" />
                    </div>
                </div>
            </div>
        </div>
    );
}
