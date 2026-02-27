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
