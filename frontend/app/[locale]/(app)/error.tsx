"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function AppError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const t = useTranslations("common");

    useEffect(() => {
        console.error("App error boundary caught:", error);
    }, [error]);

    return (
        <div className="mx-auto w-full max-w-xl px-4 py-16 text-center space-y-6">
            <div className="flex justify-center">
                <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <div className="space-y-2">
                <h2 className="text-xl font-semibold">
                    {t("error.title")}
                </h2>
                <p className="text-sm text-muted-foreground">
                    {t("error.description")}
                </p>
            </div>
            <Button onClick={reset} variant="outline">
                {t("error.retry")}
            </Button>
        </div>
    );
}
