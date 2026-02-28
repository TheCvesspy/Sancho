namespace Identity.Models;

public record UserListItemDto(
    Guid Id,
    string Email,
    string? DisplayName,
    string? AvatarUrl,
    string Locale,
    bool IsSystemAdmin,
    string? OrgRole,
    DateTimeOffset? OrgRoleAssignedAt,
    int EventsManaged,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastSignInAt
);

public record UserDetailDto(
    Guid Id,
    string Email,
    string? DisplayName,
    string? AvatarUrl,
    string Locale,
    string? Bio,
    bool IsSystemAdmin,
    string? OrgRole,
    DateTimeOffset? OrgRoleAssignedAt,
    int EventsManaged,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastSignInAt,
    Dictionary<string, string> Permissions
);

public record AssignOrgRoleRequest();

internal record SupabaseUserAdminResponse(
    Guid id,
    string email,
    DateTimeOffset created_at,
    DateTimeOffset last_sign_in_at
);

internal record SupabaseAuthUsersData(
    List<SupabaseUserAdminResponse> users
);

internal record SupabaseUserProfileResponse(
    Guid id,
    string email,
    string? display_name,
    string? avatar_url,
    string? bio,
    string locale
);

internal record SupabaseOrgMemberResponse(
    Guid user_id,
    string role,
    DateTimeOffset created_at
);

internal record SupabaseSystemAdminResponse(
    Guid user_id
);

internal record SupabaseEventMemberResponse(
    Guid user_id,
    Guid event_id,
    string role
);

internal record SupabaseEventPermissionResponse(
    string module,
    string permission
);

public record InviteTokenDto(
    Guid Id,
    string? EmailHint,
    DateTimeOffset ExpiresAt,
    DateTimeOffset? UsedAt,
    Guid? UsedBy,
    DateTimeOffset? RevokedAt,
    DateTimeOffset CreatedAt,
    string CreatedByEmail
);

public record CreateInviteTokenRequest(
    string? EmailHint,
    int? ValidityHours
);

public record CreateInviteTokenResponse(
    string RawToken,
    Guid Id
);

internal record SupabaseInviteTokenResponse(
    Guid id,
    string? email_hint,
    DateTimeOffset expires_at,
    DateTimeOffset? used_at,
    Guid? used_by,
    DateTimeOffset? revoked_at,
    DateTimeOffset created_at,
    Guid created_by
);
