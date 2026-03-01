using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using Identity.Models;
using Sancho.Shared.Roles;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Identity.Endpoints;

public static class IdentityEndpoints
{
    public static void MapIdentityEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/identity");

        group.MapGet("/users", GetUsers)
            .WithName("GetIdentityUsers")
            .RequireAuthorization(AppRoles.SystemAdmin);

        group.MapGet("/users/{userId:guid}", GetUserDetail)
            .WithName("GetIdentityUserDetail")
            .RequireAuthorization(AppRoles.SystemAdmin);

        group.MapPost("/users/{userId:guid}/org-role", AssignOrgRole)
            .WithName("AssignOrgRole")
            .RequireAuthorization(AppRoles.SystemAdmin);

        group.MapDelete("/users/{userId:guid}/org-role", RevokeOrgRole)
            .WithName("RevokeOrgRole")
            .RequireAuthorization(AppRoles.SystemAdmin);

        // Invite Token Endpoints
        var tokenGroup = group.MapGroup("/invite-tokens");
        
        tokenGroup.MapGet("/", GetInviteTokens)
            .WithName("GetInviteTokens")
            .RequireAuthorization(AppRoles.SystemAdmin);

        tokenGroup.MapPost("/", CreateInviteToken)
            .WithName("CreateInviteToken")
            .RequireAuthorization(AppRoles.SystemAdmin);

