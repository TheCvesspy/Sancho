"use client";

import { useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { EventDetailDto } from "@/utils/events-api";
import {
    NarrativeLocationDetailDto,
    NarrativeDungeonFloorDto,
    NarrativeDocumentLinkDto,
    narrativeApi,
    UpdateLocationRequest
} from "@/utils/narrative-api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ArrowLeft,
    FileText,
    Link as LinkIcon,
    HardDriveUpload,
    Pencil,
    Trash2,
    RotateCcw,
    Layers
} from "lucide-react";
import { EditableRichText } from "@/components/ui/editable-rich-text";
import { NarrativeStatusBadge } from "./narrative-status-badge";
import { LocationTypeBadge } from "./location-type-badge";
import { ChangeNarrativeStatusDialog } from "./change-narrative-status-dialog";
import { LocationDocumentsPanel } from "./location-documents-panel";
import { LocationLinksPanel } from "./location-links-panel";
import { DungeonFloorsPanel } from "./dungeon-floors-panel";
import { EditLocationNameDialog } from "./edit-location-name-dialog";

interface LocationDetailProps {
    event: EventDetailDto;
    initialLocation: NarrativeLocationDetailDto;
    initialDocuments: NarrativeDocumentLinkDto[];
    canWrite: boolean;
    token: string;
}

