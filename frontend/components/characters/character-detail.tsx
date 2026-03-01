"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
    CharacterDetailDto,
    CharacterAbilityDto,
    CharacterAttachmentDto,
    CharacterNarrativeLinksDto,
    charactersApi
} from "@/utils/characters-api";
import { EventDetailDto } from "@/utils/events-api";
import { ArrowLeft, Trash2, RotateCcw, Lock, Edit2, Check, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CharacterStatusBadge } from "./character-status-badge";
import { EditCharacterDialog } from "./edit-character-dialog";
import { ChangeStatusDialog } from "./change-status-dialog";
import { DuplicateCharacterDialog } from "./duplicate-character-dialog";
import { AbilitiesPanel } from "./abilities-panel";
import { AttachmentsPanel } from "./attachments-panel";
import { PhotoUpload } from "./photo-upload";
import { NarrativePanel } from "./narrative-panel";
import { RichTextView } from "@/components/ui/rich-text-view";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface CharacterDetailProps {
    event: EventDetailDto;
    initialCharacter: CharacterDetailDto;
    initialAbilities: CharacterAbilityDto[];
    initialAttachments: CharacterAttachmentDto[];
    initialNarrativeLinks: CharacterNarrativeLinksDto;
    isOrgOrSysAdmin: boolean;
    token: string;
}

