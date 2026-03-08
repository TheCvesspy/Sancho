"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventDetailDto } from "@/utils/events-api";
import {
    NarrativeQuestDto,
    NarrativePlotlineDto,
    NarrativePlotDto,
    NarrativeFactionDto,
    NarrativeItemDto
} from "@/utils/narrative-api";
import { QuestsList } from "./quests-list";
import { FactionsList } from "./factions-list";
import { ItemsList } from "./items-list";
import { PlotlinesList } from "./plotlines-list";
import { PlotsList } from "./plots-list";

interface NarrativeHubProps {
    event: EventDetailDto;
    initialQuests: NarrativeQuestDto[];
    initialPlotlines: NarrativePlotlineDto[];
    initialPlots: NarrativePlotDto[];
    initialFactions: NarrativeFactionDto[];
    initialItems: NarrativeItemDto[];
    canWrite: boolean;
    token: string;
}

export function NarrativeHub({
    event,
    initialQuests,
    initialPlotlines,
    initialPlots,
    initialFactions,
    initialItems,
    canWrite,
    token
}: NarrativeHubProps) {
    const t = useTranslations("narrative");

    return (
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{event.name} - {t("title")}</h2>
                    <p className="text-muted-foreground">{t("subtitle")}</p>
                </div>
            </div>

            <Tabs defaultValue="quests" className="space-y-4">
                <TabsList className="bg-muted/50 w-full justify-start h-auto flex-wrap p-1">
                    <TabsTrigger value="quests" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">
                        {t("hub.tabs.quests")} ({initialQuests.length})
                    </TabsTrigger>
                    <TabsTrigger value="plotlines" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">
                        {t("hub.tabs.plotlines")} ({initialPlotlines.length})
                    </TabsTrigger>
                    {/* <TabsTrigger value="plots" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">
                        {t("hub.tabs.plots")} ({initialPlots.length})
                    </TabsTrigger> */}
                    <TabsTrigger value="factions" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">
                        {t("hub.tabs.factions")} ({initialFactions.length})
                    </TabsTrigger>
                    <TabsTrigger value="items" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">
                        {t("hub.tabs.items")} ({initialItems.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="quests" className="space-y-4">
                    <QuestsList
                        eventId={event.id}
                        initialQuests={initialQuests}
                        canWrite={canWrite}
                        token={token}
                    />
                </TabsContent>
                <TabsContent value="plotlines" className="space-y-4">
                    <PlotlinesList
                        eventId={event.id}
                        initialPlotlines={initialPlotlines}
                        canWrite={canWrite}
                        token={token}
                    />
                </TabsContent>
                {/* <TabsContent value="plots" className="space-y-4">
                    <PlotsList
                        eventId={event.id}
                        initialPlots={initialPlots}
                        canWrite={canWrite}
                        token={token}
                    />
                </TabsContent> */}
                <TabsContent value="factions" className="space-y-4">
                    <FactionsList
                        eventId={event.id}
                        initialFactions={initialFactions}
                        canWrite={canWrite}
                        token={token}
                    />
                </TabsContent>
                <TabsContent value="items" className="space-y-4">
                    <ItemsList
                        eventId={event.id}
                        initialItems={initialItems}
                        canWrite={canWrite}
                        token={token}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
