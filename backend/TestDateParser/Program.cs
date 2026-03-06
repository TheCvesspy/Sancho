using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

class Program
{
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

    static async Task Main()
    {
        var config = new ConfigurationBuilder().AddJsonFile("d:\\Sancho\\backend\\Sancho.API\\appsettings.json").Build();
        var url = config["Supabase:Url"];
        var key = config["Supabase:ServiceRoleKey"];
        var client = new HttpClient();

        Console.WriteLine($"URL: {url}");
        
        var characterId = Guid.Parse("03313870-5494-43e8-8bb6-a9647eee8b15");
        
        var req = new HttpRequestMessage(HttpMethod.Post, $"{url}/rest/v1/character_attachments");
        req.Headers.Add("Prefer", "return=representation");
        req.Headers.Add("apikey", key);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
        
        req.Content = JsonContent.Create(new
        {
            character_id = characterId,
            file_name = "test.txt",
            file_url = "file.txt",
            mime_type = "text/plain",
            category = "Document",
            display_name = "Test",
            document_status = "Draft",
            source_type = "Upload",
            uploaded_by = (Guid?)null,
            uploaded_at = DateTimeOffset.UtcNow
        });

        var resp = await client.SendAsync(req);
        var content = await resp.Content.ReadAsStringAsync();
        Console.WriteLine($"Status: {resp.StatusCode}");
        Console.WriteLine($"Content: {content}");

        if (resp.IsSuccessStatusCode)
        {
            try {
                var created = await resp.Content.ReadFromJsonAsync<System.Collections.Generic.List<SupabaseCharacterAttachmentRow>>();
                Console.WriteLine("Deserialized OK!");
            }
            catch (Exception ex) {
                Console.WriteLine("Deserialization Exception: " + ex.Message);
            }
        }
    }
}
