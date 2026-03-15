"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
    narrativeApi,
    NarrativeQuestStepDto,
    NarrativeQuestStepCharacterDto,
    NarrativeQuestStepItemLinkDto,
    NarrativeQuestStepLocationDto,
    NarrativeItemDto,
    NarrativeLocationDto,
    NarrativeDungeonFloorDto,
    NarrativeDungeonRoomDto,
    UpsertQuestStepItemRequest,
} from "@/utils/narrative-api";
import { CharacterListItemDto, charactersApi } from "@/utils/characters-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Pencil, GripVertical, Check, X, Loader2, UserPlus, Users, ChevronsUpDown, Package, MapPin, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { toast } from "sonner";

interface QuestStepsPanelProps {
    eventId: string;
    questId: string;
    initialSteps: NarrativeQuestStepDto[];
    canWrite: boolean;
    token: string;
    allItems: NarrativeItemDto[];
    allLocations: NarrativeLocationDto[];
    onStepItemsChanged?: (stepId: string, items: NarrativeQuestStepItemLinkDto[]) => void;
}

export function QuestStepsPanel({ eventId, questId, initialSteps, canWrite, token, allItems, allLocations, onStepItemsChanged }: QuestStepsPanelProps) {
    const t = useTranslations("narrative");
    const fallbackErrorMessage = t("documentsPanel.notifications.error");

    const [steps, setSteps] = useState<NarrativeQuestStepDto[]>(
        [...initialSteps].sort((a, b) => a.sortOrder - b.sortOrder)
    );

    // Step characters: stepId → list of character DTOs
    const [stepCharacters, setStepCharacters] = useState<Record<string, NarrativeQuestStepCharacterDto[]>>({});

    // Step items: stepId → list of item link DTOs
    const [stepItems, setStepItems] = useState<Record<string, NarrativeQuestStepItemLinkDto[]>>({});

    // Step locations: stepId → list of location DTOs
    const [stepLocations, setStepLocations] = useState<Record<string, NarrativeQuestStepLocationDto[]>>({});

    // All event characters for the selector
    const [allCharacters, setAllCharacters] = useState<CharacterListItemDto[]>([]);

    // Add Step modal state
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [addSummary, setAddSummary] = useState("");
    const [addNotes, setAddNotes] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    // Inline edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editSummary, setEditSummary] = useState("");
    const [editNotes, setEditNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Collapsed state per step
    const [collapsedSteps, setCollapsedSteps] = useState<Set<string>>(new Set());
    const toggleStep = (stepId: string) => {
        setCollapsedSteps((prev) => {
            const next = new Set(prev);
            if (next.has(stepId)) next.delete(stepId);
            else next.add(stepId);
            return next;
        });
    };

    // Per-step character adding
    const [addingCharForStep, setAddingCharForStep] = useState<string | null>(null);
    const [charPickerOpen, setCharPickerOpen] = useState(false);
    const [charSearch, setCharSearch] = useState("");
    const [debouncedCharSearch, setDebouncedCharSearch] = useState("");
    const [isFilteringChars, setIsFilteringChars] = useState(false);
    const [isSavingChar, setIsSavingChar] = useState(false);

    // Per-step item adding
    const [addingItemForStep, setAddingItemForStep] = useState<string | null>(null);
    const [itemPickerOpen, setItemPickerOpen] = useState(false);
    const [itemSearch, setItemSearch] = useState("");
    const [debouncedItemSearch, setDebouncedItemSearch] = useState("");
    const [isFilteringItems, setIsFilteringItems] = useState(false);
    const [isSavingItem, setIsSavingItem] = useState(false);
    const [itemLinkType, setItemLinkType] = useState<"required" | "loot">("required");

    // Per-step location adding
    const [addingLocForStep, setAddingLocForStep] = useState<string | null>(null);
    const [locPickerOpen, setLocPickerOpen] = useState(false);
    const [locSearch, setLocSearch] = useState("");
    const [debouncedLocSearch, setDebouncedLocSearch] = useState("");
    const [isFilteringLocs, setIsFilteringLocs] = useState(false);
    const [isSavingLoc, setIsSavingLoc] = useState(false);

    // Dungeon modal state
    const [dungeonModalOpen, setDungeonModalOpen] = useState(false);
    const [dungeonModalStepId, setDungeonModalStepId] = useState("");
    const [dungeonModalLocationId, setDungeonModalLocationId] = useState("");
    const [dungeonModalFloors, setDungeonModalFloors] = useState<NarrativeDungeonFloorDto[]>([]);
    const [dungeonModalRooms, setDungeonModalRooms] = useState<NarrativeDungeonRoomDto[]>([]);
    const [dungeonSelectedFloor, setDungeonSelectedFloor] = useState("");
    const [dungeonSelectedRoom, setDungeonSelectedRoom] = useState("");
    const [dungeonLoadingFloors, setDungeonLoadingFloors] = useState(false);
    const [dungeonLoadingRooms, setDungeonLoadingRooms] = useState(false);

    // Debounce for character search
    useEffect(() => {
        if (!addingCharForStep) return;
        setIsFilteringChars(true);
        const timeout = setTimeout(() => {
            setDebouncedCharSearch(charSearch.trim().toLowerCase());
            setIsFilteringChars(false);
        }, 300);
        return () => clearTimeout(timeout);
    }, [addingCharForStep, charSearch]);

    // Debounce for item search
    useEffect(() => {
        if (!addingItemForStep) return;
        setIsFilteringItems(true);
        const timeout = setTimeout(() => {
            setDebouncedItemSearch(itemSearch.trim().toLowerCase());
            setIsFilteringItems(false);
        }, 300);
        return () => clearTimeout(timeout);
    }, [addingItemForStep, itemSearch]);

    // Debounce for location search
    useEffect(() => {
        if (!addingLocForStep) return;
        setIsFilteringLocs(true);
        const timeout = setTimeout(() => {
            setDebouncedLocSearch(locSearch.trim().toLowerCase());
            setIsFilteringLocs(false);
        }, 300);
        return () => clearTimeout(timeout);
    }, [addingLocForStep, locSearch]);

    // Load characters + existing step links on mount
    useEffect(() => {
        const load = async () => {
            try {
                const chars = await charactersApi.listCharacters(token, eventId);
                setAllCharacters(chars);
            } catch (e) { console.error(e); }

            // Load step characters, items, locations for all initial steps
            const [charEntries, itemEntries, locEntries] = await Promise.all([
                Promise.all(
                    initialSteps.map(async (step) => {
                        try {
                            const links = await narrativeApi.listQuestStepCharacters(token, eventId, questId, step.id);
                            return [step.id, links] as [string, NarrativeQuestStepCharacterDto[]];
                        } catch {
                            return [step.id, []] as [string, NarrativeQuestStepCharacterDto[]];
                        }
                    })
                ),
                Promise.all(
                    initialSteps.map(async (step) => {
                        try {
                            const links = await narrativeApi.listQuestStepItems(token, eventId, questId, step.id);
                            return [step.id, links] as [string, NarrativeQuestStepItemLinkDto[]];
                        } catch {
                            return [step.id, []] as [string, NarrativeQuestStepItemLinkDto[]];
                        }
                    })
                ),
                Promise.all(
                    initialSteps.map(async (step) => {
                        try {
                            const links = await narrativeApi.listQuestStepLocations(token, eventId, questId, step.id);
                            return [step.id, links] as [string, NarrativeQuestStepLocationDto[]];
                        } catch {
                            return [step.id, []] as [string, NarrativeQuestStepLocationDto[]];
                        }
                    })
                ),
            ]);

            setStepCharacters(Object.fromEntries(charEntries));
            setStepItems(Object.fromEntries(itemEntries));
            setStepLocations(Object.fromEntries(locEntries));
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId, questId, token]);

    // --- Add Step (modal) ---
    const handleAdd = async () => {
        if (!addSummary.trim()) return;
        setIsAdding(true);
        try {
            const created = await narrativeApi.createQuestStep(token, eventId, questId, {
                sortOrder: steps.length + 1,
                summary: addSummary.trim(),
                notes: addNotes.trim() || null,
            });
            setSteps((prev) => [...prev, created]);
            setStepCharacters((prev) => ({ ...prev, [created.id]: [] }));
            setStepItems((prev) => ({ ...prev, [created.id]: [] }));
            setStepLocations((prev) => ({ ...prev, [created.id]: [] }));
            setAddSummary("");
            setAddNotes("");
            setAddDialogOpen(false);
            toast.success(t("quests.notifications.stepCreated"));
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        } finally {
            setIsAdding(false);
        }
    };

    // --- Inline edit ---
    const startEdit = (step: NarrativeQuestStepDto) => {
        setEditingId(step.id);
        setEditSummary(step.summary);
        setEditNotes(step.notes || "");
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditSummary("");
        setEditNotes("");
    };

    const saveEdit = async (step: NarrativeQuestStepDto) => {
        if (!editSummary.trim()) return;
        setIsSaving(true);
        try {
            const updated = await narrativeApi.updateQuestStep(token, eventId, questId, step.id, {
                summary: editSummary.trim(),
                notes: editNotes.trim() || null,
            });
            setSteps((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
            toast.success(t("quests.notifications.stepUpdated"));
            cancelEdit();
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteStep = async (stepId: string) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.deleteQuestStep(token, eventId, questId, stepId);
            setSteps((prev) => prev.filter((s) => s.id !== stepId));
            setStepCharacters((prev) => { const next = { ...prev }; delete next[stepId]; return next; });
            setStepItems((prev) => { const next = { ...prev }; delete next[stepId]; return next; });
            setStepLocations((prev) => { const next = { ...prev }; delete next[stepId]; return next; });
            toast.success(t("quests.notifications.stepDeleted"));
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        }
    };

    // --- Step characters ---
    const handleAddCharToStep = async (stepId: string, characterId: string) => {
        setIsSavingChar(true);
        try {
            const link = await narrativeApi.upsertQuestStepCharacter(token, eventId, questId, stepId, characterId);
            setStepCharacters((prev) => ({
                ...prev,
                [stepId]: [...(prev[stepId] ?? []).filter((l) => l.characterId !== characterId), link],
            }));
            setCharSearch("");
            setDebouncedCharSearch("");
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        } finally {
            setIsSavingChar(false);
        }
    };

    const handleRemoveCharFromStep = async (stepId: string, characterId: string) => {
        try {
            await narrativeApi.deleteQuestStepCharacter(token, eventId, questId, stepId, characterId);
            setStepCharacters((prev) => ({
                ...prev,
                [stepId]: (prev[stepId] ?? []).filter((l) => l.characterId !== characterId),
            }));
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        }
    };

    // --- Step items ---
    const handleAddItemToStep = async (stepId: string, itemId: string) => {
        setIsSavingItem(true);
        try {
            const data: UpsertQuestStepItemRequest = { linkType: itemLinkType };
            const link = await narrativeApi.upsertQuestStepItem(token, eventId, questId, stepId, itemId, data);
            const newItems = [...(stepItems[stepId] ?? []).filter((l) => l.itemId !== itemId), link];
            setStepItems((prev) => ({ ...prev, [stepId]: newItems }));
            onStepItemsChanged?.(stepId, newItems);
            setItemSearch("");
            setDebouncedItemSearch("");
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        } finally {
            setIsSavingItem(false);
        }
    };

    const handleRemoveItemFromStep = async (stepId: string, itemId: string, linkType?: string) => {
        try {
            await narrativeApi.deleteQuestStepItem(token, eventId, questId, stepId, itemId, linkType);
            const newItems = (stepItems[stepId] ?? []).filter((l) => l.itemId !== itemId);
            setStepItems((prev) => ({ ...prev, [stepId]: newItems }));
            onStepItemsChanged?.(stepId, newItems);
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        }
    };

    // --- Step locations ---
    const handleAddLocToStep = async (stepId: string, locationId: string) => {
        const loc = allLocations.find(l => l.id === locationId);
        if (loc?.locationType === "Dungeon") {
            // Open modal for dungeon location
            setDungeonModalStepId(stepId);
            setDungeonModalLocationId(locationId);
            setDungeonSelectedFloor("");
            setDungeonSelectedRoom("");
            setDungeonModalRooms([]);
            setDungeonModalOpen(true);
            setDungeonLoadingFloors(true);
            try {
                const floors = await narrativeApi.listFloors(token, eventId, locationId);
                setDungeonModalFloors(floors);
            } catch (e) { console.error(e); }
            finally { setDungeonLoadingFloors(false); }
            return;
        }
        // Direct add for basic locations
        setIsSavingLoc(true);
        try {
            const link = await narrativeApi.upsertQuestStepLocation(token, eventId, questId, stepId, locationId);
            setStepLocations((prev) => ({
                ...prev,
                [stepId]: [...(prev[stepId] ?? []).filter((l) => l.locationId !== locationId), link],
            }));
            setLocSearch("");
            setDebouncedLocSearch("");
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        } finally {
            setIsSavingLoc(false);
        }
    };

    const handleDungeonFloorChange = async (floorId: string) => {
        setDungeonSelectedFloor(floorId);
        setDungeonSelectedRoom("");
        setDungeonModalRooms([]);
        if (!floorId) return;
        setDungeonLoadingRooms(true);
        try {
            const rooms = await narrativeApi.listRooms(token, eventId, dungeonModalLocationId, floorId);
            setDungeonModalRooms(rooms);
        } catch (e) { console.error(e); }
        finally { setDungeonLoadingRooms(false); }
    };

    const handleAddLocFromDungeonModal = async () => {
        if (!dungeonModalLocationId || !dungeonModalStepId) return;
        setIsSavingLoc(true);
        try {
            const data: { floorId?: string | null; roomId?: string | null } = {};
            if (dungeonSelectedFloor) data.floorId = dungeonSelectedFloor;
            if (dungeonSelectedRoom) data.roomId = dungeonSelectedRoom;
            const link = await narrativeApi.upsertQuestStepLocation(token, eventId, questId, dungeonModalStepId, dungeonModalLocationId, data);
            setStepLocations((prev) => ({
                ...prev,
                [dungeonModalStepId]: [...(prev[dungeonModalStepId] ?? []), link],
            }));
            setDungeonModalOpen(false);
            setLocSearch("");
            setDebouncedLocSearch("");
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        } finally {
            setIsSavingLoc(false);
        }
    };

    const handleRemoveLocFromStep = async (stepId: string, link: NarrativeQuestStepLocationDto) => {
        try {
            await narrativeApi.deleteQuestStepLocation(token, eventId, questId, stepId, link.locationId, {
                floorId: link.floorId,
                roomId: link.roomId,
            });
            setStepLocations((prev) => ({
                ...prev,
                [stepId]: (prev[stepId] ?? []).filter((l) => !(l.locationId === link.locationId && l.floorId === link.floorId && l.roomId === link.roomId)),
            }));
        } catch (err: unknown) {
            toast.error(getErrorMessage(err));
        }
    };

    const formatStepLocationGranularity = (link: NarrativeQuestStepLocationDto) => {
        if (link.roomId && link.floorName && link.roomName) return `${link.floorName} > ${link.roomName}`;
        if (link.floorId && link.floorName) return link.floorName;
        return null; // no badge needed for entire location
    };

    // --- Helpers ---
    const charNameById = (id: string) =>
        allCharacters.find((c) => c.id === id)?.name ?? id;

    const itemNameById = (id: string) =>
        allItems.find((i) => i.id === id)?.name ?? id;

    const locationNameById = (id: string) =>
        allLocations.find((l) => l.id === id)?.name ?? id;

    const getErrorMessage = (error: unknown) =>
        error instanceof Error ? error.message : fallbackErrorMessage;

    const getFilteredList = <T extends { name: string }>(items: T[], search: string): T[] => {
        if (!search) return items;
        return items.filter((item) => item.name.toLowerCase().includes(search));
    };

    return (
        <div className="space-y-4">
            {/* Section header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">{t("quests.steps.title")}</h2>
                {canWrite && (
                    <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                                <Plus className="h-4 w-4 mr-1.5" />
                                {t("quests.steps.add")}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[480px]">
                            <DialogHeader>
                                <DialogTitle>{t("quests.steps.addDialog.title")}</DialogTitle>
                                <DialogDescription>{t("quests.steps.addDialog.description")}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 py-2">
                                <Input
                                    value={addSummary}
                                    onChange={(e) => setAddSummary(e.target.value)}
                                    placeholder={t("quests.steps.fields.summary.placeholder")}
                                    autoFocus
                                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                                />
                                <Textarea
                                    value={addNotes}
                                    onChange={(e) => setAddNotes(e.target.value)}
                                    placeholder={t("quests.steps.fields.notes.placeholder")}
                                    rows={3}
                                />
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={isAdding}>
                                    {t("common.cancel")}
                                </Button>
                                <Button onClick={handleAdd} disabled={!addSummary.trim() || isAdding}>
                                    {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                    {t("quests.steps.addDialog.submit")}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Steps list */}
            {steps.length === 0 ? (
                <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground text-sm">
                    {t("quests.steps.empty")}
                </div>
            ) : (
                <div className="space-y-3">
                    {steps.map((step, idx) => {
                        const stepChars = stepCharacters[step.id] ?? [];
                        const assignedCharIds = new Set(stepChars.map((l) => l.characterId));
                        const availableChars = allCharacters.filter((c) => !assignedCharIds.has(c.id));
                        const filteredAvailableChars = getFilteredList(availableChars, debouncedCharSearch);

                        const stepItms = stepItems[step.id] ?? [];
                        const assignedItemIds = new Set(stepItms.map((l) => l.itemId));
                        const availableItems = allItems.filter((i) => !assignedItemIds.has(i.id));
                        const filteredAvailableItems = getFilteredList(availableItems, debouncedItemSearch);

                        const stepLocs = stepLocations[step.id] ?? [];
                        const assignedBasicLocIds = new Set(stepLocs.filter(l => !l.floorId && !l.roomId).map((l) => l.locationId));
                        const availableLocs = allLocations.filter((l) => l.locationType === "Dungeon" || !assignedBasicLocIds.has(l.id));
                        const filteredAvailableLocs = getFilteredList(availableLocs, debouncedLocSearch);

                        const isEditingThis = editingId === step.id;

                        const isCollapsed = collapsedSteps.has(step.id);

                        return (
                            <Collapsible key={step.id} open={!isCollapsed} onOpenChange={() => toggleStep(step.id)}>
                            <div className="rounded-lg border bg-card overflow-hidden">
                                {/* Step summary row */}
                                <div className="flex items-start gap-3 p-4">
                                    <div className="flex items-center gap-2 pt-1 shrink-0 text-muted-foreground select-none">
                                        <CollapsibleTrigger asChild>
                                            <button className="hover:text-foreground transition-colors">
                                                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </button>
                                        </CollapsibleTrigger>
                                        <span className="text-sm font-mono w-5 text-center">{idx + 1}</span>
                                    </div>

                                    {isEditingThis ? (
                                        <div className="flex-1 space-y-2">
                                            <Input
                                                value={editSummary}
                                                onChange={(e) => setEditSummary(e.target.value)}
                                                placeholder={t("quests.steps.fields.summary.placeholder")}
                                                autoFocus
                                            />
                                            <Textarea
                                                value={editNotes}
                                                onChange={(e) => setEditNotes(e.target.value)}
                                                placeholder={t("quests.steps.fields.notes.placeholder")}
                                                rows={2}
                                            />
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={() => saveEdit(step)} disabled={isSaving}>
                                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={cancelEdit}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium">{step.summary}</p>
                                            {step.notes && <p className="text-sm text-muted-foreground mt-1">{step.notes}</p>}
                                        </div>
                                    )}

                                    {canWrite && !isEditingThis && (
                                        <div className="flex gap-1 shrink-0">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(step)}>
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDeleteStep(step.id)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Collapsible subsections: Characters | Items | Locations in columns */}
                                <CollapsibleContent>
                                <div className="border-t bg-muted/20 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">

                                {/* Involved characters column */}
                                <div className="px-4 py-3 space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        <Users className="h-3.5 w-3.5" />
                                        {t("quests.steps.characters.title")}
                                    </div>

                                    {stepChars.length === 0 && addingCharForStep !== step.id ? (
                                        <p className="text-xs text-muted-foreground italic">{t("quests.steps.characters.empty")}</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-1.5">
                                            {stepChars.map((link) => (
                                                <Badge key={link.characterId} variant="secondary" className="flex items-center gap-1 pr-1">
                                                    <span>{charNameById(link.characterId)}</span>
                                                    {canWrite && (
                                                        <button
                                                            onClick={() => handleRemoveCharFromStep(step.id, link.characterId)}
                                                            className="ml-0.5 hover:text-destructive transition-colors"
                                                            aria-label={t("quests.steps.characters.remove")}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}

                                    {/* Admin: add character selector */}
                                    {canWrite && (
                                        <>
                                            {addingCharForStep === step.id ? (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Popover open={charPickerOpen} onOpenChange={setCharPickerOpen}>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                role="combobox"
                                                                aria-expanded={charPickerOpen}
                                                                className="h-8 text-sm w-full sm:w-[260px] justify-between"
                                                            >
                                                                {t("quests.steps.characters.add")}
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[320px] p-0" align="start">
                                                            <Command shouldFilter={false}>
                                                                <CommandInput
                                                                    value={charSearch}
                                                                    onValueChange={setCharSearch}
                                                                    placeholder={t("common.search")}
                                                                />
                                                                <CommandList>
                                                                    {isFilteringChars ? (
                                                                        <div className="py-6 text-center text-sm text-muted-foreground">
                                                                            {t("common.loading")}
                                                                        </div>
                                                                    ) : (
                                                                        <CommandEmpty>{t("common.noResults")}</CommandEmpty>
                                                                    )}
                                                                    <CommandGroup>
                                                                        {filteredAvailableChars.map((character) => (
                                                                            <CommandItem
                                                                                key={character.id}
                                                                                value={character.name}
                                                                                onSelect={() => handleAddCharToStep(step.id, character.id)}
                                                                                disabled={isSavingChar}
                                                                            >
                                                                                {character.name}
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8"
                                                        onClick={() => {
                                                            setAddingCharForStep(null);
                                                            setCharPickerOpen(false);
                                                            setCharSearch("");
                                                            setDebouncedCharSearch("");
                                                        }}
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
                                                    onClick={() => {
                                                        setAddingCharForStep(step.id);
                                                        setCharPickerOpen(true);
                                                        setCharSearch("");
                                                        setDebouncedCharSearch("");
                                                    }}
                                                >
                                                    <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                                                    {t("quests.steps.characters.add")}
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Linked items column */}
                                <div className="px-4 py-3 space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        <Package className="h-3.5 w-3.5" />
                                        {t("quests.steps.items.required")} / {t("quests.steps.items.loot")}
                                    </div>

                                    {stepItms.length === 0 && addingItemForStep !== step.id ? (
                                        <p className="text-xs text-muted-foreground italic">{t("quests.steps.locations.empty").replace("locations", "items")}</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-1.5">
                                            {stepItms.map((link) => (
                                                <Badge key={`${link.itemId}-${link.linkType}`} variant="secondary" className="flex items-center gap-1 pr-1">
                                                    <span>{itemNameById(link.itemId)}</span>
                                                    <span className="text-xs text-muted-foreground">({link.linkType})</span>
                                                    {canWrite && (
                                                        <button
                                                            onClick={() => handleRemoveItemFromStep(step.id, link.itemId, link.linkType)}
                                                            className="ml-0.5 hover:text-destructive transition-colors"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}

                                    {canWrite && (
                                        <>
                                            {addingItemForStep === step.id ? (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Select value={itemLinkType} onValueChange={(v) => setItemLinkType(v as "required" | "loot")}>
                                                        <SelectTrigger className="h-8 w-[120px] text-sm">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="required">{t("quests.steps.items.required")}</SelectItem>
                                                            <SelectItem value="loot">{t("quests.steps.items.loot")}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Popover open={itemPickerOpen} onOpenChange={setItemPickerOpen}>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                role="combobox"
                                                                aria-expanded={itemPickerOpen}
                                                                className="h-8 text-sm w-full sm:w-[260px] justify-between"
                                                            >
                                                                {t("quests.links.items")}
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[320px] p-0" align="start">
                                                            <Command shouldFilter={false}>
                                                                <CommandInput
                                                                    value={itemSearch}
                                                                    onValueChange={setItemSearch}
                                                                    placeholder={t("common.search")}
                                                                />
                                                                <CommandList>
                                                                    {isFilteringItems ? (
                                                                        <div className="py-6 text-center text-sm text-muted-foreground">
                                                                            {t("common.loading")}
                                                                        </div>
                                                                    ) : (
                                                                        <CommandEmpty>{t("common.noResults")}</CommandEmpty>
                                                                    )}
                                                                    <CommandGroup>
                                                                        {filteredAvailableItems.map((item) => (
                                                                            <CommandItem
                                                                                key={item.id}
                                                                                value={item.name}
                                                                                onSelect={() => handleAddItemToStep(step.id, item.id)}
                                                                                disabled={isSavingItem}
                                                                            >
                                                                                {item.name}
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8"
                                                        onClick={() => {
                                                            setAddingItemForStep(null);
                                                            setItemPickerOpen(false);
                                                            setItemSearch("");
                                                            setDebouncedItemSearch("");
                                                        }}
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
                                                    onClick={() => {
                                                        setAddingItemForStep(step.id);
                                                        setItemPickerOpen(true);
                                                        setItemSearch("");
                                                        setDebouncedItemSearch("");
                                                    }}
                                                >
                                                    <Package className="h-3.5 w-3.5 mr-1.5" />
                                                    {t("quests.links.items")}
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Linked locations column */}
                                <div className="px-4 py-3 space-y-2">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {t("quests.steps.locations.title")}
                                    </div>

                                    {stepLocs.length === 0 && addingLocForStep !== step.id ? (
                                        <p className="text-xs text-muted-foreground italic">{t("quests.steps.locations.empty")}</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-1.5">
                                            {stepLocs.map((link, idx) => {
                                                const granularity = formatStepLocationGranularity(link);
                                                return (
                                                    <Badge key={`${link.locationId}-${link.floorId}-${link.roomId}-${idx}`} variant="secondary" className="flex items-center gap-1 pr-1">
                                                        <span>{link.locationName ?? locationNameById(link.locationId)}</span>
                                                        {granularity && (
                                                            <span className="text-[10px] text-muted-foreground">({granularity})</span>
                                                        )}
                                                        {canWrite && (
                                                            <button
                                                                onClick={() => handleRemoveLocFromStep(step.id, link)}
                                                                className="ml-0.5 hover:text-destructive transition-colors"
                                                                aria-label={t("quests.steps.locations.remove")}
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {canWrite && (
                                        <>
                                            {addingLocForStep === step.id ? (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Popover open={locPickerOpen} onOpenChange={setLocPickerOpen}>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                role="combobox"
                                                                aria-expanded={locPickerOpen}
                                                                className="h-8 text-sm w-full sm:w-[260px] justify-between"
                                                            >
                                                                {t("quests.steps.locations.add")}
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[320px] p-0" align="start">
                                                            <Command shouldFilter={false}>
                                                                <CommandInput
                                                                    value={locSearch}
                                                                    onValueChange={setLocSearch}
                                                                    placeholder={t("common.search")}
                                                                />
                                                                <CommandList>
                                                                    {isFilteringLocs ? (
                                                                        <div className="py-6 text-center text-sm text-muted-foreground">
                                                                            {t("common.loading")}
                                                                        </div>
                                                                    ) : (
                                                                        <CommandEmpty>{t("common.noResults")}</CommandEmpty>
                                                                    )}
                                                                    <CommandGroup>
                                                                        {filteredAvailableLocs.map((loc) => (
                                                                            <CommandItem
                                                                                key={loc.id}
                                                                                value={loc.name}
                                                                                onSelect={() => handleAddLocToStep(step.id, loc.id)}
                                                                                disabled={isSavingLoc}
                                                                            >
                                                                                {loc.name}{loc.locationType === "Dungeon" ? " (Dungeon)" : ""}
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8"
                                                        onClick={() => {
                                                            setAddingLocForStep(null);
                                                            setLocPickerOpen(false);
                                                            setLocSearch("");
                                                            setDebouncedLocSearch("");
                                                        }}
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
                                                    onClick={() => {
                                                        setAddingLocForStep(step.id);
                                                        setLocPickerOpen(true);
                                                        setLocSearch("");
                                                        setDebouncedLocSearch("");
                                                    }}
                                                >
                                                    <MapPin className="h-3.5 w-3.5 mr-1.5" />
                                                    {t("quests.steps.locations.add")}
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                                </div>{/* end grid */}
                                </CollapsibleContent>
                            </div>
                            </Collapsible>
                        );
                    })}
                </div>
            )}

            {/* Dungeon Location Modal */}
            <Dialog open={dungeonModalOpen} onOpenChange={setDungeonModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("locations.dungeon.modal.title")}</DialogTitle>
                        <DialogDescription>
                            {t("locations.dungeon.modal.description", { name: allLocations.find(l => l.id === dungeonModalLocationId)?.name ?? "" })}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">{t("locations.links.granularity.floor")}</label>
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                value={dungeonSelectedFloor}
                                onChange={(e) => handleDungeonFloorChange(e.target.value)}
                                disabled={dungeonLoadingFloors}
                            >
                                <option value="">
                                    {dungeonLoadingFloors ? t("common.loading") : t("locations.dungeon.selectFloor")}
                                </option>
                                {dungeonModalFloors.map((f) => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                            </select>
                        </div>

                        {dungeonSelectedFloor && (
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">{t("locations.links.granularity.room")}</label>
                                <select
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    value={dungeonSelectedRoom}
                                    onChange={(e) => setDungeonSelectedRoom(e.target.value)}
                                    disabled={dungeonLoadingRooms}
                                >
                                    <option value="">
                                        {dungeonLoadingRooms ? t("common.loading") : t("locations.dungeon.selectRoom")}
                                    </option>
                                    {dungeonModalRooms.map((r) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="rounded-md bg-muted/50 p-3 text-sm">
                            <span className="text-muted-foreground">{t("locations.dungeon.modal.linkingAs")}: </span>
                            <span className="font-medium">
                                {dungeonSelectedRoom
                                    ? `${dungeonModalFloors.find(f => f.id === dungeonSelectedFloor)?.name} > ${dungeonModalRooms.find(r => r.id === dungeonSelectedRoom)?.name}`
                                    : dungeonSelectedFloor
                                        ? dungeonModalFloors.find(f => f.id === dungeonSelectedFloor)?.name
                                        : t("locations.links.granularity.entireLocation")}
                            </span>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDungeonModalOpen(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={handleAddLocFromDungeonModal} disabled={isSavingLoc}>
                            {isSavingLoc ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {t("locations.dungeon.modal.addLink")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
