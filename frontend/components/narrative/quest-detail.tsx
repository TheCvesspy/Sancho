"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { EventDetailDto } from "@/utils/events-api";
import {
    NarrativeQuestDto,
    NarrativeQuestStepDto,
    NarrativeDocumentLinkDto,
    NarrativeQuestCharacterLinkDto,
    NarrativeEntityFactionLinkDto,
    NarrativeEntityItemLinkDto,
    narrativeApi,
    UpdateQuestRequest
} from "@/utils/narrative-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ArrowLeft,
    Save,
    Loader2,
    FileText,
    Link as LinkIcon,
    HardDriveUpload,
    Pencil,
    X,
    Trash2,
    RotateCcw
} from "lucide-react";
import { EditableRichText } from "@/components/ui/editable-rich-text";
import { NarrativeStatusBadge } from "./narrative-status-badge";
import { ChangeNarrativeStatusDialog } from "./change-narrative-status-dialog";
import { QuestStepsPanel } from "./quest-steps-panel";
import { QuestLinksPanel } from "./quest-links-panel";
import { QuestDocumentsPanel } from "./quest-documents-panel";
import { format } from "date-fns";
import { EditQuestNameDialog } from "./edit-quest-name-dialog";
import { DuplicateQuestDialog } from "./duplicate-quest-dialog";

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
    const [isActionPending, setIsActionPending] = useState(false);

    const handleBack = () => router.push(`/${locale}/narrative/${event.id}`);

    // --- Description / Notes via EditableRichText ---
    const handleSaveField = async (field: "description" | "internalNotes", value: string) => {
        const req: UpdateQuestRequest = { [field]: value };
        const updated = await narrativeApi.updateQuest(token, event.id, quest.id, req);
        setQuest(q => ({ ...q, [field]: updated[field as keyof NarrativeQuestDto], updatedAt: updated.updatedAt }));
    };

    // --- Delete / Restore ---
    const handleDelete = async () => {
        if (!confirm(t("quests.dialogs.delete.description"))) return;
        setIsActionPending(true);
        try {
            await narrativeApi.deleteQuest(token, event.id, quest.id, "User requested deletion");
            setQuest(q => ({ ...q, deletedAt: new Date().toISOString() }));
        } catch (error) {
            console.error(error);
        } finally {
            setIsActionPending(false);
        }
    };

    const handleRestore = async () => {
        setIsActionPending(true);
        try {
            await narrativeApi.undeleteQuest(token, event.id, quest.id);
            setQuest(q => ({ ...q, deletedAt: null }));
        } catch (error) {
            console.error(error);
        } finally {
            setIsActionPending(false);
        }
    };

    return (
        <div className="space-y-6 lg:max-w-6xl lg:mx-auto">
            {/* Breadcrumb / Back Navigation */}
            <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="sm" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to {event.name}
                </Button>
            </div>

            {/* ── Header card (aligned with Character detail — no avatar) ── */}
            <div className="bg-card rounded-lg border p-6 flex flex-col md:flex-row gap-6 relative overflow-hidden">
                {quest.deletedAt && (
                    <div className="absolute top-0 left-0 right-0 bg-destructive/10 text-destructive text-center text-sm font-semibold py-1">
                        This quest is deleted.
                    </div>
                )}

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-2">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight mb-1 truncate">{quest.title}</h1>
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <span>Created {format(new Date(quest.createdAt), 'PPP')}</span>
                                </div>
                            </div>
                            <div className="flex shrink-0">
                                <NarrativeStatusBadge status={quest.status} className="text-sm px-3 py-1" />
                            </div>
                        </div>
                    </div>

                    {isOrgOrSysAdmin && (
                        <div className="mt-6 flex flex-wrap items-center gap-2">
                            <EditQuestNameDialog eventId={event.id} token={token} quest={quest} />
                            <ChangeNarrativeStatusDialog
                                eventId={event.id}
                                entityId={quest.id}
                                entityType="quest"
                                currentStatus={quest.status}
                                token={token}
                                onStatusChanged={(s) => setQuest(q => ({ ...q, status: s as "Draft" | "Ready" | "Locked" }))}
                            >
                                <Button variant="outline" size="sm">
                                    <Pencil className="mr-2 h-4 w-4" />
                                    {t("common.changeStatus")}
                                </Button>
                            </ChangeNarrativeStatusDialog>
                            <DuplicateQuestDialog eventId={event.id} token={token} quest={quest} />

                            {!quest.deletedAt ? (
                                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isActionPending} className="ml-auto">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t("common.delete")}
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" onClick={handleRestore} disabled={isActionPending} className="ml-auto text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    {t("common.restore")}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Tabs ── */}
            <Tabs defaultValue="details" className="space-y-6">
                <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 gap-0">
                    <TabsTrigger
                        value="details"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4 font-medium"
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        {t("quests.detail.tabs.details")}
                    </TabsTrigger>
                    <TabsTrigger
                        value="links"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4 font-medium"
                    >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        {t("quests.detail.tabs.links")}
                    </TabsTrigger>
                    <TabsTrigger
                        value="documents"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4 font-medium"
                    >
                        <HardDriveUpload className="h-4 w-4 mr-2" />
                        {t("quests.detail.tabs.documents")}
                    </TabsTrigger>
                </TabsList>

                {/* Details tab: Steps first, then Description, then Internal Notes */}
                <TabsContent value="details" className="space-y-8 mt-4">
                    <QuestStepsPanel
                        questId={quest.id}
                        eventId={event.id}
                        initialSteps={initialSteps}
                        isOrgOrSysAdmin={isOrgOrSysAdmin}
                        token={token}
                    />

                    {/* Description */}
                    <div className="rounded-lg border bg-card p-6">
                        <EditableRichText
                            title={t("quests.fields.description.label")}
                            initialHtml={quest.description || ""}
                            placeholder={t("quests.fields.description.placeholder")}
                            isReadOnly={!isOrgOrSysAdmin || !!quest.deletedAt}
                            onSave={(html) => handleSaveField("description", html)}
                        />
                    </div>

                    {/* Internal Notes (admin only) */}
                    {isOrgOrSysAdmin && (
                        <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-6">
                            <EditableRichText
                                title={t("quests.fields.internalNotes.label")}
                                description={t("common.internalNotesHint")}
                                variant="amber"
                                initialHtml={quest.internalNotes || ""}
                                placeholder={t("quests.fields.internalNotes.placeholder")}
                                isReadOnly={!!quest.deletedAt}
                                onSave={(html) => handleSaveField("internalNotes", html)}
                            />
                        </div>
                    )}
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
                    <QuestDocumentsPanel
                        questId={quest.id}
                        eventId={event.id}
                        initialDocuments={initialDocuments}
                        isOrgOrSysAdmin={isOrgOrSysAdmin}
                        token={token}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
