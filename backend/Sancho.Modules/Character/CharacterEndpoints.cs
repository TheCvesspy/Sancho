using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using Character.Models;
using Character.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;

namespace Character.Endpoints;

public static class CharacterEndpoints
{
    public static void MapCharacterEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/events/{eventId:guid}/characters").RequireAuthorization();

        group.MapGet("", ListCharacters);
        group.MapPost("", CreateCharacter);
        group.MapGet("/{characterId:guid}", GetCharacterById);
        group.MapPatch("/{characterId:guid}", UpdateCharacterProfile);
        group.MapPost("/{characterId:guid}/status", ChangeStatus);
        group.MapPost("/{characterId:guid}/duplicate", DuplicateCharacter);
        group.MapDelete("/{characterId:guid}", SoftDeleteCharacter);
        group.MapPost("/{characterId:guid}/undelete", UndeleteCharacter);

        group.MapGet("/{characterId:guid}/abilities", ListAbilities);
        group.MapPost("/{characterId:guid}/abilities", CreateAbility);
        group.MapPatch("/{characterId:guid}/abilities/{abilityId:guid}", UpdateAbility);
        group.MapDelete("/{characterId:guid}/abilities/{abilityId:guid}", DeleteAbility);

        group.MapGet("/{characterId:guid}/attachments", ListAttachments);
        group.MapPost("/{characterId:guid}/attachments/upload-url", CreateAttachmentUploadUrl);
        group.MapPost("/{characterId:guid}/attachments/confirm", ConfirmAttachment);
        group.MapDelete("/{characterId:guid}/attachments/{attachmentId:guid}", DeleteAttachment);

        group.MapPost("/{characterId:guid}/photo/upload-url", CreatePhotoUploadUrl);
        group.MapPost("/{characterId:guid}/photo/confirm", ConfirmPhoto);
        group.MapDelete("/{characterId:guid}/photo", RemovePhoto);

