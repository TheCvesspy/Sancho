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
import { charactersApi } from "@/utils/characters-api";
import { NarrativeItemDto } from "@/utils/narrative-api";

interface AssignItemDialogProps {
    characterId: string;
    eventId: string;
    token: string;
    availableItems: NarrativeItemDto[];
    onItemAssigned: () => void;
}

export function AssignItemDialog({ characterId, eventId, token, availableItems, onItemAssigned }: AssignItemDialogProps) {
    const t = useTranslations("characters");
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);

    const formSchema = z.object({
        itemId: z.string().min(1, t("validation.itemRequired")),
        notes: z.string().optional(),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            itemId: "",
            notes: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setIsSubmitting(true);
            await charactersApi.assignItem(token, eventId, characterId, values.itemId, {
                notes: values.notes?.trim() || null,
            });

            toast.success(t("notifications.itemAssigned"));
            setOpen(false);
            form.reset();
            onItemAssigned();
        } catch (error) {
            console.error(error);
            toast.error(t("errors.itemAssignFailed"));
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
                    <DialogTitle>{t("dialogs.assignItem.title")}</DialogTitle>
                    <DialogDescription>
                        {t("dialogs.assignItem.description")}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="itemId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>{t("items.selectItem")} *</FormLabel>
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
                                                        ? availableItems.find(i => i.id === field.value)?.name
                                                        : t("items.selectItem")}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder={t("items.searchItem")} />
                                                    <CommandList>
                                                        <CommandEmpty>{t("items.selectItem")}</CommandEmpty>
                                                        <CommandGroup>
                                                            {availableItems.map((item) => (
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
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("items.notes")}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t("items.notesPlaceholder")}
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
                                {t("dialogs.assignItem.submit")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
