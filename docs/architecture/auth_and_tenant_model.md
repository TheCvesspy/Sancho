# Authentication & Tenant Model

This document describes how Sancho identifies users, manages their sessions, and enforces tenant isolation.

## Technology Stack
- **Provider**: [Supabase Auth](https://supabase.com/auth)
- **Integration**: `@supabase/ssr`
- **Method**: Google OAuth (OIDC)
- **Frontend**: Next.js 15 Middleware for session persistence and route protection.

## User Lifecycle
1. **Sign In**: User authenticates via Google.
2. **Post-Auth Trigger**: The Postgres function `handle_new_user()` in the `public` schema is triggered by an insert in `auth.users`.
3. **Profile Creation**: A record is created in `public.user_profiles` linked by `id` (UUID).
4. **Tenant Initialization**:
   - If the user is the pre-defined owner (`cvesspy@gmail.com`), the trigger:
     - Verifies or creates a "Default Tenant".
     - Inserts the user into `public.tenant_members` with the `['owner']` role.
   - For other users, tenant assignment is handled via invitation/organization logic (TBD).

## Multi-Tenancy (Data Isolation)
Sancho uses **Row Level Security (RLS)** in PostgreSQL to isolate data.

### Core Tables
- **tenants**: The top-level organizational unit.
- **user_profiles**: Public-schema user metadata.
- **tenant_members**: Link table defining which `user_id` belongs to which `tenant_id` and what roles they hold.

### RLS Implementation
Every table containing tenant-specific data (e.g., `events`, `characters`) MUST have a `tenant_id` column.
The RLS policy should verify the user's membership in that tenant:
```sql
CREATE POLICY "Tenant isolation" ON some_table
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
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

> **Note**: Supabase does not publish a full OpenID Connect discovery document. Only the raw JWKS endpoint is available, which is why `OpenIdConnectConfigurationRetriever` cannot be used here.

