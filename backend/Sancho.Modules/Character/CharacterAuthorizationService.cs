using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using Character.Models;
using Sancho.Shared.Roles;

namespace Character.Services;

public sealed class CharacterAuthorizationService
{
    private readonly HttpClient _httpClient;

    public CharacterAuthorizationService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public bool IsSystemAdmin(ClaimsPrincipal user) =>
        user.HasClaim("sancho:system_admin", "true");

    public bool IsOrgOwner(ClaimsPrincipal user) =>
        string.Equals(user.FindFirst("sancho:org_role")?.Value, AppRoles.OrgOwner, StringComparison.OrdinalIgnoreCase);

    public bool IsOrgOrSystemAdmin(ClaimsPrincipal user) => IsSystemAdmin(user) || IsOrgOwner(user);

    public async Task<CharacterAccessResult> ResolveEventAccessAsync(
        ClaimsPrincipal user,
        Guid eventId,
        string supabaseUrl,
        string supabaseKey)
    {
        var eventState = await GetEventStateAsync(eventId, supabaseUrl, supabaseKey);
        if (eventState is null || eventState.deleted_at.HasValue)
        {
            return CharacterAccessResult.None;
        }

        var isAdmin = IsOrgOrSystemAdmin(user);
        if (!Guid.TryParse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
        {
            return CharacterAccessResult.None with { IsArchivedEvent = eventState.status == "archived" };
        }

        var isManagerTask = IsEventManagerAsync(eventId, userId, supabaseUrl, supabaseKey);
        var explicitPermissionTask = GetExplicitCharactersPermissionAsync(eventId, userId, supabaseUrl, supabaseKey);
        await Task.WhenAll(isManagerTask, explicitPermissionTask);

        var isManager = isManagerTask.Result;
        var permission = explicitPermissionTask.Result;

        var canRead = isAdmin || isManager || permission is ModulePermissions.Read or ModulePermissions.Write;
        var canWrite = isAdmin || isManager || permission == ModulePermissions.Write;
        var isArchived = eventState.status == "archived";
        if (isArchived && !isAdmin)
        {
            canWrite = false;
        }

        return new CharacterAccessResult(
            CanRead: canRead,
            CanWrite: canWrite,
            IsAdmin: isAdmin,
            IsManager: isManager,
            IsArchivedEvent: isArchived
        );
    }

    private async Task<bool> IsEventManagerAsync(Guid eventId, Guid userId, string supabaseUrl, string supabaseKey)
    {
        var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{supabaseUrl}/rest/v1/event_members?event_id=eq.{eventId}&user_id=eq.{userId}&role=eq.{AppRoles.EventManager}&select=user_id&limit=1");
        AddSupabaseHeaders(request, supabaseKey);
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return false;
        var rows = await response.Content.ReadFromJsonAsync<List<object>>();
        return rows?.Count > 0;
    }

    private async Task<string?> GetExplicitCharactersPermissionAsync(Guid eventId, Guid userId, string supabaseUrl, string supabaseKey)
    {
        var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{supabaseUrl}/rest/v1/event_member_permissions?event_id=eq.{eventId}&user_id=eq.{userId}&module=eq.{ModulePermissions.Characters}&select=permission&limit=1");
        AddSupabaseHeaders(request, supabaseKey);
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return null;
        var rows = await response.Content.ReadFromJsonAsync<List<SupabasePermissionRow>>();
        return rows?.FirstOrDefault()?.permission;
    }

    private async Task<SupabaseEventStatusRow?> GetEventStateAsync(Guid eventId, string supabaseUrl, string supabaseKey)
    {
        var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{supabaseUrl}/rest/v1/events?id=eq.{eventId}&select=id,status,deleted_at&limit=1");
        AddSupabaseHeaders(request, supabaseKey);
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return null;
        var rows = await response.Content.ReadFromJsonAsync<List<SupabaseEventStatusRow>>();
        return rows?.FirstOrDefault();
    }

    private static void AddSupabaseHeaders(HttpRequestMessage request, string key)
    {
        request.Headers.Add("apikey", key);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
    }
}

public record CharacterAccessResult(
    bool CanRead,
    bool CanWrite,
    bool IsAdmin,
    bool IsManager,
    bool IsArchivedEvent
)
{
    public static CharacterAccessResult None => new(false, false, false, false, false);
}

