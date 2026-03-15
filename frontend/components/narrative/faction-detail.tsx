"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ArrowLeft,
    FileText,
    Users,
    Network,
    Link as LinkIcon,
    HardDriveUpload,
    Pencil,
    Trash2,
    RotateCcw
} from "lucide-react";
import { EditableRichText } from "@/components/ui/editable-rich-text";
import { NarrativeStatusBadge } from "./narrative-status-badge";
import { ChangeNarrativeStatusDialog } from "./change-narrative-status-dialog";
import { FactionMembersPanel } from "./faction-members-panel";
import { FactionRelationshipsPanel } from "./faction-relationships-panel";
import { FactionLinksPanel } from "./faction-links-panel";
import { FactionDocumentsPanel } from "./faction-documents-panel";
import { EditFactionNameDialog } from "./edit-faction-name-dialog";
import { SigilUpload } from "./sigil-upload";

interface FactionDetailProps {
    event: EventDetailDto;
    initialFaction: NarrativeFactionDto;
    initialMembers: NarrativeFactionMemberDto[];
    initialRelationships: NarrativeFactionRelationshipDto[];
    initialDocuments: NarrativeDocumentLinkDto[];
    canWrite: boolean;
    token: string;
}

export function FactionDetail({
    event,
    initialFaction,
    initialMembers,
    initialRelationships,
    initialDocuments,
    canWrite,
    token
}: FactionDetailProps) {
    const t = useTranslations("narrative");
    const locale = useLocale();
    const router = useRouter();

    const [faction, setFaction] = useState<NarrativeFactionDto>(initialFaction);
    const [isActionPending, setIsActionPending] = useState(false);

    const handleBack = () => {
        router.push(`/${locale}/narrative/${event.id}?tab=factions`);
    };

    // --- Delete / Restore ---
    const handleDelete = async () => {
        if (!confirm(t("factions.dialogs.delete.description"))) return;
        setIsActionPending(true);
        try {
            await narrativeApi.deleteFaction(token, event.id, faction.id, "User requested deletion");
            setFaction(q => ({ ...q, deletedAt: new Date().toISOString() }));
            toast.success(t("factions.notifications.deleted"));
        } catch (error) {
            console.error(error);
            toast.error(t("common.error"));
        } finally {
            setIsActionPending(false);
        }
    };

    const handleRestore = async () => {
        setIsActionPending(true);
        try {
            await narrativeApi.undeleteFaction(token, event.id, faction.id);
            setFaction(q => ({ ...q, deletedAt: null }));
            toast.success(t("factions.notifications.restored"));
        } catch (error) {
            console.error(error);
            toast.error(t("common.error"));
        } finally {
            setIsActionPending(false);
        }
    };

    const handleSaveField = async (field: "description" | "goals" | "internalNotes", value: string) => {
        try {
            const req: UpdateFactionRequest = { [field]: value };
            const updated = await narrativeApi.updateFaction(token, event.id, faction.id, req);
            setFaction(q => ({ ...q, [field]: updated[field], updatedAt: updated.updatedAt }));
            toast.success(t("factions.notifications.updated"));
        } catch (error) {
            console.error(error);
            toast.error(t("common.error"));
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

            {/* ── Header card (Standardized with Avatar support) ── */}
            <div className="bg-card rounded-lg border p-6 flex flex-col md:flex-row gap-6 relative overflow-hidden">
                {faction.deletedAt && (
                    <div className="absolute top-0 left-0 right-0 bg-destructive/10 text-destructive text-center text-sm font-semibold py-1">
                        This faction is deleted.
                    </div>
                )}

                {/* Faction sigil (round avatar with upload support) */}
                <div className="flex-shrink-0 mt-2 md:mt-0">
                    <SigilUpload
                        eventId={event.id}
                        faction={faction}
                        token={token}
                        canWrite={canWrite}
                        onSigilChanged={(url) => setFaction(f => ({ ...f, sigilUrl: url }))}
                    />
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-2">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight mb-1 truncate">{faction.name}</h1>
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <span>Created {format(new Date(faction.createdAt), 'PPP')}</span>
                                </div>
                            </div>
                            <div className="flex shrink-0">
                                <NarrativeStatusBadge status={faction.status} className="text-sm px-3 py-1" />
                            </div>
                        </div>
                    </div>

                    {canWrite && (
                        <div className="mt-6 flex flex-wrap items-center gap-2">
                            <EditFactionNameDialog eventId={event.id} token={token} faction={faction} />
                            <ChangeNarrativeStatusDialog
                                eventId={event.id}
                                entityId={faction.id}
                                entityType="faction"
                                currentStatus={faction.status}
                                token={token}
                                onStatusChanged={(s) => setFaction(q => ({ ...q, status: s as "Draft" | "Ready" | "Locked" }))}
                            >
                                <Button variant="outline" size="sm">
                                    <Pencil className="mr-2 h-4 w-4" />
                                    {t("common.changeStatus")}
                                </Button>
                            </ChangeNarrativeStatusDialog>

                            {!faction.deletedAt ? (
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

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 gap-0">
                    <TabsTrigger
                        value="overview"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4 font-medium"
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        {t("factions.detail.tabs.overview")}
                    </TabsTrigger>
                    <TabsTrigger
                        value="members"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4 font-medium"
                    >
                        <Users className="h-4 w-4 mr-2" />
                        {t("factions.detail.tabs.members")}
                    </TabsTrigger>
                    <TabsTrigger
                        value="relationships"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4 font-medium"
                    >
                        <Network className="h-4 w-4 mr-2" />
                        {t("factions.detail.tabs.relationships")}
                    </TabsTrigger>
                    <TabsTrigger
                        value="links"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4 font-medium"
                    >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        {t("factions.detail.tabs.links")}
                    </TabsTrigger>
                    <TabsTrigger
                        value="documents"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4 font-medium"
                    >
                        <HardDriveUpload className="h-4 w-4 mr-2" />
                        {t("factions.detail.tabs.documents")}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`${canWrite ? "md:col-span-1" : "md:col-span-2"} space-y-6`}>
                            <div className="rounded-lg border bg-card p-6">
                                <EditableRichText
                                    title={t("factions.fields.description.label")}
                                    initialHtml={faction.description || ""}
                                    placeholder={t("factions.fields.description.placeholder")}
                                    isReadOnly={!canWrite}
                                    onSave={(html) => handleSaveField("description", html)}
                                />
                            </div>

                            <div className="rounded-lg border bg-card p-6">
                                <EditableRichText
                                    title={t("factions.fields.goals.label")}
                                    initialHtml={faction.goals || ""}
                                    placeholder={t("factions.fields.goals.placeholder")}
                                    isReadOnly={!canWrite}
                                    onSave={(html) => handleSaveField("goals", html)}
                                />
                            </div>
                        </div>

                        {canWrite && (
                            <div className="space-y-6">
                                <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-6">
                                    <EditableRichText
                                        title={t("factions.fields.internalNotes.label")}
                                        description={t("common.internalNotesHint")}
                                        variant="amber"
                                        initialHtml={faction.internalNotes || ""}
                                        placeholder={t("factions.fields.internalNotes.placeholder")}
                                        isReadOnly={!canWrite}
                                        onSave={(html) => handleSaveField("internalNotes", html)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="members">
                    <FactionMembersPanel
                        eventId={event.id}
                        factionId={faction.id}
                        initialMembers={initialMembers}
                        canWrite={canWrite}
                        token={token}
                    />
                </TabsContent>

                <TabsContent value="relationships">
                    <FactionRelationshipsPanel
                        eventId={event.id}
                        factionId={faction.id}
                        initialRelationships={initialRelationships}
                        canWrite={canWrite}
                        token={token}
                    />
                </TabsContent>

                <TabsContent value="links">
                    <FactionLinksPanel
                        eventId={event.id}
                        factionId={faction.id}
                        canWrite={canWrite}
                        token={token}
                    />
                </TabsContent>

                <TabsContent value="documents">
                    <FactionDocumentsPanel
                        eventId={event.id}
                        factionId={faction.id}
                        initialDocuments={initialDocuments}
                        canWrite={canWrite}
                        token={token}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
