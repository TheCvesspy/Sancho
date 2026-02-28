using System.Text.Json.Serialization;

namespace Character.Models;

public static class CharacterStatuses
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

public static class CharacterAttachmentCategories
{
    public const string Document = "Document";
    public const string Image = "Image";
    public const string Other = "Other";

    public static readonly HashSet<string> All =
    [
        Document,
        Image,
        Other
    ];
}

public record CharacterListItemDto(
    Guid Id,
    Guid EventId,
    string Name,
    string Race,
    string Status,
    Guid? PlayerUserId,
    string? PhotoUrl,
    int AbilitiesCount,
    int AttachmentsCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

public record CharacterDetailDto(
    Guid Id,
    Guid EventId,
    string Name,
    string Race,
    string Status,
    string? Biography,
    string? Notes,
    Guid? PlayerUserId,
    string? PhotoUrl,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? DeletedAt
);

public record CharacterAbilityDto(
    Guid Id,
    Guid CharacterId,
    string Category,
    string Name,
    string Value,
    string? Description,
    int SortOrder,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

public record CharacterAttachmentDto(
    Guid Id,
    Guid CharacterId,
    string FileName,
    string FileUrl,
    string MimeType,
    string Category,
    Guid? UploadedBy,
    DateTimeOffset UploadedAt
);

public record NarrativeFactionDto(
    Guid FactionId,
    string Name,
    string? Role
);

public record NarrativeRelationshipDto(
    Guid OtherCharacterId,
    string OtherCharacterName,
    string Type,
    string? Description
);

public record NarrativeQuestDto(
    Guid QuestId,
    string Name,
    string Role,
    string Status
);

public record CharacterNarrativeLinksDto(
    IReadOnlyList<NarrativeFactionDto> Factions,
    IReadOnlyList<NarrativeRelationshipDto> Relationships,
    IReadOnlyList<NarrativeQuestDto> Quests
);

public record CreateCharacterRequest(
    string Name,
    string Race,
    string? Biography,
    string? Notes
);

public record UpdateCharacterProfileRequest(
    string? Name,
    string? Race,
    string? Biography,
    string? Notes,
    Guid? PlayerUserId
);

public record ChangeCharacterStatusRequest(
    string Status,
    bool ConfirmUnlock = false
);

public record DuplicateCharacterRequest(
    string? Name
);

public record CreateCharacterAbilityRequest(
    string Category,
    string Name,
    string Value,
    string? Description,
    int SortOrder
);

public record UpdateCharacterAbilityRequest(
    string? Category,
    string? Name,
    string? Value,
    string? Description,
    int? SortOrder
);

public record CharacterUploadUrlRequest(
    string FileName,
    string ContentType,
    long SizeBytes
);

public record PhotoUploadUrlResponse(
    string UploadUrl,
    string FilePath
);

public record AttachmentUploadUrlResponse(
    string UploadUrl,
    string FilePath
);

public record ConfirmCharacterPhotoRequest(
    string FilePath
);

public record ConfirmCharacterAttachmentRequest(
    string FileName,
    string FilePath,
    string MimeType,
    string Category
);

public record CharacterDeleteRequest(
    string? Reason
);

internal record SupabaseCharacterRow(
    Guid id,
    [property: JsonPropertyName("event_id")] Guid event_id,
    string name,
    string race,
    string status,
    string? biography,
    string? notes,
    [property: JsonPropertyName("player_user_id")] Guid? player_user_id,
    [property: JsonPropertyName("photo_url")] string? photo_url,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at,
    [property: JsonPropertyName("updated_at")] DateTimeOffset updated_at,
    [property: JsonPropertyName("deleted_at")] DateTimeOffset? deleted_at
);

internal record SupabaseCharacterAbilityRow(
    Guid id,
    [property: JsonPropertyName("character_id")] Guid character_id,
    string category,
    string name,
    string value,
    string? description,
    [property: JsonPropertyName("sort_order")] int sort_order,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at,
    [property: JsonPropertyName("updated_at")] DateTimeOffset updated_at
);

internal record SupabaseCharacterAttachmentRow(
    Guid id,
    [property: JsonPropertyName("character_id")] Guid character_id,
    [property: JsonPropertyName("file_name")] string file_name,
    [property: JsonPropertyName("file_url")] string file_url,
    [property: JsonPropertyName("mime_type")] string mime_type,
    string category,
    [property: JsonPropertyName("uploaded_by")] Guid? uploaded_by,
    [property: JsonPropertyName("uploaded_at")] DateTimeOffset uploaded_at
);

internal record SupabaseSignUploadResponse(
    string token
);

internal record SupabasePermissionRow(
    string permission
);

internal record SupabaseEventStatusRow(
    Guid id,
    string status,
    [property: JsonPropertyName("deleted_at")] DateTimeOffset? deleted_at
);

internal record SupabaseIdRow(
    Guid id
);
