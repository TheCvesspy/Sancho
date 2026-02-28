using System.Net.Http.Headers;
using System.Net.Http.Json;
using EventManagement.Models;

namespace EventManagement.Services;

public class EventStatsService
{
    private readonly HttpClient _httpClient;

    public EventStatsService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<EventStatsDto> GetStatsAsync(Guid eventId, string supabaseUrl, string supabaseKey)
    {
        // Current data model supports user/event relationships; content-module records are still pending.
        // Players are approximated as distinct users assigned to the event through manager membership
        // or explicit event permission grants.
        var players = await GetPlayersCountAsync(eventId, supabaseUrl, supabaseKey);

        return new EventStatsDto(
            CharactersCount: 0,
            QuestLinesCount: 0,
            ItemsCount: 0,
            PlayersCount: players,
            Sources: new Dictionary<string, string>
            {
                ["characters"] = "unavailable",
                ["questLines"] = "unavailable",
                ["items"] = "unavailable",
                ["players"] = "event-members-and-permissions"
            });
    }

    private async Task<int> GetPlayersCountAsync(Guid eventId, string supabaseUrl, string supabaseKey)
    {
        var managersReq = new HttpRequestMessage(
            HttpMethod.Get,
            $"{supabaseUrl}/rest/v1/event_members?event_id=eq.{eventId}&select=user_id");
        AddSupabaseHeaders(managersReq, supabaseKey);
        var managersResp = await _httpClient.SendAsync(managersReq);
        var managers = managersResp.IsSuccessStatusCode
            ? await managersResp.Content.ReadFromJsonAsync<List<SupabaseCountOnly>>()
            : [];

        var permsReq = new HttpRequestMessage(
            HttpMethod.Get,
            $"{supabaseUrl}/rest/v1/event_member_permissions?event_id=eq.{eventId}&select=user_id");
        AddSupabaseHeaders(permsReq, supabaseKey);
        var permsResp = await _httpClient.SendAsync(permsReq);
        var perms = permsResp.IsSuccessStatusCode
            ? await permsResp.Content.ReadFromJsonAsync<List<SupabaseCountOnly>>()
            : [];

        var distinct = new HashSet<Guid>();
        if (managers != null)
        {
            foreach (var row in managers) distinct.Add(row.user_id);
        }

        if (perms != null)
        {
            foreach (var row in perms) distinct.Add(row.user_id);
        }

        return distinct.Count;
    }

    private static void AddSupabaseHeaders(HttpRequestMessage request, string key)
    {
        request.Headers.Add("apikey", key);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
    }
}
