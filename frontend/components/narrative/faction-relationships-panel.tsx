"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { NarrativeFactionRelationshipDto, NarrativeFactionDto, narrativeApi } from "@/utils/narrative-api";
import { CharacterListItemDto, charactersApi } from "@/utils/characters-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Loader2 } from "lucide-react";

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

    // Data lookup
    const [characters, setCharacters] = useState<CharacterListItemDto[]>([]);
    const [factions, setFactions] = useState<NarrativeFactionDto[]>([]);

    // Form inputs
    const [targetType, setTargetType] = useState<"faction" | "character">("faction");
    const [targetId, setTargetId] = useState("");
    const [relationType, setRelationType] = useState("ally");
    const [relationMode, setRelationMode] = useState("directional");
    const [notes, setNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);

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

    const handleAdd = async () => {
        if (!targetId) return;
        setIsSaving(true);
        try {
            const added = await narrativeApi.createFactionRelationship(token, eventId, factionId, {
                targetFactionId: targetType === "faction" ? targetId : null,
                targetCharacterId: targetType === "character" ? targetId : null,
                relationType,
                relationMode,
                notes: notes || null
            });
            setRelationships(prev => [...prev, added]);

            // Re-fetch to get auto-mirrored instances if applicable
            if (relationMode === "autoMirrored") {
                const latest = await narrativeApi.listFactionRelationships(token, eventId, factionId);
                setRelationships(latest);
            }

            setTargetId("");
            setNotes("");
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
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
        if (rel.targetFactionId) return factions.find(f => f.id === rel.targetFactionId)?.name || rel.targetFactionId;
        if (rel.targetCharacterId) return characters.find(c => c.id === rel.targetCharacterId)?.name || rel.targetCharacterId;
        return "—";
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold tracking-tight">{t("factions.detail.tabs.relationships")}</h2>

            {canWrite && (
                <div className="flex flex-col sm:flex-row items-end gap-4 p-4 rounded-lg border bg-card flex-wrap">
                    <div className="space-y-1 w-full sm:w-auto">
                        <label className="text-sm font-medium">{t("factions.relationships.targetType")}</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={targetType}
                            onChange={(e) => { setTargetType(e.target.value as any); setTargetId(""); }}
                        >
                            <option value="faction">{t("factions.relationships.targetFaction")}</option>
                            <option value="character">{t("factions.relationships.targetCharacter")}</option>
                        </select>
                    </div>

                    <div className="space-y-1 flex-1 min-w-[200px]">
                        <label className="text-sm font-medium">{t("factions.relationships.target")}</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={targetId}
                            onChange={(e) => setTargetId(e.target.value)}
                        >
                            <option value="">{t("common.select")}</option>
                            {targetType === "faction"
                                ? factions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)
                                : characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                            }
                        </select>
                    </div>

                    <div className="space-y-1 w-full sm:w-auto">
                        <label className="text-sm font-medium">{t("factions.relationships.fields.type")}</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={relationType}
                            onChange={(e) => setRelationType(e.target.value)}
                        >
                            <option value="ally">{t("relationships.types.ally")}</option>
                            <option value="enemy">{t("relationships.types.enemy")}</option>
                            <option value="neutral">{t("relationships.types.neutral")}</option>
                            <option value="info-source">{t("relationships.types.info-source")}</option>
                            <option value="custom">{t("relationships.types.custom")}</option>
                        </select>
                    </div>

                    <div className="space-y-1 w-full sm:w-auto">
                        <label className="text-sm font-medium">{t("factions.relationships.fields.mode")}</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={relationMode}
                            onChange={(e) => setRelationMode(e.target.value)}
                        >
                            <option value="directional">{t("relationships.modes.directional")}</option>
                            <option value="autoMirrored">{t("relationships.modes.autoMirrored")}</option>
                        </select>
                    </div>

                    <div className="space-y-1 flex-1 min-w-[160px]">
                        <label className="text-sm font-medium">{t("factions.relationships.fields.notes")}</label>
                        <Input
                            value={notes}
                            placeholder="..."
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <Button onClick={handleAdd} disabled={!targetId || isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                        {t("common.add")}
                    </Button>
                </div>
            )}

            <div className="rounded-md border bg-card">
                <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 p-4 font-semibold border-b bg-muted/50">
                    <div>{t("factions.relationships.target")}</div>
                    <div>{t("factions.relationships.fields.type")}</div>
                    <div>{t("factions.relationships.fields.mode")}</div>
                    {canWrite && <div className="w-10"></div>}
                </div>
                {relationships.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">{t("factions.relationships.noRelationships")}</div>
                ) : (
                    <div className="divide-y">
                        {relationships.map(rel => (
                            <div key={rel.id} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 p-4 items-center">
                                <div className="font-medium">
                                    {getTargetName(rel)}
                                    <span className="ml-2 text-xs text-muted-foreground uppercase">
                                        {rel.targetFactionId ? t("factions.relationships.targetFaction") : t("factions.relationships.targetCharacter")}
                                    </span>
                                    {rel.notes && <p className="text-sm text-muted-foreground font-normal mt-1">{rel.notes}</p>}
                                </div>
                                <div><span className="capitalize">{t(`relationships.types.${rel.relationType}` as any) || rel.relationType}</span></div>
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
