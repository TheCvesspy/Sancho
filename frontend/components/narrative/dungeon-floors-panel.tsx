"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
    NarrativeDungeonFloorDto,
    NarrativeDungeonRoomDto,
    narrativeApi,
} from "@/utils/narrative-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { EditableRichText } from "@/components/ui/editable-rich-text";
import {
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Plus,
    Pencil,
    Trash2,
    Check,
    X,
    FileText,
    Loader2,
} from "lucide-react";
import { DungeonFloorDocumentsPanel } from "./dungeon-floor-documents-panel";
import { DungeonRoomDocumentsPanel } from "./dungeon-room-documents-panel";

interface DungeonFloorsPanelProps {
    eventId: string;
    locationId: string;
    initialFloors: NarrativeDungeonFloorDto[];
    canWrite: boolean;
    token: string;
    onFloorsChanged: (floors: NarrativeDungeonFloorDto[]) => void;
}

export function DungeonFloorsPanel({
    eventId,
    locationId,
    initialFloors,
    canWrite,
    token,
    onFloorsChanged,
}: DungeonFloorsPanelProps) {
    const t = useTranslations("narrative");

    const [floors, setFloors] = useState<NarrativeDungeonFloorDto[]>(
        [...initialFloors].sort((a, b) => a.sortOrder - b.sortOrder)
    );
    const [openFloors, setOpenFloors] = useState<Set<string>>(new Set());
    const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
    const [editingFloorName, setEditingFloorName] = useState("");
    const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
    const [editingRoomName, setEditingRoomName] = useState("");
    const [addFloorDialogOpen, setAddFloorDialogOpen] = useState(false);
    const [newFloorName, setNewFloorName] = useState("");
    const [addRoomForFloorId, setAddRoomForFloorId] = useState<string | null>(null);
    const [newRoomName, setNewRoomName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateFloors = (newFloors: NarrativeDungeonFloorDto[]) => {
        const sorted = [...newFloors].sort((a, b) => a.sortOrder - b.sortOrder);
        setFloors(sorted);
        onFloorsChanged(sorted);
    };

    const toggleFloor = (floorId: string) => {
        setOpenFloors((prev) => {
            const next = new Set(prev);
            if (next.has(floorId)) next.delete(floorId);
            else next.add(floorId);
            return next;
        });
    };

    // ── Floor CRUD ──

    const handleAddFloor = async () => {
        if (!newFloorName.trim()) return;
        setIsSubmitting(true);
        try {
            const created = await narrativeApi.createFloor(token, eventId, locationId, {
                name: newFloorName.trim(),
            });
            // created floor comes back with rooms: [] from the API
            const floorWithRooms: NarrativeDungeonFloorDto = { ...created, rooms: created.rooms || [] };
            updateFloors([...floors, floorWithRooms]);
            toast.success(t("locations.floors.notifications.created"));
            setAddFloorDialogOpen(false);
            setNewFloorName("");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || t("common.error"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditFloorName = async (floorId: string) => {
        if (!editingFloorName.trim()) return;
        try {
            const updated = await narrativeApi.updateFloor(token, eventId, locationId, floorId, {
                name: editingFloorName.trim(),
            });
            updateFloors(
                floors.map((f) =>
                    f.id === floorId ? { ...f, name: updated.name, updatedAt: updated.updatedAt } : f
                )
            );
            toast.success(t("locations.floors.notifications.updated"));
            setEditingFloorId(null);
        } catch (error) {
            console.error(error);
            toast.error(t("common.error"));
        }
    };

    const handleDeleteFloor = async (floorId: string) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.deleteFloor(token, eventId, locationId, floorId);
            updateFloors(floors.filter((f) => f.id !== floorId));
            toast.success(t("locations.floors.notifications.deleted"));
        } catch (error) {
            console.error(error);
            toast.error(t("common.error"));
        }
    };

    const handleReorderFloor = async (floorId: string, direction: "up" | "down") => {
        const idx = floors.findIndex((f) => f.id === floorId);
        if (idx === -1) return;
        if (direction === "up" && idx === 0) return;
        if (direction === "down" && idx === floors.length - 1) return;

        const newFloors = [...floors];
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        // Swap sort orders
        const tempOrder = newFloors[idx].sortOrder;
        newFloors[idx] = { ...newFloors[idx], sortOrder: newFloors[swapIdx].sortOrder };
        newFloors[swapIdx] = { ...newFloors[swapIdx], sortOrder: tempOrder };

        updateFloors(newFloors);

        try {
            const sorted = [...newFloors].sort((a, b) => a.sortOrder - b.sortOrder);
            await narrativeApi.reorderFloors(token, eventId, locationId,
                sorted.map((f, i) => ({ id: f.id, sortOrder: i }))
            );
            toast.success(t("locations.floors.notifications.reordered"));
        } catch (error) {
            console.error(error);
            // Revert
            updateFloors(floors);
            toast.error(t("common.error"));
        }
    };

    const handleSaveFloorField = async (
        floorId: string,
        field: "description" | "internalNotes",
        value: string
    ) => {
        try {
            const updated = await narrativeApi.updateFloor(token, eventId, locationId, floorId, {
                [field]: value,
            });
            updateFloors(
                floors.map((f) =>
                    f.id === floorId ? { ...f, [field]: updated[field], updatedAt: updated.updatedAt } : f
                )
            );
            toast.success(t("locations.floors.notifications.updated"));
        } catch (error) {
            console.error(error);
            toast.error(t("common.error"));
        }
    };

    // ── Room CRUD ──

    const handleAddRoom = async (floorId: string) => {
        if (!newRoomName.trim()) return;
        setIsSubmitting(true);
        try {
            const created = await narrativeApi.createRoom(token, eventId, locationId, floorId, {
                name: newRoomName.trim(),
            });
            updateFloors(
                floors.map((f) =>
                    f.id === floorId
                        ? { ...f, rooms: [...f.rooms, created].sort((a, b) => a.sortOrder - b.sortOrder) }
                        : f
                )
            );
            toast.success(t("locations.rooms.notifications.created"));
            setAddRoomForFloorId(null);
            setNewRoomName("");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || t("common.error"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditRoomName = async (floorId: string, roomId: string) => {
        if (!editingRoomName.trim()) return;
        try {
            const updated = await narrativeApi.updateRoom(token, eventId, locationId, floorId, roomId, {
                name: editingRoomName.trim(),
            });
            updateFloors(
                floors.map((f) =>
                    f.id === floorId
                        ? {
                              ...f,
                              rooms: f.rooms.map((r) =>
                                  r.id === roomId ? { ...r, name: updated.name, updatedAt: updated.updatedAt } : r
                              ),
                          }
                        : f
                )
            );
            toast.success(t("locations.rooms.notifications.updated"));
            setEditingRoomId(null);
        } catch (error) {
            console.error(error);
            toast.error(t("common.error"));
        }
    };

    const handleDeleteRoom = async (floorId: string, roomId: string) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.deleteRoom(token, eventId, locationId, floorId, roomId);
            updateFloors(
                floors.map((f) =>
                    f.id === floorId
                        ? { ...f, rooms: f.rooms.filter((r) => r.id !== roomId) }
                        : f
                )
            );
            toast.success(t("locations.rooms.notifications.deleted"));
        } catch (error) {
            console.error(error);
            toast.error(t("common.error"));
        }
    };

    const handleReorderRoom = async (floorId: string, roomId: string, direction: "up" | "down") => {
        const floor = floors.find((f) => f.id === floorId);
        if (!floor) return;
        const rooms = [...floor.rooms].sort((a, b) => a.sortOrder - b.sortOrder);
        const idx = rooms.findIndex((r) => r.id === roomId);
        if (idx === -1) return;
        if (direction === "up" && idx === 0) return;
        if (direction === "down" && idx === rooms.length - 1) return;

        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        const tempOrder = rooms[idx].sortOrder;
        rooms[idx] = { ...rooms[idx], sortOrder: rooms[swapIdx].sortOrder };
        rooms[swapIdx] = { ...rooms[swapIdx], sortOrder: tempOrder };
        const sortedRooms = [...rooms].sort((a, b) => a.sortOrder - b.sortOrder);

        const prevFloors = [...floors];
        updateFloors(
            floors.map((f) => (f.id === floorId ? { ...f, rooms: sortedRooms } : f))
        );

        try {
            await narrativeApi.reorderRooms(token, eventId, locationId, floorId,
                sortedRooms.map((r, i) => ({ id: r.id, sortOrder: i }))
            );
            toast.success(t("locations.rooms.notifications.reordered"));
        } catch (error) {
            console.error(error);
            updateFloors(prevFloors);
            toast.error(t("common.error"));
        }
    };

    const handleSaveRoomField = async (
        floorId: string,
        roomId: string,
        field: "description" | "internalNotes",
        value: string
    ) => {
        try {
            const updated = await narrativeApi.updateRoom(
                token,
                eventId,
                locationId,
                floorId,
                roomId,
                { [field]: value }
            );
            updateFloors(
                floors.map((f) =>
                    f.id === floorId
                        ? {
                              ...f,
                              rooms: f.rooms.map((r) =>
                                  r.id === roomId
                                      ? { ...r, [field]: updated[field], updatedAt: updated.updatedAt }
                                      : r
                              ),
                          }
                        : f
                )
            );
            toast.success(t("locations.rooms.notifications.updated"));
        } catch (error) {
            console.error(error);
            toast.error(t("common.error"));
        }
    };

    // ── Render ──

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t("locations.floors.title")}</h3>
                {canWrite && (
                    <Button size="sm" onClick={() => setAddFloorDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t("locations.floors.add")}
                    </Button>
                )}
            </div>

            {floors.length === 0 ? (
                <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
                    {t("locations.floors.empty")}
                </div>
            ) : (
                <div className="space-y-2">
                    {floors.map((floor, floorIdx) => {
                        const isOpen = openFloors.has(floor.id);
                        const sortedRooms = [...floor.rooms].sort((a, b) => a.sortOrder - b.sortOrder);

                        return (
                            <Collapsible
                                key={floor.id}
                                open={isOpen}
                                onOpenChange={() => toggleFloor(floor.id)}
                            >
                                <div className="rounded-lg border bg-card">
                                    {/* Floor header */}
                                    <div className="flex items-center gap-2 p-3">
                                        <CollapsibleTrigger asChild>
                                            <Button variant="ghost" size="sm" className="p-1 h-auto">
                                                {isOpen ? (
                                                    <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </CollapsibleTrigger>

                                        <div className="flex-1 min-w-0">
                                            {editingFloorId === floor.id ? (
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        value={editingFloorName}
                                                        onChange={(e) => setEditingFloorName(e.target.value)}
                                                        className="h-8"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") handleEditFloorName(floor.id);
                                                            if (e.key === "Escape") setEditingFloorId(null);
                                                        }}
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => handleEditFloorName(floor.id)}
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => setEditingFloorId(null)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <CollapsibleTrigger asChild>
                                                    <button className="text-left font-medium hover:underline">
                                                        {floor.name}
                                                        <span className="ml-2 text-sm text-muted-foreground">
                                                            ({sortedRooms.length} {t("locations.floors.rooms")})
                                                        </span>
                                                    </button>
                                                </CollapsibleTrigger>
                                            )}
                                        </div>

                                        {canWrite && editingFloorId !== floor.id && (
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingFloorId(floor.id);
                                                        setEditingFloorName(floor.name);
                                                    }}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteFloor(floor.id);
                                                    }}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    disabled={floorIdx === 0}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleReorderFloor(floor.id, "up");
                                                    }}
                                                >
                                                    <ChevronUp className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    disabled={floorIdx === floors.length - 1}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleReorderFloor(floor.id, "down");
                                                    }}
                                                >
                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Floor expanded content */}
                                    <CollapsibleContent>
                                        <div className="border-t px-4 py-4 space-y-4">
                                            {/* Floor description + notes row */}
                                            <div className={`grid gap-4 ${canWrite ? "grid-cols-3" : "grid-cols-1"}`}>
                                                <div className={`${canWrite ? "col-span-2" : "col-span-1"} rounded-lg border bg-background p-4`}>
                                                    <EditableRichText
                                                        title={t("locations.floors.fields.description.label")}
                                                        initialHtml={floor.description || ""}
                                                        placeholder={t("locations.floors.fields.description.placeholder")}
                                                        isReadOnly={!canWrite}
                                                        onSave={(html) => handleSaveFloorField(floor.id, "description", html)}
                                                    />
                                                </div>

                                                {canWrite && (
                                                    <div className="col-span-1 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-4">
                                                        <EditableRichText
                                                            title={t("locations.floors.fields.internalNotes.label")}
                                                            variant="amber"
                                                            initialHtml={floor.internalNotes || ""}
                                                            placeholder={t("locations.floors.fields.internalNotes.placeholder")}
                                                            isReadOnly={false}
                                                            onSave={(html) => handleSaveFloorField(floor.id, "internalNotes", html)}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Floor documents */}
                                            <div className="rounded-lg border bg-background p-4">
                                                <DungeonFloorDocumentsPanel
                                                    eventId={eventId}
                                                    locationId={locationId}
                                                    floorId={floor.id}
                                                    canWrite={canWrite}
                                                    token={token}
                                                />
                                            </div>

                                            {/* Rooms section */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                                                        {t("locations.rooms.title")}
                                                    </h4>
                                                    {canWrite && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setAddRoomForFloorId(floor.id);
                                                                setNewRoomName("");
                                                            }}
                                                        >
                                                            <Plus className="mr-1 h-3.5 w-3.5" />
                                                            {t("locations.rooms.add")}
                                                        </Button>
                                                    )}
                                                </div>

                                                {sortedRooms.length === 0 ? (
                                                    <div className="text-sm text-muted-foreground py-2">
                                                        {t("locations.rooms.empty")}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {sortedRooms.map((room, roomIdx) => (
                                                            <RoomItem
                                                                key={room.id}
                                                                room={room}
                                                                floor={floor}
                                                                roomIdx={roomIdx}
                                                                totalRooms={sortedRooms.length}
                                                                canWrite={canWrite}
                                                                editingRoomId={editingRoomId}
                                                                editingRoomName={editingRoomName}
                                                                setEditingRoomId={setEditingRoomId}
                                                                setEditingRoomName={setEditingRoomName}
                                                                onEditName={() => handleEditRoomName(floor.id, room.id)}
                                                                onDelete={() => handleDeleteRoom(floor.id, room.id)}
                                                                onReorder={(dir) => handleReorderRoom(floor.id, room.id, dir)}
                                                                onSaveField={(field, value) =>
                                                                    handleSaveRoomField(floor.id, room.id, field, value)
                                                                }
                                                                eventId={eventId}
                                                                locationId={locationId}
                                                                token={token}
                                                                t={t}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CollapsibleContent>
                                </div>
                            </Collapsible>
                        );
                    })}
                </div>
            )}

            {/* Add Floor Dialog */}
            <Dialog open={addFloorDialogOpen} onOpenChange={setAddFloorDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>{t("locations.floors.addDialog.title")}</DialogTitle>
                        <DialogDescription>{t("locations.floors.addDialog.description")}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder={t("locations.floors.fields.name.placeholder")}
                            value={newFloorName}
                            onChange={(e) => setNewFloorName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddFloor();
                            }}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddFloorDialogOpen(false)} disabled={isSubmitting}>
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={handleAddFloor} disabled={isSubmitting || !newFloorName.trim()}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("locations.floors.addDialog.submit")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Room Dialog */}
            <Dialog
                open={addRoomForFloorId !== null}
                onOpenChange={(open) => {
                    if (!open) setAddRoomForFloorId(null);
                }}
            >
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>{t("locations.rooms.addDialog.title")}</DialogTitle>
                        <DialogDescription>{t("locations.rooms.addDialog.description")}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder={t("locations.rooms.fields.name.placeholder")}
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && addRoomForFloorId) handleAddRoom(addRoomForFloorId);
                            }}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddRoomForFloorId(null)} disabled={isSubmitting}>
                            {t("common.cancel")}
                        </Button>
                        <Button
                            onClick={() => addRoomForFloorId && handleAddRoom(addRoomForFloorId)}
                            disabled={isSubmitting || !newRoomName.trim()}
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("locations.rooms.addDialog.submit")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ── Room sub-component ──

