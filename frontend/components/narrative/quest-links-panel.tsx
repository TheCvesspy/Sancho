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
    NarrativeLocationDto,
    NarrativeLocationLinkDto,
    NarrativeDungeonFloorDto,
    NarrativeDungeonRoomDto,
} from "@/utils/narrative-api";
import { CharacterListItemDto, charactersApi } from "@/utils/characters-api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Plus, Loader2, Users, Shield, Package, Users2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface QuestLinksPanelProps {
    eventId: string;
    questId: string;
    initialCharacterLinks: NarrativeQuestCharacterLinkDto[];
    initialFactionLinks: NarrativeEntityFactionLinkDto[];
    initialItemLinks: NarrativeEntityItemLinkDto[];
    canWrite: boolean;
    token: string;
}

export function QuestLinksPanel({
    eventId,
    questId,
    initialCharacterLinks,
    initialFactionLinks,
    initialItemLinks,
    canWrite,
    token,
}: QuestLinksPanelProps) {
    const t = useTranslations("narrative");

    const [characterLinks, setCharacterLinks] = useState(initialCharacterLinks);
    const [factionLinks, setFactionLinks] = useState(initialFactionLinks);
    const [itemLinks, setItemLinks] = useState(initialItemLinks);

    // Step characters (read-only summary)
    const [questSteps, setQuestSteps] = useState<NarrativeQuestStepDto[]>([]);
    const [stepCharacters, setStepCharacters] = useState<Record<string, NarrativeQuestStepCharacterDto[]>>({});

    // Location links
    const [locationLinks, setLocationLinks] = useState<NarrativeLocationLinkDto[]>([]);

    // Lookup data
    const [allCharacters, setAllCharacters] = useState<CharacterListItemDto[]>([]);
    const [allFactions, setAllFactions] = useState<NarrativeFactionDto[]>([]);
    const [allItems, setAllItems] = useState<NarrativeItemDto[]>([]);
    const [allLocations, setAllLocations] = useState<NarrativeLocationDto[]>([]);

    // Add form state
    const [selectedChar, setSelectedChar] = useState("");
    const [charRole, setCharRole] = useState("");
    const [selectedFaction, setSelectedFaction] = useState("");
    const [selectedItem, setSelectedItem] = useState("");
    const [selectedLocation, setSelectedLocation] = useState("");
    const [savingChar, setSavingChar] = useState(false);
    const [savingFaction, setSavingFaction] = useState(false);
    const [savingItem, setSavingItem] = useState(false);
    const [savingLocation, setSavingLocation] = useState(false);

    // Dungeon modal state
    const [dungeonModalOpen, setDungeonModalOpen] = useState(false);
    const [dungeonModalLocationId, setDungeonModalLocationId] = useState("");
    const [dungeonModalFloors, setDungeonModalFloors] = useState<NarrativeDungeonFloorDto[]>([]);
    const [dungeonModalRooms, setDungeonModalRooms] = useState<NarrativeDungeonRoomDto[]>([]);
    const [dungeonSelectedFloor, setDungeonSelectedFloor] = useState("");
    const [dungeonSelectedRoom, setDungeonSelectedRoom] = useState("");
    const [dungeonLoadingFloors, setDungeonLoadingFloors] = useState(false);
    const [dungeonLoadingRooms, setDungeonLoadingRooms] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [chars, factions, items, steps, locations, locLinks] = await Promise.all([
                    charactersApi.listCharacters(token, eventId),
                    narrativeApi.listFactions(token, eventId),
                    narrativeApi.listItems(token, eventId),
                    narrativeApi.listQuestSteps(token, eventId, questId),
                    narrativeApi.listLocations(token, eventId),
                    narrativeApi.listQuestLocationLinks(token, eventId, questId),
                ]);
                setAllCharacters(chars);
                setAllFactions(factions);
                setAllItems(items);
                setQuestSteps(steps);
                setAllLocations(locations);
                setLocationLinks(locLinks);

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

    // ── Location helpers ───────────────────────────────────────────────────

    const openDungeonModal = async (locationId: string) => {
        setDungeonModalLocationId(locationId);
        setDungeonSelectedFloor("");
        setDungeonSelectedRoom("");
        setDungeonModalRooms([]);
        setDungeonModalOpen(true);

        setDungeonLoadingFloors(true);
        try {
            const floors = await narrativeApi.listFloors(token, eventId, locationId);
            setDungeonModalFloors(floors);
        } catch (e) { console.error(e); }
        finally { setDungeonLoadingFloors(false); }
    };

    const handleDungeonFloorChange = async (floorId: string) => {
        setDungeonSelectedFloor(floorId);
        setDungeonSelectedRoom("");
        setDungeonModalRooms([]);

        if (!floorId) return;
        setDungeonLoadingRooms(true);
        try {
            const rooms = await narrativeApi.listRooms(token, eventId, dungeonModalLocationId, floorId);
            setDungeonModalRooms(rooms);
        } catch (e) { console.error(e); }
        finally { setDungeonLoadingRooms(false); }
    };

    const addLocationDirect = async (locationId: string) => {
        setSavingLocation(true);
        try {
            await narrativeApi.upsertQuestLocationLink(token, eventId, questId, locationId, {});
            const links = await narrativeApi.listQuestLocationLinks(token, eventId, questId);
            setLocationLinks(links);
            setSelectedLocation("");
            toast.success(t("common.add"));
        } catch (e: any) { toast.error(e.message); } finally { setSavingLocation(false); }
    };

    const addLocationFromModal = async () => {
        if (!dungeonModalLocationId) return;
        setSavingLocation(true);
        try {
            const data: { floorId?: string | null; roomId?: string | null } = {};
            if (dungeonSelectedFloor) data.floorId = dungeonSelectedFloor;
            if (dungeonSelectedRoom) data.roomId = dungeonSelectedRoom;
            await narrativeApi.upsertQuestLocationLink(token, eventId, questId, dungeonModalLocationId, data);
            const links = await narrativeApi.listQuestLocationLinks(token, eventId, questId);
            setLocationLinks(links);
            setSelectedLocation("");
            setDungeonModalOpen(false);
            toast.success(t("common.add"));
        } catch (e: any) { toast.error(e.message); } finally { setSavingLocation(false); }
    };

    const handleAddLocationClick = () => {
        if (!selectedLocation) return;
        const loc = allLocations.find(l => l.id === selectedLocation);
        if (loc?.locationType === "Dungeon") {
            openDungeonModal(selectedLocation);
        } else {
            addLocationDirect(selectedLocation);
        }
    };

    const removeLocation = async (link: NarrativeLocationLinkDto) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.deleteQuestLocationLink(token, eventId, questId, link.locationId, {
                locationId: link.locationId,
                floorId: link.floorId,
                roomId: link.roomId,
            });
            setLocationLinks((prev) => prev.filter((l) => !(l.locationId === link.locationId && l.floorId === link.floorId && l.roomId === link.roomId)));
        } catch (e: any) { toast.error(e.message); }
    };

    const formatLocationGranularity = (link: NarrativeLocationLinkDto) => {
        if (link.roomId && link.floorName && link.roomName) return `${link.floorName} > ${link.roomName}`;
        if (link.floorId && link.floorName) return link.floorName;
        return t("locations.links.granularity.entireLocation");
    };

    const linkedLocationIds = new Set(locationLinks.map((l) => l.locationId));

    const getName = (list: { id: string; name: string }[], id: string) =>
        list.find((x) => x.id === id)?.name || id;

    const dungeonModalLocation = allLocations.find(l => l.id === dungeonModalLocationId);

    return (
        <div className="space-y-8">
            {/* ── Characters, Items, Locations — merged row ───────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Characters column */}
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
                                <div key={link.characterId} className="flex items-center justify-between px-3 py-2">
                                    <div className="min-w-0">
                                        <span className="font-medium text-sm">{getName(allCharacters, link.characterId)}</span>
                                        {link.role && <span className="ml-1.5 text-xs text-muted-foreground">({link.role})</span>}
                                    </div>
                                    {canWrite && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeCharacter(link.characterId)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {canWrite && (
                        <div className="space-y-2">
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                value={selectedChar}
                                onChange={(e) => setSelectedChar(e.target.value)}
                            >
                                <option value="">{t("common.select")}</option>
                                {allCharacters.filter((c) => !linkedCharIds.has(c.id)).map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <div className="flex gap-2">
                                <Input
                                    className="h-9 flex-1"
                                    placeholder="Role (optional)"
                                    value={charRole}
                                    onChange={(e) => setCharRole(e.target.value)}
                                />
                                <Button size="sm" onClick={addCharacter} disabled={!selectedChar || savingChar}>
                                    {savingChar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    )}
                </section>

                {/* Items column */}
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
                                <div key={link.itemId} className="flex items-center justify-between px-3 py-2">
                                    <span className="font-medium text-sm">{getName(allItems, link.itemId)}</span>
                                    {canWrite && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeItem(link.itemId)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {canWrite && (
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

                {/* Locations column */}
                <section className="space-y-3">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">{t("locations.links.locations")}</h3>
                    </div>

                    {locationLinks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("common.noDescription")}</p>
                    ) : (
                        <div className="divide-y rounded-md border">
                            {locationLinks.map((link, idx) => (
                                <div key={`${link.locationId}-${link.floorId}-${link.roomId}-${idx}`} className="flex items-center justify-between px-3 py-2">
                                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                        <span className="font-medium text-sm">{link.locationName}</span>
                                        <Badge variant="outline" className="text-xs">
                                            {formatLocationGranularity(link)}
                                        </Badge>
                                    </div>
                                    {canWrite && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeLocation(link)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {canWrite && (
                        <div className="flex gap-2">
                            <select
                                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex-1"
                                value={selectedLocation}
                                onChange={(e) => setSelectedLocation(e.target.value)}
                            >
                                <option value="">{t("common.select")}</option>
                                {allLocations.map((l) => (
                                    <option key={l.id} value={l.id}>{l.name}{l.locationType === "Dungeon" ? " (Dungeon)" : ""}</option>
                                ))}
                            </select>
                            <Button size="sm" onClick={handleAddLocationClick} disabled={!selectedLocation || savingLocation}>
                                {savingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            </Button>
                        </div>
                    )}
                </section>
            </div>

            {/* ── Dungeon Location Modal ───────────────────────────────── */}
            <Dialog open={dungeonModalOpen} onOpenChange={setDungeonModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("locations.dungeon.modal.title")}</DialogTitle>
                        <DialogDescription>
                            {t("locations.dungeon.modal.description", { name: dungeonModalLocation?.name ?? "" })}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Floor picker */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">{t("locations.links.granularity.floor")}</label>
                            <select
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                value={dungeonSelectedFloor}
                                onChange={(e) => handleDungeonFloorChange(e.target.value)}
                                disabled={dungeonLoadingFloors}
                            >
                                <option value="">
                                    {dungeonLoadingFloors ? t("common.loading") : t("locations.dungeon.selectFloor")}
                                </option>
                                {dungeonModalFloors.map((f) => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Room picker (only when floor selected) */}
                        {dungeonSelectedFloor && (
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">{t("locations.links.granularity.room")}</label>
                                <select
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    value={dungeonSelectedRoom}
                                    onChange={(e) => setDungeonSelectedRoom(e.target.value)}
                                    disabled={dungeonLoadingRooms}
                                >
                                    <option value="">
                                        {dungeonLoadingRooms ? t("common.loading") : t("locations.dungeon.selectRoom")}
                                    </option>
                                    {dungeonModalRooms.map((r) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Summary of what will be linked */}
                        <div className="rounded-md bg-muted/50 p-3 text-sm">
                            <span className="text-muted-foreground">{t("locations.dungeon.modal.linkingAs")}: </span>
                            <span className="font-medium">
                                {dungeonSelectedRoom
                                    ? `${dungeonModalFloors.find(f => f.id === dungeonSelectedFloor)?.name} > ${dungeonModalRooms.find(r => r.id === dungeonSelectedRoom)?.name}`
                                    : dungeonSelectedFloor
                                        ? dungeonModalFloors.find(f => f.id === dungeonSelectedFloor)?.name
                                        : t("locations.links.granularity.entireLocation")}
                            </span>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDungeonModalOpen(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={addLocationFromModal} disabled={savingLocation}>
                            {savingLocation ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {t("locations.dungeon.modal.addLink")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                                {canWrite && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFaction(link.factionId)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {canWrite && (
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
