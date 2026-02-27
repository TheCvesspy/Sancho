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

namespace User.Endpoints;

public static class UserEndpoints
{
    private record SupabaseUserProfileResponse(
        Guid id,
        string email,
        [property: JsonPropertyName("display_name")] string? display_name,
        [property: JsonPropertyName("avatar_url")] string? avatar_url,
        string? bio,
        string locale);

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

        return Results.Ok(new UserProfileDto(
            profile.id,
            profile.email,
            profile.display_name,
            ResolveAvatarUrl(supabaseUrl!, profile.avatar_url),
            profile.bio,
            profile.locale));
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
            locale = request.Locale
        });

        var response = await httpClient.SendAsync(patchRequest);
        return response.IsSuccessStatusCode ? Results.NoContent() : Results.Problem("Failed to update profile");
    }

    private static async Task<IResult> GetMemberships(ClaimsPrincipal user, IConfiguration config, HttpClient httpClient)
    {
        var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

        var supabaseUrl = config["Supabase:Url"];
        var supabaseKey = config["Supabase:ServiceRoleKey"];

        // Query tenant_members and join with tenants
        var query = $"tenant_members?user_id=eq.{userId}&select=tenant_id,roles,tenants(name)";
        var request = new HttpRequestMessage(HttpMethod.Get, $"{supabaseUrl}/rest/v1/{query}");
        request.Headers.Add("apikey", supabaseKey);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", supabaseKey);

        var response = await httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) 
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            // Using logger from parent scope if available or just return problem
            return Results.Problem($"Failed to fetch memberships: {response.StatusCode}");
        }

        var rawData = await response.Content.ReadFromJsonAsync<List<SupabaseTenantMembershipResponse>>();
        var memberships = rawData?.Select(d => new TenantMembershipDto(
            d.tenant_id,
            d.tenants.name,
            d.roles
        )).ToList();

        return Results.Ok(memberships);
    }

    private static async Task<IResult> GetAvatarUploadUrl(ClaimsPrincipal user, IConfiguration config, HttpClient httpClient)
    {
        var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return Results.Unauthorized();

        var supabaseUrl = config["Supabase:Url"];
        var supabaseKey = config["Supabase:ServiceRoleKey"];

        // In a real implementation with Supabase Storage, we'd call the storage API to get a signed URL.
        // For this implementation, we return the path the frontend should use.
        // The bucket RLS will handle the permission if the frontend uses its own token, 
        // OR the backend generates a signed URL.
        
        // Let's simulate generating a signed upload URL via Supabase Storage API
        var filePath = $"{userId}/avatar.jpg";
        var storageRequest = new HttpRequestMessage(HttpMethod.Post, $"{supabaseUrl}/storage/v1/object/upload/sign/avatars/{filePath}");
        storageRequest.Headers.Add("apikey", supabaseKey);
        storageRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", supabaseKey);
        storageRequest.Content = JsonContent.Create(new { expiresIn = 600, upsert = true }); // 10 mins, allow replacing existing avatar

        var response = await httpClient.SendAsync(storageRequest);
        if (!response.IsSuccessStatusCode) return Results.Problem("Failed to generate signed URL");

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
}
    private static string? ResolveAvatarUrl(string supabaseUrl, string? avatarPath)
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

        return $"{supabaseUrl.TrimEnd('/')}/storage/v1/object/public/avatars/{avatarPath}";
    }
