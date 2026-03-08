"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { EventDetailDto } from "@/utils/events-api";
import {
    NarrativeFactionDto,
    NarrativeFactionMemberDto,
    NarrativeFactionRelationshipDto,
    NarrativeDocumentLinkDto,
    narrativeApi,
    UpdateFactionRequest
} from "@/utils/narrative-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Loader2, FileText, Users, Network, Link as LinkIcon, HardDriveUpload } from "lucide-react";
import { EditableRichText } from "@/components/ui/editable-rich-text";
import { NarrativeStatusBadge } from "./narrative-status-badge";
import { ChangeNarrativeStatusDialog } from "./change-narrative-status-dialog";
import { FactionMembersPanel } from "./faction-members-panel";
import { FactionRelationshipsPanel } from "./faction-relationships-panel";
import { FactionLinksPanel } from "./faction-links-panel";
import { FactionDocumentsPanel } from "./faction-documents-panel";

interface FactionDetailProps {
    event: EventDetailDto;
    initialFaction: NarrativeFactionDto;
    initialMembers: NarrativeFactionMemberDto[];
    initialRelationships: NarrativeFactionRelationshipDto[];
    initialDocuments: NarrativeDocumentLinkDto[];
    isOrgOrSysAdmin: boolean;
    token: string;
}

export function FactionDetail({
    event,
    initialFaction,
    initialMembers,
    initialRelationships,
    initialDocuments,
    isOrgOrSysAdmin,
    token
}: FactionDetailProps) {
    const t = useTranslations("narrative");
    const locale = useLocale();
    const router = useRouter();

    const [faction, setFaction] = useState<NarrativeFactionDto>(initialFaction);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(faction.name);
    const [isSaving, setIsSaving] = useState(false);

    const handleBack = () => {
        router.push(`/${locale}/narrative/${event.id}?tab=factions`);
    };

    const handleSaveTitle = async () => {
        if (editedTitle.trim() === "" || editedTitle === faction.name) {
            setIsEditingTitle(false);
            setEditedTitle(faction.name);
            return;
        }

        setIsSaving(true);
        try {
            const req: UpdateFactionRequest = { name: editedTitle };
            const updated = await narrativeApi.updateFaction(token, event.id, faction.id, req);
            setFaction(q => ({ ...q, name: updated.name, updatedAt: updated.updatedAt }));
            setIsEditingTitle(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveField = async (field: "description" | "goals" | "internalNotes", value: string) => {
        try {
            const req: UpdateFactionRequest = { [field]: value };
            const updated = await narrativeApi.updateFaction(token, event.id, faction.id, req);
            setFaction(q => ({ ...q, [field]: updated[field], updatedAt: updated.updatedAt }));
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">{t("common.back")}</span>
                </Button>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <span>{event.name}</span>
                        <span>/</span>
                        <span>{t("factions.title")}</span>
                    </div>
                    {isEditingTitle ? (
                        <div className="flex items-center gap-2">
                            <Input
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                className="text-3xl font-bold h-12 max-w-md"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                            />
                            <Button size="icon" onClick={handleSaveTitle} disabled={isSaving}>
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            {/* Placeholder for Sigil Upload */}
                            {faction.sigilUrl ? (
                                <img src={faction.sigilUrl} alt="sigil" className="h-12 w-12 rounded bg-muted object-cover" />
                            ) : (
                                <div className="h-12 w-12 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground border border-dashed">{t("factions.sigil.noSigil")}</div>
                            )}
                            <h1
                                className={`text-3xl font-bold tracking-tight truncate ${isOrgOrSysAdmin ? "cursor-pointer hover:underline decoration-muted-foreground underline-offset-4" : ""}`}
                                onClick={() => isOrgOrSysAdmin && setIsEditingTitle(true)}
                            >
                                {faction.name}
                            </h1>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {isOrgOrSysAdmin ? (
                        <ChangeNarrativeStatusDialog
                            eventId={event.id}
                            entityId={faction.id}
                            entityType="faction"
                            currentStatus={faction.status}
                            token={token}
                            onStatusChanged={(s) => setFaction(q => ({ ...q, status: s as "Draft" | "Ready" | "Locked" }))}
                        >
                            <div className="cursor-pointer hover:opacity-80 transition-opacity">
                                <NarrativeStatusBadge status={faction.status} />
                            </div>
                        </ChangeNarrativeStatusDialog>
                    ) : (
                        <NarrativeStatusBadge status={faction.status} />
                    )}
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-muted/50 w-full justify-start h-auto flex-wrap p-1">
                    <TabsTrigger value="overview" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">
                        <FileText className="h-4 w-4 mr-2" />
                        {t("factions.detail.tabs.overview")}
                    </TabsTrigger>
                    <TabsTrigger value="members" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">
                        <Users className="h-4 w-4 mr-2" />
                        {t("factions.detail.tabs.members")}
                    </TabsTrigger>
                    <TabsTrigger value="relationships" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">
                        <Network className="h-4 w-4 mr-2" />
                        {t("factions.detail.tabs.relationships")}
                    </TabsTrigger>
                    <TabsTrigger value="links" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">
                        <LinkIcon className="h-4 w-4 mr-2" />
                        {t("factions.detail.tabs.links")}
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">
                        <HardDriveUpload className="h-4 w-4 mr-2" />
                        {t("factions.detail.tabs.documents")}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            <div className="rounded-lg border bg-card p-6">
                                <EditableRichText
                                    title={t("factions.fields.description.label")}
                                    initialHtml={faction.description || ""}
                                    placeholder={t("factions.fields.description.placeholder")}
                                    isReadOnly={!isOrgOrSysAdmin}
                                    onSave={(html) => handleSaveField("description", html)}
                                />
                            </div>

                            <div className="rounded-lg border bg-card p-6">
                                <EditableRichText
                                    title={t("factions.fields.goals.label")}
                                    initialHtml={faction.goals || ""}
                                    placeholder={t("factions.fields.goals.placeholder")}
                                    isReadOnly={!isOrgOrSysAdmin}
                                    onSave={(html) => handleSaveField("goals", html)}
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            {isOrgOrSysAdmin && (
                                <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-6">
                                    <EditableRichText
                                        title={t("factions.fields.internalNotes.label")}
                                        description={t("common.internalNotesHint")}
                                        variant="amber"
                                        initialHtml={faction.internalNotes || ""}
                                        placeholder={t("factions.fields.internalNotes.placeholder")}
                                        isReadOnly={!isOrgOrSysAdmin}
                                        onSave={(html) => handleSaveField("internalNotes", html)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="members">
                    <FactionMembersPanel
                        eventId={event.id}
                        factionId={faction.id}
                        initialMembers={initialMembers}
                        isOrgOrSysAdmin={isOrgOrSysAdmin}
                        token={token}
                    />
                </TabsContent>

                <TabsContent value="relationships">
                    <FactionRelationshipsPanel
                        eventId={event.id}
                        factionId={faction.id}
                        initialRelationships={initialRelationships}
                        isOrgOrSysAdmin={isOrgOrSysAdmin}
                        token={token}
                    />
                </TabsContent>

                <TabsContent value="links">
                    <FactionLinksPanel
                        eventId={event.id}
                        factionId={faction.id}
                        isOrgOrSysAdmin={isOrgOrSysAdmin}
                        token={token}
                    />
                </TabsContent>

                <TabsContent value="documents">
                    <FactionDocumentsPanel
                        eventId={event.id}
                        factionId={faction.id}
                        initialDocuments={initialDocuments}
                        isOrgOrSysAdmin={isOrgOrSysAdmin}
                        token={token}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
