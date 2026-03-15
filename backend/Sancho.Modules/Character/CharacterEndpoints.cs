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
        group.MapPost("/{characterId:guid}/attachments/google-drive", AddGoogleDriveLink);
        group.MapPatch("/{characterId:guid}/attachments/{attachmentId:guid}", UpdateAttachment);
        group.MapDelete("/{characterId:guid}/attachments/{attachmentId:guid}", DeleteAttachment);

        group.MapPost("/{characterId:guid}/photo/upload-url", CreatePhotoUploadUrl);
        group.MapPost("/{characterId:guid}/photo/confirm", ConfirmPhoto);
        group.MapDelete("/{characterId:guid}/photo", RemovePhoto);

        group.MapGet("/{characterId:guid}/narrative-links", GetNarrativeLinks);

        group.MapGet("/{characterId:guid}/relationships", ListCharacterRelationships);
        group.MapPost("/{characterId:guid}/relationships", CreateCharacterRelationship);
        group.MapPatch("/{characterId:guid}/relationships/{relationshipId:guid}", UpdateCharacterRelationship);
        group.MapDelete("/{characterId:guid}/relationships/{relationshipId:guid}", DeleteCharacterRelationship);

        group.MapGet("/{characterId:guid}/items", ListCharacterItems);
        group.MapPut("/{characterId:guid}/items/{itemId:guid}", AssignItemToCharacter);
        group.MapDelete("/{characterId:guid}/items/{itemId:guid}", RemoveItemFromCharacter);
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
        return Results.Ok(rows.Select(r => ToDetail(r, access.CanWrite)));
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
        return created is null ? Results.Problem("Character created but no payload returned.") : Results.Created($"/api/events/{eventId}/characters/{created.id}", ToDetail(created, access.CanWrite));
    }

    private static async Task<IResult> GetCharacterById(Guid eventId, Guid characterId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();

        var row = await GetCharacter(eventId, characterId, url!, key!, httpClient, includeDeleted: true);
        return row is null ? Results.NotFound() : Results.Ok(ToDetail(row, access.CanWrite));
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
        return updated is null ? Results.Problem("Character update payload missing.") : Results.Ok(ToDetail(updated, access.CanWrite));
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
        return updated is null ? Results.Problem("Character status payload missing.") : Results.Ok(ToDetail(updated, access.CanWrite));
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
        if (abilities.Count > 0)
        {
            // Batch-insert all abilities in a single HTTP call instead of one per ability.
            var abilityRows = abilities.Select(a => new
            {
                character_id = created.id,
                category = a.category,
                name = a.name,
                value = a.value,
                description = a.description,
                sort_order = a.sort_order
            }).ToList();
            var batchReq = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/character_abilities");
            batchReq.Headers.Add("Prefer", "return=minimal");
            AddHeaders(batchReq, key!);
            batchReq.Content = JsonContent.Create(abilityRows);
            await httpClient.SendAsync(batchReq);
        }

        return Results.Created($"/api/events/{eventId}/characters/{created.id}", ToDetail(created, access.CanWrite));
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

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/character_attachments?character_id=eq.{characterId}&select=id,character_id,file_name,file_url,mime_type,category,display_name,document_status,source_type,uploaded_by,uploaded_at&order=uploaded_at.desc");
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
        if (!CharacterAttachmentDocumentStatuses.All.Contains(request.DocumentStatus)) return Results.BadRequest("Unknown document status.");

        var displayName = string.IsNullOrWhiteSpace(request.DisplayName) ? request.FileName : request.DisplayName.Trim();

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/character_attachments");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            character_id = characterId,
            file_name = request.FileName,
            file_url = request.FilePath,
            mime_type = request.MimeType,
            category = request.Category,
            display_name = displayName,
            document_status = request.DocumentStatus,
            source_type = CharacterAttachmentSourceTypes.Upload,
            uploaded_by = UserId(user),
            uploaded_at = DateTimeOffset.UtcNow
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to confirm attachment: {resp.StatusCode}");
        var created = (await resp.Content.ReadFromJsonAsync<List<SupabaseCharacterAttachmentRow>>())?.FirstOrDefault();
        return created is null ? Results.Problem("Attachment saved but payload missing.") : Results.Created($"/api/events/{eventId}/characters/{characterId}/attachments/{created.id}", ToAttachmentDto(created));
    }

    private static async Task<IResult> AddGoogleDriveLink(Guid eventId, Guid characterId, ClaimsPrincipal user, [FromBody] AddGoogleDriveLinkRequest request, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz, CharacterStorageService storage)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var character = await GetCharacter(eventId, characterId, url!, key!, httpClient, includeDeleted: false);
        if (character is null) return Results.NotFound();
        if (character.status == CharacterStatuses.Locked) return Results.BadRequest("Locked character attachments are read-only.");
        if (!CharacterAttachmentDocumentStatuses.All.Contains(request.DocumentStatus)) return Results.BadRequest("Unknown document status.");
        if (string.IsNullOrWhiteSpace(request.DisplayName)) return Results.BadRequest("Display name is required.");

        try { storage.ValidateGoogleDriveUrl(request.Url); }
        catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/character_attachments");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            character_id = characterId,
            file_name = request.DisplayName.Trim(),
            file_url = request.Url,
            mime_type = "text/uri-list",
            category = CharacterAttachmentCategories.Document,
            display_name = request.DisplayName.Trim(),
            document_status = request.DocumentStatus,
            source_type = CharacterAttachmentSourceTypes.GoogleDrive,
            uploaded_by = UserId(user),
            uploaded_at = DateTimeOffset.UtcNow
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to add Google Drive link: {resp.StatusCode}");
        var created = (await resp.Content.ReadFromJsonAsync<List<SupabaseCharacterAttachmentRow>>())?.FirstOrDefault();
        return created is null ? Results.Problem("Link saved but payload missing.") : Results.Created($"/api/events/{eventId}/characters/{characterId}/attachments/{created.id}", ToAttachmentDto(created));
    }

    private static async Task<IResult> UpdateAttachment(Guid eventId, Guid characterId, Guid attachmentId, ClaimsPrincipal user, [FromBody] UpdateCharacterAttachmentRequest request, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz, CharacterStorageService storage)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var character = await GetCharacter(eventId, characterId, url!, key!, httpClient, includeDeleted: false);
        if (character is null) return Results.NotFound();

        // File/URL changes are blocked on locked characters; metadata updates are always allowed.
        if (character.status == CharacterStatuses.Locked && (!string.IsNullOrEmpty(request.NewFilePath) || !string.IsNullOrEmpty(request.NewGoogleDriveUrl)))
            return Results.BadRequest("File and URL updates are not allowed while the character is Locked.");

        var attachment = await GetAttachment(attachmentId, characterId, url!, key!, httpClient);
        if (attachment is null) return Results.NotFound();

        if (!string.IsNullOrEmpty(request.DocumentStatus) && !CharacterAttachmentDocumentStatuses.All.Contains(request.DocumentStatus))
            return Results.BadRequest("Unknown document status.");

        if (!string.IsNullOrEmpty(request.NewGoogleDriveUrl))
        {
            try { storage.ValidateGoogleDriveUrl(request.NewGoogleDriveUrl); }
            catch (InvalidOperationException ex) { return Results.BadRequest(ex.Message); }
        }

        // If a new file is being set, delete the previous storage object.
        if (!string.IsNullOrEmpty(request.NewFilePath) && !string.IsNullOrEmpty(request.OldFilePath))
        {
            await storage.DeleteObjectAsync(url!, key!, request.OldFilePath);
        }

        var patchBody = new Dictionary<string, object?>();
        if (!string.IsNullOrWhiteSpace(request.DisplayName)) patchBody["display_name"] = request.DisplayName.Trim();
        if (!string.IsNullOrEmpty(request.DocumentStatus)) patchBody["document_status"] = request.DocumentStatus;
        if (!string.IsNullOrEmpty(request.NewFilePath))
        {
            patchBody["file_url"] = request.NewFilePath;
            // file_name stays as the display_name; update it if display_name is also provided
        }
        if (!string.IsNullOrEmpty(request.NewGoogleDriveUrl)) patchBody["file_url"] = request.NewGoogleDriveUrl;

        if (patchBody.Count == 0) return Results.BadRequest("No fields to update.");

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/character_attachments?id=eq.{attachmentId}&character_id=eq.{characterId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(patchBody);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to update attachment: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseCharacterAttachmentRow>>())?.FirstOrDefault();
        return updated is null ? Results.Problem("Attachment updated but payload missing.") : Results.Ok(ToAttachmentDto(updated));
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
        return updated is null ? Results.Problem("Photo confirmed but payload missing.") : Results.Ok(ToDetail(updated, access.CanWrite));
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
        var itemsTask = GetAssignedItemsAsync(eventId, characterId, url!, key!, httpClient);
        await Task.WhenAll(factionsTask, relationshipsTask, questsTask, itemsTask);
        return Results.Ok(new CharacterNarrativeLinksDto(factionsTask.Result, relationshipsTask.Result, questsTask.Result, itemsTask.Result));
    }

    private static CharacterDetailDto ToDetail(SupabaseCharacterRow row, bool canReadInternal) =>
        new(row.id, row.event_id, row.name, row.race, row.status, row.biography, canReadInternal ? row.notes : null, row.player_user_id, row.photo_url, row.created_at, row.updated_at, row.deleted_at);

    private static CharacterAbilityDto ToAbilityDto(SupabaseCharacterAbilityRow row) =>
        new(row.id, row.character_id, row.category, row.name, row.value, row.description, row.sort_order, row.created_at, row.updated_at);

    private static CharacterAttachmentDto ToAttachmentDto(SupabaseCharacterAttachmentRow row) =>
        new(row.id, row.character_id,
            row.display_name ?? row.file_name,
            row.file_name, row.file_url, row.mime_type, row.category,
            row.document_status, row.source_type,
            row.uploaded_by, row.uploaded_at);

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
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/character_attachments?id=eq.{attachmentId}&character_id=eq.{characterId}&select=id,character_id,file_name,file_url,mime_type,category,display_name,document_status,source_type,uploaded_by,uploaded_at&limit=1");
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

    // ─── Character Relationships ────────────────────────────────────────

    private static async Task<IResult> ListCharacterRelationships(Guid eventId, Guid characterId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await CharacterExists(eventId, characterId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();

        var query = $"{url}/rest/v1/character_relationships" +
                    $"?event_id=eq.{eventId}" +
                    $"&or=(source_character_id.eq.{characterId},target_character_id.eq.{characterId})" +
                    "&select=id,event_id,source_character_id,target_character_id,relation_type,relation_mode,mirror_group_id,is_auto_mirror,is_active,description,created_at,updated_at" +
                    "&order=created_at.desc";
        var req = new HttpRequestMessage(HttpMethod.Get, query);
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list character relationships: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseCharacterRelationshipRow>>() ?? [];

        // Resolve target character names
        var characterIds = rows.SelectMany(r => new[] { r.source_character_id, r.target_character_id }).Distinct().ToList();
        var nameMap = await GetCharacterNames(characterIds, url!, key!, httpClient);

        var dtos = rows.Select(r =>
        {
            var targetId = r.source_character_id == characterId ? r.target_character_id : r.source_character_id;
            var targetName = nameMap.GetValueOrDefault(targetId, "Unknown");
            return new CharacterRelationshipDto(r.id, r.event_id, r.source_character_id, r.target_character_id, targetName, r.relation_type, r.relation_mode, r.mirror_group_id, r.is_auto_mirror, r.description, r.created_at, r.updated_at);
        });
        return Results.Ok(dtos);
    }

    private static async Task<IResult> CreateCharacterRelationship(Guid eventId, Guid characterId, ClaimsPrincipal user, [FromBody] CreateCharacterRelationshipRequest request, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await CharacterExists(eventId, characterId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();

        if (string.IsNullOrWhiteSpace(request.RelationType)) return Results.BadRequest("Relation type is required.");
        if (request.RelationType.Length > 100) return Results.BadRequest("Relation type cannot be longer than 100 characters.");
        if (!IsValidRelationshipMode(request.RelationMode)) return Results.BadRequest("Relation mode must be 'directional' or 'auto_mirrored'.");
        if (request.TargetCharacterId == characterId) return Results.BadRequest("Character cannot reference itself.");
        if (!await CharacterExists(eventId, request.TargetCharacterId, url!, key!, httpClient, includeDeleted: false))
            return Results.BadRequest("Target character not found in event.");

        var mirrorGroupId = IsAutoMirrored(request.RelationMode) ? Guid.NewGuid() : (Guid?)null;

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/character_relationships");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            event_id = eventId,
            source_character_id = characterId,
            target_character_id = request.TargetCharacterId,
            relation_type = request.RelationType.Trim(),
            relation_mode = request.RelationMode,
            mirror_group_id = mirrorGroupId,
            is_auto_mirror = false,
            description = request.Description
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to create character relationship: {resp.StatusCode}");
        var created = (await resp.Content.ReadFromJsonAsync<List<SupabaseCharacterRelationshipRow>>())?.FirstOrDefault();
        if (created is null) return Results.Problem("Relationship created but payload missing.");

        if (IsAutoMirrored(request.RelationMode))
        {
            var mirrorReq = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/character_relationships");
            mirrorReq.Headers.Add("Prefer", "return=minimal");
            AddHeaders(mirrorReq, key!);
            mirrorReq.Content = JsonContent.Create(new
            {
                event_id = eventId,
                source_character_id = request.TargetCharacterId,
                target_character_id = characterId,
                relation_type = request.RelationType.Trim(),
                relation_mode = request.RelationMode,
                mirror_group_id = mirrorGroupId,
                is_auto_mirror = true,
                description = request.Description
            });
            await httpClient.SendAsync(mirrorReq);
        }

        var nameMap = await GetCharacterNames([characterId, request.TargetCharacterId], url!, key!, httpClient);
        var targetName = nameMap.GetValueOrDefault(request.TargetCharacterId, "Unknown");
        return Results.Created(
            $"/api/events/{eventId}/characters/{characterId}/relationships/{created.id}",
            new CharacterRelationshipDto(created.id, created.event_id, created.source_character_id, created.target_character_id, targetName, created.relation_type, created.relation_mode, created.mirror_group_id, created.is_auto_mirror, created.description, created.created_at, created.updated_at));
    }

    private static async Task<IResult> UpdateCharacterRelationship(Guid eventId, Guid characterId, Guid relationshipId, ClaimsPrincipal user, [FromBody] UpdateCharacterRelationshipRequest request, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var current = await GetCharacterRelationship(eventId, characterId, relationshipId, url!, key!, httpClient);
        if (current is null) return Results.NotFound();

        var nextType = request.RelationType?.Trim() ?? current.relation_type;
        if (nextType.Length > 100) return Results.BadRequest("Relation type cannot be longer than 100 characters.");
        var nextDescription = request.Description ?? current.description;

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/character_relationships?id=eq.{relationshipId}&event_id=eq.{eventId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            relation_type = nextType,
            description = nextDescription
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to update character relationship: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseCharacterRelationshipRow>>())?.FirstOrDefault();
        if (updated is null) return Results.Problem("Relationship update payload missing.");

        if (updated.mirror_group_id.HasValue && !updated.is_auto_mirror)
        {
            var mirrorPatch = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/character_relationships?mirror_group_id=eq.{updated.mirror_group_id.Value}&is_auto_mirror=eq.true&event_id=eq.{eventId}");
            AddHeaders(mirrorPatch, key!);
            mirrorPatch.Content = JsonContent.Create(new
            {
                relation_type = nextType,
                description = nextDescription
            });
            await httpClient.SendAsync(mirrorPatch);
        }

        var nameMap = await GetCharacterNames([updated.source_character_id, updated.target_character_id], url!, key!, httpClient);
        var targetId = updated.source_character_id == characterId ? updated.target_character_id : updated.source_character_id;
        return Results.Ok(new CharacterRelationshipDto(updated.id, updated.event_id, updated.source_character_id, updated.target_character_id, nameMap.GetValueOrDefault(targetId, "Unknown"), updated.relation_type, updated.relation_mode, updated.mirror_group_id, updated.is_auto_mirror, updated.description, updated.created_at, updated.updated_at));
    }

    private static async Task<IResult> DeleteCharacterRelationship(Guid eventId, Guid characterId, Guid relationshipId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var current = await GetCharacterRelationship(eventId, characterId, relationshipId, url!, key!, httpClient);
        if (current is null) return Results.NotFound();

        HttpRequestMessage req;
        if (current.mirror_group_id.HasValue)
        {
            req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/character_relationships?event_id=eq.{eventId}&mirror_group_id=eq.{current.mirror_group_id.Value}");
        }
        else
        {
            req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/character_relationships?id=eq.{relationshipId}&event_id=eq.{eventId}");
        }

        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete character relationship: {resp.StatusCode}");
    }

    private static async Task<SupabaseCharacterRelationshipRow?> GetCharacterRelationship(Guid eventId, Guid characterId, Guid relationshipId, string url, string key, HttpClient httpClient)
    {
        var query = $"{url}/rest/v1/character_relationships" +
                    $"?id=eq.{relationshipId}" +
                    $"&event_id=eq.{eventId}" +
                    $"&or=(source_character_id.eq.{characterId},target_character_id.eq.{characterId})" +
                    "&select=id,event_id,source_character_id,target_character_id,relation_type,relation_mode,mirror_group_id,is_auto_mirror,is_active,description,created_at,updated_at" +
                    "&limit=1";
        var req = new HttpRequestMessage(HttpMethod.Get, query);
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseCharacterRelationshipRow>>();
        return rows?.FirstOrDefault();
    }

    private static async Task<Dictionary<Guid, string>> GetCharacterNames(List<Guid> characterIds, string url, string key, HttpClient httpClient)
    {
        if (characterIds.Count == 0) return new Dictionary<Guid, string>();
        var idFilter = string.Join(",", characterIds.Select(id => $"\"{id}\""));
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/characters?id=in.({idFilter})&select=id,name");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return new Dictionary<Guid, string>();
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseCharacterNameRow>>() ?? [];
        return rows.ToDictionary(r => r.id, r => r.name);
    }

    private static bool IsValidRelationshipMode(string mode) =>
        string.Equals(mode, "directional", StringComparison.OrdinalIgnoreCase) ||
        string.Equals(mode, "auto_mirrored", StringComparison.OrdinalIgnoreCase);

    private static bool IsAutoMirrored(string mode) =>
        string.Equals(mode, "auto_mirrored", StringComparison.OrdinalIgnoreCase);

    // ─── Item Assignments ───────────────────────────────────────────────

    private static async Task<IResult> ListCharacterItems(Guid eventId, Guid characterId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await CharacterExists(eventId, characterId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();

        var items = await GetAssignedItemsAsync(eventId, characterId, url!, key!, httpClient);
        return Results.Ok(items);
    }

    private static async Task<IResult> AssignItemToCharacter(Guid eventId, Guid characterId, Guid itemId, ClaimsPrincipal user, [FromBody] AssignItemToCharacterRequest request, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await CharacterExists(eventId, characterId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_item_character_assignments?on_conflict=item_id,character_id");
        req.Headers.Add("Prefer", "return=representation,resolution=merge-duplicates");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            event_id = eventId,
            item_id = itemId,
            character_id = characterId,
            assigned_by = UserId(user),
            notes = request.Notes
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to assign item: {resp.StatusCode}");
        return Results.Ok();
    }

    private static async Task<IResult> RemoveItemFromCharacter(Guid eventId, Guid characterId, Guid itemId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, CharacterAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_item_character_assignments?event_id=eq.{eventId}&item_id=eq.{itemId}&character_id=eq.{characterId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to remove item assignment: {resp.StatusCode}");
    }

    private static async Task<IReadOnlyList<CharacterAssignedItemDto>> GetAssignedItemsAsync(Guid eventId, Guid characterId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get,
            $"{url}/rest/v1/narrative_item_character_assignments" +
            $"?event_id=eq.{eventId}&character_id=eq.{characterId}" +
            "&select=item_id,character_id,assigned_at,notes,item:narrative_items(id,name,description,status)" +
            "&order=assigned_at.desc");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return [];
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseItemAssignmentJoinRow>>() ?? [];
        return rows
            .Where(r => r.item is not null)
            .Select(r => new CharacterAssignedItemDto(r.item_id, r.item!.name, r.item.description, r.item.status, r.notes, r.assigned_at))
            .ToList();
    }
}
