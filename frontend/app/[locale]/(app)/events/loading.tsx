import { Skeleton } from "@/components/ui/skeleton";

export default function EventsLoading() {
    return (
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-9 w-56" />
                    <Skeleton className="h-5 w-80" />
                </div>
                <Skeleton className="h-9 w-36" />
            </div>

            {/* Filter bar */}
            <div className="flex gap-4">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-9 w-40" />
            </div>

            {/* Table */}
            <div className="rounded-md border bg-card overflow-hidden">
                <div className="p-4 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-5 w-28" />
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-6 w-16 rounded-full" />
                            <Skeleton className="h-8 w-8 ml-auto" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
