"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { narrativeApi } from "@/utils/narrative-api";

interface AddPlotlinePhaseDialogProps {
    plotlineId: string;
    eventId: string;
    token: string;
    currentPhaseCount: number;
    onPhaseAdded: () => void;
}

export function AddPlotlinePhaseDialog({
    plotlineId,
    eventId,
    token,
    currentPhaseCount,
    onPhaseAdded,
}: AddPlotlinePhaseDialogProps) {
    const t = useTranslations("narrative");
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formSchema = z.object({
        title: z.string().min(1, t("validation.titleRequired")),
        summary: z.string().optional(),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            summary: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setIsSubmitting(true);
            await narrativeApi.createPlotlinePhase(token, eventId, plotlineId, {
                title: values.title.trim(),
                summary: values.summary?.trim() || null,
                sortOrder: currentPhaseCount + 1,
            });

            toast.success(t("plotlines.notifications.phaseCreated"));
            setOpen(false);
            form.reset();
            onPhaseAdded();
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
                <Button variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("plotlines.phases.dialogs.addPhase.title")}</DialogTitle>
                    <DialogDescription>
                        {t("plotlines.phases.dialogs.addPhase.description")}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("plotlines.phases.fields.title.label")} *</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t("plotlines.phases.fields.title.placeholder")}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="summary"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("plotlines.phases.fields.summary.label")}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t("plotlines.phases.fields.summary.placeholder")}
                                            rows={3}
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
                                {t("plotlines.phases.dialogs.addPhase.submit")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
