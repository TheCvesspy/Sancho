using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using User.Endpoints;
using Identity.Endpoints;
using EventManagement.Endpoints;
using Character.Endpoints;
using Microsoft.AspNetCore.Authentication;
using Sancho.Infrastructure.Authorization;
using Sancho.Shared.Roles;
using EventManagement.Services;
using Character.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi("v1");

// Cache of Supabase signing keys, fetched lazily from the JWKS endpoint
IList<SecurityKey>? _cachedKeys = null;

// Add JWT Authentication using Supabase Asymmetric JWT Signing Keys (JWKS)
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var supabaseUrl = builder.Configuration["Supabase:Url"];
        if (string.IsNullOrEmpty(supabaseUrl))
        {
            throw new InvalidOperationException("Supabase:Url is not configured.");
        }

        // Supabase publishes raw JWKS (not an OIDC discovery doc) at this endpoint
        var jwksUrl = $"{supabaseUrl.TrimEnd('/')}/auth/v1/.well-known/jwks.json";

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            // Fetch and cache Supabase's public EC keys from the JWKS endpoint
            IssuerSigningKeyResolver = (token, securityToken, kid, validationParameters) =>
            {
                if (_cachedKeys != null) return _cachedKeys;

                using var http = new HttpClient();
                var jwksJson = http.GetStringAsync(jwksUrl).Result;
                var keySet = JsonWebKeySet.Create(jwksJson);
                _cachedKeys = keySet.GetSigningKeys();
                return _cachedKeys;
            },
            ValidateIssuer = true,
            ValidIssuer = $"{supabaseUrl.TrimEnd('/')}/auth/v1",
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
builder.Services.AddScoped<ICharacterNarrativeService, StubCharacterNarrativeService>();

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

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// app.MapIdentityEndpoints() logic
app.MapUserEndpoints();
app.MapIdentityEndpoints();
app.MapEventEndpoints();
app.MapCharacterEndpoints();

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

