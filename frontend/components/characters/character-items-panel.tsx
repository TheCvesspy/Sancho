"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { CharacterAssignedItemDto, charactersApi } from "@/utils/characters-api";
import { NarrativeItemDto, narrativeApi } from "@/utils/narrative-api";
import { Button } from "@/components/ui/button";
import { Trash2, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AssignItemDialog } from "./assign-item-dialog";

interface CharacterItemsPanelProps {
    characterId: string;
    eventId: string;
    initialItems: CharacterAssignedItemDto[];
    canWrite: boolean;
    token: string;
}

export function CharacterItemsPanel({ characterId, eventId, initialItems, canWrite, token }: CharacterItemsPanelProps) {
    const t = useTranslations("characters");
    const [items, setItems] = useState<CharacterAssignedItemDto[]>(initialItems);

    const [availableItems, setAvailableItems] = useState<NarrativeItemDto[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const allItems = await narrativeApi.listItems(token, eventId);
                setAvailableItems(allItems);
            } catch (e) {
                console.error(e);
            }
        };
        fetchData();
    }, [eventId, token]);

    const refreshItems = async () => {
        try {
            const latest = await charactersApi.listCharacterItems(token, eventId, characterId);
            setItems(latest);
        } catch (e) {
            console.error(e);
        }
    };

    const handleRemove = async (itemId: string) => {
        if (!confirm(t("items.confirmRemove"))) return;
        try {
            await charactersApi.removeItem(token, eventId, characterId, itemId);
            setItems(prev => prev.filter(i => i.itemId !== itemId));
        } catch (error) {
            console.error(error);
        }
    };

    // Filter out already-assigned items from picker
    const assignedItemIds = new Set(items.map(i => i.itemId));
    const unassignedItems = availableItems.filter(i => !assignedItemIds.has(i.id));

    const statusBadgeClass = (status: string | null) => {
        if (!status) return "";
        const s = status.toLowerCase();
        if (s === "final") return "border-green-300 bg-green-100 text-green-800";
        if (s === "ready") return "border-blue-300 bg-blue-100 text-blue-800";
        return "border-amber-300 bg-amber-100 text-amber-800";
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                    <Package className="h-5 w-5 text-orange-500" />
                    {t("items.title")}
                </h2>
                {canWrite && (
                    <AssignItemDialog
                        characterId={characterId}
                        eventId={eventId}
                        token={token}
                        availableItems={unassignedItems}
                        onItemAssigned={refreshItems}
                    />
                )}
            </div>

            <div className="rounded-md border bg-card">
                <div className="grid grid-cols-[2fr_2fr_1fr_2fr_auto] gap-4 p-4 font-semibold border-b bg-muted/50">
                    <div>{t("fields.name")}</div>
                    <div>{t("relationships.description")}</div>
                    <div>Status</div>
                    <div>{t("items.notes")}</div>
                    {canWrite && <div className="w-10"></div>}
                </div>
                {items.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">{t("items.emptyState")}</div>
                ) : (
                    <div className="divide-y">
                        {items.map(item => (
                            <div key={item.itemId} className="grid grid-cols-[2fr_2fr_1fr_2fr_auto] gap-4 p-4 items-center">
                                <div className="font-medium">{item.itemName}</div>
                                <div className="text-sm text-muted-foreground truncate" title={item.itemDescription || ""}>
                                    {item.itemDescription || "—"}
                                </div>
                                <div>
                                    {item.itemStatus && (
                                        <Badge variant="outline" className={`text-[10px] uppercase ${statusBadgeClass(item.itemStatus)}`}>
                                            {item.itemStatus}
                                        </Badge>
                                    )}
                                </div>
                                <div className="text-sm text-muted-foreground truncate" title={item.assignmentNotes || ""}>
                                    {item.assignmentNotes || "—"}
                                </div>
                                {canWrite && (
                                    <Button variant="ghost" size="icon" onClick={() => handleRemove(item.itemId)} className="text-destructive">
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
