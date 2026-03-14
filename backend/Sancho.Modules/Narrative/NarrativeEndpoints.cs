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

public static class NarrativeEndpoints
{
    private const int QuestShortDescriptionMaxLength = 250;

    public static void MapNarrativeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/events/{eventId:guid}/narrative").RequireAuthorization();

        group.MapGet("/quests", ListQuests);
        group.MapPost("/quests", CreateQuest);
        group.MapGet("/quests/{questId:guid}", GetQuestById);
        group.MapPatch("/quests/{questId:guid}", UpdateQuest);
        group.MapPost("/quests/{questId:guid}/status", ChangeQuestStatus);
        group.MapPost("/quests/{questId:guid}/duplicate", DuplicateQuest);
        group.MapDelete("/quests/{questId:guid}", SoftDeleteQuest);
        group.MapPost("/quests/{questId:guid}/undelete", UndeleteQuest);

        group.MapGet("/quests/{questId:guid}/steps", ListQuestSteps);
        group.MapPost("/quests/{questId:guid}/steps", CreateQuestStep);
        group.MapPatch("/quests/{questId:guid}/steps/{stepId:guid}", UpdateQuestStep);
        group.MapDelete("/quests/{questId:guid}/steps/{stepId:guid}", DeleteQuestStep);
        group.MapGet("/quests/{questId:guid}/steps/{stepId:guid}/items", ListQuestStepItems);
        group.MapPut("/quests/{questId:guid}/steps/{stepId:guid}/items/{itemId:guid}", UpsertQuestStepItem);
        group.MapDelete("/quests/{questId:guid}/steps/{stepId:guid}/items/{itemId:guid}", DeleteQuestStepItem);
        group.MapGet("/quests/{questId:guid}/steps/{stepId:guid}/characters", ListQuestStepCharacters);
        group.MapPut("/quests/{questId:guid}/steps/{stepId:guid}/characters/{characterId:guid}", UpsertQuestStepCharacter);
        group.MapDelete("/quests/{questId:guid}/steps/{stepId:guid}/characters/{characterId:guid}", DeleteQuestStepCharacter);

        group.MapGet("/quests/{questId:guid}/links/characters", ListQuestCharacters);
        group.MapPut("/quests/{questId:guid}/links/characters/{characterId:guid}", UpsertQuestCharacter);
        group.MapDelete("/quests/{questId:guid}/links/characters/{characterId:guid}", DeleteQuestCharacter);
        group.MapGet("/quests/{questId:guid}/links/factions", ListQuestFactions);
        group.MapPut("/quests/{questId:guid}/links/factions/{factionId:guid}", UpsertQuestFaction);
        group.MapDelete("/quests/{questId:guid}/links/factions/{factionId:guid}", DeleteQuestFaction);
        group.MapGet("/quests/{questId:guid}/links/items", ListQuestItems);
        group.MapPut("/quests/{questId:guid}/links/items/{itemId:guid}", UpsertQuestItem);
        group.MapDelete("/quests/{questId:guid}/links/items/{itemId:guid}", DeleteQuestItem);

        group.MapGet("/quests/{questId:guid}/documents", ListQuestDocuments);
        group.MapPost("/quests/{questId:guid}/documents/google-drive", AddQuestGoogleDriveDocument);
        group.MapDelete("/quests/{questId:guid}/documents/{documentId:guid}", DeleteQuestDocument);

        group.MapGet("/factions", ListFactions);
        group.MapPost("/factions", CreateFaction);
        group.MapGet("/factions/{factionId:guid}", GetFactionById);
        group.MapPatch("/factions/{factionId:guid}", UpdateFaction);
        group.MapPost("/factions/{factionId:guid}/status", ChangeFactionStatus);
        group.MapDelete("/factions/{factionId:guid}", SoftDeleteFaction);
        group.MapPost("/factions/{factionId:guid}/undelete", UndeleteFaction);
        group.MapGet("/factions/{factionId:guid}/members", ListFactionMembers);
        group.MapPut("/factions/{factionId:guid}/members/{characterId:guid}", UpsertFactionMember);
        group.MapDelete("/factions/{factionId:guid}/members/{characterId:guid}", DeleteFactionMember);
        group.MapGet("/factions/{factionId:guid}/relationships", ListFactionRelationships);
        group.MapPost("/factions/{factionId:guid}/relationships", CreateFactionRelationship);
        group.MapPatch("/factions/{factionId:guid}/relationships/{relationshipId:guid}", UpdateFactionRelationship);
        group.MapDelete("/factions/{factionId:guid}/relationships/{relationshipId:guid}", DeleteFactionRelationship);
        group.MapGet("/factions/{factionId:guid}/documents", ListFactionDocuments);
        group.MapPost("/factions/{factionId:guid}/documents/google-drive", AddFactionGoogleDriveDocument);
        group.MapDelete("/factions/{factionId:guid}/documents/{documentId:guid}", DeleteFactionDocument);

        group.MapGet("/items", ListItems);
        group.MapPost("/items", CreateItem);
        group.MapGet("/items/{itemId:guid}", GetItemById);
        group.MapPatch("/items/{itemId:guid}", UpdateItem);
        group.MapPost("/items/{itemId:guid}/status", ChangeItemStatus);
        group.MapDelete("/items/{itemId:guid}", SoftDeleteItem);
        group.MapPost("/items/{itemId:guid}/undelete", UndeleteItem);
        group.MapGet("/items/{itemId:guid}/assignments", ListItemAssignments);
        group.MapPut("/items/{itemId:guid}/assignments/{characterId:guid}", AssignItemToCharacter);
        group.MapDelete("/items/{itemId:guid}/assignments/{characterId:guid}", RemoveItemAssignment);
        group.MapGet("/items/{itemId:guid}/documents", ListItemDocuments);
        group.MapPost("/items/{itemId:guid}/documents/google-drive", AddItemGoogleDriveDocument);
        group.MapDelete("/items/{itemId:guid}/documents/{documentId:guid}", DeleteItemDocument);

        group.MapGet("/plotlines", ListPlotlines);
        group.MapPost("/plotlines", CreatePlotline);
        group.MapGet("/plotlines/{plotlineId:guid}", GetPlotlineById);
        group.MapPatch("/plotlines/{plotlineId:guid}", UpdatePlotline);
        group.MapPost("/plotlines/{plotlineId:guid}/status", ChangePlotlineStatus);
        group.MapDelete("/plotlines/{plotlineId:guid}", SoftDeletePlotline);
        group.MapPost("/plotlines/{plotlineId:guid}/undelete", UndeletePlotline);
        group.MapGet("/plotlines/{plotlineId:guid}/phases", ListPlotlinePhases);
        group.MapPost("/plotlines/{plotlineId:guid}/phases", CreatePlotlinePhase);
        group.MapPatch("/plotlines/{plotlineId:guid}/phases/{phaseId:guid}", UpdatePlotlinePhase);
        group.MapDelete("/plotlines/{plotlineId:guid}/phases/{phaseId:guid}", DeletePlotlinePhase);
        group.MapGet("/plotlines/{plotlineId:guid}/quests", ListPlotlineQuests);
        group.MapPut("/plotlines/{plotlineId:guid}/quests/{questId:guid}", UpsertPlotlineQuest);
        group.MapDelete("/plotlines/{plotlineId:guid}/quests/{questId:guid}", DeletePlotlineQuest);
        group.MapGet("/plotlines/{plotlineId:guid}/links/characters", ListPlotlineCharacters);
        group.MapPut("/plotlines/{plotlineId:guid}/links/characters/{characterId:guid}", UpsertPlotlineCharacter);
        group.MapDelete("/plotlines/{plotlineId:guid}/links/characters/{characterId:guid}", DeletePlotlineCharacter);
        group.MapGet("/plotlines/{plotlineId:guid}/links/factions", ListPlotlineFactions);
        group.MapPut("/plotlines/{plotlineId:guid}/links/factions/{factionId:guid}", UpsertPlotlineFaction);
        group.MapDelete("/plotlines/{plotlineId:guid}/links/factions/{factionId:guid}", DeletePlotlineFaction);
        group.MapGet("/plotlines/{plotlineId:guid}/links/items", ListPlotlineItems);
        group.MapPut("/plotlines/{plotlineId:guid}/links/items/{itemId:guid}", UpsertPlotlineItem);
        group.MapDelete("/plotlines/{plotlineId:guid}/links/items/{itemId:guid}", DeletePlotlineItem);
        group.MapGet("/plotlines/{plotlineId:guid}/links/inherited", GetPlotlineInheritedLinks);
        group.MapGet("/plotlines/{plotlineId:guid}/documents", ListPlotlineDocuments);
        group.MapPost("/plotlines/{plotlineId:guid}/documents/google-drive", AddPlotlineGoogleDriveDocument);
        group.MapDelete("/plotlines/{plotlineId:guid}/documents/{documentId:guid}", DeletePlotlineDocument);

