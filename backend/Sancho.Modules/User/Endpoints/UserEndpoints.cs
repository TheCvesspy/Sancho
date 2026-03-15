using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using System.Security.Claims;
using User.Models;
using Microsoft.Extensions.Configuration;
using System.Net.Http.Json;
using System.Net.Http.Headers;
using Microsoft.Extensions.Logging;
using System.Text.Json.Serialization;
using System.Text.Json;
using Sancho.Shared.Roles;

namespace User.Endpoints;

public static class UserEndpoints
{
    private record SupabaseUserProfileResponse(
        Guid id,
        string email,
        [property: JsonPropertyName("display_name")] string? display_name,
        [property: JsonPropertyName("avatar_url")] string? avatar_url,
        string? bio,
        string locale,
        string theme);
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/user");

        group.MapGet("/me", GetCurrentUser)
            .WithName("GetCurrentUser")
            .RequireAuthorization();

        group.MapPatch("/me", UpdateProfile)
            .WithName("UpdateProfile")
            .RequireAuthorization();

        group.MapGet("/me/memberships", GetMemberships)
            .WithName("GetUserMemberships")
            .RequireAuthorization();

        group.MapPost("/me/avatar/upload-url", GetAvatarUploadUrl)
            .WithName("GetAvatarUploadUrl")
            .RequireAuthorization();

        group.MapPost("/me/avatar/confirm", ConfirmAvatar)
            .WithName("ConfirmAvatar")
            .RequireAuthorization();

