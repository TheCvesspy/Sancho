"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

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
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { charactersApi } from "@/utils/characters-api";

interface CreateCharacterDialogProps {
    eventId: string;
    token: string;
}

export function CreateCharacterDialog({ eventId, token }: CreateCharacterDialogProps) {
    const t = useTranslations("characters");
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formSchema = z.object({
        name: z.string().min(1, t("validation.nameRequired")),
        race: z.string().min(1, t("validation.raceRequired")),
        biography: z.string().optional(),
        notes: z.string().optional()
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            race: "",
            biography: "",
            notes: ""
        }
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setIsSubmitting(true);

            await charactersApi.createCharacter(token, eventId, {
                name: values.name,
                race: values.race,
                biography: values.biography || null,
                notes: values.notes || null,
                playerUserId: null
            });

            toast.success(t("notifications.created"));
            setOpen(false);
            form.reset();
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error(t("errors.duplicateName"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("list.newCharacter")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("dialogs.create.title")}</DialogTitle>
                    <DialogDescription>
                        {t("dialogs.create.description")}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("fields.name")} *</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("fields.placeholders.name")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="race"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("fields.race")} *</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("fields.placeholders.race")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="biography"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("fields.biography")}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t("fields.placeholders.biography")}
                                            className="resize-none"
                                            {...field}
                                        />
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
                                    <FormLabel>{t("fields.notes")}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t("fields.placeholders.notes")}
                                            className="resize-none border-amber-200 focus-visible:ring-amber-400"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription className="text-amber-600/80 text-xs">
                                        {t("fields.descriptions.notesPrivacy")}
                                    </FormDescription>
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
                                {t("dialogs.create.submit")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
