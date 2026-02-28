using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Character.Endpoints;
using Character.Models;
using Character.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Xunit;

namespace Character.Tests;

public class CharacterEndpointsIntegrationTests
{
    [Fact]
    public async Task User_With_WritePermission_Can_Create_Character()
    {
        var eventId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var fake = new FakeSupabaseHandler();
        fake.SeedEvent(eventId, "active");
        fake.SetPermission(eventId, userId, "write");

        using var client = CreateClient(fake, new StubCharacterNarrativeService());
        AddAuthHeaders(client, userId);

        var response = await client.PostAsJsonAsync($"/api/events/{eventId}/characters", new CreateCharacterRequest("Aldric", "Human", "bio", "note"));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Single(fake.Characters.Values);
    }

    [Fact]
    public async Task Locked_Character_Allows_Notes_Only()
    {
        var eventId = Guid.NewGuid();
        var managerId = Guid.NewGuid();
        var fake = new FakeSupabaseHandler();
        fake.SeedEvent(eventId, "active");
        fake.SeedManager(eventId, managerId);
        var character = fake.SeedCharacter(eventId, "Iris", "Elf", CharacterStatuses.Locked);

        using var client = CreateClient(fake, new StubCharacterNarrativeService());
        AddAuthHeaders(client, managerId);

        var blocked = await client.PatchAsJsonAsync($"/api/events/{eventId}/characters/{character.Id}", new UpdateCharacterProfileRequest("new", null, null, null, null));
        Assert.Equal(HttpStatusCode.BadRequest, blocked.StatusCode);

        var allowed = await client.PatchAsJsonAsync($"/api/events/{eventId}/characters/{character.Id}", new UpdateCharacterProfileRequest(null, null, null, "updated", null));
        Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
    }

    [Fact]
    public async Task Delete_Is_Blocked_When_Narrative_Has_Active_Relationships()
    {
        var eventId = Guid.NewGuid();
        var managerId = Guid.NewGuid();
        var fake = new FakeSupabaseHandler();
        fake.SeedEvent(eventId, "active");
        fake.SeedManager(eventId, managerId);
        var character = fake.SeedCharacter(eventId, "Mara", "Human", CharacterStatuses.Ready);

        using var client = CreateClient(fake, new BlockingNarrativeService());
        AddAuthHeaders(client, managerId);

        var deleteRequest = new HttpRequestMessage(HttpMethod.Delete, $"/api/events/{eventId}/characters/{character.Id}")
        {
            Content = JsonContent.Create(new CharacterDeleteRequest("cleanup"))
        };
        var response = await client.SendAsync(deleteRequest);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private static HttpClient CreateClient(FakeSupabaseHandler fakeSupabase, ICharacterNarrativeService narrative)
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
                services.AddScoped<CharacterAuthorizationService>();
                services.AddScoped<CharacterStorageService>();
                services.AddSingleton(narrative);
            })
            .Configure(app =>
            {
                app.UseRouting();
                app.UseAuthentication();
                app.UseAuthorization();
                app.UseEndpoints(endpoints => endpoints.MapCharacterEndpoints());
            });

        var server = new TestServer(builder);
        return server.CreateClient();
    }

    private static void AddAuthHeaders(HttpClient client, Guid userId, bool isSystemAdmin = false, string? orgRole = null)
    {
        client.DefaultRequestHeaders.Remove("X-Test-User-Id");
        client.DefaultRequestHeaders.Remove("X-Test-System-Admin");
        client.DefaultRequestHeaders.Remove("X-Test-Org-Role");
        client.DefaultRequestHeaders.Add("X-Test-User-Id", userId.ToString());
        if (isSystemAdmin) client.DefaultRequestHeaders.Add("X-Test-System-Admin", "true");
        if (!string.IsNullOrWhiteSpace(orgRole)) client.DefaultRequestHeaders.Add("X-Test-Org-Role", orgRole);
    }
}

