"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
    narrativeApi,
    NarrativePlotlineDto,
    NarrativeEntityCharacterLinkDto,
    NarrativeEntityFactionLinkDto,
    NarrativeEntityItemLinkDto,
    NarrativeFactionDto,
    NarrativeItemDto,
    NarrativeLocationDto,
    NarrativeLocationLinkDto,
} from "@/utils/narrative-api";
import { CharacterListItemDto, charactersApi } from "@/utils/characters-api";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Loader2, Users, Shield, Package, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface PlotlineLinksPanelProps {
    eventId: string;
    plotline: NarrativePlotlineDto;
    initialCharacterLinks: NarrativeEntityCharacterLinkDto[];
    initialFactionLinks: NarrativeEntityFactionLinkDto[];
    initialItemLinks: NarrativeEntityItemLinkDto[];
    canWrite: boolean;
    token: string;
}

export function PlotlineLinksPanel({ eventId, plotline, initialCharacterLinks, initialFactionLinks, initialItemLinks, canWrite, token }: PlotlineLinksPanelProps) {
    const t = useTranslations("narrative");
    const [charLinks, setCharLinks] = useState(initialCharacterLinks);
    const [factionLinks, setFactionLinks] = useState(initialFactionLinks);
    const [itemLinks, setItemLinks] = useState(initialItemLinks);
    const [allChars, setAllChars] = useState<CharacterListItemDto[]>([]);
    const [allFactions, setAllFactions] = useState<NarrativeFactionDto[]>([]);
    const [allItems, setAllItems] = useState<NarrativeItemDto[]>([]);
    const [allLocations, setAllLocations] = useState<NarrativeLocationDto[]>([]);
    const [locationLinks, setLocationLinks] = useState<NarrativeLocationLinkDto[]>([]);
    const [selChar, setSelChar] = useState("");
    const [selFaction, setSelFaction] = useState("");
    const [selItem, setSelItem] = useState("");
    const [selLocation, setSelLocation] = useState("");
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            charactersApi.listCharacters(token, eventId),
            narrativeApi.listFactions(token, eventId),
            narrativeApi.listItems(token, eventId),
            narrativeApi.listLocations(token, eventId),
            narrativeApi.listPlotlineLocationLinks(token, eventId, plotline.id),
        ]).then(([c, f, i, l, ll]) => { setAllChars(c); setAllFactions(f); setAllItems(i); setAllLocations(l); setLocationLinks(ll); }).catch(console.error);
    }, [eventId, token]);

    const getName = (list: { id: string; name: string }[], id: string) => list.find(x => x.id === id)?.name || id;
    const linkedCharIds = new Set(charLinks.map(l => l.characterId));
    const linkedFactionIds = new Set(factionLinks.map(l => l.factionId));
    const linkedItemIds = new Set(itemLinks.map(l => l.itemId));

    const addChar = async () => { if (!selChar) return; setSaving("char"); try { const l = await narrativeApi.upsertPlotlineCharacter(token, eventId, plotline.id, selChar); setCharLinks(p => [...p.filter(x => x.characterId !== selChar), l]); setSelChar(""); } catch (e: any) { toast.error(e.message); } finally { setSaving(null); } };
    const remChar = async (id: string) => { if (!confirm(t("common.deleteConfirm"))) return; try { await narrativeApi.deletePlotlineCharacter(token, eventId, plotline.id, id); setCharLinks(p => p.filter(l => l.characterId !== id)); } catch (e: any) { toast.error(e.message); } };

    const addFaction = async () => { if (!selFaction) return; setSaving("faction"); try { const l = await narrativeApi.upsertPlotlineFaction(token, eventId, plotline.id, selFaction); setFactionLinks(p => [...p.filter(x => x.factionId !== selFaction), l]); setSelFaction(""); } catch (e: any) { toast.error(e.message); } finally { setSaving(null); } };
    const remFaction = async (id: string) => { if (!confirm(t("common.deleteConfirm"))) return; try { await narrativeApi.deletePlotlineFaction(token, eventId, plotline.id, id); setFactionLinks(p => p.filter(l => l.factionId !== id)); } catch (e: any) { toast.error(e.message); } };

    const addItem = async () => { if (!selItem) return; setSaving("item"); try { const l = await narrativeApi.upsertPlotlineItem(token, eventId, plotline.id, selItem); setItemLinks(p => [...p.filter(x => x.itemId !== selItem), l]); setSelItem(""); } catch (e: any) { toast.error(e.message); } finally { setSaving(null); } };
    const remItem = async (id: string) => { if (!confirm(t("common.deleteConfirm"))) return; try { await narrativeApi.deletePlotlineItem(token, eventId, plotline.id, id); setItemLinks(p => p.filter(l => l.itemId !== id)); } catch (e: any) { toast.error(e.message); } };

    const addLocation = async () => { if (!selLocation) return; setSaving("location"); try { await narrativeApi.upsertPlotlineLocationLink(token, eventId, plotline.id, selLocation); const links = await narrativeApi.listPlotlineLocationLinks(token, eventId, plotline.id); setLocationLinks(links); setSelLocation(""); } catch (e: any) { toast.error(e.message); } finally { setSaving(null); } };
    const remLocation = async (link: NarrativeLocationLinkDto) => { if (!confirm(t("common.deleteConfirm"))) return; try { await narrativeApi.deletePlotlineLocationLink(token, eventId, plotline.id, link.locationId, { floorId: link.floorId, roomId: link.roomId }); setLocationLinks(p => p.filter(l => !(l.locationId === link.locationId && l.floorId === link.floorId && l.roomId === link.roomId))); } catch (e: any) { toast.error(e.message); } };
    const formatLocGranularity = (link: NarrativeLocationLinkDto) => { if (link.roomId && link.floorName && link.roomName) return `${link.floorName} > ${link.roomName}`; if (link.floorId && link.floorName) return link.floorName; return t("locations.links.granularity.entireLocation"); };
    const linkedLocationIds = new Set(locationLinks.map(l => l.locationId));

    return (
        <div className="space-y-8">
            {/* Characters */}
            <section className="space-y-3">
                <div className="flex items-center gap-2"><Users className="h-5 w-5 text-muted-foreground" /><h3 className="text-lg font-semibold">{t("quests.links.characters")}</h3></div>
                {charLinks.length === 0 ? <p className="text-sm text-muted-foreground">{t("common.noDescription")}</p> : (
                    <div className="divide-y rounded-md border">{charLinks.map(l => (<div key={l.characterId} className="flex items-center justify-between px-4 py-3"><span>{getName(allChars, l.characterId)}</span>{canWrite && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remChar(l.characterId)}><Trash2 className="h-3.5 w-3.5" /></Button>}</div>))}</div>
                )}
                {canWrite && (
                    <div className="flex gap-2">
                        <select className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm" value={selChar} onChange={e => setSelChar(e.target.value)}>
                            <option value="">{t("common.select")}</option>
                            {allChars.filter(c => !linkedCharIds.has(c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <Button size="sm" onClick={addChar} disabled={!selChar || saving === "char"}>{saving === "char" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}</Button>
                    </div>
                )}
            </section>
            {/* Factions */}
            <section className="space-y-3">
                <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-muted-foreground" /><h3 className="text-lg font-semibold">{t("quests.links.factions")}</h3></div>
                {factionLinks.length === 0 ? <p className="text-sm text-muted-foreground">{t("common.noDescription")}</p> : (
                    <div className="divide-y rounded-md border">{factionLinks.map(l => (<div key={l.factionId} className="flex items-center justify-between px-4 py-3"><span>{getName(allFactions, l.factionId)}</span>{canWrite && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remFaction(l.factionId)}><Trash2 className="h-3.5 w-3.5" /></Button>}</div>))}</div>
                )}
                {canWrite && (
                    <div className="flex gap-2">
                        <select className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm" value={selFaction} onChange={e => setSelFaction(e.target.value)}>
                            <option value="">{t("common.select")}</option>
                            {allFactions.filter(f => !linkedFactionIds.has(f.id)).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        <Button size="sm" onClick={addFaction} disabled={!selFaction || saving === "faction"}>{saving === "faction" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}</Button>
                    </div>
                )}
            </section>
            {/* Items */}
            <section className="space-y-3">
                <div className="flex items-center gap-2"><Package className="h-5 w-5 text-muted-foreground" /><h3 className="text-lg font-semibold">{t("quests.links.items")}</h3></div>
                {itemLinks.length === 0 ? <p className="text-sm text-muted-foreground">{t("common.noDescription")}</p> : (
                    <div className="divide-y rounded-md border">{itemLinks.map(l => (<div key={l.itemId} className="flex items-center justify-between px-4 py-3"><span>{getName(allItems, l.itemId)}</span>{canWrite && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remItem(l.itemId)}><Trash2 className="h-3.5 w-3.5" /></Button>}</div>))}</div>
                )}
                {canWrite && (
                    <div className="flex gap-2">
                        <select className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm" value={selItem} onChange={e => setSelItem(e.target.value)}>
                            <option value="">{t("common.select")}</option>
                            {allItems.filter(i => !linkedItemIds.has(i.id)).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                        <Button size="sm" onClick={addItem} disabled={!selItem || saving === "item"}>{saving === "item" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}</Button>
                    </div>
                )}
            </section>
            {/* Locations */}
            <section className="space-y-3">
                <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-muted-foreground" /><h3 className="text-lg font-semibold">{t("locations.links.locations")}</h3></div>
                {locationLinks.length === 0 ? <p className="text-sm text-muted-foreground">{t("common.noDescription")}</p> : (
                    <div className="divide-y rounded-md border">{locationLinks.map((link, idx) => (
                        <div key={`${link.locationId}-${link.floorId}-${link.roomId}-${idx}`} className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-2 flex-wrap"><span className="font-medium">{link.locationName}</span><Badge variant="outline" className="text-xs">{formatLocGranularity(link)}</Badge></div>
                            {canWrite && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remLocation(link)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                        </div>
                    ))}</div>
                )}
                {canWrite && (
                    <div className="flex gap-2">
                        <select className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm" value={selLocation} onChange={e => setSelLocation(e.target.value)}>
                            <option value="">{t("common.select")}</option>
                            {allLocations.filter(l => !linkedLocationIds.has(l.id)).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                        <Button size="sm" onClick={addLocation} disabled={!selLocation || saving === "location"}>{saving === "location" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}</Button>
                    </div>
                )}
            </section>
        </div>
    );
}
