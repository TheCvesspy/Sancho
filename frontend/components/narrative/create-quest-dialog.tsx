"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { narrativeApi, CreateQuestRequest } from "@/utils/narrative-api";

const createQuestSchema = z.object({
    title: z.string().min(2, "Title must be at least 2 characters").max(100),
    hasFixedPlayers: z.boolean(),
});

type CreateQuestValues = z.infer<typeof createQuestSchema>;

interface CreateQuestDialogProps {
    eventId: string;
    token: string;
}

export function CreateQuestDialog({ eventId, token }: CreateQuestDialogProps) {
    const t = useTranslations("narrative");
    const router = useRouter();
    const locale = useLocale();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<CreateQuestValues>({
        resolver: zodResolver(createQuestSchema),
        defaultValues: {
            title: "",
            hasFixedPlayers: false,
        },
    });

    const onSubmit = async (data: CreateQuestValues) => {
        setIsSubmitting(true);
        try {
            const req: CreateQuestRequest = {
                title: data.title,
                hasFixedPlayers: data.hasFixedPlayers,
                description: null, // Full edit via detail page later
                internalNotes: null,
            };
            const created = await narrativeApi.createQuest(token, eventId, req);
            setOpen(false);
            form.reset();
            router.push(`/${locale}/narrative/${eventId}/quests/${created.id}`);
        } catch (error) {
            console.error(error);
            // Handle error (could show a toast)
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("quests.create")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("quests.create")}</DialogTitle>
                    <DialogDescription>
                        {t("quests.description")}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("quests.fields.title.label")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("quests.fields.title.placeholder")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="hasFixedPlayers"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border rounded-md">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>{t("quests.fields.hasFixedPlayers.label")}</FormLabel>
                                        <FormDescription>
                                            {t("quests.fields.hasFixedPlayers.description")}
                                        </FormDescription>
                                    </div>
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                                {t("common.cancel")}
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {t("common.create")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