        tokenGroup.MapDelete("/{tokenId:guid}", RevokeInviteToken)
            .WithName("RevokeInviteToken")
            .RequireAuthorization(AppRoles.SystemAdmin);
    }

    private static void AddSupabaseHeaders(HttpRequestMessage request, string key)
    {
        request.Headers.Add("apikey", key);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
    }

    private static async Task<IResult> GetUsers(ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, ILoggerFactory loggerFactory)
    {
        var logger = loggerFactory.CreateLogger("IdentityEndpoints");
        var supabaseUrl = config["Supabase:Url"];
        var supabaseKey = config["Supabase:ServiceRoleKey"];

        if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey))
            return Results.Problem("Supabase configuration is missing.");

        // 1. Fetch user_profiles
        var profilesReq = new HttpRequestMessage(HttpMethod.Get, $"{supabaseUrl}/rest/v1/user_profiles?select=*");
        AddSupabaseHeaders(profilesReq, supabaseKey);
        var profilesResp = await httpClient.SendAsync(profilesReq);
        var profiles = profilesResp.IsSuccessStatusCode 
            ? await profilesResp.Content.ReadFromJsonAsync<List<SupabaseUserProfileResponse>>() 
            : new List<SupabaseUserProfileResponse>();

        // 2. Fetch org_members
        var orgMembersReq = new HttpRequestMessage(HttpMethod.Get, $"{supabaseUrl}/rest/v1/org_members?select=*");
        AddSupabaseHeaders(orgMembersReq, supabaseKey);
        var orgMembersResp = await httpClient.SendAsync(orgMembersReq);
        var orgMembers = orgMembersResp.IsSuccessStatusCode
            ? await orgMembersResp.Content.ReadFromJsonAsync<List<SupabaseOrgMemberResponse>>()
            : new List<SupabaseOrgMemberResponse>();

        // 3. Fetch system_admins
        var sysAdminsReq = new HttpRequestMessage(HttpMethod.Get, $"{supabaseUrl}/rest/v1/system_admins?select=user_id");
        AddSupabaseHeaders(sysAdminsReq, supabaseKey);
        var sysAdminsResp = await httpClient.SendAsync(sysAdminsReq);
        var sysAdmins = sysAdminsResp.IsSuccessStatusCode
            ? await sysAdminsResp.Content.ReadFromJsonAsync<List<SupabaseSystemAdminResponse>>()
            : new List<SupabaseSystemAdminResponse>();

        // 4. Fetch event_members
        var eventMembersReq = new HttpRequestMessage(HttpMethod.Get, $"{supabaseUrl}/rest/v1/event_members?select=user_id,event_id,role");
        AddSupabaseHeaders(eventMembersReq, supabaseKey);
        var eventMembersResp = await httpClient.SendAsync(eventMembersReq);
        var eventMembers = eventMembersResp.IsSuccessStatusCode
            ? await eventMembersResp.Content.ReadFromJsonAsync<List<SupabaseEventMemberResponse>>()
            : new List<SupabaseEventMemberResponse>();

        // 5. Fetch auth.users (via admin endpoint)
        // Note: Supabase admin endpoint might require Pagination if there are many users, but we'll try fetching first page for now.
        var authUsersReq = new HttpRequestMessage(HttpMethod.Get, $"{supabaseUrl}/auth/v1/admin/users");
        AddSupabaseHeaders(authUsersReq, supabaseKey);
        var authUsersResp = await httpClient.SendAsync(authUsersReq);
        
        List<SupabaseUserAdminResponse>? authUsersList = null;
        if (authUsersResp.IsSuccessStatusCode)
        {
            var content = await authUsersResp.Content.ReadAsStringAsync();
            try {
                // Sometime Supabase returns an array of users directly, sometimes { "users": [...] }
                if (content.TrimStart().StartsWith("[")) {
                     authUsersList = JsonSerializer.Deserialize<List<SupabaseUserAdminResponse>>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true});
                } else {
                     var authData = JsonSerializer.Deserialize<SupabaseAuthUsersData>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true});
                     authUsersList = authData?.users;
                }
            } catch (Exception ex) {
                logger.LogError(ex, "Failed to parse auth users response: {content}", content);
            }
        }

        var orgDict = orgMembers?.ToDictionary(x => x.user_id) ?? new();
        var sysAdminSet = sysAdmins?.Select(x => x.user_id).ToHashSet() ?? new();
        var eventMemberCounts = eventMembers?.GroupBy(x => x.user_id).ToDictionary(g => g.Key, g => g.Count()) ?? new();
        var authUserDict = authUsersList?.ToDictionary(x => x.id) ?? new();

        var result = new List<UserListItemDto>();
        if (profiles != null)
        {
            foreach (var p in profiles)
            {
                var isSysAdmin = sysAdminSet.Contains(p.id);
                orgDict.TryGetValue(p.id, out var orgMember);
                eventMemberCounts.TryGetValue(p.id, out var eventsCount);
                authUserDict.TryGetValue(p.id, out var authUser);

                result.Add(new UserListItemDto(
                    p.id,
                    p.email,
                    p.display_name,
                    p.avatar_url,
                    p.locale ?? "en",
                    isSysAdmin,
                    orgMember?.role,
                    orgMember?.created_at,
                    eventsCount,
                    authUser?.created_at ?? DateTimeOffset.UtcNow,
                    authUser?.last_sign_in_at
                ));
            }
        }

        return Results.Ok(result.OrderBy(x => x.DisplayName ?? x.Email));
    }

    private static async Task<IResult> GetUserDetail(Guid userId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, ILoggerFactory loggerFactory)
    {
        var logger = loggerFactory.CreateLogger("IdentityEndpoints");
        var supabaseUrl = config["Supabase:Url"];
        var supabaseKey = config["Supabase:ServiceRoleKey"];

        if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey))
            return Results.Problem("Supabase configuration is missing.");

        // 1. Fetch user_profile
        var profileReq = new HttpRequestMessage(HttpMethod.Get, $"{supabaseUrl}/rest/v1/user_profiles?id=eq.{userId}");
        AddSupabaseHeaders(profileReq, supabaseKey);
        var profileResp = await httpClient.SendAsync(profileReq);
        var profiles = profileResp.IsSuccessStatusCode 
            ? await profileResp.Content.ReadFromJsonAsync<List<SupabaseUserProfileResponse>>() 
            : null;
        var profile = profiles?.FirstOrDefault();

        if (profile == null) return Results.NotFound();

        // 2. Fetch org_member
        var orgMemberReq = new HttpRequestMessage(HttpMethod.Get, $"{supabaseUrl}/rest/v1/org_members?user_id=eq.{userId}");
        AddSupabaseHeaders(orgMemberReq, supabaseKey);
        var orgMemberResp = await httpClient.SendAsync(orgMemberReq);
        var orgMembers = orgMemberResp.IsSuccessStatusCode
            ? await orgMemberResp.Content.ReadFromJsonAsync<List<SupabaseOrgMemberResponse>>()
            : null;
        var orgMember = orgMembers?.FirstOrDefault();

        // 3. Fetch system_admin
        var sysAdminReq = new HttpRequestMessage(HttpMethod.Get, $"{supabaseUrl}/rest/v1/system_admins?user_id=eq.{userId}");
        AddSupabaseHeaders(sysAdminReq, supabaseKey);
        var sysAdminResp = await httpClient.SendAsync(sysAdminReq);
        var sysAdmins = sysAdminResp.IsSuccessStatusCode
            ? await sysAdminResp.Content.ReadFromJsonAsync<List<SupabaseSystemAdminResponse>>()
            : null;
        var isSysAdmin = sysAdmins?.Any() == true;

        // 4. Fetch event_members count
        var eventMembersReq = new HttpRequestMessage(HttpMethod.Get, $"{supabaseUrl}/rest/v1/event_members?user_id=eq.{userId}&select=event_id");
        AddSupabaseHeaders(eventMembersReq, supabaseKey);
        var eventMembersResp = await httpClient.SendAsync(eventMembersReq);
        var eventMembers = eventMembersResp.IsSuccessStatusCode
            ? await eventMembersResp.Content.ReadFromJsonAsync<List<object>>()
            : new List<object>();

        // 5. Fetch auth user
        var authUsersReq = new HttpRequestMessage(HttpMethod.Get, $"{supabaseUrl}/auth/v1/admin/users/{userId}");
        AddSupabaseHeaders(authUsersReq, supabaseKey);
        var authUserResp = await httpClient.SendAsync(authUsersReq);
        SupabaseUserAdminResponse? authUser = null;
        if (authUserResp.IsSuccessStatusCode)
        {
            authUser = await authUserResp.Content.ReadFromJsonAsync<SupabaseUserAdminResponse>();
        }

        // 6. Fetch all event_member_permissions to summarize
        var permsReq = new HttpRequestMessage(HttpMethod.Get, $"{supabaseUrl}/rest/v1/event_member_permissions?user_id=eq.{userId}&select=module,permission");
        AddSupabaseHeaders(permsReq, supabaseKey);
        var permsResp = await httpClient.SendAsync(permsReq);
        var permsData = permsResp.IsSuccessStatusCode
            ? await permsResp.Content.ReadFromJsonAsync<List<SupabaseEventPermissionResponse>>()
            : new List<SupabaseEventPermissionResponse>();
            
        // We will just return the list of explicit grants, we don't try to compute effective since that is scoped per-event.
        var dict = new Dictionary<string, string>();
        if (permsData != null)
        {
            foreach(var p in permsData) {
                // Simple summary logic for explicit grants
                var current = dict.GetValueOrDefault(p.module, "none");
                // if anyone is write, keep write.
                if (p.permission == "write" || (p.permission == "read" && current == "none")) {
                    dict[p.module] = p.permission;
                }
            }
        }

        return Results.Ok(new UserDetailDto(
            profile.id,
            profile.email,
            profile.display_name,
            profile.avatar_url,
            profile.locale ?? "en",
            profile.bio,
            isSysAdmin,
            orgMember?.role,
            orgMember?.created_at,
            eventMembers?.Count ?? 0,
            authUser?.created_at ?? DateTimeOffset.UtcNow,
            authUser?.last_sign_in_at,
            dict
        ));
    }

    private static async Task<IResult> AssignOrgRole(Guid userId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, ILoggerFactory loggerFactory)
    {
        var logger = loggerFactory.CreateLogger("IdentityEndpoints");
        var supabaseUrl = config["Supabase:Url"];
        var supabaseKey = config["Supabase:ServiceRoleKey"];

        if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey))
            return Results.Problem("Supabase configuration is missing.");

        var assignReq = new HttpRequestMessage(HttpMethod.Post, $"{supabaseUrl}/rest/v1/org_members");
        AddSupabaseHeaders(assignReq, supabaseKey);
        
        assignReq.Content = JsonContent.Create(new {
            user_id = userId,
            role = AppRoles.OrgOwner,
            created_at = DateTimeOffset.UtcNow
        });

        // Use upsert to avoid duplicate key errors
        assignReq.Headers.Add("Prefer", "resolution=merge-duplicates");

        var response = await httpClient.SendAsync(assignReq);
        
        if (!response.IsSuccessStatusCode) {
            var body = await response.Content.ReadAsStringAsync();
            logger.LogError("AssignOrgRole failed: {status} - {body}", response.StatusCode, body);
            return Results.Problem("Failed to assign role.");
        }

        return Results.NoContent();
    }

    private static async Task<IResult> RevokeOrgRole(Guid userId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, ILoggerFactory loggerFactory)
    {
        var logger = loggerFactory.CreateLogger("IdentityEndpoints");
        var supabaseUrl = config["Supabase:Url"];
        var supabaseKey = config["Supabase:ServiceRoleKey"];

        if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey))
            return Results.Problem("Supabase configuration is missing.");

        var revokeReq = new HttpRequestMessage(HttpMethod.Delete, $"{supabaseUrl}/rest/v1/org_members?user_id=eq.{userId}");
        AddSupabaseHeaders(revokeReq, supabaseKey);
        
        var response = await httpClient.SendAsync(revokeReq);
        
        if (!response.IsSuccessStatusCode) {
            var body = await response.Content.ReadAsStringAsync();
            logger.LogError("RevokeOrgRole failed: {status} - {body}", response.StatusCode, body);
            return Results.Problem("Failed to revoke role.");
        }

        return Results.NoContent();
    }

    private static async Task<IResult> GetInviteTokens(IConfiguration config, HttpClient httpClient)
    {
        var supabaseUrl = config["Supabase:Url"];
        var supabaseKey = config["Supabase:ServiceRoleKey"];

        if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey))
            return Results.Problem("Supabase configuration is missing.");

        // Step 1: Fetch tokens (no cross-schema join — auth.users is not in the public schema)
        var req = new HttpRequestMessage(HttpMethod.Get, $"{supabaseUrl}/rest/v1/invite_tokens?select=*&order=created_at.desc");
        AddSupabaseHeaders(req, supabaseKey);

        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem("Failed to fetch tokens.");

        var content = await resp.Content.ReadAsStringAsync();
        var tokens = JsonSerializer.Deserialize<JsonElement>(content);

        var result = new List<InviteTokenDto>();
        if (tokens.ValueKind != JsonValueKind.Array)
            return Results.Ok(result);

        var creatorIds = new HashSet<Guid>();
        foreach (var t in tokens.EnumerateArray())
        {
            if (t.TryGetProperty("created_by", out var cb) && cb.ValueKind != JsonValueKind.Null)
                creatorIds.Add(cb.GetGuid());
        }

        // Step 2: Resolve creator emails from user_profiles (public schema)
        var emailMap = new Dictionary<Guid, string>();
        if (creatorIds.Count > 0)
        {
            var idList = string.Join(",", creatorIds);
            var profilesReq = new HttpRequestMessage(HttpMethod.Get,
                $"{supabaseUrl}/rest/v1/user_profiles?select=id,email&id=in.({idList})");
            AddSupabaseHeaders(profilesReq, supabaseKey);
            var profilesResp = await httpClient.SendAsync(profilesReq);
            if (profilesResp.IsSuccessStatusCode)
            {
                var profilesContent = await profilesResp.Content.ReadAsStringAsync();
                var profiles = JsonSerializer.Deserialize<JsonElement>(profilesContent);
                if (profiles.ValueKind == JsonValueKind.Array)
                {
                    foreach (var p in profiles.EnumerateArray())
                    {
                        var pid = p.GetProperty("id").GetGuid();
                        var pemail = p.TryGetProperty("email", out var em) && em.ValueKind != JsonValueKind.Null
                            ? em.GetString() ?? "Unknown"
                            : "Unknown";
                        emailMap[pid] = pemail;
                    }
                }
            }
        }

        // Step 3: Build DTOs
        foreach (var t in tokens.EnumerateArray())
        {
            var id = t.GetProperty("id").GetGuid();
            var emailHint = t.TryGetProperty("email_hint", out var eh) && eh.ValueKind != JsonValueKind.Null ? eh.GetString() : null;
            var expiresAt = t.GetProperty("expires_at").GetDateTimeOffset();
            var usedAt = t.TryGetProperty("used_at", out var ua) && ua.ValueKind != JsonValueKind.Null ? (DateTimeOffset?)ua.GetDateTimeOffset() : null;
            var usedBy = t.TryGetProperty("used_by", out var ub) && ub.ValueKind != JsonValueKind.Null ? (Guid?)ub.GetGuid() : null;
            var revokedAt = t.TryGetProperty("revoked_at", out var ra) && ra.ValueKind != JsonValueKind.Null ? (DateTimeOffset?)ra.GetDateTimeOffset() : null;
            var createdAt = t.GetProperty("created_at").GetDateTimeOffset();
            var createdBy = t.TryGetProperty("created_by", out var cb) && cb.ValueKind != JsonValueKind.Null ? cb.GetGuid() : Guid.Empty;

            emailMap.TryGetValue(createdBy, out var email);
            result.Add(new InviteTokenDto(id, emailHint, expiresAt, usedAt, usedBy, revokedAt, createdAt, email ?? "Unknown"));
        }

        return Results.Ok(result);
    }

    private static async Task<IResult> CreateInviteToken(ClaimsPrincipal user, CreateInviteTokenRequest req, IConfiguration config, HttpClient httpClient)
    {
        var userIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var currentUserId)) return Results.Unauthorized();

        var supabaseUrl = config["Supabase:Url"];
        var supabaseKey = config["Supabase:ServiceRoleKey"];

        if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey))
            return Results.Problem("Supabase configuration is missing.");

        // Generate raw token
        var rawToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));

        var validity = req.ValidityHours ?? 24;
        
        var payload = new {
            token_hash = hash,
            created_by = currentUserId,
            email_hint = req.EmailHint,
            expires_at = DateTimeOffset.UtcNow.AddHours(validity)
        };

        var postReq = new HttpRequestMessage(HttpMethod.Post, $"{supabaseUrl}/rest/v1/invite_tokens?select=id");
        AddSupabaseHeaders(postReq, supabaseKey);
        postReq.Content = JsonContent.Create(payload);
        postReq.Headers.Add("Prefer", "return=representation");

        var resp = await httpClient.SendAsync(postReq);
        if (!resp.IsSuccessStatusCode) {
             var body = await resp.Content.ReadAsStringAsync();
             return Results.Problem($"Failed to create token: {body}");
        }

        var created = await resp.Content.ReadFromJsonAsync<List<SupabaseInviteTokenResponse>>();
        var tokenRecord = created?.FirstOrDefault();

        if (tokenRecord == null) return Results.Problem("Failed to retrieve created token ID.");

        return Results.Ok(new CreateInviteTokenResponse(rawToken, tokenRecord.id));
    }

    private static async Task<IResult> RevokeInviteToken(Guid tokenId, IConfiguration config, HttpClient httpClient)
    {
        var supabaseUrl = config["Supabase:Url"];
        var supabaseKey = config["Supabase:ServiceRoleKey"];

        if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey))
            return Results.Problem("Supabase configuration is missing.");

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{supabaseUrl}/rest/v1/invite_tokens?id=eq.{tokenId}");
        AddSupabaseHeaders(req, supabaseKey);
        req.Content = JsonContent.Create(new { revoked_at = DateTimeOffset.UtcNow });

        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem("Failed to revoke token.");

        return Results.NoContent();
    }
}
