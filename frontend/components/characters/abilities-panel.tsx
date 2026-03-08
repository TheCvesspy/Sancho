"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, PencilLine, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { CharacterAbilityDto, CharacterDetailDto, charactersApi } from "@/utils/characters-api";

interface AbilitiesPanelProps {
    eventId: string;
    character: CharacterDetailDto;
    initialAbilities: CharacterAbilityDto[];
    token: string;
    canWrite: boolean;
}

export function AbilitiesPanel({ eventId, character, initialAbilities, token, canWrite }: AbilitiesPanelProps) {
    const t = useTranslations("characters");
    const router = useRouter();
    const isLocked = character.status === "Locked";

    // In a real app we might fetch these, but for now we rely on the server component passing them down, and router.refresh() to update
    const abilities = initialAbilities;

    // Group by category
    const grouped = abilities.reduce((acc, ability) => {
        if (!acc[ability.category]) acc[ability.category] = [];
        acc[ability.category].push(ability);
        return acc;
    }, {} as Record<string, CharacterAbilityDto[]>);

    // Sort categories alphabetically
    const categories = Object.keys(grouped).sort();

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Abilities & Stats</h2>
                    <p className="text-sm text-muted-foreground">Manage character skills, attributes, and spells.</p>
                </div>
                {/* Only org/admins can edit abilities currently if we want, or maybe players too if not locked. 
                    Backend says: event manager can always. For now let's show to orgs or if not locked. 
                    Actually spec says "Read-only when Locked" 
                */}
                {!isLocked && (
                    <AbilityDialog
                        mode="create"
                        eventId={eventId}
                        characterId={character.id}
                        token={token}
                        onSuccess={() => router.refresh()}
                    />
                )}
            </div>

            {categories.length === 0 ? (
                <div className="border border-dashed rounded-lg p-12 text-center text-muted-foreground">
                    No abilities recorded for this character.
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {categories.map((category) => (
                        <div key={category} className="space-y-4">
                            <h3 className="font-medium text-lg border-b pb-2">{category}</h3>
                            <div className="space-y-3">
                                {grouped[category]
                                    .sort((a, b) => a.sortOrder - b.sortOrder)
                                    .map((ability) => (
                                        <div key={ability.id} className="bg-card border rounded-md p-4 shadow-sm relative group">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-medium">{ability.name}</h4>
                                                {ability.value && (
                                                    <span className="bg-muted px-2 py-0.5 rounded text-sm font-semibold">
                                                        {ability.value}
                                                    </span>
                                                )}
                                            </div>
                                            {ability.description && (
                                                <p className="text-sm text-muted-foreground line-clamp-3">
                                                    {ability.description}
                                                </p>
                                            )}

                                            {!isLocked && (
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex bg-background/80 blur-0 rounded shadow-sm border">
                                                    <AbilityDialog
                                                        mode="edit"
                                                        eventId={eventId}
                                                        characterId={character.id}
                                                        token={token}
                                                        initialData={ability}
                                                        onSuccess={() => router.refresh()}
                                                    />
                                                    <DeleteAbilityButton
                                                        eventId={eventId}
                                                        characterId={character.id}
                                                        abilityId={ability.id}
                                                        token={token}
                                                        onSuccess={() => router.refresh()}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Sub-components for dialogs

function AbilityDialog({
    mode,
    eventId,
    characterId,
    token,
    initialData,
    onSuccess
}: {
    mode: "create" | "edit";
    eventId: string;
    characterId: string;
    token: string;
    initialData?: CharacterAbilityDto;
    onSuccess: () => void;
}) {
    const t = useTranslations("characters");
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formSchema = z.object({
        category: z.string().min(1, "Category is required"),
        name: z.string().min(1, "Name is required"),
        value: z.string().optional(),
        description: z.string().optional(),
        sortOrder: z.string().optional()
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            category: initialData?.category || "",
            name: initialData?.name || "",
            value: initialData?.value || "",
            description: initialData?.description || "",
            sortOrder: initialData?.sortOrder?.toString() || "0"
        }
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            setIsSubmitting(true);
            const parsedSortOrder = parseInt(values.sortOrder || "0", 10) || 0;

            if (mode === "create") {
                await charactersApi.createAbility(token, eventId, characterId, {
                    category: values.category,
                    name: values.name,
                    value: values.value || null,
                    description: values.description || null
                });
                toast.success("Ability added");
            } else {
                await charactersApi.updateAbility(token, eventId, characterId, initialData!.id, {
                    category: values.category,
                    name: values.name,
                    value: values.value || null,
                    description: values.description || null,
                    sortOrder: parsedSortOrder
                });
                toast.success("Ability updated");
            }
            setOpen(false);
            if (mode === "create") form.reset();
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save ability");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {mode === "create" ? (
                    <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" /> Add Ability
                    </Button>
                ) : (
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <PencilLine className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{mode === "create" ? "Add Ability" : "Edit Ability"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category *</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t("fields.placeholders.abilities.category")} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name *</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t("fields.placeholders.abilities.name")} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="value"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Value</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t("fields.placeholders.abilities.value")} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="sortOrder"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sort Order</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder={t("fields.placeholders.abilities.description")} className="resize-none" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>{t("dialogs.common.cancel")}</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function DeleteAbilityButton({ eventId, characterId, abilityId, token, onSuccess }: { eventId: string; characterId: string; abilityId: string; token: string; onSuccess: () => void }) {
    const t = useTranslations("characters");
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm(t("dialogs.delete.description"))) return;
        try {
            setIsDeleting(true);
            await charactersApi.deleteAbility(token, eventId, characterId, abilityId);
            toast.success(t("notifications.abilityDeleted"));
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete ability");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
    );
}