        group.MapGet("/me/permissions", GetPermissions)
            .WithName("GetUserPermissions")
            .RequireAuthorization();
    }

    private static async Task<IResult> GetCurrentUser(ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, Microsoft.Extensions.Logging.ILoggerFactory loggerFactory)
    {
        var logger = loggerFactory.CreateLogger("UserEndpoints");
        var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) 
        {
            logger.LogWarning("GetCurrentUser: No NameIdentifier claim found in user principal.");
            return Results.Unauthorized();
        }

        var supabaseUrl = config["Supabase:Url"];
        var supabaseKey = config["Supabase:ServiceRoleKey"];

        var request = new HttpRequestMessage(HttpMethod.Get, $"{supabaseUrl}/rest/v1/user_profiles?id=eq.{userId}&select=*");
        request.Headers.Add("apikey", supabaseKey);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", supabaseKey);

        var response = await httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) 
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            logger.LogError("Failed to fetch profile from Supabase. Status: {Status}, Error: {Error}", response.StatusCode, errorBody);
            return Results.Problem("Failed to fetch profile from Supabase");
        }

        var profiles = await response.Content.ReadFromJsonAsync<List<SupabaseUserProfileResponse>>();
        var profile = profiles?.FirstOrDefault();

        if (profile == null)
        {
            return Results.NotFound();
        }

        var avatarUrl = await ResolveAvatarUrlAsync(supabaseUrl!, supabaseKey!, profile.avatar_url, httpClient);

        var isSystemAdmin = user.HasClaim("sancho:system_admin", "true");
        var orgRole = user.FindFirst("sancho:org_role")?.Value;

        return Results.Ok(new UserProfileDto(
            profile.id,
            profile.email,
            profile.display_name,
            avatarUrl,
            profile.bio,
            profile.locale,
            profile.theme,
            isSystemAdmin,
            orgRole));
    }

    private static async Task<IResult> UpdateProfile(ClaimsPrincipal user, UpdateProfileRequest request, IConfiguration config, HttpClient httpClient)
    {
        var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

        var supabaseUrl = config["Supabase:Url"];
        var supabaseKey = config["Supabase:ServiceRoleKey"];

        var patchRequest = new HttpRequestMessage(HttpMethod.Patch, $"{supabaseUrl}/rest/v1/user_profiles?id=eq.{userId}");
        patchRequest.Headers.Add("apikey", supabaseKey);
        patchRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", supabaseKey);
        patchRequest.Content = JsonContent.Create(new
        {
            display_name = request.DisplayName,
            bio = request.Bio,
            locale = request.Locale,
            theme = request.Theme
        });

        var response = await httpClient.SendAsync(patchRequest);
        return response.IsSuccessStatusCode ? Results.NoContent() : Results.Problem("Failed to update profile");
    }

    private static async Task<IResult> GetMemberships(ClaimsPrincipal user, IConfiguration config, HttpClient httpClient)
    {
        var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();
        var isSystemAdmin = user.HasClaim("sancho:system_admin", "true");

        var supabaseUrl = config["Supabase:Url"];
        var supabaseKey = config["Supabase:ServiceRoleKey"];

        // 1. Fetch org membership (single row, single role)
        var orgRequest = new HttpRequestMessage(HttpMethod.Get, $"{supabaseUrl}/rest/v1/org_members?user_id=eq.{userId}&select=role&limit=1");
        AddSupabaseHeaders(orgRequest, supabaseKey!);
        var orgResponse = await httpClient.SendAsync(orgRequest);
        if (!orgResponse.IsSuccessStatusCode) return Results.Problem($"Failed to fetch org membership: {orgResponse.StatusCode}");
        var orgData = await orgResponse.Content.ReadFromJsonAsync<List<SupabaseOrgMembershipResponse>>();
        var orgRole = orgData?.FirstOrDefault()?.role;
        if (string.IsNullOrEmpty(orgRole))
        {
            return Results.Ok(new OrgMembershipDto("", new Dictionary<string, string>(), isSystemAdmin));
        }

        // 2. Fetch permissions for the org role
        var roleFilter = $"\"{orgRole}\"";
        var permRequest = new HttpRequestMessage(HttpMethod.Get, $"{supabaseUrl}/rest/v1/role_module_permissions?role=in.({roleFilter})&select=module,permission");
        AddSupabaseHeaders(permRequest, supabaseKey!);
        var permResponse = await httpClient.SendAsync(permRequest);

        var permissions = new Dictionary<string, string>();
        if (permResponse.IsSuccessStatusCode)
        {
            var permsData = await permResponse.Content.ReadFromJsonAsync<List<SupabasePermissionResponse>>();
            if (permsData != null)
                foreach (var p in permsData)
                    permissions[p.module] = p.permission;
        }

        return Results.Ok(new OrgMembershipDto(orgRole, permissions, isSystemAdmin));
    }

    private static async Task<IResult> GetPermissions(
        ClaimsPrincipal user,
        [FromQuery] Guid? eventId,
        IConfiguration config,
        HttpClient httpClient)
    {
        var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

        var supabaseUrl = config["Supabase:Url"];
        var supabaseKey = config["Supabase:ServiceRoleKey"];

        var roles = new HashSet<string>();

        // 1. System Admin
        var sysAdminRequest = new HttpRequestMessage(HttpMethod.Get, $"{supabaseUrl}/rest/v1/system_admins?user_id=eq.{userId}&select=user_id");
        AddSupabaseHeaders(sysAdminRequest, supabaseKey!);
        var sysAdminResponse = await httpClient.SendAsync(sysAdminRequest);
        if (sysAdminResponse.IsSuccessStatusCode)
        {
            var data = await sysAdminResponse.Content.ReadFromJsonAsync<List<object>>();
            if (data?.Count > 0) roles.Add(AppRoles.SystemAdmin);
        }

        // 2. Org Role
        var orgRequest = new HttpRequestMessage(HttpMethod.Get, $"{supabaseUrl}/rest/v1/org_members?user_id=eq.{userId}&select=role&limit=1");
        AddSupabaseHeaders(orgRequest, supabaseKey!);
        var orgResponse = await httpClient.SendAsync(orgRequest);
        if (orgResponse.IsSuccessStatusCode)
        {
            var data = await orgResponse.Content.ReadFromJsonAsync<List<SupabaseOrgMembershipResponse>>();
            var orgRole = data?.FirstOrDefault()?.role;
            if (!string.IsNullOrEmpty(orgRole)) roles.Add(orgRole);
        }

        // 3. Event Role
        if (eventId.HasValue)
        {
            var eventRequest = new HttpRequestMessage(HttpMethod.Get, $"{supabaseUrl}/rest/v1/event_members?user_id=eq.{userId}&event_id=eq.{eventId}&select=role");
            AddSupabaseHeaders(eventRequest, supabaseKey!);
            var eventResponse = await httpClient.SendAsync(eventRequest);
            if (eventResponse.IsSuccessStatusCode)
            {
                var data = await eventResponse.Content.ReadFromJsonAsync<List<SupabaseEventMembershipResponse>>();
                if (data != null) foreach (var r in data) roles.Add(r.role);
            }
        }

        var permissions = new Dictionary<string, string>();
        var hierarchy = new Dictionary<string, int> { { "none", 0 }, { "read", 1 }, { "write", 2 } };

        // 4. Resolve baseline from Roles
        if (roles.Count > 0)
        {
            var roleFilter = string.Join(",", roles.Select(r => $"\"{r}\""));
            var permRequest = new HttpRequestMessage(HttpMethod.Get, $"{supabaseUrl}/rest/v1/role_module_permissions?role=in.({roleFilter})&select=module,permission");
            AddSupabaseHeaders(permRequest, supabaseKey!);
            var permResponse = await httpClient.SendAsync(permRequest);

            if (permResponse.IsSuccessStatusCode)
            {
                var permsData = await permResponse.Content.ReadFromJsonAsync<List<SupabasePermissionResponse>>();
                if (permsData != null)
                {
                    foreach (var p in permsData)
                    {
                        if (!permissions.ContainsKey(p.module) || hierarchy.GetValueOrDefault(p.permission, 0) > hierarchy.GetValueOrDefault(permissions[p.module], 0))
                            permissions[p.module] = p.permission;
                    }
                }
            }
        }

        // Default base permissions for regular users (if not EventManager/OrgOwner/SystemAdmin)
        // Ensure every module has at least 'none', except 'communications' which is 'read'
        foreach (var module in ModulePermissions.AllModules)
        {
            if (!permissions.ContainsKey(module))
            {
                permissions[module] = module == ModulePermissions.Communications ? ModulePermissions.Read : ModulePermissions.None;
            }
        }

        // 5. Apply granular overrides from event_member_permissions (only for specific event)
        if (eventId.HasValue)
        {
            var granularRequest = new HttpRequestMessage(HttpMethod.Get, $"{supabaseUrl}/rest/v1/event_member_permissions?user_id=eq.{userId}&event_id=eq.{eventId}&select=module,permission");
            AddSupabaseHeaders(granularRequest, supabaseKey!);
            var granularResponse = await httpClient.SendAsync(granularRequest);
            
            if (granularResponse.IsSuccessStatusCode)
            {
                var granularData = await granularResponse.Content.ReadFromJsonAsync<List<SupabaseEventPermissionResponse>>();
                if (granularData != null)
                {
                    foreach (var grant in granularData)
                    {
                        // Overrides base permission if higher in hierarchy 
                        // (Wait, actually granular should override completely? Or just take the highest. Usually take highest among granted roles + granular)
                        if (hierarchy.GetValueOrDefault(grant.permission, 0) > hierarchy.GetValueOrDefault(permissions.GetValueOrDefault(grant.module, "none"), 0))
                        {
                            permissions[grant.module] = grant.permission;
                        }
                    }
                }
            }
        }

        return Results.Ok(permissions);
    }

    private static void AddSupabaseHeaders(HttpRequestMessage request, string key)
    {
        request.Headers.Add("apikey", key);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
    }

    private static async Task<IResult> GetAvatarUploadUrl(ClaimsPrincipal user, AvatarUploadUrlRequest request, IConfiguration config, HttpClient httpClient, ILoggerFactory loggerFactory)
    {
        var logger = loggerFactory.CreateLogger("UserEndpoints");
        var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

        // Validate MIME type
        var allowedMimes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
        if (string.IsNullOrEmpty(request.ContentType) || !allowedMimes.Contains(request.ContentType.ToLower()))
        {
            return Results.BadRequest("Invalid content type. Only JPEG, PNG, GIF, and WEBP are allowed.");
        }

        var supabaseUrl = config["Supabase:Url"];
        var supabaseKey = config["Supabase:ServiceRoleKey"];

        // Generate a signed upload URL via Supabase Storage API
        var extension = request.ContentType.Split('/').Last();
        if (extension == "jpeg") extension = "jpg";
        var filePath = $"{userId}/avatar.{extension}";
        var encodedPath = string.Join('/', filePath.Split('/').Select(Uri.EscapeDataString));
        var storageRequest = new HttpRequestMessage(HttpMethod.Post, $"{supabaseUrl}/storage/v1/object/upload/sign/avatars/{encodedPath}");
        storageRequest.Headers.Add("apikey", supabaseKey);
        storageRequest.Headers.Add("x-upsert", "true"); // Allow replacing existing avatar
        storageRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", supabaseKey);
        storageRequest.Content = JsonContent.Create(new { expiresIn = 600 }); // 10 mins

        var response = await httpClient.SendAsync(storageRequest);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            logger.LogError("Supabase Storage signed URL failed. Status: {Status}, Body: {Body}", response.StatusCode, errorBody);
            return Results.Problem($"Failed to generate signed URL: {errorBody}");
        }

        var signResult = await response.Content.ReadFromJsonAsync<SupabaseSignUploadResponse>();
        string? token = signResult?.token;
        if (string.IsNullOrEmpty(token)) return Results.Problem("Failed to parse upload token");
        
        // Signed upload tokens are valid only for the /upload/sign endpoint.
        var uploadUrl = $"{supabaseUrl}/storage/v1/object/upload/sign/avatars/{filePath}?token={token}";

        return Results.Ok(new AvatarUploadUrlResponse(uploadUrl, filePath));
    }

    private static async Task<IResult> ConfirmAvatar(ClaimsPrincipal user, ConfirmAvatarRequest request, IConfiguration config, HttpClient httpClient)
    {
        var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

        var supabaseUrl = config["Supabase:Url"];
        var supabaseKey = config["Supabase:ServiceRoleKey"];

        // Update the user_profiles table with the new avatar path
        var patchRequest = new HttpRequestMessage(HttpMethod.Patch, $"{supabaseUrl}/rest/v1/user_profiles?id=eq.{userId}");
        patchRequest.Headers.Add("apikey", supabaseKey);
        patchRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", supabaseKey);
        patchRequest.Content = JsonContent.Create(new { avatar_url = request.FilePath });

        var response = await httpClient.SendAsync(patchRequest);
        return response.IsSuccessStatusCode ? Results.NoContent() : Results.Problem("Failed to confirm avatar");
    }

    private static async Task<string?> ResolveAvatarUrlAsync(string supabaseUrl, string supabaseKey, string? avatarPath, HttpClient httpClient)
    {
        if (string.IsNullOrWhiteSpace(avatarPath))
        {
            return null;
        }

        // Keep already-absolute URLs unchanged.
        if (Uri.TryCreate(avatarPath, UriKind.Absolute, out _))
        {
            return avatarPath;
        }

        var normalizedBaseUrl = supabaseUrl.TrimEnd('/');
        var encodedPath = EncodeStoragePath(avatarPath);

        // Prefer signed read URLs so avatar rendering works even with a private bucket.
        var signRequest = new HttpRequestMessage(HttpMethod.Post, $"{normalizedBaseUrl}/storage/v1/object/sign/avatars/{encodedPath}");
        signRequest.Headers.Add("apikey", supabaseKey);
        signRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", supabaseKey);
        signRequest.Content = JsonContent.Create(new { expiresIn = 3600 });

        var signResponse = await httpClient.SendAsync(signRequest);
        if (signResponse.IsSuccessStatusCode)
        {
            string? signedPath = null;
            using var signJson = await JsonDocument.ParseAsync(await signResponse.Content.ReadAsStreamAsync());
            var root = signJson.RootElement;
            if (root.TryGetProperty("signedURL", out var signedUrlUpper))
            {
                signedPath = signedUrlUpper.GetString();
            }
            else if (root.TryGetProperty("signedUrl", out var signedUrlLower))
            {
                signedPath = signedUrlLower.GetString();
            }

            if (!string.IsNullOrWhiteSpace(signedPath))
            {
                if (Uri.TryCreate(signedPath, UriKind.Absolute, out _))
                {
                    return signedPath;
                }

                var normalizedSignedPath = signedPath.StartsWith("/") ? signedPath : $"/{signedPath}";
                return $"{normalizedBaseUrl}/storage/v1{normalizedSignedPath}";
            }
        }

        // Fallback for public buckets.
        return $"{supabaseUrl.TrimEnd('/')}/storage/v1/object/public/avatars/{avatarPath}";
    }

    private static string EncodeStoragePath(string path) =>
        string.Join('/', path.TrimStart('/').Split('/').Select(Uri.EscapeDataString));
}


