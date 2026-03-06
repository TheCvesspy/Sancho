import { Skeleton } from "@/components/ui/skeleton";

export default function CharactersListLoading() {
    return (
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
            {/* Event selector header */}
            <Skeleton className="h-12 w-full rounded-lg" />

            {/* Page header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-9 w-48" />
                    <Skeleton className="h-5 w-64" />
                </div>
                <Skeleton className="h-9 w-36" />
            </div>

            {/* Filter bar */}
            <div className="flex gap-4 rounded-lg border bg-card p-4">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-9 w-40" />
            </div>

            {/* Table */}
            <div className="rounded-md border bg-card overflow-hidden">
                <div className="p-4 space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                            <Skeleton className="h-5 w-36" />
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-6 w-16 rounded-full" />
                            <Skeleton className="h-5 w-28 ml-auto" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
