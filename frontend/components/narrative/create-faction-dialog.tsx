"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { narrativeApi, NarrativeFactionDto } from "@/utils/narrative-api";

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
// import { EditableRichText } from "@/components/ui/editable-rich-text"; // Optional for rich text in dialog

const createFactionSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    sigilUrl: z.string().optional(), // Will be handled by a separate upload later
    description: z.string().optional(),
    goals: z.string().optional(),
    internalNotes: z.string().optional(),
});

type CreateFactionFormValues = z.infer<typeof createFactionSchema>;

interface CreateFactionDialogProps {
    eventId: string;
    token: string;
    onCreated: (faction: NarrativeFactionDto) => void;
}

export function CreateFactionDialog({ eventId, token, onCreated }: CreateFactionDialogProps) {
    const t = useTranslations("narrative");
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<CreateFactionFormValues>({
        resolver: zodResolver(createFactionSchema),
        defaultValues: {
            name: "",
            sigilUrl: "",
            description: "",
            goals: "",
            internalNotes: "",
        },
    });

    const onSubmit = async (data: CreateFactionFormValues) => {
        try {
            setIsSubmitting(true);
            const created = await narrativeApi.createFaction(token, eventId, {
                name: data.name,
                sigilUrl: data.sigilUrl || null,
                description: data.description || null,
                goals: data.goals || null,
                internalNotes: data.internalNotes || null,
            });
            toast.success(t("notifications.created"));
            onCreated(created);
            setOpen(false);
            form.reset();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to create faction");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t("factions.create")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("factions.dialogs.create.title")}</DialogTitle>
                    <DialogDescription>
                        {t("factions.dialogs.create.description")}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("factions.fields.name.label")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("factions.fields.name.placeholder")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* We use basic Inputs here because full Tiptap editors in a small dialog are bulky. They can edit them richly in the detail view. */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("factions.fields.description.label")}</FormLabel>
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
