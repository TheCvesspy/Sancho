"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { CharacterAssignedItemDto, charactersApi } from "@/utils/characters-api";
import { NarrativeItemDto, narrativeApi } from "@/utils/narrative-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Loader2, Check, ChevronsUpDown, Package } from "lucide-react";
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
    const [selectedItemId, setSelectedItemId] = useState("");
    const [notes, setNotes] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);

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

    const handleAssign = async () => {
        if (!selectedItemId) return;
        setIsSaving(true);
        try {
            await charactersApi.assignItem(token, eventId, characterId, selectedItemId, {
                notes: notes.trim() || null
            });

            // Re-fetch to get updated list
            const latest = await charactersApi.listCharacterItems(token, eventId, characterId);
            setItems(latest);

            setSelectedItemId("");
            setNotes("");
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
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
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-500" />
                {t("items.title")}
            </h2>

            {canWrite && (
                <div className="flex flex-col sm:flex-row items-end gap-4 p-4 rounded-lg border bg-card flex-wrap">
                    <div className="space-y-1 flex-1 min-w-[200px]">
                        <label className="text-sm font-medium">{t("items.selectItem")}</label>
                        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={pickerOpen}
                                    className="w-full justify-between h-10 px-3 bg-background font-normal"
                                >
                                    {selectedItemId
                                        ? availableItems.find(i => i.id === selectedItemId)?.name
                                        : t("items.selectItem")}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder={t("items.searchItem")} />
                                    <CommandList>
                                        <CommandEmpty>No results.</CommandEmpty>
                                        <CommandGroup>
                                            {unassignedItems.map((item) => (
                                                <CommandItem
                                                    key={item.id}
                                                    value={item.name}
                                                    onSelect={() => {
                                                        setSelectedItemId(selectedItemId === item.id ? "" : item.id);
                                                        setPickerOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedItemId === item.id ? "opacity-100" : "opacity-0"
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

                    <div className="space-y-1 w-full sm:w-auto flex-1 min-w-[200px]">
                        <label className="text-sm font-medium">{t("items.notes")}</label>
                        <Input
                            value={notes}
                            placeholder={t("items.notesPlaceholder")}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <Button onClick={handleAssign} disabled={!selectedItemId || isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                        {t("items.assign")}
                    </Button>
                </div>
            )}

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
