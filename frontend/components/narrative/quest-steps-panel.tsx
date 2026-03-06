"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { narrativeApi, NarrativeQuestStepDto } from "@/utils/narrative-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Pencil, GripVertical, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface QuestStepsPanelProps {
    eventId: string;
    questId: string;
    initialSteps: NarrativeQuestStepDto[];
    isOrgOrSysAdmin: boolean;
    token: string;
}

export function QuestStepsPanel({ eventId, questId, initialSteps, isOrgOrSysAdmin, token }: QuestStepsPanelProps) {
    const t = useTranslations("narrative");
    const [steps, setSteps] = useState<NarrativeQuestStepDto[]>(
        [...initialSteps].sort((a, b) => a.sortOrder - b.sortOrder)
    );

    // New step form
    const [addSummary, setAddSummary] = useState("");
    const [addNotes, setAddNotes] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    // Inline edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editSummary, setEditSummary] = useState("");
    const [editNotes, setEditNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);

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
            setAddSummary("");
            setAddNotes("");
            toast.success(t("quests.notifications.stepCreated"));
        } catch (err: any) {
            toast.error(err.message || t("documentsPanel.notifications.error"));
        } finally {
            setIsAdding(false);
        }
    };

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
        } catch (err: any) {
            toast.error(err.message || t("documentsPanel.notifications.error"));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (stepId: string) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.deleteQuestStep(token, eventId, questId, stepId);
            setSteps((prev) => prev.filter((s) => s.id !== stepId));
            toast.success(t("quests.notifications.stepDeleted"));
        } catch (err: any) {
            toast.error(err.message || t("documentsPanel.notifications.error"));
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold tracking-tight">{t("quests.steps.title")}</h2>

            {steps.length === 0 ? (
                <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
                    {t("quests.steps.empty")}
                </div>
            ) : (
                <div className="space-y-2">
                    {steps.map((step, idx) => (
                        <div key={step.id} className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                            <div className="flex items-center gap-2 pt-1 shrink-0 text-muted-foreground">
                                <GripVertical className="h-4 w-4" />
                                <span className="text-sm font-mono w-5 text-center">{idx + 1}</span>
                            </div>
                            {editingId === step.id ? (
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
                            {isOrgOrSysAdmin && editingId !== step.id && (
                                <div className="flex gap-1 shrink-0">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(step)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDelete(step.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {isOrgOrSysAdmin && (
                <div className="space-y-2 p-4 rounded-lg border bg-muted/30">
                    <p className="text-sm font-medium">{t("quests.steps.add")}</p>
                    <Input
                        value={addSummary}
                        onChange={(e) => setAddSummary(e.target.value)}
                        placeholder={t("quests.steps.fields.summary.placeholder")}
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    />
                    <Textarea
                        value={addNotes}
                        onChange={(e) => setAddNotes(e.target.value)}
                        placeholder={t("quests.steps.fields.notes.placeholder")}
                        rows={2}
                    />
                    <Button onClick={handleAdd} disabled={!addSummary.trim() || isAdding} size="sm">
                        {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        {t("quests.steps.add")}
                    </Button>
                </div>
            )}
        </div>
    );
}
