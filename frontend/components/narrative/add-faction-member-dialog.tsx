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

interface AddFactionMemberDialogProps {
    factionId: string;
    eventId: string;
    token: string;
    availableCharacters: CharacterListItemDto[];
    onMemberAdded: () => void;
}

export function AddFactionMemberDialog({
    factionId,
    eventId,
    token,
    availableCharacters,
    onMemberAdded,
}: AddFactionMemberDialogProps) {
    const t = useTranslations("narrative");
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);

    const formSchema = z.object({
        characterId: z.string().min(1, t("validation.characterRequired")),
        role: z.string().optional(),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            characterId: "",
            role: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setIsSubmitting(true);
            await narrativeApi.upsertFactionMember(token, eventId, factionId, values.characterId, {
                role: values.role?.trim() || null,
            });

            toast.success(t("factions.notifications.memberAdded"));
            setOpen(false);
            form.reset();
            onMemberAdded();
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
                    <DialogTitle>{t("factions.members.dialogs.add.title")}</DialogTitle>
                    <DialogDescription>
                        {t("factions.members.dialogs.add.description")}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="characterId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>{t("factions.members.character")} *</FormLabel>
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
                                                        : t("factions.members.dialogs.add.selectCharacter")}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder={t("factions.members.dialogs.add.searchCharacter")} />
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
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("factions.members.role")}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t("factions.members.rolePlaceholder")}
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
                                {t("factions.members.dialogs.add.submit")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