        group.MapGet("/plots", ListPlots);
        group.MapPost("/plots", CreatePlot);
        group.MapGet("/plots/{plotId:guid}", GetPlotById);
        group.MapPatch("/plots/{plotId:guid}", UpdatePlot);
        group.MapPost("/plots/{plotId:guid}/status", ChangePlotStatus);
        group.MapDelete("/plots/{plotId:guid}", SoftDeletePlot);
        group.MapPost("/plots/{plotId:guid}/undelete", UndeletePlot);
        group.MapGet("/plots/{plotId:guid}/plotlines", ListPlotPlotlines);
        group.MapPut("/plots/{plotId:guid}/plotlines/{plotlineId:guid}", UpsertPlotPlotline);
        group.MapDelete("/plots/{plotId:guid}/plotlines/{plotlineId:guid}", DeletePlotPlotline);
        group.MapGet("/plots/{plotId:guid}/links/characters", ListPlotCharacters);
        group.MapPut("/plots/{plotId:guid}/links/characters/{characterId:guid}", UpsertPlotCharacter);
        group.MapDelete("/plots/{plotId:guid}/links/characters/{characterId:guid}", DeletePlotCharacter);
        group.MapGet("/plots/{plotId:guid}/links/factions", ListPlotFactions);
        group.MapPut("/plots/{plotId:guid}/links/factions/{factionId:guid}", UpsertPlotFaction);
        group.MapDelete("/plots/{plotId:guid}/links/factions/{factionId:guid}", DeletePlotFaction);
        group.MapGet("/plots/{plotId:guid}/links/items", ListPlotItems);
        group.MapPut("/plots/{plotId:guid}/links/items/{itemId:guid}", UpsertPlotItem);
        group.MapDelete("/plots/{plotId:guid}/links/items/{itemId:guid}", DeletePlotItem);
        group.MapGet("/plots/{plotId:guid}/links/inherited", GetPlotInheritedLinks);
    }

    private static async Task<IResult> ListQuests(Guid eventId, ClaimsPrincipal user, [FromQuery] bool includeDeleted, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();

        var filters = new List<string>
        {
            "select=id,event_id,title,short_description,description,internal_notes,status,created_at,updated_at,deleted_at",
            $"event_id=eq.{eventId}",
            "order=created_at.desc"
        };
        if (!includeDeleted) filters.Add("deleted_at=is.null");

        var request = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quests?{string.Join("&", filters)}");
        AddHeaders(request, key!);
        var response = await httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return Results.Problem($"Failed to list quests: {response.StatusCode}");
        var rows = await response.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestRow>>() ?? [];
        return Results.Ok(rows.Select(r => ToQuestDto(r, access.CanWrite)));
    }

    private static async Task<IResult> CreateQuest(Guid eventId, ClaimsPrincipal user, [FromBody] CreateQuestRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (string.IsNullOrWhiteSpace(request.Title)) return Results.BadRequest("Title is required.");
        var shortDescription = NormalizeQuestShortDescription(request.ShortDescription);
        if (shortDescription?.Length > QuestShortDescriptionMaxLength) return Results.BadRequest($"Short description cannot be longer than {QuestShortDescriptionMaxLength} characters.");

        if (await QuestTitleExists(eventId, request.Title.Trim(), null, url!, key!, httpClient))
        {
            return Results.BadRequest("Quest title must be unique within event.");
        }

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_quests");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            event_id = eventId,
            title = request.Title.Trim(),
            short_description = shortDescription,
            description = request.Description,
            internal_notes = request.InternalNotes,
            status = NarrativeStatuses.Draft
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to create quest: {resp.StatusCode}");
        var created = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestRow>>())?.FirstOrDefault();
        return created is null ? Results.Problem("Quest created but no payload returned.") : Results.Created($"/api/events/{eventId}/narrative/quests/{created.id}", ToQuestDto(created, access.CanWrite));
    }

    private static async Task<IResult> GetQuestById(Guid eventId, Guid questId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();

        var row = await GetQuest(eventId, questId, url!, key!, httpClient, includeDeleted: true);
        return row is null ? Results.NotFound() : Results.Ok(ToQuestDto(row, access.CanWrite));
    }

    private static async Task<IResult> UpdateQuest(Guid eventId, Guid questId, ClaimsPrincipal user, [FromBody] UpdateQuestRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var row = await GetQuest(eventId, questId, url!, key!, httpClient, includeDeleted: true);
        if (row is null) return Results.NotFound();
        if (row.deleted_at.HasValue) return Results.BadRequest("Deleted quest cannot be edited.");
        if (row.status == NarrativeStatuses.Locked && (request.Title is not null || request.ShortDescription is not null || request.Description is not null))
            return Results.BadRequest("Locked quest allows editing internal notes only.");

        var nextShortDescription = request.ShortDescription is null
            ? row.short_description
            : NormalizeQuestShortDescription(request.ShortDescription);
        if (nextShortDescription?.Length > QuestShortDescriptionMaxLength) return Results.BadRequest($"Short description cannot be longer than {QuestShortDescriptionMaxLength} characters.");

        var nextTitle = request.Title?.Trim() ?? row.title;
        if (!string.Equals(nextTitle, row.title, StringComparison.OrdinalIgnoreCase) &&
            await QuestTitleExists(eventId, nextTitle, questId, url!, key!, httpClient))
        {
            return Results.BadRequest("Quest title must be unique within event.");
        }

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_quests?id=eq.{questId}&event_id=eq.{eventId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            title = nextTitle,
            short_description = nextShortDescription,
            description = request.Description ?? row.description,
            internal_notes = request.InternalNotes ?? row.internal_notes
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to update quest: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestRow>>())?.FirstOrDefault();
        return updated is null ? Results.Problem("Quest update payload missing.") : Results.Ok(ToQuestDto(updated, access.CanWrite));
    }

    private static async Task<IResult> ChangeQuestStatus(Guid eventId, Guid questId, ClaimsPrincipal user, [FromBody] ChangeNarrativeStatusRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!NarrativeStatuses.All.Contains(request.Status)) return Results.BadRequest("Unknown status.");

        var row = await GetQuest(eventId, questId, url!, key!, httpClient, includeDeleted: true);
        if (row is null) return Results.NotFound();
        if (!NarrativeLifecycleService.CanTransition(row.status, request.Status))
            return Results.BadRequest($"Invalid status transition: {row.status} -> {request.Status}.");
        if (row.status == NarrativeStatuses.Locked && request.Status == NarrativeStatuses.Ready && !request.ConfirmUnlock)
            return Results.BadRequest("Unlock requires explicit confirmation.");

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_quests?id=eq.{questId}&event_id=eq.{eventId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { status = request.Status });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to change quest status: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestRow>>())?.FirstOrDefault();
        return updated is null ? Results.Problem("Quest status payload missing.") : Results.Ok(ToQuestDto(updated, access.CanWrite));
    }

    private static async Task<IResult> SoftDeleteQuest(Guid eventId, Guid questId, ClaimsPrincipal user, [FromBody] NarrativeDeleteRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var row = await GetQuest(eventId, questId, url!, key!, httpClient, includeDeleted: true);
        if (row is null) return Results.NotFound();
        if (row.deleted_at.HasValue) return Results.NoContent();

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_quests?id=eq.{questId}&event_id=eq.{eventId}");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { deleted_at = DateTimeOffset.UtcNow, deleted_by = UserId(user), deletion_reason = request.Reason });
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete quest: {resp.StatusCode}");
    }

    private static async Task<IResult> DuplicateQuest(Guid eventId, Guid questId, ClaimsPrincipal user, [FromBody] DuplicateQuestRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var source = await GetQuest(eventId, questId, url!, key!, httpClient, includeDeleted: false);
        if (source is null) return Results.NotFound();

        var clonedTitle = string.IsNullOrWhiteSpace(request.Title) ? $"{source.title} (Copy)" : request.Title.Trim();
        if (await QuestTitleExists(eventId, clonedTitle, null, url!, key!, httpClient)) return Results.BadRequest("Duplicate title already exists in event.");

        var createReq = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_quests");
        createReq.Headers.Add("Prefer", "return=representation");
        AddHeaders(createReq, key!);
        createReq.Content = JsonContent.Create(new
        {
            event_id = eventId,
            title = clonedTitle,
            short_description = source.short_description,
            description = source.description,
            internal_notes = source.internal_notes,
            status = NarrativeStatuses.Draft
        });
        var createResp = await httpClient.SendAsync(createReq);
        if (!createResp.IsSuccessStatusCode) return Results.Problem($"Failed to duplicate quest: {createResp.StatusCode}");
        var created = (await createResp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestRow>>())?.FirstOrDefault();
        if (created is null) return Results.Problem("Duplicated quest payload missing.");

        // Fetch quest steps
        var stepsReq = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quest_steps?quest_id=eq.{questId}&event_id=eq.{eventId}&select=id,sort_order,summary,notes&order=sort_order.asc");
        AddHeaders(stepsReq, key!);
        var stepsResp = await httpClient.SendAsync(stepsReq);
        var sourceSteps = stepsResp.IsSuccessStatusCode ? await stepsResp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestStepRow>>() ?? [] : [];

        var stepIdMapping = new Dictionary<Guid, Guid>();
        if (sourceSteps.Count > 0)
        {
            var stepRowsToInsert = sourceSteps.Select(s => new
            {
                id = Guid.NewGuid(),
                quest_id = created.id,
                event_id = eventId,
                sort_order = s.sort_order,
                summary = s.summary,
                notes = s.notes
            }).ToList();
            
            for (int i = 0; i < sourceSteps.Count; i++)
                stepIdMapping[sourceSteps[i].id] = stepRowsToInsert[i].id;
                
            var batchStepsReq = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_quest_steps");
            batchStepsReq.Headers.Add("Prefer", "return=minimal");
            AddHeaders(batchStepsReq, key!);
            batchStepsReq.Content = JsonContent.Create(stepRowsToInsert);
            await httpClient.SendAsync(batchStepsReq);
        }

        // Fetch quest character links
        var charsReq = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quest_characters?event_id=eq.{eventId}&quest_id=eq.{questId}&select=character_id,role");
        AddHeaders(charsReq, key!);
        var charsResp = await httpClient.SendAsync(charsReq);
        var sourceChars = charsResp.IsSuccessStatusCode ? await charsResp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestCharacterRow>>() ?? [] : [];

        if (sourceChars.Count > 0)
        {
            var charRows = sourceChars.Select(c => new { event_id = eventId, quest_id = created.id, character_id = c.character_id, role = c.role }).ToList();
            var batchReq = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_quest_characters");
            batchReq.Headers.Add("Prefer", "return=minimal");
            AddHeaders(batchReq, key!);
            batchReq.Content = JsonContent.Create(charRows);
            await httpClient.SendAsync(batchReq);
        }

        // Fetch quest item links
        var itemsReq = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quest_items?event_id=eq.{eventId}&quest_id=eq.{questId}&select=item_id");
        AddHeaders(itemsReq, key!);
        var itemsResp = await httpClient.SendAsync(itemsReq);
        var sourceItems = itemsResp.IsSuccessStatusCode ? await itemsResp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestItemRow>>() ?? [] : [];

        if (sourceItems.Count > 0)
        {
            var itemRows = sourceItems.Select(i => new { event_id = eventId, quest_id = created.id, item_id = i.item_id }).ToList();
            var batchReq = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_quest_items");
            batchReq.Headers.Add("Prefer", "return=minimal");
            AddHeaders(batchReq, key!);
            batchReq.Content = JsonContent.Create(itemRows);
            await httpClient.SendAsync(batchReq);
        }
        
        // Fetch step items and characters if any step exists
        if (stepIdMapping.Count > 0)
        {
            var stepIdsFilter = string.Join(",", stepIdMapping.Keys);
            
            // Step Items
            var stepItemsReq = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quest_step_items?event_id=eq.{eventId}&step_id=in.({stepIdsFilter})&select=step_id,item_id,link_type");
            AddHeaders(stepItemsReq, key!);
            var stepItemsResp = await httpClient.SendAsync(stepItemsReq);
            var sourceStepItems = stepItemsResp.IsSuccessStatusCode ? await stepItemsResp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestStepItemRow>>() ?? [] : [];
            
            if (sourceStepItems.Count > 0)
            {
                var stepItemRows = sourceStepItems.Select(si => new { event_id = eventId, step_id = stepIdMapping[si.step_id], item_id = si.item_id, link_type = si.link_type }).ToList();
                var batchReq = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_quest_step_items");
                batchReq.Headers.Add("Prefer", "return=minimal");
                AddHeaders(batchReq, key!);
                batchReq.Content = JsonContent.Create(stepItemRows);
                await httpClient.SendAsync(batchReq);
            }
            
            // Step Characters
            var stepCharsReq = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quest_step_characters?event_id=eq.{eventId}&step_id=in.({stepIdsFilter})&select=step_id,character_id");
            AddHeaders(stepCharsReq, key!);
            var stepCharsResp = await httpClient.SendAsync(stepCharsReq);
            var sourceStepChars = stepCharsResp.IsSuccessStatusCode ? await stepCharsResp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestStepCharacterRow>>() ?? [] : [];
            
            if (sourceStepChars.Count > 0)
            {
                var stepCharRows = sourceStepChars.Select(sc => new { event_id = eventId, step_id = stepIdMapping[sc.step_id], character_id = sc.character_id }).ToList();
                var batchReq = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_quest_step_characters");
                batchReq.Headers.Add("Prefer", "return=minimal");
                AddHeaders(batchReq, key!);
                batchReq.Content = JsonContent.Create(stepCharRows);
                await httpClient.SendAsync(batchReq);
            }
        }

        return Results.Created($"/api/events/{eventId}/narrative/quests/{created.id}", ToQuestDto(created, access.CanWrite));
    }

    private static async Task<IResult> UndeleteQuest(Guid eventId, Guid questId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_quests?id=eq.{questId}&event_id=eq.{eventId}");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { deleted_at = (DateTimeOffset?)null, deleted_by = (Guid?)null, deletion_reason = (string?)null });
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to undelete quest: {resp.StatusCode}");
    }

    private static async Task<IResult> ListQuestSteps(Guid eventId, Guid questId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await QuestExists(eventId, questId, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quest_steps?quest_id=eq.{questId}&event_id=eq.{eventId}&select=id,quest_id,event_id,sort_order,summary,notes,created_at,updated_at&order=sort_order.asc");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list quest steps: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestStepRow>>() ?? [];
        return Results.Ok(rows.Select(r => ToQuestStepDto(r, access.CanWrite)));
    }

    private static async Task<IResult> CreateQuestStep(Guid eventId, Guid questId, ClaimsPrincipal user, [FromBody] CreateQuestStepRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (string.IsNullOrWhiteSpace(request.Summary)) return Results.BadRequest("Step summary is required.");

        var quest = await GetQuest(eventId, questId, url!, key!, httpClient, includeDeleted: false);
        if (quest is null) return Results.NotFound();
        if (quest.status == NarrativeStatuses.Locked) return Results.BadRequest("Locked quest steps are read-only.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_quest_steps");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            quest_id = questId,
            event_id = eventId,
            sort_order = request.SortOrder,
            summary = request.Summary.Trim(),
            notes = request.Notes
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to create quest step: {resp.StatusCode}");
        var created = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestStepRow>>())?.FirstOrDefault();
        return created is null ? Results.Problem("Quest step created but payload missing.") : Results.Created($"/api/events/{eventId}/narrative/quests/{questId}/steps/{created.id}", ToQuestStepDto(created, access.CanWrite));
    }

    private static async Task<IResult> UpdateQuestStep(Guid eventId, Guid questId, Guid stepId, ClaimsPrincipal user, [FromBody] UpdateQuestStepRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var quest = await GetQuest(eventId, questId, url!, key!, httpClient, includeDeleted: false);
        if (quest is null) return Results.NotFound();
        if (quest.status == NarrativeStatuses.Locked) return Results.BadRequest("Locked quest steps are read-only.");

        var current = await GetQuestStep(eventId, questId, stepId, url!, key!, httpClient);
        if (current is null) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_quest_steps?id=eq.{stepId}&quest_id=eq.{questId}&event_id=eq.{eventId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            sort_order = request.SortOrder ?? current.sort_order,
            summary = request.Summary ?? current.summary,
            notes = request.Notes ?? current.notes
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to update quest step: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestStepRow>>())?.FirstOrDefault();
        return updated is null ? Results.Problem("Quest step update payload missing.") : Results.Ok(ToQuestStepDto(updated, access.CanWrite));
    }

    private static async Task<IResult> DeleteQuestStep(Guid eventId, Guid questId, Guid stepId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var quest = await GetQuest(eventId, questId, url!, key!, httpClient, includeDeleted: false);
        if (quest is null) return Results.NotFound();
        if (quest.status == NarrativeStatuses.Locked) return Results.BadRequest("Locked quest steps are read-only.");

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_quest_steps?id=eq.{stepId}&quest_id=eq.{questId}&event_id=eq.{eventId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete quest step: {resp.StatusCode}");
    }

    private static async Task<IResult> ListQuestStepItems(Guid eventId, Guid questId, Guid stepId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await QuestExists(eventId, questId, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();
        if (await GetQuestStep(eventId, questId, stepId, url!, key!, httpClient) is null) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quest_step_items?event_id=eq.{eventId}&step_id=eq.{stepId}&select=event_id,step_id,item_id,link_type,created_at&order=created_at.asc");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list quest step items: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestStepItemRow>>() ?? [];
        return Results.Ok(rows.Select(ToQuestStepItemLinkDto));
    }

    private static async Task<IResult> UpsertQuestStepItem(Guid eventId, Guid questId, Guid stepId, Guid itemId, ClaimsPrincipal user, [FromBody] UpsertQuestStepItemRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!IsValidStepItemLinkType(request.LinkType)) return Results.BadRequest("Link type must be 'required' or 'loot'.");
        if (!await QuestExists(eventId, questId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();
        if (await GetQuestStep(eventId, questId, stepId, url!, key!, httpClient) is null) return Results.NotFound();
        if (!await ItemExists(eventId, itemId, url!, key!, httpClient, includeDeleted: false)) return Results.BadRequest("Item not found in event.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_quest_step_items?on_conflict=step_id,item_id,link_type");
        req.Headers.Add("Prefer", "return=representation,resolution=merge-duplicates");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            event_id = eventId,
            step_id = stepId,
            item_id = itemId,
            link_type = request.LinkType
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to upsert quest step item link: {resp.StatusCode}");
        var row = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestStepItemRow>>())?.FirstOrDefault();
        return row is null ? Results.NoContent() : Results.Ok(ToQuestStepItemLinkDto(row));
    }

    private static async Task<IResult> DeleteQuestStepItem(Guid eventId, Guid questId, Guid stepId, Guid itemId, ClaimsPrincipal user, [FromQuery] string? linkType, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await QuestExists(eventId, questId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();
        if (await GetQuestStep(eventId, questId, stepId, url!, key!, httpClient) is null) return Results.NotFound();

        var deleteUrl = $"{url}/rest/v1/narrative_quest_step_items?event_id=eq.{eventId}&step_id=eq.{stepId}&item_id=eq.{itemId}";
        if (!string.IsNullOrWhiteSpace(linkType))
        {
            if (!IsValidStepItemLinkType(linkType)) return Results.BadRequest("Link type must be 'required' or 'loot'.");
            deleteUrl += $"&link_type=eq.{Uri.EscapeDataString(linkType)}";
        }

        var req = new HttpRequestMessage(HttpMethod.Delete, deleteUrl);
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete quest step item link: {resp.StatusCode}");
    }

    private static async Task<IResult> ListQuestStepCharacters(Guid eventId, Guid questId, Guid stepId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await QuestExists(eventId, questId, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();
        if (await GetQuestStep(eventId, questId, stepId, url!, key!, httpClient) is null) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quest_step_characters?event_id=eq.{eventId}&step_id=eq.{stepId}&select=event_id,step_id,character_id,created_at&order=created_at.asc");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list quest step characters: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestStepCharacterRow>>() ?? [];
        return Results.Ok(rows.Select(ToQuestStepCharacterDto));
    }

    private static async Task<IResult> UpsertQuestStepCharacter(Guid eventId, Guid questId, Guid stepId, Guid characterId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await QuestExists(eventId, questId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();
        if (await GetQuestStep(eventId, questId, stepId, url!, key!, httpClient) is null) return Results.NotFound();
        if (!await CharacterExistsInEvent(eventId, characterId, url!, key!, httpClient)) return Results.BadRequest("Character not found in event.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_quest_step_characters?on_conflict=step_id,character_id");
        req.Headers.Add("Prefer", "return=representation,resolution=merge-duplicates");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { event_id = eventId, step_id = stepId, character_id = characterId });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to upsert quest step character: {resp.StatusCode}");
        var row = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestStepCharacterRow>>())?.FirstOrDefault();
        return row is null ? Results.NoContent() : Results.Ok(ToQuestStepCharacterDto(row));
    }

    private static async Task<IResult> DeleteQuestStepCharacter(Guid eventId, Guid questId, Guid stepId, Guid characterId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_quest_step_characters?event_id=eq.{eventId}&step_id=eq.{stepId}&character_id=eq.{characterId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete quest step character: {resp.StatusCode}");
    }

    private static async Task<IResult> ListQuestCharacters(Guid eventId, Guid questId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await QuestExists(eventId, questId, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quest_characters?event_id=eq.{eventId}&quest_id=eq.{questId}&select=event_id,quest_id,character_id,role,created_at&order=created_at.asc");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list quest character links: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestCharacterRow>>() ?? [];
        return Results.Ok(rows.Select(ToQuestCharacterLinkDto));
    }

    private static async Task<IResult> UpsertQuestCharacter(Guid eventId, Guid questId, Guid characterId, ClaimsPrincipal user, [FromBody] UpsertQuestCharacterRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await QuestExists(eventId, questId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();
        if (!await CharacterExistsInEvent(eventId, characterId, url!, key!, httpClient)) return Results.BadRequest("Character not found in event.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_quest_characters?on_conflict=quest_id,character_id");
        req.Headers.Add("Prefer", "return=representation,resolution=merge-duplicates");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            event_id = eventId,
            quest_id = questId,
            character_id = characterId,
            role = request.Role
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to upsert quest character link: {resp.StatusCode}");
        var row = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestCharacterRow>>())?.FirstOrDefault();
        return row is null ? Results.NoContent() : Results.Ok(ToQuestCharacterLinkDto(row));
    }

    private static async Task<IResult> DeleteQuestCharacter(Guid eventId, Guid questId, Guid characterId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_quest_characters?event_id=eq.{eventId}&quest_id=eq.{questId}&character_id=eq.{characterId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete quest character link: {resp.StatusCode}");
    }

    private static async Task<IResult> ListQuestFactions(Guid eventId, Guid questId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await QuestExists(eventId, questId, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quest_factions?event_id=eq.{eventId}&quest_id=eq.{questId}&select=event_id,quest_id,faction_id,created_at&order=created_at.asc");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list quest faction links: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestFactionRow>>() ?? [];
        return Results.Ok(rows.Select(ToQuestFactionLinkDto));
    }

    private static async Task<IResult> UpsertQuestFaction(Guid eventId, Guid questId, Guid factionId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await QuestExists(eventId, questId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();
        if (!await FactionExists(eventId, factionId, url!, key!, httpClient, includeDeleted: false)) return Results.BadRequest("Faction not found in event.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_quest_factions?on_conflict=quest_id,faction_id");
        req.Headers.Add("Prefer", "return=representation,resolution=merge-duplicates");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { event_id = eventId, quest_id = questId, faction_id = factionId });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to upsert quest faction link: {resp.StatusCode}");
        var row = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestFactionRow>>())?.FirstOrDefault();
        return row is null ? Results.NoContent() : Results.Ok(ToQuestFactionLinkDto(row));
    }

    private static async Task<IResult> DeleteQuestFaction(Guid eventId, Guid questId, Guid factionId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_quest_factions?event_id=eq.{eventId}&quest_id=eq.{questId}&faction_id=eq.{factionId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete quest faction link: {resp.StatusCode}");
    }

    private static async Task<IResult> ListQuestItems(Guid eventId, Guid questId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await QuestExists(eventId, questId, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quest_items?event_id=eq.{eventId}&quest_id=eq.{questId}&select=event_id,quest_id,item_id,created_at&order=created_at.asc");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list quest item links: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestItemRow>>() ?? [];
        return Results.Ok(rows.Select(ToQuestItemLinkDto));
    }

    private static async Task<IResult> UpsertQuestItem(Guid eventId, Guid questId, Guid itemId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await QuestExists(eventId, questId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();
        if (!await ItemExists(eventId, itemId, url!, key!, httpClient, includeDeleted: false)) return Results.BadRequest("Item not found in event.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_quest_items?on_conflict=quest_id,item_id");
        req.Headers.Add("Prefer", "return=representation,resolution=merge-duplicates");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { event_id = eventId, quest_id = questId, item_id = itemId });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to upsert quest item link: {resp.StatusCode}");
        var row = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestItemRow>>())?.FirstOrDefault();
        return row is null ? Results.NoContent() : Results.Ok(ToQuestItemLinkDto(row));
    }

    private static async Task<IResult> DeleteQuestItem(Guid eventId, Guid questId, Guid itemId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_quest_items?event_id=eq.{eventId}&quest_id=eq.{questId}&item_id=eq.{itemId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete quest item link: {resp.StatusCode}");
    }

    private static async Task<IResult> ListQuestDocuments(Guid eventId, Guid questId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await QuestExists(eventId, questId, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_document_links?event_id=eq.{eventId}&entity_type=eq.quest&entity_id=eq.{questId}&select=id,event_id,entity_type,entity_id,display_name,url,document_status,source_type,created_by,created_at&order=created_at.desc");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list quest documents: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeDocumentLinkRow>>() ?? [];
        return Results.Ok(rows.Select(ToDocumentDto));
    }

    private static async Task<IResult> AddQuestGoogleDriveDocument(Guid eventId, Guid questId, ClaimsPrincipal user, [FromBody] AddNarrativeGoogleDriveLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz, NarrativeDocumentLinkService documentLinks)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await QuestExists(eventId, questId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();

        if (string.IsNullOrWhiteSpace(request.DisplayName)) return Results.BadRequest("Display name is required.");
        documentLinks.ValidateGoogleDriveUrl(request.Url);

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_document_links");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            event_id = eventId,
            entity_type = "quest",
            entity_id = questId,
            display_name = request.DisplayName.Trim(),
            url = request.Url,
            document_status = request.DocumentStatus,
            source_type = "GoogleDrive",
            created_by = UserId(user)
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to add Google Drive link: {resp.StatusCode}");
        var created = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeDocumentLinkRow>>())?.FirstOrDefault();
        return created is null ? Results.Problem("Document link saved but payload missing.") : Results.Created($"/api/events/{eventId}/narrative/quests/{questId}/documents/{created.id}", ToDocumentDto(created));
    }

    private static async Task<IResult> DeleteQuestDocument(Guid eventId, Guid questId, Guid documentId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await QuestExists(eventId, questId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_document_links?id=eq.{documentId}&event_id=eq.{eventId}&entity_type=eq.quest&entity_id=eq.{questId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete document link: {resp.StatusCode}");
    }

    private static async Task<IResult> ListFactions(Guid eventId, ClaimsPrincipal user, [FromQuery] bool includeDeleted, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();

        var filters = new List<string>
        {
            "select=id,event_id,name,sigil_url,description,goals,internal_notes,status,created_at,updated_at,deleted_at",
            $"event_id=eq.{eventId}",
            "order=created_at.desc"
        };
        if (!includeDeleted) filters.Add("deleted_at=is.null");

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_factions?{string.Join("&", filters)}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list factions: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeFactionRow>>() ?? [];
        return Results.Ok(rows.Select(r => ToFactionDto(r, access.CanWrite)));
    }

    private static async Task<IResult> CreateFaction(Guid eventId, ClaimsPrincipal user, [FromBody] CreateFactionRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (string.IsNullOrWhiteSpace(request.Name)) return Results.BadRequest("Name is required.");

        var trimmed = request.Name.Trim();
        if (await FactionNameExists(eventId, trimmed, null, url!, key!, httpClient))
            return Results.BadRequest("Faction name must be unique within event.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_factions");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            event_id = eventId,
            name = trimmed,
            sigil_url = request.SigilUrl,
            description = request.Description,
            goals = request.Goals,
            internal_notes = request.InternalNotes,
            status = NarrativeStatuses.Draft
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to create faction: {resp.StatusCode}");
        var created = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeFactionRow>>())?.FirstOrDefault();
        return created is null ? Results.Problem("Faction created but no payload returned.") : Results.Created($"/api/events/{eventId}/narrative/factions/{created.id}", ToFactionDto(created, access.CanWrite));
    }

    private static async Task<IResult> GetFactionById(Guid eventId, Guid factionId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();

        var row = await GetFaction(eventId, factionId, url!, key!, httpClient, includeDeleted: true);
        return row is null ? Results.NotFound() : Results.Ok(ToFactionDto(row, access.CanWrite));
    }

    private static async Task<IResult> UpdateFaction(Guid eventId, Guid factionId, ClaimsPrincipal user, [FromBody] UpdateFactionRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var row = await GetFaction(eventId, factionId, url!, key!, httpClient, includeDeleted: true);
        if (row is null) return Results.NotFound();
        if (row.deleted_at.HasValue) return Results.BadRequest("Deleted faction cannot be edited.");
        if (row.status == NarrativeStatuses.Locked && (request.Name is not null || request.Description is not null || request.Goals is not null || request.SigilUrl is not null))
            return Results.BadRequest("Locked faction allows editing internal notes only.");

        var nextName = request.Name?.Trim() ?? row.name;
        if (!string.Equals(nextName, row.name, StringComparison.OrdinalIgnoreCase) &&
            await FactionNameExists(eventId, nextName, factionId, url!, key!, httpClient))
        {
            return Results.BadRequest("Faction name must be unique within event.");
        }

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_factions?id=eq.{factionId}&event_id=eq.{eventId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            name = nextName,
            sigil_url = request.SigilUrl ?? row.sigil_url,
            description = request.Description ?? row.description,
            goals = request.Goals ?? row.goals,
            internal_notes = request.InternalNotes ?? row.internal_notes
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to update faction: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeFactionRow>>())?.FirstOrDefault();
        return updated is null ? Results.Problem("Faction update payload missing.") : Results.Ok(ToFactionDto(updated, access.CanWrite));
    }

    private static async Task<IResult> ChangeFactionStatus(Guid eventId, Guid factionId, ClaimsPrincipal user, [FromBody] ChangeNarrativeStatusRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!NarrativeStatuses.All.Contains(request.Status)) return Results.BadRequest("Unknown status.");

        var row = await GetFaction(eventId, factionId, url!, key!, httpClient, includeDeleted: true);
        if (row is null) return Results.NotFound();
        if (!NarrativeLifecycleService.CanTransition(row.status, request.Status))
            return Results.BadRequest($"Invalid status transition: {row.status} -> {request.Status}.");
        if (row.status == NarrativeStatuses.Locked && request.Status == NarrativeStatuses.Ready && !request.ConfirmUnlock)
            return Results.BadRequest("Unlock requires explicit confirmation.");

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_factions?id=eq.{factionId}&event_id=eq.{eventId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { status = request.Status });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to change faction status: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeFactionRow>>())?.FirstOrDefault();
        return updated is null ? Results.Problem("Faction status payload missing.") : Results.Ok(ToFactionDto(updated, access.CanWrite));
    }

    private static async Task<IResult> SoftDeleteFaction(Guid eventId, Guid factionId, ClaimsPrincipal user, [FromBody] NarrativeDeleteRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var row = await GetFaction(eventId, factionId, url!, key!, httpClient, includeDeleted: true);
        if (row is null) return Results.NotFound();
        if (row.deleted_at.HasValue) return Results.NoContent();

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_factions?id=eq.{factionId}&event_id=eq.{eventId}");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { deleted_at = DateTimeOffset.UtcNow, deleted_by = UserId(user), deletion_reason = request.Reason });
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete faction: {resp.StatusCode}");
    }

    private static async Task<IResult> UndeleteFaction(Guid eventId, Guid factionId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_factions?id=eq.{factionId}&event_id=eq.{eventId}");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { deleted_at = (DateTimeOffset?)null, deleted_by = (Guid?)null, deletion_reason = (string?)null });
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to undelete faction: {resp.StatusCode}");
    }

    private static async Task<IResult> ListFactionMembers(Guid eventId, Guid factionId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await FactionExists(eventId, factionId, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_faction_members?event_id=eq.{eventId}&faction_id=eq.{factionId}&select=event_id,faction_id,character_id,role,created_at&order=created_at.asc");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list faction members: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeFactionMemberRow>>() ?? [];
        return Results.Ok(rows.Select(ToFactionMemberDto));
    }

    private static async Task<IResult> UpsertFactionMember(Guid eventId, Guid factionId, Guid characterId, ClaimsPrincipal user, [FromBody] UpsertFactionMemberRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await FactionExists(eventId, factionId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();
        if (!await CharacterExistsInEvent(eventId, characterId, url!, key!, httpClient)) return Results.BadRequest("Character not found in event.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_faction_members?on_conflict=faction_id,character_id");
        req.Headers.Add("Prefer", "return=representation,resolution=merge-duplicates");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            event_id = eventId,
            faction_id = factionId,
            character_id = characterId,
            role = request.Role
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to upsert faction member: {resp.StatusCode}");
        var row = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeFactionMemberRow>>())?.FirstOrDefault();
        return row is null ? Results.NoContent() : Results.Ok(ToFactionMemberDto(row));
    }

    private static async Task<IResult> DeleteFactionMember(Guid eventId, Guid factionId, Guid characterId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await FactionExists(eventId, factionId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_faction_members?event_id=eq.{eventId}&faction_id=eq.{factionId}&character_id=eq.{characterId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete faction member: {resp.StatusCode}");
    }

    private static async Task<IResult> ListFactionRelationships(Guid eventId, Guid factionId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await FactionExists(eventId, factionId, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();

        var query = $"{url}/rest/v1/narrative_faction_relationships" +
                    $"?event_id=eq.{eventId}" +
                    $"&or=(source_faction_id.eq.{factionId},target_faction_id.eq.{factionId})" +
                    "&select=id,event_id,source_faction_id,target_faction_id,target_character_id,relation_type,relation_mode,mirror_group_id,is_auto_mirror,created_at,updated_at" +
                    "&order=created_at.desc";
        var req = new HttpRequestMessage(HttpMethod.Get, query);
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list faction relationships: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeFactionRelationshipRow>>() ?? [];
        return Results.Ok(rows.Select(r => ToFactionRelationshipDto(r, access.CanWrite)));
    }

    private static async Task<IResult> CreateFactionRelationship(Guid eventId, Guid factionId, ClaimsPrincipal user, [FromBody] CreateFactionRelationshipRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await FactionExists(eventId, factionId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();
        if (string.IsNullOrWhiteSpace(request.RelationType)) return Results.BadRequest("Relation type is required.");
        if (request.RelationType.Length > 100) return Results.BadRequest("Relation type cannot be longer than 100 characters.");
        if (!IsValidRelationshipMode(request.RelationMode)) return Results.BadRequest("Relation mode must be 'directional' or 'auto_mirrored'.");
        if ((request.TargetFactionId.HasValue && request.TargetCharacterId.HasValue) || (!request.TargetFactionId.HasValue && !request.TargetCharacterId.HasValue))
            return Results.BadRequest("Exactly one target is required: target faction or target character.");

        if (request.TargetFactionId.HasValue)
        {
            if (!await FactionExists(eventId, request.TargetFactionId.Value, url!, key!, httpClient, includeDeleted: false))
                return Results.BadRequest("Target faction not found in event.");
            if (request.TargetFactionId.Value == factionId)
                return Results.BadRequest("Faction cannot reference itself.");
        }

        if (request.TargetCharacterId.HasValue)
        {
            if (!await CharacterExistsInEvent(eventId, request.TargetCharacterId.Value, url!, key!, httpClient))
                return Results.BadRequest("Target character not found in event.");
            if (IsAutoMirrored(request.RelationMode))
                return Results.BadRequest("Auto-mirrored mode is only supported for faction-to-faction relationships.");
        }

        var mirrorGroupId = IsAutoMirrored(request.RelationMode) ? Guid.NewGuid() : (Guid?)null;

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_faction_relationships");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            event_id = eventId,
            source_faction_id = factionId,
            target_faction_id = request.TargetFactionId,
            target_character_id = request.TargetCharacterId,
            relation_type = request.RelationType.Trim(),
            relation_mode = request.RelationMode,
            mirror_group_id = mirrorGroupId,
            is_auto_mirror = false
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to create faction relationship: {resp.StatusCode}");
        var created = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeFactionRelationshipRow>>())?.FirstOrDefault();
        if (created is null) return Results.Problem("Relationship created but payload missing.");

        if (IsAutoMirrored(request.RelationMode) && request.TargetFactionId.HasValue)
        {
            var mirrorReq = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_faction_relationships");
            mirrorReq.Headers.Add("Prefer", "return=minimal");
            AddHeaders(mirrorReq, key!);
            mirrorReq.Content = JsonContent.Create(new
            {
                event_id = eventId,
                source_faction_id = request.TargetFactionId.Value,
                target_faction_id = factionId,
                target_character_id = (Guid?)null,
                relation_type = request.RelationType.Trim(),
                relation_mode = request.RelationMode,
                mirror_group_id = mirrorGroupId,
                is_auto_mirror = true
            });
            await httpClient.SendAsync(mirrorReq);
        }

        return Results.Created($"/api/events/{eventId}/narrative/factions/{factionId}/relationships/{created.id}", ToFactionRelationshipDto(created, access.CanWrite));
    }

    private static async Task<IResult> UpdateFactionRelationship(Guid eventId, Guid factionId, Guid relationshipId, ClaimsPrincipal user, [FromBody] UpdateFactionRelationshipRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var current = await GetFactionRelationship(eventId, factionId, relationshipId, url!, key!, httpClient);
        if (current is null) return Results.NotFound();

        var nextType = request.RelationType?.Trim() ?? current.relation_type;
        if (nextType.Length > 100) return Results.BadRequest("Relation type cannot be longer than 100 characters.");

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_faction_relationships?id=eq.{relationshipId}&event_id=eq.{eventId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            relation_type = nextType
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to update faction relationship: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeFactionRelationshipRow>>())?.FirstOrDefault();
        if (updated is null) return Results.Problem("Relationship update payload missing.");

        if (updated.mirror_group_id.HasValue && !updated.is_auto_mirror)
        {
            var mirrorPatch = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_faction_relationships?mirror_group_id=eq.{updated.mirror_group_id.Value}&is_auto_mirror=eq.true&event_id=eq.{eventId}");
            AddHeaders(mirrorPatch, key!);
            mirrorPatch.Content = JsonContent.Create(new
            {
                relation_type = nextType
            });
            await httpClient.SendAsync(mirrorPatch);
        }

        return Results.Ok(ToFactionRelationshipDto(updated, access.CanWrite));
    }

    private static async Task<IResult> DeleteFactionRelationship(Guid eventId, Guid factionId, Guid relationshipId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var current = await GetFactionRelationship(eventId, factionId, relationshipId, url!, key!, httpClient);
        if (current is null) return Results.NotFound();

        HttpRequestMessage req;
        if (current.mirror_group_id.HasValue)
        {
            req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_faction_relationships?event_id=eq.{eventId}&mirror_group_id=eq.{current.mirror_group_id.Value}");
        }
        else
        {
            req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_faction_relationships?id=eq.{relationshipId}&event_id=eq.{eventId}");
        }

        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete faction relationship: {resp.StatusCode}");
    }

    private static async Task<IResult> ListFactionDocuments(Guid eventId, Guid factionId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await FactionExists(eventId, factionId, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();
        return await ListDocuments(eventId, "faction", factionId, url!, key!, httpClient);
    }

    private static async Task<IResult> AddFactionGoogleDriveDocument(Guid eventId, Guid factionId, ClaimsPrincipal user, [FromBody] AddNarrativeGoogleDriveLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz, NarrativeDocumentLinkService documentLinks)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await FactionExists(eventId, factionId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();
        return await AddGoogleDriveDocument(eventId, "faction", factionId, request, user, url!, key!, httpClient, documentLinks);
    }

    private static async Task<IResult> DeleteFactionDocument(Guid eventId, Guid factionId, Guid documentId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await FactionExists(eventId, factionId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();
        return await DeleteDocument(eventId, "faction", factionId, documentId, url!, key!, httpClient);
    }

    private static async Task<IResult> ListItems(Guid eventId, ClaimsPrincipal user, [FromQuery] bool includeDeleted, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();

        var filters = new List<string>
        {
            "select=id,event_id,name,description,internal_notes,status,is_multi_copy,max_copies,created_at,updated_at,deleted_at",
            $"event_id=eq.{eventId}",
            "order=created_at.desc"
        };
        if (!includeDeleted) filters.Add("deleted_at=is.null");

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_items?{string.Join("&", filters)}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list items: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeItemRow>>() ?? [];
        return Results.Ok(rows.Select(r => ToItemDto(r, access.CanWrite)));
    }

    private static async Task<IResult> CreateItem(Guid eventId, ClaimsPrincipal user, [FromBody] CreateItemRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (string.IsNullOrWhiteSpace(request.Name)) return Results.BadRequest("Name is required.");
        if (!request.IsMultiCopy && request.MaxCopies.HasValue && request.MaxCopies.Value > 1) return Results.BadRequest("Non-multi-copy item can have max 1 copy.");
        if (request.MaxCopies.HasValue && request.MaxCopies.Value < 1) return Results.BadRequest("Max copies must be at least 1.");

        var trimmed = request.Name.Trim();
        if (await ItemNameExists(eventId, trimmed, null, url!, key!, httpClient))
            return Results.BadRequest("Item name must be unique within event.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_items");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            event_id = eventId,
            name = trimmed,
            description = request.Description,
            internal_notes = request.InternalNotes,
            status = NarrativeItemStatuses.Draft,
            is_multi_copy = request.IsMultiCopy,
            max_copies = request.MaxCopies
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to create item: {resp.StatusCode}");
        var created = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeItemRow>>())?.FirstOrDefault();
        return created is null ? Results.Problem("Item created but no payload returned.") : Results.Created($"/api/events/{eventId}/narrative/items/{created.id}", ToItemDto(created, access.CanWrite));
    }

    private static async Task<IResult> GetItemById(Guid eventId, Guid itemId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();

        var row = await GetItem(eventId, itemId, url!, key!, httpClient, includeDeleted: true);
        return row is null ? Results.NotFound() : Results.Ok(ToItemDto(row, access.CanWrite));
    }

    private static async Task<IResult> UpdateItem(Guid eventId, Guid itemId, ClaimsPrincipal user, [FromBody] UpdateItemRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var row = await GetItem(eventId, itemId, url!, key!, httpClient, includeDeleted: true);
        if (row is null) return Results.NotFound();
        if (row.deleted_at.HasValue) return Results.BadRequest("Deleted item cannot be edited.");
        if (row.status == NarrativeItemStatuses.Final && (request.Name is not null || request.Description is not null || request.InternalNotes is not null || request.IsMultiCopy.HasValue || request.MaxCopies.HasValue))
            return Results.BadRequest("Final item is not editable except status.");

        var nextName = request.Name?.Trim() ?? row.name;
        if (!string.Equals(nextName, row.name, StringComparison.OrdinalIgnoreCase) &&
            await ItemNameExists(eventId, nextName, itemId, url!, key!, httpClient))
        {
            return Results.BadRequest("Item name must be unique within event.");
        }

        var nextIsMulti = request.IsMultiCopy ?? row.is_multi_copy;
        var nextMax = request.MaxCopies ?? row.max_copies;
        if (!nextIsMulti && nextMax.HasValue && nextMax.Value > 1) return Results.BadRequest("Non-multi-copy item can have max 1 copy.");
        if (nextMax.HasValue && nextMax.Value < 1) return Results.BadRequest("Max copies must be at least 1.");

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_items?id=eq.{itemId}&event_id=eq.{eventId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            name = nextName,
            description = request.Description ?? row.description,
            internal_notes = request.InternalNotes ?? row.internal_notes,
            is_multi_copy = nextIsMulti,
            max_copies = nextMax
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to update item: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeItemRow>>())?.FirstOrDefault();
        return updated is null ? Results.Problem("Item update payload missing.") : Results.Ok(ToItemDto(updated, access.CanWrite));
    }

    private static async Task<IResult> ChangeItemStatus(Guid eventId, Guid itemId, ClaimsPrincipal user, [FromBody] ChangeNarrativeStatusRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!NarrativeItemStatuses.All.Contains(request.Status)) return Results.BadRequest("Unknown status.");

        var row = await GetItem(eventId, itemId, url!, key!, httpClient, includeDeleted: true);
        if (row is null) return Results.NotFound();
        if (!NarrativeLifecycleService.CanTransitionItem(row.status, request.Status))
            return Results.BadRequest($"Invalid status transition: {row.status} -> {request.Status}.");

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_items?id=eq.{itemId}&event_id=eq.{eventId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { status = request.Status });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to change item status: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeItemRow>>())?.FirstOrDefault();
        return updated is null ? Results.Problem("Item status payload missing.") : Results.Ok(ToItemDto(updated, access.CanWrite));
    }

    private static async Task<IResult> SoftDeleteItem(Guid eventId, Guid itemId, ClaimsPrincipal user, [FromBody] NarrativeDeleteRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var row = await GetItem(eventId, itemId, url!, key!, httpClient, includeDeleted: true);
        if (row is null) return Results.NotFound();
        if (row.deleted_at.HasValue) return Results.NoContent();

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_items?id=eq.{itemId}&event_id=eq.{eventId}");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { deleted_at = DateTimeOffset.UtcNow, deleted_by = UserId(user), deletion_reason = request.Reason });
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete item: {resp.StatusCode}");
    }

    private static async Task<IResult> UndeleteItem(Guid eventId, Guid itemId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_items?id=eq.{itemId}&event_id=eq.{eventId}");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { deleted_at = (DateTimeOffset?)null, deleted_by = (Guid?)null, deletion_reason = (string?)null });
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to undelete item: {resp.StatusCode}");
    }

    private static async Task<IResult> ListItemAssignments(Guid eventId, Guid itemId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await ItemExists(eventId, itemId, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_item_character_assignments?event_id=eq.{eventId}&item_id=eq.{itemId}&select=event_id,item_id,character_id,assigned_by,assigned_at,notes&order=assigned_at.asc");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list item assignments: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeItemAssignmentRow>>() ?? [];
        return Results.Ok(rows.Select(r => ToItemAssignmentDto(r, access.CanWrite)));
    }

    private static async Task<IResult> AssignItemToCharacter(Guid eventId, Guid itemId, Guid characterId, ClaimsPrincipal user, [FromBody] ItemAssignmentRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var item = await GetItem(eventId, itemId, url!, key!, httpClient, includeDeleted: false);
        if (item is null) return Results.NotFound();
        if (item.status == NarrativeItemStatuses.Final) return Results.BadRequest("Final item is not editable except status.");
        if (!await CharacterExistsInEvent(eventId, characterId, url!, key!, httpClient)) return Results.BadRequest("Character not found in event.");

        var alreadyAssigned = await IsItemAssignedToCharacter(eventId, itemId, characterId, url!, key!, httpClient);
        var effectiveLimit = !item.is_multi_copy ? 1 : item.max_copies;
        if (!alreadyAssigned && effectiveLimit.HasValue)
        {
            var currentCount = await CountItemAssignments(eventId, itemId, url!, key!, httpClient);
            if (currentCount >= effectiveLimit.Value)
            {
                return Results.BadRequest($"Cannot assign item: copy limit reached ({currentCount}/{effectiveLimit.Value}). Increase max copies or unassign an existing holder.");
            }
        }

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
        var row = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeItemAssignmentRow>>())?.FirstOrDefault();
        return row is null ? Results.NoContent() : Results.Ok(ToItemAssignmentDto(row, access.CanWrite));
    }

    private static async Task<IResult> RemoveItemAssignment(Guid eventId, Guid itemId, Guid characterId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await ItemExists(eventId, itemId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_item_character_assignments?event_id=eq.{eventId}&item_id=eq.{itemId}&character_id=eq.{characterId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to remove item assignment: {resp.StatusCode}");
    }

    private static async Task<IResult> ListItemDocuments(Guid eventId, Guid itemId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await ItemExists(eventId, itemId, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();
        return await ListDocuments(eventId, "item", itemId, url!, key!, httpClient);
    }

    private static async Task<IResult> AddItemGoogleDriveDocument(Guid eventId, Guid itemId, ClaimsPrincipal user, [FromBody] AddNarrativeGoogleDriveLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz, NarrativeDocumentLinkService documentLinks)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await ItemExists(eventId, itemId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();
        return await AddGoogleDriveDocument(eventId, "item", itemId, request, user, url!, key!, httpClient, documentLinks);
    }

    private static async Task<IResult> DeleteItemDocument(Guid eventId, Guid itemId, Guid documentId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await ItemExists(eventId, itemId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();
        return await DeleteDocument(eventId, "item", itemId, documentId, url!, key!, httpClient);
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

    private static async Task<IResult> ListPlotlines(Guid eventId, ClaimsPrincipal user, [FromQuery] bool includeDeleted, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();

        var filters = new List<string>
        {
            "select=id,event_id,title,description,internal_notes,status,created_at,updated_at,deleted_at",
            $"event_id=eq.{eventId}",
            "order=created_at.desc"
        };
        if (!includeDeleted) filters.Add("deleted_at=is.null");

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plotlines?{string.Join("&", filters)}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list plotlines: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotlineRow>>() ?? [];
        return Results.Ok(rows.Select(r => ToPlotlineDto(r, access.CanWrite)));
    }

    private static async Task<IResult> CreatePlotline(Guid eventId, ClaimsPrincipal user, [FromBody] CreatePlotlineRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (string.IsNullOrWhiteSpace(request.Title)) return Results.BadRequest("Title is required.");
        var trimmed = request.Title.Trim();
        if (await PlotlineTitleExists(eventId, trimmed, null, url!, key!, httpClient)) return Results.BadRequest("Plotline title must be unique within event.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_plotlines");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            event_id = eventId,
            title = trimmed,
            description = request.Description,
            internal_notes = request.InternalNotes,
            status = NarrativeStatuses.Draft
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to create plotline: {resp.StatusCode}");
        var created = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotlineRow>>())?.FirstOrDefault();
        return created is null ? Results.Problem("Plotline created but no payload returned.") : Results.Created($"/api/events/{eventId}/narrative/plotlines/{created.id}", ToPlotlineDto(created, access.CanWrite));
    }

    private static async Task<IResult> GetPlotlineById(Guid eventId, Guid plotlineId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        var row = await GetPlotline(eventId, plotlineId, url!, key!, httpClient, includeDeleted: true);
        return row is null ? Results.NotFound() : Results.Ok(ToPlotlineDto(row, access.CanWrite));
    }

    private static async Task<IResult> UpdatePlotline(Guid eventId, Guid plotlineId, ClaimsPrincipal user, [FromBody] UpdatePlotlineRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var row = await GetPlotline(eventId, plotlineId, url!, key!, httpClient, includeDeleted: true);
        if (row is null) return Results.NotFound();
        if (row.deleted_at.HasValue) return Results.BadRequest("Deleted plotline cannot be edited.");
        if (row.status == NarrativeStatuses.Locked && (request.Title is not null || request.Description is not null))
            return Results.BadRequest("Locked plotline allows editing internal notes only.");

        var nextTitle = request.Title?.Trim() ?? row.title;
        if (!string.Equals(nextTitle, row.title, StringComparison.OrdinalIgnoreCase) &&
            await PlotlineTitleExists(eventId, nextTitle, plotlineId, url!, key!, httpClient))
        {
            return Results.BadRequest("Plotline title must be unique within event.");
        }

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_plotlines?id=eq.{plotlineId}&event_id=eq.{eventId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            title = nextTitle,
            description = request.Description ?? row.description,
            internal_notes = request.InternalNotes ?? row.internal_notes
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to update plotline: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotlineRow>>())?.FirstOrDefault();
        return updated is null ? Results.Problem("Plotline update payload missing.") : Results.Ok(ToPlotlineDto(updated, access.CanWrite));
    }

    private static async Task<IResult> ChangePlotlineStatus(Guid eventId, Guid plotlineId, ClaimsPrincipal user, [FromBody] ChangeNarrativeStatusRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!NarrativeStatuses.All.Contains(request.Status)) return Results.BadRequest("Unknown status.");
        var row = await GetPlotline(eventId, plotlineId, url!, key!, httpClient, includeDeleted: true);
        if (row is null) return Results.NotFound();
        if (!NarrativeLifecycleService.CanTransition(row.status, request.Status))
            return Results.BadRequest($"Invalid status transition: {row.status} -> {request.Status}.");
        if (row.status == NarrativeStatuses.Locked && request.Status == NarrativeStatuses.Ready && !request.ConfirmUnlock)
            return Results.BadRequest("Unlock requires explicit confirmation.");

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_plotlines?id=eq.{plotlineId}&event_id=eq.{eventId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { status = request.Status });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to change plotline status: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotlineRow>>())?.FirstOrDefault();
        return updated is null ? Results.Problem("Plotline status payload missing.") : Results.Ok(ToPlotlineDto(updated, access.CanWrite));
    }

    private static async Task<IResult> SoftDeletePlotline(Guid eventId, Guid plotlineId, ClaimsPrincipal user, [FromBody] NarrativeDeleteRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var row = await GetPlotline(eventId, plotlineId, url!, key!, httpClient, includeDeleted: true);
        if (row is null) return Results.NotFound();
        if (row.deleted_at.HasValue) return Results.NoContent();

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_plotlines?id=eq.{plotlineId}&event_id=eq.{eventId}");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { deleted_at = DateTimeOffset.UtcNow, deleted_by = UserId(user), deletion_reason = request.Reason });
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete plotline: {resp.StatusCode}");
    }

    private static async Task<IResult> UndeletePlotline(Guid eventId, Guid plotlineId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_plotlines?id=eq.{plotlineId}&event_id=eq.{eventId}");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { deleted_at = (DateTimeOffset?)null, deleted_by = (Guid?)null, deletion_reason = (string?)null });
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to undelete plotline: {resp.StatusCode}");
    }

    private static async Task<IResult> ListPlotlinePhases(Guid eventId, Guid plotlineId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await PlotlineExists(eventId, plotlineId, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plotline_phases?event_id=eq.{eventId}&plotline_id=eq.{plotlineId}&select=id,plotline_id,event_id,sort_order,title,summary,created_at,updated_at&order=sort_order.asc");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list plotline phases: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotlinePhaseRow>>() ?? [];
        return Results.Ok(rows.Select(ToPlotlinePhaseDto));
    }

    private static async Task<IResult> CreatePlotlinePhase(Guid eventId, Guid plotlineId, ClaimsPrincipal user, [FromBody] CreatePlotlinePhaseRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (string.IsNullOrWhiteSpace(request.Title)) return Results.BadRequest("Title is required.");
        if (!await PlotlineExists(eventId, plotlineId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_plotline_phases");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            event_id = eventId,
            plotline_id = plotlineId,
            sort_order = request.SortOrder,
            title = request.Title.Trim(),
            summary = request.Summary
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to create plotline phase: {resp.StatusCode}");
        var created = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotlinePhaseRow>>())?.FirstOrDefault();
        return created is null ? Results.Problem("Plotline phase created but payload missing.") : Results.Created($"/api/events/{eventId}/narrative/plotlines/{plotlineId}/phases/{created.id}", ToPlotlinePhaseDto(created));
    }

    private static async Task<IResult> UpdatePlotlinePhase(Guid eventId, Guid plotlineId, Guid phaseId, ClaimsPrincipal user, [FromBody] UpdatePlotlinePhaseRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var current = await GetPlotlinePhase(eventId, plotlineId, phaseId, url!, key!, httpClient);
        if (current is null) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_plotline_phases?id=eq.{phaseId}&event_id=eq.{eventId}&plotline_id=eq.{plotlineId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            sort_order = request.SortOrder ?? current.sort_order,
            title = request.Title ?? current.title,
            summary = request.Summary ?? current.summary
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to update plotline phase: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotlinePhaseRow>>())?.FirstOrDefault();
        return updated is null ? Results.Problem("Plotline phase update payload missing.") : Results.Ok(ToPlotlinePhaseDto(updated));
    }

    private static async Task<IResult> DeletePlotlinePhase(Guid eventId, Guid plotlineId, Guid phaseId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_plotline_phases?id=eq.{phaseId}&event_id=eq.{eventId}&plotline_id=eq.{plotlineId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete plotline phase: {resp.StatusCode}");
    }

    private static async Task<IResult> ListPlotlineQuests(Guid eventId, Guid plotlineId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await PlotlineExists(eventId, plotlineId, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plotline_quests?event_id=eq.{eventId}&plotline_id=eq.{plotlineId}&select=event_id,plotline_id,quest_id,phase_id,sort_order,created_at&order=sort_order.asc");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list plotline quests: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotlineQuestRow>>() ?? [];
        return Results.Ok(rows.Select(ToPlotlineQuestLinkDto));
    }

    private static async Task<IResult> UpsertPlotlineQuest(Guid eventId, Guid plotlineId, Guid questId, ClaimsPrincipal user, [FromBody] UpsertPlotlineQuestRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await PlotlineExists(eventId, plotlineId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();
        if (!await QuestExists(eventId, questId, url!, key!, httpClient, includeDeleted: false)) return Results.BadRequest("Quest not found in event.");
        if (request.PhaseId.HasValue && await GetPlotlinePhase(eventId, plotlineId, request.PhaseId.Value, url!, key!, httpClient) is null)
            return Results.BadRequest("Phase does not belong to plotline.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_plotline_quests?on_conflict=plotline_id,quest_id");
        req.Headers.Add("Prefer", "return=representation,resolution=merge-duplicates");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            event_id = eventId,
            plotline_id = plotlineId,
            quest_id = questId,
            phase_id = request.PhaseId,
            sort_order = request.SortOrder
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to upsert plotline quest link: {resp.StatusCode}");
        var row = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotlineQuestRow>>())?.FirstOrDefault();
        return row is null ? Results.NoContent() : Results.Ok(ToPlotlineQuestLinkDto(row));
    }

    private static async Task<IResult> DeletePlotlineQuest(Guid eventId, Guid plotlineId, Guid questId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_plotline_quests?event_id=eq.{eventId}&plotline_id=eq.{plotlineId}&quest_id=eq.{questId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete plotline quest link: {resp.StatusCode}");
    }

    private static async Task<IResult> ListPlotlineCharacters(Guid eventId, Guid plotlineId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await PlotlineExists(eventId, plotlineId, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plotline_characters?event_id=eq.{eventId}&plotline_id=eq.{plotlineId}&select=event_id,plotline_id,character_id,created_at&order=created_at.asc");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list plotline character links: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotlineCharacterRow>>() ?? [];
        return Results.Ok(rows.Select(ToPlotlineCharacterLinkDto));
    }

    private static async Task<IResult> UpsertPlotlineCharacter(Guid eventId, Guid plotlineId, Guid characterId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await PlotlineExists(eventId, plotlineId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();
        if (!await CharacterExistsInEvent(eventId, characterId, url!, key!, httpClient)) return Results.BadRequest("Character not found in event.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_plotline_characters?on_conflict=plotline_id,character_id");
        req.Headers.Add("Prefer", "return=representation,resolution=merge-duplicates");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { event_id = eventId, plotline_id = plotlineId, character_id = characterId });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to upsert plotline character link: {resp.StatusCode}");
        var row = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotlineCharacterRow>>())?.FirstOrDefault();
        return row is null ? Results.NoContent() : Results.Ok(ToPlotlineCharacterLinkDto(row));
    }

    private static async Task<IResult> DeletePlotlineCharacter(Guid eventId, Guid plotlineId, Guid characterId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_plotline_characters?event_id=eq.{eventId}&plotline_id=eq.{plotlineId}&character_id=eq.{characterId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete plotline character link: {resp.StatusCode}");
    }

    private static async Task<IResult> ListPlotlineFactions(Guid eventId, Guid plotlineId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await PlotlineExists(eventId, plotlineId, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plotline_factions?event_id=eq.{eventId}&plotline_id=eq.{plotlineId}&select=event_id,plotline_id,faction_id,created_at&order=created_at.asc");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list plotline faction links: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotlineFactionRow>>() ?? [];
        return Results.Ok(rows.Select(ToPlotlineFactionLinkDto));
    }

    private static async Task<IResult> UpsertPlotlineFaction(Guid eventId, Guid plotlineId, Guid factionId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await PlotlineExists(eventId, plotlineId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();
        if (!await FactionExists(eventId, factionId, url!, key!, httpClient, includeDeleted: false)) return Results.BadRequest("Faction not found in event.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_plotline_factions?on_conflict=plotline_id,faction_id");
        req.Headers.Add("Prefer", "return=representation,resolution=merge-duplicates");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { event_id = eventId, plotline_id = plotlineId, faction_id = factionId });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to upsert plotline faction link: {resp.StatusCode}");
        var row = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotlineFactionRow>>())?.FirstOrDefault();
        return row is null ? Results.NoContent() : Results.Ok(ToPlotlineFactionLinkDto(row));
    }

    private static async Task<IResult> DeletePlotlineFaction(Guid eventId, Guid plotlineId, Guid factionId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_plotline_factions?event_id=eq.{eventId}&plotline_id=eq.{plotlineId}&faction_id=eq.{factionId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete plotline faction link: {resp.StatusCode}");
    }

    private static async Task<IResult> ListPlotlineItems(Guid eventId, Guid plotlineId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await PlotlineExists(eventId, plotlineId, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plotline_items?event_id=eq.{eventId}&plotline_id=eq.{plotlineId}&select=event_id,plotline_id,item_id,created_at&order=created_at.asc");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list plotline item links: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotlineItemRow>>() ?? [];
        return Results.Ok(rows.Select(ToPlotlineItemLinkDto));
    }

    private static async Task<IResult> UpsertPlotlineItem(Guid eventId, Guid plotlineId, Guid itemId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await PlotlineExists(eventId, plotlineId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();
        if (!await ItemExists(eventId, itemId, url!, key!, httpClient, includeDeleted: false)) return Results.BadRequest("Item not found in event.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_plotline_items?on_conflict=plotline_id,item_id");
        req.Headers.Add("Prefer", "return=representation,resolution=merge-duplicates");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { event_id = eventId, plotline_id = plotlineId, item_id = itemId });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to upsert plotline item link: {resp.StatusCode}");
        var row = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotlineItemRow>>())?.FirstOrDefault();
        return row is null ? Results.NoContent() : Results.Ok(ToPlotlineItemLinkDto(row));
    }

    private static async Task<IResult> DeletePlotlineItem(Guid eventId, Guid plotlineId, Guid itemId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_plotline_items?event_id=eq.{eventId}&plotline_id=eq.{plotlineId}&item_id=eq.{itemId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete plotline item link: {resp.StatusCode}");
    }

    private static async Task<IResult> GetPlotlineInheritedLinks(Guid eventId, Guid plotlineId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await PlotlineExists(eventId, plotlineId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();

        var questIds = await GetPlotlineQuestIds(eventId, plotlineId, url!, key!, httpClient);
        if (questIds.Count == 0) return Results.Ok(new NarrativeInheritedLinksDto([], [], []));
        var joinedIds = string.Join(",", questIds.Select(q => q.ToString()));

        var charsReq = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quest_characters?event_id=eq.{eventId}&quest_id=in.({joinedIds})&select=character_id");
        var factionsReq = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quest_factions?event_id=eq.{eventId}&quest_id=in.({joinedIds})&select=faction_id");
        var itemsReq = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quest_items?event_id=eq.{eventId}&quest_id=in.({joinedIds})&select=item_id");
        AddHeaders(charsReq, key!);
        AddHeaders(factionsReq, key!);
        AddHeaders(itemsReq, key!);

        var charsTask = httpClient.SendAsync(charsReq);
        var factionsTask = httpClient.SendAsync(factionsReq);
        var itemsTask = httpClient.SendAsync(itemsReq);
        await Task.WhenAll(charsTask, factionsTask, itemsTask);

        var chars = charsTask.Result.IsSuccessStatusCode ? (await charsTask.Result.Content.ReadFromJsonAsync<List<QuestCharacterIdRow>>() ?? []) : [];
        var factions = factionsTask.Result.IsSuccessStatusCode ? (await factionsTask.Result.Content.ReadFromJsonAsync<List<QuestFactionIdRow>>() ?? []) : [];
        var items = itemsTask.Result.IsSuccessStatusCode ? (await itemsTask.Result.Content.ReadFromJsonAsync<List<QuestItemIdRow>>() ?? []) : [];

        return Results.Ok(new NarrativeInheritedLinksDto(
            CharacterIds: chars.Select(x => x.character_id).Distinct().ToList(),
            FactionIds: factions.Select(x => x.faction_id).Distinct().ToList(),
            ItemIds: items.Select(x => x.item_id).Distinct().ToList()
        ));
    }

    private static async Task<IResult> ListPlotlineDocuments(Guid eventId, Guid plotlineId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await PlotlineExists(eventId, plotlineId, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_document_links?event_id=eq.{eventId}&entity_type=eq.plotline&entity_id=eq.{plotlineId}&select=id,event_id,entity_type,entity_id,display_name,url,document_status,source_type,created_by,created_at&order=created_at.desc");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list plotline documents: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeDocumentLinkRow>>() ?? [];
        return Results.Ok(rows.Select(ToDocumentDto));
    }

    private static async Task<IResult> AddPlotlineGoogleDriveDocument(Guid eventId, Guid plotlineId, ClaimsPrincipal user, [FromBody] AddNarrativeGoogleDriveLinkRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz, NarrativeDocumentLinkService documentLinks)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await PlotlineExists(eventId, plotlineId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();

        if (string.IsNullOrWhiteSpace(request.DisplayName)) return Results.BadRequest("Display name is required.");
        documentLinks.ValidateGoogleDriveUrl(request.Url);

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_document_links");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            event_id = eventId,
            entity_type = "plotline",
            entity_id = plotlineId,
            display_name = request.DisplayName.Trim(),
            url = request.Url,
            document_status = request.DocumentStatus,
            source_type = "GoogleDrive",
            created_by = UserId(user)
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to add Google Drive link: {resp.StatusCode}");
        var created = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeDocumentLinkRow>>())?.FirstOrDefault();
        return created is null ? Results.Problem("Document link saved but payload missing.") : Results.Created($"/api/events/{eventId}/narrative/plotlines/{plotlineId}/documents/{created.id}", ToDocumentDto(created));
    }

    private static async Task<IResult> DeletePlotlineDocument(Guid eventId, Guid plotlineId, Guid documentId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await PlotlineExists(eventId, plotlineId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_document_links?id=eq.{documentId}&event_id=eq.{eventId}&entity_type=eq.plotline&entity_id=eq.{plotlineId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete document link: {resp.StatusCode}");
    }

    private static async Task<IResult> ListPlots(Guid eventId, ClaimsPrincipal user, [FromQuery] bool includeDeleted, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        var filters = new List<string>
        {
            "select=id,event_id,title,description,internal_notes,status,created_at,updated_at,deleted_at",
            $"event_id=eq.{eventId}",
            "order=created_at.desc"
        };
        if (!includeDeleted) filters.Add("deleted_at=is.null");
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plots?{string.Join("&", filters)}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list plots: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotRow>>() ?? [];
        return Results.Ok(rows.Select(r => ToPlotDto(r, access.CanWrite)));
    }

    private static async Task<IResult> CreatePlot(Guid eventId, ClaimsPrincipal user, [FromBody] CreatePlotRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (string.IsNullOrWhiteSpace(request.Title)) return Results.BadRequest("Title is required.");
        var trimmed = request.Title.Trim();
        if (await PlotTitleExists(eventId, trimmed, null, url!, key!, httpClient)) return Results.BadRequest("Plot title must be unique within event.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_plots");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            event_id = eventId,
            title = trimmed,
            description = request.Description,
            internal_notes = request.InternalNotes,
            status = NarrativeStatuses.Draft
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to create plot: {resp.StatusCode}");
        var created = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotRow>>())?.FirstOrDefault();
        return created is null ? Results.Problem("Plot created but no payload returned.") : Results.Created($"/api/events/{eventId}/narrative/plots/{created.id}", ToPlotDto(created, access.CanWrite));
    }

    private static async Task<IResult> GetPlotById(Guid eventId, Guid plotId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        var row = await GetPlot(eventId, plotId, url!, key!, httpClient, includeDeleted: true);
        return row is null ? Results.NotFound() : Results.Ok(ToPlotDto(row, access.CanWrite));
    }

    private static async Task<IResult> UpdatePlot(Guid eventId, Guid plotId, ClaimsPrincipal user, [FromBody] UpdatePlotRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var row = await GetPlot(eventId, plotId, url!, key!, httpClient, includeDeleted: true);
        if (row is null) return Results.NotFound();
        if (row.deleted_at.HasValue) return Results.BadRequest("Deleted plot cannot be edited.");
        if (row.status == NarrativeStatuses.Locked && (request.Title is not null || request.Description is not null))
            return Results.BadRequest("Locked plot allows editing internal notes only.");

        var nextTitle = request.Title?.Trim() ?? row.title;
        if (!string.Equals(nextTitle, row.title, StringComparison.OrdinalIgnoreCase) &&
            await PlotTitleExists(eventId, nextTitle, plotId, url!, key!, httpClient))
        {
            return Results.BadRequest("Plot title must be unique within event.");
        }

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_plots?id=eq.{plotId}&event_id=eq.{eventId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            title = nextTitle,
            description = request.Description ?? row.description,
            internal_notes = request.InternalNotes ?? row.internal_notes
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to update plot: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotRow>>())?.FirstOrDefault();
        return updated is null ? Results.Problem("Plot update payload missing.") : Results.Ok(ToPlotDto(updated, access.CanWrite));
    }

    private static async Task<IResult> ChangePlotStatus(Guid eventId, Guid plotId, ClaimsPrincipal user, [FromBody] ChangeNarrativeStatusRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!NarrativeStatuses.All.Contains(request.Status)) return Results.BadRequest("Unknown status.");
        var row = await GetPlot(eventId, plotId, url!, key!, httpClient, includeDeleted: true);
        if (row is null) return Results.NotFound();
        if (!NarrativeLifecycleService.CanTransition(row.status, request.Status))
            return Results.BadRequest($"Invalid status transition: {row.status} -> {request.Status}.");

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_plots?id=eq.{plotId}&event_id=eq.{eventId}");
        req.Headers.Add("Prefer", "return=representation");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { status = request.Status });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to change plot status: {resp.StatusCode}");
        var updated = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotRow>>())?.FirstOrDefault();
        return updated is null ? Results.Problem("Plot status payload missing.") : Results.Ok(ToPlotDto(updated, access.CanWrite));
    }

    private static async Task<IResult> SoftDeletePlot(Guid eventId, Guid plotId, ClaimsPrincipal user, [FromBody] NarrativeDeleteRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var row = await GetPlot(eventId, plotId, url!, key!, httpClient, includeDeleted: true);
        if (row is null) return Results.NotFound();
        if (row.deleted_at.HasValue) return Results.NoContent();

        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_plots?id=eq.{plotId}&event_id=eq.{eventId}");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { deleted_at = DateTimeOffset.UtcNow, deleted_by = UserId(user), deletion_reason = request.Reason });
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete plot: {resp.StatusCode}");
    }

    private static async Task<IResult> UndeletePlot(Guid eventId, Guid plotId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        var req = new HttpRequestMessage(HttpMethod.Patch, $"{url}/rest/v1/narrative_plots?id=eq.{plotId}&event_id=eq.{eventId}");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { deleted_at = (DateTimeOffset?)null, deleted_by = (Guid?)null, deletion_reason = (string?)null });
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to undelete plot: {resp.StatusCode}");
    }

    private static async Task<IResult> ListPlotPlotlines(Guid eventId, Guid plotId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await PlotExists(eventId, plotId, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plot_plotlines?event_id=eq.{eventId}&plot_id=eq.{plotId}&select=event_id,plot_id,plotline_id,sort_order,created_at&order=sort_order.asc");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list plot plotline links: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotPlotlineRow>>() ?? [];
        return Results.Ok(rows.Select(ToPlotPlotlineLinkDto));
    }

    private static async Task<IResult> UpsertPlotPlotline(Guid eventId, Guid plotId, Guid plotlineId, ClaimsPrincipal user, [FromBody] UpsertPlotPlotlineRequest request, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await PlotExists(eventId, plotId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();
        if (!await PlotlineExists(eventId, plotlineId, url!, key!, httpClient, includeDeleted: false)) return Results.BadRequest("Plotline not found in event.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_plot_plotlines?on_conflict=plot_id,plotline_id");
        req.Headers.Add("Prefer", "return=representation,resolution=merge-duplicates");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new
        {
            event_id = eventId,
            plot_id = plotId,
            plotline_id = plotlineId,
            sort_order = request.SortOrder
        });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to upsert plot-plotline link: {resp.StatusCode}");
        var row = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotPlotlineRow>>())?.FirstOrDefault();
        return row is null ? Results.NoContent() : Results.Ok(ToPlotPlotlineLinkDto(row));
    }

    private static async Task<IResult> DeletePlotPlotline(Guid eventId, Guid plotId, Guid plotlineId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_plot_plotlines?event_id=eq.{eventId}&plot_id=eq.{plotId}&plotline_id=eq.{plotlineId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete plot-plotline link: {resp.StatusCode}");
    }

    private static async Task<IResult> ListPlotCharacters(Guid eventId, Guid plotId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await PlotExists(eventId, plotId, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plot_characters?event_id=eq.{eventId}&plot_id=eq.{plotId}&select=event_id,plot_id,character_id,created_at&order=created_at.asc");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list plot character links: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotCharacterRow>>() ?? [];
        return Results.Ok(rows.Select(ToPlotCharacterLinkDto));
    }

    private static async Task<IResult> UpsertPlotCharacter(Guid eventId, Guid plotId, Guid characterId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await PlotExists(eventId, plotId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();
        if (!await CharacterExistsInEvent(eventId, characterId, url!, key!, httpClient)) return Results.BadRequest("Character not found in event.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_plot_characters?on_conflict=plot_id,character_id");
        req.Headers.Add("Prefer", "return=representation,resolution=merge-duplicates");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { event_id = eventId, plot_id = plotId, character_id = characterId });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to upsert plot character link: {resp.StatusCode}");
        var row = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotCharacterRow>>())?.FirstOrDefault();
        return row is null ? Results.NoContent() : Results.Ok(ToPlotCharacterLinkDto(row));
    }

    private static async Task<IResult> DeletePlotCharacter(Guid eventId, Guid plotId, Guid characterId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_plot_characters?event_id=eq.{eventId}&plot_id=eq.{plotId}&character_id=eq.{characterId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete plot character link: {resp.StatusCode}");
    }

    private static async Task<IResult> ListPlotFactions(Guid eventId, Guid plotId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await PlotExists(eventId, plotId, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plot_factions?event_id=eq.{eventId}&plot_id=eq.{plotId}&select=event_id,plot_id,faction_id,created_at&order=created_at.asc");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list plot faction links: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotFactionRow>>() ?? [];
        return Results.Ok(rows.Select(ToPlotFactionLinkDto));
    }

    private static async Task<IResult> UpsertPlotFaction(Guid eventId, Guid plotId, Guid factionId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await PlotExists(eventId, plotId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();
        if (!await FactionExists(eventId, factionId, url!, key!, httpClient, includeDeleted: false)) return Results.BadRequest("Faction not found in event.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_plot_factions?on_conflict=plot_id,faction_id");
        req.Headers.Add("Prefer", "return=representation,resolution=merge-duplicates");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { event_id = eventId, plot_id = plotId, faction_id = factionId });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to upsert plot faction link: {resp.StatusCode}");
        var row = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotFactionRow>>())?.FirstOrDefault();
        return row is null ? Results.NoContent() : Results.Ok(ToPlotFactionLinkDto(row));
    }

    private static async Task<IResult> DeletePlotFaction(Guid eventId, Guid plotId, Guid factionId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_plot_factions?event_id=eq.{eventId}&plot_id=eq.{plotId}&faction_id=eq.{factionId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete plot faction link: {resp.StatusCode}");
    }

    private static async Task<IResult> ListPlotItems(Guid eventId, Guid plotId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await PlotExists(eventId, plotId, url!, key!, httpClient, includeDeleted: true)) return Results.NotFound();

        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plot_items?event_id=eq.{eventId}&plot_id=eq.{plotId}&select=event_id,plot_id,item_id,created_at&order=created_at.asc");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to list plot item links: {resp.StatusCode}");
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotItemRow>>() ?? [];
        return Results.Ok(rows.Select(ToPlotItemLinkDto));
    }

    private static async Task<IResult> UpsertPlotItem(Guid eventId, Guid plotId, Guid itemId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();
        if (!await PlotExists(eventId, plotId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();
        if (!await ItemExists(eventId, itemId, url!, key!, httpClient, includeDeleted: false)) return Results.BadRequest("Item not found in event.");

        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/narrative_plot_items?on_conflict=plot_id,item_id");
        req.Headers.Add("Prefer", "return=representation,resolution=merge-duplicates");
        AddHeaders(req, key!);
        req.Content = JsonContent.Create(new { event_id = eventId, plot_id = plotId, item_id = itemId });
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return Results.Problem($"Failed to upsert plot item link: {resp.StatusCode}");
        var row = (await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotItemRow>>())?.FirstOrDefault();
        return row is null ? Results.NoContent() : Results.Ok(ToPlotItemLinkDto(row));
    }

    private static async Task<IResult> DeletePlotItem(Guid eventId, Guid plotId, Guid itemId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanWrite) return Results.Forbid();

        var req = new HttpRequestMessage(HttpMethod.Delete, $"{url}/rest/v1/narrative_plot_items?event_id=eq.{eventId}&plot_id=eq.{plotId}&item_id=eq.{itemId}");
        AddHeaders(req, key!);
        var resp = await httpClient.SendAsync(req);
        return resp.IsSuccessStatusCode ? Results.NoContent() : Results.Problem($"Failed to delete plot item link: {resp.StatusCode}");
    }

    private static async Task<IResult> GetPlotInheritedLinks(Guid eventId, Guid plotId, ClaimsPrincipal user, IConfiguration config, HttpClient httpClient, NarrativeAuthorizationService authz)
    {
        if (!TryConfig(config, out var url, out var key, out var error)) return error!;
        var access = await authz.ResolveEventAccessAsync(user, eventId, url!, key!);
        if (!access.CanRead) return Results.Forbid();
        if (!await PlotExists(eventId, plotId, url!, key!, httpClient, includeDeleted: false)) return Results.NotFound();

        var plotlineReq = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plot_plotlines?event_id=eq.{eventId}&plot_id=eq.{plotId}&select=plotline_id");
        AddHeaders(plotlineReq, key!);
        var plotlineResp = await httpClient.SendAsync(plotlineReq);
        if (!plotlineResp.IsSuccessStatusCode) return Results.Problem($"Failed to resolve plotline links: {plotlineResp.StatusCode}");
        var plotlineRows = await plotlineResp.Content.ReadFromJsonAsync<List<PlotlineIdRow>>() ?? [];
        if (plotlineRows.Count == 0) return Results.Ok(new NarrativeInheritedLinksDto([], [], []));

        var plotlineIds = string.Join(",", plotlineRows.Select(r => r.plotline_id.ToString()));
        var questReq = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plotline_quests?event_id=eq.{eventId}&plotline_id=in.({plotlineIds})&select=quest_id");
        AddHeaders(questReq, key!);
        var questResp = await httpClient.SendAsync(questReq);
        if (!questResp.IsSuccessStatusCode) return Results.Problem($"Failed to resolve plot quest links: {questResp.StatusCode}");
        var questRows = await questResp.Content.ReadFromJsonAsync<List<QuestIdRow>>() ?? [];
        var questIds = questRows.Select(r => r.quest_id).Distinct().ToList();
        if (questIds.Count == 0) return Results.Ok(new NarrativeInheritedLinksDto([], [], []));

        var joinedIds = string.Join(",", questIds.Select(x => x.ToString()));
        var charsReq = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quest_characters?event_id=eq.{eventId}&quest_id=in.({joinedIds})&select=character_id");
        var factionsReq = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quest_factions?event_id=eq.{eventId}&quest_id=in.({joinedIds})&select=faction_id");
        var itemsReq = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quest_items?event_id=eq.{eventId}&quest_id=in.({joinedIds})&select=item_id");
        AddHeaders(charsReq, key!);
        AddHeaders(factionsReq, key!);
        AddHeaders(itemsReq, key!);

        var charsTask = httpClient.SendAsync(charsReq);
        var factionsTask = httpClient.SendAsync(factionsReq);
        var itemsTask = httpClient.SendAsync(itemsReq);
        await Task.WhenAll(charsTask, factionsTask, itemsTask);

        var chars = charsTask.Result.IsSuccessStatusCode ? (await charsTask.Result.Content.ReadFromJsonAsync<List<QuestCharacterIdRow>>() ?? []) : [];
        var factions = factionsTask.Result.IsSuccessStatusCode ? (await factionsTask.Result.Content.ReadFromJsonAsync<List<QuestFactionIdRow>>() ?? []) : [];
        var items = itemsTask.Result.IsSuccessStatusCode ? (await itemsTask.Result.Content.ReadFromJsonAsync<List<QuestItemIdRow>>() ?? []) : [];

        return Results.Ok(new NarrativeInheritedLinksDto(
            CharacterIds: chars.Select(x => x.character_id).Distinct().ToList(),
            FactionIds: factions.Select(x => x.faction_id).Distinct().ToList(),
            ItemIds: items.Select(x => x.item_id).Distinct().ToList()
        ));
    }

    private static NarrativeQuestDto ToQuestDto(SupabaseNarrativeQuestRow row, bool canReadInternal) =>
        new(row.id, row.event_id, row.title, row.short_description, row.description, canReadInternal ? row.internal_notes : null, row.status, row.created_at, row.updated_at, row.deleted_at);

    private static NarrativeQuestStepCharacterDto ToQuestStepCharacterDto(SupabaseNarrativeQuestStepCharacterRow row) =>
        new(row.event_id, row.step_id, row.character_id, row.created_at);

    private static NarrativeQuestStepDto ToQuestStepDto(SupabaseNarrativeQuestStepRow row, bool canReadInternal) =>
        new(row.id, row.quest_id, row.event_id, row.sort_order, row.summary, canReadInternal ? row.notes : null, row.created_at, row.updated_at);

    private static NarrativeDocumentLinkDto ToDocumentDto(SupabaseNarrativeDocumentLinkRow row) =>
        new(row.id, row.event_id, row.entity_type, row.entity_id, row.display_name, row.url, row.document_status, row.source_type, row.created_by, row.created_at);

    private static NarrativeFactionDto ToFactionDto(SupabaseNarrativeFactionRow row, bool canReadInternal) =>
        new(row.id, row.event_id, row.name, row.sigil_url, row.description, row.goals, canReadInternal ? row.internal_notes : null, row.status, row.created_at, row.updated_at, row.deleted_at);

    private static NarrativeItemDto ToItemDto(SupabaseNarrativeItemRow row, bool canReadInternal) =>
        new(row.id, row.event_id, row.name, row.description, canReadInternal ? row.internal_notes : null, row.status, row.is_multi_copy, row.max_copies, row.created_at, row.updated_at, row.deleted_at);

    private static NarrativeFactionMemberDto ToFactionMemberDto(SupabaseNarrativeFactionMemberRow row) =>
        new(row.event_id, row.faction_id, row.character_id, row.role, row.created_at);

    private static NarrativeItemAssignmentDto ToItemAssignmentDto(SupabaseNarrativeItemAssignmentRow row, bool canReadInternal) =>
        new(row.event_id, row.item_id, row.character_id, row.assigned_by, row.assigned_at, canReadInternal ? row.notes : null);

    private static NarrativePlotlineDto ToPlotlineDto(SupabaseNarrativePlotlineRow row, bool canReadInternal) =>
        new(row.id, row.event_id, row.title, row.description, canReadInternal ? row.internal_notes : null, row.status, row.created_at, row.updated_at, row.deleted_at);

    private static NarrativePlotlinePhaseDto ToPlotlinePhaseDto(SupabaseNarrativePlotlinePhaseRow row) =>
        new(row.id, row.plotline_id, row.event_id, row.sort_order, row.title, row.summary, row.created_at, row.updated_at);

    private static NarrativePlotDto ToPlotDto(SupabaseNarrativePlotRow row, bool canReadInternal) =>
        new(row.id, row.event_id, row.title, row.description, canReadInternal ? row.internal_notes : null, row.status, row.created_at, row.updated_at, row.deleted_at);

    private static NarrativePlotlineQuestLinkDto ToPlotlineQuestLinkDto(SupabaseNarrativePlotlineQuestRow row) =>
        new(row.event_id, row.plotline_id, row.quest_id, row.phase_id, row.sort_order, row.created_at);

    private static NarrativePlotPlotlineLinkDto ToPlotPlotlineLinkDto(SupabaseNarrativePlotPlotlineRow row) =>
        new(row.event_id, row.plot_id, row.plotline_id, row.sort_order, row.created_at);

    private static NarrativeQuestCharacterLinkDto ToQuestCharacterLinkDto(SupabaseNarrativeQuestCharacterRow row) =>
        new(row.event_id, row.quest_id, row.character_id, row.role, row.created_at);

    private static NarrativeQuestFactionLinkDto ToQuestFactionLinkDto(SupabaseNarrativeQuestFactionRow row) =>
        new(row.event_id, row.quest_id, row.faction_id, row.created_at);

    private static NarrativeQuestItemLinkDto ToQuestItemLinkDto(SupabaseNarrativeQuestItemRow row) =>
        new(row.event_id, row.quest_id, row.item_id, row.created_at);

    private static NarrativeQuestStepItemLinkDto ToQuestStepItemLinkDto(SupabaseNarrativeQuestStepItemRow row) =>
        new(row.event_id, row.step_id, row.item_id, row.link_type, row.created_at);

    private static NarrativeFactionRelationshipDto ToFactionRelationshipDto(SupabaseNarrativeFactionRelationshipRow row, bool canReadInternal) =>
        new(
            row.id,
            row.event_id,
            row.source_faction_id,
            row.target_faction_id,
            row.target_character_id,
            row.relation_type,
            row.relation_mode,
            row.mirror_group_id,
            row.is_auto_mirror,
            row.created_at,
            row.updated_at
        );

    private static NarrativePlotlineCharacterLinkDto ToPlotlineCharacterLinkDto(SupabaseNarrativePlotlineCharacterRow row) =>
        new(row.event_id, row.plotline_id, row.character_id, row.created_at);

    private static NarrativePlotlineFactionLinkDto ToPlotlineFactionLinkDto(SupabaseNarrativePlotlineFactionRow row) =>
        new(row.event_id, row.plotline_id, row.faction_id, row.created_at);

    private static NarrativePlotlineItemLinkDto ToPlotlineItemLinkDto(SupabaseNarrativePlotlineItemRow row) =>
        new(row.event_id, row.plotline_id, row.item_id, row.created_at);

    private static NarrativePlotCharacterLinkDto ToPlotCharacterLinkDto(SupabaseNarrativePlotCharacterRow row) =>
        new(row.event_id, row.plot_id, row.character_id, row.created_at);

    private static NarrativePlotFactionLinkDto ToPlotFactionLinkDto(SupabaseNarrativePlotFactionRow row) =>
        new(row.event_id, row.plot_id, row.faction_id, row.created_at);

    private static NarrativePlotItemLinkDto ToPlotItemLinkDto(SupabaseNarrativePlotItemRow row) =>
        new(row.event_id, row.plot_id, row.item_id, row.created_at);

    private static async Task<bool> QuestExists(Guid eventId, Guid questId, string url, string key, HttpClient httpClient, bool includeDeleted) =>
        await GetQuest(eventId, questId, url, key, httpClient, includeDeleted) is not null;

    private static async Task<SupabaseNarrativeQuestRow?> GetQuest(Guid eventId, Guid questId, string url, string key, HttpClient httpClient, bool includeDeleted)
    {
        var filters = new List<string>
        {
            $"id=eq.{questId}",
            $"event_id=eq.{eventId}",
            "select=id,event_id,title,short_description,description,internal_notes,status,created_at,updated_at,deleted_at",
            "limit=1"
        };
        if (!includeDeleted) filters.Add("deleted_at=is.null");
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quests?{string.Join("&", filters)}");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestRow>>();
        return rows?.FirstOrDefault();
    }

    private static async Task<SupabaseNarrativeQuestStepRow?> GetQuestStep(Guid eventId, Guid questId, Guid stepId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quest_steps?id=eq.{stepId}&quest_id=eq.{questId}&event_id=eq.{eventId}&select=id,quest_id,event_id,sort_order,summary,notes,created_at,updated_at&limit=1");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeQuestStepRow>>();
        return rows?.FirstOrDefault();
    }

    private static async Task<bool> FactionExists(Guid eventId, Guid factionId, string url, string key, HttpClient httpClient, bool includeDeleted) =>
        await GetFaction(eventId, factionId, url, key, httpClient, includeDeleted) is not null;

    private static async Task<SupabaseNarrativeFactionRow?> GetFaction(Guid eventId, Guid factionId, string url, string key, HttpClient httpClient, bool includeDeleted)
    {
        var filters = new List<string>
        {
            $"id=eq.{factionId}",
            $"event_id=eq.{eventId}",
            "select=id,event_id,name,sigil_url,description,goals,internal_notes,status,created_at,updated_at,deleted_at",
            "limit=1"
        };
        if (!includeDeleted) filters.Add("deleted_at=is.null");
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_factions?{string.Join("&", filters)}");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeFactionRow>>();
        return rows?.FirstOrDefault();
    }

    private static async Task<bool> ItemExists(Guid eventId, Guid itemId, string url, string key, HttpClient httpClient, bool includeDeleted) =>
        await GetItem(eventId, itemId, url, key, httpClient, includeDeleted) is not null;

    private static async Task<SupabaseNarrativeItemRow?> GetItem(Guid eventId, Guid itemId, string url, string key, HttpClient httpClient, bool includeDeleted)
    {
        var filters = new List<string>
        {
            $"id=eq.{itemId}",
            $"event_id=eq.{eventId}",
            "select=id,event_id,name,description,internal_notes,status,is_multi_copy,max_copies,created_at,updated_at,deleted_at",
            "limit=1"
        };
        if (!includeDeleted) filters.Add("deleted_at=is.null");
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_items?{string.Join("&", filters)}");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeItemRow>>();
        return rows?.FirstOrDefault();
    }

    private static async Task<bool> PlotlineExists(Guid eventId, Guid plotlineId, string url, string key, HttpClient httpClient, bool includeDeleted) =>
        await GetPlotline(eventId, plotlineId, url, key, httpClient, includeDeleted) is not null;

    private static async Task<SupabaseNarrativePlotlineRow?> GetPlotline(Guid eventId, Guid plotlineId, string url, string key, HttpClient httpClient, bool includeDeleted)
    {
        var filters = new List<string>
        {
            $"id=eq.{plotlineId}",
            $"event_id=eq.{eventId}",
            "select=id,event_id,title,description,internal_notes,status,created_at,updated_at,deleted_at",
            "limit=1"
        };
        if (!includeDeleted) filters.Add("deleted_at=is.null");
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plotlines?{string.Join("&", filters)}");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotlineRow>>();
        return rows?.FirstOrDefault();
    }

    private static async Task<SupabaseNarrativePlotlinePhaseRow?> GetPlotlinePhase(Guid eventId, Guid plotlineId, Guid phaseId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plotline_phases?id=eq.{phaseId}&event_id=eq.{eventId}&plotline_id=eq.{plotlineId}&select=id,plotline_id,event_id,sort_order,title,summary,created_at,updated_at&limit=1");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotlinePhaseRow>>();
        return rows?.FirstOrDefault();
    }

    private static async Task<bool> PlotExists(Guid eventId, Guid plotId, string url, string key, HttpClient httpClient, bool includeDeleted) =>
        await GetPlot(eventId, plotId, url, key, httpClient, includeDeleted) is not null;

    private static async Task<SupabaseNarrativePlotRow?> GetPlot(Guid eventId, Guid plotId, string url, string key, HttpClient httpClient, bool includeDeleted)
    {
        var filters = new List<string>
        {
            $"id=eq.{plotId}",
            $"event_id=eq.{eventId}",
            "select=id,event_id,title,description,internal_notes,status,created_at,updated_at,deleted_at",
            "limit=1"
        };
        if (!includeDeleted) filters.Add("deleted_at=is.null");
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plots?{string.Join("&", filters)}");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativePlotRow>>();
        return rows?.FirstOrDefault();
    }

    private static async Task<bool> QuestTitleExists(Guid eventId, string title, Guid? excludingQuestId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_quests?event_id=eq.{eventId}&title=ilike.{Uri.EscapeDataString(title)}&deleted_at=is.null&select=id&limit=10");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return false;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeIdRow>>() ?? [];
        return rows.Any(x => !excludingQuestId.HasValue || x.id != excludingQuestId.Value);
    }

    private static string? NormalizeQuestShortDescription(string? value)
    {
        if (value is null) return null;
        var normalized = value.Trim();
        return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
    }

    private static async Task<bool> FactionNameExists(Guid eventId, string name, Guid? excludingFactionId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_factions?event_id=eq.{eventId}&name=ilike.{Uri.EscapeDataString(name)}&deleted_at=is.null&select=id&limit=10");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return false;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeIdRow>>() ?? [];
        return rows.Any(x => !excludingFactionId.HasValue || x.id != excludingFactionId.Value);
    }

    private static async Task<bool> ItemNameExists(Guid eventId, string name, Guid? excludingItemId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_items?event_id=eq.{eventId}&name=ilike.{Uri.EscapeDataString(name)}&deleted_at=is.null&select=id&limit=10");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return false;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeIdRow>>() ?? [];
        return rows.Any(x => !excludingItemId.HasValue || x.id != excludingItemId.Value);
    }

    private static async Task<bool> PlotlineTitleExists(Guid eventId, string title, Guid? excludingPlotlineId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plotlines?event_id=eq.{eventId}&title=ilike.{Uri.EscapeDataString(title)}&deleted_at=is.null&select=id&limit=10");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return false;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeIdRow>>() ?? [];
        return rows.Any(x => !excludingPlotlineId.HasValue || x.id != excludingPlotlineId.Value);
    }

    private static async Task<bool> PlotTitleExists(Guid eventId, string title, Guid? excludingPlotId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plots?event_id=eq.{eventId}&title=ilike.{Uri.EscapeDataString(title)}&deleted_at=is.null&select=id&limit=10");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return false;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeIdRow>>() ?? [];
        return rows.Any(x => !excludingPlotId.HasValue || x.id != excludingPlotId.Value);
    }

    private static async Task<List<Guid>> GetPlotlineQuestIds(Guid eventId, Guid plotlineId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_plotline_quests?event_id=eq.{eventId}&plotline_id=eq.{plotlineId}&select=quest_id");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return [];
        var rows = await resp.Content.ReadFromJsonAsync<List<QuestIdRow>>() ?? [];
        return rows.Select(r => r.quest_id).Distinct().ToList();
    }

    private static async Task<SupabaseNarrativeFactionRelationshipRow?> GetFactionRelationship(Guid eventId, Guid factionId, Guid relationshipId, string url, string key, HttpClient httpClient)
    {
        var query = $"{url}/rest/v1/narrative_faction_relationships" +
                    $"?id=eq.{relationshipId}" +
                    $"&event_id=eq.{eventId}" +
                    $"&or=(source_faction_id.eq.{factionId},target_faction_id.eq.{factionId})" +
                    "&select=id,event_id,source_faction_id,target_faction_id,target_character_id,relation_type,relation_mode,mirror_group_id,is_auto_mirror,created_at,updated_at" +
                    "&limit=1";
        var req = new HttpRequestMessage(HttpMethod.Get, query);
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return null;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeFactionRelationshipRow>>();
        return rows?.FirstOrDefault();
    }

    private static bool IsValidRelationshipMode(string mode) =>
        string.Equals(mode, "directional", StringComparison.OrdinalIgnoreCase)
        || string.Equals(mode, "auto_mirrored", StringComparison.OrdinalIgnoreCase);

    private static bool IsAutoMirrored(string mode) =>
        string.Equals(mode, "auto_mirrored", StringComparison.OrdinalIgnoreCase);

    private static bool IsValidStepItemLinkType(string linkType) =>
        string.Equals(linkType, "required", StringComparison.OrdinalIgnoreCase)
        || string.Equals(linkType, "loot", StringComparison.OrdinalIgnoreCase);

    private static async Task<bool> CharacterExistsInEvent(Guid eventId, Guid characterId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/characters?id=eq.{characterId}&event_id=eq.{eventId}&deleted_at=is.null&select=id&limit=1");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return false;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeIdRow>>() ?? [];
        return rows.Count > 0;
    }

    private static async Task<int> CountItemAssignments(Guid eventId, Guid itemId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_item_character_assignments?event_id=eq.{eventId}&item_id=eq.{itemId}&select=character_id");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return 0;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeIdRow>>() ?? [];
        return rows.Count;
    }

    private static async Task<bool> IsItemAssignedToCharacter(Guid eventId, Guid itemId, Guid characterId, string url, string key, HttpClient httpClient)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"{url}/rest/v1/narrative_item_character_assignments?event_id=eq.{eventId}&item_id=eq.{itemId}&character_id=eq.{characterId}&select=character_id&limit=1");
        AddHeaders(req, key);
        var resp = await httpClient.SendAsync(req);
        if (!resp.IsSuccessStatusCode) return false;
        var rows = await resp.Content.ReadFromJsonAsync<List<SupabaseNarrativeIdRow>>() ?? [];
        return rows.Count > 0;
    }

    private sealed record QuestIdRow(Guid quest_id);
    private sealed record PlotlineIdRow(Guid plotline_id);
    private sealed record QuestCharacterIdRow(Guid character_id);
    private sealed record QuestFactionIdRow(Guid faction_id);
    private sealed record QuestItemIdRow(Guid item_id);

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



