using Narrative.Models;

namespace Narrative.Services;

public static class NarrativeLifecycleService
{
    public static bool CanTransition(string current, string next)
    {
        if (string.Equals(current, next, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return (current, next) switch
        {
            (NarrativeStatuses.Draft, NarrativeStatuses.Ready) => true,
            (NarrativeStatuses.Ready, NarrativeStatuses.Locked) => true,
            (NarrativeStatuses.Locked, NarrativeStatuses.Ready) => true,
            (NarrativeStatuses.Ready, NarrativeStatuses.Draft) => true,
            _ => false
        };
    }

    public static bool CanTransitionItem(string current, string next)
    {
        if (string.Equals(current, next, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return (current, next) switch
        {
            (NarrativeItemStatuses.Draft, NarrativeItemStatuses.ReadyToReview) => true,
            (NarrativeItemStatuses.ReadyToReview, NarrativeItemStatuses.Final) => true,
            (NarrativeItemStatuses.Final, NarrativeItemStatuses.ReadyToReview) => true,
            (NarrativeItemStatuses.ReadyToReview, NarrativeItemStatuses.Draft) => true,
            _ => false
        };
    }
}
