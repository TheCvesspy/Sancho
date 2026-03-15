export const ACTIVE_EVENT_COOKIE_NAME = "sancho_active_event";
export const ACTIVE_EVENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function getActiveEventIdFromCookie(cookieString: string): string | null {
    const match = cookieString
        .split("; ")
        .find((row) => row.startsWith(`${ACTIVE_EVENT_COOKIE_NAME}=`));
    if (!match) return null;
    const value = match.split("=")[1];
    return value || null;
}

export function setActiveEventCookie(eventId: string): void {
    document.cookie = `${ACTIVE_EVENT_COOKIE_NAME}=${eventId}; path=/; max-age=${ACTIVE_EVENT_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function clearActiveEventCookie(): void {
    document.cookie = `${ACTIVE_EVENT_COOKIE_NAME}=; path=/; max-age=0`;
}
