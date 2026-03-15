"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { CharacterRelationshipDto, CharacterListItemDto, charactersApi } from "@/utils/characters-api";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { AddRelationshipDialog } from "./add-relationship-dialog";

interface CharacterRelationshipsPanelProps {
    characterId: string;
    eventId: string;
    initialRelationships: CharacterRelationshipDto[];
    canWrite: boolean;
    token: string;
}

export function CharacterRelationshipsPanel({ characterId, eventId, initialRelationships, canWrite, token }: CharacterRelationshipsPanelProps) {
    const t = useTranslations("characters");
    const [relationships, setRelationships] = useState<CharacterRelationshipDto[]>(initialRelationships);

    const [characters, setCharacters] = useState<CharacterListItemDto[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const chars = await charactersApi.listCharacters(token, eventId);
                setCharacters(chars.filter(c => c.id !== characterId));
            } catch (e) {
                console.error(e);
            }
        };
        fetchData();
    }, [eventId, characterId, token]);

    const refreshRelationships = async () => {
        try {
            const latest = await charactersApi.listRelationships(token, eventId, characterId);
            setRelationships(latest);
        } catch (e) {
            console.error(e);
        }
    };

    const handleRemove = async (relId: string) => {
        if (!confirm(t("relationships.confirmDelete"))) return;
        try {
            await charactersApi.deleteRelationship(token, eventId, characterId, relId);
            setRelationships(prev => prev.filter(m => m.id !== relId));
        } catch (error) {
            console.error(error);
        }
    };

    const filteredRelationships = relationships.filter(rel => !rel.isAutoMirror);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">{t("relationships.title")}</h2>
                {canWrite && (
                    <AddRelationshipDialog
                        characterId={characterId}
                        eventId={eventId}
                        token={token}
                        characters={characters}
                        onRelationshipAdded={refreshRelationships}
                    />
                )}
            </div>

            <div className="rounded-md border bg-card">
                <div className="grid grid-cols-[2fr_1fr_1fr_2fr_auto] gap-4 p-4 font-semibold border-b bg-muted/50">
                    <div>{t("relationships.target")}</div>
                    <div>{t("relationships.type")}</div>
                    <div>{t("relationships.mode")}</div>
                    <div>{t("relationships.description")}</div>
                    {canWrite && <div className="w-10"></div>}
                </div>
                {filteredRelationships.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">{t("relationships.noRelationships")}</div>
                ) : (
                    <div className="divide-y">
                        {filteredRelationships.map(rel => (
                            <div key={rel.id} className="grid grid-cols-[2fr_1fr_1fr_2fr_auto] gap-4 p-4 items-center">
                                <div className="font-medium">{rel.targetCharacterName}</div>
                                <div><span className="capitalize">{rel.relationType}</span></div>
                                <div className="text-muted-foreground text-sm">
                                    {rel.relationMode === "directional" ? t("relationships.directional") : t("relationships.mirrored")}
                                </div>
                                <div className="text-sm text-muted-foreground truncate" title={rel.description || ""}>
                                    {rel.description || "—"}
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
