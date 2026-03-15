"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
    narrativeApi,
    NarrativeLocationLinkDto,
    NarrativeQuestDto,
    NarrativePlotlineDto,
    NarrativePlotDto,
    NarrativeDungeonFloorDto,
} from "@/utils/narrative-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Loader2, Swords, BookOpen, MapPin } from "lucide-react";
import { toast } from "sonner";

interface LocationLinksPanelProps {
    eventId: string;
    locationId: string;
    locationType: string;
    floors: NarrativeDungeonFloorDto[];
    canWrite: boolean;
    token: string;
}

type GranularityLevel = "location" | "floor" | "room";

export function LocationLinksPanel({
    eventId,
    locationId,
    locationType,
    floors,
    canWrite,
    token,
}: LocationLinksPanelProps) {
    const t = useTranslations("narrative");
    const isDungeon = locationType.toLowerCase() === "dungeon";

    // Links state
    const [questLinks, setQuestLinks] = useState<NarrativeLocationLinkDto[]>([]);
    const [plotlineLinks, setPlotlineLinks] = useState<NarrativeLocationLinkDto[]>([]);
    const [plotLinks, setPlotLinks] = useState<NarrativeLocationLinkDto[]>([]);

    // Lookup data
    const [allQuests, setAllQuests] = useState<NarrativeQuestDto[]>([]);
    const [allPlotlines, setAllPlotlines] = useState<NarrativePlotlineDto[]>([]);
    const [allPlots, setAllPlots] = useState<NarrativePlotDto[]>([]);

    // Add form state for each section
    const [selectedQuestId, setSelectedQuestId] = useState("");
    const [questGranularity, setQuestGranularity] = useState<GranularityLevel>("location");
    const [questFloorId, setQuestFloorId] = useState("");
    const [questRoomId, setQuestRoomId] = useState("");
    const [savingQuest, setSavingQuest] = useState(false);

    const [selectedPlotlineId, setSelectedPlotlineId] = useState("");
    const [plotlineGranularity, setPlotlineGranularity] = useState<GranularityLevel>("location");
    const [plotlineFloorId, setPlotlineFloorId] = useState("");
    const [plotlineRoomId, setPlotlineRoomId] = useState("");
    const [savingPlotline, setSavingPlotline] = useState(false);

    const [selectedPlotId, setSelectedPlotId] = useState("");
    const [plotGranularity, setPlotGranularity] = useState<GranularityLevel>("location");
    const [plotFloorId, setPlotFloorId] = useState("");
    const [plotRoomId, setPlotRoomId] = useState("");
    const [savingPlot, setSavingPlot] = useState(false);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [quests, plotlines, plots, qLinks, plLinks, ptLinks] = await Promise.all([
                    narrativeApi.listQuests(token, eventId),
                    narrativeApi.listPlotlines(token, eventId),
                    narrativeApi.listPlots(token, eventId),
                    narrativeApi.listLocationQuestLinks(token, eventId, locationId),
                    narrativeApi.listLocationPlotlineLinks(token, eventId, locationId),
                    narrativeApi.listLocationPlotLinks(token, eventId, locationId),
                ]);
                setAllQuests(quests);
                setAllPlotlines(plotlines);
                setAllPlots(plots);
                setQuestLinks(qLinks);
                setPlotlineLinks(plLinks);
                setPlotLinks(ptLinks);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [token, eventId, locationId]);

    const getGranularityIds = (granularity: GranularityLevel, floorId: string, roomId: string) => {
        if (granularity === "floor") return { floorId: floorId || null, roomId: null };
        if (granularity === "room") return { floorId: floorId || null, roomId: roomId || null };
        return { floorId: null, roomId: null };
    };

    const formatGranularityBadge = (link: NarrativeLocationLinkDto) => {
        if (link.roomId && link.floorName && link.roomName) {
            return `${link.floorName} > ${link.roomName}`;
        }
        if (link.floorId && link.floorName) {
            return link.floorName;
        }
        return t("locations.links.granularity.entireLocation");
    };

    // ── Quest Links ──

    const addQuestLink = async () => {
        if (!selectedQuestId) return;
        const { floorId, roomId } = getGranularityIds(questGranularity, questFloorId, questRoomId);
        setSavingQuest(true);
        try {
            await narrativeApi.upsertLocationQuestLink(token, eventId, locationId, selectedQuestId, {
                floorId,
                roomId,
            });
            // Refresh links
            const links = await narrativeApi.listLocationQuestLinks(token, eventId, locationId);
            setQuestLinks(links);
            setSelectedQuestId("");
            setQuestGranularity("location");
            setQuestFloorId("");
            setQuestRoomId("");
            toast.success(t("locations.notifications.linkAdded"));
        } catch (error: any) {
            toast.error(error.message || t("common.error"));
        } finally {
            setSavingQuest(false);
        }
    };

    const removeQuestLink = async (link: NarrativeLocationLinkDto) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.deleteLocationQuestLink(token, eventId, locationId, link.questId!, {
                locationId,
                floorId: link.floorId,
                roomId: link.roomId,
            });
            setQuestLinks((prev) => prev.filter((l) => !(l.questId === link.questId && l.floorId === link.floorId && l.roomId === link.roomId)));
            toast.success(t("locations.notifications.linkRemoved"));
        } catch (error: any) {
            toast.error(error.message || t("common.error"));
        }
    };

    // ── Plotline Links ──

    const addPlotlineLink = async () => {
        if (!selectedPlotlineId) return;
        const { floorId, roomId } = getGranularityIds(plotlineGranularity, plotlineFloorId, plotlineRoomId);
        setSavingPlotline(true);
        try {
            await narrativeApi.upsertLocationPlotlineLink(token, eventId, locationId, selectedPlotlineId, {
                floorId,
                roomId,
            });
            const links = await narrativeApi.listLocationPlotlineLinks(token, eventId, locationId);
            setPlotlineLinks(links);
            setSelectedPlotlineId("");
            setPlotlineGranularity("location");
            setPlotlineFloorId("");
            setPlotlineRoomId("");
            toast.success(t("locations.notifications.linkAdded"));
        } catch (error: any) {
            toast.error(error.message || t("common.error"));
        } finally {
            setSavingPlotline(false);
        }
    };

    const removePlotlineLink = async (link: NarrativeLocationLinkDto) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.deleteLocationPlotlineLink(token, eventId, locationId, link.plotlineId!, {
                locationId,
                floorId: link.floorId,
                roomId: link.roomId,
            });
            setPlotlineLinks((prev) => prev.filter((l) => !(l.plotlineId === link.plotlineId && l.floorId === link.floorId && l.roomId === link.roomId)));
            toast.success(t("locations.notifications.linkRemoved"));
        } catch (error: any) {
            toast.error(error.message || t("common.error"));
        }
    };

    // ── Plot Links ──

    const addPlotLink = async () => {
        if (!selectedPlotId) return;
        const { floorId, roomId } = getGranularityIds(plotGranularity, plotFloorId, plotRoomId);
        setSavingPlot(true);
        try {
            await narrativeApi.upsertLocationPlotLink(token, eventId, locationId, selectedPlotId, {
                floorId,
                roomId,
            });
            const links = await narrativeApi.listLocationPlotLinks(token, eventId, locationId);
            setPlotLinks(links);
            setSelectedPlotId("");
            setPlotGranularity("location");
            setPlotFloorId("");
            setPlotRoomId("");
            toast.success(t("locations.notifications.linkAdded"));
        } catch (error: any) {
            toast.error(error.message || t("common.error"));
        } finally {
            setSavingPlot(false);
        }
    };

    const removePlotLink = async (link: NarrativeLocationLinkDto) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.deleteLocationPlotLink(token, eventId, locationId, link.plotId!, {
                locationId,
                floorId: link.floorId,
                roomId: link.roomId,
            });
            setPlotLinks((prev) => prev.filter((l) => !(l.plotId === link.plotId && l.floorId === link.floorId && l.roomId === link.roomId)));
            toast.success(t("locations.notifications.linkRemoved"));
        } catch (error: any) {
            toast.error(error.message || t("common.error"));
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* ── Quests ── */}
            <LinkSection
                icon={<Swords className="h-5 w-5 text-muted-foreground" />}
                title={t("locations.links.quests")}
                links={questLinks}
                nameKey="questTitle"
                canWrite={canWrite}
                onRemove={removeQuestLink}
                formatBadge={formatGranularityBadge}
                addForm={
                    canWrite ? (
                        <GranularityAddForm
                            items={allQuests.map((q) => ({ id: q.id, name: q.title }))}
                            selectedId={selectedQuestId}
                            onSelectId={setSelectedQuestId}
                            isDungeon={isDungeon}
                            floors={floors}
                            granularity={questGranularity}
                            onGranularityChange={setQuestGranularity}
                            floorId={questFloorId}
                            onFloorChange={setQuestFloorId}
                            roomId={questRoomId}
                            onRoomChange={setQuestRoomId}
                            onAdd={addQuestLink}
                            saving={savingQuest}
                            t={t}
                        />
                    ) : null
                }
            />

            {/* ── Plotlines ── */}
            <LinkSection
                icon={<BookOpen className="h-5 w-5 text-muted-foreground" />}
                title={t("locations.links.plotlines")}
                links={plotlineLinks}
                nameKey="plotlineTitle"
                canWrite={canWrite}
                onRemove={removePlotlineLink}
                formatBadge={formatGranularityBadge}
                addForm={
                    canWrite ? (
                        <GranularityAddForm
                            items={allPlotlines.map((p) => ({ id: p.id, name: p.title }))}
                            selectedId={selectedPlotlineId}
                            onSelectId={setSelectedPlotlineId}
                            isDungeon={isDungeon}
                            floors={floors}
                            granularity={plotlineGranularity}
                            onGranularityChange={setPlotlineGranularity}
                            floorId={plotlineFloorId}
                            onFloorChange={setPlotlineFloorId}
                            roomId={plotlineRoomId}
                            onRoomChange={setPlotlineRoomId}
                            onAdd={addPlotlineLink}
                            saving={savingPlotline}
                            t={t}
                        />
                    ) : null
                }
            />

            {/* ── Plots ── */}
            <LinkSection
                icon={<MapPin className="h-5 w-5 text-muted-foreground" />}
                title={t("locations.links.plots")}
                links={plotLinks}
                nameKey="plotTitle"
                canWrite={canWrite}
                onRemove={removePlotLink}
                formatBadge={formatGranularityBadge}
                addForm={
                    canWrite ? (
                        <GranularityAddForm
                            items={allPlots.map((p) => ({ id: p.id, name: p.title }))}
                            selectedId={selectedPlotId}
                            onSelectId={setSelectedPlotId}
                            isDungeon={isDungeon}
                            floors={floors}
                            granularity={plotGranularity}
                            onGranularityChange={setPlotGranularity}
                            floorId={plotFloorId}
                            onFloorChange={setPlotFloorId}
                            roomId={plotRoomId}
                            onRoomChange={setPlotRoomId}
                            onAdd={addPlotLink}
                            saving={savingPlot}
                            t={t}
                        />
                    ) : null
                }
            />
        </div>
    );
}

