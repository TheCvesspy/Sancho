using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Narrative.Endpoints;
using Narrative.Models;
using Narrative.Services;
using Xunit;

namespace Narrative.Tests;

public class NarrativeEndpointsIntegrationTests
{
    [Fact]
    public async Task User_Without_Access_Cannot_List_Items()
    {
        var eventId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var fake = new FakeSupabaseHandler();
        fake.SeedEvent(eventId, "active");

        using var client = CreateClient(fake);
        AddAuthHeaders(client, userId);

        var response = await client.GetAsync($"/api/events/{eventId}/narrative/items?includeDeleted=false");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Item_Assignment_Fails_When_Copy_Limit_Reached()
    {
        var eventId = Guid.NewGuid();
        var managerId = Guid.NewGuid();
        var characterA = Guid.NewGuid();
        var characterB = Guid.NewGuid();
        var fake = new FakeSupabaseHandler();
        fake.SeedEvent(eventId, "active");
        fake.SeedManager(eventId, managerId);
        fake.SeedCharacter(eventId, characterA);
        fake.SeedCharacter(eventId, characterB);

        using var client = CreateClient(fake);
        AddAuthHeaders(client, managerId);

        var createResp = await client.PostAsJsonAsync($"/api/events/{eventId}/narrative/items", new CreateItemRequest(
            Name: "Seal of House",
            Description: "Unique plot item",
            InternalNotes: null,
            IsMultiCopy: true,
            MaxCopies: 1));
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);
        var createdItem = await createResp.Content.ReadFromJsonAsync<NarrativeItemDto>();
        Assert.NotNull(createdItem);

        var firstAssign = await client.PutAsJsonAsync(
            $"/api/events/{eventId}/narrative/items/{createdItem!.Id}/assignments/{characterA}",
            new ItemAssignmentRequest("first"));
        Assert.Equal(HttpStatusCode.OK, firstAssign.StatusCode);

        var secondAssign = await client.PutAsJsonAsync(
            $"/api/events/{eventId}/narrative/items/{createdItem.Id}/assignments/{characterB}",
            new ItemAssignmentRequest("second"));
        Assert.Equal(HttpStatusCode.BadRequest, secondAssign.StatusCode);
        var body = await secondAssign.Content.ReadAsStringAsync();
        Assert.Contains("copy limit reached", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AutoMirrored_Faction_Relationship_Creates_Reciprocal_Row()
    {
        var eventId = Guid.NewGuid();
        var managerId = Guid.NewGuid();
        var factionA = Guid.NewGuid();
        var factionB = Guid.NewGuid();
        var fake = new FakeSupabaseHandler();
        fake.SeedEvent(eventId, "active");
        fake.SeedManager(eventId, managerId);
        fake.SeedFaction(eventId, factionA, "House A");
        fake.SeedFaction(eventId, factionB, "House B");

        using var client = CreateClient(fake);
        AddAuthHeaders(client, managerId);

        var response = await client.PostAsJsonAsync(
            $"/api/events/{eventId}/narrative/factions/{factionA}/relationships",
            new CreateFactionRelationshipRequest(
                TargetFactionId: factionB,
                TargetCharacterId: null,
                RelationType: "ally",
                RelationMode: "auto_mirrored"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(2, fake.Relationships.Count);

        var primary = fake.Relationships.Single(x => x.SourceFactionId == factionA && x.TargetFactionId == factionB);
        var mirror = fake.Relationships.Single(x => x.SourceFactionId == factionB && x.TargetFactionId == factionA);
        Assert.False(primary.IsAutoMirror);
        Assert.True(mirror.IsAutoMirror);
        Assert.NotNull(primary.MirrorGroupId);
        Assert.Equal(primary.MirrorGroupId, mirror.MirrorGroupId);
    }

    [Fact]
    public async Task EventManager_For_Another_Event_Cannot_Create_Item()
    {
        var managedEventId = Guid.NewGuid();
        var targetEventId = Guid.NewGuid();
        var managerId = Guid.NewGuid();
        var fake = new FakeSupabaseHandler();
        fake.SeedEvent(managedEventId, "active");
        fake.SeedEvent(targetEventId, "active");

        using var client = CreateClient(fake);
        AddAuthHeaders(client, managerId, eventRoles: [$"{managedEventId}:EventManager"]);

        var response = await client.PostAsJsonAsync(
            $"/api/events/{targetEventId}/narrative/items",
            new CreateItemRequest(
                Name: "Cross Event Item",
                Description: "Should fail",
                InternalNotes: null,
                IsMultiCopy: false,
                MaxCopies: null));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task EventManager_Without_EventClaims_Can_Still_Create_Item_Via_DbFallback()
    {
        var eventId = Guid.NewGuid();
        var managerId = Guid.NewGuid();
        var fake = new FakeSupabaseHandler();
        fake.SeedEvent(eventId, "active");
        fake.SeedManager(eventId, managerId);

        using var client = CreateClient(fake);
        AddAuthHeaders(client, managerId);

        var response = await client.PostAsJsonAsync(
            $"/api/events/{eventId}/narrative/items",
            new CreateItemRequest(
                Name: "Fallback Item",
                Description: "Should pass",
                InternalNotes: null,
                IsMultiCopy: false,
                MaxCopies: null));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }


    [Fact]
    public async Task EventManager_Can_Create_And_Get_Dungeon_Location_With_Embedded_Floors_And_Rooms()
    {
        var eventId = Guid.NewGuid();
        var managerId = Guid.NewGuid();
        var fake = new FakeSupabaseHandler();
        fake.SeedEvent(eventId, "active");
        fake.SeedManager(eventId, managerId);

        using var client = CreateClient(fake);
        AddAuthHeaders(client, managerId);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/events/{eventId}/narrative/locations",
            new CreateNarrativeLocationRequest(
                Name: "Dark Dungeon",
                Description: "Below the hill",
                InternalNotes: null,
                LocationType: "dungeon"));

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<NarrativeLocationDto>();
        Assert.NotNull(created);

        var floorId = Guid.NewGuid();
        var roomId = Guid.NewGuid();
        fake.SeedFloor(eventId, created!.Id, floorId, "Basement", 1);
        fake.SeedRoom(eventId, created.Id, floorId, roomId, "Cellar", 2);

        var detailResponse = await client.GetAsync($"/api/events/{eventId}/narrative/locations/{created.Id}");
        Assert.Equal(HttpStatusCode.OK, detailResponse.StatusCode);
        var detail = await detailResponse.Content.ReadFromJsonAsync<NarrativeLocationDetailDto>();
        Assert.NotNull(detail);
        Assert.Equal("dungeon", detail!.LocationType);
        Assert.Single(detail.Floors);
        Assert.Equal("Basement", detail.Floors[0].Name);
        Assert.Single(detail.Floors[0].Rooms);
        Assert.Equal("Cellar", detail.Floors[0].Rooms[0].Name);
    }

    [Fact]
    public async Task Basic_Location_Rejects_Floor_Creation()
    {
        var eventId = Guid.NewGuid();
        var managerId = Guid.NewGuid();
        var fake = new FakeSupabaseHandler();
        fake.SeedEvent(eventId, "active");
        fake.SeedManager(eventId, managerId);

        using var client = CreateClient(fake);
        AddAuthHeaders(client, managerId);

        var createResponse = await client.PostAsJsonAsync(
            $"/api/events/{eventId}/narrative/locations",
            new CreateNarrativeLocationRequest(
                Name: "Village Square",
                Description: null,
                InternalNotes: null,
                LocationType: "basic"));
        var created = await createResponse.Content.ReadFromJsonAsync<NarrativeLocationDto>();
        Assert.NotNull(created);

        var floorResponse = await client.PostAsJsonAsync(
            $"/api/events/{eventId}/narrative/locations/{created!.Id}/floors",
            new CreateDungeonFloorRequest(
                Name: "Impossible Floor",
                Description: null,
                InternalNotes: null,
                SortOrder: 0));

        Assert.Equal(HttpStatusCode.BadRequest, floorResponse.StatusCode);
        var body = await floorResponse.Content.ReadAsStringAsync();
        Assert.Contains("dungeon", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Quest_Location_Links_Hide_Deleted_Locations_By_Default_And_Show_Them_When_Requested()
    {
        var eventId = Guid.NewGuid();
        var managerId = Guid.NewGuid();
        var questId = Guid.NewGuid();
        var activeLocationId = Guid.NewGuid();
        var deletedLocationId = Guid.NewGuid();
        var fake = new FakeSupabaseHandler();
        fake.SeedEvent(eventId, "active");
        fake.SeedManager(eventId, managerId);
        fake.SeedQuest(eventId, questId, "Find the Gate");
        fake.SeedLocation(eventId, activeLocationId, "Gatehouse", "basic");
        fake.SeedLocation(eventId, deletedLocationId, "Forgotten Crypt", "basic", deletedAt: DateTimeOffset.UtcNow);
        fake.QuestLocationLinks.Add(new QuestLocationLinkState(eventId, questId, activeLocationId, null, null, DateTimeOffset.UtcNow));
        fake.QuestLocationLinks.Add(new QuestLocationLinkState(eventId, questId, deletedLocationId, null, null, DateTimeOffset.UtcNow));

        using var client = CreateClient(fake);
        AddAuthHeaders(client, managerId);

        var defaultResponse = await client.GetAsync($"/api/events/{eventId}/narrative/quests/{questId}/links/locations");
        Assert.Equal(HttpStatusCode.OK, defaultResponse.StatusCode);
        var defaultLinks = await defaultResponse.Content.ReadFromJsonAsync<List<NarrativeLocationLinkDto>>();
        Assert.NotNull(defaultLinks);
        Assert.Single(defaultLinks!);
        Assert.Equal(activeLocationId, defaultLinks[0].LocationId);

        var includeDeletedResponse = await client.GetAsync($"/api/events/{eventId}/narrative/quests/{questId}/links/locations?includeDeleted=true");
        Assert.Equal(HttpStatusCode.OK, includeDeletedResponse.StatusCode);
        var allLinks = await includeDeletedResponse.Content.ReadFromJsonAsync<List<NarrativeLocationLinkDto>>();
        Assert.NotNull(allLinks);
        Assert.Equal(2, allLinks!.Count);
    }
    private static HttpClient CreateClient(FakeSupabaseHandler fakeSupabase)
    {
        var builder = new WebHostBuilder()
            .ConfigureAppConfiguration(cfg =>
            {
                cfg.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Supabase:Url"] = "https://supabase.test",
                    ["Supabase:ServiceRoleKey"] = "service-role-test-key"
                });
            })
            .ConfigureServices(services =>
            {
                services.AddRouting();
                services.AddAuthentication("Test").AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", _ => { });
                services.AddAuthorization();

                services.AddSingleton(fakeSupabase);
                services.AddSingleton<HttpMessageHandler>(fakeSupabase);
                services.AddScoped(_ => new HttpClient(fakeSupabase));
                services.AddScoped<NarrativeAuthorizationService>();
                services.AddScoped<NarrativeDocumentLinkService>();
            })
            .Configure(app =>
            {
                app.UseRouting();
                app.UseAuthentication();
                app.UseAuthorization();
                app.UseEndpoints(endpoints => endpoints.MapNarrativeEndpoints());
            });

        var server = new TestServer(builder);
        return server.CreateClient();
    }

    private static void AddAuthHeaders(
        HttpClient client,
        Guid userId,
        bool isSystemAdmin = false,
        string? orgRole = null,
        IEnumerable<string>? eventRoles = null,
        IEnumerable<string>? eventPermissions = null)
    {
        client.DefaultRequestHeaders.Remove("X-Test-User-Id");
        client.DefaultRequestHeaders.Remove("X-Test-System-Admin");
        client.DefaultRequestHeaders.Remove("X-Test-Org-Role");
        client.DefaultRequestHeaders.Remove("X-Test-Event-Role");
        client.DefaultRequestHeaders.Remove("X-Test-Event-Permission");
        client.DefaultRequestHeaders.Add("X-Test-User-Id", userId.ToString());
        if (isSystemAdmin) client.DefaultRequestHeaders.Add("X-Test-System-Admin", "true");
        if (!string.IsNullOrWhiteSpace(orgRole)) client.DefaultRequestHeaders.Add("X-Test-Org-Role", orgRole);
        if (eventRoles is not null)
        {
            foreach (var eventRole in eventRoles.Where(x => !string.IsNullOrWhiteSpace(x)))
            {
                client.DefaultRequestHeaders.Add("X-Test-Event-Role", eventRole);
            }
        }

        if (eventPermissions is not null)
        {
            foreach (var eventPermission in eventPermissions.Where(x => !string.IsNullOrWhiteSpace(x)))
            {
                client.DefaultRequestHeaders.Add("X-Test-Event-Permission", eventPermission);
            }
        }
    }
}

internal sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public TestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, System.Text.Encodings.Web.UrlEncoder encoder)
        : base(options, logger, encoder) { }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var userIdRaw = Request.Headers["X-Test-User-Id"].ToString();
        if (!Guid.TryParse(userIdRaw, out var userId))
            return Task.FromResult(AuthenticateResult.Fail("Missing X-Test-User-Id header"));

        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, userId.ToString()) };
        if (string.Equals(Request.Headers["X-Test-System-Admin"], "true", StringComparison.OrdinalIgnoreCase))
            claims.Add(new Claim("sancho:system_admin", "true"));
        var orgRole = Request.Headers["X-Test-Org-Role"].ToString();
        if (!string.IsNullOrWhiteSpace(orgRole))
            claims.Add(new Claim("sancho:org_role", orgRole));
        foreach (var eventRole in Request.Headers["X-Test-Event-Role"])
        {
            if (!string.IsNullOrWhiteSpace(eventRole))
            {
                claims.Add(new Claim("sancho:event_role", eventRole));
            }
        }