export function LocationDetail({
    event,
    initialLocation,
    initialDocuments,
    canWrite,
    token
}: LocationDetailProps) {
    const t = useTranslations("narrative");
    const locale = useLocale();
    const router = useRouter();

    const [location, setLocation] = useState<NarrativeLocationDetailDto>(initialLocation);
    const [isActionPending, setIsActionPending] = useState(false);

    const isDungeon = location.locationType.toLowerCase() === "dungeon";
    const isLocked = location.status.toLowerCase() === "locked";

    const handleBack = () => {
        router.push(`/${locale}/narrative/${event.id}?tab=locations`);
    };

    const handleDelete = async () => {
        if (!confirm(t("locations.dialogs.delete.description"))) return;
        setIsActionPending(true);
        try {
            await narrativeApi.deleteLocation(token, event.id, location.id, "User requested deletion");
            setLocation(l => ({ ...l, deletedAt: new Date().toISOString() }));
            toast.success(t("locations.notifications.deleted"));
        } catch (error) {
            console.error(error);
            toast.error(t("common.error"));
        } finally {
            setIsActionPending(false);
        }
    };

    const handleRestore = async () => {
        setIsActionPending(true);
        try {
            await narrativeApi.undeleteLocation(token, event.id, location.id);
            setLocation(l => ({ ...l, deletedAt: null }));
            toast.success(t("locations.notifications.restored"));
        } catch (error) {
            console.error(error);
            toast.error(t("common.error"));
        } finally {
            setIsActionPending(false);
        }
    };

    const handleSaveField = async (field: "description" | "internalNotes", value: string) => {
        try {
            const req: UpdateLocationRequest = { [field]: value };
            const updated = await narrativeApi.updateLocation(token, event.id, location.id, req);
            setLocation(l => ({ ...l, [field]: updated[field], updatedAt: updated.updatedAt }));
            toast.success(t("locations.notifications.updated"));
        } catch (error) {
            console.error(error);
            toast.error(t("common.error"));
        }
    };

    const handleFloorsChanged = useCallback((floors: NarrativeDungeonFloorDto[]) => {
        setLocation(l => ({ ...l, floors }));
    }, []);

    const handleLocationUpdated = (updated: NarrativeLocationDetailDto | any) => {
        setLocation(l => ({ ...l, name: updated.name, updatedAt: updated.updatedAt }));
    };

    return (
        <div className="space-y-6 lg:max-w-6xl lg:mx-auto">
            {/* Breadcrumb / Back Navigation */}
            <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="sm" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to {event.name}
                </Button>
            </div>

            {/* ── Header card ── */}
            <div className="bg-card rounded-lg border p-6 flex flex-col gap-4 relative overflow-hidden">
                {location.deletedAt && (
                    <div className="absolute top-0 left-0 right-0 bg-destructive/10 text-destructive text-center text-sm font-semibold py-1">
                        This location is deleted.
                    </div>
                )}

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-2">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h1 className="text-3xl font-bold tracking-tight truncate">{location.name}</h1>
                                    <LocationTypeBadge type={location.locationType} />
                                </div>
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <span>Created {format(new Date(location.createdAt), 'PPP')}</span>
                                </div>
                            </div>
                            <div className="flex shrink-0">
                                <NarrativeStatusBadge status={location.status} className="text-sm px-3 py-1" />
                            </div>
                        </div>
                    </div>

                    {canWrite && (
                        <div className="mt-6 flex flex-wrap items-center gap-2">
                            <EditLocationNameDialog
                                eventId={event.id}
                                token={token}
                                location={location}
                                onUpdated={handleLocationUpdated}
                            />
                            <ChangeNarrativeStatusDialog
                                eventId={event.id}
                                entityId={location.id}
                                entityType="location"
                                currentStatus={location.status}
                                token={token}
                                onStatusChanged={(s) => setLocation(l => ({ ...l, status: s }))}
                            >
                                <Button variant="outline" size="sm">
                                    <Pencil className="mr-2 h-4 w-4" />
                                    {t("common.changeStatus")}
                                </Button>
                            </ChangeNarrativeStatusDialog>

                            {!location.deletedAt ? (
                                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isActionPending} className="ml-auto">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t("common.delete")}
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" onClick={handleRestore} disabled={isActionPending} className="ml-auto text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    {t("common.restore")}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 gap-0">
                    <TabsTrigger
                        value="overview"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4 font-medium"
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        {t("locations.detail.tabs.overview")}
                    </TabsTrigger>
                    {isDungeon && (
                        <TabsTrigger
                            value="floors"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4 font-medium"
                        >
                            <Layers className="h-4 w-4 mr-2" />
                            {t("locations.detail.tabs.floorsAndRooms")}
                        </TabsTrigger>
                    )}
                    <TabsTrigger
                        value="links"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4 font-medium"
                    >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        {t("locations.detail.tabs.links")}
                    </TabsTrigger>
                    <TabsTrigger
                        value="documents"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4 font-medium"
                    >
                        <HardDriveUpload className="h-4 w-4 mr-2" />
                        {t("locations.detail.tabs.documents")}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={`${canWrite ? "md:col-span-1" : "md:col-span-2"} space-y-6`}>
                            <div className="rounded-lg border bg-card p-6">
                                <EditableRichText
                                    title={t("locations.fields.description.label")}
                                    initialHtml={location.description || ""}
                                    placeholder={t("locations.fields.description.placeholder")}
                                    isReadOnly={!canWrite || isLocked}
                                    onSave={(html) => handleSaveField("description", html)}
                                />
                            </div>
                        </div>

                        {canWrite && (
                            <div className="space-y-6">
                                <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-6">
                                    <EditableRichText
                                        title={t("locations.fields.internalNotes.label")}
                                        description={t("common.internalNotesHint")}
                                        variant="amber"
                                        initialHtml={location.internalNotes || ""}
                                        placeholder={t("locations.fields.internalNotes.placeholder")}
                                        isReadOnly={false}
                                        onSave={(html) => handleSaveField("internalNotes", html)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {isDungeon && (
                    <TabsContent value="floors">
                        <DungeonFloorsPanel
                            eventId={event.id}
                            locationId={location.id}
                            initialFloors={location.floors}
                            canWrite={canWrite && !isLocked}
                            token={token}
                            onFloorsChanged={handleFloorsChanged}
                        />
                    </TabsContent>
                )}

                <TabsContent value="links">
                    <LocationLinksPanel
                        eventId={event.id}
                        locationId={location.id}
                        locationType={location.locationType}
                        floors={location.floors}
                        canWrite={canWrite && !isLocked}
                        token={token}
                    />
                </TabsContent>

                <TabsContent value="documents">
                    <LocationDocumentsPanel
                        eventId={event.id}
                        locationId={location.id}
                        initialDocuments={initialDocuments}
                        canWrite={canWrite && !isLocked}
                        token={token}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
