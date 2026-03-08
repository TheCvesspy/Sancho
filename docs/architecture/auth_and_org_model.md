# Authentication & Organization Model

This document describes how Sancho identifies users, manages their sessions, and enforces access control.
Canonical source: [authorization_guidelines.md](/D:/Sancho/docs/architecture/authorization_guidelines.md).

## Technology Stack
- **Provider**: [Supabase Auth](https://supabase.com/auth)
- **Integration**: `@supabase/ssr`
- **Method**: Google OAuth (OIDC)
- **Frontend**: Next.js 15 Middleware for session persistence and route protection.

## User Lifecycle
1. **Invite Generation**: A `SystemAdmin` or `OrgOwner` generates a cryptographically secure random token via the Identity module.
2. **Invite Storage**: The SHA-256 hash of the token is stored in `public.invite_tokens`. The raw token is shared with the invitee.
3. **Registration**: The user enters the raw token, email, and password on the Register page.
4. **Validation**: The frontend hashes the token (SHA-256) and passes it in the `signUp` metadata.
5. **Post-Auth Trigger**: `handle_new_user()` validates the hash.
   - If valid: Create profile, mark token as `used`.
   - If invalid/missing: The insert into `auth.users` is blocked (Registration fails).
6. **Login**: After registration, the user can log in via Email/Password or Google OAuth (if email matches).

## Single-Organization Model
Sancho operates as a **single-organization** deployment. There is no `tenants` table. All users share the same implicit organization.

### Core Tables
- **user_profiles**: Public-schema user metadata.
- **system_admins**: Global platform administrators.
- **org_members**: The user's org-level role (`OrgOwner`). One row per user.
- **event_members**: Event-level role (`EventManager`), one row per user+event.
- **event_member_permissions**: Explicit per-module granular permissions (`none`, `read`, `write`) for regular users.

### RLS Implementation
Every table containing event-specific data (e.g., characters) MUST have an `event_id` column.
RLS must reflect the same precedence as the authorization contract:

1. `system_admins` (platform access)
2. `org_members` (`OrgOwner`)
3. `event_members` (`EventManager`) for matching `event_id`
4. explicit `event_member_permissions` for matching `(user_id, event_id, module)`

Org-level access is controlled via `org_members`:
```sql
CREATE POLICY "Org members can view" ON some_table
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.org_members WHERE user_id = auth.uid())
);
```
Event-level access is controlled via `event_members`:
```sql
CREATE POLICY "Event members can view" ON some_table
FOR SELECT USING (
  event_id IN (
    SELECT event_id FROM public.event_members WHERE user_id = auth.uid()
  )
);
```
Module-level access is controlled via `event_member_permissions` with module-specific checks, for example:
```sql
EXISTS (
  SELECT 1
  FROM public.event_member_permissions emp
  WHERE emp.user_id = auth.uid()
    AND emp.event_id = some_table.event_id
    AND emp.module = 'characters'
    AND emp.permission IN ('read', 'write')
)
```

## Route Protection (Middleware)
Authenticated and Unauthenticated states are managed in `frontend/utils/supabase/middleware.ts`:
- **Unauthenticated**: Redirects most paths to `/{locale}/login`.
- **Authenticated**: Allows access to application routes.
- **Bypass**: API routes (`/api/*`) and auth callback (`/auth/callback`) bypass the `next-intl` localization wrapper to ensure stability.

## Backend JWT Validation

The ASP.NET Core API Gateway validates every inbound request using the JWT Bearer scheme:

1. **Source**: Supabase issues ES256 JWTs (asymmetric, P-256 elliptic curve) upon sign-in.
2. **JWKS Endpoint**: Supabase publishes its public keys at `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` as a raw `{"keys":[...]}` document.
3. **Key Loading**: On first request, `Program.cs` fetches the JWKS via `HttpClient`, parses it with `JsonWebKeySet.Create()`, and caches the `SecurityKey` list in memory.
4. **Validation**: The `IssuerSigningKeyResolver` returns the cached keys. The framework validates `iss`, `aud`, signature, and expiry on every request.
5. **Claims**: `NameClaimType = "sub"` (user UUID), `RoleClaimType = "role"`.
6. **Sancho Claims**: `SanchoClaimsTransformation` adds `sancho:org_role`, `sancho:event_role`, `sancho:system_admin`, and per-module `sancho:permission:*` claims.

> **Note**: Supabase does not publish a full OpenID Connect discovery document. Only the raw JWKS endpoint is available, which is why `OpenIdConnectConfigurationRetriever` cannot be used here.