        group.MapGet("/{characterId:guid}/narrative-links", GetNarrativeLinks);
    }

    private static async Task<IResult> ListCharacters(Guid eventId, ClaimsPrincipal user, [FromQuery] bool includeDeleted, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();

        var filters = new List<string>
        {
            "select=id,event_id,name,race,status,biography,notes,player_user_id,photo_url,created_at,updated_at,deleted_at",
            $"event_id=eq.{eventId}",
            "order=created_at.desc"
        };
        if (!includeDeleted) filters.Add("deleted_at=is.null");

        var request = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/characters?{string.Join("&", filters)}");
        AddHeaders(request, key!);
        var response = await httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return Results.Problem($"Failed to list characters: {response.StatusCode}");
        var rows = await response.Content.ReadFromJsonAsync<List<SupabaseCharacterRow>>() ?? [];
        return Results.Ok(rows.Select(ToDetail));
    }

    private static async Task<IResult> CreateCharacter(Guid eventId, ClaimsPrincipal user, [FromBody] CreateCharacterRequest request, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Race)) return Results.BadRequest("Name and race are required.");
        if (await CharacterNameExists(eventId, request.Name.Trim(), null, url!, key!, httpClient)) return Results.BadRequest("Character name must be unique within event.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/characters");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            event_id = eventId,
            name = request.Name.Trim(),
            race = request.Race.Trim(),
            biography = request.Biography,
            notes = request.Notes,
            status = CharacterStatuses.Draft
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to create character: {resp.StatusCode}");
        var created = (await resp.Content.ReadFromJsonAsync<List<SupabaseCharacterRow>>())?.FirstOrDefault();
        return created is null ? Results.Problem("Character created but no payload returned.") : Results.Created($"/api/events/{eventId}/characters/{created.id}", ToDetail(created));
    }

    private static async Task<IResult> GetCharacterById(Guid eventId, Guid characterId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();

        var row = await GetCharacter(eventId, characterId, url!, key!, httpClient, includeDeleted: true);
        return row is null ? Results.NotFound() : Results.Ok(ToDetail(row));
    }

    private static async Task<IResult> UpdateCharacterProfile(Guid eventId, Guid characterId, ClaimsPrincipal user, [FromBody] UpdateCharacterProfileRequest request, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var row = await GetCharacter(eventId, characterId, url!, key!, httpClient, includeDeleted: true);
        if (row is null) return Results.NotFound();
        if (row.deleted_at.HasValue) return Results.BadRequest("Deleted character cannot be edited.");
        if (row.status == CharacterStatuses.Locked && (request.Name is not null || request.Race is not null || request.Biography is not null || request.PlayerUserId.HasValue))
            return Results.BadRequest("Locked character allows editing notes only.");
        if (row.status != CharacterStatuses.Ready && request.PlayerUserId.HasValue && request.PlayerUserId != row.player_user_id)
            return Results.BadRequest("Player assignment is allowed only in Ready status.");

        var nextName = request.Name?.Trim() ?? row.name;
        if (!string.Equals(nextName, row.name, StringComparison.OrdinalIgnoreCase) &&
            await CharacterNameExists(eventId, nextName, characterId, url!, key!, httpClient))
        {
            return Results.BadRequest("Character name must be unique within event.");
        }

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/characters?id=eq.{characterId}&event_id=eq.{eventId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            name = nextName,
            race = request.Race ?? row.race,
            biography = request.Biography ?? row.biography,
            notes = request.Notes ?? row.notes,
            player_user_id = request.PlayerUserId.HasValue ? request.PlayerUserId : row.player_user_id
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to update character: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseCharacterRow>>())?.FirstOrDefault();
        return updated is null ? Results.Problem("Character update payload missing.") : Results.Ok(ToDetail(updated));
    }

    private static async Task<IResult> ChangeStatus(Guid eventId, Guid characterId, ClaimsPrincipal user, [FromBody] ChangeCharacterStatusRequest request, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!CharacterStatuses.All.Contains(request.Status)) return Results.BadRequest("Unknown status.");

        var row = await GetCharacter(eventId, characterId, url!, key!, httpClient, includeDeleted: true);
        if (row is null) return Results.NotFound();
        if (!CharacterLifecycleService.CanTransition(row.status, request.Status)) return Results.BadRequest($"Invalid status transition: {row.status} -> {request.Status}.");
        if (row.status == CharacterStatuses.Locked && request.Status == CharacterStatuses.Ready && !request.ConfirmUnlock) return Results.BadRequest("Unlock requires explicit confirmation.");

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/characters?id=eq.{characterId}&event_id=eq.{eventId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { status = request.Status });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to change status: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseCharacterRow>>())?.FirstOrDefault();
        return updated is null ? Results.Problem("Character status payload missing.") : Results.Ok(ToDetail(updated));
    }

    private static async Task<IResult> DuplicateCharacter(Guid eventId, Guid characterId, ClaimsPrincipal user, [FromBody] DuplicateCharacterRequest request, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var source = await GetCharacter(eventId, characterId, url!, key!, httpClient, includeDeleted: false);
        if (source is null) return Results.NotFound();

        var clonedName = string.IsNullOrWhiteSpace(request.Name) ? $"{source.name} (Copy)" : request.Name.Trim();
        if (await CharacterNameExists(eventId, clonedName, null, url!, key!, httpClient)) return Results.BadRequest("Duplicate name already exists in event.");

        var createReq = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/characters");
        createReq.Headers.Add("Prefer", "return=representation");
        AddHeaders(createReq, key!);
        createReq.Content = JsonContent.Create(new { event_id = eventId, name = clonedName, race = source.race, biography = source.biography, notes = source.notes, status = CharacterStatuses.Draft });
        var createResp = await httpClient.SendAsync(createReq);
        if (!createResp.IsSuccessStatusCode) return Results.Problem($"Failed to duplicate character: {createResp.StatusCode}");
        var created = (await createResp.Content.ReadFromJsonAsync<List<SupabaseCharacterRow>>())?.FirstOrDefault();
        if (created is null) return Results.Problem("Duplicated character payload missing.");

        var abilities = await GetAbilities(characterId, url!, key!, httpClient);
        foreach (var ability in abilities)
        {
            var copyReq = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/character_abilities");
            copyReq.Headers.Add("Prefer", "return=minimal");
            AddHeaders(copyReq, key!);
            copyReq.Content = JsonContent.Create(new { character_id = created.id, category = ability.category, name = ability.name, value = ability.value, description = ability.description, sort_order = ability.sort_order });
            await httpClient.SendAsync(copyReq);
        }

        return Results.Created($"/api/events/{eventId}/characters/{created.id}", ToDetail(created));
    }

    private static async Task<IResult> SoftDeleteCharacter(Guid eventId, Guid characterId, ClaimsPrincipal user, [FromBody] CharacterDeleteRequest request, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz, ICharacterNarrativeService narrativeService)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var row = await GetCharacter(eventId, characterId, url!, key!, httpClient, includeDeleted: true);
        if (row is null) return Results.NotFound();
        if (row.deleted_at.HasValue) return Results.NoContent();
        if (await narrativeService.HasActiveRelationshipsAsync(eventId, characterId)) return Results.BadRequest("Character has active narrative relationships and cannot be deleted.");

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/characters?id=eq.{characterId}&event_id=eq.{eventId}");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { deleted_at = DateTimeOffset.UtcNow, deleted_by = UserId(user), deletion_reason = request.Reason });
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete character: {resp.StatusCode}");
    }

    private static async Task<IResult> UndeleteCharacter(Guid eventId, Guid characterId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/characters?id=eq.{characterId}&event_id=eq.{eventId}");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { deleted_at = (DateTimeOffset?)null, deleted_by = (Guid?)null, deletion_reason = (string?)null });
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to undelete character: {resp.StatusCode}");
    }

    private static async Task<IResult> ListAbilities(Guid eventId, Guid characterId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await CharacterExists(eventId, characterId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();

        var rows = await GetAbilities(characterId, url!, key!, httpClient);
        return Results.Ok(rows.Select(ToAbilityDto));
    }

    private static async Task<IResult> CreateAbility(Guid eventId, Guid characterId, ClaimsPrincipal user, [FromBody] CreateCharacterAbilityRequest request, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var character = await GetCharacter(eventId, characterId, url!, key!, httpClient, includeDeleted: false);
        if (character is null) return Results.NotFound();
        if (character.status == CharacterStatuses.Locked) return Results.BadRequest("Locked character abilities are read-only.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/character_abilities");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            character_id = characterId,
            category = request.Category,
            name = request.Name,
            value = request.Value,
            description = request.Description,
            sort_order = request.SortOrder
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to create ability: {resp.StatusCode}");
        var created = (await resp.Content.ReadFromJsonAsync<List<SupabaseCharacterAbilityRow>>())?.FirstOrDefault();
        return created is null ? Results.Problem("Ability created but payload missing.") : Results.Created($"/api/events/{eventId}/characters/{characterId}/abilities/{created.id}", ToAbilityDto(created));
    }

    private static async Task<IResult> UpdateAbility(Guid eventId, Guid characterId, Guid abilityId, ClaimsPrincipal user, [FromBody] UpdateCharacterAbilityRequest request, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var character = await GetCharacter(eventId, characterId, url!, key!, httpClient, includeDeleted: false);
        if (character is null) return Results.NotFound();
        if (character.status == CharacterStatuses.Locked) return Results.BadRequest("Locked character abilities are read-only.");

        var current = await GetAbility(abilityId, characterId, url!, key!, httpClient);
        if (current is null) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/character_abilities?id=eq.{abilityId}&character_id=eq.{characterId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            category = request.Category ?? current.category,
            name = request.Name ?? current.name,
            value = request.Value ?? current.value,
            description = request.Description ?? current.description,
            sort_order = request.SortOrder ?? current.sort_order
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to update ability: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseCharacterAbilityRow>>())?.FirstOrDefault();
        return updated is null ? Results.Problem("Ability updated but payload missing.") : Results.Ok(ToAbilityDto(updated));
    }

    private static async Task<IResult> DeleteAbility(Guid eventId, Guid characterId, Guid abilityId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var character = await GetCharacter(eventId, characterId, url!, key!, httpClient, includeDeleted: false);
        if (character is null) return Results.NotFound();
        if (character.status == CharacterStatuses.Locked) return Results.BadRequest("Locked character abilities are read-only.");

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/character_abilities?id=eq.{abilityId}&character_id=eq.{characterId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete ability: {resp.StatusCode}");
    }

    private static async Task<IResult> ListAttachments(Guid eventId, Guid characterId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await CharacterExists(eventId, characterId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/character_attachments?character_id=eq.{characterId}&select=id,character_id,file_name,file_url,mime_type,category,uploaded_by,uploaded_at&order=uploaded_at.desc");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list attachments: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseCharacterAttachmentRow>>() ?? [];
        return Results.Ok(rows.Select(ToAttachmentDto));
    }

    private static async Task<IResult> CreateAttachmentUploadUrl(Guid eventId, Guid characterId, ClaimsPrincipal user, [FromBody] CharacterUploadUrlRequest request, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz, CharacterStorageService storage)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var character = await GetCharacter(eventId, characterId, url!, key!, httpClient, includeDeleted: false);
        if (character is null) return Results.NotFound();
        if (character.status == CharacterStatuses.Locked) return Results.BadRequest("Locked character attachments are read-only.");

        try { return Results.Ok(await storage.CreateAttachmentUploadUrlAsync(url!, key!, eventId, characterId, request)); }
        catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
    }

    private static async Task<IResult> ConfirmAttachment(Guid eventId, Guid characterId, ClaimsPrincipal user, [FromBody] ConfirmCharacterAttachmentRequest request, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var character = await GetCharacter(eventId, characterId, url!, key!, httpClient, includeDeleted: false);
        if (character is null) return Results.NotFound();
        if (character.status == CharacterStatuses.Locked) return Results.BadRequest("Locked character attachments are read-only.");
        if (!CharacterAttachmentCategories.All.Contains(request.Category)) return Results.BadRequest("Unknown attachment category.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/character_attachments");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { character_id = characterId, file_name = request.FileName, file_url = request.FilePath, mime_type = request.MimeType, category = request.Category, uploaded_by = UserId(user), uploaded_at = DateTimeOffset.UtcNow });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to confirm attachment: {resp.StatusCode}");
        var created = (await resp.Content.ReadFromJsonAsync<List<SupabaseCharacterAttachmentRow>>())?.FirstOrDefault();
        return created is null ? Results.Problem("Attachment saved but payload missing.") : Results.Created($"/api/events/{eventId}/characters/{characterId}/attachments/{created.id}", ToAttachmentDto(created));
    }

    private static async Task<IResult> DeleteAttachment(Guid eventId, Guid characterId, Guid attachmentId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz, CharacterStorageService storage)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var character = await GetCharacter(eventId, characterId, url!, key!, httpClient, includeDeleted: false);
        if (character is null) return Results.NotFound();
        if (character.status == CharacterStatuses.Locked) return Results.BadRequest("Locked character attachments are read-only.");

        var attachment = await GetAttachment(attachmentId, characterId, url!, key!, httpClient);
        if (attachment is null) return Results.NotFound();
        await storage.DeleteObjectAsync(url!, key!, attachment.file_url);

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/character_attachments?id=eq.{attachmentId}&character_id=eq.{characterId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete attachment: {resp.StatusCode}");
    }

    private static async Task<IResult> CreatePhotoUploadUrl(Guid eventId, Guid characterId, ClaimsPrincipal user, [FromBody] CharacterUploadUrlRequest request, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz, CharacterStorageService storage)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var character = await GetCharacter(eventId, characterId, url!, key!, httpClient, includeDeleted: false);
        if (character is null) return Results.NotFound();
        if (character.status == CharacterStatuses.Locked) return Results.BadRequest("Locked character photo is read-only.");

        try { return Results.Ok(await storage.CreatePhotoUploadUrlAsync(url!, key!, eventId, characterId, request)); }
        catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
    }

    private static async Task<IResult> ConfirmPhoto(Guid eventId, Guid characterId, ClaimsPrincipal user, [FromBody] ConfirmCharacterPhotoRequest request, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var character = await GetCharacter(eventId, characterId, url!, key!, httpClient, includeDeleted: false);
        if (character is null) return Results.NotFound();
        if (character.status == CharacterStatuses.Locked) return Results.BadRequest("Locked character photo is read-only.");

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/characters?id=eq.{characterId}&event_id=eq.{eventId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { photo_url = request.FilePath });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to confirm photo: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseCharacterRow>>())?.FirstOrDefault();
        return updated is null ? Results.Problem("Photo confirmed but payload missing.") : Results.Ok(ToDetail(updated));
    }

    private static async Task<IResult> RemovePhoto(Guid eventId, Guid characterId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz, CharacterStorageService storage)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var character = await GetCharacter(eventId, characterId, url!, key!, httpClient, includeDeleted: false);
        if (character is null) return Results.NotFound();
        if (character.status == CharacterStatuses.Locked) return Results.BadRequest("Locked character photo is read-only.");

        if (!string.IsNullOrWhiteSpace(character.photo_url)) await storage.DeleteObjectAsync(url!, key!, character.photo_url);

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/characters?id=eq.{characterId}&event_id=eq.{eventId}");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { photo_url = (string?)null });
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to remove photo: {resp.StatusCode}");
    }

    private static async Task<IResult> GetNarrativeLinks(Guid eventId, Guid characterId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz, ICharacterNarrativeService narrativeService)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await CharacterExists(eventId, characterId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();

        var factionsTask = narrativeService.GetFactionsAsync(eventId, characterId);
        var relationshipsTask = narrativeService.GetRelationshipsAsync(eventId, characterId);
        var questsTask = narrativeService.GetQuestsAsync(eventId, characterId);
        await Task.WhenAll(factionsTask, relationshipsTask, questsTask);
        return Results.Ok(new CharacterNarrativeLinksDto(factionsTask.Result, relationshipsTask.Result, questsTask.Result));
    }

    private static CharacterDetailDto ToDetail(SupabaseCharacterRow row) =>
        new(row.id, row.event_id, row.name, row.race, row.status, row.biography, row.notes, row.player_user_id, row.photo_url, row.created_at, row.updated_at, row.deleted_at);

    private static CharacterAbilityDto ToAbilityDto(SupabaseCharacterAbilityRow row) =>
        new(row.id, row.character_id, row.category, row.name, row.value, row.description, row.sort_order, row.created_at, row.updated_at);

    private static CharacterAttachmentDto ToAttachmentDto(SupabaseCharacterAttachmentRow row) =>
        new(row.id, row.character_id, row.file_name, row.file_url, row.mime_type, row.category, row.uploaded_by, row.uploaded_at);

    private static async Task<bool> CharacterExists(Guid eventId, Guid characterId, string url, string key, HttpClient httpClient, bool includeDeleted) =>
        await GetCharacter(eventId, characterId, url, key, httpClient, includeDeleted) is not null;

    private static async Task<SupabaseCharacterRow?> GetCharacter(Guid eventId, Guid characterId, string url, string key, HttpClient httpClient, bool includeDeleted)
    {
        var filters = new List<string> { $"id=eq.{characterId}", $"event_id=eq.{eventId}", "select=id,event_id,name,race,status,biography,notes,player_user_id,photo_url,created_at,updated_at,deleted_at", "limit=1" };
        if (!includeDeleted) filters.Add("deleted_at=is.null");
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/characters?{string.Join("&", filters)}");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseCharacterRow>>();
        return rows?.FirstOrDefault();
    }

    private static async Task<bool> CharacterNameExists(Guid eventId, string name, Guid? excludingCharacterId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/characters?event_id=eq.{eventId}&name=ilike.{Uri.EscapeDataString(name)}&deleted_at=is.null&select=id&limit=10");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return false;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseIdRow>>() ?? [];
        return rows.Any(x => !excludingCharacterId.HasValue || x.id != excludingCharacterId.Value);
    }

    private static async Task<List<SupabaseCharacterAbilityRow>> GetAbilities(Guid characterId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/character_abilities?character_id=eq.{characterId}&select=id,character_id,category,name,value,description,sort_order,created_at,updated_at&order=sort_order.asc");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return [];
        return await resp.Content.ReadFromJsonAsync<List<SupabaseCharacterAbilityRow>>() ?? [];
    }

    private static async Task<SupabaseCharacterAbilityRow?> GetAbility(Guid abilityId, Guid characterId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/character_abilities?id=eq.{abilityId}&character_id=eq.{characterId}&select=id,character_id,category,name,value,description,sort_order,created_at,updated_at&limit=1");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseCharacterAbilityRow>>();
        return rows?.FirstOrDefault();
    }

    private static async Task<SupabaseCharacterAttachmentRow?> GetAttachment(Guid attachmentId, Guid characterId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/character_attachments?id=eq.{attachmentId}&character_id=eq.{characterId}&select=id,character_id,file_name,file_url,mime_type,category,uploaded_by,uploaded_at&limit=1");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseCharacterAttachmentRow>>();
        return rows?.FirstOrDefault();
    }

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
