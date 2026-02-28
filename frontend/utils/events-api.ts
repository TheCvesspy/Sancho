export type EventListItemDto = {
    id: string;
    name: string;
    location: string | null;
    startAt: string;
    endAt: string;
    status: string;
    archivedAt: string | null;
    deletedAt: string | null;
};

export type EventDetailDto = {
    id: string;
    name: string;
    location: string | null;
    startAt: string;
    endAt: string;
    status: string;
    archivedAt: string | null;
    archivedBy: string | null;
    deletedAt: string | null;
    deletedBy: string | null;
    deletionReason: string | null;
    createdAt: string;
    updatedAt: string;
};

export type CreateEventRequest = {
    name: string;
    location?: string | null;
    startAt: string;
    endAt: string;
};

export type UpdateEventRequest = {
    name?: string | null;
    location?: string | null;
    startAt?: string | null;
    endAt?: string | null;
};

export type EventStatsDto = {
    charactersCount: number;
    questLinesCount: number;
    itemsCount: number;
    playersCount: number;
    sources: Record<string, string>;
};

export type RecentActivityItemDto = {
    id: string;
    eventId: string;
    actorUserId: string | null;
    actorDisplayName: string | null;
    action: string;
    entityType: string | null;
    entityId: string | null;
    metadata: Record<string, any>;
    createdAt: string;
};

export type EventManagerDto = {
    userId: string;
    userDisplayName: string | null;
    role: string;
    createdAt: string;
};

export type EventPermissionDto = {
    userId: string;
    userDisplayName: string | null;
    module: string;
    permission: string;
    grantedBy: string | null;
    grantedAt: string;
};

export type ListEventsOptions = {
    includeArchived?: boolean;
    includeDeleted?: boolean;
    page?: number;
    pageSize?: number;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5293";

async function fetcher<T>(url: string, token: string, options?: RequestInit): Promise<T> {
    const headers = {
        ...options?.headers,
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
    };

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Error ${response.status}`);
    }

    if (response.status === 204) return {} as T;
    return response.json();
}

export const eventsApi = {
    listEvents: (token: string, opts: ListEventsOptions = {}) => {
        const params = new URLSearchParams();
        if (opts.includeArchived) params.append("includeArchived", "true");
        if (opts.includeDeleted) params.append("includeDeleted", "true");
        if (opts.page) params.append("page", opts.page.toString());
        if (opts.pageSize) params.append("pageSize", opts.pageSize.toString());

        return fetcher<EventListItemDto[]>(`/api/events?${params.toString()}`, token);
    },

    getEvent: (token: string, eventId: string) =>
        fetcher<EventDetailDto>(`/api/events/${eventId}`, token),

    createEvent: (token: string, body: CreateEventRequest) =>
        fetcher<EventDetailDto>(`/api/events`, token, {
            method: "POST",
            body: JSON.stringify(body),
        }),

    updateEvent: (token: string, eventId: string, body: UpdateEventRequest) =>
        fetcher<EventDetailDto>(`/api/events/${eventId}`, token, {
            method: "PATCH",
            body: JSON.stringify(body),
        }),

    archiveEvent: (token: string, eventId: string, reason?: string) =>
        fetcher<EventDetailDto>(`/api/events/${eventId}/archive`, token, {
            method: "POST",
            body: JSON.stringify({ reason }),
        }),

    restoreEvent: (token: string, eventId: string) =>
        fetcher<EventDetailDto>(`/api/events/${eventId}/restore`, token, { method: "POST" }),

    deleteEvent: (token: string, eventId: string, reason?: string) => {
        const params = reason ? `?reason=${encodeURIComponent(reason)}` : "";
        return fetcher<void>(`/api/events/${eventId}${params}`, token, { method: "DELETE" });
    },

    undeleteEvent: (token: string, eventId: string) =>
        fetcher<void>(`/api/events/${eventId}/undelete`, token, { method: "POST" }),

    getManagers: (token: string, eventId: string) =>
        fetcher<EventManagerDto[]>(`/api/events/${eventId}/managers`, token),

    assignManager: (token: string, eventId: string, userId: string) =>
        fetcher<void>(`/api/events/${eventId}/managers/${userId}`, token, { method: "PUT" }),

    revokeManager: (token: string, eventId: string, userId: string) =>
        fetcher<void>(`/api/events/${eventId}/managers/${userId}`, token, { method: "DELETE" }),

    getPermissions: (token: string, eventId: string, userId?: string) => {
        const params = userId ? `?userId=${userId}` : "";
        return fetcher<EventPermissionDto[]>(`/api/events/${eventId}/permissions${params}`, token);
    },

    upsertPermission: (token: string, eventId: string, userId: string, module: string, permission: string) =>
        fetcher<void>(`/api/events/${eventId}/permissions/${userId}/${module}`, token, {
            method: "PUT",
            body: JSON.stringify({ permission }),
        }),

    revokePermission: (token: string, eventId: string, userId: string, module: string) =>
        fetcher<void>(`/api/events/${eventId}/permissions/${userId}/${module}`, token, { method: "DELETE" }),

    getStats: (token: string, eventId: string) =>
        fetcher<EventStatsDto>(`/api/events/${eventId}/stats`, token),

    getRecentActivity: (token: string, eventId: string, limit: number = 20) =>
        fetcher<RecentActivityItemDto[]>(`/api/events/${eventId}/activity/recent?limit=${limit}`, token),
};
