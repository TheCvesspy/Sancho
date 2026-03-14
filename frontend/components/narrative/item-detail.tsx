"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
    NarrativeItemDto,
    NarrativeItemAssignmentDto,
    NarrativeDocumentLinkDto,
    narrativeApi,
    UpdateItemRequest
} from "@/utils/narrative-api";
import { EventDetailDto } from "@/utils/events-api";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { toast } from "sonner";

import { EditableRichText } from "@/components/ui/editable-rich-text";
import { NarrativeItemStatusBadge } from "./narrative-item-status-badge";
import { ChangeNarrativeItemStatusDialog } from "./change-narrative-item-status-dialog";
import { ItemAssignmentsPanel } from "./item-assignments-panel";
import { ItemDocumentsPanel } from "./item-documents-panel";

interface ItemDetailProps {
    event: EventDetailDto;
    initialItem: NarrativeItemDto;
    initialAssignments: NarrativeItemAssignmentDto[];
    initialDocuments: NarrativeDocumentLinkDto[];
    canWrite: boolean;
    token: string;
}

export function ItemDetail({
    event,
    initialItem,
    initialAssignments,
    initialDocuments,
    canWrite,
    token
}: ItemDetailProps) {
    const t = useTranslations("narrative");
    const locale = useLocale();
    const router = useRouter();

    const [item, setItem] = useState<NarrativeItemDto>(initialItem);

    const handleUpdate = async (updates: UpdateItemRequest) => {
        try {
            const updated = await narrativeApi.updateItem(token, event.id, item.id, updates);
            setItem(updated);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || t("notifications.updated"));
            throw error; // Rethrow so EditableRichText catches it
        }
    };



    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.push(`/${locale}/narrative/${event.id}`)}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">{item.name}</h1>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <NarrativeItemStatusBadge status={item.status} />
                        <span>{t("items.copyInfo.created", { date: format(new Date(item.createdAt), "PP") })}</span>
                        {item.isMultiCopy ? (
                            <span className="font-medium text-foreground">
                                {t("items.copyInfo.multiCopy")}{" "}
                                {item.maxCopies
                                    ? t("items.copyInfo.multiCopyMax", { max: item.maxCopies })
                                    : `(${t("items.copyInfo.multiCopyUnlimited")})`}
                            </span>
                        ) : (
                            <span className="font-medium text-foreground">{t("items.copyInfo.singleItem")}</span>
                        )}
                    </div>
                </div>
                {canWrite && (
                    <div className="flex items-center gap-2">
                        <ChangeNarrativeItemStatusDialog
                            eventId={event.id}
                            itemId={item.id}
                            currentStatus={item.status}
                            token={token}
                            onStatusChanged={(s) => setItem({ ...item, status: s as any })}
                        >
                            <Button variant="outline" size="sm">
                                {t("common.changeStatus")}
                            </Button>
                        </ChangeNarrativeItemStatusDialog>
                    </div>
                )}
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-muted/50 w-full justify-start h-auto flex-wrap p-1">
                    <TabsTrigger value="overview" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">{t("items.detail.tabs.overview")}</TabsTrigger>
                    <TabsTrigger value="assignments" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">
                        {t("items.detail.tabs.assignments")}
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="flex-1 sm:flex-none py-2 px-4 shadow-none data-[state=active]:bg-background">
                        {t("items.detail.tabs.documents")}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className={`${canWrite ? "lg:col-span-2" : "lg:col-span-3"} rounded-lg border bg-card p-6`}>
                            <EditableRichText
                                title={t("items.fields.description.label")}
                                initialHtml={item.description || ""}
                                onSave={async (val) => await handleUpdate({ description: val })}
                                isReadOnly={!canWrite}
                                placeholder={t("items.fields.description.placeholder")}
                            />
                        </div>

                        {canWrite && (
                            <div className="lg:col-span-1 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-6">
                                <EditableRichText
                                    title={t("items.fields.internalNotes.label")}
                                    description={t("common.internalNotesHint")}
                                    variant="amber"
                                    initialHtml={item.internalNotes || ""}
                                    onSave={async (val) => await handleUpdate({ internalNotes: val })}
                                    isReadOnly={!canWrite}
                                    placeholder={t("items.fields.internalNotes.placeholder")}
                                />
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="assignments">
                    <ItemAssignmentsPanel
                        eventId={event.id}
                        item={item}
                        initialAssignments={initialAssignments}
                        canWrite={canWrite}
                        token={token}
                    />
                </TabsContent>

                <TabsContent value="documents">
                    <ItemDocumentsPanel
                        eventId={event.id}
                        itemId={item.id}
                        initialDocuments={initialDocuments}
                        canWrite={canWrite}
                        token={token}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
