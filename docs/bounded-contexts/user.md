# User Bounded Context

The **User Context** manages individual user identity, profile settings, and localization preferences within the Sancho platform. The User context is globally available to any authenticated user.

## Responsibilities

- **User Profile**: Management of display names, biographies, and profile pictures (avatars).
- **Localization**: Persistence of UI language preferences (Internationalization).
- **Account Dashboard**: An overview of the user's organization role, event memberships, and a summary of their activity.
- **Security**: Self-service management of personal data with strict access controls.

> **Note on Organization Identity**: While the `User` context handles self-service functionality, system-wide role assignments and user directory management are handled by the **Identity & Access** context (`/api/identity/...`). Only `SystemAdmin` users have access to those APIs.

## Data Model

- **`public.user_profiles`** (Extends original schema)
    - `id`: UUID (Primary Key, references `auth.users`)
    - `email`: TEXT
    - `full_name`: TEXT (Internal system name)
    - `display_name`: TEXT (Publicly visible profile name)
    - `avatar_url`: TEXT (Path to the avatar file in Supabase Storage)
    - `bio`: TEXT (Personal description)
    - `locale`: TEXT (Supported: 'en', 'cs'. Default: 'en')

## API Surface (`/api/user`)

All requests require a valid Supabase JWT in the `Authorization: Bearer <token>` header.

**Token flow**:
- The Next.js server component calls `supabase.auth.getUser()` to cryptographically verify the session server-side, then forwards the session `access_token` to the backend.
- The ASP.NET Core backend validates the token using Supabase's public ES256 signing keys, fetched from the raw JWKS endpoint (`/auth/v1/.well-known/jwks.json`) via `HttpClient` + `JsonWebKeySet.Create()`, and cached in memory.


| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/user/me` | `GET` | Retrieve the current user's full profile and preferences. |
| `/api/user/me` | `PATCH` | Update `display_name`, `bio`, or `locale`. |
| `/api/user/me/memberships` | `GET` | Returns the user's single org-level leadership role (`OrgOwner`, if any). |
| `/api/user/me/permissions` | `GET` | Returns effective module permissions, conditionally scoped to an event (`?eventId=`), resolving across roles and `event_member_permissions`. |
| `/api/user/me/avatar/upload-url` | `POST` | Get a signed, short-lived URL to upload an avatar file directly to storage. |
| `/api/user/me/avatar/confirm`| `POST` | Notify the backend that the avatar has been successfully uploaded to the storage path. |

### `/api/user/me/memberships` Response Shape (Example for OrgOwner)

```json
{
  "orgRole": "OrgOwner"
}
```

### `/api/user/me/permissions?eventId=...` Response Shape (Example for regular user)

```json
{
  "permissions": {
    "event_management": "none",
    "narrative": "write",
    "characters": "read",
    "logistics": "none",
    "npc_org": "none",
    "finance": "none",
    "communications": "read"
  }
}
```

## Security and Privacy

1. **Isolation**: Users can only access and modify their own record in `user_profiles`. This is enforced via API claim validation and Database Row Level Security (RLS).
2. **Avatar Storage**: Images are stored in a private Supabase bucket (`avatars`). Public access is disabled; the UI uses signed URLs or direct authenticated requests to view images.
3. **Role Segregation**: Users can view their roles but cannot modify them. Role management is a responsibility of the `Identity and Access` or `Event Management` contexts.
4. **Backend Security**: The ASP.NET Core modules use a modern **Secret API Key** to interact securely with Supabase, bypassing RLS only when strictly necessary (e.g., signing avatar URLs or reading cross-membership roles).

## Roadmap (Phase 2)

- **Content Summary**: Aggregated counts of assets created by the user (characters, narrative pieces, logistics markers).
- **Notification Settings**: Granular control over email and in-app notifications.
- **Activity Log**: Chronological history of user actions across the platform.
