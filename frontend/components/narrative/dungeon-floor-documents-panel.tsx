"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { narrativeApi, NarrativeDocumentLinkDto, AddNarrativeGoogleDriveLinkRequest } from "@/utils/narrative-api";
import { DocumentLinkPanel, DocumentItem, DocumentLinkTranslations } from "@/components/shared/document-link-panel";
import { Loader2 } from "lucide-react";

interface DungeonFloorDocumentsPanelProps {
    eventId: string;
    locationId: string;
    floorId: string;
    canWrite: boolean;
    token: string;
}

export function DungeonFloorDocumentsPanel({ eventId, locationId, floorId, canWrite, token }: DungeonFloorDocumentsPanelProps) {
    const t = useTranslations("narrative");
    const [documents, setDocuments] = useState<NarrativeDocumentLinkDto[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const docs = await narrativeApi.listFloorDocumentsNested(token, eventId, locationId, floorId);
                if (!cancelled) setDocuments(docs);
            } catch (error) {
                console.error(error);
                if (!cancelled) setDocuments([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [token, eventId, locationId, floorId]);

    const tl: DocumentLinkTranslations = {
        title: t("locations.floors.documents"),
        addButton: t("documentsPanel.add"),
        emptyState: t("documentsPanel.empty"),
        columns: {
            name: t("documentsPanel.columns.name"),
            status: t("documentsPanel.columns.status"),
            source: t("documentsPanel.columns.source"),
            date: t("documentsPanel.columns.date"),
            actions: t("documentsPanel.columns.actions"),
        },
        statuses: {
            draft: t("documentsPanel.statuses.draft"),
            readyToReview: t("documentsPanel.statuses.readyToReview"),
            final: t("documentsPanel.statuses.final"),
        },
        dialogs: {
            add: {
                title: t("documentsPanel.dialogs.add.title"),
                urlLabel: t("documentsPanel.dialogs.add.urlLabel"),
                urlPlaceholder: t("documentsPanel.dialogs.add.urlPlaceholder"),
                nameLabel: t("documentsPanel.dialogs.add.nameLabel"),
                statusLabel: t("documentsPanel.dialogs.add.statusLabel"),
                submit: t("documentsPanel.dialogs.add.submit"),
                cancel: t("documentsPanel.dialogs.add.cancel"),
            },
            delete: {
                title: t("documentsPanel.dialogs.delete.title"),
                description: t("documentsPanel.dialogs.delete.description"),
                confirm: t("documentsPanel.dialogs.delete.confirm"),
                cancel: t("documentsPanel.dialogs.delete.cancel"),
            },
        },
        validationUrlInvalid: t("documentsPanel.validation.urlInvalid"),
        validationNameRequired: t("documentsPanel.validation.nameRequired"),
        notifications: {
            added: t("documentsPanel.notifications.added"),
            deleted: t("documentsPanel.notifications.deleted"),
            error: t("documentsPanel.notifications.error"),
        },
    };

    const handleAdd = async (data: { url: string; displayName: string; documentStatus: "Draft" | "Ready to Review" | "Final" }): Promise<DocumentItem> => {
        const req: AddNarrativeGoogleDriveLinkRequest = { url: data.url, displayName: data.displayName, documentStatus: data.documentStatus };
        const created = await narrativeApi.addFloorGoogleDriveDocumentNested(token, eventId, locationId, floorId, req);
        return created as DocumentItem;
    };

    const handleDelete = async (id: string) => {
        await narrativeApi.deleteFloorDocumentNested(token, eventId, locationId, floorId, id);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <DocumentLinkPanel
            initialDocuments={(documents || []) as DocumentItem[]}
            isReadOnly={!canWrite}
            onAdd={handleAdd}
            onDelete={handleDelete}
            translations={tl}
        />
    );
}
