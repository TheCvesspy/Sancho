"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { NarrativeFactionMemberDto, narrativeApi } from "@/utils/narrative-api";
import { CharacterListItemDto, charactersApi } from "@/utils/characters-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Loader2 } from "lucide-react";

interface FactionMembersPanelProps {
    factionId: string;
    eventId: string;
    initialMembers: NarrativeFactionMemberDto[];
    isOrgOrSysAdmin: boolean;
    token: string;
}

export function FactionMembersPanel({ factionId, eventId, initialMembers, isOrgOrSysAdmin, token }: FactionMembersPanelProps) {
    const t = useTranslations("narrative");
    const [members, setMembers] = useState<NarrativeFactionMemberDto[]>(initialMembers);
    const [characters, setCharacters] = useState<CharacterListItemDto[]>([]);
    const [isLoadingChars, setIsLoadingChars] = useState(false);

    // Form inputs
    const [selectedCharId, setSelectedCharId] = useState("");
    const [role, setRole] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchChars = async () => {
            setIsLoadingChars(true);
            try {
                const res = await charactersApi.listCharacters(token, eventId);
                setCharacters(res);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoadingChars(false);
            }
        };
        fetchChars();
    }, [eventId, token]);

    const handleAdd = async () => {
        if (!selectedCharId) return;
        setIsSaving(true);
        try {
            const added = await narrativeApi.upsertFactionMember(token, eventId, factionId, selectedCharId, {
                role: role || null
            });
            // Update or add
            setMembers(prev => {
                const existing = prev.find(m => m.characterId === selectedCharId);
                if (existing) return prev.map(m => m.characterId === selectedCharId ? added : m);
                return [...prev, added];
            });
            setSelectedCharId("");
            setRole("");
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemove = async (charId: string) => {
        if (!confirm(t("common.deleteConfirm"))) return;
        try {
            await narrativeApi.deleteFactionMember(token, eventId, factionId, charId);
            setMembers(prev => prev.filter(m => m.characterId !== charId));
        } catch (error) {
            console.error(error);
        }
    };

    const availableCharacters = characters.filter(c => !members.some(m => m.characterId === c.id));

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold tracking-tight">{t("factions.detail.tabs.members")}</h2>

            {isOrgOrSysAdmin && (
                <div className="flex items-end gap-4 p-4 rounded-lg border bg-card">
                    <div className="flex-1 space-y-1">
                        <label className="text-sm font-medium">{t("factions.members.character")}</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            value={selectedCharId}
                            onChange={(e) => setSelectedCharId(e.target.value)}
                        >
                            <option value="">{t("common.select")}</option>
                            {isLoadingChars ? (
                                <option disabled>Loading...</option>
                            ) : (
                                availableCharacters.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))
                            )}
                        </select>
                    </div>
                    <div className="flex-1 space-y-1">
                        <label className="text-sm font-medium">{t("factions.members.role")}</label>
                        <Input
                            value={role}
                            placeholder={t("factions.members.rolePlaceholder")}
                            onChange={(e) => setRole(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleAdd} disabled={!selectedCharId || isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                        {t("common.add")}
                    </Button>
                </div>
            )}

            <div className="rounded-md border bg-card">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-4 p-4 font-semibold border-b bg-muted/50">
                    <div>{t("factions.members.character")}</div>
                    <div>{t("factions.members.role")}</div>
                    {isOrgOrSysAdmin && <div className="w-10"></div>}
                </div>
                {members.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">{t("factions.members.empty")}</div>
                ) : (
                    <div className="divide-y">
                        {members.map(member => {
                            const char = characters.find(c => c.id === member.characterId);
                            return (
                                <div key={member.characterId} className="grid grid-cols-[1fr_1fr_auto] gap-4 p-4 items-center">
                                    <div className="font-medium">{char?.name || member.characterId}</div>
                                    <div className="text-muted-foreground">{member.role || "-"}</div>
                                    {isOrgOrSysAdmin && (
                                        <Button variant="ghost" size="icon" onClick={() => handleRemove(member.characterId)} className="text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
