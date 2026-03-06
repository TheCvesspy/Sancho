import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";

interface NarrativeStatusBadgeProps {
    status: string;
}

export function NarrativeStatusBadge({ status }: NarrativeStatusBadgeProps) {
    const t = useTranslations("narrative.status");
    const normalized = status?.toLowerCase() || "draft";

    if (normalized === "locked") {
        return (
            <Badge className="bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700 gap-1">
                <Lock className="h-3 w-3" />
                {t("locked")}
            </Badge>
        );
    }

    if (normalized === "ready") {
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700">{t("ready")}</Badge>;
    }

    return <Badge variant="secondary">{t("draft")}</Badge>;
}
