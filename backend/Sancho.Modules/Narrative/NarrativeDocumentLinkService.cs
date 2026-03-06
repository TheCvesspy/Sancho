using Sancho.Shared;

namespace Narrative.Services;

public sealed class NarrativeDocumentLinkService
{
    public void ValidateGoogleDriveUrl(string url)
    {
        GoogleDriveUrlValidator.ValidateOrThrow(url);
    }
}
