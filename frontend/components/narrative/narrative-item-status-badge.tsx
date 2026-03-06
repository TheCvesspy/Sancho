import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface NarrativeItemStatusBadgeProps {
    status: string;
}

export function NarrativeItemStatusBadge({ status }: NarrativeItemStatusBadgeProps) {
    const t = useTranslations("narrative.itemStatus");
    const normalized = status?.toLowerCase() || "draft";

    if (normalized === "final") {
        return <Badge variant="destructive">{t("final")}</Badge>;
    }

    if (normalized === "ready to review" || normalized === "readytoreview") {
        return <Badge className="bg-amber-500 hover:bg-amber-600 dark:text-amber-950">{t("readyToReview")}</Badge>;
    }

    return <Badge variant="secondary">{t("draft")}</Badge>;
}
