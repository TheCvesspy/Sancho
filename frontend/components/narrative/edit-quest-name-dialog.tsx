"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { PencilLine, Loader2 } from "lucide-react";

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
import { NarrativeQuestDto, narrativeApi } from "@/utils/narrative-api";

interface EditQuestNameDialogProps {
    eventId: string;
    token: string;
    quest: NarrativeQuestDto;
}

export function EditQuestNameDialog({ eventId, token, quest }: EditQuestNameDialogProps) {
    const t = useTranslations("narrative");
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isLocked = quest.status === "Locked";

    const formSchema = z.object({
        title: z.string().min(1, t("quests.validation.titleRequired")),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: quest.title,
        }
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setIsSubmitting(true);

            await narrativeApi.updateQuest(token, eventId, quest.id, {
                title: values.title,
                description: quest.description,
                internalNotes: quest.internalNotes
            });

            toast.success(t("quests.notifications.updated"));
            setOpen(false);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error(t("common.error"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <PencilLine className="mr-2 h-4 w-4" />
                    {t("common.editTitle")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("quests.dialogs.edit.title")}</DialogTitle>
                    <DialogDescription>
                        {isLocked
                            ? t("quests.dialogs.edit.lockedWarning")
                            : t("quests.dialogs.edit.description")}
                        <br className="mb-2" />
                        <span className="text-muted-foreground italic">{t("quests.dialogs.edit.inlineNote")}</span>
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("quests.fields.title.label")} *</FormLabel>
                                    <FormControl>
                                        <Input disabled={isLocked} placeholder={t("quests.fields.title.placeholder")} {...field} />
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
                            <Button type="submit" disabled={isSubmitting || isLocked}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t("common.save")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
