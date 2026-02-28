# Decision Log

Lightweight log of noteworthy architecture and design decisions.

## 2026-02-26
- Context: Initial repository setup and multi-agent collaboration.
  Decision: Create a shared decision log in `docs/architecture/decision-log.md` to record key choices.
  Alternatives: No formal log; ad-hoc notes in issues or PRs.

## 2026-02-27
- **Context**: Enabling authentication and multi-tenant foundation.
  **Decision**: Adopted `@supabase/ssr` for session management to support Server Components and localized routing.
  **Alternatives**: `supabase-js` only (harder to manage sessions in middleware/server components).

- **Context**: Localized routing vs. API/Auth routes conflict.
  **Decision**: Modified middleware to bypass `next-intl` routing for `/auth/callback` and `/api` paths to avoid 404s and unintentional redirects.
  **Alternatives**: Moving callback into `[locale]` folder (rejected to keep auth URLs simple and provider-agnostic).

- **Context**: Initial application ownership.
  **Decision**: Implemented a Postgres trigger to dynamically assign the `owner` role to `cvesspy@gmail.com` on their first Google OAuth sign-in.
  **Alternatives**: Manual seed script (rejected as it requires the user's UUID beforehand).

- **Context**: Securing API Gateway and communicating with Supabase from Server.
  **Decision**: Migrated from a static symmetric `JwtSecret` to **Asymmetric JWT Signing Keys** using a public JWKS endpoint. Replaced the legacy `service_role` string with a **Secret API Key**.
  **Alternatives**: Continuing to use the legacy static secret key (rejected due to compliance/security concerns and future deprecation risks outlined by Supabase).

- **Context**: JWKS key retrieval in ASP.NET Core — `OpenIdConnectConfigurationRetriever` was used to fetch the JWKS but returned 401 for all requests.
  **Decision**: Replaced `ConfigurationManager<OpenIdConnectConfiguration>` + `OpenIdConnectConfigurationRetriever` with a direct `HttpClient` fetch parsed via `JsonWebKeySet.Create()`. Keys are cached in memory after the first fetch.
  **Root Cause**: `OpenIdConnectConfigurationRetriever` expects a full OpenID Connect discovery document (`openid-configuration`), while Supabase's `/auth/v1/.well-known/jwks.json` endpoint returns a raw `{"keys":[...]}` JWKS document. The mismatch meant signing keys were never loaded, causing every JWT to fail validation.
  **Alternatives**: `JsonWebKeySetRetriever` with `ConfigurationManager<JsonWebKeySet>` (rejected — requires `System.Net.Http.HttpClient` as the third constructor argument in the v8.x library, API mismatch in the available package version).

## 2026-02-28
- **Context**: Scaling the application for complex organizer teams and player access.
  **Decision**: Reworked the role model from a flat ENUM array (`tenant_role`) to a hierarchical RBAC system with three scopes (Platform, Organization, Event) and a declarative module permission matrix.
  **Implementation**:
  - Introduced `app_role` and `module_permission` types.
  - Created `system_admins` and `event_members` tables.
  - Implemented `role_module_permissions` to decouple roles from explicit permission levels.
  - Backend now uses `IClaimsTransformation` to resolve permissions dynamically.
  - Promoted `cvesspy@gmail.com` to `SystemAdmin`.
  **Alternatives**: Keeping the flat ENUM (rejected — lacked granularity for event teams and players).
  **Breaking Change**: `tenant_members` now holds a single role per row; API DTOs updated to carry permission maps.

- **Context**: Initial design used a multi-tenant model to support multiple LARP organizations.
  **Decision**: Reworked the application to a **single-organization** model. One Supabase deployment = one LARP group/organization managing multiple events. Dropped `public.tenants` and `public.tenant_members`; introduced `public.org_members` to store each user's single org-level role.
  **Implementation**:
  - New migration `20260228200000_single_org_rework.sql` creates `org_members`, migrates existing data from `tenant_members`, drops `tenant_members` and `tenants`, and updates `handle_new_user()` trigger.
  - Removed `tenant_id` column from `public.events`.
  - Backend `SanchoClaimsTransformation` now resolves `sancho:org_role` from `org_members`.
  - `UserEndpoints` updated: `GetMemberships` returns `OrgMembershipDto`; `GetPermissions` no longer accepts `tenantId`.
  - Frontend `RolesOverview` component updated to show a single org role badge.
  - All documentation (`AGENTS.md`, `ARCHITECTURE.md`, `sancho_basic_intro.md`, `application_roles.md`, `user.md`) updated; `auth_and_tenant_model.md` replaced by `auth_and_org_model.md`.
  **Alternatives**: Keeping the multi-tenant model (rejected — over-engineering for a single club/group use case; adds unnecessary complexity to RLS and data scoping).
  **Breaking Change**: `tenant_members`, `tenants`, and `TenantMembershipDto` removed. API consumers must use the new `OrgMembershipDto`.

- **Context**: Resolving lack of granular event access controls.
  **Decision**: Replaced the static team role matrix with a 3-tier hierarchy (`SystemAdmin`, `OrgOwner`, `EventManager`) and a granular `event_member_permissions` table for regular users.
  **Implementation**:
  - `OrgAdmin` and static team roles (`NarrativeTeam`, `Player`, etc.) were retired from `app_role`.
  - Created `event_member_permissions` for explicit per-module (`none`, `read`, `write`) grants.
  - Default user access restricted to `read` on `communications` (all other modules `none`).
