# backend/app/models/rarity.py

from enum import Enum

class RarityEnum(Enum):
    COMMON = "Common"
    UNCOMMON = "Uncommon"
    RARE = "Rare"
    LEGENDARY = "Legendary"
    ARTEFACT = "Artefact"
