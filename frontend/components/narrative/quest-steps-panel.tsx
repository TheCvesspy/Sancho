"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { narrativeApi, NarrativeQuestStepDto, NarrativeQuestStepCharacterDto } from "@/utils/narrative-api";
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
import { Plus, Trash2, Pencil, GripVertical, Check, X, Loader2, UserPlus, Users, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

interface QuestStepsPanelProps {
    eventId: string;
    questId: string;
    initialSteps: NarrativeQuestStepDto[];
    canWrite: boolean;
    token: string;
}

export function QuestStepsPanel({ eventId, questId, initialSteps, canWrite, token }: QuestStepsPanelProps) {
    const t = useTranslations("narrative");
    const fallbackErrorMessage = t("documentsPanel.notifications.error");

    const [steps, setSteps] = useState<NarrativeQuestStepDto[]>(
        [...initialSteps].sort((a, b) => a.sortOrder - b.sortOrder)
    );

    // Step characters: stepId → list of character DTOs
    const [stepCharacters, setStepCharacters] = useState<Record<string, NarrativeQuestStepCharacterDto[]>>({});

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

    // Per-step character adding
    const [addingCharForStep, setAddingCharForStep] = useState<string | null>(null);
    const [charPickerOpen, setCharPickerOpen] = useState(false);
    const [charSearch, setCharSearch] = useState("");
    const [debouncedCharSearch, setDebouncedCharSearch] = useState("");
    const [isFilteringChars, setIsFilteringChars] = useState(false);
    const [isSavingChar, setIsSavingChar] = useState(false);

    useEffect(() => {
        if (!addingCharForStep) return;
        setIsFilteringChars(true);
        const timeout = setTimeout(() => {
            setDebouncedCharSearch(charSearch.trim().toLowerCase());
            setIsFilteringChars(false);
        }, 300);

        return () => clearTimeout(timeout);
    }, [addingCharForStep, charSearch]);

    // Load characters + existing step-character links on mount
    useEffect(() => {
        const load = async () => {
            try {
                const chars = await charactersApi.listCharacters(token, eventId);
                setAllCharacters(chars);
            } catch (e) { console.error(e); }

            // Load step characters for all initial steps
            const entries = await Promise.all(
                initialSteps.map(async (step) => {
                    try {
                        const links = await narrativeApi.listQuestStepCharacters(token, eventId, questId, step.id);
                        return [step.id, links] as [string, NarrativeQuestStepCharacterDto[]];
                    } catch {
                        return [step.id, []] as [string, NarrativeQuestStepCharacterDto[]];
                    }
                })
            );
            setStepCharacters(Object.fromEntries(entries));
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
            setStepCharacters((prev) => {
                const next = { ...prev };
                delete next[stepId];
                return next;
            });
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

    const charNameById = (id: string) =>
        allCharacters.find((c) => c.id === id)?.name ?? id;

    const getErrorMessage = (error: unknown) =>
        error instanceof Error ? error.message : fallbackErrorMessage;

    const getFilteredAvailableCharacters = (availableCharacters: CharacterListItemDto[]) => {
        if (!debouncedCharSearch) return availableCharacters;
        return availableCharacters.filter((character) =>
            character.name.toLowerCase().includes(debouncedCharSearch)
        );
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
                        const filteredAvailableChars = getFilteredAvailableCharacters(availableChars);
                        const isEditingThis = editingId === step.id;

                        return (
                            <div key={step.id} className="rounded-lg border bg-card overflow-hidden">
                                {/* Step summary row */}
                                <div className="flex items-start gap-3 p-4">
                                    <div className="flex items-center gap-2 pt-1 shrink-0 text-muted-foreground select-none">
                                        <GripVertical className="h-4 w-4" />
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
                                        <div className="flex-1">
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

                                {/* Involved characters section */}
                                <div className="border-t px-4 py-3 bg-muted/20 space-y-2">
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
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
