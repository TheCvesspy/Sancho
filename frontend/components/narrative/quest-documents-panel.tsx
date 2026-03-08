"use client";

import { useTranslations } from "next-intl";
import { narrativeApi, NarrativeDocumentLinkDto, AddNarrativeGoogleDriveLinkRequest } from "@/utils/narrative-api";
import { DocumentLinkPanel, DocumentItem, DocumentLinkTranslations } from "@/components/shared/document-link-panel";

interface QuestDocumentsPanelProps {
    eventId: string;
    questId: string;
    initialDocuments: NarrativeDocumentLinkDto[];
    canWrite: boolean;
    token: string;
}

export function QuestDocumentsPanel({ eventId, questId, initialDocuments, canWrite, token }: QuestDocumentsPanelProps) {
    const t = useTranslations("narrative");

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
        const created = await narrativeApi.addQuestGoogleDriveDocument(token, eventId, questId, req);
        return created as DocumentItem;
    };

    const handleDelete = async (id: string) => {
        await narrativeApi.deleteQuestDocument(token, eventId, questId, id);
    };

    return (
        <DocumentLinkPanel
            initialDocuments={initialDocuments as DocumentItem[]}
            isReadOnly={!canWrite}
            onAdd={handleAdd}
            onDelete={handleDelete}
            translations={tl}
        />
    );
}
