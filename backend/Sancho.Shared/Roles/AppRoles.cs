namespace Sancho.Shared.Roles;

public static class AppRoles
{
    // Platform Level
    public const string SystemAdmin = "SystemAdmin";

    // Organization (Tenant) Level
    public const string OrgOwner = "OrgOwner";
    public const string OrgAdmin = "OrgAdmin";

    // Event Level
    public const string EventManager = "EventManager";

    public static readonly string[] All = 
    [
        SystemAdmin,
        OrgOwner,
        EventManager
    ];
}
