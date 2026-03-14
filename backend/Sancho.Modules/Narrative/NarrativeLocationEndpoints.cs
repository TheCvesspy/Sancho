using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Narrative.Models;
using Narrative.Services;

namespace Narrative.Endpoints;

public static class NarrativeLocationEndpoints
{
    private const int LocationNameMaxLength = 200;

    public static void MapNarrativeLocationEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/locations", ListLocations);
        group.MapPost("/locations", CreateLocation);
        group.MapGet("/locations/{locationId:guid}", GetLocationById);
        group.MapPatch("/locations/{locationId:guid}", UpdateLocation);
        group.MapPost("/locations/{locationId:guid}/status", ChangeLocationStatus);
        group.MapDelete("/locations/{locationId:guid}", SoftDeleteLocation);
        group.MapPost("/locations/{locationId:guid}/undelete", UndeleteLocation);

        group.MapGet("/locations/{locationId:guid}/documents", ListLocationDocuments);
        group.MapPost("/locations/{locationId:guid}/documents/google-drive", AddLocationGoogleDriveDocument);
        group.MapDelete("/locations/{locationId:guid}/documents/{documentId:guid}", DeleteLocationDocument);

        group.MapGet("/locations/{locationId:guid}/floors", ListFloors);
        group.MapPost("/locations/{locationId:guid}/floors", CreateFloor);
        group.MapPatch("/locations/{locationId:guid}/floors/{floorId:guid}", UpdateFloor);
        group.MapDelete("/locations/{locationId:guid}/floors/{floorId:guid}", DeleteFloor);
        group.MapPost("/locations/{locationId:guid}/floors/reorder", ReorderFloors);

        group.MapGet("/locations/{locationId:guid}/floors/{floorId:guid}/documents", ListNestedFloorDocuments);
        group.MapPost("/locations/{locationId:guid}/floors/{floorId:guid}/documents/google-drive", AddNestedFloorGoogleDriveDocument);
        group.MapDelete("/locations/{locationId:guid}/floors/{floorId:guid}/documents/{documentId:guid}", DeleteNestedFloorDocument);
        group.MapGet("/dungeon-floors/{floorId:guid}/documents", ListFlatFloorDocuments);
        group.MapPost("/dungeon-floors/{floorId:guid}/documents/google-drive", AddFlatFloorGoogleDriveDocument);
        group.MapDelete("/dungeon-floors/{floorId:guid}/documents/{documentId:guid}", DeleteFlatFloorDocument);

        group.MapGet("/locations/{locationId:guid}/floors/{floorId:guid}/rooms", ListRooms);
        group.MapPost("/locations/{locationId:guid}/floors/{floorId:guid}/rooms", CreateRoom);
        group.MapPatch("/locations/{locationId:guid}/floors/{floorId:guid}/rooms/{roomId:guid}", UpdateRoom);
        group.MapDelete("/locations/{locationId:guid}/floors/{floorId:guid}/rooms/{roomId:guid}", DeleteRoom);
        group.MapPost("/locations/{locationId:guid}/floors/{floorId:guid}/rooms/reorder", ReorderRooms);

        group.MapGet("/locations/{locationId:guid}/floors/{floorId:guid}/rooms/{roomId:guid}/documents", ListNestedRoomDocuments);
        group.MapPost("/locations/{locationId:guid}/floors/{floorId:guid}/rooms/{roomId:guid}/documents/google-drive", AddNestedRoomGoogleDriveDocument);
        group.MapDelete("/locations/{locationId:guid}/floors/{floorId:guid}/rooms/{roomId:guid}/documents/{documentId:guid}", DeleteNestedRoomDocument);
        group.MapGet("/dungeon-rooms/{roomId:guid}/documents", ListFlatRoomDocuments);
        group.MapPost("/dungeon-rooms/{roomId:guid}/documents/google-drive", AddFlatRoomGoogleDriveDocument);
        group.MapDelete("/dungeon-rooms/{roomId:guid}/documents/{documentId:guid}", DeleteFlatRoomDocument);

        group.MapGet("/locations/{locationId:guid}/links/quests", ListLocationQuestLinks);
        group.MapPut("/locations/{locationId:guid}/links/quests/{questId:guid}", UpsertLocationQuestLink);
        group.MapDelete("/locations/{locationId:guid}/links/quests/{questId:guid}", DeleteLocationQuestLink);
        group.MapGet("/locations/{locationId:guid}/links/plotlines", ListLocationPlotlineLinks);
        group.MapPut("/locations/{locationId:guid}/links/plotlines/{plotlineId:guid}", UpsertLocationPlotlineLink);
        group.MapDelete("/locations/{locationId:guid}/links/plotlines/{plotlineId:guid}", DeleteLocationPlotlineLink);
        group.MapGet("/locations/{locationId:guid}/links/plots", ListLocationPlotLinks);
        group.MapPut("/locations/{locationId:guid}/links/plots/{plotId:guid}", UpsertLocationPlotLink);
        group.MapDelete("/locations/{locationId:guid}/links/plots/{plotId:guid}", DeleteLocationPlotLink);