internal sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public TestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, System.Text.Encodings.Web.UrlEncoder encoder)
        : base(options, logger, encoder) { }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var userIdRaw = Request.Headers["X-Test-User-Id"].ToString();
        if (!Guid.TryParse(userIdRaw, out var userId)) return Task.FromResult(AuthenticateResult.Fail("Missing X-Test-User-Id header"));

        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, userId.ToString()) };
        if (string.Equals(Request.Headers["X-Test-System-Admin"], "true", StringComparison.OrdinalIgnoreCase)) claims.Add(new Claim("sancho:system_admin", "true"));
        var orgRole = Request.Headers["X-Test-Org-Role"].ToString();
        if (!string.IsNullOrWhiteSpace(orgRole)) claims.Add(new Claim("sancho:org_role", orgRole));

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name)));
    }
}

internal sealed class FakeSupabaseHandler : HttpMessageHandler
{
    public Dictionary<Guid, EventState> Events { get; } = new();
    public Dictionary<Guid, CharacterState> Characters { get; } = new();
    public HashSet<(Guid EventId, Guid UserId)> Managers { get; } = [];
    public Dictionary<(Guid EventId, Guid UserId), string> Permissions { get; } = new();
    public List<AbilityState> Abilities { get; } = [];

    public void SeedEvent(Guid eventId, string status) => Events[eventId] = new(eventId, status, null);
    public void SeedManager(Guid eventId, Guid userId) => Managers.Add((eventId, userId));
    public void SetPermission(Guid eventId, Guid userId, string permission) => Permissions[(eventId, userId)] = permission;

