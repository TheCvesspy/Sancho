"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EventDetailDto } from "@/utils/events-api";
import {
    NarrativeQuestDto,
    NarrativeQuestStepDto,
    NarrativeDocumentLinkDto,
    NarrativeQuestCharacterLinkDto,
    NarrativeEntityFactionLinkDto,
    NarrativeEntityItemLinkDto,
    NarrativeQuestStepItemLinkDto,
    NarrativeItemDto,
    NarrativeLocationDto,
    narrativeApi,
    UpdateQuestRequest
} from "@/utils/narrative-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
    RotateCcw,
    Package
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
    initialStepItemLinks: NarrativeQuestStepItemLinkDto[];
    allItems: NarrativeItemDto[];
    allLocations: NarrativeLocationDto[];
    canWrite: boolean;
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
    initialStepItemLinks,
    allItems,
    allLocations,
    canWrite,
    token
}: QuestDetailProps) {
    const SHORT_DESCRIPTION_MAX_LENGTH = 250;
    const t = useTranslations("narrative");
    const locale = useLocale();
    const router = useRouter();

    const [quest, setQuest] = useState<NarrativeQuestDto>(initialQuest);
    const [isActionPending, setIsActionPending] = useState(false);
    const [isShortDescriptionEditing, setIsShortDescriptionEditing] = useState(false);
    const [shortDescriptionDraft, setShortDescriptionDraft] = useState(initialQuest.shortDescription ?? "");
    const [isSavingShortDescription, setIsSavingShortDescription] = useState(false);

    // Tag input state
    const [tagDraft, setTagDraft] = useState("");

    // Track step-level item links for props aggregation (updated via callback)
    const [stepItemLinks, setStepItemLinks] = useState<NarrativeQuestStepItemLinkDto[]>(initialStepItemLinks);

    const handleBack = () => router.push(`/${locale}/narrative/${event.id}`);

    const isLocked = quest.status === "Locked";
    const isReadOnly = !canWrite || !!quest.deletedAt || isLocked;

    // --- Save field (extended for new fields) ---
    const handleSaveField = async (field: string, value: string) => {
        const req: UpdateQuestRequest = { [field]: value };
        const updated = await narrativeApi.updateQuest(token, event.id, quest.id, req);
        setQuest(q => ({ ...q, [field]: updated[field as keyof NarrativeQuestDto], updatedAt: updated.updatedAt }));
    };

    // --- Quest Type tags ---
    const handleAddTag = async (tag: string) => {
        const trimmed = tag.trim();
        if (!trimmed) return;
        const current = quest.questType ?? [];
        if (current.includes(trimmed)) return;
        const newTags = [...current, trimmed];
        try {
            const updated = await narrativeApi.updateQuest(token, event.id, quest.id, { questType: newTags });
            setQuest(q => ({ ...q, questType: updated.questType, updatedAt: updated.updatedAt }));
        } catch (err) {
            console.error(err);
            toast.error(t("common.error"));
        }
    };

    const handleRemoveTag = async (tag: string) => {
        const current = quest.questType ?? [];
        const newTags = current.filter(t => t !== tag);
        try {
            const updated = await narrativeApi.updateQuest(token, event.id, quest.id, { questType: newTags.length > 0 ? newTags : [] });
            setQuest(q => ({ ...q, questType: updated.questType, updatedAt: updated.updatedAt }));
        } catch (err) {
            console.error(err);
            toast.error(t("common.error"));
        }
    };

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            handleAddTag(tagDraft);
            setTagDraft("");
        }
    };

    // --- Textarea blur save ---
    const handleTextareaBlur = async (field: string, value: string) => {
        const currentValue = quest[field as keyof NarrativeQuestDto] as string | null;
        if (value === (currentValue ?? "")) return;
        try {
            await handleSaveField(field, value);
            toast.success(t("quests.notifications.updated"));
        } catch (err) {
            console.error(err);
            toast.error(t("common.error"));
        }
    };

    const handleSaveShortDescription = async () => {
        if (shortDescriptionDraft.length > SHORT_DESCRIPTION_MAX_LENGTH) {
            toast.error(t("common.error"));
            return;
        }

        setIsSavingShortDescription(true);
        try {
            const updated = await narrativeApi.updateQuest(token, event.id, quest.id, {
                shortDescription: shortDescriptionDraft
            });
            setQuest(q => ({ ...q, shortDescription: updated.shortDescription, updatedAt: updated.updatedAt }));
            setShortDescriptionDraft(updated.shortDescription ?? "");
            setIsShortDescriptionEditing(false);
            toast.success(t("quests.notifications.updated"));
        } catch (error) {
            console.error(error);
            toast.error(t("common.error"));
        } finally {
            setIsSavingShortDescription(false);
        }
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

    // --- Props aggregation ---
    const propsItems = useMemo(() => {
        const itemIdSet = new Set<string>();
        // Quest-level items
        initialItemLinks.forEach(link => itemIdSet.add(link.itemId));
        // Step-level items
        stepItemLinks.forEach(link => itemIdSet.add(link.itemId));

        return Array.from(itemIdSet).map(itemId => {
            const item = allItems.find(i => i.id === itemId);
            return { id: itemId, name: item?.name ?? itemId };
        });
    }, [initialItemLinks, stepItemLinks, allItems]);

    // Step items changed callback
    const handleStepItemsChanged = (stepId: string, items: NarrativeQuestStepItemLinkDto[]) => {
        setStepItemLinks(prev => {
            const filtered = prev.filter(l => l.stepId !== stepId);
            return [...filtered, ...items];
        });
    };

    // --- Textarea field component ---
    const MetadataTextarea = ({ field, rows = 2 }: { field: string; rows?: number }) => {
        const fieldKey = field as keyof NarrativeQuestDto;
        const [localValue, setLocalValue] = useState((quest[fieldKey] as string | null) ?? "");

        return (
            <div className="space-y-1.5">
                <label className="text-sm font-medium">{t(`quests.fields.${field}.label`)}</label>
                <Textarea
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onBlur={() => handleTextareaBlur(field, localValue)}
                    placeholder={t(`quests.fields.${field}.placeholder`)}
                    rows={rows}
                    disabled={isReadOnly}
                    className="resize-none"
                />
            </div>
        );
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
                                <div className="mb-2">
                                    {isShortDescriptionEditing ? (
                                        <div className="space-y-2">
                                            <Input
                                                value={shortDescriptionDraft}
                                                onChange={(e) => setShortDescriptionDraft(e.target.value)}
                                                placeholder={t("common.shortSummaryPlaceholder")}
                                                maxLength={SHORT_DESCRIPTION_MAX_LENGTH}
                                                disabled={isSavingShortDescription}
                                            />
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-xs text-muted-foreground">
                                                    {shortDescriptionDraft.length}/{SHORT_DESCRIPTION_MAX_LENGTH}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setShortDescriptionDraft(quest.shortDescription ?? "");
                                                            setIsShortDescriptionEditing(false);
                                                        }}
                                                        disabled={isSavingShortDescription}
                                                    >
                                                        <X className="mr-2 h-4 w-4" />
                                                        {t("common.cancel")}
                                                    </Button>
                                                    <Button size="sm" onClick={handleSaveShortDescription} disabled={isSavingShortDescription}>
                                                        {isSavingShortDescription ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                                        {t("common.save")}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="text-sm text-muted-foreground">
                                                {quest.shortDescription || t("common.shortSummaryPlaceholder")}
                                            </p>
                                            {canWrite && !quest.deletedAt && quest.status !== "Locked" && (
                                                <Button size="sm" variant="outline" onClick={() => setIsShortDescriptionEditing(true)}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    {t("common.edit")}
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <span>Created {format(new Date(quest.createdAt), 'PPP')}</span>
                                </div>
                            </div>
                            <div className="flex shrink-0">
                                <NarrativeStatusBadge status={quest.status} className="text-sm px-3 py-1" />
                            </div>
                        </div>
                    </div>

                    {canWrite && (
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

                {/* Details tab: Metadata → Description → Internal Notes → Steps */}
                <TabsContent value="details" className="space-y-8 mt-4">
                    {/* Quest metadata form section */}
                    <div className="rounded-lg border bg-card p-6 space-y-5">
                        {/* Quest Type (tags) */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">{t("quests.fields.questType.label")}</label>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {(quest.questType ?? []).map((tag) => (
                                    <Badge key={tag} variant="secondary" className="flex items-center gap-1 pr-1">
                                        <span>{tag}</span>
                                        {!isReadOnly && (
                                            <button
                                                onClick={() => handleRemoveTag(tag)}
                                                className="ml-0.5 hover:text-destructive transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                    </Badge>
                                ))}
                            </div>
                            {!isReadOnly && (
                                <Input
                                    value={tagDraft}
                                    onChange={(e) => setTagDraft(e.target.value)}
                                    onKeyDown={handleTagKeyDown}
                                    placeholder={t("quests.fields.questType.placeholder")}
                                    className="max-w-sm"
                                />
                            )}
                        </div>

                        {/* Text fields in a grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <MetadataTextarea field="function" />
                            <MetadataTextarea field="questAssignment" />
                            <MetadataTextarea field="playerGoal" />
                            <MetadataTextarea field="playerMotivation" />
                            <MetadataTextarea field="expectedResults" />
                            <MetadataTextarea field="escalation" />
                        </div>

                        {/* Props (read-only aggregated items) */}
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                                <Package className="h-4 w-4" />
                                {t("quests.fields.props.label")}
                            </div>
                            {propsItems.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">{t("quests.fields.props.empty")}</p>
                            ) : (
                                <div className="flex flex-wrap gap-1.5">
                                    {propsItems.map((item) => (
                                        <Badge
                                            key={item.id}
                                            variant="outline"
                                            className="cursor-pointer hover:bg-accent"
                                            onClick={() => router.push(`/${locale}/narrative/${event.id}/items/${item.id}`)}
                                        >
                                            {item.name}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Description + Internal Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Description */}
                        <div className={`rounded-lg border bg-card p-6 ${canWrite ? "md:col-span-2" : "md:col-span-3"}`}>
                            <EditableRichText
                                title={t("quests.fields.description.label")}
                                initialHtml={quest.description || ""}
                                placeholder={t("quests.fields.description.placeholder")}
                                isReadOnly={!canWrite || !!quest.deletedAt}
                                onSave={(html) => handleSaveField("description", html)}
                            />
                        </div>

                        {/* Internal Notes (admin only) */}
                        {canWrite && (
                            <div className="md:col-span-1 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-6">
                                <EditableRichText
                                    title={t("quests.fields.internalNotes.label")}
                                    description={t("common.internalNotesHint")}
                                    variant="amber"
                                    initialHtml={quest.internalNotes || ""}
                                    placeholder={t("quests.fields.internalNotes.placeholder")}
                                    isReadOnly={!canWrite || !!quest.deletedAt}
                                    onSave={(html) => handleSaveField("internalNotes", html)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Quest Steps (moved below description) */}
                    <QuestStepsPanel
                        questId={quest.id}
                        eventId={event.id}
                        initialSteps={initialSteps}
                        canWrite={canWrite}
                        token={token}
                        allItems={allItems}
                        allLocations={allLocations}
                        onStepItemsChanged={handleStepItemsChanged}
                    />
                </TabsContent>

                <TabsContent value="links">
                    <QuestLinksPanel
                        questId={quest.id}
                        eventId={event.id}
                        initialCharacterLinks={initialCharacterLinks}
                        initialFactionLinks={initialFactionLinks}
                        initialItemLinks={initialItemLinks}
                        canWrite={canWrite}
                        token={token}
                    />
                </TabsContent>

                <TabsContent value="documents">
                    <QuestDocumentsPanel
                        questId={quest.id}
                        eventId={event.id}
                        initialDocuments={initialDocuments}
                        canWrite={canWrite}
                        token={token}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
