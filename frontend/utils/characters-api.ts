const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5293";

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
    const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
    const response = await fetch(fullUrl, {
        ...options,
        headers: {
            ...options?.headers,
        },
    });

    if (!response.ok) {
        if (response.status === 401) { throw new Error("errors.unauthorized"); } if (response.status === 403) { throw new Error("errors.forbidden"); }

        let errorMsg = "errors.general";
        try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorData.detail || errorData.title || errorMsg;
        } catch (e) {
            errorMsg = response.statusText || errorMsg;
        }
        throw new Error(errorMsg);
    }

    if (response.status === 204) {
        return undefined as any as T;
    }

    return response.json();
}

// --- DTOs ---

export interface CharacterListItemDto {
    id: string;
    eventId: string;
    name: string;
    race: string;
    status: "Draft" | "Ready" | "Locked";
    playerUserId: string | null;
    photoUrl: string | null;
    abilitiesCount: number;
    attachmentsCount: number;
    createdAt: string;
    updatedAt: string | null;
    deletedAt: string | null;
}

export interface CharacterDetailDto extends CharacterListItemDto {
    biography: string | null;
    notes: string | null;
}

export interface CharacterAbilityDto {
    id: string;
    characterId: string;
    category: string;
    name: string;
    value: string | null;
    description: string | null;
    sortOrder: number;
    createdAt: string;
    updatedAt: string | null;
}

export interface CharacterAttachmentDto {
    id: string;
    characterId: string;
    displayName: string;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    category: "Document" | "Image" | "Other";
    documentStatus: "Draft" | "Ready to Review" | "Final";
    sourceType: "Upload" | "GoogleDrive";
    uploadedBy: string | null;
    uploadedAt: string;
}

export interface NarrativeFactionDto {
    factionId: string;
    name: string;
    role: string | null;
}

export interface NarrativeRelationshipDto {
    otherCharacterId: string;
    otherCharacterName: string;
    type: "Ally" | "Enemy" | "Family" | "Romantic" | "Neutral";
    description: string | null;
}

export interface NarrativeQuestDto {
    questId: string;
    name: string;
    shortDescription: string | null;
    role: string | null;
    status: string;
}

export interface CharacterNarrativeLinksDto {
    factions: NarrativeFactionDto[];
    relationships: NarrativeRelationshipDto[];
    quests: NarrativeQuestDto[];
}

// --- Requests ---

export interface CreateCharacterRequest {
    name: string;
    race: string;
    biography: string | null;
    notes: string | null;
    playerUserId: string | null;
}

export interface UpdateCharacterProfileRequest {
    name: string;
    race: string;
    biography: string | null;
    notes: string | null;
    playerUserId: string | null;
}

export interface ChangeCharacterStatusRequest {
    newStatus: "Draft" | "Ready" | "Locked";
    confirmUnlock?: boolean;
}

export interface DuplicateCharacterRequest {
    newName: string | null;
}

export interface CreateCharacterAbilityRequest {
    category: string;
    name: string;
    value: string | null;
    description: string | null;
}

export interface UpdateCharacterAbilityRequest {
    category: string;
    name: string;
    value: string | null;
    description: string | null;
    sortOrder: number;
}

export interface CharacterUploadUrlRequest {
    fileName: string;
    contentType: string;
    sizeBytes: number;
}

export interface FileUploadUrlResponse {
    filePath: string;
    uploadUrl: string;
}

export interface ConfirmUploadRequest {
    fileName: string;
    filePath: string;
    mimeType: string;
    category: string;
    displayName: string | null;
    documentStatus: string;
}

export interface AddGoogleDriveLinkRequest {
    url: string;
    displayName: string;
    documentStatus: string;
}

export interface UpdateCharacterAttachmentRequest {
    displayName?: string;
    documentStatus?: string;
    newFilePath?: string;
    oldFilePath?: string;
    newGoogleDriveUrl?: string;
}

// --- API Client ---

