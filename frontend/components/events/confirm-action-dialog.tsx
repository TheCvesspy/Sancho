"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { eventsApi } from "@/utils/events-api";

interface ConfirmActionDialogProps {
    eventId: string;
    token: string;
    action: "archive" | "restore" | "delete" | "undelete";
    trigger: React.ReactNode;
    onSuccess?: () => void;
}

export function ConfirmActionDialog({ eventId, token, action, trigger, onSuccess }: ConfirmActionDialogProps) {
    const t = useTranslations("events.dialogs");
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [reason, setReason] = useState("");

    const needsReason = action === "archive" || action === "delete";

    const handleConfirm = async () => {
        setLoading(true);
        try {
            if (action === "archive") await eventsApi.archiveEvent(token, eventId, reason);
            else if (action === "restore") await eventsApi.restoreEvent(token, eventId);
            else if (action === "delete") await eventsApi.deleteEvent(token, eventId, reason);
            else if (action === "undelete") await eventsApi.undeleteEvent(token, eventId);

            setOpen(false);
            if (onSuccess) onSuccess();
            router.refresh();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t(`${action}.title`)}</DialogTitle>
                    <DialogDescription>{t(`${action}.description`)}</DialogDescription>
                </DialogHeader>

                {needsReason && (
                    <div className="py-4 space-y-2">
                        <Label htmlFor="reason">{t(`${action}.reasonLabel`)}</Label>
                        <Textarea
                            id="reason"
                            placeholder={t(`${action}.reasonPlaceholder`)}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button
                        variant={action === "delete" ? "destructive" : "default"}
                        onClick={handleConfirm}
                        disabled={loading}
                    >
                        {loading ? "..." : t(`${action}.confirm`)}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