        foreach (var eventPermission in Request.Headers["X-Test-Event-Permission"])
        {
            if (string.IsNullOrWhiteSpace(eventPermission))
            {
                continue;
            }

            var parts = eventPermission.Split(':', 3, StringSplitOptions.TrimEntries);
            if (parts.Length == 3 &&
                Guid.TryParse(parts[0], out var eventId) &&
                !string.IsNullOrWhiteSpace(parts[1]) &&
                !string.IsNullOrWhiteSpace(parts[2]))
            {
                claims.Add(new Claim($"sancho:permission:{eventId}:{parts[1]}", parts[2]));
            }
        }

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name)));
    }
}

internal sealed class FakeSupabaseHandler : HttpMessageHandler
{
    public Dictionary<Guid, EventState> Events { get; } = new();
    public HashSet<(Guid EventId, Guid UserId)> Managers { get; } = [];
    public Dictionary<(Guid EventId, Guid UserId), string> Permissions { get; } = new();
    public Dictionary<Guid, CharacterState> Characters { get; } = new();
    public Dictionary<Guid, FactionState> Factions { get; } = new();
    public Dictionary<Guid, QuestState> Quests { get; } = new();
    public Dictionary<Guid, LocationState> Locations { get; } = new();
    public Dictionary<Guid, DungeonFloorState> Floors { get; } = new();
    public Dictionary<Guid, DungeonRoomState> Rooms { get; } = new();
    public List<QuestLocationLinkState> QuestLocationLinks { get; } = [];
    public Dictionary<Guid, ItemState> Items { get; } = new();
    public List<ItemAssignmentState> ItemAssignments { get; } = [];
    public List<FactionRelationshipState> Relationships { get; } = [];

