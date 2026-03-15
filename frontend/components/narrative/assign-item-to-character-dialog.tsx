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
import { narrativeApi } from "@/utils/narrative-api";

interface AssignItemToCharacterDialogProps {
    itemId: string;
    eventId: string;
    token: string;
    availableCharacters: CharacterListItemDto[];
    onAssigned: () => void;
}

export function AssignItemToCharacterDialog({
    itemId,
    eventId,
    token,
    availableCharacters,
    onAssigned,
}: AssignItemToCharacterDialogProps) {
    const t = useTranslations("narrative");
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);

    const formSchema = z.object({
        characterId: z.string().min(1, t("validation.characterRequired")),
        notes: z.string().optional(),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            characterId: "",
            notes: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setIsSubmitting(true);
            await narrativeApi.assignItemToCharacter(token, eventId, itemId, values.characterId, {
                notes: values.notes?.trim() || null,
            });

            toast.success(t("items.notifications.assigned"));
            setOpen(false);
            form.reset();
            onAssigned();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || t("common.error"));
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
                    <DialogTitle>{t("items.assignments.dialogs.assign.title")}</DialogTitle>
                    <DialogDescription>
                        {t("items.assignments.dialogs.assign.description")}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="characterId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>{t("items.assignments.character")} *</FormLabel>
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
                                                        ? availableCharacters.find(c => c.id === field.value)?.name
                                                        : t("items.assignments.dialogs.assign.selectCharacter")}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder={t("items.assignments.dialogs.assign.searchCharacter")} />
                                                    <CommandList>
                                                        <CommandEmpty>{t("common.noResults")}</CommandEmpty>
                                                        <CommandGroup>
                                                            {availableCharacters.map((char) => (
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
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("items.assignments.notes")}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t("items.assignments.notesPlaceholder")}
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
                                {t("common.cancel")}
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t("items.assignments.dialogs.assign.submit")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
