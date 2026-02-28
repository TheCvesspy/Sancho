import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, Truck, MessageSquare, AlertCircle } from "lucide-react";
import { EventStatsDto } from "@/utils/events-api";
import { useTranslations } from "next-intl";

interface EventStatsPanelProps {
    stats: EventStatsDto;
}

export function EventStatsPanel({ stats }: EventStatsPanelProps) {
    const t = useTranslations("events.stats");

    const items = [
        {
            label: t("players"),
            value: stats.playersCount,
            icon: Users,
            source: stats.sources.players,
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            label: t("characters"),
            value: stats.charactersCount,
            icon: Users,
            source: stats.sources.characters,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10"
        },
        {
            label: t("questLines"),
            value: stats.questLinesCount,
            icon: BookOpen,
            source: stats.sources.questLines,
            color: "text-amber-500",
            bg: "bg-amber-500/10"
        },
        {
            label: t("items"),
            value: stats.itemsCount,
            icon: Truck,
            source: stats.sources.items,
            color: "text-purple-500",
            bg: "bg-purple-500/10"
        }
    ];

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => {
                const isUnavailable = item.source === "unavailable";
                const Icon = item.icon;

                return (
                    <Card key={item.label} className={isUnavailable ? "opacity-60 grayscale-[0.5]" : ""}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
                            <div className={`p-2 rounded-md ${item.bg}`}>
                                <Icon className={`h-4 w-4 ${item.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isUnavailable ? "0" : item.value}</div>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px] py-0 px-1 border-muted font-normal text-muted-foreground">
                                    {item.source}
                                </Badge>
                                {isUnavailable && (
                                    <span className="text-[10px] text-muted-foreground italic">
                                        ({t("unavailable")})
                                    </span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
