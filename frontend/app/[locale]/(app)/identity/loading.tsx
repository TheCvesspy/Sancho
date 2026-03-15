import { Skeleton } from "@/components/ui/skeleton";

export default function IdentityLoading() {
    return (
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
            {/* Page header */}
            <div className="space-y-2">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-5 w-72" />
            </div>

            {/* Table */}
            <div className="rounded-md border bg-card overflow-hidden">
                <div className="p-4 space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                            <Skeleton className="h-5 w-44" />
                            <Skeleton className="h-5 w-52" />
                            <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