export function CharacterDetail({
    event,
    initialCharacter,
    initialAbilities,
    initialAttachments,
    initialNarrativeLinks,
    isOrgOrSysAdmin,
    token
}: CharacterDetailProps) {
    const t = useTranslations("characters");
    const locale = useLocale();
    const router = useRouter();

    // We start out with the initial props, but user actions (like edit) will mutate them via server-actions/router.refresh()
    const character = initialCharacter;
    const isLocked = character.status === "Locked";
    const isDeleted = !!character.deletedAt;

    // Inline edit states
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [bioValue, setBioValue] = useState("");
    const [isSubmittingBio, setIsSubmittingBio] = useState(false);

    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [notesValue, setNotesValue] = useState("");
    const [isSubmittingNotes, setIsSubmittingNotes] = useState(false);

    const startEditingBio = () => {
        setBioValue(character.biography || "");
        setIsEditingBio(true);
    };

    const startEditingNotes = () => {
        setNotesValue(character.notes || "");
        setIsEditingNotes(true);
    };

    const handleSaveBio = async () => {
        try {
            setIsSubmittingBio(true);
            await charactersApi.updateCharacter(token, event.id, character.id, {
                name: character.name,
                race: character.race,
                biography: bioValue || null,
                notes: character.notes,
                playerUserId: character.playerUserId
            });
            toast.success(t("notifications.updated"));
            setIsEditingBio(false);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update biography");
        } finally {
            setIsSubmittingBio(false);
        }
    };

    const handleSaveNotes = async () => {
        try {
            setIsSubmittingNotes(true);
            await charactersApi.updateCharacter(token, event.id, character.id, {
                name: character.name,
                race: character.race,
                biography: character.biography,
                notes: notesValue || null,
                playerUserId: character.playerUserId
            });
            toast.success(t("notifications.updated"));
            setIsEditingNotes(false);
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update notes");
        } finally {
            setIsSubmittingNotes(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this character?")) return;
        try {
            await charactersApi.deleteCharacter(token, event.id, character.id, "User requested deletion");
            toast.success(t("notifications.deleted"));
            router.push(`/${locale}/characters/${event.id}`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete character");
        }
    };

    const handleRestore = async () => {
        try {
            await charactersApi.undeleteCharacter(token, event.id, character.id);
            toast.success(t("notifications.restored"));
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Failed to restore character");
        }
    };

    return (
        <div className="space-y-6 lg:max-w-6xl lg:mx-auto">
            {/* Breadcrumb / Back Navigation */}
            <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/characters/${event.id}`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to {event.name}
                </Button>
            </div>

            {/* Header Card */}
            <div className="bg-card rounded-lg border p-6 flex flex-col md:flex-row gap-6 relative overflow-hidden">
                {isDeleted && (
                    <div className="absolute top-0 left-0 right-0 bg-destructive/10 text-destructive text-center text-sm font-semibold py-1">
                        This character is deleted.
                    </div>
                )}

                <div className="flex-shrink-0 mt-2 md:mt-0 relative group">
                    <PhotoUpload
                        eventId={event.id}
                        character={character}
                        token={token}
                        isOrgOrSysAdmin={isOrgOrSysAdmin}
                    />
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-2">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight mb-1 truncate">{character.name}</h1>
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <span className="font-medium text-foreground">{character.race}</span>
                                    <span>•</span>
                                    <span>Created {format(new Date(character.createdAt), 'PPP')}</span>
                                </div>
                            </div>
                            <div className="flex shrink-0">
                                <CharacterStatusBadge status={character.status} className="text-sm px-3 py-1" />
                            </div>
                        </div>

                        {character.playerUserId ? (
                            <p className="text-sm">
                                <span className="text-muted-foreground">Played by: </span>
                                <span className="font-medium">{character.playerUserId}</span>
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">Unassigned Player</p>
                        )}
                    </div>

                    {isOrgOrSysAdmin && (
                        <div className="mt-6 flex flex-wrap items-center gap-2">
                            <EditCharacterDialog eventId={event.id} token={token} character={character} />
                            <ChangeStatusDialog eventId={event.id} token={token} character={character} />
                            <DuplicateCharacterDialog eventId={event.id} token={token} character={character} />

                            {!isDeleted ? (
                                <Button variant="destructive" size="sm" onClick={handleDelete} className="ml-auto">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" onClick={handleRestore} className="ml-auto text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Restore
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Tabbed Content */}
            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none h-auto bg-transparent p-0">
                    <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
                        Profile
                    </TabsTrigger>
                    <TabsTrigger value="abilities" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
                        Abilities <span className="ml-2 bg-muted text-foreground px-2 py-0.5 rounded-full text-xs">{character.abilitiesCount}</span>
                    </TabsTrigger>
                    <TabsTrigger value="attachments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
                        Attachments <span className="ml-2 bg-muted text-foreground px-2 py-0.5 rounded-full text-xs">{character.attachmentsCount}</span>
                    </TabsTrigger>
                    <TabsTrigger value="narrative" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
                        Narrative
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-6">
                            <div className="bg-card rounded-lg border p-6">
                                <div className="flex items-center justify-between border-b pb-2 mb-4">
                                    <h3 className="text-lg font-semibold text-foreground/80">Biography & Public Story</h3>
                                    {isOrgOrSysAdmin && !isLocked && !isDeleted && !isEditingBio && (
                                        <Button variant="ghost" size="sm" onClick={startEditingBio} className="h-8 group">
                                            <Edit2 className="h-4 w-4 mr-1 text-muted-foreground group-hover:text-foreground" />
                                            {t("detail.biography.edit")}
                                        </Button>
                                    )}
                                </div>

                                {isEditingBio ? (
                                    <div className="space-y-4">
                                        <RichTextEditor value={bioValue} onChange={setBioValue} disabled={isSubmittingBio} />
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setIsEditingBio(false)} disabled={isSubmittingBio}>
                                                <X className="h-4 w-4 mr-1" />
                                                {t("detail.biography.cancel")}
                                            </Button>
                                            <Button size="sm" onClick={handleSaveBio} disabled={isSubmittingBio}>
                                                {isSubmittingBio ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                                                {t("detail.biography.save")}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="min-h-[100px]">
                                        {character.biography ? (
                                            <RichTextView html={character.biography} />
                                        ) : (
                                            <p className="text-muted-foreground italic">{t("detail.biography.empty")}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6">
                            {(isOrgOrSysAdmin || character.notes) && (
                                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900/50 p-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-500 flex items-center gap-2">
                                            Internal Notes
                                            {isLocked && <Lock className="h-4 w-4" />}
                                        </h3>
                                        {isOrgOrSysAdmin && !isDeleted && !isEditingNotes && (
                                            <Button variant="ghost" size="sm" onClick={startEditingNotes} className="h-8 text-amber-700 hover:text-amber-900 hover:bg-amber-100 dark:text-amber-400 dark:hover:text-amber-200 dark:hover:bg-amber-900/40">
                                                <Edit2 className="h-4 w-4 mr-1" />
                                                {t("detail.notes.edit")}
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-xs text-amber-700 dark:text-amber-600 mb-4 opacity-80">
                                        Visible only to organizers. Used for GM secrets, plots, etc.
                                    </p>

                                    {isEditingNotes ? (
                                        <div className="space-y-4">
                                            <RichTextEditor value={notesValue} onChange={setNotesValue} disabled={isSubmittingNotes} className="border-amber-300 dark:border-amber-800" />
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => setIsEditingNotes(false)} disabled={isSubmittingNotes} className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/40">
                                                    <X className="h-4 w-4 mr-1" />
                                                    {t("detail.notes.cancel")}
                                                </Button>
                                                <Button size="sm" onClick={handleSaveNotes} disabled={isSubmittingNotes} className="bg-amber-600 hover:bg-amber-700 text-white">
                                                    {isSubmittingNotes ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                                                    {t("detail.notes.save")}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="min-h-[80px]">
                                            {character.notes ? (
                                                <div className="text-amber-950 dark:text-amber-200">
                                                    <RichTextView html={character.notes} />
                                                </div>
                                            ) : (
                                                <p className="text-amber-700/60 dark:text-amber-700 italic text-sm">{t("detail.notes.empty")}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="abilities" className="mt-6">
                    <div className="bg-card rounded-lg border p-12 text-center text-muted-foreground">
                        <p>Abilities panel under construction.</p>
                    </div>
                </TabsContent>

                <TabsContent value="attachments" className="mt-6">
                    <AttachmentsPanel
                        eventId={event.id}
                        character={initialCharacter}
                        initialAttachments={initialAttachments}
                        token={token}
                        isOrgOrSysAdmin={isOrgOrSysAdmin}
                    />
                </TabsContent>

                <TabsContent value="narrative" className="mt-6">
                    <NarrativePanel
                        eventId={event.id}
                        characterId={character.id}
                        links={initialNarrativeLinks}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
