using Character.Models;

namespace Character.Services;

public static class CharacterLifecycleService
{
    public static bool CanTransition(string fromStatus, string toStatus) =>
        (fromStatus, toStatus) switch
        {
            (CharacterStatuses.Draft, CharacterStatuses.Ready) => true,
            (CharacterStatuses.Ready, CharacterStatuses.Draft) => true,
            (CharacterStatuses.Ready, CharacterStatuses.Locked) => true,
            (CharacterStatuses.Locked, CharacterStatuses.Ready) => true,
            _ => false
        };
}

