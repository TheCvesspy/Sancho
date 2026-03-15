"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
    narrativeApi,
    NarrativePlotDto,
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

interface PlotLinksPanelProps {
    eventId: string;
    plot: NarrativePlotDto;
    initialCharacterLinks: NarrativeEntityCharacterLinkDto[];
    initialFactionLinks: NarrativeEntityFactionLinkDto[];
    initialItemLinks: NarrativeEntityItemLinkDto[];
    canWrite: boolean;
    token: string;
}

export function PlotLinksPanel({ eventId, plot, initialCharacterLinks, initialFactionLinks, initialItemLinks, canWrite, token }: PlotLinksPanelProps) {
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
            narrativeApi.listPlotLocationLinks(token, eventId, plot.id),
        ]).then(([c, f, i, l, ll]) => { setAllChars(c); setAllFactions(f); setAllItems(i); setAllLocations(l); setLocationLinks(ll); }).catch(console.error);
    }, [eventId, token]);

    const getName = (list: { id: string; name: string }[], id: string) => list.find(x => x.id === id)?.name || id;
    const linkedCharIds = new Set(charLinks.map(l => l.characterId));
    const linkedFactionIds = new Set(factionLinks.map(l => l.factionId));
    const linkedItemIds = new Set(itemLinks.map(l => l.itemId));

    const addChar = async () => { if (!selChar) return; setSaving("char"); try { const l = await narrativeApi.upsertPlotCharacter(token, eventId, plot.id, selChar); setCharLinks(p => [...p.filter(x => x.characterId !== selChar), l]); setSelChar(""); } catch (e: any) { toast.error(e.message); } finally { setSaving(null); } };
    const remChar = async (id: string) => { if (!confirm(t("common.deleteConfirm"))) return; try { await narrativeApi.deletePlotCharacter(token, eventId, plot.id, id); setCharLinks(p => p.filter(l => l.characterId !== id)); } catch (e: any) { toast.error(e.message); } };

    const addFaction = async () => { if (!selFaction) return; setSaving("faction"); try { const l = await narrativeApi.upsertPlotFaction(token, eventId, plot.id, selFaction); setFactionLinks(p => [...p.filter(x => x.factionId !== selFaction), l]); setSelFaction(""); } catch (e: any) { toast.error(e.message); } finally { setSaving(null); } };
    const remFaction = async (id: string) => { if (!confirm(t("common.deleteConfirm"))) return; try { await narrativeApi.deletePlotFaction(token, eventId, plot.id, id); setFactionLinks(p => p.filter(l => l.factionId !== id)); } catch (e: any) { toast.error(e.message); } };

    const addItem = async () => { if (!selItem) return; setSaving("item"); try { const l = await narrativeApi.upsertPlotItem(token, eventId, plot.id, selItem); setItemLinks(p => [...p.filter(x => x.itemId !== selItem), l]); setSelItem(""); } catch (e: any) { toast.error(e.message); } finally { setSaving(null); } };
    const remItem = async (id: string) => { if (!confirm(t("common.deleteConfirm"))) return; try { await narrativeApi.deletePlotItem(token, eventId, plot.id, id); setItemLinks(p => p.filter(l => l.itemId !== id)); } catch (e: any) { toast.error(e.message); } };

    const addLocation = async () => { if (!selLocation) return; setSaving("location"); try { await narrativeApi.upsertPlotLocationLink(token, eventId, plot.id, selLocation); const links = await narrativeApi.listPlotLocationLinks(token, eventId, plot.id); setLocationLinks(links); setSelLocation(""); } catch (e: any) { toast.error(e.message); } finally { setSaving(null); } };
    const remLocation = async (link: NarrativeLocationLinkDto) => { if (!confirm(t("common.deleteConfirm"))) return; try { await narrativeApi.deletePlotLocationLink(token, eventId, plot.id, link.locationId, { floorId: link.floorId, roomId: link.roomId }); setLocationLinks(p => p.filter(l => !(l.locationId === link.locationId && l.floorId === link.floorId && l.roomId === link.roomId))); } catch (e: any) { toast.error(e.message); } };
    const formatLocGranularity = (link: NarrativeLocationLinkDto) => { if (link.roomId && link.floorName && link.roomName) return `${link.floorName} > ${link.roomName}`; if (link.floorId && link.floorName) return link.floorName; return t("locations.links.granularity.entireLocation"); };
    const linkedLocationIds = new Set(locationLinks.map(l => l.locationId));

    const Section = ({ icon: Icon, title, items, onRemove, all, linkedIds, sel, onSel, onAdd, saveKey }: any) => (
        <section className="space-y-3">
            <div className="flex items-center gap-2"><Icon className="h-5 w-5 text-muted-foreground" /><h3 className="text-lg font-semibold">{title}</h3></div>
            {items.length === 0 ? <p className="text-sm text-muted-foreground">{t("common.noDescription")}</p> : (
                <div className="divide-y rounded-md border">{items.map((l: any) => {
                    const id = l.characterId || l.factionId || l.itemId;
                    return (<div key={id} className="flex items-center justify-between px-4 py-3"><span>{getName(all, id)}</span>{canWrite && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onRemove(id)}><Trash2 className="h-3.5 w-3.5" /></Button>}</div>);
                })}</div>
            )}
            {canWrite && (
                <div className="flex gap-2">
                    <select className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm" value={sel} onChange={e => onSel(e.target.value)}>
                        <option value="">{t("common.select")}</option>
                        {all.filter((x: any) => !linkedIds.has(x.id)).map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                    <Button size="sm" onClick={onAdd} disabled={!sel || saving === saveKey}>{saving === saveKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}</Button>
                </div>
            )}
        </section>
    );

    return (
        <div className="space-y-8">
            <Section icon={Users} title={t("quests.links.characters")} items={charLinks} onRemove={remChar} all={allChars} linkedIds={linkedCharIds} sel={selChar} onSel={setSelChar} onAdd={addChar} saveKey="char" />
            <Section icon={Shield} title={t("quests.links.factions")} items={factionLinks} onRemove={remFaction} all={allFactions} linkedIds={linkedFactionIds} sel={selFaction} onSel={setSelFaction} onAdd={addFaction} saveKey="faction" />
            <Section icon={Package} title={t("quests.links.items")} items={itemLinks} onRemove={remItem} all={allItems} linkedIds={linkedItemIds} sel={selItem} onSel={setSelItem} onAdd={addItem} saveKey="item" />
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