    public void SeedEvent(Guid eventId, string status) => Events[eventId] = new(eventId, status, null);
    public void SeedManager(Guid eventId, Guid userId) => Managers.Add((eventId, userId));
    public void SetPermission(Guid eventId, Guid userId, string permission) => Permissions[(eventId, userId)] = permission;
    public void SeedCharacter(Guid eventId, Guid characterId) => Characters[characterId] = new(characterId, eventId, null);
    public void SeedFaction(Guid eventId, Guid factionId, string name) => Factions[factionId] = new(factionId, eventId, name, null);
    public void SeedQuest(Guid eventId, Guid questId, string title, DateTimeOffset? deletedAt = null) => Quests[questId] = new(questId, eventId, title, deletedAt);
    public void SeedLocation(Guid eventId, Guid locationId, string name, string locationType, string status = "Draft", DateTimeOffset? deletedAt = null) => Locations[locationId] = new(locationId, eventId, name, null, null, locationType, status, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow, deletedAt);
    public void SeedFloor(Guid eventId, Guid locationId, Guid floorId, string name, int sortOrder = 0) => Floors[floorId] = new(floorId, locationId, eventId, sortOrder, name, null, null, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow);
    public void SeedRoom(Guid eventId, Guid locationId, Guid floorId, Guid roomId, string name, int sortOrder = 0) => Rooms[roomId] = new(roomId, floorId, locationId, eventId, sortOrder, name, null, null, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow);

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var path = request.RequestUri?.AbsolutePath ?? string.Empty;
        var query = request.RequestUri?.Query ?? string.Empty;

        if (path.EndsWith("/rest/v1/events", StringComparison.OrdinalIgnoreCase) && request.Method == HttpMethod.Get)
        {
            var eventId = TryGuid(query, "id");
            if (eventId.HasValue && Events.TryGetValue(eventId.Value, out var ev)) return JsonOk(new[] { ev.ToRow() });
            return JsonOk(Array.Empty<object>());
        }

        if (path.EndsWith("/rest/v1/event_members", StringComparison.OrdinalIgnoreCase) && request.Method == HttpMethod.Get)
        {
            var eventId = TryGuid(query, "event_id");
            var userId = TryGuid(query, "user_id");
            var rows = Managers
                .Where(x => (!eventId.HasValue || x.EventId == eventId) && (!userId.HasValue || x.UserId == userId))
                .Select(x => new { user_id = x.UserId, role = "EventManager" })
                .ToList();
            return JsonOk(rows);
        }

