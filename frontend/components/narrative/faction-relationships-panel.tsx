"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { NarrativeFactionRelationshipDto, NarrativeFactionDto, narrativeApi } from "@/utils/narrative-api";
import { CharacterListItemDto, charactersApi } from "@/utils/characters-api";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { AddFactionRelationshipDialog } from "./add-faction-relationship-dialog";

interface FactionRelationshipsPanelProps {
    factionId: string;
    eventId: string;
    initialRelationships: NarrativeFactionRelationshipDto[];
    canWrite: boolean;
    token: string;
}

export function FactionRelationshipsPanel({ factionId, eventId, initialRelationships, canWrite, token }: FactionRelationshipsPanelProps) {
    const t = useTranslations("narrative");
    const [relationships, setRelationships] = useState<NarrativeFactionRelationshipDto[]>(initialRelationships);

    const [characters, setCharacters] = useState<CharacterListItemDto[]>([]);
    const [factions, setFactions] = useState<NarrativeFactionDto[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [charRes, facRes] = await Promise.all([
                    charactersApi.listCharacters(token, eventId),
                    narrativeApi.listFactions(token, eventId)
                ]);
                setCharacters(charRes);
                setFactions(facRes.filter(f => f.id !== factionId));
            } catch (e) {
                console.error(e);
            }
        };
        fetchData();
    }, [eventId, factionId, token]);

    const refreshRelationships = async () => {
        try {
            const latest = await narrativeApi.listFactionRelationships(token, eventId, factionId);
            setRelationships(latest);
        } catch (e) {
            console.error(e);
        }
    };

    const handleRemove = async (relId: string) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.deleteFactionRelationship(token, eventId, factionId, relId);
            setRelationships(prev => prev.filter(m => m.id !== relId));
        } catch (error) {
            console.error(error);
        }
    };

    const getTargetName = (rel: NarrativeFactionRelationshipDto) => {
        if (rel.targetFactionId) {
            const otherFactionId = rel.targetFactionId === factionId ? rel.sourceFactionId : rel.targetFactionId;
            return factions.find(f => f.id === otherFactionId)?.name || otherFactionId;
        }
        if (rel.targetCharacterId) return characters.find(c => c.id === rel.targetCharacterId)?.name || rel.targetCharacterId;
        return "—";
    };

    const filteredRelationships = relationships.filter(rel => !rel.isAutoMirror);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">{t("factions.detail.tabs.relationships")}</h2>
                {canWrite && (
                    <AddFactionRelationshipDialog
                        factionId={factionId}
                        eventId={eventId}
                        token={token}
                        factions={factions}
                        characters={characters}
                        onRelationshipAdded={refreshRelationships}
                    />
                )}
            </div>

            <div className="rounded-md border bg-card">
                <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 p-4 font-semibold border-b bg-muted/50">
                    <div>{t("factions.relationships.target")}</div>
                    <div>{t("factions.relationships.fields.type")}</div>
                    <div>{t("factions.relationships.fields.mode")}</div>
                    {canWrite && <div className="w-10"></div>}
                </div>
                {filteredRelationships.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">{t("factions.relationships.noRelationships")}</div>
                ) : (
                    <div className="divide-y">
                        {filteredRelationships.map(rel => (
                            <div key={rel.id} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 p-4 items-center">
                                <div className="font-medium">
                                    {getTargetName(rel)}
                                    <span className="ml-2 text-xs text-muted-foreground uppercase">
                                        {(rel.relationMode === "auto_mirrored" || rel.targetFactionId) ? t("factions.relationships.targetFaction") : t("factions.relationships.targetCharacter")}
                                    </span>
                                </div>
                                <div><span className="capitalize">{rel.relationType}</span></div>
                                <div className="text-muted-foreground text-sm">
                                    {rel.relationMode === "directional" ? t("factions.relationships.directionalShort") : t("factions.relationships.mirroredShort")}
                                </div>
                                {canWrite && (
                                    <Button variant="ghost" size="icon" onClick={() => handleRemove(rel.id)} className="text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
