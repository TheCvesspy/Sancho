import type { NarrativeRelationshipDto, NarrativeQuestDto, CharacterAssignedItemDto } from "@/utils/characters-api";

export type SampleCharacterNode = {
    id: string;
    name: string;
    relationshipType: NarrativeRelationshipDto["type"];
    description: string;
    factionIds: string[];
    questIds: string[];
};

export type SampleQuestNode = NarrativeQuestDto & {
    kind: "Quest" | "Plotline";
    participantIds: string[];
};

export type ItemNode = CharacterAssignedItemDto;
