# Identity & Access API

The Identity & Access API provides endpoints for System Administrators to view all platform users and assign top-level organizational roles.

All endpoints are mounted under `/api/identity` and require a valid Supabase JWT in the `Authorization: Bearer <token>` header.

**Authorization Constraint**: Every endpoint in this module is guarded by the `SystemAdmin` policy. The caller must have a record in the `public.system_admins` table during token validation; otherwise, the API returns `403 Forbidden`.

## Endpoints

### 1. List All Users

`GET /api/identity/users`

Returns a list of all users registered in the system, combining data from their profile, current organization role, admin status, and basic activity timestamps.

**Response**: `200 OK`
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "displayName": "John Doe",
    "avatarUrl": "https://...",
    "locale": "en",
    "isSystemAdmin": false,
    "orgRole": "OrgOwner",
    "orgRoleAssignedAt": "2026-02-28T12:00:00Z",
    "eventsManaged": 2,
    "createdAt": "2026-01-01T10:00:00Z",
    "lastSignInAt": "2026-02-27T15:30:00Z"
  }
]
```

---

### 2. Get User Details
`GET /api/identity/users/{userId}`

Retrieves detailed information about a specific user, including their explicit module-level permissions across all events they belong to.

**Response**: `200 OK`
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "displayName": "John Doe",
  "avatarUrl": "https://...",
  "locale": "en",
  "bio": "LARP enthusiast",
  "isSystemAdmin": false,
  "orgRole": "OrgOwner",
  "orgRoleAssignedAt": "2026-02-28T12:00:00Z",
  "eventsManaged": 2,
  "createdAt": "2026-01-01T10:00:00Z",
  "lastSignInAt": "2026-02-27T15:30:00Z",
  "permissions": {
    "communications": "read",
    "characters": "write"
  }
}
```

---

### 3. Assign OrgOwner Role
`POST /api/identity/users/{userId}/org-role`

Assigns the `OrgOwner` role to the target user. This gives them full administrative control over the entire organization and all events within it.

**Request Body**: Empty

**Response**: `204 No Content`
- `400 Bad Request` on failure to assign
- `403 Forbidden` if caller is not SystemAdmin

---

### 4. Revoke OrgOwner Role
`DELETE /api/identity/users/{userId}/org-role`

Revokes the `OrgOwner` role from the target user.

**Response**: `204 No Content`
- `400 Bad Request` on failure to revoke
- `403 Forbidden` if caller is not SystemAdmin

## Data Aggregation Notes
Because user data is spread across Supabase native tables (`auth.users`) and custom application schemas (`public.user_profiles`, `public.org_members`, etc.), the `GET /users` endpoint performs a server-side aggregation using the Supabase Service Role key securely within the ASP.NET Core backend.
