"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { CharacterRelationshipDto, CharacterListItemDto, charactersApi } from "@/utils/characters-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Loader2, Check, ChevronsUpDown } from "lucide-react";
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
    const [targetId, setTargetId] = useState("");
    const [relationType, setRelationType] = useState("");
    const [relationMode, setRelationMode] = useState("directional");
    const [description, setDescription] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);

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

    const handleAdd = async () => {
        if (!targetId) return;
        setIsSaving(true);
        try {
            await charactersApi.createRelationship(token, eventId, characterId, {
                targetCharacterId: targetId,
                relationType: relationType.trim() || "ally",
                relationMode,
                description: description.trim() || null
            });

            // Re-fetch to get auto-mirrored instances
            const latest = await charactersApi.listRelationships(token, eventId, characterId);
            setRelationships(latest);

            setTargetId("");
            setRelationType("");
            setDescription("");
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
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
            <h2 className="text-lg font-semibold tracking-tight">{t("relationships.title")}</h2>

            {canWrite && (
                <div className="flex flex-col sm:flex-row items-end gap-4 p-4 rounded-lg border bg-card flex-wrap">
                    <div className="space-y-1 flex-1 min-w-[200px]">
                        <label className="text-sm font-medium">{t("relationships.target")}</label>
                        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={pickerOpen}
                                    className="w-full justify-between h-10 px-3 bg-background font-normal"
                                >
                                    {targetId
                                        ? characters.find(c => c.id === targetId)?.name
                                        : t("relationships.selectCharacter")}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder={t("relationships.searchCharacter")} />
                                    <CommandList>
                                        <CommandEmpty>No results.</CommandEmpty>
                                        <CommandGroup>
                                            {characters.map((char) => (
                                                <CommandItem
                                                    key={char.id}
                                                    value={char.name}
                                                    onSelect={() => {
                                                        setTargetId(targetId === char.id ? "" : char.id);
                                                        setPickerOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            targetId === char.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {char.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-1 w-full sm:w-auto flex-1 min-w-[150px]">
                        <label className="text-sm font-medium">{t("relationships.type")}</label>
                        <Input
                            value={relationType}
                            placeholder={t("relationships.typePlaceholder")}
                            maxLength={100}
                            onChange={(e) => setRelationType(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1 w-full sm:w-auto">
                        <label className="text-sm font-medium">{t("relationships.mode")}</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={relationMode}
                            onChange={(e) => setRelationMode(e.target.value)}
                        >
                            <option value="directional">{t("relationships.directional")}</option>
                            <option value="auto_mirrored">{t("relationships.mirrored")}</option>
                        </select>
                    </div>

                    <div className="space-y-1 w-full sm:w-auto flex-1 min-w-[150px]">
                        <label className="text-sm font-medium">{t("relationships.description")}</label>
                        <Input
                            value={description}
                            placeholder={t("relationships.descriptionPlaceholder")}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <Button onClick={handleAdd} disabled={!targetId || isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                        {t("relationships.add")}
                    </Button>
                </div>
            )}

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
