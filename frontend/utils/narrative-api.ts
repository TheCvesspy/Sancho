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
        if (response.status === 401 || response.status === 403) {
            throw new Error(`Authentication/Authorization failed: ${response.status}`);
        }

        let errorMsg = "An error occurred while fetching the data.";
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

export interface NarrativeQuestDto {
    id: string;
    eventId: string;
    title: string;
    description: string | null;
    internalNotes: string | null;
    status: "Draft" | "Ready" | "Locked";
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface NarrativeQuestStepDto {
    id: string;
    questId: string;
    eventId: string;
    sortOrder: number;
    summary: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface NarrativeDocumentLinkDto {
    id: string;
    eventId: string;
    entityType: string;
    entityId: string;
    displayName: string;
    url: string;
    documentStatus: "Draft" | "Ready to Review" | "Final";
    sourceType: string;
    createdBy: string | null;
    createdAt: string;
}

export interface NarrativeFactionDto {
    id: string;
    eventId: string;
    name: string;
    sigilUrl: string | null;
    description: string | null;
    goals: string | null;
    internalNotes: string | null;
    status: "Draft" | "Ready" | "Locked";
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface NarrativeItemDto {
    id: string;
    eventId: string;
    name: string;
    description: string | null;
    internalNotes: string | null;
    status: "Draft" | "Ready to Review" | "Final";
    isMultiCopy: boolean;
    maxCopies: number | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface NarrativeFactionMemberDto {
    eventId: string;
    factionId: string;
    characterId: string;
    role: string | null;
    createdAt: string;
}

export interface NarrativeItemAssignmentDto {
    eventId: string;
    itemId: string;
    characterId: string;
    assignedBy: string | null;
    assignedAt: string;
    notes: string | null;
}

export interface NarrativePlotlineDto {
    id: string;
    eventId: string;
    title: string;
    description: string | null;
    internalNotes: string | null;
    status: "Draft" | "Ready" | "Locked";
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export interface NarrativePlotlinePhaseDto {
    id: string;
    plotlineId: string;
    eventId: string;
    sortOrder: number;
    title: string;
    summary: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface NarrativePlotDto {
    id: string;
    eventId: string;
    title: string;
    description: string | null;
    internalNotes: string | null;
    status: "Draft" | "Ready" | "Locked";
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

// Link DTOs
export interface NarrativePlotlineQuestLinkDto {
    eventId: string;
    plotlineId: string;
    questId: string;
    phaseId: string | null;
    sortOrder: number;
    createdAt: string;
}

export interface NarrativePlotPlotlineLinkDto {
    eventId: string;
    plotId: string;
    plotlineId: string;
    sortOrder: number;
    createdAt: string;
}

export interface NarrativeEntityCharacterLinkDto {
    eventId: string;
    entityId: string; // plotlineId, plotId
    characterId: string;
    createdAt: string;
}

export interface NarrativeEntityFactionLinkDto {
    eventId: string;
    entityId: string; // plotlineId, plotId
    factionId: string;
    createdAt: string;
}

export interface NarrativeEntityItemLinkDto {
    eventId: string;
    entityId: string; // plotlineId, plotId
    itemId: string;
    createdAt: string;
}

export interface NarrativeQuestCharacterLinkDto {
    eventId: string;
    questId: string;
    characterId: string;
    role: string | null;
    createdAt: string;
}

export interface NarrativeQuestStepItemLinkDto {
    eventId: string;
    stepId: string;
    itemId: string;
    linkType: "required" | "loot";
    createdAt: string;
}

export interface NarrativeQuestStepCharacterDto {
    eventId: string;
    stepId: string;
    characterId: string;
    createdAt: string;
}

export interface NarrativeInheritedLinksDto {
    characterIds: string[];
    factionIds: string[];
    itemIds: string[];
}

export interface NarrativeFactionRelationshipDto {
    id: string;
    eventId: string;
    sourceFactionId: string;
    targetFactionId: string | null;
    targetCharacterId: string | null;
    relationType: string;
    relationMode: string;
    mirrorGroupId: string | null;
    isAutoMirror: boolean;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}


// --- Requests ---

// Quests
export interface CreateQuestRequest {
    title: string;
    description: string | null;
    internalNotes: string | null;
}

export interface UpdateQuestRequest {
    title?: string;
    description?: string | null;
    internalNotes?: string | null;
}

export interface CreateQuestStepRequest {
    sortOrder: number;
    summary: string;
    notes?: string | null;
}

export interface UpdateQuestStepRequest {
    sortOrder?: number;
    summary?: string;
    notes?: string | null;
}

export interface UpsertQuestStepItemRequest {
    linkType: "required" | "loot";
}

export interface UpsertQuestCharacterRequest {
    role?: string | null;
}

// Factions
export interface CreateFactionRequest {
    name: string;
    sigilUrl: string | null;
    description: string | null;
    goals: string | null;
    internalNotes: string | null;
}

export interface UpdateFactionRequest {
    name?: string;
    sigilUrl?: string | null;
    description?: string | null;
    goals?: string | null;
    internalNotes?: string | null;
}

export interface UpsertFactionMemberRequest {
    role?: string | null;
}

export interface CreateFactionRelationshipRequest {
    targetFactionId?: string | null;
    targetCharacterId?: string | null;
    relationType: string;
    relationMode: string;
    notes?: string | null;
}

export interface UpdateFactionRelationshipRequest {
    relationType?: string;
    notes?: string | null;
}

// Items
export interface CreateItemRequest {
    name: string;
    description: string | null;
    internalNotes: string | null;
    isMultiCopy: boolean;
    maxCopies: number | null;
}

export interface UpdateItemRequest {
    name?: string;
    description?: string | null;
    internalNotes?: string | null;
    isMultiCopy?: boolean;
    maxCopies?: number | null;
}

export interface ItemAssignmentRequest {
    notes: string | null;
}

// Plotlines
export interface CreatePlotlineRequest {
    title: string;
    description: string | null;
    internalNotes: string | null;
}

export interface UpdatePlotlineRequest {
    title?: string;
    description?: string | null;
    internalNotes?: string | null;
}

export interface CreatePlotlinePhaseRequest {
    sortOrder: number;
    title: string;
    summary?: string | null;
}

export interface UpdatePlotlinePhaseRequest {
    sortOrder?: number;
    title?: string;
    summary?: string | null;
}

export interface UpsertPlotlineQuestRequest {
    phaseId?: string | null;
    sortOrder: number;
}

// Plots
export interface CreatePlotRequest {
    title: string;
    description: string | null;
    internalNotes: string | null;
}

export interface UpdatePlotRequest {
    title?: string;
    description?: string | null;
    internalNotes?: string | null;
}

export interface UpsertPlotPlotlineRequest {
    sortOrder: number;
}

// Shared
export interface ChangeNarrativeStatusRequest {
    status: string;
    confirmUnlock?: boolean;
}

export interface AddNarrativeGoogleDriveLinkRequest {
    url: string;
    displayName: string;
    documentStatus: string;
}


// --- API Client ---

export const narrativeApi = {
    // Quests
    listQuests: (token: string, eventId: string, includeDeleted: boolean = false) =>
        fetcher<NarrativeQuestDto[]>(`/api/events/${eventId}/narrative/quests?includeDeleted=${includeDeleted}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getQuest: (token: string, eventId: string, questId: string) =>
        fetcher<NarrativeQuestDto>(`/api/events/${eventId}/narrative/quests/${questId}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    createQuest: (token: string, eventId: string, data: CreateQuestRequest) =>
        fetcher<NarrativeQuestDto>(`/api/events/${eventId}/narrative/quests`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    updateQuest: (token: string, eventId: string, questId: string, data: UpdateQuestRequest) =>
        fetcher<NarrativeQuestDto>(`/api/events/${eventId}/narrative/quests/${questId}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    changeQuestStatus: (token: string, eventId: string, questId: string, data: ChangeNarrativeStatusRequest) =>
        fetcher<NarrativeQuestDto>(`/api/events/${eventId}/narrative/quests/${questId}/status`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    deleteQuest: (token: string, eventId: string, questId: string, reason?: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/quests/${questId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: reason ? JSON.stringify({ reason }) : undefined,
        }),

    undeleteQuest: (token: string, eventId: string, questId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/quests/${questId}/undelete`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        }),

    duplicateQuest: (token: string, eventId: string, questId: string, data: { title?: string }) =>
        fetcher<NarrativeQuestDto>(`/api/events/${eventId}/narrative/quests/${questId}/duplicate`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    // Quest Steps
    listQuestSteps: (token: string, eventId: string, questId: string) =>
        fetcher<NarrativeQuestStepDto[]>(`/api/events/${eventId}/narrative/quests/${questId}/steps`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    createQuestStep: (token: string, eventId: string, questId: string, data: CreateQuestStepRequest) =>
        fetcher<NarrativeQuestStepDto>(`/api/events/${eventId}/narrative/quests/${questId}/steps`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    updateQuestStep: (token: string, eventId: string, questId: string, stepId: string, data: UpdateQuestStepRequest) =>
        fetcher<NarrativeQuestStepDto>(`/api/events/${eventId}/narrative/quests/${questId}/steps/${stepId}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    deleteQuestStep: (token: string, eventId: string, questId: string, stepId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/quests/${questId}/steps/${stepId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),

    // Quest Step Items
    listQuestStepItems: (token: string, eventId: string, questId: string, stepId: string) =>
        fetcher<NarrativeQuestStepItemLinkDto[]>(`/api/events/${eventId}/narrative/quests/${questId}/steps/${stepId}/items`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    upsertQuestStepItem: (token: string, eventId: string, questId: string, stepId: string, itemId: string, data: UpsertQuestStepItemRequest) =>
        fetcher<NarrativeQuestStepItemLinkDto>(`/api/events/${eventId}/narrative/quests/${questId}/steps/${stepId}/items/${itemId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    deleteQuestStepItem: (token: string, eventId: string, questId: string, stepId: string, itemId: string, linkType?: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/quests/${questId}/steps/${stepId}/items/${itemId}${linkType ? `?linkType=${linkType}` : ''}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),

    // Quest Step Characters (Involved Characters / NPCs)
    listQuestStepCharacters: (token: string, eventId: string, questId: string, stepId: string) =>
        fetcher<NarrativeQuestStepCharacterDto[]>(`/api/events/${eventId}/narrative/quests/${questId}/steps/${stepId}/characters`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    upsertQuestStepCharacter: (token: string, eventId: string, questId: string, stepId: string, characterId: string) =>
        fetcher<NarrativeQuestStepCharacterDto>(`/api/events/${eventId}/narrative/quests/${questId}/steps/${stepId}/characters/${characterId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
        }),

    deleteQuestStepCharacter: (token: string, eventId: string, questId: string, stepId: string, characterId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/quests/${questId}/steps/${stepId}/characters/${characterId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),

    // Quest Links
    listQuestCharacters: (token: string, eventId: string, questId: string) =>
        fetcher<NarrativeQuestCharacterLinkDto[]>(`/api/events/${eventId}/narrative/quests/${questId}/links/characters`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    upsertQuestCharacter: (token: string, eventId: string, questId: string, characterId: string, data: UpsertQuestCharacterRequest) =>
        fetcher<NarrativeQuestCharacterLinkDto>(`/api/events/${eventId}/narrative/quests/${questId}/links/characters/${characterId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    deleteQuestCharacter: (token: string, eventId: string, questId: string, characterId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/quests/${questId}/links/characters/${characterId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),

    listQuestFactions: (token: string, eventId: string, questId: string) =>
        fetcher<NarrativeEntityFactionLinkDto[]>(`/api/events/${eventId}/narrative/quests/${questId}/links/factions`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    upsertQuestFaction: (token: string, eventId: string, questId: string, factionId: string) =>
        fetcher<NarrativeEntityFactionLinkDto>(`/api/events/${eventId}/narrative/quests/${questId}/links/factions/${factionId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
        }),

    deleteQuestFaction: (token: string, eventId: string, questId: string, factionId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/quests/${questId}/links/factions/${factionId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),

    listQuestItems: (token: string, eventId: string, questId: string) =>
        fetcher<NarrativeEntityItemLinkDto[]>(`/api/events/${eventId}/narrative/quests/${questId}/links/items`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    upsertQuestItem: (token: string, eventId: string, questId: string, itemId: string) =>
        fetcher<NarrativeEntityItemLinkDto>(`/api/events/${eventId}/narrative/quests/${questId}/links/items/${itemId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
        }),

    deleteQuestItem: (token: string, eventId: string, questId: string, itemId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/quests/${questId}/links/items/${itemId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),

    // Quest Documents
    listQuestDocuments: (token: string, eventId: string, questId: string) =>
        fetcher<NarrativeDocumentLinkDto[]>(`/api/events/${eventId}/narrative/quests/${questId}/documents`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    addQuestGoogleDriveDocument: (token: string, eventId: string, questId: string, data: AddNarrativeGoogleDriveLinkRequest) =>
        fetcher<NarrativeDocumentLinkDto>(`/api/events/${eventId}/narrative/quests/${questId}/documents/google-drive`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    deleteQuestDocument: (token: string, eventId: string, questId: string, documentId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/quests/${questId}/documents/${documentId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),


    // Factions
    listFactions: (token: string, eventId: string, includeDeleted: boolean = false) =>
        fetcher<NarrativeFactionDto[]>(`/api/events/${eventId}/narrative/factions?includeDeleted=${includeDeleted}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getFaction: (token: string, eventId: string, factionId: string) =>
        fetcher<NarrativeFactionDto>(`/api/events/${eventId}/narrative/factions/${factionId}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    createFaction: (token: string, eventId: string, data: CreateFactionRequest) =>
        fetcher<NarrativeFactionDto>(`/api/events/${eventId}/narrative/factions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    updateFaction: (token: string, eventId: string, factionId: string, data: UpdateFactionRequest) =>
        fetcher<NarrativeFactionDto>(`/api/events/${eventId}/narrative/factions/${factionId}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    changeFactionStatus: (token: string, eventId: string, factionId: string, data: ChangeNarrativeStatusRequest) =>
        fetcher<NarrativeFactionDto>(`/api/events/${eventId}/narrative/factions/${factionId}/status`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    deleteFaction: (token: string, eventId: string, factionId: string, reason?: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/factions/${factionId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: reason ? JSON.stringify({ reason }) : undefined,
        }),

    undeleteFaction: (token: string, eventId: string, factionId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/factions/${factionId}/undelete`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        }),

    // Faction Members
    listFactionMembers: (token: string, eventId: string, factionId: string) =>
        fetcher<NarrativeFactionMemberDto[]>(`/api/events/${eventId}/narrative/factions/${factionId}/members`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    upsertFactionMember: (token: string, eventId: string, factionId: string, characterId: string, data: UpsertFactionMemberRequest) =>
        fetcher<NarrativeFactionMemberDto>(`/api/events/${eventId}/narrative/factions/${factionId}/members/${characterId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    deleteFactionMember: (token: string, eventId: string, factionId: string, characterId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/factions/${factionId}/members/${characterId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),

    // Faction Relationships
    listFactionRelationships: (token: string, eventId: string, factionId: string) =>
        fetcher<NarrativeFactionRelationshipDto[]>(`/api/events/${eventId}/narrative/factions/${factionId}/relationships`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    createFactionRelationship: (token: string, eventId: string, factionId: string, data: CreateFactionRelationshipRequest) =>
        fetcher<NarrativeFactionRelationshipDto>(`/api/events/${eventId}/narrative/factions/${factionId}/relationships`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    updateFactionRelationship: (token: string, eventId: string, factionId: string, relationshipId: string, data: UpdateFactionRelationshipRequest) =>
        fetcher<NarrativeFactionRelationshipDto>(`/api/events/${eventId}/narrative/factions/${factionId}/relationships/${relationshipId}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    deleteFactionRelationship: (token: string, eventId: string, factionId: string, relationshipId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/factions/${factionId}/relationships/${relationshipId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),

    // Faction Documents
    listFactionDocuments: (token: string, eventId: string, factionId: string) =>
        fetcher<NarrativeDocumentLinkDto[]>(`/api/events/${eventId}/narrative/factions/${factionId}/documents`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    addFactionGoogleDriveDocument: (token: string, eventId: string, factionId: string, data: AddNarrativeGoogleDriveLinkRequest) =>
        fetcher<NarrativeDocumentLinkDto>(`/api/events/${eventId}/narrative/factions/${factionId}/documents/google-drive`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    deleteFactionDocument: (token: string, eventId: string, factionId: string, documentId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/factions/${factionId}/documents/${documentId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),


    // Items
    listItems: (token: string, eventId: string, includeDeleted: boolean = false) =>
        fetcher<NarrativeItemDto[]>(`/api/events/${eventId}/narrative/items?includeDeleted=${includeDeleted}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getItem: (token: string, eventId: string, itemId: string) =>
        fetcher<NarrativeItemDto>(`/api/events/${eventId}/narrative/items/${itemId}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    createItem: (token: string, eventId: string, data: CreateItemRequest) =>
        fetcher<NarrativeItemDto>(`/api/events/${eventId}/narrative/items`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    updateItem: (token: string, eventId: string, itemId: string, data: UpdateItemRequest) =>
        fetcher<NarrativeItemDto>(`/api/events/${eventId}/narrative/items/${itemId}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    changeItemStatus: (token: string, eventId: string, itemId: string, data: ChangeNarrativeStatusRequest) =>
        fetcher<NarrativeItemDto>(`/api/events/${eventId}/narrative/items/${itemId}/status`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    deleteItem: (token: string, eventId: string, itemId: string, reason?: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/items/${itemId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: reason ? JSON.stringify({ reason }) : undefined,
        }),

    undeleteItem: (token: string, eventId: string, itemId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/items/${itemId}/undelete`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        }),

    // Item Assignments
    listItemAssignments: (token: string, eventId: string, itemId: string) =>
        fetcher<NarrativeItemAssignmentDto[]>(`/api/events/${eventId}/narrative/items/${itemId}/assignments`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    assignItemToCharacter: (token: string, eventId: string, itemId: string, characterId: string, data: ItemAssignmentRequest) =>
        fetcher<NarrativeItemAssignmentDto>(`/api/events/${eventId}/narrative/items/${itemId}/assignments/${characterId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    removeItemAssignment: (token: string, eventId: string, itemId: string, characterId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/items/${itemId}/assignments/${characterId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),

    // Item Documents
    listItemDocuments: (token: string, eventId: string, itemId: string) =>
        fetcher<NarrativeDocumentLinkDto[]>(`/api/events/${eventId}/narrative/items/${itemId}/documents`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    addItemGoogleDriveDocument: (token: string, eventId: string, itemId: string, data: AddNarrativeGoogleDriveLinkRequest) =>
        fetcher<NarrativeDocumentLinkDto>(`/api/events/${eventId}/narrative/items/${itemId}/documents/google-drive`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    deleteItemDocument: (token: string, eventId: string, itemId: string, documentId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/items/${itemId}/documents/${documentId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),


    // Plotlines
    listPlotlines: (token: string, eventId: string, includeDeleted: boolean = false) =>
        fetcher<NarrativePlotlineDto[]>(`/api/events/${eventId}/narrative/plotlines?includeDeleted=${includeDeleted}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getPlotline: (token: string, eventId: string, plotlineId: string) =>
        fetcher<NarrativePlotlineDto>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    createPlotline: (token: string, eventId: string, data: CreatePlotlineRequest) =>
        fetcher<NarrativePlotlineDto>(`/api/events/${eventId}/narrative/plotlines`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    updatePlotline: (token: string, eventId: string, plotlineId: string, data: UpdatePlotlineRequest) =>
        fetcher<NarrativePlotlineDto>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    changePlotlineStatus: (token: string, eventId: string, plotlineId: string, data: ChangeNarrativeStatusRequest) =>
        fetcher<NarrativePlotlineDto>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}/status`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    deletePlotline: (token: string, eventId: string, plotlineId: string, reason?: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: reason ? JSON.stringify({ reason }) : undefined,
        }),

    undeletePlotline: (token: string, eventId: string, plotlineId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}/undelete`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        }),

    // Plotline Phases
    listPlotlinePhases: (token: string, eventId: string, plotlineId: string) =>
        fetcher<NarrativePlotlinePhaseDto[]>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}/phases`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    createPlotlinePhase: (token: string, eventId: string, plotlineId: string, data: CreatePlotlinePhaseRequest) =>
        fetcher<NarrativePlotlinePhaseDto>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}/phases`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    updatePlotlinePhase: (token: string, eventId: string, plotlineId: string, phaseId: string, data: UpdatePlotlinePhaseRequest) =>
        fetcher<NarrativePlotlinePhaseDto>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}/phases/${phaseId}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    deletePlotlinePhase: (token: string, eventId: string, plotlineId: string, phaseId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}/phases/${phaseId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),

    // Plotline Quests
    listPlotlineQuests: (token: string, eventId: string, plotlineId: string) =>
        fetcher<NarrativePlotlineQuestLinkDto[]>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}/quests`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    upsertPlotlineQuest: (token: string, eventId: string, plotlineId: string, questId: string, data: UpsertPlotlineQuestRequest) =>
        fetcher<NarrativePlotlineQuestLinkDto>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}/quests/${questId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    deletePlotlineQuest: (token: string, eventId: string, plotlineId: string, questId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}/quests/${questId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),

    // Plotline Links
    listPlotlineCharacters: (token: string, eventId: string, plotlineId: string) =>
        fetcher<NarrativeEntityCharacterLinkDto[]>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}/links/characters`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    upsertPlotlineCharacter: (token: string, eventId: string, plotlineId: string, characterId: string) =>
        fetcher<NarrativeEntityCharacterLinkDto>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}/links/characters/${characterId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
        }),

    deletePlotlineCharacter: (token: string, eventId: string, plotlineId: string, characterId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}/links/characters/${characterId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),

    listPlotlineFactions: (token: string, eventId: string, plotlineId: string) =>
        fetcher<NarrativeEntityFactionLinkDto[]>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}/links/factions`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    upsertPlotlineFaction: (token: string, eventId: string, plotlineId: string, factionId: string) =>
        fetcher<NarrativeEntityFactionLinkDto>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}/links/factions/${factionId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
        }),

    deletePlotlineFaction: (token: string, eventId: string, plotlineId: string, factionId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}/links/factions/${factionId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),

    listPlotlineItems: (token: string, eventId: string, plotlineId: string) =>
        fetcher<NarrativeEntityItemLinkDto[]>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}/links/items`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    upsertPlotlineItem: (token: string, eventId: string, plotlineId: string, itemId: string) =>
        fetcher<NarrativeEntityItemLinkDto>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}/links/items/${itemId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
        }),

    deletePlotlineItem: (token: string, eventId: string, plotlineId: string, itemId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}/links/items/${itemId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),

    getPlotlineInheritedLinks: (token: string, eventId: string, plotlineId: string) =>
        fetcher<NarrativeInheritedLinksDto>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}/links/inherited`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    // Plotline Documents
    listPlotlineDocuments: (token: string, eventId: string, plotlineId: string) =>
        fetcher<NarrativeDocumentLinkDto[]>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}/documents`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    addPlotlineGoogleDriveDocument: (token: string, eventId: string, plotlineId: string, data: AddNarrativeGoogleDriveLinkRequest) =>
        fetcher<NarrativeDocumentLinkDto>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}/documents/google-drive`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    deletePlotlineDocument: (token: string, eventId: string, plotlineId: string, documentId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/plotlines/${plotlineId}/documents/${documentId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),


    // Plots
    listPlots: (token: string, eventId: string, includeDeleted: boolean = false) =>
        fetcher<NarrativePlotDto[]>(`/api/events/${eventId}/narrative/plots?includeDeleted=${includeDeleted}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getPlot: (token: string, eventId: string, plotId: string) =>
        fetcher<NarrativePlotDto>(`/api/events/${eventId}/narrative/plots/${plotId}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    createPlot: (token: string, eventId: string, data: CreatePlotRequest) =>
        fetcher<NarrativePlotDto>(`/api/events/${eventId}/narrative/plots`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    updatePlot: (token: string, eventId: string, plotId: string, data: UpdatePlotRequest) =>
        fetcher<NarrativePlotDto>(`/api/events/${eventId}/narrative/plots/${plotId}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    changePlotStatus: (token: string, eventId: string, plotId: string, data: ChangeNarrativeStatusRequest) =>
        fetcher<NarrativePlotDto>(`/api/events/${eventId}/narrative/plots/${plotId}/status`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    deletePlot: (token: string, eventId: string, plotId: string, reason?: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/plots/${plotId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: reason ? JSON.stringify({ reason }) : undefined,
        }),

    undeletePlot: (token: string, eventId: string, plotId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/plots/${plotId}/undelete`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        }),

    // Plot Plotlines
    listPlotPlotlines: (token: string, eventId: string, plotId: string) =>
        fetcher<NarrativePlotPlotlineLinkDto[]>(`/api/events/${eventId}/narrative/plots/${plotId}/plotlines`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    upsertPlotPlotline: (token: string, eventId: string, plotId: string, plotlineId: string, data: UpsertPlotPlotlineRequest) =>
        fetcher<NarrativePlotPlotlineLinkDto>(`/api/events/${eventId}/narrative/plots/${plotId}/plotlines/${plotlineId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    deletePlotPlotline: (token: string, eventId: string, plotId: string, plotlineId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/plots/${plotId}/plotlines/${plotlineId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),

    // Plot Links
    listPlotCharacters: (token: string, eventId: string, plotId: string) =>
        fetcher<NarrativeEntityCharacterLinkDto[]>(`/api/events/${eventId}/narrative/plots/${plotId}/links/characters`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    upsertPlotCharacter: (token: string, eventId: string, plotId: string, characterId: string) =>
        fetcher<NarrativeEntityCharacterLinkDto>(`/api/events/${eventId}/narrative/plots/${plotId}/links/characters/${characterId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
        }),

    deletePlotCharacter: (token: string, eventId: string, plotId: string, characterId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/plots/${plotId}/links/characters/${characterId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),

    listPlotFactions: (token: string, eventId: string, plotId: string) =>
        fetcher<NarrativeEntityFactionLinkDto[]>(`/api/events/${eventId}/narrative/plots/${plotId}/links/factions`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    upsertPlotFaction: (token: string, eventId: string, plotId: string, factionId: string) =>
        fetcher<NarrativeEntityFactionLinkDto>(`/api/events/${eventId}/narrative/plots/${plotId}/links/factions/${factionId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
        }),

    deletePlotFaction: (token: string, eventId: string, plotId: string, factionId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/plots/${plotId}/links/factions/${factionId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),

    listPlotItems: (token: string, eventId: string, plotId: string) =>
        fetcher<NarrativeEntityItemLinkDto[]>(`/api/events/${eventId}/narrative/plots/${plotId}/links/items`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    upsertPlotItem: (token: string, eventId: string, plotId: string, itemId: string) =>
        fetcher<NarrativeEntityItemLinkDto>(`/api/events/${eventId}/narrative/plots/${plotId}/links/items/${itemId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
        }),

    deletePlotItem: (token: string, eventId: string, plotId: string, itemId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/plots/${plotId}/links/items/${itemId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),

    getPlotInheritedLinks: (token: string, eventId: string, plotId: string) =>
        fetcher<NarrativeInheritedLinksDto>(`/api/events/${eventId}/narrative/plots/${plotId}/links/inherited`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    // Plot Documents
    listPlotDocuments: (token: string, eventId: string, plotId: string) =>
        fetcher<NarrativeDocumentLinkDto[]>(`/api/events/${eventId}/narrative/plots/${plotId}/documents`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    addPlotGoogleDriveDocument: (token: string, eventId: string, plotId: string, data: AddNarrativeGoogleDriveLinkRequest) =>
        fetcher<NarrativeDocumentLinkDto>(`/api/events/${eventId}/narrative/plots/${plotId}/documents/google-drive`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }),

    deletePlotDocument: (token: string, eventId: string, plotId: string, documentId: string) =>
        fetcher<void>(`/api/events/${eventId}/narrative/plots/${plotId}/documents/${documentId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        }),
};
