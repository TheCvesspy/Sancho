"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NarrativeQuestDto, narrativeApi } from "@/utils/narrative-api";

interface DuplicateQuestDialogProps {
    eventId: string;
    token: string;
    quest: NarrativeQuestDto;
}

export function DuplicateQuestDialog({ eventId, token, quest }: DuplicateQuestDialogProps) {
    const t = useTranslations("narrative");
    const locale = useLocale();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newTitle, setNewTitle] = useState(`${quest.title}${t("quests.dialogs.duplicate.copySuffix")}`);

    const onSubmit = async () => {
        try {
            setIsSubmitting(true);

            const result = await narrativeApi.duplicateQuest(token, eventId, quest.id, {
                title: newTitle.trim() || `${quest.title}${t("quests.dialogs.duplicate.copySuffix")}`
            });

            toast.success(t("quests.notifications.created"));
            setOpen(false);

            // Navigate to the newly created quest
            router.push(`/${locale}/narrative/${eventId}/quests/${result.id}`);
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
                    <Copy className="mr-2 h-4 w-4" />
                    {t("common.duplicate")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("quests.dialogs.duplicate.title")}</DialogTitle>
                    <DialogDescription>
                        {t("quests.dialogs.duplicate.description")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="newTitle">{t("quests.dialogs.duplicate.newTitle")}</Label>
                        <Input
                            id="newTitle"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder={`${quest.title}${t("quests.dialogs.duplicate.copySuffix")}`}
                        />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {t("quests.dialogs.duplicate.copyWarning")}
                    </p>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={isSubmitting}
                    >
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={onSubmit} disabled={isSubmitting || !newTitle.trim()}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("quests.dialogs.duplicate.submit")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
