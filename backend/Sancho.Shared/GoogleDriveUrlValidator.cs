namespace Sancho.Shared;

public static class GoogleDriveUrlValidator
{
    private static readonly HashSet<string> AllowedGoogleDriveHosts =
    [
        "drive.google.com",
        "docs.google.com",
        "sheets.google.com",
        "slides.google.com",
        "forms.google.com"
    ];

    public static bool IsValid(string url)
    {
        return Uri.TryCreate(url, UriKind.Absolute, out var uri)
            && string.Equals(uri.Scheme, "https", StringComparison.OrdinalIgnoreCase)
            && AllowedGoogleDriveHosts.Contains(uri.Host.ToLowerInvariant());
    }

    public static void ValidateOrThrow(string url)
    {
        if (!IsValid(url))
        {
            throw new InvalidOperationException("Not a valid Google Drive URL. Accepted hosts: drive.google.com, docs.google.com, sheets.google.com, slides.google.com, forms.google.com.");
        }
    }
}
