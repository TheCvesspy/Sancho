using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Character.Models;
using Character.Services;
using Microsoft.Extensions.Configuration;

namespace Narrative.Services;

public sealed class NarrativeCharacterNarrativeService : ICharacterNarrativeService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;

    public NarrativeCharacterNarrativeService(HttpClient httpClient, IConfiguration config)
    {
        _httpClient = httpClient;
        _config = config;
    }

    public async Task<IReadOnlyList<NarrativeFactionDto>> GetFactionsAsync(Guid eventId, Guid characterId)
    {
        if (!TryConfig(out var url, out var key)) return [];

        var query =
            $"{url}/rest/v1/narrative_faction_members" +
            $"?event_id=eq.{eventId}" +
            $"&character_id=eq.{characterId}" +
            "&select=role,faction_id,narrative_factions!inner(id,name,event_id,deleted_at)";

        var request = new HttpRequestMessage(HttpMethod.Get, query);
        AddHeaders(request, key!);
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return [];

        var rows = await response.Content.ReadFromJsonAsync<List<FactionMembershipRow>>() ?? [];
        return rows
            .Where(r => r.narrative_factions is not null && r.narrative_factions.deleted_at is null && r.narrative_factions.event_id == eventId)
            .Select(r => new NarrativeFactionDto(r.faction_id, r.narrative_factions!.name, r.role))
            .ToList();
    }

    public async Task<IReadOnlyList<NarrativeRelationshipDto>> GetRelationshipsAsync(Guid eventId, Guid characterId)
    {
        if (!TryConfig(out var url, out var key)) return [];

        var query =
            $"{url}/rest/v1/narrative_character_relationships" +
            $"?event_id=eq.{eventId}" +
            $"&or=(source_character_id.eq.{characterId},target_character_id.eq.{characterId})" +
            "&is_active=eq.true" +
            "&select=source_character_id,target_character_id,type,description,source_character:source_character_id(name),target_character:target_character_id(name)";

        var request = new HttpRequestMessage(HttpMethod.Get, query);
        AddHeaders(request, key!);
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return [];

        var rows = await response.Content.ReadFromJsonAsync<List<CharacterRelationshipRow>>() ?? [];
        return rows.Select(r =>
        {
            var sourceIsCurrent = r.source_character_id == characterId;
            var otherId = sourceIsCurrent ? r.target_character_id : r.source_character_id;
            var otherName = sourceIsCurrent ? r.target_character?.name : r.source_character?.name;
            return new NarrativeRelationshipDto(
                OtherCharacterId: otherId,
                OtherCharacterName: otherName ?? "Unknown",
                Type: r.type,
                Description: r.description
            );
        }).ToList();
    }

    public async Task<IReadOnlyList<NarrativeQuestDto>> GetQuestsAsync(Guid eventId, Guid characterId)
    {
        if (!TryConfig(out var url, out var key)) return [];

        var query =
            $"{url}/rest/v1/narrative_quest_characters" +
            $"?event_id=eq.{eventId}" +
            $"&character_id=eq.{characterId}" +
            "&select=role,narrative_quests!inner(id,title,short_description,status,event_id,deleted_at)";

        var request = new HttpRequestMessage(HttpMethod.Get, query);
        AddHeaders(request, key!);
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return [];

        var rows = await response.Content.ReadFromJsonAsync<List<QuestCharacterLinkRow>>() ?? [];
        return rows
            .Where(r => r.narrative_quests is not null && r.narrative_quests.deleted_at is null && r.narrative_quests.event_id == eventId)
            .Select(r => new NarrativeQuestDto(
                QuestId: r.narrative_quests!.id,
                Name: r.narrative_quests.title,
                ShortDescription: r.narrative_quests.short_description,
                Role: string.IsNullOrWhiteSpace(r.role) ? "Participant" : r.role,
                Status: r.narrative_quests.status
            ))
            .ToList();
    }

    public async Task<bool> HasActiveRelationshipsAsync(Guid eventId, Guid characterId)
    {
        if (!TryConfig(out var url, out var key)) return false;

        var query =
            $"{url}/rest/v1/narrative_character_relationships" +
            $"?event_id=eq.{eventId}" +
            $"&or=(source_character_id.eq.{characterId},target_character_id.eq.{characterId})" +
            "&is_active=eq.true" +
            "&select=id&limit=1";

        var request = new HttpRequestMessage(HttpMethod.Get, query);
        AddHeaders(request, key!);
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode) return false;

        var rows = await response.Content.ReadFromJsonAsync<List<SupabaseIdRow>>() ?? [];
        return rows.Count > 0;
    }

    private bool TryConfig(out string? url, out string? key)
    {
        url = _config["Supabase:Url"];
        key = _config["Supabase:ServiceRoleKey"];
        return !string.IsNullOrWhiteSpace(url) && !string.IsNullOrWhiteSpace(key);
    }

    private static void AddHeaders(HttpRequestMessage request, string key)
    {
        request.Headers.Add("apikey", key);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
    }

    private sealed record SupabaseIdRow(Guid id);

    private sealed record FactionMembershipRow(
        string? role,
        [property: JsonPropertyName("faction_id")] Guid faction_id,
        [property: JsonPropertyName("narrative_factions")] FactionRow? narrative_factions
    );

    private sealed record FactionRow(
        Guid id,
        string name,
        [property: JsonPropertyName("event_id")] Guid event_id,
        [property: JsonPropertyName("deleted_at")] DateTimeOffset? deleted_at
    );

    private sealed record CharacterRelationshipRow(
        [property: JsonPropertyName("source_character_id")] Guid source_character_id,
        [property: JsonPropertyName("target_character_id")] Guid target_character_id,
        string type,
        string? description,
        [property: JsonPropertyName("source_character")] CharacterNameRow? source_character,
        [property: JsonPropertyName("target_character")] CharacterNameRow? target_character
    );

    private sealed record CharacterNameRow(
        string name
    );

    private sealed record QuestCharacterLinkRow(
        string? role,
        [property: JsonPropertyName("narrative_quests")] QuestRow? narrative_quests
    );

    private sealed record QuestRow(
        Guid id,
        string title,
        [property: JsonPropertyName("short_description")] string? short_description,
        string status,
        [property: JsonPropertyName("event_id")] Guid event_id,
        [property: JsonPropertyName("deleted_at")] DateTimeOffset? deleted_at
    );
}
