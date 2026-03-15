"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface LocationTypeBadgeProps {
    type: string;
    className?: string;
}

export function LocationTypeBadge({ type, className }: LocationTypeBadgeProps) {
    const t = useTranslations("narrative.locations.type");
    const normalized = type?.toLowerCase() || "basic";

    if (normalized === "dungeon") {
        return (
            <Badge variant="secondary" className={`bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300 dark:hover:bg-purple-800 ${className || ""}`}>
                {t("dungeon")}
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className={className}>
            {t("basic")}
        </Badge>
    );
}