        group.MapGet("/quests/{questId:guid}/links/locations", ListQuestLocationLinks);
        group.MapPut("/quests/{questId:guid}/links/locations/{locationId:guid}", UpsertQuestLocationLink);
        group.MapDelete("/quests/{questId:guid}/links/locations/{locationId:guid}", DeleteQuestLocationLink);
        group.MapGet("/plotlines/{plotlineId:guid}/links/locations", ListPlotlineLocationLinks);
        group.MapPut("/plotlines/{plotlineId:guid}/links/locations/{locationId:guid}", UpsertPlotlineLocationLink);
        group.MapDelete("/plotlines/{plotlineId:guid}/links/locations/{locationId:guid}", DeletePlotlineLocationLink);
        group.MapGet("/plots/{plotId:guid}/links/locations", ListPlotLocationLinks);
        group.MapPut("/plots/{plotId:guid}/links/locations/{locationId:guid}", UpsertPlotLocationLink);
        group.MapDelete("/plots/{plotId:guid}/links/locations/{locationId:guid}", DeletePlotLocationLink);
    }

    private static async Task<IResult> ListLocations(Guid eventId, ClaimsPrincipal user, [FromQuery] bool? includeDeleted, [FromQuery] string? type, [FromQuery] string? status, [FromQuery] string? q, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!string.IsNullOrWhiteSpace(type) && !IsValidLocationType(type)) return Results.BadRequest("Location type must be 'basic' or 'dungeon'.");
        if (!string.IsNullOrWhiteSpace(status) && !NarrativeStatuses.All.Contains(status)) return Results.BadRequest("Unknown location status.");
        var showDeleted = includeDeleted ?? false;

        var filters = new List<string>
        {
            "select=id,event_id,name,description,internal_notes,location_type,status,created_at,updated_at,deleted_at",
            $"event_id=eq.{eventId}",
            "order=created_at.desc"
        };
        if (!showDeleted) filters.Add("deleted_at=is.null");
        if (!string.IsNullOrWhiteSpace(type)) filters.Add($"location_type=eq.{Uri.EscapeDataString(type.Trim())}");
        if (!string.IsNullOrWhiteSpace(status)) filters.Add($"status=eq.{Uri.EscapeDataString(status.Trim())}");
        if (!string.IsNullOrWhiteSpace(q)) filters.Add($"name=ilike.{Uri.EscapeDataString($"*{q.Trim()}*")}");

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_locations?{string.Join("&", filters)}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list locations: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeLocationRow>>() ?? [];
        return Results.Ok(rows.Select(ToLocationDto));
    }

    private static async Task<IResult> CreateLocation(Guid eventId, ClaimsPrincipal user, [FromBody] CreateNarrativeLocationRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var validation = ValidateLocationName(request.Name);
        if (validation is not null) return Results.BadRequest(validation);
        if (!IsValidLocationType(request.LocationType)) return Results.BadRequest("Location type must be 'basic' or 'dungeon'.");

        var name = request.Name.Trim();
        if (await LocationNameExists(eventId, name, null, url!, key!, httpClient)) return Results.BadRequest("Location name must be unique within event.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_locations");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            event_id = eventId,
            name,
            description = NormalizeOptionalText(request.Description),
            internal_notes = NormalizeOptionalText(request.InternalNotes),
            location_type = request.LocationType.Trim().ToLowerInvariant(),
            status = NarrativeStatuses.Draft
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to create location: {resp.StatusCode}");
        var created = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeLocationRow>>())?.FirstOrDefault();
        return created is null
            ? Results.Problem("Location created but no payload returned.")
            : Results.Created($"/api/events/{eventId}/narrative/locations/{created.id}", ToLocationDto(created));
    }

    private static async Task<IResult> GetLocationById(Guid eventId, Guid locationId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();

        var location = await GetLocation(eventId, locationId, url!, key!, httpClient, includeDeleted: true);
        if (location is null) return Results.NotFound();
        if (!string.Equals(location.location_type, "dungeon", StringComparison.OrdinalIgnoreCase)) return Results.Ok(ToLocationDetailDto(location, []));

        var floorsTask = GetFloors(eventId, locationId, url!, key!, httpClient);
        var roomsTask = GetRoomsForLocation(eventId, locationId, url!, key!, httpClient);
        await Task.WhenAll(floorsTask, roomsTask);
        return Results.Ok(ToLocationDetailDto(location, floorsTask.Result, roomsTask.Result));
    }

    private static async Task<IResult> UpdateLocation(Guid eventId, Guid locationId, ClaimsPrincipal user, [FromBody] UpdateNarrativeLocationRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var row = await GetLocation(eventId, locationId, url!, key!, httpClient, includeDeleted: true);
        if (row is null) return Results.NotFound();
        if (row.deleted_at.HasValue) return Results.BadRequest("Deleted location cannot be edited.");
        if (row.status == NarrativeStatuses.Locked && (request.Name is not null || request.Description is not null))
            return Results.BadRequest("Locked location allows editing internal notes only.");

        var nextName = request.Name is null ? row.name : request.Name.Trim();
        var nameValidation = ValidateLocationName(nextName);
        if (nameValidation is not null) return Results.BadRequest(nameValidation);
        if (!string.Equals(nextName, row.name, StringComparison.OrdinalIgnoreCase) && await LocationNameExists(eventId, nextName, locationId, url!, key!, httpClient))
            return Results.BadRequest("Location name must be unique within event.");

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_locations?id=eq.{locationId}&event_id=eq.{eventId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            name = nextName,
            description = request.Description is null ? row.description : NormalizeOptionalText(request.Description),
            internal_notes = request.InternalNotes is null ? row.internal_notes : NormalizeOptionalText(request.InternalNotes)
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to update location: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeLocationRow>>())?.FirstOrDefault();
        return updated is null ? Results.Problem("Location updated but no payload returned.") : Results.Ok(ToLocationDto(updated));
    }

    private static async Task<IResult> ChangeLocationStatus(Guid eventId, Guid locationId, ClaimsPrincipal user, [FromBody] ChangeNarrativeStatusRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!NarrativeStatuses.All.Contains(request.Status)) return Results.BadRequest("Unknown status.");

        var row = await GetLocation(eventId, locationId, url!, key!, httpClient, includeDeleted: true);
        if (row is null) return Results.NotFound();
        if (row.deleted_at.HasValue) return Results.BadRequest("Deleted location cannot change status.");
        if (!NarrativeLifecycleService.CanTransition(row.status, request.Status)) return Results.BadRequest("Invalid status transition.");
        if (row.status == NarrativeStatuses.Locked && request.Status == NarrativeStatuses.Ready && !request.ConfirmUnlock)
            return Results.BadRequest("Unlocking a locked location requires confirmUnlock=true.");

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_locations?id=eq.{locationId}&event_id=eq.{eventId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { status = request.Status });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to change location status: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeLocationRow>>())?.FirstOrDefault();
        return updated is null ? Results.Problem("Location status changed but no payload returned.") : Results.Ok(ToLocationDto(updated));
    }

    private static async Task<IResult> SoftDeleteLocation(Guid eventId, Guid locationId, ClaimsPrincipal user, [FromBody] NarrativeDeleteRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var row = await GetLocation(eventId, locationId, url!, key!, httpClient, includeDeleted: false);
        if (row is null) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_locations?id=eq.{locationId}&event_id=eq.{eventId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            deleted_at = DateTimeOffset.UtcNow,
            deleted_by = UserId(user),
            deletion_reason = NormalizeOptionalText(request.Reason)
        });
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete location: {resp.StatusCode}");
    }

    private static async Task<IResult> UndeleteLocation(Guid eventId, Guid locationId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var row = await GetLocation(eventId, locationId, url!, key!, httpClient, includeDeleted: true);
        if (row is null) return Results.NotFound();
        if (!row.deleted_at.HasValue) return Results.NoContent();

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_locations?id=eq.{locationId}&event_id=eq.{eventId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { deleted_at = (DateTimeOffset?)null, deleted_by = (Guid?)null, deletion_reason = (string?)null });
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to undelete location: {resp.StatusCode}");
    }
    

    private static async Task<IResult> ListFloors(Guid eventId, Guid locationId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        var location = await GetLocation(eventId, locationId, url!, key!, httpClient, includeDeleted: true);
        if (location is null) return Results.NotFound();
        if (!string.Equals(location.location_type, "dungeon", StringComparison.OrdinalIgnoreCase)) return Results.Ok(Array.Empty<NarrativeDungeonFloorDto>());
        var floors = await GetFloors(eventId, locationId, url!, key!, httpClient);
        var rooms = await GetRoomsForLocation(eventId, locationId, url!, key!, httpClient);
        return Results.Ok(ToFloorDtos(floors, rooms));
    }

    private static async Task<IResult> CreateFloor(Guid eventId, Guid locationId, ClaimsPrincipal user, [FromBody] CreateDungeonFloorRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var location = await ValidateLocationForDungeonWrite(eventId, locationId, url!, key!, httpClient);
        if (location.Result is not null) return location.Result;
        var nameError = ValidateLocationName(request.Name);
        if (nameError is not null) return Results.BadRequest(nameError);

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_dungeon_floors");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            event_id = eventId,
            location_id = locationId,
            sort_order = request.SortOrder ?? 0,
            name = request.Name.Trim(),
            description = NormalizeOptionalText(request.Description),
            internal_notes = NormalizeOptionalText(request.InternalNotes)
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to create dungeon floor: {resp.StatusCode}");
        var created = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeDungeonFloorRow>>())?.FirstOrDefault();
        return created is null ? Results.Problem("Dungeon floor created but no payload returned.") : Results.Created($"/api/events/{eventId}/narrative/locations/{locationId}/floors/{created.id}", ToFloorDto(created, []));
    }

    private static async Task<IResult> UpdateFloor(Guid eventId, Guid locationId, Guid floorId, ClaimsPrincipal user, [FromBody] UpdateDungeonFloorRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var location = await ValidateLocationForDungeonWrite(eventId, locationId, url!, key!, httpClient);
        if (location.Result is not null) return location.Result;
        var floor = await GetFloor(eventId, locationId, floorId, url!, key!, httpClient);
        if (floor is null) return Results.NotFound();
        var nextName = request.Name?.Trim() ?? floor.name;
        var nameError = ValidateLocationName(nextName);
        if (nameError is not null) return Results.BadRequest(nameError);

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_dungeon_floors?id=eq.{floorId}&event_id=eq.{eventId}&location_id=eq.{locationId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            name = nextName,
            description = request.Description is null ? floor.description : NormalizeOptionalText(request.Description),
            internal_notes = request.InternalNotes is null ? floor.internal_notes : NormalizeOptionalText(request.InternalNotes)
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to update dungeon floor: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeDungeonFloorRow>>())?.FirstOrDefault();
        return updated is null ? Results.Problem("Dungeon floor updated but no payload returned.") : Results.Ok(ToFloorDto(updated, []));
    }

    private static async Task<IResult> DeleteFloor(Guid eventId, Guid locationId, Guid floorId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var location = await ValidateLocationForDungeonWrite(eventId, locationId, url!, key!, httpClient);
        if (location.Result is not null) return location.Result;
        if (await GetFloor(eventId, locationId, floorId, url!, key!, httpClient) is null) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_dungeon_floors?id=eq.{floorId}&event_id=eq.{eventId}&location_id=eq.{locationId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete dungeon floor: {resp.StatusCode}");
    }

    private static async Task<IResult> ReorderFloors(Guid eventId, Guid locationId, ClaimsPrincipal user, [FromBody] IReadOnlyList<ReorderNarrativeChildRequest> request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var location = await ValidateLocationForDungeonWrite(eventId, locationId, url!, key!, httpClient);
        if (location.Result is not null) return location.Result;
        if (request.Count == 0) return Results.NoContent();

        var floors = await GetFloors(eventId, locationId, url!, key!, httpClient);
        var requestIds = request.Select(x => x.Id).ToHashSet();
        if (requestIds.Any(id => floors.All(f => f.id != id))) return Results.BadRequest("All reorder ids must belong to the specified location.");
        var payload = floors.Where(f => requestIds.Contains(f.id)).Select(f => new
        {
            id = f.id,
            event_id = f.event_id,
            location_id = f.location_id,
            sort_order = request.First(x => x.Id == f.id).SortOrder,
            name = f.name,
            description = f.description,
            internal_notes = f.internal_notes
        }).ToArray();

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_dungeon_floors?on_conflict=id");
        req.Headers.Add("Prefer", "return=representation,resolution=merge-duplicates");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(payload);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to reorder dungeon floors: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeDungeonFloorRow>>() ?? [];
        return Results.Ok(rows.OrderBy(x => x.sort_order).Select(x => ToFloorDto(x, [])));
    }

    private static async Task<IResult> ListRooms(Guid eventId, Guid locationId, Guid floorId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (await GetFloor(eventId, locationId, floorId, url!, key!, httpClient) is null) return Results.NotFound();
        var rooms = await GetRooms(eventId, locationId, floorId, url!, key!, httpClient);
        return Results.Ok(rooms.Select(ToRoomDto));
    }

    private static async Task<IResult> CreateRoom(Guid eventId, Guid locationId, Guid floorId, ClaimsPrincipal user, [FromBody] CreateDungeonRoomRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var location = await ValidateLocationForDungeonWrite(eventId, locationId, url!, key!, httpClient);
        if (location.Result is not null) return location.Result;
        if (await GetFloor(eventId, locationId, floorId, url!, key!, httpClient) is null) return Results.NotFound();
        var nameError = ValidateLocationName(request.Name);
        if (nameError is not null) return Results.BadRequest(nameError);

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_dungeon_rooms");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            event_id = eventId,
            location_id = locationId,
            floor_id = floorId,
            sort_order = request.SortOrder ?? 0,
            name = request.Name.Trim(),
            description = NormalizeOptionalText(request.Description),
            internal_notes = NormalizeOptionalText(request.InternalNotes)
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to create dungeon room: {resp.StatusCode}");
        var created = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeDungeonRoomRow>>())?.FirstOrDefault();
        return created is null ? Results.Problem("Dungeon room created but no payload returned.") : Results.Created($"/api/events/{eventId}/narrative/locations/{locationId}/floors/{floorId}/rooms/{created.id}", ToRoomDto(created));
    }

    private static async Task<IResult> UpdateRoom(Guid eventId, Guid locationId, Guid floorId, Guid roomId, ClaimsPrincipal user, [FromBody] UpdateDungeonRoomRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var location = await ValidateLocationForDungeonWrite(eventId, locationId, url!, key!, httpClient);
        if (location.Result is not null) return location.Result;
        var room = await GetRoom(eventId, locationId, floorId, roomId, url!, key!, httpClient);
        if (room is null) return Results.NotFound();
        var nextName = request.Name?.Trim() ?? room.name;
        var nameError = ValidateLocationName(nextName);
        if (nameError is not null) return Results.BadRequest(nameError);

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_dungeon_rooms?id=eq.{roomId}&event_id=eq.{eventId}&location_id=eq.{locationId}&floor_id=eq.{floorId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            name = nextName,
            description = request.Description is null ? room.description : NormalizeOptionalText(request.Description),
            internal_notes = request.InternalNotes is null ? room.internal_notes : NormalizeOptionalText(request.InternalNotes)
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to update dungeon room: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeDungeonRoomRow>>())?.FirstOrDefault();
        return updated is null ? Results.Problem("Dungeon room updated but no payload returned.") : Results.Ok(ToRoomDto(updated));
    }

    private static async Task<IResult> DeleteRoom(Guid eventId, Guid locationId, Guid floorId, Guid roomId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var location = await ValidateLocationForDungeonWrite(eventId, locationId, url!, key!, httpClient);
        if (location.Result is not null) return location.Result;
        if (await GetRoom(eventId, locationId, floorId, roomId, url!, key!, httpClient) is null) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_dungeon_rooms?id=eq.{roomId}&event_id=eq.{eventId}&location_id=eq.{locationId}&floor_id=eq.{floorId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete dungeon room: {resp.StatusCode}");
    }

    private static async Task<IResult> ReorderRooms(Guid eventId, Guid locationId, Guid floorId, ClaimsPrincipal user, [FromBody] IReadOnlyList<ReorderNarrativeChildRequest> request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var location = await ValidateLocationForDungeonWrite(eventId, locationId, url!, key!, httpClient);
        if (location.Result is not null) return location.Result;
        if (await GetFloor(eventId, locationId, floorId, url!, key!, httpClient) is null) return Results.NotFound();
        if (request.Count == 0) return Results.NoContent();

        var rooms = await GetRooms(eventId, locationId, floorId, url!, key!, httpClient);
        var requestIds = request.Select(x => x.Id).ToHashSet();
        if (requestIds.Any(id => rooms.All(r => r.id != id))) return Results.BadRequest("All reorder ids must belong to the specified floor.");
        var payload = rooms.Where(r => requestIds.Contains(r.id)).Select(r => new
        {
            id = r.id,
            event_id = r.event_id,
            location_id = r.location_id,
            floor_id = r.floor_id,
            sort_order = request.First(x => x.Id == r.id).SortOrder,
            name = r.name,
            description = r.description,
            internal_notes = r.internal_notes
        }).ToArray();

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_dungeon_rooms?on_conflict=id");
        req.Headers.Add("Prefer", "return=representation,resolution=merge-duplicates");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(payload);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to reorder dungeon rooms: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeDungeonRoomRow>>() ?? [];
        return Results.Ok(rows.OrderBy(x => x.sort_order).Select(ToRoomDto));
    }

    private static async Task<IResult> ListLocationDocuments(Guid eventId, Guid locationId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (await GetLocation(eventId, locationId, url!, key!, httpClient, includeDeleted: true) is null) return Results.NotFound();
        return await ListDocuments(eventId, "location", locationId, url!, key!, httpClient);
    }

    private static async Task<IResult> AddLocationGoogleDriveDocument(Guid eventId, Guid locationId, ClaimsPrincipal user, [FromBody] AddNarrativeGoogleDriveLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz, NarrativeDocumentLinkService documentLinks)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (await GetLocation(eventId, locationId, url!, key!, httpClient, includeDeleted: false) is null) return Results.NotFound();
        return await AddGoogleDriveDocument(eventId, "location", locationId, request, user, url!, key!, httpClient, documentLinks);
    }

    private static async Task<IResult> DeleteLocationDocument(Guid eventId, Guid locationId, Guid documentId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (await GetLocation(eventId, locationId, url!, key!, httpClient, includeDeleted: false) is null) return Results.NotFound();
        return await DeleteDocument(eventId, "location", locationId, documentId, url!, key!, httpClient);
    }

    private static async Task<IResult> ListNestedFloorDocuments(Guid eventId, Guid locationId, Guid floorId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
        => await ListFloorDocumentsInternal(eventId, locationId, floorId, user, config, httpClient, authz);

    private static async Task<IResult> ListFlatFloorDocuments(Guid eventId, Guid floorId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var floor = await GetFloorById(eventId, floorId, url!, key!, httpClient);
        if (floor is null) return Results.NotFound();
        return await ListFloorDocumentsInternal(eventId, floor.location_id, floorId, user, config, httpClient, authz);
    }

    private static async Task<IResult> AddNestedFloorGoogleDriveDocument(Guid eventId, Guid locationId, Guid floorId, ClaimsPrincipal user, [FromBody] AddNarrativeGoogleDriveLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz, NarrativeDocumentLinkService documentLinks)
        => await AddFloorDocumentInternal(eventId, locationId, floorId, user, request, config, httpClient, authz, documentLinks);

    private static async Task<IResult> AddFlatFloorGoogleDriveDocument(Guid eventId, Guid floorId, ClaimsPrincipal user, [FromBody] AddNarrativeGoogleDriveLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz, NarrativeDocumentLinkService documentLinks)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var floor = await GetFloorById(eventId, floorId, url!, key!, httpClient);
        if (floor is null) return Results.NotFound();
        return await AddFloorDocumentInternal(eventId, floor.location_id, floorId, user, request, config, httpClient, authz, documentLinks);
    }

    private static async Task<IResult> DeleteNestedFloorDocument(Guid eventId, Guid locationId, Guid floorId, Guid documentId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
        => await DeleteFloorDocumentInternal(eventId, locationId, floorId, documentId, user, config, httpClient, authz);

    private static async Task<IResult> DeleteFlatFloorDocument(Guid eventId, Guid floorId, Guid documentId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var floor = await GetFloorById(eventId, floorId, url!, key!, httpClient);
        if (floor is null) return Results.NotFound();
        return await DeleteFloorDocumentInternal(eventId, floor.location_id, floorId, documentId, user, config, httpClient, authz);
    }

    private static async Task<IResult> ListNestedRoomDocuments(Guid eventId, Guid locationId, Guid floorId, Guid roomId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
        => await ListRoomDocumentsInternal(eventId, locationId, floorId, roomId, user, config, httpClient, authz);

    private static async Task<IResult> ListFlatRoomDocuments(Guid eventId, Guid roomId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var room = await GetRoomById(eventId, roomId, url!, key!, httpClient);
        if (room is null) return Results.NotFound();
        return await ListRoomDocumentsInternal(eventId, room.location_id, room.floor_id, roomId, user, config, httpClient, authz);
    }

    private static async Task<IResult> AddNestedRoomGoogleDriveDocument(Guid eventId, Guid locationId, Guid floorId, Guid roomId, ClaimsPrincipal user, [FromBody] AddNarrativeGoogleDriveLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz, NarrativeDocumentLinkService documentLinks)
        => await AddRoomDocumentInternal(eventId, locationId, floorId, roomId, user, request, config, httpClient, authz, documentLinks);

    private static async Task<IResult> AddFlatRoomGoogleDriveDocument(Guid eventId, Guid roomId, ClaimsPrincipal user, [FromBody] AddNarrativeGoogleDriveLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz, NarrativeDocumentLinkService documentLinks)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var room = await GetRoomById(eventId, roomId, url!, key!, httpClient);
        if (room is null) return Results.NotFound();
        return await AddRoomDocumentInternal(eventId, room.location_id, room.floor_id, roomId, user, request, config, httpClient, authz, documentLinks);
    }

    private static async Task<IResult> DeleteNestedRoomDocument(Guid eventId, Guid locationId, Guid floorId, Guid roomId, Guid documentId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
        => await DeleteRoomDocumentInternal(eventId, locationId, floorId, roomId, documentId, user, config, httpClient, authz);

    private static async Task<IResult> DeleteFlatRoomDocument(Guid eventId, Guid roomId, Guid documentId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var room = await GetRoomById(eventId, roomId, url!, key!, httpClient);
        if (room is null) return Results.NotFound();
        return await DeleteRoomDocumentInternal(eventId, room.location_id, room.floor_id, roomId, documentId, user, config, httpClient, authz);
    }

    private static async Task<IResult> ListLocationQuestLinks(Guid eventId, Guid locationId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
        => await ListLocationLinksInternal(eventId, locationId, user, config, httpClient, authz, "quest");

    private static async Task<IResult> ListLocationPlotlineLinks(Guid eventId, Guid locationId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
        => await ListLocationLinksInternal(eventId, locationId, user, config, httpClient, authz, "plotline");

    private static async Task<IResult> ListLocationPlotLinks(Guid eventId, Guid locationId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
        => await ListLocationLinksInternal(eventId, locationId, user, config, httpClient, authz, "plot");

    private static async Task<IResult> UpsertLocationQuestLink(Guid eventId, Guid locationId, Guid questId, ClaimsPrincipal user, [FromBody] UpsertNarrativeLocationLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
        => await UpsertLocationLinkInternal(eventId, locationId, questId, user, request, config, httpClient, authz, "quest");

    private static async Task<IResult> UpsertLocationPlotlineLink(Guid eventId, Guid locationId, Guid plotlineId, ClaimsPrincipal user, [FromBody] UpsertNarrativeLocationLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
        => await UpsertLocationLinkInternal(eventId, locationId, plotlineId, user, request, config, httpClient, authz, "plotline");

    private static async Task<IResult> UpsertLocationPlotLink(Guid eventId, Guid locationId, Guid plotId, ClaimsPrincipal user, [FromBody] UpsertNarrativeLocationLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
        => await UpsertLocationLinkInternal(eventId, locationId, plotId, user, request, config, httpClient, authz, "plot");

    private static async Task<IResult> DeleteLocationQuestLink(Guid eventId, Guid locationId, Guid questId, ClaimsPrincipal user, [FromBody] DeleteNarrativeLocationLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
        => await DeleteLocationLinkInternal(eventId, locationId, questId, user, request, config, httpClient, authz, "quest");

    private static async Task<IResult> DeleteLocationPlotlineLink(Guid eventId, Guid locationId, Guid plotlineId, ClaimsPrincipal user, [FromBody] DeleteNarrativeLocationLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
        => await DeleteLocationLinkInternal(eventId, locationId, plotlineId, user, request, config, httpClient, authz, "plotline");

    private static async Task<IResult> DeleteLocationPlotLink(Guid eventId, Guid locationId, Guid plotId, ClaimsPrincipal user, [FromBody] DeleteNarrativeLocationLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
        => await DeleteLocationLinkInternal(eventId, locationId, plotId, user, request, config, httpClient, authz, "plot");

    private static async Task<IResult> ListQuestLocationLinks(Guid eventId, Guid questId, ClaimsPrincipal user, [FromQuery] bool? includeDeleted, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
        => await ListReverseLocationLinksInternal(eventId, questId, user, includeDeleted ?? false, config, httpClient, authz, "quest");

    private static async Task<IResult> ListPlotlineLocationLinks(Guid eventId, Guid plotlineId, ClaimsPrincipal user, [FromQuery] bool? includeDeleted, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
        => await ListReverseLocationLinksInternal(eventId, plotlineId, user, includeDeleted ?? false, config, httpClient, authz, "plotline");

    private static async Task<IResult> ListPlotLocationLinks(Guid eventId, Guid plotId, ClaimsPrincipal user, [FromQuery] bool? includeDeleted, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
        => await ListReverseLocationLinksInternal(eventId, plotId, user, includeDeleted ?? false, config, httpClient, authz, "plot");

    private static async Task<IResult> UpsertQuestLocationLink(Guid eventId, Guid questId, Guid locationId, ClaimsPrincipal user, [FromBody] UpsertNarrativeLocationLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
        => await UpsertLocationLinkInternal(eventId, locationId, questId, user, request, config, httpClient, authz, "quest");

    private static async Task<IResult> UpsertPlotlineLocationLink(Guid eventId, Guid plotlineId, Guid locationId, ClaimsPrincipal user, [FromBody] UpsertNarrativeLocationLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
        => await UpsertLocationLinkInternal(eventId, locationId, plotlineId, user, request, config, httpClient, authz, "plotline");

    private static async Task<IResult> UpsertPlotLocationLink(Guid eventId, Guid plotId, Guid locationId, ClaimsPrincipal user, [FromBody] UpsertNarrativeLocationLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
        => await UpsertLocationLinkInternal(eventId, locationId, plotId, user, request, config, httpClient, authz, "plot");

    private static async Task<IResult> DeleteQuestLocationLink(Guid eventId, Guid questId, Guid locationId, ClaimsPrincipal user, [FromBody] DeleteNarrativeLocationLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
        => await DeleteLocationLinkInternal(eventId, locationId, questId, user, request, config, httpClient, authz, "quest");

    private static async Task<IResult> DeletePlotlineLocationLink(Guid eventId, Guid plotlineId, Guid locationId, ClaimsPrincipal user, [FromBody] DeleteNarrativeLocationLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
        => await DeleteLocationLinkInternal(eventId, locationId, plotlineId, user, request, config, httpClient, authz, "plotline");

    private static async Task<IResult> DeletePlotLocationLink(Guid eventId, Guid plotId, Guid locationId, ClaimsPrincipal user, [FromBody] DeleteNarrativeLocationLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
        => await DeleteLocationLinkInternal(eventId, locationId, plotId, user, request, config, httpClient, authz, "plot");

    private static async Task<IResult> ListLocationLinksInternal(Guid eventId, Guid locationId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz, string entityType)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (await GetLocation(eventId, locationId, url!, key!, httpClient, includeDeleted: true) is null) return Results.NotFound();
        return entityType switch
        {
            "quest" => await ListQuestLinksByLocation(eventId, locationId, url!, key!, httpClient),
            "plotline" => await ListPlotlineLinksByLocation(eventId, locationId, url!, key!, httpClient),
            _ => await ListPlotLinksByLocation(eventId, locationId, url!, key!, httpClient)
        };
    }

    private static async Task<IResult> ListReverseLocationLinksInternal(Guid eventId, Guid ownerId, ClaimsPrincipal user, bool includeDeleted, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz, string entityType)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await EnsureOwnerExists(eventId, ownerId, entityType, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();
        return entityType switch
        {
            "quest" => await ListQuestLocationLinksInternal(eventId, ownerId, includeDeleted, url!, key!, httpClient),
            "plotline" => await ListPlotlineLocationLinksInternal(eventId, ownerId, includeDeleted, url!, key!, httpClient),
            _ => await ListPlotLocationLinksInternal(eventId, ownerId, includeDeleted, url!, key!, httpClient)
        };
    }

    private static async Task<IResult> UpsertLocationLinkInternal(Guid eventId, Guid locationId, Guid ownerId, ClaimsPrincipal user, UpsertNarrativeLocationLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz, string entityType)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var validation = await ValidateLocationLinkRequest(eventId, locationId, request, url!, key!, httpClient);
        if (validation is not null) return validation;
        if (!await EnsureOwnerExists(eventId, ownerId, entityType, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();
        return await UpsertLinkRecord(eventId, locationId, ownerId, request, entityType, url!, key!, httpClient);
    }

    private static async Task<IResult> DeleteLocationLinkInternal(Guid eventId, Guid locationId, Guid ownerId, ClaimsPrincipal user, DeleteNarrativeLocationLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz, string entityType)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (request.LocationId != locationId) return Results.BadRequest("Request body locationId must match route locationId.");
        if (request.RoomId.HasValue && !request.FloorId.HasValue) return Results.BadRequest("roomId requires floorId.");
        if (!await EnsureOwnerExists(eventId, ownerId, entityType, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();
        return await DeleteLinkRecord(eventId, locationId, ownerId, request.FloorId, request.RoomId, entityType, url!, key!, httpClient);
    }

    private static async Task<(SupabaseNarrativeLocationRow? Row, IResult? Result)> ValidateLocationForDungeonWrite(Guid eventId, Guid locationId, string url, string key, HttpClient httpClient)
    {
        var location = await GetLocation(eventId, locationId, url, key, httpClient, includeDeleted: true);
        if (location is null) return (null, Results.NotFound());
        if (location.deleted_at.HasValue) return (null, Results.BadRequest("Deleted location cannot be modified."));
        if (!string.Equals(location.location_type, "dungeon", StringComparison.OrdinalIgnoreCase)) return (null, Results.BadRequest("Floors and rooms are only supported for dungeon locations."));
        if (location.status == NarrativeStatuses.Locked) return (null, Results.BadRequest("Locked location blocks floor and room changes."));
        return (location, null);
    }

    private static async Task<IResult?> ValidateLocationLinkRequest(Guid eventId, Guid locationId, UpsertNarrativeLocationLinkRequest request, string url, string key, HttpClient httpClient)
    {
        if (request.RoomId.HasValue && !request.FloorId.HasValue) return Results.BadRequest("roomId requires floorId.");
        var location = await GetLocation(eventId, locationId, url, key, httpClient, includeDeleted: false);
        if (location is null) return Results.NotFound();
        if (request.FloorId.HasValue)
        {
            if (!string.Equals(location.location_type, "dungeon", StringComparison.OrdinalIgnoreCase)) return Results.BadRequest("Granular floor or room links require a dungeon location.");
            var floor = await GetFloor(eventId, locationId, request.FloorId.Value, url, key, httpClient);
            if (floor is null) return Results.BadRequest("floorId must belong to the selected location.");
            if (request.RoomId.HasValue)
            {
                var room = await GetRoom(eventId, locationId, request.FloorId.Value, request.RoomId.Value, url, key, httpClient);
                if (room is null) return Results.BadRequest("roomId must belong to the selected floor and location.");
            }
        }
        return null;
    }

    private static async Task<bool> EnsureOwnerExists(Guid eventId, Guid ownerId, string entityType, string url, string key, HttpClient httpClient, bool includeDeleted)
        => entityType switch
        {
            "quest" => await QuestExists(eventId, ownerId, url, key, httpClient, includeDeleted),
            "plotline" => await PlotlineExists(eventId, ownerId, url, key, httpClient, includeDeleted),
            _ => await PlotExists(eventId, ownerId, url, key, httpClient, includeDeleted)
        };

    private static async Task<IResult> ListQuestLinksByLocation(Guid eventId, Guid locationId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quest_locations?event_id=eq.{eventId}&location_id=eq.{locationId}&select=event_id,quest_id,location_id,floor_id,room_id,created_at,location:narrative_locations!narrative_quest_locations_location_id_fkey(name),floor:narrative_dungeon_floors!narrative_quest_locations_floor_id_fkey(name),room:narrative_dungeon_rooms!narrative_quest_locations_room_id_fkey(name),quest:narrative_quests!narrative_quest_locations_quest_id_fkey(title)&quest.deleted_at=is.null&order=created_at.asc");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list location quest links: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestLocationRow>>() ?? [];
        return Results.Ok(rows.Select(ToQuestLocationLinkDto));
    }

    private static async Task<IResult> ListPlotlineLinksByLocation(Guid eventId, Guid locationId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plotline_locations?event_id=eq.{eventId}&location_id=eq.{locationId}&select=event_id,plotline_id,location_id,floor_id,room_id,created_at,location:narrative_locations!narrative_plotline_locations_location_id_fkey(name),floor:narrative_dungeon_floors!narrative_plotline_locations_floor_id_fkey(name),room:narrative_dungeon_rooms!narrative_plotline_locations_room_id_fkey(name),plotline:narrative_plotlines!narrative_plotline_locations_plotline_id_fkey(title)&plotline.deleted_at=is.null&order=created_at.asc");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list location plotline links: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotlineLocationRow>>() ?? [];
        return Results.Ok(rows.Select(ToPlotlineLocationLinkDto));
    }

    private static async Task<IResult> ListPlotLinksByLocation(Guid eventId, Guid locationId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plot_locations?event_id=eq.{eventId}&location_id=eq.{locationId}&select=event_id,plot_id,location_id,floor_id,room_id,created_at,location:narrative_locations!narrative_plot_locations_location_id_fkey(name),floor:narrative_dungeon_floors!narrative_plot_locations_floor_id_fkey(name),room:narrative_dungeon_rooms!narrative_plot_locations_room_id_fkey(name),plot:narrative_plots!narrative_plot_locations_plot_id_fkey(title)&plot.deleted_at=is.null&order=created_at.asc");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list location plot links: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotLocationRow>>() ?? [];
        return Results.Ok(rows.Select(ToPlotLocationLinkDto));
    }

    private static async Task<IResult> ListQuestLocationLinksInternal(Guid eventId, Guid questId, bool includeDeleted, string url, string key, HttpClient httpClient)
    {
        var filter = includeDeleted ? string.Empty : "&location.deleted_at=is.null";
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quest_locations?event_id=eq.{eventId}&quest_id=eq.{questId}&select=event_id,quest_id,location_id,floor_id,room_id,created_at,location:narrative_locations!narrative_quest_locations_location_id_fkey(name),floor:narrative_dungeon_floors!narrative_quest_locations_floor_id_fkey(name),room:narrative_dungeon_rooms!narrative_quest_locations_room_id_fkey(name),quest:narrative_quests!narrative_quest_locations_quest_id_fkey(title){filter}&order=created_at.asc");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list quest location links: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestLocationRow>>() ?? [];
        return Results.Ok(rows.Select(ToQuestLocationLinkDto));
    }

    private static async Task<IResult> ListPlotlineLocationLinksInternal(Guid eventId, Guid plotlineId, bool includeDeleted, string url, string key, HttpClient httpClient)
    {
        var filter = includeDeleted ? string.Empty : "&location.deleted_at=is.null";
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plotline_locations?event_id=eq.{eventId}&plotline_id=eq.{plotlineId}&select=event_id,plotline_id,location_id,floor_id,room_id,created_at,location:narrative_locations!narrative_plotline_locations_location_id_fkey(name),floor:narrative_dungeon_floors!narrative_plotline_locations_floor_id_fkey(name),room:narrative_dungeon_rooms!narrative_plotline_locations_room_id_fkey(name),plotline:narrative_plotlines!narrative_plotline_locations_plotline_id_fkey(title){filter}&order=created_at.asc");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list plotline location links: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotlineLocationRow>>() ?? [];
        return Results.Ok(rows.Select(ToPlotlineLocationLinkDto));
    }

    private static async Task<IResult> ListPlotLocationLinksInternal(Guid eventId, Guid plotId, bool includeDeleted, string url, string key, HttpClient httpClient)
    {
        var filter = includeDeleted ? string.Empty : "&location.deleted_at=is.null";
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plot_locations?event_id=eq.{eventId}&plot_id=eq.{plotId}&select=event_id,plot_id,location_id,floor_id,room_id,created_at,location:narrative_locations!narrative_plot_locations_location_id_fkey(name),floor:narrative_dungeon_floors!narrative_plot_locations_floor_id_fkey(name),room:narrative_dungeon_rooms!narrative_plot_locations_room_id_fkey(name),plot:narrative_plots!narrative_plot_locations_plot_id_fkey(title){filter}&order=created_at.asc");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list plot location links: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotLocationRow>>() ?? [];
        return Results.Ok(rows.Select(ToPlotLocationLinkDto));
    }

    private static async Task<IResult> UpsertLinkRecord(Guid eventId, Guid locationId, Guid ownerId, UpsertNarrativeLocationLinkRequest request, string entityType, string url, string key, HttpClient httpClient)
    {
        var (table, ownerColumn) = LinkTable(entityType);
        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/{table}?on_conflict={ownerColumn},location_id,floor_id,room_id");
        req.Headers.Add("Prefer", "return=representation,resolution=merge-duplicates");
        AddHeaders(req, key);
        req.Content = JsonContent.Create(new Dictionary<string, object?>
        {
            ["event_id"] = eventId,
            [ownerColumn] = ownerId,
            ["location_id"] = locationId,
            ["floor_id"] = request.FloorId,
            ["room_id"] = request.RoomId
        });
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.Ok() : Results.Problem($"Failed to upsert {entityType} location link: {resp.StatusCode}");
    }

    private static async Task<IResult> DeleteLinkRecord(Guid eventId, Guid locationId, Guid ownerId, Guid? floorId, Guid? roomId, string entityType, string url, string key, HttpClient httpClient)
    {
        var (table, ownerColumn) = LinkTable(entityType);
        var filters = new List<string>
        {
            $"event_id=eq.{eventId}",
            $"{ownerColumn}=eq.{ownerId}",
            $"location_id=eq.{locationId}",
            floorId.HasValue ? $"floor_id=eq.{floorId.Value}" : "floor_id=is.null",
            roomId.HasValue ? $"room_id=eq.{roomId.Value}" : "room_id=is.null"
        };
        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/{table}?{string.Join("&", filters)}");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete {entityType} location link: {resp.StatusCode}");
    }

    private static (string Table, string OwnerColumn) LinkTable(string entityType) => entityType switch
    {
        "quest" => ("narrative_quest_locations", "quest_id"),
        "plotline" => ("narrative_plotline_locations", "plotline_id"),
        _ => ("narrative_plot_locations", "plot_id")
    };


    private static async Task<List<SupabaseNarrativeDungeonFloorRow>> GetFloors(Guid eventId, Guid locationId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_dungeon_floors?event_id=eq.{eventId}&location_id=eq.{locationId}&select=id,location_id,event_id,sort_order,name,description,internal_notes,created_at,updated_at&order=sort_order.asc,created_at.asc");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        return !resp.IsSuccessStatusCode ? [] : await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeDungeonFloorRow>>() ?? [];
    }

    private static async Task<List<SupabaseNarrativeDungeonRoomRow>> GetRooms(Guid eventId, Guid locationId, Guid floorId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_dungeon_rooms?event_id=eq.{eventId}&location_id=eq.{locationId}&floor_id=eq.{floorId}&select=id,floor_id,location_id,event_id,sort_order,name,description,internal_notes,created_at,updated_at&order=sort_order.asc,created_at.asc");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        return !resp.IsSuccessStatusCode ? [] : await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeDungeonRoomRow>>() ?? [];
    }

    private static async Task<List<SupabaseNarrativeDungeonRoomRow>> GetRoomsForLocation(Guid eventId, Guid locationId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_dungeon_rooms?event_id=eq.{eventId}&location_id=eq.{locationId}&select=id,floor_id,location_id,event_id,sort_order,name,description,internal_notes,created_at,updated_at&order=sort_order.asc,created_at.asc");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        return !resp.IsSuccessStatusCode ? [] : await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeDungeonRoomRow>>() ?? [];
    }

    private static async Task<SupabaseNarrativeLocationRow?> GetLocation(Guid eventId, Guid locationId, string url, string key, HttpClient httpClient, bool includeDeleted)
    {
        var filters = new List<string> { $"id=eq.{locationId}", $"event_id=eq.{eventId}", "select=id,event_id,name,description,internal_notes,location_type,status,created_at,updated_at,deleted_at", "limit=1" };
        if (!includeDeleted) filters.Add("deleted_at=is.null");
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_locations?{string.Join("&", filters)}");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeLocationRow>>();
        return rows?.FirstOrDefault();
    }

    private static async Task<SupabaseNarrativeDungeonFloorRow?> GetFloor(Guid eventId, Guid locationId, Guid floorId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_dungeon_floors?id=eq.{floorId}&event_id=eq.{eventId}&location_id=eq.{locationId}&select=id,location_id,event_id,sort_order,name,description,internal_notes,created_at,updated_at&limit=1");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeDungeonFloorRow>>();
        return rows?.FirstOrDefault();
    }

    private static async Task<SupabaseNarrativeDungeonFloorRow?> GetFloorById(Guid eventId, Guid floorId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_dungeon_floors?id=eq.{floorId}&event_id=eq.{eventId}&select=id,location_id,event_id,sort_order,name,description,internal_notes,created_at,updated_at&limit=1");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeDungeonFloorRow>>();
        return rows?.FirstOrDefault();
    }

    private static async Task<SupabaseNarrativeDungeonRoomRow?> GetRoom(Guid eventId, Guid locationId, Guid floorId, Guid roomId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_dungeon_rooms?id=eq.{roomId}&event_id=eq.{eventId}&location_id=eq.{locationId}&floor_id=eq.{floorId}&select=id,floor_id,location_id,event_id,sort_order,name,description,internal_notes,created_at,updated_at&limit=1");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeDungeonRoomRow>>();
        return rows?.FirstOrDefault();
    }

    private static async Task<SupabaseNarrativeDungeonRoomRow?> GetRoomById(Guid eventId, Guid roomId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_dungeon_rooms?id=eq.{roomId}&event_id=eq.{eventId}&select=id,floor_id,location_id,event_id,sort_order,name,description,internal_notes,created_at,updated_at&limit=1");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeDungeonRoomRow>>();
        return rows?.FirstOrDefault();
    }

    private static async Task<bool> LocationNameExists(Guid eventId, string name, Guid? excludingLocationId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_locations?event_id=eq.{eventId}&name=ilike.{Uri.EscapeDataString(name)}&deleted_at=is.null&select=id&limit=10");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return false;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeIdRow>>() ?? [];
        return rows.Any(x => !excludingLocationId.HasValue || x.id != excludingLocationId.Value);
    }

    private static async Task<bool> QuestExists(Guid eventId, Guid questId, string url, string key, HttpClient httpClient, bool includeDeleted)
    {
        var filters = new List<string> { $"id=eq.{questId}", $"event_id=eq.{eventId}", "select=id", "limit=1" };
        if (!includeDeleted) filters.Add("deleted_at=is.null");
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quests?{string.Join("&", filters)}");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return false;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeIdRow>>() ?? [];
        return rows.Count > 0;
    }

    private static async Task<bool> PlotlineExists(Guid eventId, Guid plotlineId, string url, string key, HttpClient httpClient, bool includeDeleted)
    {
        var filters = new List<string> { $"id=eq.{plotlineId}", $"event_id=eq.{eventId}", "select=id", "limit=1" };
        if (!includeDeleted) filters.Add("deleted_at=is.null");
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plotlines?{string.Join("&", filters)}");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return false;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeIdRow>>() ?? [];
        return rows.Count > 0;
    }

    private static async Task<bool> PlotExists(Guid eventId, Guid plotId, string url, string key, HttpClient httpClient, bool includeDeleted)
    {
        var filters = new List<string> { $"id=eq.{plotId}", $"event_id=eq.{eventId}", "select=id", "limit=1" };
        if (!includeDeleted) filters.Add("deleted_at=is.null");
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plots?{string.Join("&", filters)}");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return false;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeIdRow>>() ?? [];
        return rows.Count > 0;
    }

    private static async Task<IResult> ListFloorDocumentsInternal(Guid eventId, Guid locationId, Guid floorId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (await GetFloor(eventId, locationId, floorId, url!, key!, httpClient) is null) return Results.NotFound();
        return await ListDocuments(eventId, "dungeon_floor", floorId, url!, key!, httpClient);
    }

    private static async Task<IResult> AddFloorDocumentInternal(Guid eventId, Guid locationId, Guid floorId, ClaimsPrincipal user, AddNarrativeGoogleDriveLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz, NarrativeDocumentLinkService documentLinks)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var location = await ValidateLocationForDungeonWrite(eventId, locationId, url!, key!, httpClient);
        if (location.Result is not null) return location.Result;
        if (await GetFloor(eventId, locationId, floorId, url!, key!, httpClient) is null) return Results.NotFound();
        return await AddGoogleDriveDocument(eventId, "dungeon_floor", floorId, request, user, url!, key!, httpClient, documentLinks);
    }

    private static async Task<IResult> DeleteFloorDocumentInternal(Guid eventId, Guid locationId, Guid floorId, Guid documentId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var location = await ValidateLocationForDungeonWrite(eventId, locationId, url!, key!, httpClient);
        if (location.Result is not null) return location.Result;
        if (await GetFloor(eventId, locationId, floorId, url!, key!, httpClient) is null) return Results.NotFound();
        return await DeleteDocument(eventId, "dungeon_floor", floorId, documentId, url!, key!, httpClient);
    }

    private static async Task<IResult> ListRoomDocumentsInternal(Guid eventId, Guid locationId, Guid floorId, Guid roomId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (await GetRoom(eventId, locationId, floorId, roomId, url!, key!, httpClient) is null) return Results.NotFound();
        return await ListDocuments(eventId, "dungeon_room", roomId, url!, key!, httpClient);
    }

    private static async Task<IResult> AddRoomDocumentInternal(Guid eventId, Guid locationId, Guid floorId, Guid roomId, ClaimsPrincipal user, AddNarrativeGoogleDriveLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz, NarrativeDocumentLinkService documentLinks)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var location = await ValidateLocationForDungeonWrite(eventId, locationId, url!, key!, httpClient);
        if (location.Result is not null) return location.Result;
        if (await GetRoom(eventId, locationId, floorId, roomId, url!, key!, httpClient) is null) return Results.NotFound();
        return await AddGoogleDriveDocument(eventId, "dungeon_room", roomId, request, user, url!, key!, httpClient, documentLinks);
    }

    private static async Task<IResult> DeleteRoomDocumentInternal(Guid eventId, Guid locationId, Guid floorId, Guid roomId, Guid documentId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var location = await ValidateLocationForDungeonWrite(eventId, locationId, url!, key!, httpClient);
        if (location.Result is not null) return location.Result;
        if (await GetRoom(eventId, locationId, floorId, roomId, url!, key!, httpClient) is null) return Results.NotFound();
        return await DeleteDocument(eventId, "dungeon_room", roomId, documentId, url!, key!, httpClient);
    }

    private static async Task<IResult> ListDocuments(Guid eventId, string entityType, Guid entityId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_document_links?event_id=eq.{eventId}&entity_type=eq.{entityType}&entity_id=eq.{entityId}&select=id,event_id,entity_type,entity_id,display_name,url,document_status,source_type,created_by,created_at&order=created_at.desc");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list {entityType} documents: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeDocumentLinkRow>>() ?? [];
        return Results.Ok(rows.Select(ToDocumentDto));
    }

    private static async Task<IResult> AddGoogleDriveDocument(Guid eventId, string entityType, Guid entityId, AddNarrativeGoogleDriveLinkRequest request, ClaimsPrincipal user, string url, string key, HttpClient httpClient, NarrativeDocumentLinkService documentLinks)
    {
        if (string.IsNullOrWhiteSpace(request.DisplayName)) return Results.BadRequest("Display name is required.");
        if (!NarrativeItemStatuses.All.Contains(request.DocumentStatus)) return Results.BadRequest("Unknown document status.");
        documentLinks.ValidateGoogleDriveUrl(request.Url);

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_document_links");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key);
        req.Content = JsonContent.Create(new
        {
            event_id = eventId,
            entity_type = entityType,
            entity_id = entityId,
            display_name = request.DisplayName.Trim(),
            url = request.Url,
            document_status = request.DocumentStatus,
            source_type = "GoogleDrive",
            created_by = UserId(user)
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to add {entityType} Google Drive link: {resp.StatusCode}");
        var created = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeDocumentLinkRow>>())?.FirstOrDefault();
        return created is null ? Results.Problem("Document link saved but payload missing.") : Results.Created($"/api/events/{eventId}/narrative/{entityType}s/{entityId}/documents/{created.id}", ToDocumentDto(created));
    }

    private static async Task<IResult> DeleteDocument(Guid eventId, string entityType, Guid entityId, Guid documentId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_document_links?id=eq.{documentId}&event_id=eq.{eventId}&entity_type=eq.{entityType}&entity_id=eq.{entityId}");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete {entityType} document link: {resp.StatusCode}");
    }
    private static NarrativeLocationDto ToLocationDto(SupabaseNarrativeLocationRow row)
        => new(row.id, row.event_id, row.name, row.description, row.internal_notes, row.location_type, row.status, row.created_at, row.updated_at, row.deleted_at);

    private static NarrativeLocationDetailDto ToLocationDetailDto(SupabaseNarrativeLocationRow row, IReadOnlyList<NarrativeDungeonFloorDto> floors)
        => new(row.id, row.event_id, row.name, row.description, row.internal_notes, row.location_type, row.status, row.created_at, row.updated_at, row.deleted_at, floors);

    private static NarrativeLocationDetailDto ToLocationDetailDto(SupabaseNarrativeLocationRow row, IReadOnlyList<SupabaseNarrativeDungeonFloorRow> floors, IReadOnlyList<SupabaseNarrativeDungeonRoomRow> rooms)
        => ToLocationDetailDto(row, ToFloorDtos(floors, rooms));

    private static IReadOnlyList<NarrativeDungeonFloorDto> ToFloorDtos(IReadOnlyList<SupabaseNarrativeDungeonFloorRow> floors, IReadOnlyList<SupabaseNarrativeDungeonRoomRow> rooms)
        => floors.OrderBy(x => x.sort_order).ThenBy(x => x.created_at).Select(f => ToFloorDto(f, rooms.Where(r => r.floor_id == f.id).OrderBy(r => r.sort_order).ThenBy(r => r.created_at).Select(ToRoomDto).ToArray())).ToArray();

    private static NarrativeDungeonFloorDto ToFloorDto(SupabaseNarrativeDungeonFloorRow row, IReadOnlyList<NarrativeDungeonRoomDto> rooms)
        => new(row.id, row.location_id, row.event_id, row.sort_order, row.name, row.description, row.internal_notes, row.created_at, row.updated_at, rooms);

    private static NarrativeDungeonRoomDto ToRoomDto(SupabaseNarrativeDungeonRoomRow row)
        => new(row.id, row.floor_id, row.location_id, row.event_id, row.sort_order, row.name, row.description, row.internal_notes, row.created_at, row.updated_at);

    private static NarrativeLocationLinkDto ToQuestLocationLinkDto(SupabaseNarrativeQuestLocationRow row)
        => new(row.event_id, row.location_id, row.floor_id, row.room_id, row.quest_id, null, null, row.location?.name ?? string.Empty, row.floor?.name, row.room?.name, row.quest?.title, null, null, row.created_at);

    private static NarrativeLocationLinkDto ToPlotlineLocationLinkDto(SupabaseNarrativePlotlineLocationRow row)
        => new(row.event_id, row.location_id, row.floor_id, row.room_id, null, row.plotline_id, null, row.location?.name ?? string.Empty, row.floor?.name, row.room?.name, null, row.plotline?.title, null, row.created_at);

    private static NarrativeLocationLinkDto ToPlotLocationLinkDto(SupabaseNarrativePlotLocationRow row)
        => new(row.event_id, row.location_id, row.floor_id, row.room_id, null, null, row.plot_id, row.location?.name ?? string.Empty, row.floor?.name, row.room?.name, null, null, row.plot?.title, row.created_at);

    private static NarrativeDocumentLinkDto ToDocumentDto(SupabaseNarrativeDocumentLinkRow row)
        => new(row.id, row.event_id, row.entity_type, row.entity_id, row.display_name, row.url, row.document_status, row.source_type, row.created_by, row.created_at);

    private static string? ValidateLocationName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "Name is required.";
        if (value.Trim().Length > LocationNameMaxLength) return $"Name cannot be longer than {LocationNameMaxLength} characters.";
        return null;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        if (value is null) return null;
        var normalized = value.Trim();
        return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
    }

    private static bool IsValidLocationType(string value)
        => string.Equals(value, "basic", StringComparison.OrdinalIgnoreCase) || string.Equals(value, "dungeon", StringComparison.OrdinalIgnoreCase);

    private static Guid? UserId(ClaimsPrincipal user)
    {
        var raw = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(raw, out var id) ? id : null;
    }

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





