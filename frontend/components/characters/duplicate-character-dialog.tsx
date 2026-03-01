"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { CharacterDetailDto, charactersApi } from "@/utils/characters-api";

interface DuplicateCharacterDialogProps {
    eventId: string;
    token: string;
    character: CharacterDetailDto;
}

export function DuplicateCharacterDialog({ eventId, token, character }: DuplicateCharacterDialogProps) {
    const t = useTranslations("characters");
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newName, setNewName] = useState(`${character.name} (Copy)`);

    const onSubmit = async () => {
        try {
            setIsSubmitting(true);

            const result = await charactersApi.duplicateCharacter(token, eventId, character.id, {
                newName: newName.trim() || `${character.name} (Copy)`
            });

            toast.success(t("notifications.duplicated"));
            setOpen(false);

            // Navigate to the newly created character
            router.push(`/${t("locale")}/characters/${eventId}/${result.id}`);
        } catch (error) {
            console.error(error);
            toast.error(t("errors.duplicateFailed"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Copy className="mr-2 h-4 w-4" />
                    {t("detail.actions.duplicate")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("dialogs.duplicate.title")}</DialogTitle>
                    <DialogDescription>
                        {t("dialogs.duplicate.description")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="newName">New Character Name</Label>
                        <Input
                            id="newName"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder={`${character.name} (Copy)`}
                        />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Profile details and abilities will be copied. Uploaded photos and attachments will NOT be copied.
                    </p>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button onClick={onSubmit} disabled={isSubmitting || !newName.trim()}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("dialogs.duplicate.submit")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
