# Authentication & Organization Model

This document describes how Sancho identifies users, manages their sessions, and enforces access control.

## Technology Stack
- **Provider**: [Supabase Auth](https://supabase.com/auth)
- **Integration**: `@supabase/ssr`
- **Method**: Google OAuth (OIDC)
- **Frontend**: Next.js 15 Middleware for session persistence and route protection.

## User Lifecycle
1. **Sign In**: User authenticates via Google.
2. **Post-Auth Trigger**: The Postgres function `handle_new_user()` in the `public` schema is triggered by an insert in `auth.users`.
3. **Profile Creation**: A record is created in `public.user_profiles` linked by `id` (UUID).
4. **Org Initialization**:
   - If the user is the pre-defined owner (`cvesspy@gmail.com`), the trigger:
     - Inserts the user into `public.system_admins`.
     - Inserts the user into `public.org_members` with the `'OrgOwner'` role.
   - For other users, org assignment is handled via an invitation/admin flow (TBD).

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