        if (path.EndsWith("/rest/v1/event_member_permissions", StringComparison.OrdinalIgnoreCase) && request.Method == HttpMethod.Get)
        {
            var eventId = TryGuid(query, "event_id");
            var userId = TryGuid(query, "user_id");
            var rows = Permissions
                .Where(x => (!eventId.HasValue || x.Key.EventId == eventId) && (!userId.HasValue || x.Key.UserId == userId))
                .Select(x => new { permission = x.Value })
                .ToList();
            return JsonOk(rows);
        }

        if (path.EndsWith("/rest/v1/characters", StringComparison.OrdinalIgnoreCase) && request.Method == HttpMethod.Get)
        {
            var eventId = TryGuid(query, "event_id");
            var id = TryGuid(query, "id");
            var rows = Characters.Values
                .Where(x => (!eventId.HasValue || x.EventId == eventId) && (!id.HasValue || x.Id == id) && x.DeletedAt is null)
                .Select(x => x.ToRow())
                .ToList();
            return JsonOk(rows);
        }

        if (path.EndsWith("/rest/v1/narrative_locations", StringComparison.OrdinalIgnoreCase))
        {
            if (request.Method == HttpMethod.Get)
            {
                var eventId = TryGuid(query, "event_id");
                var id = TryGuid(query, "id");
                var name = TryILike(query, "name");
                var type = TryEq(query, "location_type");
                var status = TryEq(query, "status");
                var includeDeleted = !query.Contains("deleted_at=is.null", StringComparison.OrdinalIgnoreCase);
                var rows = Locations.Values
                    .Where(x =>
                        (!eventId.HasValue || x.EventId == eventId)
                        && (!id.HasValue || x.Id == id)
                        && (string.IsNullOrWhiteSpace(name) || x.Name.Contains(name.Trim('*'), StringComparison.OrdinalIgnoreCase))
                        && (string.IsNullOrWhiteSpace(type) || string.Equals(x.LocationType, type, StringComparison.OrdinalIgnoreCase))
                        && (string.IsNullOrWhiteSpace(status) || string.Equals(x.Status, status, StringComparison.OrdinalIgnoreCase))
                        && (includeDeleted || x.DeletedAt is null))
                    .Select(x => x.ToRow())
                    .ToList();
                return JsonOk(rows);
            }

            if (request.Method == HttpMethod.Post)
            {
                using var doc = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
                var row = new LocationState(
                    Id: Guid.NewGuid(),
                    EventId: doc.RootElement.GetProperty("event_id").GetGuid(),
                    Name: doc.RootElement.GetProperty("name").GetString() ?? "Unnamed",
                    Description: TryString(doc.RootElement, "description"),
                    InternalNotes: TryString(doc.RootElement, "internal_notes"),
                    LocationType: doc.RootElement.GetProperty("location_type").GetString() ?? "basic",
                    Status: doc.RootElement.TryGetProperty("status", out var statusProp) ? statusProp.GetString() ?? "Draft" : "Draft",
                    CreatedAt: DateTimeOffset.UtcNow,
                    UpdatedAt: DateTimeOffset.UtcNow,
                    DeletedAt: null);
                Locations[row.Id] = row;
                return JsonOk(new[] { row.ToRow() });
            }

            if (request.Method == HttpMethod.Patch)
            {
                var id = TryGuid(query, "id");
                if (!id.HasValue || !Locations.TryGetValue(id.Value, out var current)) return new HttpResponseMessage(HttpStatusCode.NotFound);
                using var doc = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
                var updated = current.Apply(doc.RootElement);
                Locations[id.Value] = updated;
                return JsonOk(new[] { updated.ToRow() });
            }
        }

        if (path.EndsWith("/rest/v1/narrative_dungeon_floors", StringComparison.OrdinalIgnoreCase))
        {
            if (request.Method == HttpMethod.Get)
            {
                var eventId = TryGuid(query, "event_id");
                var id = TryGuid(query, "id");
                var locationId = TryGuid(query, "location_id");
                var rows = Floors.Values
                    .Where(x => (!eventId.HasValue || x.EventId == eventId) && (!id.HasValue || x.Id == id) && (!locationId.HasValue || x.LocationId == locationId))
                    .OrderBy(x => x.SortOrder)
                    .Select(x => x.ToRow())
                    .ToList();
                return JsonOk(rows);
            }

            if (request.Method == HttpMethod.Post)
            {
                using var doc = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
                if (request.RequestUri!.Query.Contains("on_conflict=id", StringComparison.OrdinalIgnoreCase))
                {
                    var updatedRows = new List<object>();
                    foreach (var element in doc.RootElement.EnumerateArray())
                    {
                        var id = element.GetProperty("id").GetGuid();
                        if (Floors.TryGetValue(id, out var current))
                        {
                            var updated = current with { SortOrder = element.GetProperty("sort_order").GetInt32(), UpdatedAt = DateTimeOffset.UtcNow };
                            Floors[id] = updated;
                            updatedRows.Add(updated.ToRow());
                        }
                    }
                    return JsonOk(updatedRows);
                }

                var row = new DungeonFloorState(
                    Id: Guid.NewGuid(),
                    LocationId: doc.RootElement.GetProperty("location_id").GetGuid(),
                    EventId: doc.RootElement.GetProperty("event_id").GetGuid(),
                    SortOrder: doc.RootElement.GetProperty("sort_order").GetInt32(),
                    Name: doc.RootElement.GetProperty("name").GetString() ?? "Unnamed",
                    Description: TryString(doc.RootElement, "description"),
                    InternalNotes: TryString(doc.RootElement, "internal_notes"),
                    CreatedAt: DateTimeOffset.UtcNow,
                    UpdatedAt: DateTimeOffset.UtcNow);
                Floors[row.Id] = row;
                return JsonOk(new[] { row.ToRow() });
            }

            if (request.Method == HttpMethod.Patch)
            {
                var id = TryGuid(query, "id");
                if (!id.HasValue || !Floors.TryGetValue(id.Value, out var current)) return new HttpResponseMessage(HttpStatusCode.NotFound);
                using var doc = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
                var updated = current.Apply(doc.RootElement);
                Floors[id.Value] = updated;
                return JsonOk(new[] { updated.ToRow() });
            }

            if (request.Method == HttpMethod.Delete)
            {
                var id = TryGuid(query, "id");
                if (id.HasValue)
                {
                    Floors.Remove(id.Value);
                    Rooms.Where(x => x.Value.FloorId == id.Value).Select(x => x.Key).ToList().ForEach(key => Rooms.Remove(key));
                }
                return new HttpResponseMessage(HttpStatusCode.NoContent);
            }
        }

