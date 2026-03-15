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
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import { CharacterListItemDto } from "@/utils/characters-api";
import { NarrativeFactionDto, narrativeApi } from "@/utils/narrative-api";

interface AddFactionRelationshipDialogProps {
    factionId: string;
    eventId: string;
    token: string;
    factions: NarrativeFactionDto[];
    characters: CharacterListItemDto[];
    onRelationshipAdded: () => void;
}

export function AddFactionRelationshipDialog({
    factionId,
    eventId,
    token,
    factions,
    characters,
    onRelationshipAdded,
}: AddFactionRelationshipDialogProps) {
    const t = useTranslations("narrative");
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);

    const formSchema = z.object({
        targetType: z.enum(["faction", "character"]),
        targetId: z.string().min(1, t("validation.targetRequired")),
        relationType: z.string().optional(),
        relationMode: z.enum(["directional", "auto_mirrored"]),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            targetType: "faction",
            targetId: "",
            relationType: "",
            relationMode: "directional",
        },
    });

    const targetType = form.watch("targetType");
    const candidates = targetType === "faction" ? factions : characters;

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setIsSubmitting(true);
            await narrativeApi.createFactionRelationship(token, eventId, factionId, {
                targetFactionId: values.targetType === "faction" ? values.targetId : null,
                targetCharacterId: values.targetType === "character" ? values.targetId : null,
                relationType: values.relationType?.trim() || "ally",
                relationMode: values.relationMode,
            });

            toast.success(t("factions.notifications.relationshipAdded"));
            setOpen(false);
            form.reset();
            onRelationshipAdded();
        } catch (error) {
            console.error(error);
            toast.error(t("common.error"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) form.reset(); }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("factions.relationships.dialogs.add.title")}</DialogTitle>
                    <DialogDescription>
                        {t("factions.relationships.dialogs.add.description")}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="targetType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("factions.relationships.targetType")}</FormLabel>
                                    <Select
                                        onValueChange={(val) => {
                                            field.onChange(val);
                                            form.setValue("targetId", "");
                                        }}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="faction">{t("factions.relationships.targetFaction")}</SelectItem>
                                            <SelectItem value="character">{t("factions.relationships.targetCharacter")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="targetId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>{t("factions.relationships.target")} *</FormLabel>
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
                                                        ? candidates.find(c => c.id === field.value)?.name
                                                        : t("factions.relationships.dialogs.add.selectTarget")}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder={t("factions.relationships.dialogs.add.searchTarget")} />
                                                    <CommandList>
                                                        <CommandEmpty>{t("common.noResults")}</CommandEmpty>
                                                        <CommandGroup>
                                                            {candidates.map((item) => (
                                                                <CommandItem
                                                                    key={item.id}
                                                                    value={item.name}
                                                                    onSelect={() => {
                                                                        field.onChange(field.value === item.id ? "" : item.id);
                                                                        setPickerOpen(false);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            field.value === item.id ? "opacity-100" : "opacity-0"
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
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="relationType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("factions.relationships.fields.type")}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t("factions.relationships.dialogs.add.typePlaceholder")}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="relationMode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("factions.relationships.fields.mode")}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="directional">{t("factions.relationships.directionalShort")}</SelectItem>
                                            <SelectItem value="auto_mirrored">{t("factions.relationships.mirroredShort")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={isSubmitting}
                            >
                                {t("common.cancel")}
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t("factions.relationships.dialogs.add.submit")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
