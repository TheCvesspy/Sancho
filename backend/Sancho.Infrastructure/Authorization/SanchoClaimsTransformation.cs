using System.Security.Claims;
using System.Net.Http.Json;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Configuration;
using System.Text.Json.Serialization;
using Sancho.Shared.Roles;

namespace Sancho.Infrastructure.Authorization;

public class SanchoClaimsTransformation : IClaimsTransformation
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;

    public SanchoClaimsTransformation(HttpClient httpClient, IConfiguration config)
    {
        _httpClient = httpClient;
        _config = config;
    }

    public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity is not ClaimsIdentity identity || !identity.IsAuthenticated)
        {
            return principal;
        }

        // Check if already transformed
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

        var tasks = new List<Task>
        {
            FetchSystemAdminStatus(userId, supabaseUrl, supabaseKey),
            FetchOrgMembership(userId, supabaseUrl, supabaseKey),
            FetchEventMemberships(userId, supabaseUrl, supabaseKey)
        };

        await Task.WhenAll(tasks);

        var roles = new HashSet<string>();

        // 1. System Admin
        if (await (Task<bool>)tasks[0])
        {
            identity.AddClaim(new Claim(ClaimTypes.Role, AppRoles.SystemAdmin));
            identity.AddClaim(new Claim("sancho:system_admin", "true"));
            roles.Add(AppRoles.SystemAdmin);
        }

        // 2. Org Membership (single role in the one organization)
        var orgRole = await (Task<string?>)tasks[1];
        if (!string.IsNullOrEmpty(orgRole))
        {
            identity.AddClaim(new Claim("sancho:org_role", orgRole));
            identity.AddClaim(new Claim(ClaimTypes.Role, orgRole));
            roles.Add(orgRole);
        }

        // 3. Event Memberships
        var eventMemberships = await (Task<List<EventRoleData>>)tasks[2];
        foreach (var mem in eventMemberships)
        {
            identity.AddClaim(new Claim("sancho:event_role", $"{mem.EventId}:{mem.Role}"));
            roles.Add(mem.Role);
        }

        // 4. Permissions (Declarative)
        var permissions = new Dictionary<string, string>();
        var hierarchy = new Dictionary<string, int> { { "none", 0 }, { "read", 1 }, { "write", 2 } };

        if (roles.Count > 0)
        {
            var rolePermissions = await FetchRolePermissions(roles, supabaseUrl, supabaseKey);
            foreach (var p in rolePermissions)
            {
                if (!permissions.ContainsKey(p.Module) || hierarchy.GetValueOrDefault(p.Permission, 0) > hierarchy.GetValueOrDefault(permissions[p.Module], 0))
                    permissions[p.Module] = p.Permission;
            }
        }

        // Apply base permissions (None, except Communications=Read)
        foreach (var module in ModulePermissions.AllModules)
        {
            if (!permissions.ContainsKey(module))
            {
                permissions[module] = module == ModulePermissions.Communications ? ModulePermissions.Read : ModulePermissions.None;
            }
        }

        // 5. Granular Event Permissions
        var granularPermissions = await FetchGranularPermissions(userId, supabaseUrl, supabaseKey);
        foreach (var p in granularPermissions)
        {
            identity.AddClaim(new Claim($"sancho:permission:{p.EventId}:{p.Module}", p.Permission));
            
            // Also merge into global permissions (highest wins)
            if (hierarchy.GetValueOrDefault(p.Permission, 0) > hierarchy.GetValueOrDefault(permissions.GetValueOrDefault(p.Module, "none"), 0))
            {
                permissions[p.Module] = p.Permission;
            }
        }

        // Add global claims
        foreach (var kp in permissions)
        {
            identity.AddClaim(new Claim($"sancho:permission:{kp.Key}", kp.Value));
        }

        identity.AddClaim(new Claim("sancho:transformed", "true"));

        return principal;
    }

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