        if (path.EndsWith("/rest/v1/narrative_dungeon_rooms", StringComparison.OrdinalIgnoreCase))
        {
            if (request.Method == HttpMethod.Get)
            {
                var eventId = TryGuid(query, "event_id");
                var id = TryGuid(query, "id");
                var locationId = TryGuid(query, "location_id");
                var floorId = TryGuid(query, "floor_id");
                var rows = Rooms.Values
                    .Where(x => (!eventId.HasValue || x.EventId == eventId) && (!id.HasValue || x.Id == id) && (!locationId.HasValue || x.LocationId == locationId) && (!floorId.HasValue || x.FloorId == floorId))
                    .OrderBy(x => x.SortOrder)
                    .Select(x => x.ToRow())
                    .ToList();
                return JsonOk(rows);
            }

            if (request.Method == HttpMethod.Post)
            {
                using var doc = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
                if (request.RequestUri!.Query.Contains("on_conflict=id", StringComparison.OrdinalIgnoreCase))
                {
                    var updatedRows = new List<object>();
                    foreach (var element in doc.RootElement.EnumerateArray())
                    {
                        var id = element.GetProperty("id").GetGuid();
                        if (Rooms.TryGetValue(id, out var current))
                        {
                            var updated = current with { SortOrder = element.GetProperty("sort_order").GetInt32(), UpdatedAt = DateTimeOffset.UtcNow };
                            Rooms[id] = updated;
                            updatedRows.Add(updated.ToRow());
                        }
                    }
                    return JsonOk(updatedRows);
                }

                var row = new DungeonRoomState(
                    Id: Guid.NewGuid(),
                    FloorId: doc.RootElement.GetProperty("floor_id").GetGuid(),
                    LocationId: doc.RootElement.GetProperty("location_id").GetGuid(),
                    EventId: doc.RootElement.GetProperty("event_id").GetGuid(),
                    SortOrder: doc.RootElement.GetProperty("sort_order").GetInt32(),
                    Name: doc.RootElement.GetProperty("name").GetString() ?? "Unnamed",
                    Description: TryString(doc.RootElement, "description"),
                    InternalNotes: TryString(doc.RootElement, "internal_notes"),
                    CreatedAt: DateTimeOffset.UtcNow,
                    UpdatedAt: DateTimeOffset.UtcNow);
                Rooms[row.Id] = row;
                return JsonOk(new[] { row.ToRow() });
            }

            if (request.Method == HttpMethod.Patch)
            {
                var id = TryGuid(query, "id");
                if (!id.HasValue || !Rooms.TryGetValue(id.Value, out var current)) return new HttpResponseMessage(HttpStatusCode.NotFound);
                using var doc = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
                var updated = current.Apply(doc.RootElement);
                Rooms[id.Value] = updated;
                return JsonOk(new[] { updated.ToRow() });
            }

            if (request.Method == HttpMethod.Delete)
            {
                var id = TryGuid(query, "id");
                if (id.HasValue) Rooms.Remove(id.Value);
                return new HttpResponseMessage(HttpStatusCode.NoContent);
            }
        }

        if (path.EndsWith("/rest/v1/narrative_quests", StringComparison.OrdinalIgnoreCase) && request.Method == HttpMethod.Get)
        {
            var eventId = TryGuid(query, "event_id");
            var id = TryGuid(query, "id");
            var rows = Quests.Values
                .Where(x => (!eventId.HasValue || x.EventId == eventId) && (!id.HasValue || x.Id == id) && (!query.Contains("deleted_at=is.null", StringComparison.OrdinalIgnoreCase) || x.DeletedAt is null))
                .Select(x => x.ToRow())
                .ToList();
            return JsonOk(rows);
        }

