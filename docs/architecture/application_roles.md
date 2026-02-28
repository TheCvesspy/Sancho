# Sancho Application Roles & Permissions

Sancho uses a **Hierarchical Role-Based Access Control (RBAC)** system combined with **Resource-Scoped Granular Permissions**. Access is resolved across three tiers: Platform, Organization, and Event.

## Scope Hierarchy

1.  **Platform (`SystemAdmin`)**: Global access to all organization data, system settings, and billing.
2.  **Organization (`OrgOwner`)**: Full control over the single organization, including the ability to appoint Event Managers.
3.  **Event (`EventManager`)**: Total control over a specific event.
4.  **Granular User Grants**: Per-module permissions (`none`, `read`, `write`) granted to regular users for specific events.

> **Note:** The `admin` module permission level is exclusive to `SystemAdmin`, `OrgOwner`, and `EventManager` via their role. Regular users can only be granted up to `write`.

---

## Role Definitions

| Role | Scope | Description |
| :--- | :--- | :--- |
| **`SystemAdmin`** | Platform | Full administrative control of the entire platform. Can assign OrgOwner. |
| **`OrgOwner`** | Organization | Full administrative control over the organization and all its events. |
| **`EventManager`** | Event | Total control over a specific event. Appointed by OrgOwner or SystemAdmin. |

*Roles like `NarrativeTeam` or `Player` do not exist as strict DB enums. Their access patterns are achieved via granular module grants.*

---

## Permission Resolution Logic

When determining if a user has access to a module actions, the system checks permissions in this order of priority:

1. **Is the user `SystemAdmin`?** → Full Access
2. **Is the user `OrgOwner`?** → Full Access
3. **Is the user `EventManager` for this event?** → Full Access
4. **Does the user have an explicit grant in `event_member_permissions`?** → Return granted value (`read` or `write`)
5. **No grant found?** → Default to `read` for `communications`, `none` for everything else.

### Example Access Profiles (Configured via Grants)

| Team Type | Event Mgmt | Narrative | Logistics | Finance | NPC/Org | Characters | Communications |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| *Narrative Writer* | read | write | none | none | read | read | read |
| *Logistics Coordinator*| read | none | write | none | read | none | read |
| *Player* | read | none | none | none | none | write | read |

*(These are not fixed roles, just examples of how `event_member_permissions` rows would be configured for specific users).*

---

## Technical Implementation

### Database
- **Org Roles**: Stored in `public.org_members` (one row per user_id). Must be `OrgOwner`.
- **Event Roles**: Stored in `public.event_members` (user_id, event_id). Must be `EventManager`.
- **Granular Grants**: Defined in `public.event_member_permissions` (user_id, event_id, module, permission).
- **System Admins**: Identified via the `public.system_admins` table.

### Backend
- **Claims**: Roles and permissions are injected into the user principal via `SanchoClaimsTransformation`.
  - `sancho:org_role` = the user's org-level role string.
  - `sancho:event_role` = `{eventId}:{role}` per event membership.
  - `sancho:permission:{module}` = effective permission level for each module.
- **Policies**: Every module endpoint is protected by named policies (e.g., `[Authorize(Policy = "narrative:write")]`).
- **RLS**: PostgreSQL Row Level Security enforces event isolation based on roles and explicit permission grants.

### Frontend
- **Permissions API**: Component logic should use `GET /api/user/me/permissions?eventId={id}` to resolve effective permissions for the current view context across roles and granular grants.
