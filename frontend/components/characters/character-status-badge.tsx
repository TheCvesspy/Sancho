import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CharacterStatusBadgeProps {
    status: "Draft" | "Ready" | "Locked";
    className?: string;
}

export function CharacterStatusBadge({ status, className }: CharacterStatusBadgeProps) {
    const t = useTranslations("characters.status");

    switch (status) {
        case "Draft":
            return (
                <Badge variant="secondary" className={cn("text-muted-foreground bg-muted hover:bg-muted/80", className)}>
                    {t("draft")}
                </Badge>
            );
        case "Ready":
            return (
                <Badge variant="default" className={cn("bg-blue-500 hover:bg-blue-600", className)}>
                    {t("ready")}
                </Badge>
            );
        case "Locked":
            return (
                <Badge variant="default" className={cn("bg-amber-500 hover:bg-amber-600 gap-1", className)}>
                    <Lock className="w-3 h-3" />
                    {t("locked")}
                </Badge>
            );
        default:
            return null;
    }
}
