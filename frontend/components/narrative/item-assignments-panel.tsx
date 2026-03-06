"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
    narrativeApi,
    NarrativeItemDto,
    NarrativeItemAssignmentDto,
} from "@/utils/narrative-api";
import { CharacterListItemDto, charactersApi } from "@/utils/characters-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ItemAssignmentsPanelProps {
    eventId: string;
    item: NarrativeItemDto;
    initialAssignments: NarrativeItemAssignmentDto[];
    isOrgOrSysAdmin: boolean;
    token: string;
}

export function ItemAssignmentsPanel({ eventId, item, initialAssignments, isOrgOrSysAdmin, token }: ItemAssignmentsPanelProps) {
    const t = useTranslations("narrative");
    const [assignments, setAssignments] = useState<NarrativeItemAssignmentDto[]>(initialAssignments);
    const [allChars, setAllChars] = useState<CharacterListItemDto[]>([]);
    const [selChar, setSelChar] = useState("");
    const [notes, setNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        charactersApi.listCharacters(token, eventId).then(setAllChars).catch(console.error);
    }, [eventId, token]);

    const assignedCharIds = new Set(assignments.map(a => a.characterId));
    const availableChars = allChars.filter(c => !assignedCharIds.has(c.id));

    const atMaxCopies = item.isMultiCopy
        ? item.maxCopies !== null && assignments.length >= (item.maxCopies ?? Infinity)
        : assignments.length >= 1;

    const handleAssign = async () => {
        if (!selChar || atMaxCopies) return;
        setIsSaving(true);
        try {
            const created = await narrativeApi.assignItemToCharacter(token, eventId, item.id, selChar, {
                notes: notes.trim() || null,
            });
            setAssignments(prev => [...prev, created]);
            setSelChar("");
            setNotes("");
            toast.success(t("items.assignments.add"));
        } catch (e: any) {
            toast.error(e.message || t("documentsPanel.notifications.error"));
        } finally {
            setIsSaving(false);
        }
    };

    const handleUnassign = async (characterId: string) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.removeItemAssignment(token, eventId, item.id, characterId);
            setAssignments(prev => prev.filter(a => a.characterId !== characterId));
            toast.success(t("items.assignments.empty"));
        } catch (e: any) {
            toast.error(e.message || t("documentsPanel.notifications.error"));
        }
    };

    const getCharName = (id: string) => allChars.find(c => c.id === id)?.name || id;

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">{t("items.assignments.title")}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {item.isMultiCopy ? (
                        <Badge variant="outline">
                            {t("items.copyInfo.multiCopy")} — {assignments.length}/{item.maxCopies ?? "∞"}
                        </Badge>
                    ) : (
                        <Badge variant="outline">{t("items.copyInfo.singleItem")}</Badge>
                    )}
                </div>
            </div>

            {assignments.length === 0 ? (
                <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
                    {t("items.assignments.empty")}
                </div>
            ) : (
                <div className="divide-y rounded-md border">
                    {assignments.map(a => (
                        <div key={a.characterId} className="flex items-center justify-between px-4 py-3">
                            <div>
                                <p className="font-medium">{getCharName(a.characterId)}</p>
                                {a.notes && <p className="text-sm text-muted-foreground">{a.notes}</p>}
                                <p className="text-xs text-muted-foreground">
                                    {t("items.assignments.assignedAt", { date: format(new Date(a.assignedAt), "PPp") })}
                                </p>
                            </div>
                            {isOrgOrSysAdmin && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleUnassign(a.characterId)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {isOrgOrSysAdmin && (
                <div className="space-y-2 p-4 rounded-lg border bg-muted/30">
                    {atMaxCopies ? (
                        <p className="text-sm text-amber-600 font-medium">{t("items.assignments.limitReached")}</p>
                    ) : (
                        <>
                            <p className="text-sm font-medium">{t("items.assignments.add")}</p>
                            <div className="flex gap-2 flex-wrap">
                                <select
                                    className="flex h-9 flex-1 min-w-[160px] rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    value={selChar}
                                    onChange={e => setSelChar(e.target.value)}
                                >
                                    <option value="">{t("common.select")}</option>
                                    {availableChars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <Input
                                    className="h-9 flex-1 min-w-[160px]"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder={t("items.assignments.notesPlaceholder")}
                                />
                                <Button size="sm" onClick={handleAssign} disabled={!selChar || isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                    {t("items.assignments.add")}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
