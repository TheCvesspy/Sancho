using Character.Models;

namespace Character.Services;

public interface ICharacterNarrativeService
{
    Task<IReadOnlyList<NarrativeFactionDto>> GetFactionsAsync(Guid eventId, Guid characterId);
    Task<IReadOnlyList<NarrativeRelationshipDto>> GetRelationshipsAsync(Guid eventId, Guid characterId);
    Task<IReadOnlyList<NarrativeQuestDto>> GetQuestsAsync(Guid eventId, Guid characterId);
    Task<bool> HasActiveRelationshipsAsync(Guid eventId, Guid characterId);
}

public sealed class StubCharacterNarrativeService : ICharacterNarrativeService
{
    public Task<IReadOnlyList<NarrativeFactionDto>> GetFactionsAsync(Guid eventId, Guid characterId) =>
        Task.FromResult<IReadOnlyList<NarrativeFactionDto>>([]);

    public Task<IReadOnlyList<NarrativeRelationshipDto>> GetRelationshipsAsync(Guid eventId, Guid characterId) =>
        Task.FromResult<IReadOnlyList<NarrativeRelationshipDto>>([]);

    public Task<IReadOnlyList<NarrativeQuestDto>> GetQuestsAsync(Guid eventId, Guid characterId) =>
        Task.FromResult<IReadOnlyList<NarrativeQuestDto>>([]);

    public Task<bool> HasActiveRelationshipsAsync(Guid eventId, Guid characterId) =>
        Task.FromResult(false);
}

