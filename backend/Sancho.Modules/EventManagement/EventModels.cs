using System.Text.Json.Serialization;

namespace EventManagement.Models;

public record EventListItemDto(
    Guid Id,
    string Name,
    string? Location,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt,
    string Status,
    DateTimeOffset? ArchivedAt,
    DateTimeOffset? DeletedAt
);

public record EventDetailDto(
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
    DateTimeOffset UpdatedAt
);

public record CreateEventRequest(
    string Name,
    string? Location,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt
);

public record UpdateEventRequest(
    string? Name,
    string? Location,
    DateTimeOffset? StartAt,
    DateTimeOffset? EndAt
);

public record EventOperationRequest(
    string? Reason
);

public record AssignEventManagerRequest();

public record UpsertEventPermissionRequest(
    string Permission
);

public record EventStatsDto(
    int CharactersCount,
    int QuestLinesCount,
    int ItemsCount,
    int PlayersCount,
    Dictionary<string, string> Sources
);

public record RecentActivityItemDto(
    Guid Id,
    Guid EventId,
    Guid? ActorUserId,
    string Action,
    string? EntityType,
    Guid? EntityId,
    Dictionary<string, object?> Metadata,
    DateTimeOffset CreatedAt
);

public record EventManagerDto(
    Guid UserId,
    string Role,
    DateTimeOffset CreatedAt
);

public record EventPermissionDto(
    Guid UserId,
    string Module,
    string Permission,
    Guid? GrantedBy,
    DateTimeOffset GrantedAt
);

internal record SupabaseEventResponse(
    Guid id,
    string? name,
    string? location,
    [property: JsonPropertyName("start_at")] DateTimeOffset? start_at,
    [property: JsonPropertyName("end_at")] DateTimeOffset? end_at,
    string? status,
    [property: JsonPropertyName("archived_at")] DateTimeOffset? archived_at,
    [property: JsonPropertyName("archived_by")] Guid? archived_by,
    [property: JsonPropertyName("deleted_at")] DateTimeOffset? deleted_at,
    [property: JsonPropertyName("deleted_by")] Guid? deleted_by,
    [property: JsonPropertyName("deletion_reason")] string? deletion_reason,
    [property: JsonPropertyName("created_at")] DateTimeOffset? created_at,
    [property: JsonPropertyName("updated_at")] DateTimeOffset? updated_at
);

internal record SupabaseEventMemberResponse(
    [property: JsonPropertyName("user_id")] Guid user_id,
    string role,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at
);

internal record SupabaseEventPermissionResponse(
    [property: JsonPropertyName("user_id")] Guid user_id,
    string module,
    string permission,
    [property: JsonPropertyName("granted_by")] Guid? granted_by,
    [property: JsonPropertyName("granted_at")] DateTimeOffset? granted_at
);

internal record SupabaseActivityResponse(
    Guid id,
    [property: JsonPropertyName("event_id")] Guid event_id,
    [property: JsonPropertyName("actor_user_id")] Guid? actor_user_id,
    string action,
    [property: JsonPropertyName("entity_type")] string? entity_type,
    [property: JsonPropertyName("entity_id")] Guid? entity_id,
    Dictionary<string, object?>? metadata,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at
);

internal record SupabaseCountOnly(
    Guid user_id
);
