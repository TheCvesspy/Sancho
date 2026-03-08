"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { narrativeApi, NarrativePlotDto } from "@/utils/narrative-api";

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

const createPlotSchema = z.object({
    title: z.string().min(1, { message: "Title is required" }),
    description: z.string().optional(),
    internalNotes: z.string().optional(),
});

type CreatePlotFormValues = z.infer<typeof createPlotSchema>;

interface CreatePlotDialogProps {
    eventId: string;
    token: string;
    onCreated: (plot: NarrativePlotDto) => void;
}

export function CreatePlotDialog({ eventId, token, onCreated }: CreatePlotDialogProps) {
    const t = useTranslations("narrative");
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<CreatePlotFormValues>({
        resolver: zodResolver(createPlotSchema),
        defaultValues: {
            title: "",
            description: "",
            internalNotes: "",
        },
    });

    const onSubmit = async (data: CreatePlotFormValues) => {
        try {
            setIsSubmitting(true);
            const created = await narrativeApi.createPlot(token, eventId, {
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
            toast.error(error.message || "Failed to create plot");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t("plots.create")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("plots.dialogs.create.title")}</DialogTitle>
                    <DialogDescription>
                        {t("plots.dialogs.create.description")}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("plots.fields.title.label")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("plots.fields.title.placeholder")} {...field} />
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
                                    <FormLabel>{t("plots.fields.description.label")}</FormLabel>
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
