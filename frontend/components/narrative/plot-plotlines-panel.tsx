"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
    narrativeApi,
    NarrativePlotDto,
    NarrativePlotPlotlineLinkDto,
    NarrativePlotlineDto,
} from "@/utils/narrative-api";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { NarrativeStatusBadge } from "./narrative-status-badge";

interface PlotPlotlinesPanelProps {
    eventId: string;
    plot: NarrativePlotDto;
    initialPlotlineLinks: NarrativePlotPlotlineLinkDto[];
    canWrite: boolean;
    token: string;
}

export function PlotPlotlinesPanel({ eventId, plot, initialPlotlineLinks, canWrite, token }: PlotPlotlinesPanelProps) {
    const t = useTranslations("narrative");
    const [links, setLinks] = useState<NarrativePlotPlotlineLinkDto[]>(initialPlotlineLinks);
    const [allPlotlines, setAllPlotlines] = useState<NarrativePlotlineDto[]>([]);
    const [selected, setSelected] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        narrativeApi.listPlotlines(token, eventId).then(setAllPlotlines).catch(console.error);
    }, [eventId, token]);

    const linkedIds = new Set(links.map(l => l.plotlineId));
    const unlinked = allPlotlines.filter(p => !linkedIds.has(p.id));

    const handleAdd = async () => {
        if (!selected) return;
        setSaving(true);
        try {
            const link = await narrativeApi.upsertPlotPlotline(token, eventId, plot.id, selected, {
                sortOrder: links.length + 1,
            });
            setLinks(prev => [...prev.filter(l => l.plotlineId !== selected), link]);
            setSelected("");
            toast.success(t("plots.plotlines.add"));
        } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
    };

    const handleRemove = async (plotlineId: string) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.deletePlotPlotline(token, eventId, plot.id, plotlineId);
            setLinks(prev => prev.filter(l => l.plotlineId !== plotlineId));
        } catch (e: any) { toast.error(e.message); }
    };

    const getPlotlineName = (id: string) => allPlotlines.find(p => p.id === id)?.title || id;
    const getPlotlineStatus = (id: string) => allPlotlines.find(p => p.id === id)?.status;

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">{t("plots.plotlines.title")}</h2>

            {links.length === 0 ? (
                <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
                    {t("plots.plotlines.empty")}
                </div>
            ) : (
                <div className="divide-y rounded-md border">
                    {links.map(link => (
                        <div key={link.plotlineId} className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-3">
                                <span className="font-medium">{getPlotlineName(link.plotlineId)}</span>
                                {getPlotlineStatus(link.plotlineId) && (
                                    <NarrativeStatusBadge status={getPlotlineStatus(link.plotlineId)!} />
                                )}
                            </div>
                            {canWrite && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemove(link.plotlineId)}>
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
                        className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={selected}
                        onChange={e => setSelected(e.target.value)}
                    >
                        <option value="">{t("common.select")}</option>
                        {unlinked.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                    <Button size="sm" onClick={handleAdd} disabled={!selected || saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                        {t("plots.plotlines.add")}
                    </Button>
                </div>
            )}
        </div>
    );
}
