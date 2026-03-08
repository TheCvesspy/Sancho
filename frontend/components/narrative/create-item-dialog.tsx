"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { narrativeApi, NarrativeItemDto } from "@/utils/narrative-api";

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
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

const createItemSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    description: z.string().optional(),
    internalNotes: z.string().optional(),
    isMultiCopy: z.boolean(),
    maxCopies: z.number().min(1).nullable().optional()
});

type CreateItemFormValues = z.infer<typeof createItemSchema>;

interface CreateItemDialogProps {
    eventId: string;
    token: string;
    onCreated: (item: NarrativeItemDto) => void;
}

export function CreateItemDialog({ eventId, token, onCreated }: CreateItemDialogProps) {
    const t = useTranslations("narrative");
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<CreateItemFormValues>({
        resolver: zodResolver(createItemSchema),
        defaultValues: {
            name: "",
            description: "",
            internalNotes: "",
            isMultiCopy: false,
            maxCopies: null,
        },
    });

    const isMultiCopy = form.watch("isMultiCopy");

    const onSubmit = async (data: CreateItemFormValues) => {
        try {
            setIsSubmitting(true);
            const created = await narrativeApi.createItem(token, eventId, {
                name: data.name,
                description: data.description || null,
                internalNotes: data.internalNotes || null,
                isMultiCopy: data.isMultiCopy,
                maxCopies: data.isMultiCopy && data.maxCopies ? data.maxCopies : null
            });
            toast.success(t("notifications.created"));
            onCreated(created);
            setOpen(false);
            form.reset();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to create item");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t("items.create")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("items.dialogs.create.title")}</DialogTitle>
                    <DialogDescription>
                        {t("items.dialogs.create.description")}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("items.fields.name.label")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("items.fields.name.placeholder")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("items.fields.description.label")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Short summary..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="isMultiCopy"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>{t("items.fields.isMultiCopy.label")}</FormLabel>
                                        <FormDescription>
                                            {t("items.fields.isMultiCopy.description")}
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        {isMultiCopy && (
                            <FormField
                                control={form.control}
                                name="maxCopies"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("items.fields.maxCopies.label")}</FormLabel>
                                        <FormControl>
                                            <Input type="number" min="1" placeholder="Unlimited" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value, 10) : null)} />
                                        </FormControl>
                                        <FormDescription>{t("items.fields.maxCopies.description")}</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

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
