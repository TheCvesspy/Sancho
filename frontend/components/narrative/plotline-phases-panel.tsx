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
import { Trash2, Pencil, Check, X, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AddPlotlinePhaseDialog } from "./add-plotline-phase-dialog";
import { AddQuestToPhaseDialog } from "./add-quest-to-phase-dialog";

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

    // Edit phase (inline — kept per user decision)
    const [editPhaseId, setEditPhaseId] = useState<string | null>(null);
    const [editPhaseTitle, setEditPhaseTitle] = useState("");
    const [editPhaseSummary, setEditPhaseSummary] = useState("");
    const [savingPhase, setSavingPhase] = useState(false);

    // ── Phase CRUD ────────────────────────────────────────────────────────────

    const refreshPhases = async () => {
        try {
            const [latestPhases, latestLinks] = await Promise.all([
                narrativeApi.listPlotlinePhases(token, eventId, plotline.id),
                narrativeApi.listPlotlineQuests(token, eventId, plotline.id),
            ]);
            setPhases([...latestPhases].sort((a, b) => a.sortOrder - b.sortOrder));
            setQuestLinks(latestLinks);
        } catch (e) {
            console.error(e);
        }
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

    const refreshQuestLinks = async () => {
        try {
            const latest = await narrativeApi.listPlotlineQuests(token, eventId, plotline.id);
            setQuestLinks(latest);
        } catch (e) {
            console.error(e);
        }
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
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">{t("plotlines.phases.title")}</h2>
                {canWrite && (
                    <AddPlotlinePhaseDialog
                        plotlineId={plotline.id}
                        eventId={eventId}
                        token={token}
                        currentPhaseCount={phases.length}
                        onPhaseAdded={refreshPhases}
                    />
                )}
            </div>

            {/* ── Unphased quests ────────────────────────────────────── */}
            <section className="space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="font-medium text-muted-foreground">{t("plotlines.phases.unphasedQuests")}</h3>
                    {canWrite && (
                        <AddQuestToPhaseDialog
                            plotlineId={plotline.id}
                            eventId={eventId}
                            token={token}
                            phaseId={null}
                            phaseName={null}
                            unlinkedQuests={unlinkedQuests}
                            currentQuestCount={questsForPhase(null).length}
                            onQuestLinked={refreshQuestLinks}
                        />
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
                                            placeholder={t("plotlines.phases.fields.summary.placeholder")}
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
                                        <div className="flex justify-start pt-1">
                                            <AddQuestToPhaseDialog
                                                plotlineId={plotline.id}
                                                eventId={eventId}
                                                token={token}
                                                phaseId={phase.id}
                                                phaseName={phase.title}
                                                unlinkedQuests={unlinkedQuests}
                                                currentQuestCount={questsForPhase(phase.id).length}
                                                onQuestLinked={refreshQuestLinks}
                                            />
                                        </div>
                                    )}
                                </div>
                            </CollapsibleContent>
                        </div>
                    </Collapsible>
                ))}
            </div>
        </div>
    );
}
