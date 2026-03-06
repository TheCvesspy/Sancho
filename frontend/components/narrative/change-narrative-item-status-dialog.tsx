"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { narrativeApi, ChangeNarrativeStatusRequest } from "@/utils/narrative-api";

interface ChangeNarrativeItemStatusDialogProps {
    eventId: string;
    itemId: string;
    currentStatus: string;
    token: string;
    onStatusChanged: (newStatus: string) => void;
    children: React.ReactNode;
}

export function ChangeNarrativeItemStatusDialog({
    eventId,
    itemId,
    currentStatus,
    token,
    onStatusChanged,
    children
}: ChangeNarrativeItemStatusDialogProps) {
    const t = useTranslations("narrative");
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState(currentStatus);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isUnlock = currentStatus.toLowerCase() === "final" && status.toLowerCase() !== "final";

    const onSubmit = async () => {
        setIsSubmitting(true);
        try {
            const req: ChangeNarrativeStatusRequest = {
                status: status,
                confirmUnlock: isUnlock
            };

            await narrativeApi.changeItemStatus(token, eventId, itemId, req);

            onStatusChanged(status);
            setOpen(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("common.changeStatus")}</DialogTitle>
                    <DialogDescription>
                        {t("common.itemStatusDescription")}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">
                            {t("common.statusLabel")}
                        </Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={t("common.selectStatus")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Draft">{t("itemStatus.draft") || "Draft"}</SelectItem>
                                <SelectItem value="Ready to Review">{t("itemStatus.readyToReview") || "Ready to Review"}</SelectItem>
                                <SelectItem value="Final">{t("itemStatus.final") || "Final"}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                        {t("common.cancel")}
                    </Button>
                    <Button type="button" onClick={onSubmit} disabled={isSubmitting || status === currentStatus}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t("common.save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
