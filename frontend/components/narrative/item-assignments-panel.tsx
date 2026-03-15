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
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AssignItemToCharacterDialog } from "./assign-item-to-character-dialog";

interface ItemAssignmentsPanelProps {
    eventId: string;
    item: NarrativeItemDto;
    initialAssignments: NarrativeItemAssignmentDto[];
    canWrite: boolean;
    token: string;
}

export function ItemAssignmentsPanel({ eventId, item, initialAssignments, canWrite, token }: ItemAssignmentsPanelProps) {
    const t = useTranslations("narrative");
    const [assignments, setAssignments] = useState<NarrativeItemAssignmentDto[]>(initialAssignments);
    const [allChars, setAllChars] = useState<CharacterListItemDto[]>([]);

    useEffect(() => {
        charactersApi.listCharacters(token, eventId).then(setAllChars).catch(console.error);
    }, [eventId, token]);

    const assignedCharIds = new Set(assignments.map(a => a.characterId));
    const availableChars = allChars.filter(c => !assignedCharIds.has(c.id));

    const atMaxCopies = item.isMultiCopy
        ? item.maxCopies !== null && assignments.length >= (item.maxCopies ?? Infinity)
        : assignments.length >= 1;

    const refreshAssignments = async () => {
        try {
            const latest = await narrativeApi.listItemAssignments(token, eventId, item.id);
            setAssignments(latest);
        } catch (e) {
            console.error(e);
        }
    };

    const handleUnassign = async (characterId: string) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.removeItemAssignment(token, eventId, item.id, characterId);
            setAssignments(prev => prev.filter(a => a.characterId !== characterId));
            toast.success(t("items.notifications.unassigned"));
        } catch (e: any) {
            toast.error(e.message || t("common.error"));
        }
    };

    const getCharName = (id: string) => allChars.find(c => c.id === id)?.name || id;

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">{t("items.assignments.title")}</h2>
                <div className="flex items-center gap-2">
                    {item.isMultiCopy ? (
                        <Badge variant="outline">
                            {t("items.copyInfo.multiCopy")} — {assignments.length}/{item.maxCopies ?? "∞"}
                        </Badge>
                    ) : (
                        <Badge variant="outline">{t("items.copyInfo.singleItem")}</Badge>
                    )}
                    {canWrite && !atMaxCopies && (
                        <AssignItemToCharacterDialog
                            itemId={item.id}
                            eventId={eventId}
                            token={token}
                            availableCharacters={availableChars}
                            onAssigned={refreshAssignments}
                        />
                    )}
                </div>
            </div>

            {atMaxCopies && canWrite && (
                <p className="text-sm text-amber-600 font-medium">{t("items.assignments.limitReached")}</p>
            )}

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
                            {canWrite && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleUnassign(a.characterId)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
