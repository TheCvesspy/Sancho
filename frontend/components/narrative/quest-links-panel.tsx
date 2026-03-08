"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
    narrativeApi,
    NarrativeQuestCharacterLinkDto,
    NarrativeEntityFactionLinkDto,
    NarrativeEntityItemLinkDto,
    NarrativeFactionDto,
    NarrativeItemDto,
    NarrativeQuestStepDto,
    NarrativeQuestStepCharacterDto,
} from "@/utils/narrative-api";
import { CharacterListItemDto, charactersApi } from "@/utils/characters-api";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Loader2, Users, Shield, Package, Users2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface QuestLinksPanelProps {
    eventId: string;
    questId: string;
    initialCharacterLinks: NarrativeQuestCharacterLinkDto[];
    initialFactionLinks: NarrativeEntityFactionLinkDto[];
    initialItemLinks: NarrativeEntityItemLinkDto[];
    isOrgOrSysAdmin: boolean;
    token: string;
}

export function QuestLinksPanel({
    eventId,
    questId,
    initialCharacterLinks,
    initialFactionLinks,
    initialItemLinks,
    isOrgOrSysAdmin,
    token,
}: QuestLinksPanelProps) {
    const t = useTranslations("narrative");

    const [characterLinks, setCharacterLinks] = useState(initialCharacterLinks);
    const [factionLinks, setFactionLinks] = useState(initialFactionLinks);
    const [itemLinks, setItemLinks] = useState(initialItemLinks);

    // Step characters (read-only summary)
    const [questSteps, setQuestSteps] = useState<NarrativeQuestStepDto[]>([]);
    const [stepCharacters, setStepCharacters] = useState<Record<string, NarrativeQuestStepCharacterDto[]>>({});

    // Lookup data
    const [allCharacters, setAllCharacters] = useState<CharacterListItemDto[]>([]);
    const [allFactions, setAllFactions] = useState<NarrativeFactionDto[]>([]);
    const [allItems, setAllItems] = useState<NarrativeItemDto[]>([]);

    // Add form state
    const [selectedChar, setSelectedChar] = useState("");
    const [charRole, setCharRole] = useState("");
    const [selectedFaction, setSelectedFaction] = useState("");
    const [selectedItem, setSelectedItem] = useState("");
    const [savingChar, setSavingChar] = useState(false);
    const [savingFaction, setSavingFaction] = useState(false);
    const [savingItem, setSavingItem] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [chars, factions, items, steps] = await Promise.all([
                    charactersApi.listCharacters(token, eventId),
                    narrativeApi.listFactions(token, eventId),
                    narrativeApi.listItems(token, eventId),
                    narrativeApi.listQuestSteps(token, eventId, questId),
                ]);
                setAllCharacters(chars);
                setAllFactions(factions);
                setAllItems(items);
                setQuestSteps(steps);

                // Load step characters
                const entries = await Promise.all(
                    steps.map(async (step) => {
                        try {
                            const links = await narrativeApi.listQuestStepCharacters(token, eventId, questId, step.id);
                            return [step.id, links] as [string, NarrativeQuestStepCharacterDto[]];
                        } catch {
                            return [step.id, []] as [string, NarrativeQuestStepCharacterDto[]];
                        }
                    })
                );
                setStepCharacters(Object.fromEntries(entries));
            } catch (e) { console.error(e); }
        };
        load();
    }, [eventId, questId, token]);

    const linkedCharIds = new Set(characterLinks.map((l) => l.characterId));
    const linkedFactionIds = new Set(factionLinks.map((l) => l.factionId));
    const linkedItemIds = new Set(itemLinks.map((l) => l.itemId));

    // ── Characters ───────────────────────────────────────────────────────────

    const addCharacter = async () => {
        if (!selectedChar) return;
        setSavingChar(true);
        try {
            const link = await narrativeApi.upsertQuestCharacter(token, eventId, questId, selectedChar, { role: charRole || null });
            setCharacterLinks((prev) => [...prev.filter(l => l.characterId !== selectedChar), link]);
            setSelectedChar("");
            setCharRole("");
            toast.success(t("common.add"));
        } catch (e: any) { toast.error(e.message); } finally { setSavingChar(false); }
    };

    const removeCharacter = async (charId: string) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.deleteQuestCharacter(token, eventId, questId, charId);
            setCharacterLinks((prev) => prev.filter((l) => l.characterId !== charId));
        } catch (e: any) { toast.error(e.message); }
    };

    // ── Factions ─────────────────────────────────────────────────────────────

    const addFaction = async () => {
        if (!selectedFaction) return;
        setSavingFaction(true);
        try {
            const link = await narrativeApi.upsertQuestFaction(token, eventId, questId, selectedFaction);
            setFactionLinks((prev) => [...prev.filter(l => l.factionId !== selectedFaction), link]);
            setSelectedFaction("");
            toast.success(t("common.add"));
        } catch (e: any) { toast.error(e.message); } finally { setSavingFaction(false); }
    };

    const removeFaction = async (factionId: string) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.deleteQuestFaction(token, eventId, questId, factionId);
            setFactionLinks((prev) => prev.filter((l) => l.factionId !== factionId));
        } catch (e: any) { toast.error(e.message); }
    };

    // ── Items ────────────────────────────────────────────────────────────────

    const addItem = async () => {
        if (!selectedItem) return;
        setSavingItem(true);
        try {
            const link = await narrativeApi.upsertQuestItem(token, eventId, questId, selectedItem);
            setItemLinks((prev) => [...prev.filter(l => l.itemId !== selectedItem), link]);
            setSelectedItem("");
            toast.success(t("common.add"));
        } catch (e: any) { toast.error(e.message); } finally { setSavingItem(false); }
    };

    const removeItem = async (itemId: string) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.deleteQuestItem(token, eventId, questId, itemId);
            setItemLinks((prev) => prev.filter((l) => l.itemId !== itemId));
        } catch (e: any) { toast.error(e.message); }
    };

    const getName = (list: { id: string; name: string }[], id: string) =>
        list.find((x) => x.id === id)?.name || id;

    return (
        <div className="space-y-8">
            {/* ── Characters ──────────────────────────────────────────── */}
            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">{t("quests.links.characters")}</h3>
                </div>

                {characterLinks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("common.noDescription")}</p>
                ) : (
                    <div className="divide-y rounded-md border">
                        {characterLinks.map((link) => (
                            <div key={link.characterId} className="flex items-center justify-between px-4 py-3">
                                <div>
                                    <span className="font-medium">{getName(allCharacters, link.characterId)}</span>
                                    {link.role && <span className="ml-2 text-sm text-muted-foreground">({link.role})</span>}
                                </div>
                                {isOrgOrSysAdmin && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeCharacter(link.characterId)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {isOrgOrSysAdmin && (
                    <div className="flex gap-2 flex-wrap">
                        <select
                            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex-1 min-w-[160px]"
                            value={selectedChar}
                            onChange={(e) => setSelectedChar(e.target.value)}
                        >
                            <option value="">{t("common.select")}</option>
                            {allCharacters.filter((c) => !linkedCharIds.has(c.id)).map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <Input
                            className="h-9 flex-1 min-w-[120px]"
                            placeholder="Role (optional)"
                            value={charRole}
                            onChange={(e) => setCharRole(e.target.value)}
                        />
                        <Button size="sm" onClick={addCharacter} disabled={!selectedChar || savingChar}>
                            {savingChar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        </Button>
                    </div>
                )}
            </section>

            {/* ── Factions ────────────────────────────────────────────── */}
            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">{t("quests.links.factions")}</h3>
                </div>

                {factionLinks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("common.noDescription")}</p>
                ) : (
                    <div className="divide-y rounded-md border">
                        {factionLinks.map((link) => (
                            <div key={link.factionId} className="flex items-center justify-between px-4 py-3">
                                <span className="font-medium">{getName(allFactions, link.factionId)}</span>
                                {isOrgOrSysAdmin && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFaction(link.factionId)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {isOrgOrSysAdmin && (
                    <div className="flex gap-2">
                        <select
                            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex-1"
                            value={selectedFaction}
                            onChange={(e) => setSelectedFaction(e.target.value)}
                        >
                            <option value="">{t("common.select")}</option>
                            {allFactions.filter((f) => !linkedFactionIds.has(f.id)).map((f) => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                        <Button size="sm" onClick={addFaction} disabled={!selectedFaction || savingFaction}>
                            {savingFaction ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        </Button>
                    </div>
                )}
            </section>

            {/* ── Items ───────────────────────────────────────────────── */}
            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">{t("quests.links.items")}</h3>
                </div>

                {itemLinks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("common.noDescription")}</p>
                ) : (
                    <div className="divide-y rounded-md border">
                        {itemLinks.map((link) => (
                            <div key={link.itemId} className="flex items-center justify-between px-4 py-3">
                                <span className="font-medium">{getName(allItems, link.itemId)}</span>
                                {isOrgOrSysAdmin && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(link.itemId)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {isOrgOrSysAdmin && (
                    <div className="flex gap-2">
                        <select
                            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex-1"
                            value={selectedItem}
                            onChange={(e) => setSelectedItem(e.target.value)}
                        >
                            <option value="">{t("common.select")}</option>
                            {allItems.filter((i) => !linkedItemIds.has(i.id)).map((i) => (
                                <option key={i.id} value={i.id}>{i.name}</option>
                            ))}
                        </select>
                        <Button size="sm" onClick={addItem} disabled={!selectedItem || savingItem}>
                            {savingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        </Button>
                    </div>
                )}
            </section>

            {/* ── Involved Characters / NPCs (by Step) ─────────────────── */}
            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <Users2 className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">{t("quests.links.stepCharacters")}</h3>
                </div>

                {questSteps.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("common.noResults")}</p>
                ) : (
                    <div className="divide-y rounded-md border">
                        {questSteps
                            .filter((step) => (stepCharacters[step.id] ?? []).length > 0)
                            .map((step, idx) => (
                                <div key={step.id} className="px-4 py-3 space-y-1.5">
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Step {idx + 1}: {step.summary}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(stepCharacters[step.id] ?? []).map((link) => (
                                            <Badge key={link.characterId} variant="secondary">
                                                {getName(allCharacters, link.characterId)}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        {questSteps.every((step) => (stepCharacters[step.id] ?? []).length === 0) && (
                            <div className="px-4 py-3">
                                <p className="text-sm text-muted-foreground">{t("quests.steps.characters.empty")}</p>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}
