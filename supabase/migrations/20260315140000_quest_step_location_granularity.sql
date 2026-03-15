-- Add floor_id and room_id to narrative_quest_step_locations
-- to support dungeon granularity (entire dungeon / specific floor / specific room)

-- Drop the old primary key
ALTER TABLE public.narrative_quest_step_locations
  DROP CONSTRAINT narrative_quest_step_locations_pkey;

-- Add nullable floor_id and room_id columns
ALTER TABLE public.narrative_quest_step_locations
  ADD COLUMN IF NOT EXISTS floor_id UUID REFERENCES public.narrative_dungeon_floors(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS room_id  UUID REFERENCES public.narrative_dungeon_rooms(id)  ON DELETE CASCADE;

-- Constraint: room requires floor
ALTER TABLE public.narrative_quest_step_locations
  ADD CONSTRAINT narrative_quest_step_locations_room_requires_floor
  CHECK (room_id IS NULL OR floor_id IS NOT NULL);

-- Unique index with NULLS NOT DISTINCT (same pattern as quest_locations)
CREATE UNIQUE INDEX uq_narrative_quest_step_locations_granularity
  ON public.narrative_quest_step_locations (step_id, location_id, floor_id, room_id) NULLS NOT DISTINCT;

-- Update existing index
DROP INDEX IF EXISTS idx_nqsl_event_location;
CREATE INDEX idx_nqsl_event_location
  ON public.narrative_quest_step_locations (event_id, location_id, step_id, floor_id, room_id);

-- Validation trigger (same pattern as quest_location_link validation)
CREATE OR REPLACE FUNCTION public.validate_narrative_quest_step_location_link()
RETURNS TRIGGER AS $$
DECLARE
  link_location_event_id UUID;
  link_location_type TEXT;
  link_floor_location_id UUID;
  link_floor_event_id UUID;
  link_room_floor_id UUID;
  link_room_location_id UUID;
  link_room_event_id UUID;
  step_event_id UUID;
BEGIN
  SELECT event_id, location_type INTO link_location_event_id, link_location_type
  FROM public.narrative_locations WHERE id = NEW.location_id;

  SELECT nqs.event_id INTO step_event_id
  FROM public.narrative_quest_steps nqs WHERE nqs.id = NEW.step_id;

  IF step_event_id IS NULL OR link_location_event_id IS NULL THEN
    RAISE EXCEPTION 'Narrative quest step location link references missing step or location.';
  END IF;

  IF NEW.event_id <> step_event_id OR NEW.event_id <> link_location_event_id THEN
    RAISE EXCEPTION 'Narrative quest step location link event_id must match linked records.';
  END IF;

  IF NEW.floor_id IS NOT NULL THEN
    SELECT location_id, event_id INTO link_floor_location_id, link_floor_event_id
    FROM public.narrative_dungeon_floors WHERE id = NEW.floor_id;

    IF link_floor_location_id IS NULL THEN
      RAISE EXCEPTION 'Narrative quest step location link references missing floor.';
    END IF;
    IF link_floor_location_id <> NEW.location_id THEN
      RAISE EXCEPTION 'Narrative quest step location link floor does not belong to linked location.';
    END IF;
  END IF;

  IF NEW.room_id IS NOT NULL THEN
    SELECT floor_id, location_id, event_id INTO link_room_floor_id, link_room_location_id, link_room_event_id
    FROM public.narrative_dungeon_rooms WHERE id = NEW.room_id;

    IF link_room_floor_id IS NULL THEN
      RAISE EXCEPTION 'Narrative quest step location link references missing room.';
    END IF;
    IF link_room_floor_id <> NEW.floor_id THEN
      RAISE EXCEPTION 'Narrative quest step location link room does not belong to linked floor.';
    END IF;
    IF link_room_location_id <> NEW.location_id THEN
      RAISE EXCEPTION 'Narrative quest step location link room does not belong to linked location.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_narrative_quest_step_location_link ON public.narrative_quest_step_locations;
CREATE TRIGGER trg_validate_narrative_quest_step_location_link
BEFORE INSERT OR UPDATE ON public.narrative_quest_step_locations
FOR EACH ROW EXECUTE FUNCTION public.validate_narrative_quest_step_location_link();
