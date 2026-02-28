import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface EventStatusBadgeProps {
    status: string;
}

export function EventStatusBadge({ status }: EventStatusBadgeProps) {
    const t = useTranslations("events.status");

    switch (status) {
        case "active":
            return (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 capitalize">
                    {t("active")}
                </Badge>
            );
        case "archived":
            return (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 capitalize">
                    {t("archived")}
                </Badge>
            );
        case "deleted":
            return (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 capitalize">
                    {t("deleted")}
                </Badge>
            );
        default:
            return <Badge variant="secondary" className="capitalize">{status}</Badge>;
    }
}
