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
import { eventsApi, EventDetailDto } from "@/utils/events-api";
import { Settings2 } from "lucide-react";

interface EditEventDialogProps {
    event: EventDetailDto;
    token: string;
}

export function EditEventDialog({ event, token }: EditEventDialogProps) {
    const t = useTranslations("events");
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: event.name,
        location: event.location || "",
        // Format to YYYY-MM-DDThh:mm for datetime-local
        startAt: new Date(event.startAt).toISOString().slice(0, 16),
        endAt: new Date(event.endAt).toISOString().slice(0, 16)
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await eventsApi.updateEvent(token, event.id, {
                name: formData.name,
                location: formData.location || null,
                startAt: new Date(formData.startAt).toISOString(),
                endAt: new Date(formData.endAt).toISOString()
            });

            setOpen(false);
            router.refresh();
        } catch (err: any) {
            setError(err.message || t("dialogs.edit.error"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    {t("actions.edit")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t("dialogs.edit.title")}</DialogTitle>
                        <DialogDescription>{t("dialogs.edit.description")}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">{t("form.name")}</Label>
                            <Input
                                id="edit-name"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-location">{t("form.location")}</Label>
                            <Input
                                id="edit-location"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-startAt">{t("form.startAt")}</Label>
                                <Input
                                    id="edit-startAt"
                                    type="datetime-local"
                                    required
                                    value={formData.startAt}
                                    onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-endAt">{t("form.endAt")}</Label>
                                <Input
                                    id="edit-endAt"
                                    type="datetime-local"
                                    required
                                    value={formData.endAt}
                                    onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                                />
                            </div>
                        </div>
                        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "..." : t("actions.edit")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
