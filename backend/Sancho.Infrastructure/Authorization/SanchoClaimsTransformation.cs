using System.Security.Claims;
using System.Net.Http.Json;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using System.Text.Json.Serialization;
using Sancho.Shared.Roles;

namespace Sancho.Infrastructure.Authorization;

public class SanchoClaimsTransformation : IClaimsTransformation
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly IMemoryCache _cache;

    // Auth data TTL: 90 seconds. Permissions rarely change mid-session; this
    // eliminates 5-6 Supabase HTTP calls on every subsequent authenticated request.
    private static readonly TimeSpan ClaimsCacheTtl = TimeSpan.FromSeconds(90);

    public SanchoClaimsTransformation(HttpClient httpClient, IConfiguration config, IMemoryCache cache)
    {
        _httpClient = httpClient;
        _config = config;
        _cache = cache;
    }

    public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity is not ClaimsIdentity identity || !identity.IsAuthenticated)
        {
            return principal;
        }

        // Check if already transformed in this request (guard against double invocation)
        if (identity.HasClaim(c => c.Type == "sancho:transformed"))
        {
            return principal;
        }

        var userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId)) return principal;

        var supabaseUrl = _config["Supabase:Url"];
        var supabaseKey = _config["Supabase:ServiceRoleKey"];

        if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey))
            return principal;

        // Try to serve from cache first — avoids 5-6 Supabase HTTP calls per request.
        var cacheKey = $"claims:{userId}";
        if (!_cache.TryGetValue(cacheKey, out CachedClaimsData? cached) || cached is null)
        {
            // Cache miss — fetch all auth data in parallel.
            var adminTask = FetchSystemAdminStatus(userId, supabaseUrl, supabaseKey);
            var orgTask = FetchOrgMembership(userId, supabaseUrl, supabaseKey);
            var eventsTask = FetchEventMemberships(userId, supabaseUrl, supabaseKey);

            await Task.WhenAll(adminTask, orgTask, eventsTask);

            var isAdmin = await adminTask;
            var orgRole = await orgTask;
            var eventMemberships = await eventsTask;

            var roles = new HashSet<string>();
            if (isAdmin) roles.Add(AppRoles.SystemAdmin);
            if (!string.IsNullOrEmpty(orgRole)) roles.Add(orgRole);
            foreach (var m in eventMemberships) roles.Add(m.Role);

            var rolePermissions = roles.Count > 0
                ? await FetchRolePermissions(roles, supabaseUrl, supabaseKey)
                : [];
            var granularPermissions = await FetchGranularPermissions(userId, supabaseUrl, supabaseKey);

            cached = new CachedClaimsData(isAdmin, orgRole, eventMemberships, rolePermissions, granularPermissions);
            _cache.Set(cacheKey, cached, ClaimsCacheTtl);
        }

        // Apply cached data to the identity.
        var hierarchy = new Dictionary<string, int> { { "none", 0 }, { "read", 1 }, { "write", 2 } };

        // 1. System Admin
        if (cached.IsSystemAdmin)
        {
            identity.AddClaim(new Claim(ClaimTypes.Role, AppRoles.SystemAdmin));
            identity.AddClaim(new Claim("sancho:system_admin", "true"));
        }

        // 2. Org Membership
        if (!string.IsNullOrEmpty(cached.OrgRole))
        {
            identity.AddClaim(new Claim("sancho:org_role", cached.OrgRole));
            identity.AddClaim(new Claim(ClaimTypes.Role, cached.OrgRole));
        }

        // 3. Event Memberships
        foreach (var mem in cached.EventMemberships)
        {
            identity.AddClaim(new Claim("sancho:event_role", $"{mem.EventId}:{mem.Role}"));
        }

        // 4. Permissions (Declarative — role-based baseline)
        var permissions = new Dictionary<string, string>();
        foreach (var p in cached.RolePermissions)
        {
            if (!permissions.ContainsKey(p.Module) || hierarchy.GetValueOrDefault(p.Permission, 0) > hierarchy.GetValueOrDefault(permissions[p.Module], 0))
                permissions[p.Module] = p.Permission;
        }

        // Apply base permissions (None, except Communications=Read)
        foreach (var module in ModulePermissions.AllModules)
        {
            if (!permissions.ContainsKey(module))
                permissions[module] = module == ModulePermissions.Communications ? ModulePermissions.Read : ModulePermissions.None;
        }

        // 5. Granular Event Permissions
        foreach (var p in cached.GranularPermissions)
        {
            identity.AddClaim(new Claim($"sancho:permission:{p.EventId}:{p.Module}", p.Permission));

            if (hierarchy.GetValueOrDefault(p.Permission, 0) > hierarchy.GetValueOrDefault(permissions.GetValueOrDefault(p.Module, "none"), 0))
                permissions[p.Module] = p.Permission;
        }

        // Add global permission claims
        foreach (var kp in permissions)
        {
            identity.AddClaim(new Claim($"sancho:permission:{kp.Key}", kp.Value));
        }

        identity.AddClaim(new Claim("sancho:transformed", "true"));

        return principal;
    }

    // Holds all data fetched from Supabase for a user, stored in IMemoryCache.
    private sealed record CachedClaimsData(
        bool IsSystemAdmin,
        string? OrgRole,
        List<EventRoleData> EventMemberships,
        List<PermissionData> RolePermissions,
        List<GranularPermissionData> GranularPermissions);

    private async Task<bool> FetchSystemAdminStatus(string userId, string url, string key)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/system_admins?user_id=eq.{userId}&select=user_id");
        AddSupabaseHeaders(request, key);
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return false;
        var data = await response.Content.ReadFromJsonAsync<List<object>>();
        return data?.Count > 0;
    }

    /// <summary>Returns the user's single org-level role, or null if not an org member.</summary>
    private async Task<string?> FetchOrgMembership(string userId, string url, string key)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/org_members?user_id=eq.{userId}&select=role&limit=1");
        AddSupabaseHeaders(request, key);
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return null;
        var data = await response.Content.ReadFromJsonAsync<List<OrgRoleData>>();
        return data?.FirstOrDefault()?.Role;
    }

    private async Task<List<EventRoleData>> FetchEventMemberships(string userId, string url, string key)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/event_members?user_id=eq.{userId}&select=event_id,role");
        AddSupabaseHeaders(request, key);
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return [];
        var data = await response.Content.ReadFromJsonAsync<List<EventRoleData>>();
        return data ?? [];
    }

    private async Task<List<PermissionData>> FetchRolePermissions(IEnumerable<string> roles, string url, string key)
    {
        var roleFilter = string.Join(",", roles.Select(r => $"\"{r}\""));
        var request = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/role_module_permissions?role=in.({roleFilter})&select=module,permission");
        AddSupabaseHeaders(request, key);
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return [];
        var raw = await response.Content.ReadFromJsonAsync<List<PermissionData>>();
        return raw ?? [];
    }

    private async Task<List<GranularPermissionData>> FetchGranularPermissions(string userId, string url, string key)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/event_member_permissions?user_id=eq.{userId}&select=event_id,module,permission");
        AddSupabaseHeaders(request, key);
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return [];
        var raw = await response.Content.ReadFromJsonAsync<List<GranularPermissionData>>();
        return raw ?? [];
    }

    private static void AddSupabaseHeaders(HttpRequestMessage request, string key)
    {
        request.Headers.Add("apikey", key);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
    }

    private record OrgRoleData(
        [property: JsonPropertyName("role")] string Role);

    private record EventRoleData(
        [property: JsonPropertyName("event_id")] Guid EventId,
        [property: JsonPropertyName("role")] string Role);

    private record PermissionData(
        [property: JsonPropertyName("module")] string Module,
        [property: JsonPropertyName("permission")] string Permission);

    private record GranularPermissionData(
        [property: JsonPropertyName("event_id")] Guid EventId,
        [property: JsonPropertyName("module")] string Module,
        [property: JsonPropertyName("permission")] string Permission);
}
