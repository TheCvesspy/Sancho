"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { NarrativeFactionMemberDto, narrativeApi } from "@/utils/narrative-api";
import { CharacterListItemDto, charactersApi } from "@/utils/characters-api";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { AddFactionMemberDialog } from "./add-faction-member-dialog";

interface FactionMembersPanelProps {
    factionId: string;
    eventId: string;
    initialMembers: NarrativeFactionMemberDto[];
    canWrite: boolean;
    token: string;
}

export function FactionMembersPanel({ factionId, eventId, initialMembers, canWrite, token }: FactionMembersPanelProps) {
    const t = useTranslations("narrative");
    const [members, setMembers] = useState<NarrativeFactionMemberDto[]>(initialMembers);
    const [characters, setCharacters] = useState<CharacterListItemDto[]>([]);

    useEffect(() => {
        const fetchChars = async () => {
            try {
                const res = await charactersApi.listCharacters(token, eventId);
                setCharacters(res);
            } catch (e) {
                console.error(e);
            }
        };
        fetchChars();
    }, [eventId, token]);

    const refreshMembers = async () => {
        try {
            const latest = await narrativeApi.listFactionMembers(token, eventId, factionId);
            setMembers(latest);
        } catch (e) {
            console.error(e);
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
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">{t("factions.detail.tabs.members")}</h2>
                {canWrite && (
                    <AddFactionMemberDialog
                        factionId={factionId}
                        eventId={eventId}
                        token={token}
                        availableCharacters={availableCharacters}
                        onMemberAdded={refreshMembers}
                    />
                )}
            </div>

            <div className="rounded-md border bg-card">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-4 p-4 font-semibold border-b bg-muted/50">
                    <div>{t("factions.members.character")}</div>
                    <div>{t("factions.members.role")}</div>
                    {canWrite && <div className="w-10"></div>}
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
                                    {canWrite && (
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
