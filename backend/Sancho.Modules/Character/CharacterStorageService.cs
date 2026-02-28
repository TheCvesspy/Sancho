using System.Net.Http.Headers;
using System.Net.Http.Json;
using Character.Models;

namespace Character.Services;

public sealed class CharacterStorageService
{
    private const long MaxUploadBytes = 5L * 1024L * 1024L;
    private static readonly HashSet<string> AllowedImageMimeTypes =
    [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    private static readonly HashSet<string> AllowedAttachmentMimeTypes =
    [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
        "text/plain"
    ];

    private readonly HttpClient _httpClient;

    public CharacterStorageService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<PhotoUploadUrlResponse> CreatePhotoUploadUrlAsync(
        string supabaseUrl,
        string supabaseKey,
        Guid eventId,
        Guid characterId,
        CharacterUploadUrlRequest request)
    {
        ValidateUpload(request, AllowedImageMimeTypes);
        var extension = NormalizeExtension(request.FileName, request.ContentType);
        var filePath = $"{eventId}/{characterId}/photo/avatar.{extension}";
        var uploadUrl = await CreateSignedUploadUrlAsync(supabaseUrl, supabaseKey, filePath);
        return new PhotoUploadUrlResponse(uploadUrl, filePath);
    }

    public async Task<AttachmentUploadUrlResponse> CreateAttachmentUploadUrlAsync(
        string supabaseUrl,
        string supabaseKey,
        Guid eventId,
        Guid characterId,
        CharacterUploadUrlRequest request)
    {
        ValidateUpload(request, AllowedAttachmentMimeTypes);
        var safeFileName = SanitizeFileName(request.FileName);
        var filePath = $"{eventId}/{characterId}/attachments/{Guid.NewGuid()}-{safeFileName}";
        var uploadUrl = await CreateSignedUploadUrlAsync(supabaseUrl, supabaseKey, filePath);
        return new AttachmentUploadUrlResponse(uploadUrl, filePath);
    }

    public async Task DeleteObjectAsync(string supabaseUrl, string supabaseKey, string filePath)
    {
        var request = new HttpRequestMessage(HttpMethod.Delete, $"{supabaseUrl}/storage/v1/object/characters/{EncodeStoragePath(filePath)}");
        AddSupabaseHeaders(request, supabaseKey);
        await _httpClient.SendAsync(request);
    }

    private async Task<string> CreateSignedUploadUrlAsync(string supabaseUrl, string supabaseKey, string filePath)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"{supabaseUrl}/storage/v1/object/upload/sign/characters/{EncodeStoragePath(filePath)}");
        AddSupabaseHeaders(request, supabaseKey);
        request.Content = JsonContent.Create(new { expiresIn = 600, upsert = true });
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException("Failed to generate signed upload URL.");
        }

        var signResult = await response.Content.ReadFromJsonAsync<SupabaseSignUploadResponse>();
        if (string.IsNullOrWhiteSpace(signResult?.token))
        {
            throw new InvalidOperationException("Failed to parse upload token.");
        }

        return $"{supabaseUrl}/storage/v1/object/upload/sign/characters/{EncodeStoragePath(filePath)}?token={signResult.token}";
    }

    private static void ValidateUpload(CharacterUploadUrlRequest request, HashSet<string> allowedContentTypes)
    {
        if (request.SizeBytes <= 0 || request.SizeBytes > MaxUploadBytes)
        {
            throw new InvalidOperationException("File size must be between 1 byte and 5 MB.");
        }

        if (string.IsNullOrWhiteSpace(request.ContentType) || !allowedContentTypes.Contains(request.ContentType.ToLowerInvariant()))
        {
            throw new InvalidOperationException("Unsupported content type.");
        }

        if (string.IsNullOrWhiteSpace(request.FileName))
        {
            throw new InvalidOperationException("File name is required.");
        }
    }

    private static string NormalizeExtension(string fileName, string contentType)
    {
        var ext = Path.GetExtension(fileName).Trim('.').ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(ext))
        {
            return contentType switch
            {
                "image/jpeg" => "jpg",
                "image/png" => "png",
                "image/webp" => "webp",
                "application/pdf" => "pdf",
                _ => "bin"
            };
        }

        return ext == "jpeg" ? "jpg" : ext;
    }

    private static string SanitizeFileName(string fileName)
    {
        var cleaned = string.Join("-", fileName.Split(Path.GetInvalidFileNameChars(), StringSplitOptions.RemoveEmptyEntries)).Trim();
        return string.IsNullOrWhiteSpace(cleaned) ? "file.bin" : cleaned;
    }

    private static string EncodeStoragePath(string path) =>
        string.Join('/', path.TrimStart('/').Split('/').Select(Uri.EscapeDataString));

    private static void AddSupabaseHeaders(HttpRequestMessage request, string key)
    {
        request.Headers.Add("apikey", key);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
    }
}

