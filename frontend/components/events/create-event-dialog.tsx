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
import { Plus } from "lucide-react";
import { eventsApi } from "@/utils/events-api";

interface CreateEventDialogProps {
    token: string;
}

export function CreateEventDialog({ token }: CreateEventDialogProps) {
    const t = useTranslations("events");
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        location: "",
        startAt: "",
        endAt: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (new Date(formData.endAt) < new Date(formData.startAt)) {
            setError(t("form.validation.dates"));
            setLoading(false);
            return;
        }

        try {
            await eventsApi.createEvent(token, {
                name: formData.name,
                location: formData.location || null,
                startAt: new Date(formData.startAt).toISOString(),
                endAt: new Date(formData.endAt).toISOString()
            });

            setOpen(false);
            router.refresh();
            // Reset form
            setFormData({ name: "", location: "", startAt: "", endAt: "" });
        } catch (err: any) {
            setError(err.message || t("dialogs.create.error"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="shrink-0 gap-2">
                    <Plus className="h-4 w-4" />
                    {t("actions.create")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t("dialogs.create.title")}</DialogTitle>
                        <DialogDescription>{t("dialogs.create.description")}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">{t("form.name")}</Label>
                            <Input
                                id="name"
                                required
                                placeholder={t("form.placeholder.name")}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="location">{t("form.location")}</Label>
                            <Input
                                id="location"
                                placeholder={t("form.placeholder.location")}
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="startAt">{t("form.startAt")}</Label>
                                <Input
                                    id="startAt"
                                    type="datetime-local"
                                    required
                                    value={formData.startAt}
                                    onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="endAt">{t("form.endAt")}</Label>
                                <Input
                                    id="endAt"
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
                            {loading ? "..." : t("actions.create")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
