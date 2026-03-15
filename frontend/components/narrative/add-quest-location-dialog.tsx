"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Plus, Loader2, Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
    narrativeApi,
    NarrativeLocationDto,
    NarrativeDungeonFloorDto,
    NarrativeDungeonRoomDto,
} from "@/utils/narrative-api";

interface AddQuestLocationDialogProps {
    eventId: string;
    questId: string;
    token: string;
    candidates: NarrativeLocationDto[];
    onLocationAdded: () => void;
}

export function AddQuestLocationDialog({
    eventId,
    questId,
    token,
    candidates,
    onLocationAdded,
}: AddQuestLocationDialogProps) {
    const t = useTranslations("narrative");
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);

    // Dungeon sub-state
    const [floors, setFloors] = useState<NarrativeDungeonFloorDto[]>([]);
    const [rooms, setRooms] = useState<NarrativeDungeonRoomDto[]>([]);
    const [selectedFloor, setSelectedFloor] = useState("");
    const [selectedRoom, setSelectedRoom] = useState("");
    const [loadingFloors, setLoadingFloors] = useState(false);
    const [loadingRooms, setLoadingRooms] = useState(false);

    const formSchema = z.object({
        locationId: z.string().min(1, t("quests.dialogs.addLocation.validation.locationRequired")),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            locationId: "",
        },
    });

    const watchedLocationId = form.watch("locationId");
    const selectedLocation = candidates.find(l => l.id === watchedLocationId);
    const isDungeon = selectedLocation?.locationType?.toLowerCase() === "dungeon";

    const handleLocationChange = async (locationId: string) => {
        // Reset dungeon state
        setFloors([]);
        setRooms([]);
        setSelectedFloor("");
        setSelectedRoom("");

        const loc = candidates.find(l => l.id === locationId);
        if (loc?.locationType?.toLowerCase() === "dungeon") {
            setLoadingFloors(true);
            try {
                const floorList = await narrativeApi.listFloors(token, eventId, locationId);
                setFloors(floorList);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingFloors(false);
            }
        }
    };

    const handleFloorChange = async (floorId: string) => {
        setSelectedFloor(floorId);
        setSelectedRoom("");
        setRooms([]);

        if (!floorId || !watchedLocationId) return;
        setLoadingRooms(true);
        try {
            const roomList = await narrativeApi.listRooms(token, eventId, watchedLocationId, floorId);
            setRooms(roomList);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingRooms(false);
        }
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setIsSubmitting(true);
            const data: { floorId?: string | null; roomId?: string | null } = {};
            if (selectedFloor) data.floorId = selectedFloor;
            if (selectedRoom) data.roomId = selectedRoom;

            await narrativeApi.upsertQuestLocationLink(token, eventId, questId, values.locationId, data);

            toast.success(t("common.add"));
            setOpen(false);
            form.reset();
            setFloors([]);
            setRooms([]);
            setSelectedFloor("");
            setSelectedRoom("");
            onLocationAdded();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenChange = (v: boolean) => {
        setOpen(v);
        if (!v) {
            form.reset();
            setFloors([]);
            setRooms([]);
            setSelectedFloor("");
            setSelectedRoom("");
        }
    };

    const granularityLabel = selectedRoom
        ? `${floors.find(f => f.id === selectedFloor)?.name} > ${rooms.find(r => r.id === selectedRoom)?.name}`
        : selectedFloor
            ? floors.find(f => f.id === selectedFloor)?.name
            : t("locations.links.granularity.entireLocation");

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("quests.dialogs.addLocation.title")}</DialogTitle>
                    <DialogDescription>
                        {t("quests.dialogs.addLocation.description")}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="locationId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>{t("quests.dialogs.addLocation.selectLocation")} *</FormLabel>
                                    <FormControl>
                                        <Popover open={pickerOpen} onOpenChange={setPickerOpen} modal={false}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={pickerOpen}
                                                    className="w-full justify-between h-10 px-3 bg-background font-normal"
                                                >
                                                    {field.value
                                                        ? candidates.find(l => l.id === field.value)?.name
                                                        : t("quests.dialogs.addLocation.selectLocation")}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder={t("common.search")} />
                                                    <CommandList>
                                                        <CommandEmpty>{t("common.noResults")}</CommandEmpty>
                                                        <CommandGroup>
                                                            {candidates.map((loc) => (
                                                                <CommandItem
                                                                    key={loc.id}
                                                                    value={loc.name}
                                                                    onSelect={() => {
                                                                        const newId = field.value === loc.id ? "" : loc.id;
                                                                        field.onChange(newId);
                                                                        if (newId) handleLocationChange(newId);
                                                                        setPickerOpen(false);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            field.value === loc.id ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {loc.name}
                                                                    {loc.locationType?.toLowerCase() === "dungeon" && (
                                                                        <span className="ml-1 text-xs text-muted-foreground">(Dungeon)</span>
                                                                    )}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {isDungeon && (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">{t("locations.links.granularity.floor")}</label>
                                    <select
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                        value={selectedFloor}
                                        onChange={(e) => handleFloorChange(e.target.value)}
                                        disabled={loadingFloors}
                                    >
                                        <option value="">
                                            {loadingFloors ? t("common.loading") : t("locations.dungeon.selectFloor")}
                                        </option>
                                        {floors.map((f) => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedFloor && (
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium">{t("locations.links.granularity.room")}</label>
                                        <select
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                            value={selectedRoom}
                                            onChange={(e) => setSelectedRoom(e.target.value)}
                                            disabled={loadingRooms}
                                        >
                                            <option value="">
                                                {loadingRooms ? t("common.loading") : t("locations.dungeon.selectRoom")}
                                            </option>
                                            {rooms.map((r) => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="rounded-md bg-muted/50 p-3 text-sm">
                                    <span className="text-muted-foreground">{t("locations.dungeon.modal.linkingAs")}: </span>
                                    <span className="font-medium">{granularityLabel}</span>
                                </div>
                            </>
                        )}

                        <DialogFooter className="pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                {t("common.cancel")}
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t("quests.dialogs.addLocation.submit")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
