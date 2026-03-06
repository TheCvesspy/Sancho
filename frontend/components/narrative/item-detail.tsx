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
    isOrgOrSysAdmin: boolean;
    token: string;
}

export function ItemDetail({
    event,
    initialItem,
    initialAssignments,
    initialDocuments,
    isOrgOrSysAdmin,
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
                {isOrgOrSysAdmin && (
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

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">{t("items.detail.tabs.overview")}</TabsTrigger>
                    <TabsTrigger value="assignments">
                        {t("items.detail.tabs.assignments")}
                    </TabsTrigger>
                    <TabsTrigger value="documents">
                        {t("items.detail.tabs.documents")}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-8 mt-4">
                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold tracking-tight">{t("items.fields.description.label")}</h2>
                        <EditableRichText
                            initialHtml={item.description || ""}
                            onSave={async (val) => await handleUpdate({ description: val })}
                            isReadOnly={!isOrgOrSysAdmin}
                            placeholder="Add item description..."
                        />
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold tracking-tight">{t("items.fields.internalNotes.label")}</h2>
                        <EditableRichText
                            initialHtml={item.internalNotes || ""}
                            onSave={async (val) => await handleUpdate({ internalNotes: val })}
                            isReadOnly={!isOrgOrSysAdmin}
                            placeholder="Private notes (viewable only by organizers)..."
                        />
                    </section>
                </TabsContent>

                <TabsContent value="assignments">
                    <ItemAssignmentsPanel
                        eventId={event.id}
                        item={item}
                        initialAssignments={initialAssignments}
                        isOrgOrSysAdmin={isOrgOrSysAdmin}
                        token={token}
                    />
                </TabsContent>

                <TabsContent value="documents">
                    <ItemDocumentsPanel
                        eventId={event.id}
                        itemId={item.id}
                        initialDocuments={initialDocuments}
                        isOrgOrSysAdmin={isOrgOrSysAdmin}
                        token={token}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
