"use client";

import { useTranslations, useLocale } from "next-intl";
import { EventDetailDto } from "@/utils/events-api";
import { narrativeApi, NarrativePlotDto, NarrativePlotPlotlineLinkDto, NarrativeDocumentLinkDto, NarrativeEntityCharacterLinkDto, NarrativeEntityFactionLinkDto, NarrativeEntityItemLinkDto } from "@/utils/narrative-api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { EditableRichText } from "@/components/ui/editable-rich-text";
import { NarrativeStatusBadge } from "./narrative-status-badge";
import { ChangeNarrativeStatusDialog } from "./change-narrative-status-dialog";
import { PlotPlotlinesPanel } from "./plot-plotlines-panel";
import { PlotLinksPanel } from "./plot-links-panel";
import { PlotDocumentsPanel } from "./plot-documents-panel";

interface PlotDetailProps {
    event: EventDetailDto;
    initialPlot: NarrativePlotDto;
    initialPlotlineLinks: NarrativePlotPlotlineLinkDto[];
    initialDocuments: NarrativeDocumentLinkDto[];
    initialCharacterLinks: NarrativeEntityCharacterLinkDto[];
    initialFactionLinks: NarrativeEntityFactionLinkDto[];
    initialItemLinks: NarrativeEntityItemLinkDto[];
    canWrite: boolean;
    token: string;
}

export function PlotDetail({
    event,
    initialPlot,
    initialPlotlineLinks,
    initialDocuments,
    initialCharacterLinks,
    initialFactionLinks,
    initialItemLinks,
    canWrite,
    token
}: PlotDetailProps) {
    const t = useTranslations("narrative");
    const locale = useLocale();
    const router = useRouter();
    const [plot, setPlot] = useState<NarrativePlotDto>(initialPlot);

    const handleUpdate = async (updates: Partial<NarrativePlotDto>) => {
        try {
            const updated = await narrativeApi.updatePlot(token, event.id, plot.id, updates);
            setPlot(updated);
            toast.success(t("plots.notifications.updated"));
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || t("notifications.updated"));
        }
    };

    return (
        <div className="space-y-6">
            {/* ─── Header ───────────────────────────────────────────────── */}
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => router.push(`/${locale}/narrative/${event.id}`)}
                    title={t("common.back")}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">{plot.title}</h1>
                    <div className="flex items-center gap-4 mt-1">
                        <NarrativeStatusBadge status={plot.status} />
                    </div>
                </div>
                {canWrite && (
                    <div className="flex items-center gap-2">
                        <ChangeNarrativeStatusDialog
                            eventId={event.id}
                            entityId={plot.id}
                            entityType="plot"
                            currentStatus={plot.status}
                            token={token}
                            onStatusChanged={(s) => setPlot({ ...plot, status: s as any })}
                        >
                            <Button variant="outline" size="sm">
                                {t("common.changeStatus")}
                            </Button>
                        </ChangeNarrativeStatusDialog>
                    </div>
                )}
            </div>

            {/* ─── Tabs ─────────────────────────────────────────────────── */}
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-muted/50 w-full justify-start h-auto flex-wrap p-1">
                    <TabsTrigger value="overview" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">{t("plots.detail.tabs.overview")}</TabsTrigger>
                    <TabsTrigger value="plotlines" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">{t("plots.detail.tabs.plotlines")}</TabsTrigger>
                    <TabsTrigger value="links" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">{t("plots.detail.tabs.links")}</TabsTrigger>
                    <TabsTrigger value="documents" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">{t("plots.detail.tabs.documents")}</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="rounded-lg border bg-card p-6">
                        <EditableRichText
                            title={t("plots.fields.description.label")}
                            initialHtml={plot.description || ""}
                            onSave={async (val) => await handleUpdate({ description: val })}
                            isReadOnly={!canWrite}
                            placeholder={t("plots.fields.description.placeholder")}
                        />
                    </div>

                    {canWrite && (
                        <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-6">
                            <EditableRichText
                                title={t("plots.fields.internalNotes.label")}
                                description={t("common.internalNotesHint")}
                                variant="amber"
                                initialHtml={plot.internalNotes || ""}
                                onSave={async (val) => await handleUpdate({ internalNotes: val })}
                                isReadOnly={!canWrite}
                                placeholder={t("plots.fields.internalNotes.placeholder")}
                            />
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="plotlines">
                    <PlotPlotlinesPanel
                        eventId={event.id}
                        plot={plot}
                        initialPlotlineLinks={initialPlotlineLinks}
                        canWrite={canWrite}
                        token={token}
                    />
                </TabsContent>

                <TabsContent value="links">
                    <PlotLinksPanel
                        eventId={event.id}
                        plot={plot}
                        initialCharacterLinks={initialCharacterLinks}
                        initialFactionLinks={initialFactionLinks}
                        initialItemLinks={initialItemLinks}
                        canWrite={canWrite}
                        token={token}
                    />
                </TabsContent>

                <TabsContent value="documents">
                    <PlotDocumentsPanel
                        eventId={event.id}
                        plotId={plot.id}
                        initialDocuments={initialDocuments}
                        canWrite={canWrite}
                        token={token}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
