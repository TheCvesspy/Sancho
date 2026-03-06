"use client";

import { useTranslations } from "next-intl";
import { NarrativePlotlineDto } from "@/utils/narrative-api";

interface PlotlineQuestsPanelProps {
    eventId: string;
    plotline: NarrativePlotlineDto;
    isOrgOrSysAdmin: boolean;
    token: string;
}

export function PlotlineQuestsPanel({ eventId, plotline, isOrgOrSysAdmin, token }: PlotlineQuestsPanelProps) {
    const t = useTranslations("narrative");

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium tracking-tight">Linked Quests</h3>
            </div>
            <div className="p-8 text-center border border-dashed rounded-lg bg-muted/20">
                <p className="text-muted-foreground">Plotline quest assignment coming soon.</p>
            </div>
        </div>
    );
}
