namespace User.Models;

public record UserProfileDto(
    Guid Id, 
    string Email, 
    string? DisplayName,
    string? AvatarUrl, 
    string? Bio, 
    string Locale);

public record TenantMembershipDto(
    Guid TenantId, 
    string TenantName, 
    string[] Roles);

public record UpdateProfileRequest(
    string? DisplayName, 
    string? Bio, 
    string? Locale);

public record AvatarUploadUrlResponse(
    string UploadUrl, 
    string FilePath);

public record ConfirmAvatarRequest(
    string FilePath);

internal record SupabaseTenantMembershipResponse(
    Guid tenant_id,
    string[] roles,
    SupabaseTenantNameResponse tenants);

internal record SupabaseTenantNameResponse(
    string name);

internal record SupabaseSignUploadResponse(
    string token);
