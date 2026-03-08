const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5162";

/**
 * Fetches the user's resolved module permissions for a specific event.
 * Uses the existing GET /api/user/me/permissions?eventId={id} endpoint which
 * resolves the full permission chain: SystemAdmin > OrgOwner > EventManager > granular grants.
 *
 * Returns a map like: { characters: "write", narrative: "read", event_management: "none", ... }
 */
export async function fetchEventPermissions(
  token: string,
  eventId: string
): Promise<Record<string, string>> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/user/me/permissions?eventId=${eventId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 60 },
      }
    );
    if (!response.ok) return {};
    return await response.json();
  } catch {
    return {};
  }
}

/**
 * Resolves effective access for a module within an event.
 *
 * @param profile  - The user profile from /api/user/me
 * @param permissions - Resolved permission map from fetchEventPermissions()
 * @param module - Module key (e.g. "characters", "narrative", "event_management")
 * @returns { canRead, canWrite, isOrgOrSysAdmin }
 */
export function resolveModuleAccess(
  profile: { isSystemAdmin?: boolean; orgRole?: string | null },
  permissions: Record<string, string>,
  module: string
): { canRead: boolean; canWrite: boolean; isOrgOrSysAdmin: boolean } {
  const isOrgOrSysAdmin =
    !!profile.isSystemAdmin || profile.orgRole === "OrgOwner";
  const perm = permissions[module] ?? "none";
  const canWrite = isOrgOrSysAdmin || perm === "write";
  const canRead = canWrite || perm === "read";
  return { canRead, canWrite, isOrgOrSysAdmin };
}
