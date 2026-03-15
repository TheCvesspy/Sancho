"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
    NarrativeDungeonFloorDto,
    NarrativeDocumentLinkDto,
    AddNarrativeGoogleDriveLinkRequest,
    narrativeApi,
} from "@/utils/narrative-api";
import { DocumentLinkPanel, DocumentItem, DocumentLinkTranslations } from "@/components/shared/document-link-panel";

interface DungeonDocumentsMasterPanelProps {
    eventId: string;
    locationId: string;
    initialDocuments: NarrativeDocumentLinkDto[];
    floors: NarrativeDungeonFloorDto[];
    canWrite: boolean;
    token: string;
}

export function DungeonDocumentsMasterPanel({
    eventId,
    locationId,
    initialDocuments,
    floors,
    canWrite,
    token,
}: DungeonDocumentsMasterPanelProps) {
    const t = useTranslations("narrative");

    // Floor/room docs fetched async; wait for all before mounting the panel
    const [floorRoomDocs, setFloorRoomDocs] = useState<DocumentItem[] | null>(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const collected: DocumentItem[] = [];

            for (const floor of floors) {
                try {
                    const docs = await narrativeApi.listFloorDocumentsNested(
                        token, eventId, locationId, floor.id
                    );
                    for (const doc of docs) {
                        collected.push({
                            ...(doc as DocumentItem),
                            tag: floor.name,
                            isReadOnly: true,
                        });
                    }
                } catch {
                    // skip on error
                }

                for (const room of floor.rooms) {
                    try {
                        const docs = await narrativeApi.listRoomDocumentsNested(
                            token, eventId, locationId, floor.id, room.id
                        );
                        for (const doc of docs) {
                            collected.push({
                                ...(doc as DocumentItem),
                                tag: `${floor.name} – ${room.name}`,
                                isReadOnly: true,
                            });
                        }
                    } catch {
                        // skip on error
                    }
                }
            }

            if (!cancelled) setFloorRoomDocs(collected);
        })();

        return () => { cancelled = true; };
    }, [token, eventId, locationId, floors]);

    const tl: DocumentLinkTranslations = {
        title: t("documentsPanel.title"),
        addButton: t("documentsPanel.add"),
        emptyState: t("documentsPanel.empty"),
        columns: {
            name: t("documentsPanel.columns.name"),
            status: t("documentsPanel.columns.status"),
            source: t("documentsPanel.columns.source"),
            date: t("documentsPanel.columns.date"),
            actions: t("documentsPanel.columns.actions"),
            tag: t("documentsPanel.columns.tag"),
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

    const handleAdd = async (data: {
        url: string;
        displayName: string;
        documentStatus: "Draft" | "Ready to Review" | "Final";
    }): Promise<DocumentItem> => {
        const req: AddNarrativeGoogleDriveLinkRequest = {
            url: data.url,
            displayName: data.displayName,
            documentStatus: data.documentStatus,
        };
        const created = await narrativeApi.addLocationGoogleDriveDocument(token, eventId, locationId, req);
        return created as DocumentItem;
    };

    const handleDelete = async (id: string) => {
        await narrativeApi.deleteLocationDocument(token, eventId, locationId, id);
    };

    // Show loader until floor/room docs are fetched — DocumentLinkPanel only reads
    // initialDocuments once (useState), so we must have the full list before mounting.
    if (floorRoomDocs === null) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const combined: DocumentItem[] = [
        ...(initialDocuments as DocumentItem[]),
        ...floorRoomDocs,
    ];

    return (
        <DocumentLinkPanel
            initialDocuments={combined}
            isReadOnly={!canWrite}
            onAdd={handleAdd}
            onDelete={handleDelete}
            translations={tl}
        />
    );
}
