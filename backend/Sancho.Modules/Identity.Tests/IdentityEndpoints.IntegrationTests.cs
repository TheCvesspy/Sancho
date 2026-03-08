using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Identity.Endpoints;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Xunit;

namespace Identity.Tests;

public class IdentityEndpointsIntegrationTests
{
    [Fact]
    public async Task SystemAdmin_Can_ListUsers()
    {
        var fake = new FakeSupabaseHandler();
        fake.SeedUserProfile(Guid.NewGuid(), "admin@test.com", "Admin");

        using var client = CreateClient(fake);
        AddAuthHeaders(client, Guid.NewGuid(), isSystemAdmin: true);

        var response = await client.GetAsync("/api/identity/users");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task OrgOwner_Can_ListUsers()
    {
        var fake = new FakeSupabaseHandler();
        fake.SeedUserProfile(Guid.NewGuid(), "user@test.com", "User");

        using var client = CreateClient(fake);
        AddAuthHeaders(client, Guid.NewGuid(), orgRole: "OrgOwner");

        var response = await client.GetAsync("/api/identity/users");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task RegularUser_Cannot_ListUsers()
    {
        var fake = new FakeSupabaseHandler();

        using var client = CreateClient(fake);
        AddAuthHeaders(client, Guid.NewGuid());

        var response = await client.GetAsync("/api/identity/users");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task SystemAdmin_Can_GetUserDetail()
    {
        var targetUser = Guid.NewGuid();
        var fake = new FakeSupabaseHandler();
        fake.SeedUserProfile(targetUser, "detail@test.com", "Detail User");

        using var client = CreateClient(fake);
        AddAuthHeaders(client, Guid.NewGuid(), isSystemAdmin: true);

        var response = await client.GetAsync($"/api/identity/users/{targetUser}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task OrgOwner_Can_GetUserDetail()
    {
        var targetUser = Guid.NewGuid();
        var fake = new FakeSupabaseHandler();
        fake.SeedUserProfile(targetUser, "detail@test.com", "Detail User");

        using var client = CreateClient(fake);
        AddAuthHeaders(client, Guid.NewGuid(), orgRole: "OrgOwner");

        var response = await client.GetAsync($"/api/identity/users/{targetUser}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task RegularUser_Cannot_GetUserDetail()
    {
        var targetUser = Guid.NewGuid();
        var fake = new FakeSupabaseHandler();

        using var client = CreateClient(fake);
        AddAuthHeaders(client, Guid.NewGuid());

        var response = await client.GetAsync($"/api/identity/users/{targetUser}");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task OrgOwner_Cannot_AssignOrgRole()
    {
        var targetUser = Guid.NewGuid();
        var fake = new FakeSupabaseHandler();

        using var client = CreateClient(fake);
        AddAuthHeaders(client, Guid.NewGuid(), orgRole: "OrgOwner");

        var response = await client.PostAsJsonAsync($"/api/identity/users/{targetUser}/org-role", new { });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task OrgOwner_Cannot_RevokeOrgRole()
    {
        var targetUser = Guid.NewGuid();
        var fake = new FakeSupabaseHandler();

        using var client = CreateClient(fake);
        AddAuthHeaders(client, Guid.NewGuid(), orgRole: "OrgOwner");

        var response = await client.DeleteAsync($"/api/identity/users/{targetUser}/org-role");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task OrgOwner_Cannot_ListInviteTokens()
    {
        var fake = new FakeSupabaseHandler();

        using var client = CreateClient(fake);
        AddAuthHeaders(client, Guid.NewGuid(), orgRole: "OrgOwner");

        var response = await client.GetAsync("/api/identity/invite-tokens");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task OrgOwner_Cannot_CreateInviteToken()
    {
        var fake = new FakeSupabaseHandler();

        using var client = CreateClient(fake);
        AddAuthHeaders(client, Guid.NewGuid(), orgRole: "OrgOwner");

        var response = await client.PostAsJsonAsync("/api/identity/invite-tokens", new { emailHint = "test@test.com" });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task OrgOwner_Cannot_RevokeInviteToken()
    {
        var tokenId = Guid.NewGuid();
        var fake = new FakeSupabaseHandler();

        using var client = CreateClient(fake);
        AddAuthHeaders(client, Guid.NewGuid(), orgRole: "OrgOwner");

        var response = await client.DeleteAsync($"/api/identity/invite-tokens/{tokenId}");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
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
                services.AddAuthorization(options =>
                {
                    options.AddPolicy("SystemAdmin", policy => policy.RequireClaim("sancho:system_admin", "true"));
                });

                services.AddSingleton(fakeSupabase);
                services.AddSingleton<HttpMessageHandler>(fakeSupabase);
                services.AddScoped(_ => new HttpClient(fakeSupabase));
            })
            .Configure(app =>
            {
                app.UseRouting();
                app.UseAuthentication();
                app.UseAuthorization();
                app.UseEndpoints(endpoints =>
                {
                    endpoints.MapIdentityEndpoints();
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
    public Dictionary<Guid, UserProfileState> UserProfiles { get; } = new();

    public void SeedUserProfile(Guid userId, string email, string displayName)
    {
        UserProfiles[userId] = new UserProfileState(userId, email, displayName);
    }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var path = request.RequestUri?.AbsolutePath ?? string.Empty;
        var query = request.RequestUri?.Query ?? string.Empty;

        // user_profiles
        if (path.EndsWith("/rest/v1/user_profiles", StringComparison.OrdinalIgnoreCase))
        {
            var id = TryReadGuidFilter(query, "id");
            if (id.HasValue && UserProfiles.TryGetValue(id.Value, out var single))
            {
                return Task.FromResult(JsonOk(new[] { single.ToSupabaseRow() }));
            }

            return Task.FromResult(JsonOk(UserProfiles.Values.Select(x => x.ToSupabaseRow()).ToList()));
        }

        // Auth admin user detail endpoint expects a single object, not an array
        if (path.Contains("/auth/v1/admin/users/", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
        }

        // Default relaxed response for non-tested calls (org_members, system_admins, event_members, etc.)
        return Task.FromResult(JsonOk(Array.Empty<object>()));
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
}

internal sealed record UserProfileState(Guid Id, string Email, string DisplayName)
{
    public object ToSupabaseRow() => new
    {
        id = Id,
        email = Email,
        display_name = DisplayName,
        avatar_url = (string?)null,
        bio = (string?)null,
        locale = "en"
    };
}
