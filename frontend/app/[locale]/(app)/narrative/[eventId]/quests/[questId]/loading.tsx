import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
                        <Skeleton className="h-4 w-16" />
                        <span>/</span>
                        <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-10 w-96 mb-2" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex items-center space-x-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-10" />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex space-x-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                </div>

                <div className="border rounded-lg p-6 space-y-6">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-24 w-full" />
                </div>
            </div>
        </div>
    );
}
