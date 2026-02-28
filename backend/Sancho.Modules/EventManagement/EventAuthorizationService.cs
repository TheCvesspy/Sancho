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

        if (!Guid.TryParse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
        {
            return false;
        }

        return await IsEventManagerAsync(eventId, userId, supabaseUrl, supabaseKey);
    }

    private static void AddSupabaseHeaders(HttpRequestMessage request, string key)
    {
        request.Headers.Add("apikey", key);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
    }
}
