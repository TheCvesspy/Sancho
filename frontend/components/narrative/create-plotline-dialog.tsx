"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { narrativeApi, NarrativePlotlineDto } from "@/utils/narrative-api";

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
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const createPlotlineSchema = z.object({
    title: z.string().min(1, { message: "Title is required" }),
    description: z.string().optional(),
    internalNotes: z.string().optional(),
});

type CreatePlotlineFormValues = z.infer<typeof createPlotlineSchema>;

interface CreatePlotlineDialogProps {
    eventId: string;
    token: string;
    onCreated: (plotline: NarrativePlotlineDto) => void;
}

export function CreatePlotlineDialog({ eventId, token, onCreated }: CreatePlotlineDialogProps) {
    const t = useTranslations("narrative");
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<CreatePlotlineFormValues>({
        resolver: zodResolver(createPlotlineSchema),
        defaultValues: {
            title: "",
            description: "",
            internalNotes: "",
        },
    });

    const onSubmit = async (data: CreatePlotlineFormValues) => {
        try {
            setIsSubmitting(true);
            const created = await narrativeApi.createPlotline(token, eventId, {
                title: data.title,
                description: data.description || null,
                internalNotes: data.internalNotes || null,
            });
            toast.success(t("notifications.created"));
            onCreated(created);
            setOpen(false);
            form.reset();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to create plotline");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t("plotlines.list.create")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("plotlines.dialogs.create.title")}</DialogTitle>
                    <DialogDescription>
                        {t("plotlines.dialogs.create.description")}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("plotlines.fields.title.label")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("plotlines.fields.title.placeholder")} {...field} />
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
                                    <FormLabel>{t("plotlines.fields.description.label")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Short summary..." {...field} />
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
