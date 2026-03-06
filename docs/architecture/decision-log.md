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

- **Context**: Defining a concrete backend design for Event Management with multi-event support and operational controls.
  **Decision**: Standardized Event module API under `/api/events` with explicit lifecycle operations (archive, soft-delete, restore), integrated access-control management (event managers + per-module grants), and read models for stats and recent activity.
  **Implementation**:
  - Added API contract doc: `docs/api/events.md`.
  - Added bounded context doc: `docs/bounded-contexts/event-management.md`.
  - Documented archived-event read-only rule for non `SystemAdmin`/`OrgOwner`.
  - Confirmed `SystemAdmin` and `OrgOwner` are auto-treated as event managers without `event_members` rows.
  - Introduced lightweight `event_activity_log` design and pluggable stats provider pattern.
  **Alternatives**: Split manager assignment and permission management into separate modules (rejected due to operator workflow fragmentation).

- **Context**: Implementing Characters backend before Narrative context is available.
  **Decision**: Ship Characters as event-scoped APIs (`/api/events/{eventId}/characters/...`) with a pluggable narrative seam (`ICharacterNarrativeService`) and stub implementation for read links and deletion guard checks.
  **Implementation**:
  - Added `characters`, `character_abilities`, `character_attachments` tables with RLS.
  - Implemented soft-delete/restore, lifecycle transitions, storage upload flows, and locked-character edit rules.
  - Added deletion guard via `HasActiveRelationshipsAsync(eventId, characterId)` (stubbed for now).
  **Alternatives**: Block Character implementation until Narrative exists (rejected to avoid cross-context delivery bottleneck).

## 2026-03-06

- **Context**: Application showed unacceptable load times even for 5–8 concurrent users. Root cause analysis identified three compounding bottlenecks: missing PostgreSQL indexes causing RLS sequential scans, backend claims transformation making 5–6 serial Supabase HTTP calls per request, and frontend pages calling `/api/user/me` 3–6 times per navigation.
  **Decision**: Applied a layered performance pass across DB, backend, and frontend to eliminate avoidable work at every tier without adding hardware.
  **Implementation**:
  - **Database:** New migration `20260306000000_performance_indexes.sql` adds 11 indexes targeting RLS policy columns (`event_member_permissions(user_id, event_id, module)`, `event_members(user_id, event_id)`, `system_admins(user_id)`, `org_members(user_id, role)`) and partial `WHERE deleted_at IS NULL` indexes on `events` and `characters` for soft-delete list queries.
  - **Backend claims cache:** `SanchoClaimsTransformation` now uses `IMemoryCache` with a 90-second TTL keyed on `claims:{userId}`, collapsing 5–6 per-request Supabase calls into an in-process cache hit on repeated requests. Cache is explicitly invalidated on `AssignManager`, `RevokeManager`, `UpsertPermission`, and `RevokePermission` so permission changes take effect immediately.
  - **JWKS async prefetch + periodic refresh:** Removed the old `new HttpClient() + .Result` blocking resolver inside `IssuerSigningKeyResolver`. Keys are now pre-fetched asynchronously before the app starts accepting requests, and refreshed every hour via a `System.Threading.Timer` using `IHttpClientFactory`, so key rotations are picked up without a restart.
  - **Response compression:** Added brotli/gzip via `UseResponseCompression()` globally in the ASP.NET Core pipeline — zero-cost bandwidth reduction for all JSON endpoints.
  - **Batch ability inserts:** `DuplicateCharacter` replaced N serial POST loops with a single array POST to Supabase REST, reducing per-duplicate HTTP calls from O(N abilities) to 1.
  - **Frontend fetch deduplication:** Replaced `cache: "no-store"` with `next: { revalidate: 60 }` on `/api/user/me` across all pages. Added `Promise.all([...])` for all independent server-side data fetches (event detail, characters list, character detail, profile).
  - **Lazy-loading heavy libraries:** `RichTextEditor` (Tiptap, ~200 KB) and `RelationshipGraph` (`@xyflow/react`) are now loaded via `next/dynamic` with `ssr: false`, removing them from the initial JS bundle.
  - **Suspense streaming:** Added `loading.tsx` route segment files for `/events/[eventId]` and `/characters/[eventId]` so the page shell renders immediately while data fetches complete.
  - **React `useMemo`:** Filter/sort operations in `CharactersList` and `EventsList` are memoized to avoid re-running on unrelated re-renders.
  - **Documentation:** `AGENTS.md` and `ARCHITECTURE.md` updated with mandatory performance rules so all future modules follow the same patterns.
  **Alternatives**: Adding more compute/RAM (rejected — goal is to run well on local hardware); per-endpoint Redis caching (rejected — single-process deployment; `IMemoryCache` is sufficient and zero-dependency).

- **Context**: Narrative was previously a planned context while Character APIs already exposed narrative links and deletion guards via `ICharacterNarrativeService`.
  **Decision**: Implement Narrative backend and DB now, and activate the Character integration seam with a concrete provider.
  **Implementation**:
  - Added Narrative event-scoped endpoints under `/api/events/{eventId}/narrative` for quests, plotlines, plots, factions, and items.
  - Added Narrative migrations:
    - `20260306120000_narrative_context_v1.sql`
    - `20260306130000_narrative_plotline_plot_links.sql`
    - `20260306140000_narrative_direct_links.sql`
  - Implemented `NarrativeCharacterNarrativeService` and wired it as `ICharacterNarrativeService` in API DI.
  - Reused shared Google Drive URL validation to avoid duplicate validation logic across modules.
  - Added/updated integration tests for Narrative and EventManagement bindings.
  **Alternatives**: Keep Character seam stubbed longer (rejected due to missing production narrative links and deletion guard enforcement).
