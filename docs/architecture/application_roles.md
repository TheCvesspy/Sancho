# Sancho Application Roles & Permissions

This document serves as a reference for the module-specific role system used in Sancho.

## Core Authorization Model

Sancho uses a **Modular Multi-Tenant Role-Based Access Control (RBAC)** system. 
Each user is a member of one or more tenants, and their permissions within a tenant are defined by an array of roles stored in `public.tenant_members.roles`.

### Tenant-Wide Roles

These roles provide overarching access across all modules within a specific tenant.

- **`owner`**:
  - Full administrative control.
  - Can manage tenant settings, billing, and all user memberships/roles.
  - Can perform any action in any module.
- **`admin`**:
  - Can manage all application modules.
  - Can manage user roles (except owners).
  - Restricted from billing and critical tenant deletion actions.

### Module-Specific Roles

For more granular access, users can be assigned specific roles per module (Bounded Context).

| Bounded Context | Manager Role (`*_manager`) | Viewer Role (`*_viewer`) |
| :--- | :--- | :--- |
| **Event Management** | `event_manager` | `event_viewer` |
| **Characters** | `character_manager` | `character_viewer` |
| **Narrative** | `narrative_manager` | `narrative_viewer` |
| **Logistics** | `logistics_manager` | `logistics_viewer` |
| **NPC / Organization** | `npc_manager` | `npc_viewer` |
| **Finance** | `finance_manager` | `finance_viewer` |
| **Communications** | `communications_manager` | `communications_viewer` |

#### Permission Levels:
- **Manager**: Grants full CRUD (Create, Read, Update, Delete) permissions for the specific module's resources.
- **Viewer**: Grants Read-only access to the module's resources and dashboards.

## Implementation Details

- **Database Type**: PostgreSQL ENUM `public.tenant_role`.
- **Storage**: `public.tenant_members.roles` (Array).
- **Enforcement**: Via PostgreSQL **Row Level Security (RLS)** and backend service-layer validation.

## Development Guidelines

1. **Check Roles**: When implementing a new feature in a module (e.g., "Narrative"), always verify if the user has either `owner`, `admin`, or the specific `narrative_manager` role.
2. **RLS First**: Most data isolation should be handled by RLS policies using the `auth.uid()` and checking the `tenant_members` table.
3. **Updating Roles**: Changes to the available roles must be reflected in the `tenant_role` ENUM and this document.
