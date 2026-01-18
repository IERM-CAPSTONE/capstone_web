import { cn } from "@/lib/utils/cn";

interface SkeletonProps {
    className?: string;
}

/**
 * Skeleton cơ bản - có hiệu ứng shimmer
 */
export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-md bg-gray-200 dark:bg-gray-700",
                className
            )}
        />
    );
}

/**
 * Skeleton cho text một dòng
 */
export function SkeletonText({ className }: SkeletonProps) {
    return <Skeleton className={cn("h-4 w-full", className)} />;
}

/**
 * Skeleton cho avatar/hình tròn
 */
export function SkeletonAvatar({ className }: SkeletonProps) {
    return <Skeleton className={cn("h-10 w-10 rounded-full", className)} />;
}

/**
 * Skeleton cho button
 */
export function SkeletonButton({ className }: SkeletonProps) {
    return <Skeleton className={cn("h-10 w-24 rounded-lg", className)} />;
}

/**
 * Skeleton cho card
 */
export function SkeletonCard({ className }: SkeletonProps) {
    return (
        <div className={cn("rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800", className)}>
            <div className="space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            </div>
        </div>
    );
}

/**
 * Skeleton cho table row
 */
export function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
    return (
        <tr className="border-b border-gray-100 dark:border-gray-700">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                </td>
            ))}
        </tr>
    );
}

/**
 * Skeleton cho bảng hoàn chỉnh
 */
export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        {Array.from({ length: columns }).map((_, i) => (
                            <th key={i} className="px-4 py-3 text-left">
                                <Skeleton className="h-4 w-20" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, i) => (
                        <SkeletonTableRow key={i} columns={columns} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
