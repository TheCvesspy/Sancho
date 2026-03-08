using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using EventManagement.Models;
using EventManagement.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Sancho.Shared.Roles;

namespace EventManagement.Endpoints;

public static class EventEndpoints
{
    public static void MapEventEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/events").RequireAuthorization();
        group.MapGet("", ListEvents)
            .WithTags("Events")
            .WithSummary("List events")
            .WithDescription("Lists events with optional archived/deleted inclusion and paging.")
            .Produces<List<EventListItemDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("", CreateEvent)
            .WithTags("Events")
            .WithSummary("Create event")
            .WithDescription("Creates a new event. Allowed only for SystemAdmin or OrgOwner.")
            .Produces<EventDetailDto>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/{eventId:guid}", GetEventById)
            .WithTags("Events")
            .WithSummary("Get event detail")
            .Produces<EventDetailDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapPatch("/{eventId:guid}", UpdateEvent)
            .WithTags("Events")
            .WithSummary("Update event")
            .WithDescription("Updates event basics. Archived events are read-only for EventManagers.")
            .Produces<EventDetailDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("/{eventId:guid}/archive", ArchiveEvent)
            .WithTags("Events")
            .WithSummary("Archive event")
            .Produces<EventDetailDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("/{eventId:guid}/restore", RestoreEvent)
            .WithTags("Events")
            .WithSummary("Restore archived event")
            .Produces<EventDetailDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapDelete("/{eventId:guid}", SoftDeleteEvent)
            .WithTags("Events")
            .WithSummary("Soft-delete event")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("/{eventId:guid}/undelete", UndeleteEvent)
            .WithTags("Events")
            .WithSummary("Restore soft-deleted event")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/{eventId:guid}/managers", GetManagers)
            .WithTags("Event Managers")
            .WithSummary("List event managers")
            .Produces<List<EventManagerDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapPut("/{eventId:guid}/managers/{userId:guid}", AssignManager)
            .WithTags("Event Managers")
            .WithSummary("Assign event manager")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapDelete("/{eventId:guid}/managers/{userId:guid}", RevokeManager)
            .WithTags("Event Managers")
            .WithSummary("Revoke event manager")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/{eventId:guid}/permissions", GetPermissions)
            .WithTags("Event Permissions")
            .WithSummary("List event permissions")
            .Produces<List<EventPermissionDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapPut("/{eventId:guid}/permissions/{userId:guid}/{module}", UpsertPermission)
            .WithTags("Event Permissions")
            .WithSummary("Upsert event module permission")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapDelete("/{eventId:guid}/permissions/{userId:guid}/{module}", RevokePermission)
            .WithTags("Event Permissions")
            .WithSummary("Revoke event module permission")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/{eventId:guid}/stats", GetStats)
            .WithTags("Event Analytics")
            .WithSummary("Get event stats")
            .Produces<EventStatsDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapGet("/{eventId:guid}/activity/recent", GetRecentActivity)
            .WithTags("Event Analytics")
            .WithSummary("Get recent event activity")
            .Produces<List<RecentActivityItemDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status401Unauthorized);
    }

    private static async Task<IResult> ListEvents(
        ClaimsPrincipal user, 
        IConfiguration config, HttpClient httpClient, EventAuthorizationService authz,
        [FromQuery] bool includeArchived = false, 
        [FromQuery] bool includeDeleted = false, 
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 50)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var offset = (page - 1) * pageSize;

        var filters = new List<string>
        {
            "select=id,name,location,start_at,end_at,status,archived_at,deleted_at",
            "order=start_at.desc",
            $"limit={pageSize}",
            $"offset={offset}"
        };
        if (!includeArchived) filters.Add("status=neq.archived");
        if (!includeDeleted) filters.Add("deleted_at=is.null");

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/events?{string.Join("&", filters)}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list events: {resp.StatusCode}");

        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseEventResponse>>() ?? [];
        if (authz.IsOrgOrSystemAdmin(user))
        {
            return Results.Ok(rows.Select(ToListItem));
        }

        return Results.Ok(rows.Where(x => !x.deleted_at.HasValue).Select(ToListItem));
    }

    private static async Task<IResult> CreateEvent(
        ClaimsPrincipal user, [FromBody] CreateEventRequest request,
        IConfiguration config, HttpClient httpClient,
        EventAuthorizationService authz, EventActivityService activity)
    {
        if (!authz.IsOrgOrSystemAdmin(user)) return Results.Forbid();
        if (request.EndAt < request.StartAt) return Results.BadRequest("endAt must be >= startAt.");
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/events");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            name = request.Name,
            location = request.Location,
            start_at = request.StartAt,
            end_at = request.EndAt,
            status = "active",
            created_at = DateTimeOffset.UtcNow,
            updated_at = DateTimeOffset.UtcNow
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to create event: {resp.StatusCode}");
        var created = (await resp.Content.ReadFromJsonAsync<List<SupabaseEventResponse>>())?.FirstOrDefault();
        if (created is null) return Results.Problem("Event created but no payload returned.");

        await activity.LogAsync(url!, key!, created.id, UserId(user), "event.created", "event", created.id);
        return Results.Created($"/api/events/{created.id}", ToDetail(created));
    }

    private static async Task<Dictionary<Guid, (string? Name, string? Email)>> GetUserDisplayNamesAsync(IEnumerable<Guid> userIds, string url, string key, HttpClient httpClient)
    {
        var distinctIds = userIds.Distinct().ToList();
        if (distinctIds.Count == 0) return new();

        var filter = string.Join(",", distinctIds.Select(id => id.ToString()));
        var profilesReq = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/user_profiles?id=in.({filter})&select=id,display_name,email");
        AddHeaders(profilesReq, key);
        
        var resp = await httpClient.SendAsync(profilesReq);
        if (!resp.IsSuccessStatusCode) return new();

        var profiles = await resp.Content.ReadFromJsonAsync<List<SupabaseUserProfileShortResponse>>() ?? [];
        return profiles.ToDictionary(x => x.id, x => (x.display_name, x.email));
    }

    private static async Task<IResult> GetEventById(
        Guid eventId, ClaimsPrincipal user,
        IConfiguration config, HttpClient httpClient, EventAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var ev = await GetEvent(eventId, url!, key!, httpClient);
        if (ev is null) return Results.NotFound();

        var canView = await authz.CanAccessEventAsync(user, eventId, url!, key!);
        return canView ? Results.Ok(ToDetail(ev)) : Results.Forbid();
    }

    private static async Task<IResult> UpdateEvent(
        Guid eventId, ClaimsPrincipal user, [FromBody] UpdateEventRequest request,
        IConfiguration config, HttpClient httpClient,
        EventAuthorizationService authz, EventActivityService activity)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var ev = await GetEvent(eventId, url!, key!, httpClient);
        if (ev is null) return Results.NotFound();

        var admin = authz.IsOrgOrSystemAdmin(user);
        var manager = admin || await authz.CanManageEventAsync(user, eventId, url!, key!);
        if (!manager) return Results.Forbid();
        if (ev.deleted_at.HasValue) return Results.BadRequest("Deleted event cannot be modified.");
        if (ev.status == "archived" && !admin) return Results.BadRequest("Archived events are read-only for Event Managers.");

        var startAt = request.StartAt ?? ev.start_at;
        var endAt = request.EndAt ?? ev.end_at;
        if (startAt.HasValue && endAt.HasValue && endAt.Value < startAt.Value)
        {
            return Results.BadRequest("endAt must be >= startAt.");
        }

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/events?id=eq.{eventId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            name = request.Name ?? ev.name,
            location = request.Location ?? ev.location,
            start_at = startAt ?? ev.start_at,
            end_at = endAt ?? ev.end_at,
            updated_at = DateTimeOffset.UtcNow
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to update event: {resp.StatusCode}");
        await activity.LogAsync(url!, key!, eventId, UserId(user), "event.updated", "event", eventId);
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseEventResponse>>())?.FirstOrDefault() ?? ev;
        return Results.Ok(ToDetail(updated));
    }

    private static async Task<IResult> ArchiveEvent(
        Guid eventId, ClaimsPrincipal user, [FromBody] EventOperationRequest request,
        IConfiguration config, HttpClient httpClient, EventAuthorizationService authz, EventActivityService activity)
    {
        if (!authz.IsOrgOrSystemAdmin(user)) return Results.Forbid();
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var ev = await GetEvent(eventId, url!, key!, httpClient);
        if (ev is null) return Results.NotFound();
        if (ev.deleted_at.HasValue) return Results.BadRequest("Deleted event cannot be archived.");
        var patch = await PatchEvent(eventId, new { status = "archived", archived_at = DateTimeOffset.UtcNow, archived_by = UserId(user), updated_at = DateTimeOffset.UtcNow }, url!, key!, httpClient);
        if (patch is null) return Results.Problem("Failed to archive event.");
        await activity.LogAsync(url!, key!, eventId, UserId(user), "event.archived", "event", eventId, new() { ["reason"] = request.Reason });
        return Results.Ok(ToDetail(patch));
    }

    private static async Task<IResult> RestoreEvent(
        Guid eventId, ClaimsPrincipal user,
        IConfiguration config, HttpClient httpClient, EventAuthorizationService authz, EventActivityService activity)
    {
        if (!authz.IsOrgOrSystemAdmin(user)) return Results.Forbid();
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var ev = await GetEvent(eventId, url!, key!, httpClient);
        if (ev is null) return Results.NotFound();
        var patch = await PatchEvent(eventId, new { status = "active", archived_at = (DateTimeOffset?)null, archived_by = (Guid?)null, updated_at = DateTimeOffset.UtcNow }, url!, key!, httpClient);
        if (patch is null) return Results.Problem("Failed to restore event.");
        await activity.LogAsync(url!, key!, eventId, UserId(user), "event.restored", "event", eventId);
        return Results.Ok(ToDetail(patch));
    }

    private static async Task<IResult> SoftDeleteEvent(
        Guid eventId, ClaimsPrincipal user, [FromQuery] string? reason,
        IConfiguration config, HttpClient httpClient, EventAuthorizationService authz, EventActivityService activity)
    {
        if (!authz.IsOrgOrSystemAdmin(user)) return Results.Forbid();
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var ev = await GetEvent(eventId, url!, key!, httpClient);
        if (ev is null) return Results.NotFound();
        var patch = await PatchEvent(eventId, new { deleted_at = DateTimeOffset.UtcNow, deleted_by = UserId(user), deletion_reason = reason, updated_at = DateTimeOffset.UtcNow }, url!, key!, httpClient);
        if (patch is null) return Results.Problem("Failed to delete event.");
        await activity.LogAsync(url!, key!, eventId, UserId(user), "event.deleted", "event", eventId, new() { ["reason"] = reason });
        return Results.NoContent();
    }

    private static async Task<IResult> UndeleteEvent(
        Guid eventId, ClaimsPrincipal user,
        IConfiguration config, HttpClient httpClient, EventAuthorizationService authz, EventActivityService activity)
    {
        if (!authz.IsOrgOrSystemAdmin(user)) return Results.Forbid();
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var ev = await GetEvent(eventId, url!, key!, httpClient);
        if (ev is null) return Results.NotFound();
        var patch = await PatchEvent(eventId, new { deleted_at = (DateTimeOffset?)null, deleted_by = (Guid?)null, deletion_reason = (string?)null, updated_at = DateTimeOffset.UtcNow }, url!, key!, httpClient);
        if (patch is null) return Results.Problem("Failed to undelete event.");
        await activity.LogAsync(url!, key!, eventId, UserId(user), "event.undeleted", "event", eventId);
        return Results.NoContent();
    }

    private static async Task<IResult> GetManagers(
        Guid eventId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, EventAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        if (!await CanManageOrView(user, authz, eventId, url!, key!)) return Results.Forbid();
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/event_members?event_id=eq.{eventId}&role=eq.{AppRoles.EventManager}&select=user_id,role,created_at");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to fetch managers: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseEventMemberResponse>>() ?? [];
        
        var userNames = await GetUserDisplayNamesAsync(rows.Select(x => x.user_id), url!, key!, httpClient);
        return Results.Ok(rows.Select(x => {
            userNames.TryGetValue(x.user_id, out var profile);
            return new EventManagerDto(x.user_id, profile.Name ?? profile.Email, x.role, x.created_at);
        }));
    }

    private static async Task<IResult> AssignManager(
        Guid eventId, Guid userId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient,
        EventAuthorizationService authz, EventActivityService activity, [FromServices] IMemoryCache cache)
    {
        if (!authz.IsOrgOrSystemAdmin(user)) return Results.Forbid();
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var ev = await GetEvent(eventId, url!, key!, httpClient);
        if (ev is null) return Results.NotFound();
        if (ev.deleted_at.HasValue) return Results.BadRequest("Cannot assign manager to deleted event.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/event_members");
        req.Headers.Add("Prefer", "resolution=merge-duplicates,return=minimal");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { event_id = eventId, user_id = userId, role = AppRoles.EventManager, created_at = DateTimeOffset.UtcNow });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to assign manager: {resp.StatusCode}");
        cache.Remove($"claims:{userId}");
        await activity.LogAsync(url!, key!, eventId, UserId(user), "manager.assigned", "event_member", userId, new() { ["targetUserId"] = userId });
        return Results.NoContent();
    }

    private static async Task<IResult> RevokeManager(
        Guid eventId, Guid userId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient,
        EventAuthorizationService authz, EventActivityService activity, [FromServices] IMemoryCache cache)
    {
        if (!authz.IsOrgOrSystemAdmin(user)) return Results.Forbid();
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/event_members?event_id=eq.{eventId}&user_id=eq.{userId}&role=eq.{AppRoles.EventManager}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to revoke manager: {resp.StatusCode}");
        cache.Remove($"claims:{userId}");
        await activity.LogAsync(url!, key!, eventId, UserId(user), "manager.revoked", "event_member", userId, new() { ["targetUserId"] = userId });
        return Results.NoContent();
    }

    private static async Task<IResult> GetPermissions(
        Guid eventId, ClaimsPrincipal user, [FromQuery] Guid? userId, IConfiguration config, HttpClient httpClient, EventAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        if (!await CanManageOrView(user, authz, eventId, url!, key!)) return Results.Forbid();

        var q = $"{url}/rest/v1/event_member_permissions?event_id=eq.{eventId}&select=user_id,module,permission,granted_by,granted_at";
        if (userId.HasValue) q += $"&user_id=eq.{userId.Value}";
        var req = new HttpRequestMessage(HttpMethod.Get, q);
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to fetch permissions: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseEventPermissionResponse>>() ?? [];
        
        var userNames = await GetUserDisplayNamesAsync(rows.Select(x => x.user_id), url!, key!, httpClient);
        return Results.Ok(rows.Select(x => {
            userNames.TryGetValue(x.user_id, out var profile);
            return new EventPermissionDto(x.user_id, profile.Name ?? profile.Email, x.module, x.permission, x.granted_by, x.granted_at ?? DateTimeOffset.UtcNow);
        }));
    }

    private static async Task<IResult> UpsertPermission(
        Guid eventId, Guid userId, string module, ClaimsPrincipal user, [FromBody] UpsertEventPermissionRequest request,
        IConfiguration config, HttpClient httpClient, EventAuthorizationService authz, EventActivityService activity, [FromServices] IMemoryCache cache)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        if (!ModulePermissions.AllModules.Contains(module)) return Results.BadRequest("Unknown module.");
        if (request.Permission is not (ModulePermissions.None or ModulePermissions.Read or ModulePermissions.Write))
            return Results.BadRequest("Permission must be none/read/write.");

        var admin = authz.IsOrgOrSystemAdmin(user);
        var manager = admin || await authz.CanManageEventAsync(user, eventId, url!, key!);
        if (!manager) return Results.Forbid();
        var ev = await GetEvent(eventId, url!, key!, httpClient);
        if (ev is null) return Results.NotFound();
        if (ev.deleted_at.HasValue) return Results.BadRequest("Deleted event is read-only.");
        if (ev.status == "archived" && !admin) return Results.BadRequest("Archived event is read-only for Event Managers.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/event_member_permissions");
        req.Headers.Add("Prefer", "resolution=merge-duplicates,return=minimal");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            event_id = eventId,
            user_id = userId,
            module,
            permission = request.Permission,
            granted_by = UserId(user),
            granted_at = DateTimeOffset.UtcNow
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to upsert permission: {resp.StatusCode}");
        cache.Remove($"claims:{userId}");
        await activity.LogAsync(url!, key!, eventId, UserId(user), "permission.updated", "event_permission", userId, new() { ["module"] = module, ["permission"] = request.Permission });
        return Results.NoContent();
    }

    private static async Task<IResult> RevokePermission(
        Guid eventId, Guid userId, string module, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient,
        EventAuthorizationService authz, EventActivityService activity, [FromServices] IMemoryCache cache)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        if (!ModulePermissions.AllModules.Contains(module)) return Results.BadRequest("Unknown module.");

        var admin = authz.IsOrgOrSystemAdmin(user);
        var manager = admin || await authz.CanManageEventAsync(user, eventId, url!, key!);
        if (!manager) return Results.Forbid();
        var ev = await GetEvent(eventId, url!, key!, httpClient);
        if (ev is null) return Results.NotFound();
        if (ev.deleted_at.HasValue) return Results.BadRequest("Deleted event is read-only.");
        if (ev.status == "archived" && !admin) return Results.BadRequest("Archived event is read-only for Event Managers.");

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/event_member_permissions?event_id=eq.{eventId}&user_id=eq.{userId}&module=eq.{module}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to revoke permission: {resp.StatusCode}");
        cache.Remove($"claims:{userId}");
        await activity.LogAsync(url!, key!, eventId, UserId(user), "permission.revoked", "event_permission", userId, new() { ["module"] = module });
        return Results.NoContent();
    }

    private static async Task<IResult> GetStats(
        Guid eventId, ClaimsPrincipal user, IConfiguration config,
        EventAuthorizationService authz, EventStatsService statsService)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        if (!await CanManageOrView(user, authz, eventId, url!, key!)) return Results.Forbid();
        return Results.Ok(await statsService.GetStatsAsync(eventId, url!, key!));
    }

    private static async Task<IResult> GetRecentActivity(
        Guid eventId, ClaimsPrincipal user, [FromQuery] int limit, IConfiguration config, HttpClient httpClient, EventAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        if (!await CanManageOrView(user, authz, eventId, url!, key!)) return Results.Forbid();
        limit = Math.Clamp(limit, 1, 100);

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/event_activity_log?event_id=eq.{eventId}&select=id,event_id,actor_user_id,action,entity_type,entity_id,metadata,created_at&order=created_at.desc&limit={limit}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to fetch activity: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseActivityResponse>>() ?? [];
        
        var actorIds = rows.Where(x => x.actor_user_id.HasValue).Select(x => x.actor_user_id!.Value);
        var userNames = await GetUserDisplayNamesAsync(actorIds, url!, key!, httpClient);
        
        return Results.Ok(rows.Select(x => {
            string? actorName = null;
            if (x.actor_user_id.HasValue && userNames.TryGetValue(x.actor_user_id.Value, out var profile)) {
                actorName = profile.Name ?? profile.Email;
            }
            return new RecentActivityItemDto(x.id, x.event_id, x.actor_user_id, actorName, x.action, x.entity_type, x.entity_id, x.metadata ?? new(), x.created_at);
        }));
    }

    private static EventListItemDto ToListItem(SupabaseEventResponse row) =>
        new(row.id, row.name ?? "", row.location, row.start_at ?? DateTimeOffset.MinValue, row.end_at ?? DateTimeOffset.MinValue, row.status ?? "active", row.archived_at, row.deleted_at);

    private static EventDetailDto ToDetail(SupabaseEventResponse row) =>
        new(row.id, row.name ?? "", row.location, row.start_at ?? DateTimeOffset.MinValue, row.end_at ?? DateTimeOffset.MinValue, row.status ?? "active", row.archived_at, row.archived_by, row.deleted_at, row.deleted_by, row.deletion_reason, row.created_at ?? DateTimeOffset.UtcNow, row.updated_at ?? DateTimeOffset.UtcNow);

    private static async Task<SupabaseEventResponse?> GetEvent(Guid eventId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/events?id=eq.{eventId}&select=id,name,location,start_at,end_at,status,archived_at,archived_by,deleted_at,deleted_by,deletion_reason,created_at,updated_at&limit=1");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        return (await resp.Content.ReadFromJsonAsync<List<SupabaseEventResponse>>())?.FirstOrDefault();
    }

    private static async Task<SupabaseEventResponse?> PatchEvent(Guid eventId, object body, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/events?id=eq.{eventId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key);
        req.Content = JsonContent.Create(body);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        return (await resp.Content.ReadFromJsonAsync<List<SupabaseEventResponse>>())?.FirstOrDefault();
    }

    private static Guid? UserId(ClaimsPrincipal user)
    {
        var raw = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(raw, out var id) ? id : null;
    }

    private static async Task<bool> CanManageOrView(ClaimsPrincipal user, EventAuthorizationService authz, Guid eventId, string url, string key) =>
        authz.IsOrgOrSystemAdmin(user) || await authz.HasEventManagementReadAccessAsync(user, eventId, url, key);

    private static void AddHeaders(HttpRequestMessage request, string key)
    {
        request.Headers.Add("apikey", key);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
    }

    private static bool TryConfig(IConfiguration config, out string? url, out string? key, out IResult? error)
    {
        url = config["Supabase:Url"];
        key = config["Supabase:ServiceRoleKey"];
        if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(key))
        {
            error = Results.Problem("Supabase configuration is missing.");
            return false;
        }

        error = null;
        return true;
    }
}
