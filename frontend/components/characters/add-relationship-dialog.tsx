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
import { CharacterListItemDto, charactersApi } from "@/utils/characters-api";

interface AddRelationshipDialogProps {
    characterId: string;
    eventId: string;
    token: string;
    characters: CharacterListItemDto[];
    onRelationshipAdded: () => void;
}

export function AddRelationshipDialog({ characterId, eventId, token, characters, onRelationshipAdded }: AddRelationshipDialogProps) {
    const t = useTranslations("characters");
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);

    const formSchema = z.object({
        targetCharacterId: z.string().min(1, t("validation.targetRequired")),
        relationType: z.string().optional(),
        relationMode: z.string(),
        description: z.string().optional(),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            targetCharacterId: "",
            relationType: "",
            relationMode: "directional",
            description: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setIsSubmitting(true);
            await charactersApi.createRelationship(token, eventId, characterId, {
                targetCharacterId: values.targetCharacterId,
                relationType: values.relationType?.trim() || "ally",
                relationMode: values.relationMode,
                description: values.description?.trim() || null,
            });

            toast.success(t("notifications.relationshipAdded"));
            setOpen(false);
            form.reset();
            onRelationshipAdded();
        } catch (error) {
            console.error(error);
            toast.error(t("errors.relationshipFailed"));
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
                    <DialogTitle>{t("dialogs.addRelationship.title")}</DialogTitle>
                    <DialogDescription>
                        {t("dialogs.addRelationship.description")}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="targetCharacterId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>{t("relationships.target")} *</FormLabel>
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
                                                        ? characters.find(c => c.id === field.value)?.name
                                                        : t("relationships.selectCharacter")}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder={t("relationships.searchCharacter")} />
                                                    <CommandList>
                                                        <CommandEmpty>{t("relationships.selectCharacter")}</CommandEmpty>
                                                        <CommandGroup>
                                                            {characters.map((char) => (
                                                                <CommandItem
                                                                    key={char.id}
                                                                    value={char.name}
                                                                    onSelect={() => {
                                                                        field.onChange(field.value === char.id ? "" : char.id);
                                                                        setPickerOpen(false);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            field.value === char.id ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    {char.name}
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
                                    <FormLabel>{t("relationships.type")}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t("relationships.typePlaceholder")}
                                            maxLength={100}
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
                                    <FormLabel>{t("relationships.mode")}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="directional">{t("relationships.directional")}</SelectItem>
                                            <SelectItem value="auto_mirrored">{t("relationships.mirrored")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("relationships.description")}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t("relationships.descriptionPlaceholder")}
                                            {...field}
                                        />
                                    </FormControl>
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
                                {t("dialogs.common.cancel")}
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t("dialogs.addRelationship.submit")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
