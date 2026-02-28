namespace Sancho.Shared.Roles;

public static class ModulePermissions
{
    // Module Names (Matches DB string)
    public const string EventManagement = "event_management";
    public const string Narrative = "narrative";
    public const string Logistics = "logistics";
    public const string Finance = "finance";
    public const string NpcOrg = "npc_org";
    public const string Characters = "characters";
    public const string Communications = "communications";

    // Permission Levels
    public const string None = "none";
    public const string Read = "read";
    public const string Write = "write";

    public static readonly string[] AllModules = 
    [
        EventManagement,
        Narrative,
        Logistics,
        Finance,
        NpcOrg,
        Characters,
        Communications
    ];
}