        if (path.EndsWith("/rest/v1/narrative_quest_locations", StringComparison.OrdinalIgnoreCase))
        {
            if (request.Method == HttpMethod.Get)
            {
                var eventId = TryGuid(query, "event_id");
                var questId = TryGuid(query, "quest_id");
                var locationId = TryGuid(query, "location_id");
                var includeDeletedLocations = !query.Contains("location.deleted_at=is.null", StringComparison.OrdinalIgnoreCase);
                var rows = QuestLocationLinks
                    .Where(x => (!eventId.HasValue || x.EventId == eventId) && (!questId.HasValue || x.QuestId == questId) && (!locationId.HasValue || x.LocationId == locationId))
                    .Where(x => includeDeletedLocations || (Locations.TryGetValue(x.LocationId, out var loc) && loc.DeletedAt is null))
                    .Select(x => x.ToRow(Locations, Floors, Rooms, Quests))
                    .ToList();
                return JsonOk(rows);
            }

            if (request.Method == HttpMethod.Post)
            {
                using var doc = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
                var eventId = doc.RootElement.GetProperty("event_id").GetGuid();
                var questId = doc.RootElement.GetProperty("quest_id").GetGuid();
                var locationId = doc.RootElement.GetProperty("location_id").GetGuid();
                var floorId = TryGuid(doc.RootElement, "floor_id");
                var roomId = TryGuid(doc.RootElement, "room_id");
                QuestLocationLinks.RemoveAll(x => x.EventId == eventId && x.QuestId == questId && x.LocationId == locationId && x.FloorId == floorId && x.RoomId == roomId);
                QuestLocationLinks.Add(new QuestLocationLinkState(eventId, questId, locationId, floorId, roomId, DateTimeOffset.UtcNow));
                return JsonOk(Array.Empty<object>());
            }

            if (request.Method == HttpMethod.Delete)
            {
                var eventId = TryGuid(query, "event_id");
                var questId = TryGuid(query, "quest_id");
                var locationId = TryGuid(query, "location_id");
                var floorId = ParseNullableGuidFilter(query, "floor_id");
                var roomId = ParseNullableGuidFilter(query, "room_id");
                QuestLocationLinks.RemoveAll(x => (!eventId.HasValue || x.EventId == eventId) && (!questId.HasValue || x.QuestId == questId) && (!locationId.HasValue || x.LocationId == locationId) && x.FloorId == floorId && x.RoomId == roomId);
                return new HttpResponseMessage(HttpStatusCode.NoContent);
            }
        }
        if (path.EndsWith("/rest/v1/narrative_items", StringComparison.OrdinalIgnoreCase))
        {
            if (request.Method == HttpMethod.Get)
            {
                var eventId = TryGuid(query, "event_id");
                var id = TryGuid(query, "id");
                var name = TryILike(query, "name");
                var includeDeleted = !query.Contains("deleted_at=is.null", StringComparison.OrdinalIgnoreCase);
                var rows = Items.Values
                    .Where(x =>
                        (!eventId.HasValue || x.EventId == eventId)
                        && (!id.HasValue || x.Id == id)
                        && (string.IsNullOrWhiteSpace(name) || x.Name.Equals(name, StringComparison.OrdinalIgnoreCase))
                        && (includeDeleted || x.DeletedAt is null))
                    .Select(x => x.ToRow())
                    .ToList();
                return JsonOk(rows);
            }

            if (request.Method == HttpMethod.Post)
            {
                using var doc = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
                var item = new ItemState(
                    Id: Guid.NewGuid(),
                    EventId: doc.RootElement.GetProperty("event_id").GetGuid(),
                    Name: doc.RootElement.GetProperty("name").GetString() ?? "Unnamed",
                    Description: TryString(doc.RootElement, "description"),
                    InternalNotes: TryString(doc.RootElement, "internal_notes"),
                    Status: doc.RootElement.TryGetProperty("status", out var s) ? s.GetString() ?? "Draft" : "Draft",
                    IsMultiCopy: doc.RootElement.TryGetProperty("is_multi_copy", out var m) && m.GetBoolean(),
                    MaxCopies: doc.RootElement.TryGetProperty("max_copies", out var mc) && mc.ValueKind != JsonValueKind.Null ? mc.GetInt32() : null,
                    CreatedAt: DateTimeOffset.UtcNow,
                    UpdatedAt: DateTimeOffset.UtcNow,
                    DeletedAt: null);
                Items[item.Id] = item;
                return JsonOk(new[] { item.ToRow() });
            }

            if (request.Method == HttpMethod.Patch)
            {
                var id = TryGuid(query, "id");
                if (!id.HasValue || !Items.TryGetValue(id.Value, out var current)) return new HttpResponseMessage(HttpStatusCode.NotFound);
                using var doc = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
                var updated = current.Apply(doc.RootElement);
                Items[id.Value] = updated;
                return JsonOk(new[] { updated.ToRow() });
            }
        }

        if (path.EndsWith("/rest/v1/narrative_item_character_assignments", StringComparison.OrdinalIgnoreCase))
        {
            if (request.Method == HttpMethod.Get)
            {
                var eventId = TryGuid(query, "event_id");
                var itemId = TryGuid(query, "item_id");
                var characterId = TryGuid(query, "character_id");
                var rows = ItemAssignments
                    .Where(x => (!eventId.HasValue || x.EventId == eventId) && (!itemId.HasValue || x.ItemId == itemId) && (!characterId.HasValue || x.CharacterId == characterId))
                    .Select(x => x.ToRow())
                    .ToList();
                return JsonOk(rows);
            }

            if (request.Method == HttpMethod.Post)
            {
                using var doc = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
                var eventId = doc.RootElement.GetProperty("event_id").GetGuid();
                var itemId = doc.RootElement.GetProperty("item_id").GetGuid();
                var characterId = doc.RootElement.GetProperty("character_id").GetGuid();
                ItemAssignments.RemoveAll(x => x.EventId == eventId && x.ItemId == itemId && x.CharacterId == characterId);
                var row = new ItemAssignmentState(eventId, itemId, characterId, TryGuid(doc.RootElement, "assigned_by"), DateTimeOffset.UtcNow, TryString(doc.RootElement, "notes"));
                ItemAssignments.Add(row);
                return JsonOk(new[] { row.ToRow() });
            }

            if (request.Method == HttpMethod.Delete)
            {
                var eventId = TryGuid(query, "event_id");
                var itemId = TryGuid(query, "item_id");
                var characterId = TryGuid(query, "character_id");
                ItemAssignments.RemoveAll(x => (!eventId.HasValue || x.EventId == eventId) && (!itemId.HasValue || x.ItemId == itemId) && (!characterId.HasValue || x.CharacterId == characterId));
                return new HttpResponseMessage(HttpStatusCode.NoContent);
            }
        }

        if (path.EndsWith("/rest/v1/narrative_factions", StringComparison.OrdinalIgnoreCase))
        {
            if (request.Method == HttpMethod.Get)
            {
                var eventId = TryGuid(query, "event_id");
                var id = TryGuid(query, "id");
                var name = TryILike(query, "name");
                var includeDeleted = !query.Contains("deleted_at=is.null", StringComparison.OrdinalIgnoreCase);
                var rows = Factions.Values
                    .Where(x =>
                        (!eventId.HasValue || x.EventId == eventId)
                        && (!id.HasValue || x.Id == id)
                        && (string.IsNullOrWhiteSpace(name) || x.Name.Equals(name, StringComparison.OrdinalIgnoreCase))
                        && (includeDeleted || x.DeletedAt is null))
                    .Select(x => x.ToRow())
                    .ToList();
                return JsonOk(rows);
            }
        }

