using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using Sancho.Shared.Roles;

namespace EventManagement.Services;

public class EventAuthorizationService
{
    private readonly HttpClient _httpClient;

    public EventAuthorizationService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public bool IsSystemAdmin(ClaimsPrincipal user) =>
        user.HasClaim("sancho:system_admin", "true");

    public bool IsOrgOwner(ClaimsPrincipal user) =>
        string.Equals(user.FindFirst("sancho:org_role")?.Value, AppRoles.OrgOwner, StringComparison.OrdinalIgnoreCase);

    public bool IsOrgOrSystemAdmin(ClaimsPrincipal user) =>
        IsSystemAdmin(user) || IsOrgOwner(user);

    public async Task<bool> IsEventManagerAsync(Guid eventId, Guid userId, string supabaseUrl, string supabaseKey)
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

    public async Task<bool> CanManageEventAsync(
        ClaimsPrincipal user,
        Guid eventId,
        string supabaseUrl,
        string supabaseKey)
    {
        if (IsOrgOrSystemAdmin(user))
        {
            return true;
        }

        var userId = TryGetUserId(user);
        if (!userId.HasValue)
        {
            return false;
        }

        return await IsEventManagerAsync(eventId, userId.Value, supabaseUrl, supabaseKey);
    }

    public async Task<bool> CanAccessEventAsync(
        ClaimsPrincipal user,
        Guid eventId,
        string supabaseUrl,
        string supabaseKey)
    {
        if (await CanManageEventAsync(user, eventId, supabaseUrl, supabaseKey))
        {
            return true;
        }

        var userId = TryGetUserId(user);
        if (!userId.HasValue)
        {
            return false;
        }

        return await HasAnyEventPermissionAsync(eventId, userId.Value, supabaseUrl, supabaseKey);
    }

    private async Task<bool> HasAnyEventPermissionAsync(Guid eventId, Guid userId, string supabaseUrl, string supabaseKey)
    {
        var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{supabaseUrl}/rest/v1/event_member_permissions?event_id=eq.{eventId}&user_id=eq.{userId}&permission=neq.none&select=module&limit=1");
        AddSupabaseHeaders(request, supabaseKey);
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return false;
        var rows = await response.Content.ReadFromJsonAsync<List<object>>();
        return rows?.Count > 0;
    }

    public async Task<bool> HasEventManagementWriteAccessAsync(ClaimsPrincipal user, Guid eventId, string url, string key)
    {
        if (await CanManageEventAsync(user, eventId, url, key))
            return true;

        var userId = TryGetUserId(user);
        if (!userId.HasValue) return false;

        var perm = await GetExplicitEventManagementPermissionAsync(eventId, userId.Value, url, key);
        return perm == "write";
    }

    public async Task<bool> HasEventManagementReadAccessAsync(ClaimsPrincipal user, Guid eventId, string url, string key)
    {
        if (await CanManageEventAsync(user, eventId, url, key))
            return true;

        var userId = TryGetUserId(user);
        if (!userId.HasValue) return false;

        var perm = await GetExplicitEventManagementPermissionAsync(eventId, userId.Value, url, key);
        return perm == "write" || perm == "read";
    }

    private async Task<string?> GetExplicitEventManagementPermissionAsync(Guid eventId, Guid userId, string supabaseUrl, string supabaseKey)
    {
        var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"{supabaseUrl}/rest/v1/event_member_permissions?event_id=eq.{eventId}&user_id=eq.{userId}&module=eq.event_management&select=permission&limit=1");
        AddSupabaseHeaders(request, supabaseKey);
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return null;
        
        var rows = await response.Content.ReadFromJsonAsync<List<PermissionRow>>();
        return rows?.FirstOrDefault()?.permission;
    }

    private class PermissionRow
    {
        public string permission { get; set; } = string.Empty;
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