// ── LinkSection ──

interface LinkSectionProps {
    icon: React.ReactNode;
    title: string;
    links: NarrativeLocationLinkDto[];
    nameKey: "questTitle" | "plotlineTitle" | "plotTitle";
    canWrite: boolean;
    onRemove: (link: NarrativeLocationLinkDto) => void;
    formatBadge: (link: NarrativeLocationLinkDto) => string;
    addForm: React.ReactNode;
}

function LinkSection({ icon, title, links, nameKey, canWrite, onRemove, formatBadge, addForm }: LinkSectionProps) {
    return (
        <section className="space-y-3">
            <div className="flex items-center gap-2">
                {icon}
                <h3 className="text-lg font-semibold">{title}</h3>
            </div>

            {links.length === 0 ? (
                <p className="text-sm text-muted-foreground">No links yet.</p>
            ) : (
                <div className="divide-y rounded-md border">
                    {links.map((link, idx) => (
                        <div key={idx} className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{link[nameKey] || "Unknown"}</span>
                                <Badge variant="outline" className="text-xs">
                                    {formatBadge(link)}
                                </Badge>
                            </div>
                            {canWrite && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onRemove(link)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {addForm}
        </section>
    );
}

// ── GranularityAddForm ──

interface GranularityAddFormProps {
    items: { id: string; name: string }[];
    selectedId: string;
    onSelectId: (id: string) => void;
    isDungeon: boolean;
    floors: NarrativeDungeonFloorDto[];
    granularity: GranularityLevel;
    onGranularityChange: (g: GranularityLevel) => void;
    floorId: string;
    onFloorChange: (id: string) => void;
    roomId: string;
    onRoomChange: (id: string) => void;
    onAdd: () => void;
    saving: boolean;
    t: any;
}

function GranularityAddForm({
    items,
    selectedId,
    onSelectId,
    isDungeon,
    floors,
    granularity,
    onGranularityChange,
    floorId,
    onFloorChange,
    roomId,
    onRoomChange,
    onAdd,
    saving,
    t,
}: GranularityAddFormProps) {
    const selectedFloor = floors.find((f) => f.id === floorId);
    const rooms = selectedFloor?.rooms || [];

    return (
        <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
            <div className="flex gap-2 flex-wrap">
                <select
                    className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex-1 min-w-[160px]"
                    value={selectedId}
                    onChange={(e) => onSelectId(e.target.value)}
                >
                    <option value="">{t("common.select")}</option>
                    {items.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.name}
                        </option>
                    ))}
                </select>

                {isDungeon && (
                    <Select value={granularity} onValueChange={(v) => {
                        onGranularityChange(v as GranularityLevel);
                        if (v === "location") { onFloorChange(""); onRoomChange(""); }
                        if (v === "floor") { onRoomChange(""); }
                    }}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="location">{t("locations.links.granularity.entireLocation")}</SelectItem>
                            <SelectItem value="floor">{t("locations.links.granularity.specificFloor")}</SelectItem>
                            <SelectItem value="room">{t("locations.links.granularity.specificRoom")}</SelectItem>
                        </SelectContent>
                    </Select>
                )}

                <Button size="sm" onClick={onAdd} disabled={!selectedId || saving || (isDungeon && granularity === "floor" && !floorId) || (isDungeon && granularity === "room" && (!floorId || !roomId))}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
            </div>

            {isDungeon && (granularity === "floor" || granularity === "room") && (
                <div className="flex gap-2 flex-wrap">
                    <Select value={floorId} onValueChange={(v) => { onFloorChange(v); onRoomChange(""); }}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder={t("locations.links.granularity.floor")} />
                        </SelectTrigger>
                        <SelectContent>
                            {floors.map((f) => (
                                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {granularity === "room" && floorId && (
                        <Select value={roomId} onValueChange={onRoomChange}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder={t("locations.links.granularity.room")} />
                            </SelectTrigger>
                            <SelectContent>
                                {rooms.map((r) => (
                                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            )}
        </div>
    );
}