    public CharacterState SeedCharacter(Guid eventId, string name, string race, string status)
    {
        var state = new CharacterState(Guid.NewGuid(), eventId, name, race, status, null, null, null, null, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow, null);
        Characters[state.Id] = state;
        return state;
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var path = request.RequestUri?.AbsolutePath ?? string.Empty;
        var query = request.RequestUri?.Query ?? string.Empty;

        if (path.EndsWith("/rest/v1/events", StringComparison.OrdinalIgnoreCase) && request.Method == HttpMethod.Get)
        {
            var id = TryGuid(query, "id");
            if (id.HasValue && Events.TryGetValue(id.Value, out var ev)) return JsonOk(new[] { ev.ToRow() });
            return JsonOk(Array.Empty<object>());
        }

        if (path.EndsWith("/rest/v1/event_members", StringComparison.OrdinalIgnoreCase) && request.Method == HttpMethod.Get)
        {
            var eventId = TryGuid(query, "event_id");
            var userId = TryGuid(query, "user_id");
            var rows = Managers.Where(x => (!eventId.HasValue || x.EventId == eventId) && (!userId.HasValue || x.UserId == userId))
                .Select(x => new { user_id = x.UserId, role = "EventManager" }).ToList();
            return JsonOk(rows);
        }

        if (path.EndsWith("/rest/v1/event_member_permissions", StringComparison.OrdinalIgnoreCase) && request.Method == HttpMethod.Get)
        {
            var eventId = TryGuid(query, "event_id");
            var userId = TryGuid(query, "user_id");
            var rows = Permissions.Where(x => (!eventId.HasValue || x.Key.EventId == eventId) && (!userId.HasValue || x.Key.UserId == userId))
                .Select(x => new { permission = x.Value }).ToList();
            return JsonOk(rows);
        }

        if (path.EndsWith("/rest/v1/characters", StringComparison.OrdinalIgnoreCase))
        {
            if (request.Method == HttpMethod.Get)
            {
                var eventId = TryGuid(query, "event_id");
                var id = TryGuid(query, "id");
                var name = TryName(query, "name");
                var includeDeleted = !query.Contains("deleted_at=is.null", StringComparison.OrdinalIgnoreCase);

                var rows = Characters.Values.Where(x =>
                        (!eventId.HasValue || x.EventId == eventId)
                        && (!id.HasValue || x.Id == id)
                        && (string.IsNullOrWhiteSpace(name) || x.Name.Equals(name, StringComparison.OrdinalIgnoreCase))
                        && (includeDeleted || x.DeletedAt is null))
                    .Select(x => x.ToRow()).ToList();
                return JsonOk(rows);
            }

            if (request.Method == HttpMethod.Post)
            {
                using var doc = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
                var row = new CharacterState(
                    Guid.NewGuid(),
                    doc.RootElement.GetProperty("event_id").GetGuid(),
                    doc.RootElement.GetProperty("name").GetString() ?? "Unnamed",
                    doc.RootElement.GetProperty("race").GetString() ?? "Unknown",
                    doc.RootElement.GetProperty("status").GetString() ?? CharacterStatuses.Draft,
                    doc.RootElement.TryGetProperty("biography", out var bio) && bio.ValueKind != JsonValueKind.Null ? bio.GetString() : null,
                    doc.RootElement.TryGetProperty("notes", out var notes) && notes.ValueKind != JsonValueKind.Null ? notes.GetString() : null,
                    null,
                    null,
                    DateTimeOffset.UtcNow,
                    DateTimeOffset.UtcNow,
                    null);
                Characters[row.Id] = row;
                return JsonOk(new[] { row.ToRow() });
            }

            if (request.Method == HttpMethod.Patch)
            {
                var id = TryGuid(query, "id");
                if (!id.HasValue || !Characters.TryGetValue(id.Value, out var current)) return new HttpResponseMessage(HttpStatusCode.NotFound);
                using var doc = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
                Characters[id.Value] = current.Apply(doc.RootElement);
                return JsonOk(new[] { Characters[id.Value].ToRow() });
            }
        }

        if (path.EndsWith("/rest/v1/character_abilities", StringComparison.OrdinalIgnoreCase))
        {
            if (request.Method == HttpMethod.Get)
            {
                var characterId = TryGuid(query, "character_id");
                var abilityId = TryGuid(query, "id");
                var rows = Abilities.Where(x => (!characterId.HasValue || x.CharacterId == characterId) && (!abilityId.HasValue || x.Id == abilityId))
                    .Select(x => x.ToRow()).ToList();
                return JsonOk(rows);
            }
            if (request.Method == HttpMethod.Post)
            {
                using var doc = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
                var ability = new AbilityState(Guid.NewGuid(), doc.RootElement.GetProperty("character_id").GetGuid(), doc.RootElement.GetProperty("category").GetString() ?? "", doc.RootElement.GetProperty("name").GetString() ?? "", doc.RootElement.GetProperty("value").GetString() ?? "", doc.RootElement.TryGetProperty("description", out var desc) ? desc.GetString() : null, doc.RootElement.GetProperty("sort_order").GetInt32());
                Abilities.Add(ability);
                return JsonOk(new[] { ability.ToRow() });
            }
            if (request.Method == HttpMethod.Patch)
            {
                var abilityId = TryGuid(query, "id");
                if (!abilityId.HasValue) return new HttpResponseMessage(HttpStatusCode.NotFound);
                var idx = Abilities.FindIndex(x => x.Id == abilityId.Value);
                if (idx < 0) return new HttpResponseMessage(HttpStatusCode.NotFound);
                using var doc = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
                Abilities[idx] = Abilities[idx].Apply(doc.RootElement);
                return JsonOk(new[] { Abilities[idx].ToRow() });
            }
            if (request.Method == HttpMethod.Delete)
            {
                var abilityId = TryGuid(query, "id");
                Abilities.RemoveAll(x => x.Id == abilityId);
                return new HttpResponseMessage(HttpStatusCode.NoContent);
            }
        }

        if (path.EndsWith("/rest/v1/character_attachments", StringComparison.OrdinalIgnoreCase))
        {
            if (request.Method == HttpMethod.Get) return JsonOk(Array.Empty<object>());
            if (request.Method == HttpMethod.Post) return JsonOk(new[] { new { id = Guid.NewGuid(), character_id = Guid.NewGuid(), file_name = "f", file_url = "u", mime_type = "image/png", category = "Image", uploaded_by = (Guid?)null, uploaded_at = DateTimeOffset.UtcNow } });
            if (request.Method == HttpMethod.Delete) return new HttpResponseMessage(HttpStatusCode.NoContent);
        }

        if (path.Contains("/storage/v1/object/upload/sign/characters/", StringComparison.OrdinalIgnoreCase) && request.Method == HttpMethod.Post)
            return JsonOk(new { token = "token" });
        if (path.Contains("/storage/v1/object/characters/", StringComparison.OrdinalIgnoreCase) && request.Method == HttpMethod.Delete)
            return new HttpResponseMessage(HttpStatusCode.NoContent);

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

    private static string? TryName(string query, string key)
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

    private static HttpResponseMessage JsonOk<T>(T value)
    {
        var json = JsonSerializer.Serialize(value);
        return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(json, Encoding.UTF8, "application/json") };
    }
}

