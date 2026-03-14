"use client";

import { useTranslations, useLocale } from "next-intl";
import { EventDetailDto } from "@/utils/events-api";
import { narrativeApi, NarrativePlotlineDto, NarrativePlotlinePhaseDto, NarrativePlotlineQuestLinkDto, NarrativeDocumentLinkDto, NarrativeEntityCharacterLinkDto, NarrativeEntityFactionLinkDto, NarrativeEntityItemLinkDto } from "@/utils/narrative-api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { EditableRichText } from "@/components/ui/editable-rich-text";
import { NarrativeStatusBadge } from "./narrative-status-badge";
import { ChangeNarrativeStatusDialog } from "./change-narrative-status-dialog";
import { PlotlinePhasesPanel } from "./plotline-phases-panel";
import { PlotlineLinksPanel } from "./plotline-links-panel";
import { PlotlineDocumentsPanel } from "./plotline-documents-panel";

interface PlotlineDetailProps {
    event: EventDetailDto;
    initialPlotline: NarrativePlotlineDto;
    initialPhases: NarrativePlotlinePhaseDto[];
    initialQuestLinks: NarrativePlotlineQuestLinkDto[];
    initialDocuments: NarrativeDocumentLinkDto[];
    initialCharacterLinks: NarrativeEntityCharacterLinkDto[];
    initialFactionLinks: NarrativeEntityFactionLinkDto[];
    initialItemLinks: NarrativeEntityItemLinkDto[];
    canWrite: boolean;
    token: string;
}

export function PlotlineDetail({
    event,
    initialPlotline,
    initialPhases,
    initialQuestLinks,
    initialDocuments,
    initialCharacterLinks,
    initialFactionLinks,
    initialItemLinks,
    canWrite,
    token
}: PlotlineDetailProps) {
    const t = useTranslations("narrative");
    const locale = useLocale();
    const router = useRouter();
    const [plotline, setPlotline] = useState<NarrativePlotlineDto>(initialPlotline);

    const handleUpdate = async (updates: Partial<NarrativePlotlineDto>) => {
        try {
            const updated = await narrativeApi.updatePlotline(token, event.id, plotline.id, updates);
            setPlotline(updated);
            toast.success(t("plotlines.notifications.updated"));
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
                    <h1 className="text-3xl font-bold tracking-tight">{plotline.title}</h1>
                    <div className="flex items-center gap-4 mt-1">
                        <NarrativeStatusBadge status={plotline.status} />
                    </div>
                </div>
                {canWrite && (
                    <div className="flex items-center gap-2">
                        <ChangeNarrativeStatusDialog
                            eventId={event.id}
                            entityId={plotline.id}
                            entityType="plotline"
                            currentStatus={plotline.status}
                            token={token}
                            onStatusChanged={(s) => setPlotline({ ...plotline, status: s as any })}
                        >
                            <Button variant="outline" size="sm">
                                {t("common.changeStatus")}
                            </Button>
                        </ChangeNarrativeStatusDialog>
                    </div>
                )}
            </div>

            {/* ─── Tabs ─────────────────────────────────────────────────── */}
            <Tabs defaultValue="details" className="space-y-6">
                <TabsList className="bg-muted/50 w-full justify-start h-auto flex-wrap p-1">
                    <TabsTrigger value="details" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">{t("plotlines.detail.tabs.details")}</TabsTrigger>
                    <TabsTrigger value="links" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">{t("plotlines.detail.tabs.links")}</TabsTrigger>
                    <TabsTrigger value="documents" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">{t("plotlines.detail.tabs.documents")}</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6">
                    <PlotlinePhasesPanel
                        eventId={event.id}
                        plotline={plotline}
                        initialPhases={initialPhases}
                        initialQuestLinks={initialQuestLinks}
                        canWrite={canWrite}
                        token={token}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className={`${canWrite ? "lg:col-span-2" : "lg:col-span-3"} rounded-lg border bg-card p-6`}>
                            <EditableRichText
                                title={t("plotlines.fields.description.label")}
                                initialHtml={plotline.description || ""}
                                onSave={async (val) => await handleUpdate({ description: val })}
                                isReadOnly={!canWrite}
                                placeholder={t("plotlines.fields.description.placeholder")}
                            />
                        </div>

                        {canWrite && (
                            <div className="lg:col-span-1 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-6">
                                <EditableRichText
                                    title={t("plotlines.fields.internalNotes.label")}
                                    description={t("common.internalNotesHint")}
                                    variant="amber"
                                    initialHtml={plotline.internalNotes || ""}
                                    onSave={async (val) => await handleUpdate({ internalNotes: val })}
                                    isReadOnly={!canWrite}
                                    placeholder={t("plotlines.fields.internalNotes.placeholder")}
                                />
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="links">
                    <PlotlineLinksPanel
                        eventId={event.id}
                        plotline={plotline}
                        initialCharacterLinks={initialCharacterLinks}
                        initialFactionLinks={initialFactionLinks}
                        initialItemLinks={initialItemLinks}
                        canWrite={canWrite}
                        token={token}
                    />
                </TabsContent>

                <TabsContent value="documents">
                    <PlotlineDocumentsPanel
                        eventId={event.id}
                        plotlineId={plotline.id}
                        initialDocuments={initialDocuments}
                        canWrite={canWrite}
                        token={token}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
