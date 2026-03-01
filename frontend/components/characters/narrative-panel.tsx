"use client";

import { useTranslations } from "next-intl";
import { CharacterNarrativeLinksDto } from "@/utils/characters-api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Swords, Scroll, Shield } from "lucide-react";

interface NarrativePanelProps {
    eventId: string;
    characterId: string;
    links: CharacterNarrativeLinksDto;
}

export function NarrativePanel({ eventId, characterId, links }: NarrativePanelProps) {
    const t = useTranslations("characters");

    return (
        <div className="space-y-6">
            <div className="bg-muted/50 p-4 border rounded-md mb-6 flex items-start gap-4">
                <Scroll className="h-6 w-6 text-muted-foreground mt-0.5" />
                <div>
                    <h3 className="font-semibold">Managed in Narrative Module</h3>
                    <p className="text-sm text-muted-foreground">
                        Factions, relationships, and quests are managed in the Narrative module.
                        This tab provides a read-only consolidated view of how this character connects to the world story.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Relationships */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Users className="h-5 w-5 text-indigo-500" />
                            Relationships
                        </CardTitle>
                        <CardDescription>Direct connections to other characters</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {links.relationships.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic text-center py-4 border border-dashed rounded-md">
                                No relationships defined.
                            </p>
                        ) : (
                            <ul className="space-y-4">
                                {links.relationships.map((rel, index) => {
                                    return (
                                        <li key={index} className="flex flex-col border-b last:border-0 pb-3 last:pb-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium">{rel.otherCharacterName}</span>
                                                <Badge variant={rel.type === 'Enemy' ? 'destructive' : rel.type === 'Family' ? 'secondary' : 'default'}>
                                                    {rel.type}
                                                </Badge>
                                            </div>
                                            {rel.description && (
                                                <p className="text-sm text-muted-foreground">{rel.description}</p>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {/* Factions */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Shield className="h-5 w-5 text-emerald-500" />
                            Factions
                        </CardTitle>
                        <CardDescription>Affiliations and standing within groups</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {links.factions.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic text-center py-4 border border-dashed rounded-md">
                                No faction affiliations.
                            </p>
                        ) : (
                            <ul className="space-y-3">
                                {links.factions.map((fac, index) => (
                                    <li key={fac.factionId || index} className="flex justify-between items-center bg-muted/50 p-2 rounded-md">
                                        <span className="font-medium">{fac.name}</span>
                                        {fac.role && <Badge variant="outline">{fac.role}</Badge>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {/* Quests */}
                <Card className="md:col-span-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Swords className="h-5 w-5 text-amber-500" />
                            Quests & Plotlines
                        </CardTitle>
                        <CardDescription>Involvement in active and historical story elements</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {links.quests.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic text-center py-8 border border-dashed rounded-md">
                                Not involved in any recorded quests or plots.
                            </p>
                        ) : (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {links.quests.map((q, index) => (
                                    <div key={q.questId || index} className="border rounded-md p-3 hover:border-border/80 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-medium line-clamp-1" title={q.name}>{q.name}</h4>
                                            <Badge variant={q.status === 'Completed' ? 'default' : 'secondary'} className="text-[10px] uppercase">
                                                {q.status}
                                            </Badge>
                                        </div>
                                        {q.role && (
                                            <div className="flex items-center mt-2 pt-2 border-t text-xs text-muted-foreground">
                                                <span className="font-medium mr-1">Role:</span> {q.role}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="pt-6">
                <h3 className="font-semibold text-lg mb-4">Relationship Graph</h3>
                <div className="h-[400px] border rounded-lg bg-card/50 flex items-center justify-center text-muted-foreground">
                    <p>React Flow Graph Component will be rendered here (stubbed data).</p>
                </div>
            </div>
        </div>
    );
}
