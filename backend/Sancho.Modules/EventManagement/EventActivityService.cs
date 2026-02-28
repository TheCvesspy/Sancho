using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace EventManagement.Services;

public class EventActivityService
{
    private readonly HttpClient _httpClient;

    public EventActivityService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task LogAsync(
        string supabaseUrl,
        string supabaseKey,
        Guid eventId,
        Guid? actorUserId,
        string action,
        string? entityType = null,
        Guid? entityId = null,
        Dictionary<string, object?>? metadata = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"{supabaseUrl}/rest/v1/event_activity_log");
        request.Headers.Add("Prefer", "return=minimal");
        AddSupabaseHeaders(request, supabaseKey);
        request.Content = JsonContent.Create(new
        {
            event_id = eventId,
            actor_user_id = actorUserId,
            action,
            entity_type = entityType,
            entity_id = entityId,
            metadata = metadata ?? new Dictionary<string, object?>()
        });

        await _httpClient.SendAsync(request);
    }

    private static void AddSupabaseHeaders(HttpRequestMessage request, string key)
    {
        request.Headers.Add("apikey", key);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
    }
}