        if (path.EndsWith("/rest/v1/narrative_faction_relationships", StringComparison.OrdinalIgnoreCase))
        {
            if (request.Method == HttpMethod.Post)
            {
                using var doc = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
                var row = new FactionRelationshipState(
                    Id: Guid.NewGuid(),
                    EventId: doc.RootElement.GetProperty("event_id").GetGuid(),
                    SourceFactionId: doc.RootElement.GetProperty("source_faction_id").GetGuid(),
                    TargetFactionId: TryGuid(doc.RootElement, "target_faction_id"),
                    TargetCharacterId: TryGuid(doc.RootElement, "target_character_id"),
                    RelationType: doc.RootElement.GetProperty("relation_type").GetString() ?? "ally",
                    RelationMode: doc.RootElement.GetProperty("relation_mode").GetString() ?? "directional",
                    MirrorGroupId: TryGuid(doc.RootElement, "mirror_group_id"),
                    IsAutoMirror: doc.RootElement.TryGetProperty("is_auto_mirror", out var iam) && iam.GetBoolean(),
                    Notes: TryString(doc.RootElement, "notes"),
                    CreatedAt: DateTimeOffset.UtcNow,
                    UpdatedAt: DateTimeOffset.UtcNow);
                Relationships.Add(row);
                return JsonOk(new[] { row.ToRow() });
            }
        }

        return JsonOk(Array.Empty<object>());
    }

    private static Guid? TryGuid(string query, string key)
    {
        foreach (var part in query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var idx = part.IndexOf('=');
            if (idx <= 0 || !string.Equals(part[..idx], key, StringComparison.OrdinalIgnoreCase)) continue;
            var value = Uri.UnescapeDataString(part[(idx + 1)..]);
            if (value.StartsWith("eq.", StringComparison.OrdinalIgnoreCase))
                return Guid.TryParse(value[3..], out var id) ? id : null;
        }
        return null;
    }

    private static string? TryILike(string query, string key)
    {
        foreach (var part in query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var idx = part.IndexOf('=');
            if (idx <= 0 || !string.Equals(part[..idx], key, StringComparison.OrdinalIgnoreCase)) continue;
            var value = Uri.UnescapeDataString(part[(idx + 1)..]);
            if (value.StartsWith("ilike.", StringComparison.OrdinalIgnoreCase)) return value[6..];
        }
        return null;
    }

    private static string? TryEq(string query, string key)
    {
        foreach (var part in query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var idx = part.IndexOf('=');
            if (idx <= 0 || !string.Equals(part[..idx], key, StringComparison.OrdinalIgnoreCase)) continue;
            var value = Uri.UnescapeDataString(part[(idx + 1)..]);
            if (value.StartsWith("eq.", StringComparison.OrdinalIgnoreCase)) return value[3..];
        }
        return null;
    }

    private static Guid? ParseNullableGuidFilter(string query, string key)
    {
        foreach (var part in query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var idx = part.IndexOf('=');
            if (idx <= 0 || !string.Equals(part[..idx], key, StringComparison.OrdinalIgnoreCase)) continue;
            var value = Uri.UnescapeDataString(part[(idx + 1)..]);
            if (string.Equals(value, "is.null", StringComparison.OrdinalIgnoreCase)) return null;
            if (value.StartsWith("eq.", StringComparison.OrdinalIgnoreCase) && Guid.TryParse(value[3..], out var id)) return id;
        }
        return null;
    }

    private static Guid? TryGuid(JsonElement root, string key)
        => root.TryGetProperty(key, out var v) && v.ValueKind != JsonValueKind.Null ? v.GetGuid() : null;

    private static string? TryString(JsonElement root, string key)
        => root.TryGetProperty(key, out var v) && v.ValueKind != JsonValueKind.Null ? v.GetString() : null;

    private static HttpResponseMessage JsonOk<T>(T value)
    {
        var json = JsonSerializer.Serialize(value);
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
    }
}

internal sealed record EventState(Guid Id, string Status, DateTimeOffset? DeletedAt)
{
    public object ToRow() => new { id = Id, status = Status, deleted_at = DeletedAt };
}

internal sealed record CharacterState(Guid Id, Guid EventId, DateTimeOffset? DeletedAt)
{
    public object ToRow() => new { id = Id, event_id = EventId, deleted_at = DeletedAt };
}

internal sealed record FactionState(Guid Id, Guid EventId, string Name, DateTimeOffset? DeletedAt)
{
    public object ToRow() => new
    {
        id = Id,
        event_id = EventId,
        name = Name,
        sigil_url = (string?)null,
        description = (string?)null,
        goals = (string?)null,
        internal_notes = (string?)null,
        status = "Draft",
        created_at = DateTimeOffset.UtcNow,
        updated_at = DateTimeOffset.UtcNow,
        deleted_at = DeletedAt
    };
}

internal sealed record ItemState(
    Guid Id,
    Guid EventId,
    string Name,
    string? Description,
    string? InternalNotes,
    string Status,
    bool IsMultiCopy,
    int? MaxCopies,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? DeletedAt)
{
    public object ToRow() => new
    {
        id = Id,
        event_id = EventId,
        name = Name,
        description = Description,
        internal_notes = InternalNotes,
        status = Status,
        is_multi_copy = IsMultiCopy,
        max_copies = MaxCopies,
        created_at = CreatedAt,
        updated_at = UpdatedAt,
        deleted_at = DeletedAt
    };

    public ItemState Apply(JsonElement root)
    {
        var status = root.TryGetProperty("status", out var s) && s.ValueKind != JsonValueKind.Null ? s.GetString() ?? Status : Status;
        var deleted = root.TryGetProperty("deleted_at", out var d) ? (d.ValueKind == JsonValueKind.Null ? null : d.GetDateTimeOffset()) : DeletedAt;
        return this with { Status = status, DeletedAt = deleted, UpdatedAt = DateTimeOffset.UtcNow };
    }
}

internal sealed record ItemAssignmentState(Guid EventId, Guid ItemId, Guid CharacterId, Guid? AssignedBy, DateTimeOffset AssignedAt, string? Notes)
{
    public object ToRow() => new { event_id = EventId, item_id = ItemId, character_id = CharacterId, assigned_by = AssignedBy, assigned_at = AssignedAt, notes = Notes };
}

internal sealed record FactionRelationshipState(
    Guid Id,
    Guid EventId,
    Guid SourceFactionId,
    Guid? TargetFactionId,
    Guid? TargetCharacterId,
    string RelationType,
    string RelationMode,
    Guid? MirrorGroupId,
    bool IsAutoMirror,
    string? Notes,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt)
{
    public object ToRow() => new
    {
        id = Id,
        event_id = EventId,
        source_faction_id = SourceFactionId,
        target_faction_id = TargetFactionId,
        target_character_id = TargetCharacterId,
        relation_type = RelationType,
        relation_mode = RelationMode,
        mirror_group_id = MirrorGroupId,
        is_auto_mirror = IsAutoMirror,
        notes = Notes,
        created_at = CreatedAt,
        updated_at = UpdatedAt
    };
}






