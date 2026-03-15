using System.Net.Http.Headers;
using System.Net.Http.Json;
using Narrative.Models;

namespace Narrative.Services;

public sealed class NarrativeStorageService
{
    private const long MaxUploadBytes = 10L * 1024L * 1024L;
    private const string BucketName = "narrative";

    private static readonly HashSet<string> AllowedImageMimeTypes =
    [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    private static readonly Dictionary<string, HashSet<string>> ExtensionMimeMap = new()
    {
        { ".jpg",  ["image/jpeg"] },
        { ".jpeg", ["image/jpeg"] },
        { ".png",  ["image/png"] },
        { ".webp", ["image/webp"] }
    };

    private readonly HttpClient _httpClient;

    public NarrativeStorageService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<SigilUploadUrlResponse> CreateSigilUploadUrlAsync(
        string supabaseUrl,
        string supabaseKey,
        Guid eventId,
        Guid factionId,
        NarrativeUploadUrlRequest request)
    {
        ValidateUpload(request);
        var extension = NormalizeExtension(request.FileName, request.ContentType);
        var filePath = $"{eventId}/{factionId}/sigil/sigil.{extension}";
        var uploadUrl = await CreateSignedUploadUrlAsync(supabaseUrl, supabaseKey, filePath);
        return new SigilUploadUrlResponse(uploadUrl, filePath);
    }

    public async Task DeleteObjectAsync(string supabaseUrl, string supabaseKey, string filePath)
    {
        var request = new HttpRequestMessage(HttpMethod.Delete, $"{supabaseUrl}/storage/v1/object/{BucketName}/{EncodeStoragePath(filePath)}");
        AddSupabaseHeaders(request, supabaseKey);
        await _httpClient.SendAsync(request);
    }

    private async Task<string> CreateSignedUploadUrlAsync(string supabaseUrl, string supabaseKey, string filePath)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, $"{supabaseUrl}/storage/v1/object/upload/sign/{BucketName}/{EncodeStoragePath(filePath)}");
        AddSupabaseHeaders(request, supabaseKey);
        request.Content = JsonContent.Create(new { expiresIn = 600, upsert = true });
        var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException("Failed to generate signed upload URL.");
        }

        var signResult = await response.Content.ReadFromJsonAsync<SupabaseNarrativeSignUploadResponse>();
        if (string.IsNullOrWhiteSpace(signResult?.token))
        {
            throw new InvalidOperationException("Failed to parse upload token.");
        }

        return $"{supabaseUrl}/storage/v1/object/upload/sign/{BucketName}/{EncodeStoragePath(filePath)}?token={signResult.token}";
    }

    private static void ValidateUpload(NarrativeUploadUrlRequest request)
    {
        if (request.SizeBytes <= 0 || request.SizeBytes > MaxUploadBytes)
        {
            throw new InvalidOperationException($"File size must be between 1 byte and {MaxUploadBytes / (1024 * 1024)} MB.");
        }

        if (string.IsNullOrWhiteSpace(request.ContentType) || !AllowedImageMimeTypes.Contains(request.ContentType.ToLowerInvariant()))
        {
            throw new InvalidOperationException("Unsupported content type.");
        }

        if (string.IsNullOrWhiteSpace(request.FileName))
        {
            throw new InvalidOperationException("File name is required.");
        }

        var extension = Path.GetExtension(request.FileName).ToLowerInvariant();
        if (!string.IsNullOrWhiteSpace(extension) && ExtensionMimeMap.TryGetValue(extension, out var expectedMimes))
        {
            if (!expectedMimes.Contains(request.ContentType.ToLowerInvariant()))
            {
                throw new InvalidOperationException($"File extension '{extension}' does not match the declared content type '{request.ContentType}'.");
            }
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
                _ => "bin"
            };
        }

        return ext == "jpeg" ? "jpg" : ext;
    }

    private static string EncodeStoragePath(string path) =>
        string.Join('/', path.TrimStart('/').Split('/').Select(Uri.EscapeDataString));

    private static void AddSupabaseHeaders(HttpRequestMessage request, string key)
    {
        request.Headers.Add("apikey", key);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
    }
}
