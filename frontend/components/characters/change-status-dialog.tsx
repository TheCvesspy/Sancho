"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock, FileDown, Rocket, Loader2 } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CharacterDetailDto, charactersApi } from "@/utils/characters-api";

interface ChangeStatusDialogProps {
    eventId: string;
    token: string;
    character: CharacterDetailDto;
}

export function ChangeStatusDialog({ eventId, token, character }: ChangeStatusDialogProps) {
    const t = useTranslations("characters");
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Controlled internal state for the dialog form
    const [confirmUnlock, setConfirmUnlock] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<"Draft" | "Ready" | "Locked">(character.status);

    const isCurrentDraft = character.status === "Draft";
    const isCurrentLocked = character.status === "Locked";

    const onSubmit = async () => {
        try {
            setIsSubmitting(true);

            await charactersApi.changeStatus(token, eventId, character.id, {
                newStatus: selectedStatus,
                confirmUnlock: selectedStatus === "Draft" || selectedStatus === "Ready" ? confirmUnlock : undefined
            });

            toast.success(t("notifications.statusChanged"));
            setOpen(false);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error(t("errors.statusChangeFailed"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => {
            if (o) {
                // Reset to current status when opening
                setSelectedStatus(character.status);
                setConfirmUnlock(false);
            }
            setOpen(o);
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    {character.status === "Locked" ? <Lock className="mr-2 h-4 w-4" /> : <Rocket className="mr-2 h-4 w-4" />}
                    {t("detail.actions.changeStatus")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("dialogs.status.title")}</DialogTitle>
                    <DialogDescription>
                        {t("dialogs.status.description")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-3 gap-4">
                        <Button
                            variant={selectedStatus === "Draft" ? "default" : "outline"}
                            className="flex flex-col h-auto py-4"
                            onClick={() => setSelectedStatus("Draft")}
                        >
                            <FileDown className="h-6 w-6 mb-2" />
                            Draft
                        </Button>
                        <Button
                            variant={selectedStatus === "Ready" ? "default" : "outline"}
                            className="flex flex-col h-auto py-4"
                            onClick={() => setSelectedStatus("Ready")}
                            disabled={isCurrentDraft} // Cannot jump from Draft straight to locked usually, but wait. Server rule restricts Draft -> Locked. But UI can just let them pick Ready. Let's not disable buttons here, server validates transitions.
                        >
                            <Rocket className="h-6 w-6 mb-2" />
                            Ready
                        </Button>
                        <Button
                            variant={selectedStatus === "Locked" ? "default" : "outline"}
                            className="flex flex-col h-auto py-4"
                            onClick={() => setSelectedStatus("Locked")}
                            disabled={isCurrentDraft} // Let's disable jumping Draft to Locked to guide UI flow
                        >
                            <Lock className="h-6 w-6 mb-2" />
                            Locked
                        </Button>
                    </div>

                    {isCurrentDraft && selectedStatus === "Locked" && (
                        <p className="text-sm text-destructive mt-2">
                            {t("dialogs.status.draftToLockedWarning")}
                        </p>
                    )}

                    {isCurrentLocked && selectedStatus !== "Locked" && (
                        <div className="flex items-start space-x-2 bg-amber-50 p-3 rounded-md border border-amber-200 mt-4">
                            <Checkbox
                                id="confirm-unlock"
                                checked={confirmUnlock}
                                onCheckedChange={(checked) => setConfirmUnlock(checked as boolean)}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="confirm-unlock" className="font-semibold text-amber-900">
                                    {t("dialogs.status.confirmUnlock")}
                                </Label>
                                <p className="text-sm text-amber-700">
                                    {t("dialogs.status.unlockWarning")}
                                </p>
                            </div>
                        </div>
                    )}
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
                    <Button
                        onClick={onSubmit}
                        disabled={
                            isSubmitting ||
                            selectedStatus === character.status ||
                            (isCurrentLocked && selectedStatus !== "Locked" && !confirmUnlock) ||
                            (isCurrentDraft && selectedStatus === "Locked")
                        }
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t("dialogs.status.submit")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
