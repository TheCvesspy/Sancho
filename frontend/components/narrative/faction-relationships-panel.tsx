"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { NarrativeFactionRelationshipDto, NarrativeFactionDto, narrativeApi } from "@/utils/narrative-api";
import { CharacterListItemDto, charactersApi } from "@/utils/characters-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Loader2, Search, Check, ChevronsUpDown } from "lucide-react";
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
import { cn } from "@/lib/utils";

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
    const [relationType, setRelationType] = useState("");
    const [relationMode, setRelationMode] = useState("directional");
    const [isSaving, setIsSaving] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

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
                relationType: relationType.trim() || "ally",
                relationMode
            });
            setRelationships(prev => [...prev, added]);

            // Re-fetch to get auto-mirrored instances if applicable
            if (relationMode === "auto_mirrored") {
                const latest = await narrativeApi.listFactionRelationships(token, eventId, factionId);
                setRelationships(latest);
            }

            setTargetId("");
            setRelationType("");
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
                        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={pickerOpen}
                                    className="w-full justify-between h-10 px-3 bg-background font-normal"
                                >
                                    {targetId 
                                        ? (targetType === "faction" 
                                            ? factions.find(f => f.id === targetId)?.name 
                                            : characters.find(c => c.id === targetId)?.name) 
                                        : t("common.select")}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder={t("common.search")} />
                                    <CommandList>
                                        <CommandEmpty>{t("common.noResults")}</CommandEmpty>
                                        <CommandGroup>
                                            {(targetType === "faction" ? factions : characters).map((item) => (
                                                <CommandItem
                                                    key={item.id}
                                                    value={item.id}
                                                    onSelect={(currentValue) => {
                                                        setTargetId(currentValue === targetId ? "" : currentValue);
                                                        setPickerOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            targetId === item.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {item.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-1 w-full sm:w-auto flex-1 min-w-[150px]">
                        <label className="text-sm font-medium">{t("factions.relationships.fields.type")}</label>
                        <Input
                            value={relationType}
                            placeholder="e.g. Ally, Enemy..."
                            maxLength={100}
                            onChange={(e) => setRelationType(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1 w-full sm:w-auto">
                        <label className="text-sm font-medium">{t("factions.relationships.fields.mode")}</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={relationMode}
                            onChange={(e) => setRelationMode(e.target.value)}
                        >
                            <option value="directional">{t("factions.relationships.directionalShort")}</option>
                            <option value="auto_mirrored">{t("factions.relationships.mirroredShort")}</option>
                        </select>
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
