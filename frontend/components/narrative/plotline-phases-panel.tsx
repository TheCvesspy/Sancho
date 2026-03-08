"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
    narrativeApi,
    NarrativePlotlineDto,
    NarrativePlotlinePhaseDto,
    NarrativePlotlineQuestLinkDto,
    NarrativeQuestDto,
} from "@/utils/narrative-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Pencil, Check, X, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PlotlinePhasesProps {
    eventId: string;
    plotline: NarrativePlotlineDto;
    initialPhases: NarrativePlotlinePhaseDto[];
    initialQuestLinks: NarrativePlotlineQuestLinkDto[];
    canWrite: boolean;
    token: string;
}

export function PlotlinePhasesPanel({ eventId, plotline, initialPhases, initialQuestLinks, canWrite, token }: PlotlinePhasesProps) {
    const t = useTranslations("narrative");
    const [phases, setPhases] = useState<NarrativePlotlinePhaseDto[]>(
        [...initialPhases].sort((a, b) => a.sortOrder - b.sortOrder)
    );
    const [questLinks, setQuestLinks] = useState<NarrativePlotlineQuestLinkDto[]>(initialQuestLinks);

    // All quests for event
    const [allQuests, setAllQuests] = useState<NarrativeQuestDto[]>([]);
    useEffect(() => {
        narrativeApi.listQuests(token, eventId).then(setAllQuests).catch(console.error);
    }, [eventId, token]);

    // Add phase form
    const [phaseTitle, setPhaseTitle] = useState("");
    const [phaseSummary, setPhaseSummary] = useState("");
    const [addingPhase, setAddingPhase] = useState(false);

    // Edit phase
    const [editPhaseId, setEditPhaseId] = useState<string | null>(null);
    const [editPhaseTitle, setEditPhaseTitle] = useState("");
    const [editPhaseSummary, setEditPhaseSummary] = useState("");
    const [savingPhase, setSavingPhase] = useState(false);

    // Add quest to phase
    const [addQuestPhaseId, setAddQuestPhaseId] = useState<string | null>(null);
    const [selectedQuestId, setSelectedQuestId] = useState("");
    const [savingQuest, setSavingQuest] = useState(false);

    // ── Phase CRUD ────────────────────────────────────────────────────────────

    const addPhase = async () => {
        if (!phaseTitle.trim()) return;
        setAddingPhase(true);
        try {
            const created = await narrativeApi.createPlotlinePhase(token, eventId, plotline.id, {
                title: phaseTitle.trim(),
                summary: phaseSummary.trim() || null,
                sortOrder: phases.length + 1,
            });
            setPhases((p) => [...p, created]);
            setPhaseTitle("");
            setPhaseSummary("");
            toast.success(t("plotlines.notifications.phaseCreated"));
        } catch (e: any) { toast.error(e.message); } finally { setAddingPhase(false); }
    };

    const savePhase = async (phaseId: string) => {
        if (!editPhaseTitle.trim()) return;
        setSavingPhase(true);
        try {
            const updated = await narrativeApi.updatePlotlinePhase(token, eventId, plotline.id, phaseId, {
                title: editPhaseTitle.trim(),
                summary: editPhaseSummary.trim() || null,
            });
            setPhases((p) => p.map((ph) => (ph.id === phaseId ? updated : ph)));
            setEditPhaseId(null);
            toast.success(t("plotlines.notifications.phaseUpdated"));
        } catch (e: any) { toast.error(e.message); } finally { setSavingPhase(false); }
    };

    const deletePhase = async (phaseId: string) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.deletePlotlinePhase(token, eventId, plotline.id, phaseId);
            setPhases((p) => p.filter((ph) => ph.id !== phaseId));
            setQuestLinks((ql) => ql.filter((q) => q.phaseId !== phaseId));
            toast.success(t("plotlines.notifications.phaseDeleted"));
        } catch (e: any) { toast.error(e.message); }
    };

    // ── Quest links ───────────────────────────────────────────────────────────

    const addQuest = async (phaseId: string | null) => {
        if (!selectedQuestId) return;
        setSavingQuest(true);
        try {
            const link = await narrativeApi.upsertPlotlineQuest(token, eventId, plotline.id, selectedQuestId, {
                phaseId: phaseId,
                sortOrder: questLinks.filter((q) => q.phaseId === phaseId).length + 1,
            });
            setQuestLinks((prev) => [...prev.filter(q => q.questId !== selectedQuestId || q.phaseId !== phaseId), link]);
            setSelectedQuestId("");
            setAddQuestPhaseId(null);
            toast.success(t("plotlines.notifications.questLinked"));
        } catch (e: any) { toast.error(e.message); } finally { setSavingQuest(false); }
    };

    const removeQuest = async (questId: string) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.deletePlotlineQuest(token, eventId, plotline.id, questId);
            setQuestLinks((prev) => prev.filter((q) => q.questId !== questId));
            toast.success(t("plotlines.notifications.questUnlinked"));
        } catch (e: any) { toast.error(e.message); }
    };

    const getQuestName = (questId: string) => allQuests.find((q) => q.id === questId)?.title || questId;
    const getQuestShortDescription = (questId: string) => allQuests.find((q) => q.id === questId)?.shortDescription || null;
    const unlinkedQuests = allQuests.filter((q) => !questLinks.some((ql) => ql.questId === q.id));

    const questsForPhase = (phaseId: string | null) =>
        questLinks.filter((ql) => ql.phaseId === phaseId).sort((a, b) => a.sortOrder - b.sortOrder);

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold tracking-tight">{t("plotlines.phases.title")}</h2>

            {/* ── Unphased quests ────────────────────────────────────── */}
            <section className="space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="font-medium text-muted-foreground">{t("plotlines.phases.unphasedQuests")}</h3>
                    {canWrite && (
                        <Button variant="ghost" size="sm" onClick={() => setAddQuestPhaseId("__unphased__")}>
                            <Plus className="h-4 w-4 mr-1" />{t("plotlines.phases.addQuest")}
                        </Button>
                    )}
                </div>

                {questsForPhase(null).length === 0 ? (
                    <p className="text-sm text-muted-foreground px-1">{t("quests.steps.empty")}</p>
                ) : (
                    <div className="divide-y rounded-md border">
                        {questsForPhase(null).map((ql) => (
                            <div key={ql.questId} className="flex items-center justify-between px-4 py-2">
                                <div className="flex flex-col">
                                    <span>{getQuestName(ql.questId)}</span>
                                    {getQuestShortDescription(ql.questId) && (
                                        <span className="text-xs text-muted-foreground line-clamp-1">{getQuestShortDescription(ql.questId)}</span>
                                    )}
                                </div>
                                {canWrite && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeQuest(ql.questId)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {addQuestPhaseId === "__unphased__" && (
                    <div className="flex gap-2 mt-2">
                        <select
                            className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm"
                            value={selectedQuestId}
                            onChange={(e) => setSelectedQuestId(e.target.value)}
                        >
                            <option value="">{t("common.select")}</option>
                            {unlinkedQuests.map((q) => (
                                <option key={q.id} value={q.id}>
                                    {q.title}{q.shortDescription ? ` (${q.shortDescription})` : ""}
                                </option>
                            ))}
                        </select>
                        <Button size="sm" onClick={() => addQuest(null)} disabled={!selectedQuestId || savingQuest}>
                            {savingQuest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setAddQuestPhaseId(null); setSelectedQuestId(""); }}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </section>

            {/* ── Phases ────────────────────────────────────────────── */}
            <div className="space-y-3">
                {phases.map((phase) => (
                    <Collapsible key={phase.id} defaultOpen>
                        <div className="rounded-lg border bg-card">
                            {/* Phase header */}
                            <div className="flex items-center gap-2 p-4">
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                </CollapsibleTrigger>
                                {editPhaseId === phase.id ? (
                                    <div className="flex-1 flex gap-2 flex-wrap">
                                        <Input
                                            value={editPhaseTitle}
                                            onChange={(e) => setEditPhaseTitle(e.target.value)}
                                            className="flex-1"
                                            autoFocus
                                        />
                                        <Input
                                            value={editPhaseSummary}
                                            onChange={(e) => setEditPhaseSummary(e.target.value)}
                                            placeholder="Summary..."
                                            className="flex-1"
                                        />
                                        <Button size="icon" className="h-9 w-9" onClick={() => savePhase(phase.id)} disabled={savingPhase}>
                                            {savingPhase ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                        </Button>
                                        <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setEditPhaseId(null)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex-1">
                                            <p className="font-semibold">{phase.title}</p>
                                            {phase.summary && <p className="text-sm text-muted-foreground">{phase.summary}</p>}
                                        </div>
                                        {canWrite && (
                                            <div className="flex gap-1 shrink-0">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditPhaseId(phase.id); setEditPhaseTitle(phase.title); setEditPhaseSummary(phase.summary || ""); }}>
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deletePhase(phase.id)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <CollapsibleContent>
                                <div className="border-t px-4 py-3 space-y-2">
                                    {questsForPhase(phase.id).length === 0 ? (
                                        <p className="text-sm text-muted-foreground">{t("quests.steps.empty")}</p>
                                    ) : (
                                        <div className="divide-y rounded-md border">
                                            {questsForPhase(phase.id).map((ql) => (
                                                <div key={ql.questId} className="flex items-center justify-between px-4 py-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">{getQuestName(ql.questId)}</span>
                                                        {getQuestShortDescription(ql.questId) && (
                                                            <span className="text-xs text-muted-foreground line-clamp-1">{getQuestShortDescription(ql.questId)}</span>
                                                        )}
                                                    </div>
                                                    {canWrite && (
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeQuest(ql.questId)}>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {canWrite && (
                                        addQuestPhaseId === phase.id ? (
                                            <div className="flex gap-2 mt-2">
                                                <select
                                                    className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm"
                                                    value={selectedQuestId}
                                                    onChange={(e) => setSelectedQuestId(e.target.value)}
                                                >
                                                    <option value="">{t("common.select")}</option>
                                                    {unlinkedQuests.map((q) => (
                                                        <option key={q.id} value={q.id}>
                                                            {q.title}{q.shortDescription ? ` (${q.shortDescription})` : ""}
                                                        </option>
                                                    ))}
                                                </select>
                                                <Button size="sm" onClick={() => addQuest(phase.id)} disabled={!selectedQuestId || savingQuest}>
                                                    {savingQuest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => { setAddQuestPhaseId(null); setSelectedQuestId(""); }}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button variant="ghost" size="sm" onClick={() => setAddQuestPhaseId(phase.id)}>
                                                <Plus className="h-4 w-4 mr-1" />{t("plotlines.phases.addQuest")}
                                            </Button>
                                        )
                                    )}
                                </div>
                            </CollapsibleContent>
                        </div>
                    </Collapsible>
                ))}
            </div>

            {/* ── Add phase form ─────────────────────────────────────── */}
            {canWrite && (
                <div className="space-y-2 p-4 rounded-lg border bg-muted/30">
                    <p className="text-sm font-medium">{t("plotlines.phases.add")}</p>
                    <Input
                        value={phaseTitle}
                        onChange={(e) => setPhaseTitle(e.target.value)}
                        placeholder={t("plotlines.phases.fields.title.placeholder")}
                    />
                    <Textarea
                        value={phaseSummary}
                        onChange={(e) => setPhaseSummary(e.target.value)}
                        placeholder={t("plotlines.phases.fields.summary.label")}
                        rows={2}
                    />
                    <Button size="sm" onClick={addPhase} disabled={!phaseTitle.trim() || addingPhase}>
                        {addingPhase ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        {t("plotlines.phases.add")}
                    </Button>
                </div>
            )}
        </div>
    );
}
