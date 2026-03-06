"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { EventDetailDto } from "@/utils/events-api";
import { NarrativeQuestDto, NarrativeQuestStepDto, NarrativeDocumentLinkDto, NarrativeQuestCharacterLinkDto, NarrativeEntityFactionLinkDto, NarrativeEntityItemLinkDto, narrativeApi, UpdateQuestRequest } from "@/utils/narrative-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Loader2, FileText, Link as LinkIcon, ListOrdered, HardDriveUpload } from "lucide-react";
import { EditableRichText } from "@/components/ui/editable-rich-text";
import { NarrativeStatusBadge } from "./narrative-status-badge";
import { ChangeNarrativeStatusDialog } from "./change-narrative-status-dialog";
import { QuestStepsPanel } from "./quest-steps-panel";
import { QuestLinksPanel } from "./quest-links-panel";
import { QuestDocumentsPanel } from "./quest-documents-panel";

interface QuestDetailProps {
    event: EventDetailDto;
    initialQuest: NarrativeQuestDto;
    initialSteps: NarrativeQuestStepDto[];
    initialDocuments: NarrativeDocumentLinkDto[];
    initialCharacterLinks: NarrativeQuestCharacterLinkDto[];
    initialFactionLinks: NarrativeEntityFactionLinkDto[];
    initialItemLinks: NarrativeEntityItemLinkDto[];
    isOrgOrSysAdmin: boolean;
    token: string;
}

export function QuestDetail({
    event,
    initialQuest,
    initialSteps,
    initialDocuments,
    initialCharacterLinks,
    initialFactionLinks,
    initialItemLinks,
    isOrgOrSysAdmin,
    token
}: QuestDetailProps) {
    const t = useTranslations("narrative");
    const locale = useLocale();
    const router = useRouter();

    const [quest, setQuest] = useState<NarrativeQuestDto>(initialQuest);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState(quest.title);
    const [isSaving, setIsSaving] = useState(false);

    const handleBack = () => {
        router.push(`/${locale}/narrative/${event.id}`);
    };

    const handleSaveTitle = async () => {
        if (editedTitle.trim() === "" || editedTitle === quest.title) {
            setIsEditingTitle(false);
            setEditedTitle(quest.title);
            return;
        }

        setIsSaving(true);
        try {
            const req: UpdateQuestRequest = { title: editedTitle };
            const updated = await narrativeApi.updateQuest(token, event.id, quest.id, req);
            setQuest(q => ({ ...q, title: updated.title, updatedAt: updated.updatedAt }));
            setIsEditingTitle(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveField = async (field: "description" | "internalNotes" | "hasFixedPlayers", value: any) => {
        try {
            const req: UpdateQuestRequest = { [field]: value };
            const updated = await narrativeApi.updateQuest(token, event.id, quest.id, req);
            setQuest(q => ({ ...q, [field]: updated[field], updatedAt: updated.updatedAt }));
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
                        <span>{t("title")}</span>
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
                        <h1
                            className={`text-3xl font-bold tracking-tight truncate ${isOrgOrSysAdmin ? "cursor-pointer hover:underline decoration-muted-foreground underline-offset-4" : ""}`}
                            onClick={() => isOrgOrSysAdmin && setIsEditingTitle(true)}
                        >
                            {quest.title}
                        </h1>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {isOrgOrSysAdmin ? (
                        <ChangeNarrativeStatusDialog
                            eventId={event.id}
                            entityId={quest.id}
                            entityType="quest"
                            currentStatus={quest.status}
                            token={token}
                            onStatusChanged={(s) => setQuest(q => ({ ...q, status: s as "Draft" | "Ready" | "Locked" }))}
                        >
                            <div className="cursor-pointer hover:opacity-80 transition-opacity">
                                <NarrativeStatusBadge status={quest.status} />
                            </div>
                        </ChangeNarrativeStatusDialog>
                    ) : (
                        <NarrativeStatusBadge status={quest.status} />
                    )}
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-muted/50 w-full justify-start h-auto flex-wrap p-1">
                    <TabsTrigger value="overview" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">
                        <FileText className="h-4 w-4 mr-2" />
                        {t("quests.detail.tabs.overview")}
                    </TabsTrigger>
                    <TabsTrigger value="steps" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">
                        <ListOrdered className="h-4 w-4 mr-2" />
                        {t("quests.detail.tabs.steps")}
                    </TabsTrigger>
                    <TabsTrigger value="links" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">
                        <LinkIcon className="h-4 w-4 mr-2" />
                        {t("quests.detail.tabs.links")}
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">
                        <HardDriveUpload className="h-4 w-4 mr-2" />
                        {t("quests.detail.tabs.documents")}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-6">
                            <div className="rounded-lg border bg-card p-6 space-y-4">
                                <h3 className="text-lg font-semibold">{t("quests.fields.description.label")}</h3>
                                <EditableRichText
                                    initialHtml={quest.description || ""}
                                    placeholder={t("quests.fields.description.placeholder")}
                                    isReadOnly={!isOrgOrSysAdmin}
                                    onSave={(html) => handleSaveField("description", html)}
                                />
                            </div>

                            {isOrgOrSysAdmin && (
                                <div className="rounded-lg border bg-secondary/20 p-6 space-y-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        {t("quests.fields.internalNotes.label")}
                                        <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Admin Only</span>
                                    </h3>
                                    <EditableRichText
                                        initialHtml={quest.internalNotes || ""}
                                        placeholder={t("quests.fields.internalNotes.placeholder")}
                                        isReadOnly={!isOrgOrSysAdmin}
                                        onSave={(html) => handleSaveField("internalNotes", html)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="rounded-lg border bg-card p-6 space-y-4">
                                <h3 className="font-semibold">{t("quests.detail.settings")}</h3>

                                <div className="flex items-center justify-between">
                                    <Label htmlFor="fixed-players" className="flex flex-col space-y-1">
                                        <span>{t("quests.fields.hasFixedPlayers.label")}</span>
                                        <span className="font-normal text-xs text-muted-foreground">
                                            {t("quests.fields.hasFixedPlayers.description")}
                                        </span>
                                    </Label>
                                    <Switch
                                        id="fixed-players"
                                        checked={quest.hasFixedPlayers}
                                        onCheckedChange={(c) => handleSaveField("hasFixedPlayers", c)}
                                        disabled={!isOrgOrSysAdmin}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="steps">
                    <QuestStepsPanel questId={quest.id} eventId={event.id} initialSteps={initialSteps} isOrgOrSysAdmin={isOrgOrSysAdmin} token={token} />
                </TabsContent>

                <TabsContent value="links">
                    <QuestLinksPanel
                        questId={quest.id}
                        eventId={event.id}
                        initialCharacterLinks={initialCharacterLinks}
                        initialFactionLinks={initialFactionLinks}
                        initialItemLinks={initialItemLinks}
                        isOrgOrSysAdmin={isOrgOrSysAdmin}
                        token={token}
                    />
                </TabsContent>

                <TabsContent value="documents">
                    <QuestDocumentsPanel questId={quest.id} eventId={event.id} initialDocuments={initialDocuments} isOrgOrSysAdmin={isOrgOrSysAdmin} token={token} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
