import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface NarrativeStatusBadgeProps {
    status: string;
}

export function NarrativeStatusBadge({ status }: NarrativeStatusBadgeProps) {
    const t = useTranslations("narrative.status");
    const normalized = status?.toLowerCase() || "draft";

    if (normalized === "locked") {
        return <Badge variant="destructive">{t("locked")}</Badge>;
    }

    if (normalized === "ready") {
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 dark:text-emerald-950">{t("ready")}</Badge>;
    }

    return <Badge variant="secondary">{t("draft")}</Badge>;
}
