# RBAC and Permission Granting Technical Reference

This document details the mechanics of the role and granular permission model in the Sancho platform.

## Database Entities

- `public.system_admins(user_id)`: Platform administrators.
- `public.org_members(user_id, role)`: Org leadership. Role is constrained to `'OrgOwner'`.
- `public.event_members(user_id, event_id, role)`: Event leadership. Role is constrained to `'EventManager'`.
- `public.event_member_permissions(user_id, event_id, module, permission)`: Granular user module access. Permission enum is `'none', 'read', 'write'`.

## Who Can Grant What?

The UI should expose role and permission assignment logic based on these rules:

1. **SystemAdmin**
   - Can grant/revoke `SystemAdmin` (to/from others).
   - Can grant/revoke `OrgOwner`.
   - Can grant/revoke `EventManager` for any event.
   - Can set/modify `event_member_permissions` for anyone on any event.

2. **OrgOwner**
   - Cannot manage `SystemAdmin`.
   - Cannot manage `OrgOwner` (except transferring their own ownership).
   - Can grant/revoke `EventManager` for any event.
   - Can set/modify `event_member_permissions` for anyone on any event.

3. **EventManager**
   - Cannot manage platform/org roles.
   - Cannot grant `EventManager`.
   - Can set/modify `event_member_permissions` for regular users **only** within their assigned `event_id`.

4. **Regular User**
   - Cannot grant roles or permissions.

## Base / Minimum Permissions

When a user has no roles and no rows in `event_member_permissions`, their base permissions for any event are:

- `communications`: **`read`**
- All other modules: **`none`**

*Note for backend implementation:* The `SanchoClaimsTransformation` must treat `read` for communications as the absolute minimum fallback.

## Permission Overlap & Precedence

If a user holds multiple privileges that touch the same module (e.g. `EventManager` and an explicit `event_member_permissions` row setting `permission='read'`), the **highest available privilege** always wins.

`SystemAdmin/OrgOwner` > `EventManager` > `write` > `read` > `none`.