export const charactersApi = {
    // Characters
    listCharacters: (token: string, eventId: string, includeDeleted: boolean = false) =>
        fetcher<CharacterListItemDto[]>(`/api/events/${eventId}/characters?includeDeleted=${includeDeleted}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getCharacter: (token: string, eventId: string, characterId: string) =>
        fetcher<CharacterDetailDto>(`/api/events/${eventId}/characters/${characterId}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    createCharacter: (token: string, eventId: string, data: CreateCharacterRequest) =>
        fetcher<CharacterDetailDto>(`/api/events/${eventId}/characters`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        }),

    updateCharacter: (token: string, eventId: string, characterId: string, data: UpdateCharacterProfileRequest) =>
        fetcher<CharacterDetailDto>(`/api/events/${eventId}/characters/${characterId}`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        }),

    changeStatus: (token: string, eventId: string, characterId: string, data: ChangeCharacterStatusRequest) =>
        fetcher<void>(`/api/events/${eventId}/characters/${characterId}/status`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        }),

    duplicateCharacter: (token: string, eventId: string, characterId: string, data: DuplicateCharacterRequest) =>
        fetcher<CharacterDetailDto>(`/api/events/${eventId}/characters/${characterId}/duplicate`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        }),

    deleteCharacter: (token: string, eventId: string, characterId: string, reason?: string) =>
        fetcher<void>(`/api/events/${eventId}/characters/${characterId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: reason ? JSON.stringify({ reason }) : undefined,
        }),

    undeleteCharacter: (token: string, eventId: string, characterId: string) =>
        fetcher<void>(`/api/events/${eventId}/characters/${characterId}/undelete`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        }),

    // Abilities
    listAbilities: (token: string, eventId: string, characterId: string) =>
        fetcher<CharacterAbilityDto[]>(`/api/events/${eventId}/characters/${characterId}/abilities`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    createAbility: (token: string, eventId: string, characterId: string, data: CreateCharacterAbilityRequest) =>
        fetcher<CharacterAbilityDto>(`/api/events/${eventId}/characters/${characterId}/abilities`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        }),

    updateAbility: (token: string, eventId: string, characterId: string, abilityId: string, data: UpdateCharacterAbilityRequest) =>
        fetcher<CharacterAbilityDto>(`/api/events/${eventId}/characters/${characterId}/abilities/${abilityId}`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        }),

    deleteAbility: (token: string, eventId: string, characterId: string, abilityId: string) =>
        fetcher<void>(`/api/events/${eventId}/characters/${characterId}/abilities/${abilityId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),

    // Attachments
    listAttachments: (token: string, eventId: string, characterId: string) =>
        fetcher<CharacterAttachmentDto[]>(`/api/events/${eventId}/characters/${characterId}/attachments`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    createAttachmentUploadUrl: (token: string, eventId: string, characterId: string, data: CharacterUploadUrlRequest) =>
        fetcher<FileUploadUrlResponse>(`/api/events/${eventId}/characters/${characterId}/attachments/upload-url`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        }),

    confirmAttachment: (token: string, eventId: string, characterId: string, data: ConfirmUploadRequest) =>
        fetcher<CharacterAttachmentDto>(`/api/events/${eventId}/characters/${characterId}/attachments/confirm`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        }),

    addGoogleDriveLink: (token: string, eventId: string, characterId: string, data: AddGoogleDriveLinkRequest) =>
        fetcher<CharacterAttachmentDto>(`/api/events/${eventId}/characters/${characterId}/attachments/google-drive`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        }),

    updateAttachment: (token: string, eventId: string, characterId: string, attachmentId: string, data: UpdateCharacterAttachmentRequest) =>
        fetcher<CharacterAttachmentDto>(`/api/events/${eventId}/characters/${characterId}/attachments/${attachmentId}`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        }),

    deleteAttachment: (token: string, eventId: string, characterId: string, attachmentId: string) =>
        fetcher<void>(`/api/events/${eventId}/characters/${characterId}/attachments/${attachmentId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),

    // Photo
    createPhotoUploadUrl: (token: string, eventId: string, characterId: string, data: CharacterUploadUrlRequest) =>
        fetcher<FileUploadUrlResponse>(`/api/events/${eventId}/characters/${characterId}/photo/upload-url`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        }),

    confirmPhoto: (token: string, eventId: string, characterId: string, data: { filePath: string }) =>
        fetcher<{ photoUrl: string }>(`/api/events/${eventId}/characters/${characterId}/photo/confirm`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        }),

    removePhoto: (token: string, eventId: string, characterId: string) =>
        fetcher<void>(`/api/events/${eventId}/characters/${characterId}/photo`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),

    // Narrative
    getNarrativeLinks: (token: string, eventId: string, characterId: string) =>
        fetcher<CharacterNarrativeLinksDto>(`/api/events/${eventId}/characters/${characterId}/narrative-links`, {
            headers: { Authorization: `Bearer ${token}` },
        }),
};