interface RoomItemProps {
    room: NarrativeDungeonRoomDto;
    floor: NarrativeDungeonFloorDto;
    roomIdx: number;
    totalRooms: number;
    canWrite: boolean;
    editingRoomId: string | null;
    editingRoomName: string;
    setEditingRoomId: (id: string | null) => void;
    setEditingRoomName: (name: string) => void;
    onEditName: () => void;
    onDelete: () => void;
    onReorder: (dir: "up" | "down") => void;
    onSaveField: (field: "description" | "internalNotes", value: string) => void;
    eventId: string;
    locationId: string;
    token: string;
    t: any;
}

function RoomItem({
    room,
    floor,
    roomIdx,
    totalRooms,
    canWrite,
    editingRoomId,
    editingRoomName,
    setEditingRoomId,
    setEditingRoomName,
    onEditName,
    onDelete,
    onReorder,
    onSaveField,
    eventId,
    locationId,
    token,
    t,
}: RoomItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <div className="rounded-md border bg-background">
                <div className="flex items-center gap-2 p-2 pl-3">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-1 h-auto">
                            {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                            )}
                        </Button>
                    </CollapsibleTrigger>

                    <span className="text-xs font-mono text-muted-foreground">#{roomIdx + 1}</span>

                    <div className="flex-1 min-w-0">
                        {editingRoomId === room.id ? (
                            <div className="flex items-center gap-2">
                                <Input
                                    value={editingRoomName}
                                    onChange={(e) => setEditingRoomName(e.target.value)}
                                    className="h-7 text-sm"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") onEditName();
                                        if (e.key === "Escape") setEditingRoomId(null);
                                    }}
                                />
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEditName}>
                                    <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingRoomId(null)}>
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ) : (
                            <CollapsibleTrigger asChild>
                                <button className="text-sm text-left font-medium hover:underline truncate">
                                    {room.name}
                                </button>
                            </CollapsibleTrigger>
                        )}
                    </div>

                    {canWrite && editingRoomId !== room.id && (
                        <div className="flex items-center gap-0.5">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingRoomId(room.id);
                                    setEditingRoomName(room.name);
                                }}
                            >
                                <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                disabled={roomIdx === 0}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onReorder("up");
                                }}
                            >
                                <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                disabled={roomIdx === totalRooms - 1}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onReorder("down");
                                }}
                            >
                                <ChevronDown className="h-3 w-3" />
                            </Button>
                        </div>
                    )}
                </div>

                <CollapsibleContent>
                    <div className="border-t px-3 py-3 space-y-3">
                        {/* Room description + notes row */}
                        <div className={`grid gap-3 ${canWrite ? "grid-cols-3" : "grid-cols-1"}`}>
                            <div className={`${canWrite ? "col-span-2" : "col-span-1"} rounded-md border bg-muted/30 p-3`}>
                                <EditableRichText
                                    title={t("locations.rooms.fields.description.label")}
                                    initialHtml={room.description || ""}
                                    placeholder={t("locations.rooms.fields.description.placeholder")}
                                    isReadOnly={!canWrite}
                                    onSave={(html) => onSaveField("description", html)}
                                />
                            </div>

                            {canWrite && (
                                <div className="col-span-1 rounded-md border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-3">
                                    <EditableRichText
                                        title={t("locations.rooms.fields.internalNotes.label")}
                                        variant="amber"
                                        initialHtml={room.internalNotes || ""}
                                        placeholder={t("locations.rooms.fields.internalNotes.placeholder")}
                                        isReadOnly={false}
                                        onSave={(html) => onSaveField("internalNotes", html)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="rounded-md border bg-muted/30 p-3">
                            <DungeonRoomDocumentsPanel
                                eventId={eventId}
                                locationId={locationId}
                                floorId={floor.id}
                                roomId={room.id}
                                canWrite={canWrite}
                                token={token}
                            />
                        </div>
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}
