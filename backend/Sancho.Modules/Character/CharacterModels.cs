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

public static class CharacterAttachmentDocumentStatuses
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

public static class CharacterAttachmentSourceTypes
{
    public const string Upload = "Upload";
    public const string GoogleDrive = "GoogleDrive";

    public static readonly HashSet<string> All =
    [
        Upload,
        GoogleDrive
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
    string DisplayName,
    string FileName,
    string FileUrl,
    string MimeType,
    string Category,
    string DocumentStatus,
    string SourceType,
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

public record CharacterRelationshipDto(
    Guid Id,
    Guid EventId,
    Guid SourceCharacterId,
    Guid TargetCharacterId,
    string TargetCharacterName,
    string RelationType,
    string RelationMode,
    Guid? MirrorGroupId,
    bool IsAutoMirror,
    string? Description,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

public record CharacterAssignedItemDto(
    Guid ItemId,
    string ItemName,
    string? ItemDescription,
    string? ItemStatus,
    string? AssignmentNotes,
    DateTimeOffset AssignedAt
);

public record NarrativeQuestDto(
    Guid QuestId,
    string Name,
    string? ShortDescription,
    string Role,
    string Status
);

public record CharacterNarrativeLinksDto(
    IReadOnlyList<NarrativeFactionDto> Factions,
    IReadOnlyList<NarrativeRelationshipDto> Relationships,
    IReadOnlyList<NarrativeQuestDto> Quests,
    IReadOnlyList<CharacterAssignedItemDto> Items
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
    string Category,
    string? DisplayName,
    string DocumentStatus
);

public record AddGoogleDriveLinkRequest(
    string Url,
    string DisplayName,
    string DocumentStatus
);

public record UpdateCharacterAttachmentRequest(
    string? DisplayName,
    string? DocumentStatus,
    string? NewFilePath,
    string? OldFilePath,
    string? NewGoogleDriveUrl
);

public record CreateCharacterRelationshipRequest(
    Guid TargetCharacterId,
    string RelationType,
    string RelationMode,
    string? Description
);

public record UpdateCharacterRelationshipRequest(
    string? RelationType,
    string? Description
);

public record AssignItemToCharacterRequest(
    string? Notes
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
    [property: JsonPropertyName("display_name")] string? display_name,
    [property: JsonPropertyName("document_status")] string document_status,
    [property: JsonPropertyName("source_type")] string source_type,
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

internal record SupabaseCharacterRelationshipRow(
    Guid id,
    [property: JsonPropertyName("event_id")] Guid event_id,
    [property: JsonPropertyName("source_character_id")] Guid source_character_id,
    [property: JsonPropertyName("target_character_id")] Guid target_character_id,
    [property: JsonPropertyName("relation_type")] string relation_type,
    [property: JsonPropertyName("relation_mode")] string relation_mode,
    [property: JsonPropertyName("mirror_group_id")] Guid? mirror_group_id,
    [property: JsonPropertyName("is_auto_mirror")] bool is_auto_mirror,
    [property: JsonPropertyName("is_active")] bool is_active,
    string? description,
    [property: JsonPropertyName("created_at")] DateTimeOffset created_at,
    [property: JsonPropertyName("updated_at")] DateTimeOffset updated_at
);

internal record SupabaseCharacterNameRow(
    Guid id,
    string name
);

internal record SupabaseItemAssignmentJoinRow(
    [property: JsonPropertyName("item_id")] Guid item_id,
    [property: JsonPropertyName("character_id")] Guid character_id,
    [property: JsonPropertyName("assigned_at")] DateTimeOffset assigned_at,
    string? notes,
    [property: JsonPropertyName("item")] SupabaseItemInfoRow? item
);

internal record SupabaseItemInfoRow(
    Guid id,
    string name,
    string? description,
    string? status
);
