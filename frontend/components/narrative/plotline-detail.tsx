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
    isOrgOrSysAdmin: boolean;
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
    isOrgOrSysAdmin,
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
                {isOrgOrSysAdmin && (
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
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="mb-4 flex flex-wrap h-auto">
                    <TabsTrigger value="overview">{t("plotlines.detail.tabs.overview")}</TabsTrigger>
                    <TabsTrigger value="phases">{t("plotlines.detail.tabs.phases")}</TabsTrigger>
                    <TabsTrigger value="links">{t("plotlines.detail.tabs.links")}</TabsTrigger>
                    <TabsTrigger value="documents">{t("plotlines.detail.tabs.documents")}</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold tracking-tight">{t("plotlines.fields.description.label")}</h2>
                        <EditableRichText
                            initialHtml={plotline.description || ""}
                            onSave={async (val) => await handleUpdate({ description: val })}
                            isReadOnly={!isOrgOrSysAdmin}
                            placeholder={t("plotlines.fields.description.label")}
                        />
                    </section>

                    {isOrgOrSysAdmin && (
                        <section className="space-y-4">
                            <h2 className="text-xl font-semibold tracking-tight">{t("plotlines.fields.internalNotes.label")}</h2>
                            <EditableRichText
                                initialHtml={plotline.internalNotes || ""}
                                onSave={async (val) => await handleUpdate({ internalNotes: val })}
                                isReadOnly={false}
                                placeholder={t("plotlines.fields.internalNotes.label")}
                            />
                        </section>
                    )}
                </TabsContent>

                <TabsContent value="phases">
                    <PlotlinePhasesPanel
                        eventId={event.id}
                        plotline={plotline}
                        initialPhases={initialPhases}
                        initialQuestLinks={initialQuestLinks}
                        isOrgOrSysAdmin={isOrgOrSysAdmin}
                        token={token}
                    />
                </TabsContent>

                <TabsContent value="links">
                    <PlotlineLinksPanel
                        eventId={event.id}
                        plotline={plotline}
                        initialCharacterLinks={initialCharacterLinks}
                        initialFactionLinks={initialFactionLinks}
                        initialItemLinks={initialItemLinks}
                        isOrgOrSysAdmin={isOrgOrSysAdmin}
                        token={token}
                    />
                </TabsContent>

                <TabsContent value="documents">
                    <PlotlineDocumentsPanel
                        eventId={event.id}
                        plotlineId={plotline.id}
                        initialDocuments={initialDocuments}
                        isOrgOrSysAdmin={isOrgOrSysAdmin}
                        token={token}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
