using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using EventManagement.Endpoints;
using EventManagement.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;
using Xunit;

namespace EventManagement.Tests;

public class EventEndpointsIntegrationTests
{
    [Fact]
    public async Task EventManager_Cannot_Archive_Event()
    {
        var eventId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var fake = new FakeSupabaseHandler();
        fake.SeedEvent(eventId, status: "active");
        fake.SeedManager(eventId, userId);

        using var client = CreateClient(fake);
        AddAuthHeaders(client, userId);

        var response = await client.PostAsJsonAsync($"/api/events/{eventId}/archive", new { reason = "done" });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task OrgOwner_Can_Archive_Event()
    {
        var eventId = Guid.NewGuid();
        var ownerId = Guid.NewGuid();
        var fake = new FakeSupabaseHandler();
        fake.SeedEvent(eventId, status: "active");

        using var client = CreateClient(fake);
        AddAuthHeaders(client, ownerId, orgRole: "OrgOwner");

        var response = await client.PostAsJsonAsync($"/api/events/{eventId}/archive", new { reason = "finished" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("archived", fake.Events[eventId].Status);
    }

    [Fact]
    public async Task EventManager_Cannot_Upsert_Permission_On_Archived_Event()
    {
        var eventId = Guid.NewGuid();
        var managerId = Guid.NewGuid();
        var targetUser = Guid.NewGuid();
        var fake = new FakeSupabaseHandler();
        fake.SeedEvent(eventId, status: "archived");
        fake.SeedManager(eventId, managerId);

        using var client = CreateClient(fake);
        AddAuthHeaders(client, managerId);

        var response = await client.PutAsJsonAsync(
            $"/api/events/{eventId}/permissions/{targetUser}/characters",
            new { permission = "read" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task EventManager_Can_Upsert_Permission_On_Active_Event()
    {
        var eventId = Guid.NewGuid();
        var managerId = Guid.NewGuid();
        var targetUser = Guid.NewGuid();
        var fake = new FakeSupabaseHandler();
        fake.SeedEvent(eventId, status: "active");
        fake.SeedManager(eventId, managerId);

        using var client = CreateClient(fake);
        AddAuthHeaders(client, managerId);

        var response = await client.PutAsJsonAsync(
            $"/api/events/{eventId}/permissions/{targetUser}/characters",
            new { permission = "write" });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Contains(
            fake.EventPermissions,
            p => p.EventId == eventId && p.UserId == targetUser && p.Module == "characters" && p.Permission == "write");
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
                services.AddAuthentication("Test")
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", _ => { });
                services.AddAuthorization();
                services.AddMemoryCache();

                services.AddSingleton(fakeSupabase);
                services.AddSingleton<HttpMessageHandler>(fakeSupabase);
                services.AddScoped(_ => new HttpClient(fakeSupabase));

                services.AddScoped<EventAuthorizationService>();
                services.AddScoped<EventActivityService>();
                services.AddScoped<EventStatsService>();
            })
            .Configure(app =>
            {
                app.UseRouting();
                app.UseAuthentication();
                app.UseAuthorization();
                app.UseEndpoints(endpoints =>
                {
                    endpoints.MapEventEndpoints();
                });
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
        if (isSystemAdmin)
        {
            client.DefaultRequestHeaders.Add("X-Test-System-Admin", "true");
        }

        if (!string.IsNullOrWhiteSpace(orgRole))
        {
            client.DefaultRequestHeaders.Add("X-Test-Org-Role", orgRole);
        }
    }
}

internal sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        System.Text.Encodings.Web.UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var userIdRaw = Request.Headers["X-Test-User-Id"].ToString();
        if (!Guid.TryParse(userIdRaw, out var userId))
        {
            return Task.FromResult(AuthenticateResult.Fail("Missing X-Test-User-Id header"));
        }

        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, userId.ToString()) };
        if (string.Equals(Request.Headers["X-Test-System-Admin"], "true", StringComparison.OrdinalIgnoreCase))
        {
            claims.Add(new Claim("sancho:system_admin", "true"));
        }

        var orgRole = Request.Headers["X-Test-Org-Role"].ToString();
        if (!string.IsNullOrWhiteSpace(orgRole))
        {
            claims.Add(new Claim("sancho:org_role", orgRole));
        }

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}

internal sealed class FakeSupabaseHandler : HttpMessageHandler
{
    public Dictionary<Guid, EventState> Events { get; } = new();
    public HashSet<(Guid EventId, Guid UserId)> Managers { get; } = [];
    public List<EventPermissionState> EventPermissions { get; } = [];

    public void SeedEvent(Guid eventId, string status)
    {
        Events[eventId] = new EventState(
            eventId,
            Name: "Test event",
            Location: "Test location",
            StartAt: DateTimeOffset.UtcNow.AddDays(1),
            EndAt: DateTimeOffset.UtcNow.AddDays(2),
            Status: status,
            ArchivedAt: status == "archived" ? DateTimeOffset.UtcNow : null,
            ArchivedBy: null,
            DeletedAt: null,
            DeletedBy: null,
            DeletionReason: null,
            CreatedAt: DateTimeOffset.UtcNow.AddDays(-1),
            UpdatedAt: DateTimeOffset.UtcNow);
    }

    public void SeedManager(Guid eventId, Guid userId) => Managers.Add((eventId, userId));

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var path = request.RequestUri?.AbsolutePath ?? string.Empty;
        var query = request.RequestUri?.Query ?? string.Empty;

        if (path.EndsWith("/rest/v1/events", StringComparison.OrdinalIgnoreCase))
        {
            if (request.Method == HttpMethod.Get)
            {
                var id = TryReadGuidFilter(query, "id");
                if (id.HasValue && Events.TryGetValue(id.Value, out var single))
                {
                    return JsonOk(new[] { single.ToSupabaseRow() });
                }

                return JsonOk(Events.Values.Select(x => x.ToSupabaseRow()).ToList());
            }

            if (request.Method == HttpMethod.Patch)
            {
                var id = TryReadGuidFilter(query, "id");
                if (!id.HasValue || !Events.TryGetValue(id.Value, out var state))
                {
                    return JsonNotFound();
                }

                using var doc = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
                state = state.ApplyPatch(doc.RootElement);
                Events[id.Value] = state;
                return JsonOk(new[] { state.ToSupabaseRow() });
            }
        }

        if (path.EndsWith("/rest/v1/event_members", StringComparison.OrdinalIgnoreCase))
        {
            if (request.Method == HttpMethod.Get)
            {
                var eventId = TryReadGuidFilter(query, "event_id");
                var userId = TryReadGuidFilter(query, "user_id");
                var rows = Managers
                    .Where(x => (!eventId.HasValue || x.EventId == eventId) && (!userId.HasValue || x.UserId == userId))
                    .Select(x => new { user_id = x.UserId, role = "EventManager", created_at = DateTimeOffset.UtcNow })
                    .ToList();
                return JsonOk(rows);
            }
        }

        if (path.EndsWith("/rest/v1/event_member_permissions", StringComparison.OrdinalIgnoreCase))
        {
            if (request.Method == HttpMethod.Post)
            {
                using var doc = JsonDocument.Parse(await request.Content!.ReadAsStringAsync(cancellationToken));
                var eventId = doc.RootElement.GetProperty("event_id").GetGuid();
                var userId = doc.RootElement.GetProperty("user_id").GetGuid();
                var module = doc.RootElement.GetProperty("module").GetString() ?? "unknown";
                var permission = doc.RootElement.GetProperty("permission").GetString() ?? "none";
                var grantedBy = doc.RootElement.TryGetProperty("granted_by", out var gb) && gb.ValueKind != JsonValueKind.Null ? gb.GetGuid() : (Guid?)null;
                var grantedAt = doc.RootElement.TryGetProperty("granted_at", out var ga) && ga.ValueKind != JsonValueKind.Null ? ga.GetDateTimeOffset() : DateTimeOffset.UtcNow;

                EventPermissions.RemoveAll(x => x.EventId == eventId && x.UserId == userId && x.Module == module);
                EventPermissions.Add(new EventPermissionState(eventId, userId, module, permission, grantedBy, grantedAt));

                return new HttpResponseMessage(HttpStatusCode.Created);
            }
        }

        if (path.EndsWith("/rest/v1/event_activity_log", StringComparison.OrdinalIgnoreCase) && request.Method == HttpMethod.Post)
        {
            return new HttpResponseMessage(HttpStatusCode.Created);
        }

        // Default relaxed response for non-tested calls.
        return JsonOk(Array.Empty<object>());
    }

    private static Guid? TryReadGuidFilter(string query, string key)
    {
        var parts = query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries);
        foreach (var part in parts)
        {
            var idx = part.IndexOf('=');
            if (idx <= 0) continue;
            var k = part[..idx];
            if (!string.Equals(k, key, StringComparison.OrdinalIgnoreCase)) continue;
            var v = Uri.UnescapeDataString(part[(idx + 1)..]);
            if (!v.StartsWith("eq.", StringComparison.OrdinalIgnoreCase)) continue;
            var raw = v[3..];
            return Guid.TryParse(raw, out var parsed) ? parsed : null;
        }

        return null;
    }

    private static HttpResponseMessage JsonOk<T>(T value)
    {
        var json = JsonSerializer.Serialize(value);
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
    }

    private static HttpResponseMessage JsonNotFound() => new(HttpStatusCode.NotFound);
}

internal sealed record EventState(
    Guid Id,
    string Name,
    string? Location,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt,
    string Status,
    DateTimeOffset? ArchivedAt,
    Guid? ArchivedBy,
    DateTimeOffset? DeletedAt,
    Guid? DeletedBy,
    string? DeletionReason,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt)
{
    public EventState ApplyPatch(JsonElement root)
    {
        var status = root.TryGetProperty("status", out var s) && s.ValueKind == JsonValueKind.String ? s.GetString()! : Status;
        var archivedAt = root.TryGetProperty("archived_at", out var aa) ? ReadDate(aa) : ArchivedAt;
        var archivedBy = root.TryGetProperty("archived_by", out var ab) ? ReadGuid(ab) : ArchivedBy;
        var deletedAt = root.TryGetProperty("deleted_at", out var da) ? ReadDate(da) : DeletedAt;
        var deletedBy = root.TryGetProperty("deleted_by", out var db) ? ReadGuid(db) : DeletedBy;
        var deletionReason = root.TryGetProperty("deletion_reason", out var dr) && dr.ValueKind != JsonValueKind.Null ? dr.GetString() : DeletionReason;
        var updatedAt = root.TryGetProperty("updated_at", out var ua) && ua.ValueKind != JsonValueKind.Null ? ua.GetDateTimeOffset() : UpdatedAt;

        return this with
        {
            Status = status,
            ArchivedAt = archivedAt,
            ArchivedBy = archivedBy,
            DeletedAt = deletedAt,
            DeletedBy = deletedBy,
            DeletionReason = deletionReason,
            UpdatedAt = updatedAt
        };
    }

    public object ToSupabaseRow() => new
    {
        id = Id,
        name = Name,
        location = Location,
        start_at = StartAt,
        end_at = EndAt,
        status = Status,
        archived_at = ArchivedAt,
        archived_by = ArchivedBy,
        deleted_at = DeletedAt,
        deleted_by = DeletedBy,
        deletion_reason = DeletionReason,
        created_at = CreatedAt,
        updated_at = UpdatedAt
    };

    private static DateTimeOffset? ReadDate(JsonElement e) =>
        e.ValueKind == JsonValueKind.Null ? null : e.GetDateTimeOffset();

    private static Guid? ReadGuid(JsonElement e) =>
        e.ValueKind == JsonValueKind.Null ? null : e.GetGuid();
}

internal sealed record EventPermissionState(
    Guid EventId,
    Guid UserId,
    string Module,
    string Permission,
    Guid? GrantedBy,
    DateTimeOffset GrantedAt
);
