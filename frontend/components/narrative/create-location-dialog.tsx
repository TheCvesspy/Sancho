"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { narrativeApi, NarrativeLocationDto } from "@/utils/narrative-api";

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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const createLocationSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }).max(200),
    locationType: z.enum(["basic", "dungeon"]),
    description: z.string().optional(),
});

type CreateLocationFormValues = z.infer<typeof createLocationSchema>;

interface CreateLocationDialogProps {
    eventId: string;
    token: string;
    onCreated: (location: NarrativeLocationDto) => void;
}

export function CreateLocationDialog({ eventId, token, onCreated }: CreateLocationDialogProps) {
    const t = useTranslations("narrative");
    const locale = useLocale();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<CreateLocationFormValues>({
        resolver: zodResolver(createLocationSchema),
        defaultValues: {
            name: "",
            locationType: "basic",
            description: "",
        },
    });

    const onSubmit = async (data: CreateLocationFormValues) => {
        try {
            setIsSubmitting(true);
            const created = await narrativeApi.createLocation(token, eventId, {
                name: data.name,
                locationType: data.locationType,
                description: data.description || null,
            });
            toast.success(t("locations.notifications.created"));
            onCreated(created);
            setOpen(false);
            form.reset();
            // Navigate to detail page, especially important for dungeon type
            router.push(`/${locale}/narrative/${eventId}/locations/${created.id}`);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || t("common.error"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t("locations.create")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("locations.dialogs.create.title")}</DialogTitle>
                    <DialogDescription>
                        {t("locations.dialogs.create.description")}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("locations.fields.name.label")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("locations.fields.name.placeholder")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="locationType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("locations.fields.locationType.label")}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="basic">{t("locations.type.basic")}</SelectItem>
                                            <SelectItem value="dungeon">{t("locations.type.dungeon")}</SelectItem>
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
                                    <FormLabel>{t("locations.fields.description.label")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("common.shortSummaryPlaceholder")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                                {t("common.cancel")}
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
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
