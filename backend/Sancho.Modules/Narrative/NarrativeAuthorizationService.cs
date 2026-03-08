using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using Narrative.Models;
using Sancho.Shared.Roles;

namespace Narrative.Services;

public sealed class NarrativeAuthorizationService
{
    private readonly HttpClient _httpClient;

    public NarrativeAuthorizationService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public bool IsSystemAdmin(ClaimsPrincipal user) =>
        user.HasClaim("sancho:system_admin", "true");

    public bool IsOrgOwner(ClaimsPrincipal user) =>
        string.Equals(user.FindFirst("sancho:org_role")?.Value, AppRoles.OrgOwner, StringComparison.OrdinalIgnoreCase);

    public bool IsOrgOrSystemAdmin(ClaimsPrincipal user) => IsSystemAdmin(user) || IsOrgOwner(user);

    public async Task<NarrativeAccessResult> ResolveEventAccessAsync(
        ClaimsPrincipal user,
        Guid eventId,
        string supabaseUrl,
        string supabaseKey)
    {
        var eventState = await GetEventStateAsync(eventId, supabaseUrl, supabaseKey);
        if (eventState is null || eventState.deleted_at.HasValue)
        {
            return NarrativeAccessResult.None;
        }

        var isAdmin = IsOrgOrSystemAdmin(user);
        var isManager = user.HasClaim("sancho:event_role", $"{eventId}:{AppRoles.EventManager}");
        var permission = user.FindFirst($"sancho:permission:{eventId}:{ModulePermissions.Narrative}")?.Value;

        // Claims-first authorization is the primary path. If event-scoped claims are
        // missing (e.g. stale/misconfigured principal), fall back to authoritative DB checks.
        if (!isAdmin && !isManager && permission is not (ModulePermissions.Read or ModulePermissions.Write))
        {
            var userId = TryGetUserId(user);
            if (userId.HasValue)
            {
                var managerTask = IsEventManagerAsync(eventId, userId.Value, supabaseUrl, supabaseKey);
                var explicitPermissionTask = GetExplicitNarrativePermissionAsync(eventId, userId.Value, supabaseUrl, supabaseKey);
                await Task.WhenAll(managerTask, explicitPermissionTask);
                isManager = managerTask.Result;
                permission = explicitPermissionTask.Result;
            }
        }

        var canRead = isAdmin || isManager || permission is ModulePermissions.Read or ModulePermissions.Write;
        var canWrite = isAdmin || isManager || permission == ModulePermissions.Write;
        var isArchived = eventState.status == "archived";
        if (isArchived && !isAdmin)
        {
            canWrite = false;
        }

        return new NarrativeAccessResult(
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

    private async Task<string?> GetExplicitNarrativePermissionAsync(Guid eventId, Guid userId, string supabaseUrl, string supabaseKey)
    {
        var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{supabaseUrl}/rest/v1/event_member_permissions?event_id=eq.{eventId}&user_id=eq.{userId}&module=eq.{ModulePermissions.Narrative}&select=permission&limit=1");
        AddSupabaseHeaders(request, supabaseKey);
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return null;
        var rows = await response.Content.ReadFromJsonAsync<List<SupabaseNarrativePermissionRow>>();
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

    private static Guid? TryGetUserId(ClaimsPrincipal user)
    {
        var value = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? user.FindFirst("sub")?.Value;
        return Guid.TryParse(value, out var id) ? id : null;
    }

    private static void AddSupabaseHeaders(HttpRequestMessage request, string key)
    {
        request.Headers.Add("apikey", key);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
    }
}

public record NarrativeAccessResult(
    bool CanRead,
    bool CanWrite,
    bool IsAdmin,
    bool IsManager,
    bool IsArchivedEvent
)
{
    public static NarrativeAccessResult None => new(false, false, false, false, false);
}
