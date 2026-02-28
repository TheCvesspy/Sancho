namespace User.Models;

public record UserProfileDto(
    Guid Id, 
    string Email, 
    string? DisplayName,
    string? AvatarUrl, 
    string? Bio, 
    string Locale,
    bool IsSystemAdmin = false);

/// <summary>Represents the user's single organization-level role and their effective module permissions.</summary>
public record OrgMembershipDto(
    string OrgRole,
    Dictionary<string, string> Permissions,
    bool IsSystemAdmin = false);

/// <summary>Represents the user's role and granular permissions within a specific event.</summary>
public record EventMembershipDto(
    string EventRole,
    Dictionary<string, string> Permissions);

public record UpdateProfileRequest(
    string? DisplayName, 
    string? Bio, 
    string? Locale);

public record AvatarUploadUrlRequest(
    string ContentType);

public record AvatarUploadUrlResponse(
    string UploadUrl, 
    string FilePath);

public record ConfirmAvatarRequest(
    string FilePath);

internal record SupabaseOrgMembershipResponse(
    string role);

internal record SupabasePermissionResponse(
    string module,
    string permission);

internal record SupabaseEventMembershipResponse(
    string role);

internal record SupabaseEventPermissionResponse(
    string module,
    string permission);

internal record SupabaseSignUploadResponse(
    string token);
