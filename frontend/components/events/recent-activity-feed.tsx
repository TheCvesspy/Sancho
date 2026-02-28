import { RecentActivityItemDto } from "@/utils/events-api";
import { useTranslations, useLocale } from "next-intl";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, UserPlus, UserMinus, ShieldAlert, Edit, Archive, RotateCcw, Trash2, ShieldCheck, UserCog, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecentActivityFeedProps {
    items: RecentActivityItemDto[];
    compact?: boolean;
}

export function RecentActivityFeed({ items, compact }: RecentActivityFeedProps) {
    const t = useTranslations("events.activity");
    const locale = useLocale();

    const getIcon = (action: string) => {
        switch (action) {
            case "event.created": return Calendar;
            case "event.updated": return Edit;
            case "event.archived": return Archive;
            case "event.restored": return RotateCcw;
            case "event.deleted": return Trash2;
            case "event.undeleted": return RotateCcw;
            case "manager.assigned": return UserPlus;
            case "manager.revoked": return UserMinus;
            case "permission.updated": return ShieldCheck;
            case "permission.revoked": return ShieldAlert;
            default: return Activity;
        }
    };

    const getRelativeTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return "just now";
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
    };

    const formatActor = (id: string | null, name: string | null) => {
        if (!id) return "System";
        if (name) return name;
        return `User ${id.substring(0, 4)}`;
    };

    if (items.length === 0) {
        return <div className="text-center py-10 text-muted-foreground">{t("empty")}</div>;
    }

    const Content = (
        <div className="space-y-4">
            {items.map((item) => {
                const Icon = getIcon(item.action);
                const actionLabel = t.raw(`actions.${item.action}`) || item.action;

                return (
                    <div key={item.id} className="flex gap-4 group">
                        <div className="relative flex flex-col items-center">
                            <div className="z-10 bg-background border rounded-full p-2 group-last:mb-0 transition-colors group-hover:border-primary">
                                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                            </div>
                            <div className="absolute top-8 bottom-0 w-px bg-border group-last:bg-transparent" />
                        </div>

                        <div className="flex-1 pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                <p className="text-sm leading-6">
                                    <span className="font-semibold text-foreground">{formatActor(item.actorUserId, item.actorDisplayName)}</span>
                                    {" "}
                                    <span className="text-muted-foreground">{actionLabel}</span>
                                </p>
                                <time className="text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                                    {getRelativeTime(item.createdAt)}
                                </time>
                            </div>

                            {/* Optional Metadata Display */}
                            {Object.keys(item.metadata || {}).length > 0 && !compact && (
                                <div className="mt-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded-md border border-muted-foreground/10">
                                    {JSON.stringify(item.metadata)}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    if (compact) return Content;

    return (
        <ScrollArea className="h-[500px] pr-4">
            {Content}
        </ScrollArea>
    );
}
