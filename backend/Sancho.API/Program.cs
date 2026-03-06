using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.IdentityModel.Tokens;
using User.Endpoints;
using Identity.Endpoints;
using EventManagement.Endpoints;
using Character.Endpoints;
using Narrative.Endpoints;
using Microsoft.AspNetCore.Authentication;
using Sancho.Infrastructure.Authorization;
using Sancho.Shared.Roles;
using EventManagement.Services;
using Character.Services;
using Narrative.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi("v1");

// In-memory cache — used by SanchoClaimsTransformation (90 s auth data TTL).
builder.Services.AddMemoryCache();

// Response compression — brotli preferred, gzip fallback.
builder.Services.AddResponseCompression(opts =>
{
    opts.EnableForHttps = true;
    opts.Providers.Add<BrotliCompressionProvider>();
    opts.Providers.Add<GzipCompressionProvider>();
    opts.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(new[]
    {
        "application/json",
        "application/problem+json"
    });
});

// Cache of Supabase signing keys — pre-fetched asynchronously at startup.
IList<SecurityKey>? _cachedKeys = null;

// Extract jwksUrl to outer scope so it is accessible in the startup prefetch block.
var supabaseUrlForJwks = builder.Configuration["Supabase:Url"]
    ?? throw new InvalidOperationException("Supabase:Url is not configured.");
var jwksUrl = $"{supabaseUrlForJwks.TrimEnd('/')}/auth/v1/.well-known/jwks.json";

// Add JWT Authentication using Supabase Asymmetric JWT Signing Keys (JWKS)
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            // Keys are pre-fetched at startup; resolver only reads the cached value.
            // No HttpClient creation or blocking .Result calls on request threads.
            IssuerSigningKeyResolver = (token, securityToken, kid, validationParameters) =>
                _cachedKeys ?? [],
            ValidateIssuer = true,
            ValidIssuer = $"{supabaseUrlForJwks.TrimEnd('/')}/auth/v1",
            ValidateAudience = true,
            ValidAudience = "authenticated",
            ValidateLifetime = true,
            NameClaimType = "sub",
            RoleClaimType = "role"
        };
    });


builder.Services.AddAuthorization(options =>
{
    // 1. Platform Level
    options.AddPolicy(AppRoles.SystemAdmin, policy => policy.RequireClaim("sancho:system_admin", "true"));

    // 2. Module Level Policies
    foreach (var module in ModulePermissions.AllModules)
    {
        // Permission: Read
        options.AddPolicy($"{module}:{ModulePermissions.Read}", policy => 
            policy.RequireAssertion(context => 
                context.User.HasClaim(c => c.Type == $"sancho:permission:{module}" && 
                    (c.Value == ModulePermissions.Read || c.Value == ModulePermissions.Write))));

        // Permission: Write
        options.AddPolicy($"{module}:{ModulePermissions.Write}", policy => 
            policy.RequireAssertion(context => 
                context.User.HasClaim(c => c.Type == $"sancho:permission:{module}" && 
                    c.Value == ModulePermissions.Write)));
    }
});

builder.Services.AddScoped<IClaimsTransformation, SanchoClaimsTransformation>();
builder.Services.AddScoped<EventAuthorizationService>();
builder.Services.AddScoped<EventActivityService>();
builder.Services.AddScoped<EventStatsService>();
builder.Services.AddScoped<CharacterAuthorizationService>();
builder.Services.AddScoped<CharacterStorageService>();
builder.Services.AddScoped<NarrativeAuthorizationService>();
builder.Services.AddScoped<NarrativeDocumentLinkService>();
builder.Services.AddScoped<ICharacterNarrativeService, NarrativeCharacterNarrativeService>();

builder.Services.AddHttpClient();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:3001", "http://localhost:3002")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Pre-fetch Supabase JWKS signing keys asynchronously before accepting requests.
// Eliminates the old blocking new HttpClient() + .Result pattern inside the resolver,
// which caused thread-pool starvation under concurrent load.
{
    var httpFactory = app.Services.GetRequiredService<IHttpClientFactory>();
    using var http = httpFactory.CreateClient();
    try
    {
        var jwksJson = await http.GetStringAsync(jwksUrl);
        var keySet = JsonWebKeySet.Create(jwksJson);
        _cachedKeys = keySet.GetSigningKeys();
        app.Logger.LogInformation("Supabase JWKS keys loaded ({Count} key(s)).", _cachedKeys.Count);
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Failed to pre-fetch Supabase JWKS keys from {Url}.", jwksUrl);
    }
}

// Periodically refresh JWKS keys every hour to pick up key rotations without restarting.
var refreshTimer = new System.Threading.Timer(
    async _ =>
    {
        try
        {
            var factory = app.Services.GetRequiredService<IHttpClientFactory>();
            using var client = factory.CreateClient();
            var json = await client.GetStringAsync(jwksUrl);
            var ks = JsonWebKeySet.Create(json);
            _cachedKeys = ks.GetSigningKeys();
            app.Logger.LogInformation("Supabase JWKS keys refreshed ({Count} key(s)).", _cachedKeys.Count);
        }
        catch (Exception ex)
        {
            app.Logger.LogWarning(ex, "Failed to refresh Supabase JWKS keys. Using existing cached keys.");
        }
    },
    state: null,
    dueTime: TimeSpan.FromHours(1),
    period: TimeSpan.FromHours(1));
app.Lifetime.ApplicationStopping.Register(() => refreshTimer.Dispose());

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Response compression must be before all other response-producing middleware.
app.UseResponseCompression();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// app.MapIdentityEndpoints() logic
app.MapUserEndpoints();
app.MapIdentityEndpoints();
app.MapEventEndpoints();
app.MapCharacterEndpoints();
app.MapNarrativeEndpoints();

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast =  Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast");

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}

