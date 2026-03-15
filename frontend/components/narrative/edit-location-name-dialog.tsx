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
import { NarrativeLocationDto, narrativeApi } from "@/utils/narrative-api";

interface EditLocationNameDialogProps {
    eventId: string;
    token: string;
    location: NarrativeLocationDto;
    onUpdated?: (updated: NarrativeLocationDto) => void;
}

export function EditLocationNameDialog({ eventId, token, location, onUpdated }: EditLocationNameDialogProps) {
    const t = useTranslations("narrative");
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isLocked = location.status.toLowerCase() === "locked";

    const formSchema = z.object({
        name: z.string().min(1, t("locations.fields.name.placeholder")).max(200),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: location.name,
        }
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setIsSubmitting(true);

            const updated = await narrativeApi.updateLocation(token, eventId, location.id, {
                name: values.name,
            });

            toast.success(t("locations.notifications.updated"));
            setOpen(false);
            if (onUpdated) {
                onUpdated(updated);
            } else {
                router.refresh();
            }
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
                    <DialogTitle>{t("locations.dialogs.edit.title")}</DialogTitle>
                    <DialogDescription>
                        {isLocked
                            ? t("locations.dialogs.edit.lockedWarning")
                            : t("locations.dialogs.edit.description")}
                        <br className="mb-2" />
                        <span className="text-muted-foreground italic">{t("locations.dialogs.edit.inlineNote")}</span>
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("locations.fields.name.label")} *</FormLabel>
                                    <FormControl>
                                        <Input disabled={isLocked} placeholder={t("locations.fields.name.placeholder")} {...field} />
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