internal sealed record QuestState(Guid Id, Guid EventId, string Title, DateTimeOffset? DeletedAt)
{
    public object ToRow() => new
    {
        id = Id,
        event_id = EventId,
        title = Title,
        short_description = (string?)null,
        description = (string?)null,
        internal_notes = (string?)null,
        status = "Draft",
        created_at = DateTimeOffset.UtcNow,
        updated_at = DateTimeOffset.UtcNow,
        deleted_at = DeletedAt
    };
}

internal sealed record LocationState(
    Guid Id,
    Guid EventId,
    string Name,
    string? Description,
    string? InternalNotes,
    string LocationType,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? DeletedAt)
{
    public object ToRow() => new
    {
        id = Id,
        event_id = EventId,
        name = Name,
        description = Description,
        internal_notes = InternalNotes,
        location_type = LocationType,
        status = Status,
        created_at = CreatedAt,
        updated_at = UpdatedAt,
        deleted_at = DeletedAt
    };

    public LocationState Apply(JsonElement root)
    {
        var name = root.TryGetProperty("name", out var nameProp) && nameProp.ValueKind != JsonValueKind.Null ? nameProp.GetString() ?? Name : Name;
        var description = root.TryGetProperty("description", out var descriptionProp) ? (descriptionProp.ValueKind == JsonValueKind.Null ? null : descriptionProp.GetString()) : Description;
        var internalNotes = root.TryGetProperty("internal_notes", out var notesProp) ? (notesProp.ValueKind == JsonValueKind.Null ? null : notesProp.GetString()) : InternalNotes;
        var status = root.TryGetProperty("status", out var statusProp) && statusProp.ValueKind != JsonValueKind.Null ? statusProp.GetString() ?? Status : Status;
        var deletedAt = root.TryGetProperty("deleted_at", out var deletedAtProp) ? (deletedAtProp.ValueKind == JsonValueKind.Null ? null : deletedAtProp.GetDateTimeOffset()) : DeletedAt;
        return this with { Name = name, Description = description, InternalNotes = internalNotes, Status = status, DeletedAt = deletedAt, UpdatedAt = DateTimeOffset.UtcNow };
    }
}

internal sealed record DungeonFloorState(
    Guid Id,
    Guid LocationId,
    Guid EventId,
    int SortOrder,
    string Name,
    string? Description,
    string? InternalNotes,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt)
{
    public object ToRow() => new
    {
        id = Id,
        location_id = LocationId,
        event_id = EventId,
        sort_order = SortOrder,
        name = Name,
        description = Description,
        internal_notes = InternalNotes,
        created_at = CreatedAt,
        updated_at = UpdatedAt
    };

    public DungeonFloorState Apply(JsonElement root)
    {
        var name = root.TryGetProperty("name", out var nameProp) && nameProp.ValueKind != JsonValueKind.Null ? nameProp.GetString() ?? Name : Name;
        var description = root.TryGetProperty("description", out var descriptionProp) ? (descriptionProp.ValueKind == JsonValueKind.Null ? null : descriptionProp.GetString()) : Description;
        var internalNotes = root.TryGetProperty("internal_notes", out var notesProp) ? (notesProp.ValueKind == JsonValueKind.Null ? null : notesProp.GetString()) : InternalNotes;
        return this with { Name = name, Description = description, InternalNotes = internalNotes, UpdatedAt = DateTimeOffset.UtcNow };
    }
}

internal sealed record DungeonRoomState(
    Guid Id,
    Guid FloorId,
    Guid LocationId,
    Guid EventId,
    int SortOrder,
    string Name,
    string? Description,
    string? InternalNotes,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt)
{
    public object ToRow() => new
    {
        id = Id,
        floor_id = FloorId,
        location_id = LocationId,
        event_id = EventId,
        sort_order = SortOrder,
        name = Name,
        description = Description,
        internal_notes = InternalNotes,
        created_at = CreatedAt,
        updated_at = UpdatedAt
    };

    public DungeonRoomState Apply(JsonElement root)
    {
        var name = root.TryGetProperty("name", out var nameProp) && nameProp.ValueKind != JsonValueKind.Null ? nameProp.GetString() ?? Name : Name;
        var description = root.TryGetProperty("description", out var descriptionProp) ? (descriptionProp.ValueKind == JsonValueKind.Null ? null : descriptionProp.GetString()) : Description;
        var internalNotes = root.TryGetProperty("internal_notes", out var notesProp) ? (notesProp.ValueKind == JsonValueKind.Null ? null : notesProp.GetString()) : InternalNotes;
        return this with { Name = name, Description = description, InternalNotes = internalNotes, UpdatedAt = DateTimeOffset.UtcNow };
    }
}

internal sealed record QuestLocationLinkState(Guid EventId, Guid QuestId, Guid LocationId, Guid? FloorId, Guid? RoomId, DateTimeOffset CreatedAt)
{
    public object ToRow(IReadOnlyDictionary<Guid, LocationState> locations, IReadOnlyDictionary<Guid, DungeonFloorState> floors, IReadOnlyDictionary<Guid, DungeonRoomState> rooms, IReadOnlyDictionary<Guid, QuestState> quests)
        => new
        {
            event_id = EventId,
            quest_id = QuestId,
            location_id = LocationId,
            floor_id = FloorId,
            room_id = RoomId,
            created_at = CreatedAt,
            location = locations.TryGetValue(LocationId, out var location) ? new { name = location.Name } : null,
            floor = FloorId.HasValue && floors.TryGetValue(FloorId.Value, out var floor) ? new { name = floor.Name } : null,
            room = RoomId.HasValue && rooms.TryGetValue(RoomId.Value, out var room) ? new { name = room.Name } : null,
            quest = quests.TryGetValue(QuestId, out var quest) ? new { title = quest.Title } : null
        };
}



