using System.Text.Json.Serialization;

namespace Narrative.Models;

public static class NarrativeStatuses
{
    public const string Draft = "Draft";
    public const string Ready = "Ready";
    public const string Locked = "Locked";

    public static readonly HashSet<string> All =
    [
        Draft,
        Ready,
        Locked
    ];
}

public static class NarrativeItemStatuses
{
    public const string Draft = "Draft";
    public const string ReadyToReview = "Ready to Review";
    public const string Final = "Final";

    public static readonly HashSet<string> All =
    [
        Draft,
        ReadyToReview,
        Final
    ];
}

public record NarrativeQuestDto(
    Guid Id,
    Guid EventId,
    string Title,
    string? Description,
    string? InternalNotes,
    string Status,
    bool HasFixedPlayers,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? DeletedAt
);

public record NarrativeQuestStepDto(
    Guid Id,
    Guid QuestId,
    Guid EventId,
    int SortOrder,
    string Summary,
    string? Notes,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

public record NarrativeDocumentLinkDto(
    Guid Id,
    Guid EventId,
    string EntityType,
    Guid EntityId,
    string DisplayName,
    string Url,
    string DocumentStatus,
    string SourceType,
    Guid? CreatedBy,
    DateTimeOffset CreatedAt
);

public record NarrativeFactionDto(
    Guid Id,
    Guid EventId,
    string Name,
    string? SigilUrl,
    string? Description,
    string? Goals,
    string? InternalNotes,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? DeletedAt
);

public record NarrativeItemDto(
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
    DateTimeOffset? DeletedAt
);

public record NarrativeFactionMemberDto(
    Guid EventId,
    Guid FactionId,
    Guid CharacterId,
    string? Role,
    DateTimeOffset CreatedAt
);

public record NarrativeItemAssignmentDto(
    Guid EventId,
    Guid ItemId,
    Guid CharacterId,
    Guid? AssignedBy,
    DateTimeOffset AssignedAt,
    string? Notes
);

public record NarrativePlotlineDto(
    Guid Id,
    Guid EventId,
    string Title,
    string? Description,
    string? InternalNotes,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? DeletedAt
);

public record NarrativePlotlinePhaseDto(
    Guid Id,
    Guid PlotlineId,
    Guid EventId,
    int SortOrder,
    string Title,
    string? Summary,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

public record NarrativePlotDto(
    Guid Id,
    Guid EventId,
    string Title,
    string? Description,
    string? InternalNotes,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? DeletedAt
);

public record NarrativePlotlineQuestLinkDto(
    Guid EventId,
    Guid PlotlineId,
    Guid QuestId,
    Guid? PhaseId,
    int SortOrder,
    DateTimeOffset CreatedAt
);

public record NarrativePlotPlotlineLinkDto(
    Guid EventId,
    Guid PlotId,
    Guid PlotlineId,
    int SortOrder,
    DateTimeOffset CreatedAt
);

public record NarrativePlotlineCharacterLinkDto(
    Guid EventId,
    Guid PlotlineId,
    Guid CharacterId,
    DateTimeOffset CreatedAt
);

public record NarrativePlotlineFactionLinkDto(
    Guid EventId,
    Guid PlotlineId,
    Guid FactionId,
    DateTimeOffset CreatedAt
);

public record NarrativePlotlineItemLinkDto(
    Guid EventId,
    Guid PlotlineId,
    Guid ItemId,
    DateTimeOffset CreatedAt
);

public record NarrativePlotCharacterLinkDto(
    Guid EventId,
    Guid PlotId,
    Guid CharacterId,
    DateTimeOffset CreatedAt
);

public record NarrativePlotFactionLinkDto(
    Guid EventId,
    Guid PlotId,
    Guid FactionId,
    DateTimeOffset CreatedAt
);

public record NarrativePlotItemLinkDto(
    Guid EventId,
    Guid PlotId,
    Guid ItemId,
    DateTimeOffset CreatedAt
);

public record NarrativeQuestCharacterLinkDto(
    Guid EventId,
    Guid QuestId,
    Guid CharacterId,
    string? Role,
    DateTimeOffset CreatedAt
);

public record NarrativeQuestFactionLinkDto(
    Guid EventId,
    Guid QuestId,
    Guid FactionId,
    DateTimeOffset CreatedAt
);

public record NarrativeQuestItemLinkDto(
    Guid EventId,
    Guid QuestId,
    Guid ItemId,
    DateTimeOffset CreatedAt
);

public record NarrativeQuestStepItemLinkDto(
    Guid EventId,
    Guid StepId,
    Guid ItemId,
    string LinkType,
    DateTimeOffset CreatedAt
);

public record NarrativeInheritedLinksDto(
    IReadOnlyList<Guid> CharacterIds,
    IReadOnlyList<Guid> FactionIds,
    IReadOnlyList<Guid> ItemIds
);

public record NarrativeFactionRelationshipDto(
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
    DateTimeOffset UpdatedAt
);

public record CreateQuestRequest(
    string Title,
    string? Description,
    string? InternalNotes,
    bool HasFixedPlayers
);

public record UpdateQuestRequest(
    string? Title,
    string? Description,
    string? InternalNotes,
    bool? HasFixedPlayers
);

public record ChangeNarrativeStatusRequest(
    string Status,
    bool ConfirmUnlock = false
);

public record NarrativeDeleteRequest(
    string? Reason
);

public record CreateQuestStepRequest(
    int SortOrder,
    string Summary,
    string? Notes
);

public record UpdateQuestStepRequest(
    int? SortOrder,
    string? Summary,
    string? Notes
);

public record CreateFactionRequest(
    string Name,
    string? SigilUrl,
    string? Description,
    string? Goals,
    string? InternalNotes
);

public record UpdateFactionRequest(
    string? Name,
    string? SigilUrl,
    string? Description,
    string? Goals,
    string? InternalNotes
);

public record UpsertFactionMemberRequest(
    string? Role
);

public record CreateItemRequest(
    string Name,
    string? Description,
    string? InternalNotes,
    bool IsMultiCopy,
    int? MaxCopies
);

public record UpdateItemRequest(
    string? Name,
    string? Description,
    string? InternalNotes,
    bool? IsMultiCopy,
    int? MaxCopies
);

public record ItemAssignmentRequest(
    string? Notes
);

public record CreatePlotlineRequest(
    string Title,
    string? Description,
    string? InternalNotes
);

public record UpdatePlotlineRequest(
    string? Title,
    string? Description,
    string? InternalNotes
);

public record CreatePlotlinePhaseRequest(
    int SortOrder,
    string Title,
    string? Summary
);

public record UpdatePlotlinePhaseRequest(
    int? SortOrder,
    string? Title,
    string? Summary
);

public record UpsertPlotlineQuestRequest(
    Guid? PhaseId,
    int SortOrder
);

public record UpsertQuestCharacterRequest(
    string? Role
);

public record UpsertQuestStepItemRequest(
    string LinkType
);

public record CreateFactionRelationshipRequest(
    Guid? TargetFactionId,
    Guid? TargetCharacterId,
    string RelationType,
    string RelationMode,
    string? Notes
);

public record UpdateFactionRelationshipRequest(
    string? RelationType,
    string? Notes
);

public record CreatePlotRequest(
    string Title,
    string? Description,
    string? InternalNotes
);

public record UpdatePlotRequest(
    string? Title,
    string? Description,
    string? InternalNotes
);

public record UpsertPlotPlotlineRequest(
    int SortOrder
);

public record AddNarrativeGoogleDriveLinkRequest(
    string Url,
    string DisplayName,
    string DocumentStatus
);

internal record SupabaseNarrativeQuestRow(
    Guid id,
    [property: JsonPropertyName("event_id")] Guid event_id,
    string title,
    string? description,
    [property: JsonPropertyName("internal_notes")] string? internal_notes,
    string status,
    [property: JsonPropertyName("has_fixed_players")] bool has_fixed_players,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at,
    [property: JsonPropertyName("updated_at")] DateTimeOffset updated_at,
    [property: JsonPropertyName("deleted_at")] DateTimeOffset? deleted_at
);

internal record SupabaseNarrativeQuestStepRow(
    Guid id,
    [property: JsonPropertyName("quest_id")] Guid quest_id,
    [property: JsonPropertyName("event_id")] Guid event_id,
    [property: JsonPropertyName("sort_order")] int sort_order,
    string summary,
    string? notes,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at,
    [property: JsonPropertyName("updated_at")] DateTimeOffset updated_at
);

internal record SupabaseNarrativeDocumentLinkRow(
    Guid id,
    [property: JsonPropertyName("event_id")] Guid event_id,
    [property: JsonPropertyName("entity_type")] string entity_type,
    [property: JsonPropertyName("entity_id")] Guid entity_id,
    [property: JsonPropertyName("display_name")] string display_name,
    string url,
    [property: JsonPropertyName("document_status")] string document_status,
    [property: JsonPropertyName("source_type")] string source_type,
    [property: JsonPropertyName("created_by")] Guid? created_by,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at
);

internal record SupabaseNarrativeFactionRow(
    Guid id,
    [property: JsonPropertyName("event_id")] Guid event_id,
    string name,
    [property: JsonPropertyName("sigil_url")] string? sigil_url,
    string? description,
    string? goals,
    [property: JsonPropertyName("internal_notes")] string? internal_notes,
    string status,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at,
    [property: JsonPropertyName("updated_at")] DateTimeOffset updated_at,
    [property: JsonPropertyName("deleted_at")] DateTimeOffset? deleted_at
);

internal record SupabaseNarrativeItemRow(
    Guid id,
    [property: JsonPropertyName("event_id")] Guid event_id,
    string name,
    string? description,
    [property: JsonPropertyName("internal_notes")] string? internal_notes,
    string status,
    [property: JsonPropertyName("is_multi_copy")] bool is_multi_copy,
    [property: JsonPropertyName("max_copies")] int? max_copies,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at,
    [property: JsonPropertyName("updated_at")] DateTimeOffset updated_at,
    [property: JsonPropertyName("deleted_at")] DateTimeOffset? deleted_at
);

internal record SupabaseNarrativeFactionMemberRow(
    [property: JsonPropertyName("event_id")] Guid event_id,
    [property: JsonPropertyName("faction_id")] Guid faction_id,
    [property: JsonPropertyName("character_id")] Guid character_id,
    string? role,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at
);

internal record SupabaseNarrativeItemAssignmentRow(
    [property: JsonPropertyName("event_id")] Guid event_id,
    [property: JsonPropertyName("item_id")] Guid item_id,
    [property: JsonPropertyName("character_id")] Guid character_id,
    [property: JsonPropertyName("assigned_by")] Guid? assigned_by,
    [property: JsonPropertyName("assigned_at")] DateTimeOffset assigned_at,
    string? notes
);

internal record SupabaseNarrativePlotlineRow(
    Guid id,
    [property: JsonPropertyName("event_id")] Guid event_id,
    string title,
    string? description,
    [property: JsonPropertyName("internal_notes")] string? internal_notes,
    string status,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at,
    [property: JsonPropertyName("updated_at")] DateTimeOffset updated_at,
    [property: JsonPropertyName("deleted_at")] DateTimeOffset? deleted_at
);

internal record SupabaseNarrativePlotlinePhaseRow(
    Guid id,
    [property: JsonPropertyName("plotline_id")] Guid plotline_id,
    [property: JsonPropertyName("event_id")] Guid event_id,
    [property: JsonPropertyName("sort_order")] int sort_order,
    string title,
    string? summary,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at,
    [property: JsonPropertyName("updated_at")] DateTimeOffset updated_at
);

internal record SupabaseNarrativePlotRow(
    Guid id,
    [property: JsonPropertyName("event_id")] Guid event_id,
    string title,
    string? description,
    [property: JsonPropertyName("internal_notes")] string? internal_notes,
    string status,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at,
    [property: JsonPropertyName("updated_at")] DateTimeOffset updated_at,
    [property: JsonPropertyName("deleted_at")] DateTimeOffset? deleted_at
);

internal record SupabaseNarrativePlotlineQuestRow(
    [property: JsonPropertyName("event_id")] Guid event_id,
    [property: JsonPropertyName("plotline_id")] Guid plotline_id,
    [property: JsonPropertyName("quest_id")] Guid quest_id,
    [property: JsonPropertyName("phase_id")] Guid? phase_id,
    [property: JsonPropertyName("sort_order")] int sort_order,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at
);

internal record SupabaseNarrativePlotPlotlineRow(
    [property: JsonPropertyName("event_id")] Guid event_id,
    [property: JsonPropertyName("plot_id")] Guid plot_id,
    [property: JsonPropertyName("plotline_id")] Guid plotline_id,
    [property: JsonPropertyName("sort_order")] int sort_order,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at
);

internal record SupabaseNarrativeQuestCharacterRow(
    [property: JsonPropertyName("event_id")] Guid event_id,
    [property: JsonPropertyName("quest_id")] Guid quest_id,
    [property: JsonPropertyName("character_id")] Guid character_id,
    string? role,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at
);

internal record SupabaseNarrativeQuestFactionRow(
    [property: JsonPropertyName("event_id")] Guid event_id,
    [property: JsonPropertyName("quest_id")] Guid quest_id,
    [property: JsonPropertyName("faction_id")] Guid faction_id,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at
);

internal record SupabaseNarrativeQuestItemRow(
    [property: JsonPropertyName("event_id")] Guid event_id,
    [property: JsonPropertyName("quest_id")] Guid quest_id,
    [property: JsonPropertyName("item_id")] Guid item_id,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at
);

internal record SupabaseNarrativeFactionRelationshipRow(
    Guid id,
    [property: JsonPropertyName("event_id")] Guid event_id,
    [property: JsonPropertyName("source_faction_id")] Guid source_faction_id,
    [property: JsonPropertyName("target_faction_id")] Guid? target_faction_id,
    [property: JsonPropertyName("target_character_id")] Guid? target_character_id,
    [property: JsonPropertyName("relation_type")] string relation_type,
    [property: JsonPropertyName("relation_mode")] string relation_mode,
    [property: JsonPropertyName("mirror_group_id")] Guid? mirror_group_id,
    [property: JsonPropertyName("is_auto_mirror")] bool is_auto_mirror,
    string? notes,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at,
    [property: JsonPropertyName("updated_at")] DateTimeOffset updated_at
);

internal record SupabaseNarrativeQuestStepItemRow(
    [property: JsonPropertyName("event_id")] Guid event_id,
    [property: JsonPropertyName("step_id")] Guid step_id,
    [property: JsonPropertyName("item_id")] Guid item_id,
    [property: JsonPropertyName("link_type")] string link_type,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at
);

internal record SupabaseNarrativePlotlineCharacterRow(
    [property: JsonPropertyName("event_id")] Guid event_id,
    [property: JsonPropertyName("plotline_id")] Guid plotline_id,
    [property: JsonPropertyName("character_id")] Guid character_id,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at
);

internal record SupabaseNarrativePlotlineFactionRow(
    [property: JsonPropertyName("event_id")] Guid event_id,
    [property: JsonPropertyName("plotline_id")] Guid plotline_id,
    [property: JsonPropertyName("faction_id")] Guid faction_id,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at
);

internal record SupabaseNarrativePlotlineItemRow(
    [property: JsonPropertyName("event_id")] Guid event_id,
    [property: JsonPropertyName("plotline_id")] Guid plotline_id,
    [property: JsonPropertyName("item_id")] Guid item_id,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at
);

internal record SupabaseNarrativePlotCharacterRow(
    [property: JsonPropertyName("event_id")] Guid event_id,
    [property: JsonPropertyName("plot_id")] Guid plot_id,
    [property: JsonPropertyName("character_id")] Guid character_id,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at
);

internal record SupabaseNarrativePlotFactionRow(
    [property: JsonPropertyName("event_id")] Guid event_id,
    [property: JsonPropertyName("plot_id")] Guid plot_id,
    [property: JsonPropertyName("faction_id")] Guid faction_id,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at
);

internal record SupabaseNarrativePlotItemRow(
    [property: JsonPropertyName("event_id")] Guid event_id,
    [property: JsonPropertyName("plot_id")] Guid plot_id,
    [property: JsonPropertyName("item_id")] Guid item_id,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at
);

internal record SupabaseNarrativePermissionRow(
    string permission
);

internal record SupabaseEventStatusRow(
    Guid id,
    string status,
    [property: JsonPropertyName("deleted_at")] DateTimeOffset? deleted_at
);

internal record SupabaseNarrativeIdRow(
    Guid id
);
