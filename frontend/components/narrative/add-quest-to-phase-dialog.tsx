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
import { NarrativeQuestDto, narrativeApi } from "@/utils/narrative-api";

interface AddQuestToPhaseDialogProps {
    plotlineId: string;
    eventId: string;
    token: string;
    phaseId: string | null;
    phaseName: string | null;
    unlinkedQuests: NarrativeQuestDto[];
    currentQuestCount: number;
    onQuestLinked: () => void;
}

export function AddQuestToPhaseDialog({
    plotlineId,
    eventId,
    token,
    phaseId,
    phaseName,
    unlinkedQuests,
    currentQuestCount,
    onQuestLinked,
}: AddQuestToPhaseDialogProps) {
    const t = useTranslations("narrative");
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);

    const displayPhaseName = phaseName || t("plotlines.phases.unphasedQuests");

    const formSchema = z.object({
        questId: z.string().min(1, t("validation.questRequired")),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            questId: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setIsSubmitting(true);
            await narrativeApi.upsertPlotlineQuest(token, eventId, plotlineId, values.questId, {
                phaseId: phaseId,
                sortOrder: currentQuestCount + 1,
            });

            toast.success(t("plotlines.notifications.questLinked"));
            setOpen(false);
            form.reset();
            onQuestLinked();
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
                <Button variant="outline" size="icon" className="h-7 w-7">
                    <Plus className="h-3.5 w-3.5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("plotlines.phases.dialogs.addQuest.title", { phase: displayPhaseName })}</DialogTitle>
                    <DialogDescription>
                        {t("plotlines.phases.dialogs.addQuest.description")}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="questId"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>{t("quests.title")} *</FormLabel>
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
                                                        ? unlinkedQuests.find(q => q.id === field.value)?.title
                                                        : t("plotlines.phases.dialogs.addQuest.selectQuest")}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[350px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder={t("plotlines.phases.dialogs.addQuest.searchQuest")} />
                                                    <CommandList>
                                                        <CommandEmpty>{t("common.noResults")}</CommandEmpty>
                                                        <CommandGroup>
                                                            {unlinkedQuests.map((quest) => (
                                                                <CommandItem
                                                                    key={quest.id}
                                                                    value={quest.title}
                                                                    onSelect={() => {
                                                                        field.onChange(field.value === quest.id ? "" : quest.id);
                                                                        setPickerOpen(false);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4 shrink-0",
                                                                            field.value === quest.id ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    <div className="flex flex-col">
                                                                        <span>{quest.title}</span>
                                                                        {quest.shortDescription && (
                                                                            <span className="text-xs text-muted-foreground line-clamp-1">{quest.shortDescription}</span>
                                                                        )}
                                                                    </div>
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
                                {t("plotlines.phases.dialogs.addQuest.submit")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
