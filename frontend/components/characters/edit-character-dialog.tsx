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
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CharacterDetailDto, charactersApi } from "@/utils/characters-api";

interface EditCharacterDialogProps {
    eventId: string;
    token: string;
    character: CharacterDetailDto;
}

export function EditCharacterDialog({ eventId, token, character }: EditCharacterDialogProps) {
    const t = useTranslations("characters");
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isLocked = character.status === "Locked";

    const formSchema = z.object({
        name: z.string().min(1, t("validation.nameRequired")),
        race: z.string().min(1, t("validation.raceRequired"))
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: character.name,
            race: character.race
        }
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setIsSubmitting(true);

            await charactersApi.updateCharacter(token, eventId, character.id, {
                name: values.name,
                race: values.race,
                biography: character.biography,
                notes: character.notes,
                playerUserId: character.playerUserId
            });

            toast.success(t("notifications.updated"));
            setOpen(false);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error(t("errors.updateFailed"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <PencilLine className="mr-2 h-4 w-4" />
                    {t("detail.actions.edit")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("dialogs.edit.title")}</DialogTitle>
                    <DialogDescription>
                        {isLocked
                            ? t("dialogs.edit.lockedWarning")
                            : t("dialogs.edit.description")}
                        <br className="mb-2" />
                        <span className="text-muted-foreground italic">Biography and Internal Notes are edited on the Profile tab inline.</span>
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
                                        <Input disabled={isLocked} placeholder={t("fields.placeholders.name")} {...field} />
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
                                        <Input disabled={isLocked} placeholder={t("fields.placeholders.race")} {...field} />
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
                                {t("dialogs.common.cancel")}
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t("dialogs.edit.submit")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