internal sealed class BlockingNarrativeService : ICharacterNarrativeService
{
    public Task<IReadOnlyList<NarrativeFactionDto>> GetFactionsAsync(Guid eventId, Guid characterId) => Task.FromResult<IReadOnlyList<NarrativeFactionDto>>([]);
    public Task<IReadOnlyList<NarrativeRelationshipDto>> GetRelationshipsAsync(Guid eventId, Guid characterId) => Task.FromResult<IReadOnlyList<NarrativeRelationshipDto>>([]);
    public Task<IReadOnlyList<NarrativeQuestDto>> GetQuestsAsync(Guid eventId, Guid characterId) => Task.FromResult<IReadOnlyList<NarrativeQuestDto>>([]);
    public Task<bool> HasActiveRelationshipsAsync(Guid eventId, Guid characterId) => Task.FromResult(true);
}

internal sealed record EventState(Guid Id, string Status, DateTimeOffset? DeletedAt)
{
    public object ToRow() => new { id = Id, status = Status, deleted_at = DeletedAt };
}

internal sealed record CharacterState(Guid Id, Guid EventId, string Name, string Race, string Status, string? Biography, string? Notes, Guid? PlayerUserId, string? PhotoUrl, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt, DateTimeOffset? DeletedAt)
{
    public object ToRow() => new { id = Id, event_id = EventId, name = Name, race = Race, status = Status, biography = Biography, notes = Notes, player_user_id = PlayerUserId, photo_url = PhotoUrl, created_at = CreatedAt, updated_at = UpdatedAt, deleted_at = DeletedAt };
    public CharacterState Apply(JsonElement root)
    {
        var name = root.TryGetProperty("name", out var n) && n.ValueKind != JsonValueKind.Null ? n.GetString() ?? Name : Name;
        var race = root.TryGetProperty("race", out var r) && r.ValueKind != JsonValueKind.Null ? r.GetString() ?? Race : Race;
        var status = root.TryGetProperty("status", out var s) && s.ValueKind != JsonValueKind.Null ? s.GetString() ?? Status : Status;
        var biography = root.TryGetProperty("biography", out var b) && b.ValueKind != JsonValueKind.Null ? b.GetString() : Biography;
        var notes = root.TryGetProperty("notes", out var no) && no.ValueKind != JsonValueKind.Null ? no.GetString() : Notes;
        var player = root.TryGetProperty("player_user_id", out var p) && p.ValueKind != JsonValueKind.Null ? p.GetGuid() : PlayerUserId;
        var photo = root.TryGetProperty("photo_url", out var ph) ? (ph.ValueKind == JsonValueKind.Null ? null : ph.GetString()) : PhotoUrl;
        var deleted = root.TryGetProperty("deleted_at", out var d) ? (d.ValueKind == JsonValueKind.Null ? null : d.GetDateTimeOffset()) : DeletedAt;
        return this with { Name = name, Race = race, Status = status, Biography = biography, Notes = notes, PlayerUserId = player, PhotoUrl = photo, DeletedAt = deleted, UpdatedAt = DateTimeOffset.UtcNow };
    }
}

internal sealed record AbilityState(Guid Id, Guid CharacterId, string Category, string Name, string Value, string? Description, int SortOrder)
{
    public object ToRow() => new { id = Id, character_id = CharacterId, category = Category, name = Name, value = Value, description = Description, sort_order = SortOrder, created_at = DateTimeOffset.UtcNow, updated_at = DateTimeOffset.UtcNow };
    public AbilityState Apply(JsonElement root)
    {
        var category = root.TryGetProperty("category", out var c) ? c.GetString() ?? Category : Category;
        var name = root.TryGetProperty("name", out var n) ? n.GetString() ?? Name : Name;
        var value = root.TryGetProperty("value", out var v) ? v.GetString() ?? Value : Value;
        var description = root.TryGetProperty("description", out var d) ? d.GetString() : Description;
        var sort = root.TryGetProperty("sort_order", out var s) ? s.GetInt32() : SortOrder;
        return this with { Category = category, Name = name, Value = value, Description = description, SortOrder = sort };
    }
}
