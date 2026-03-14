-- ============================================================
-- Migration: Narrative locations, dungeons, and location links
-- ============================================================

CREATE TABLE IF NOT EXISTS public.narrative_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  internal_notes TEXT,
  location_type TEXT NOT NULL DEFAULT 'basic',
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.user_profiles(id),
  deletion_reason TEXT
);

CREATE TABLE IF NOT EXISTS public.narrative_dungeon_floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.narrative_locations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  description TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.narrative_dungeon_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES public.narrative_dungeon_floors(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.narrative_locations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  description TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.narrative_quest_locations (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES public.narrative_quests(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.narrative_locations(id) ON DELETE CASCADE,
  floor_id UUID REFERENCES public.narrative_dungeon_floors(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.narrative_dungeon_rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT narrative_quest_locations_room_requires_floor CHECK (room_id IS NULL OR floor_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.narrative_plotline_locations (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  plotline_id UUID NOT NULL REFERENCES public.narrative_plotlines(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.narrative_locations(id) ON DELETE CASCADE,
  floor_id UUID REFERENCES public.narrative_dungeon_floors(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.narrative_dungeon_rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT narrative_plotline_locations_room_requires_floor CHECK (room_id IS NULL OR floor_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.narrative_plot_locations (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  plot_id UUID NOT NULL REFERENCES public.narrative_plots(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.narrative_locations(id) ON DELETE CASCADE,
  floor_id UUID REFERENCES public.narrative_dungeon_floors(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.narrative_dungeon_rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT narrative_plot_locations_room_requires_floor CHECK (room_id IS NULL OR floor_id IS NOT NULL)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'narrative_locations_type_check' AND conrelid = 'public.narrative_locations'::regclass) THEN
    ALTER TABLE public.narrative_locations ADD CONSTRAINT narrative_locations_type_check CHECK (location_type IN ('basic', 'dungeon'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'narrative_locations_status_check' AND conrelid = 'public.narrative_locations'::regclass) THEN
    ALTER TABLE public.narrative_locations ADD CONSTRAINT narrative_locations_status_check CHECK (status IN ('Draft', 'Ready', 'Locked'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_narrative_locations_event_name_active
  ON public.narrative_locations (event_id, lower(name)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_narrative_locations_event_created
  ON public.narrative_locations (event_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_narrative_locations_event_status_created
  ON public.narrative_locations (event_id, status, created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_narrative_dungeon_floors_location_sort
  ON public.narrative_dungeon_floors (location_id, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_narrative_dungeon_floors_event
  ON public.narrative_dungeon_floors (event_id);
CREATE INDEX IF NOT EXISTS idx_narrative_dungeon_rooms_floor_sort
  ON public.narrative_dungeon_rooms (floor_id, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_narrative_dungeon_rooms_location
  ON public.narrative_dungeon_rooms (location_id);
CREATE INDEX IF NOT EXISTS idx_narrative_dungeon_rooms_event
  ON public.narrative_dungeon_rooms (event_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_narrative_quest_locations_granularity
  ON public.narrative_quest_locations (quest_id, location_id, floor_id, room_id) NULLS NOT DISTINCT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_narrative_plotline_locations_granularity
  ON public.narrative_plotline_locations (plotline_id, location_id, floor_id, room_id) NULLS NOT DISTINCT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_narrative_plot_locations_granularity
  ON public.narrative_plot_locations (plot_id, location_id, floor_id, room_id) NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS idx_narrative_quest_locations_event_quest
  ON public.narrative_quest_locations (event_id, quest_id, location_id);
CREATE INDEX IF NOT EXISTS idx_narrative_quest_locations_event_location
  ON public.narrative_quest_locations (event_id, location_id, quest_id);
CREATE INDEX IF NOT EXISTS idx_narrative_plotline_locations_event_plotline
  ON public.narrative_plotline_locations (event_id, plotline_id, location_id);
CREATE INDEX IF NOT EXISTS idx_narrative_plotline_locations_event_location
  ON public.narrative_plotline_locations (event_id, location_id, plotline_id);
CREATE INDEX IF NOT EXISTS idx_narrative_plot_locations_event_plot
  ON public.narrative_plot_locations (event_id, plot_id, location_id);
CREATE INDEX IF NOT EXISTS idx_narrative_plot_locations_event_location
  ON public.narrative_plot_locations (event_id, location_id, plot_id);
CREATE INDEX IF NOT EXISTS idx_narrative_quest_locations_floor_room
  ON public.narrative_quest_locations (floor_id, room_id);
CREATE INDEX IF NOT EXISTS idx_narrative_plotline_locations_floor_room
  ON public.narrative_plotline_locations (floor_id, room_id);
CREATE INDEX IF NOT EXISTS idx_narrative_plot_locations_floor_room
  ON public.narrative_plot_locations (floor_id, room_id);

CREATE OR REPLACE FUNCTION public.validate_narrative_dungeon_floor_parent()
RETURNS TRIGGER AS $$
DECLARE
  parent_event_id UUID;
  parent_type TEXT;
BEGIN
  SELECT event_id, location_type
    INTO parent_event_id, parent_type
  FROM public.narrative_locations
  WHERE id = NEW.location_id;

  IF parent_event_id IS NULL THEN
    RAISE EXCEPTION 'Narrative location not found for floor.';
  END IF;

  IF parent_type <> 'dungeon' THEN
    RAISE EXCEPTION 'Dungeon floors require a dungeon location.';
  END IF;

  IF NEW.event_id <> parent_event_id THEN
    RAISE EXCEPTION 'Dungeon floor event_id must match parent location event_id.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.validate_narrative_dungeon_room_parent()
RETURNS TRIGGER AS $$
DECLARE
  parent_floor_event_id UUID;
  parent_floor_location_id UUID;
  parent_location_type TEXT;
  parent_location_event_id UUID;
BEGIN
  SELECT event_id, location_id
    INTO parent_floor_event_id, parent_floor_location_id
  FROM public.narrative_dungeon_floors
  WHERE id = NEW.floor_id;

  IF parent_floor_event_id IS NULL THEN
    RAISE EXCEPTION 'Narrative dungeon floor not found for room.';
  END IF;

  SELECT event_id, location_type
    INTO parent_location_event_id, parent_location_type
  FROM public.narrative_locations
  WHERE id = NEW.location_id;

  IF parent_location_event_id IS NULL THEN
    RAISE EXCEPTION 'Narrative location not found for room.';
  END IF;

  IF parent_location_type <> 'dungeon' THEN
    RAISE EXCEPTION 'Dungeon rooms require a dungeon location.';
  END IF;

  IF NEW.location_id <> parent_floor_location_id THEN
    RAISE EXCEPTION 'Dungeon room location_id must match parent floor location_id.';
  END IF;

  IF NEW.event_id <> parent_floor_event_id OR NEW.event_id <> parent_location_event_id THEN
    RAISE EXCEPTION 'Dungeon room event_id must match parent floor and location event_id.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.validate_narrative_quest_location_link()
RETURNS TRIGGER AS $$
DECLARE
  link_location_event_id UUID;
  link_location_type TEXT;
  link_floor_location_id UUID;
  link_floor_event_id UUID;
  link_room_floor_id UUID;
  link_room_location_id UUID;
  link_room_event_id UUID;
  quest_event_id UUID;
BEGIN
  SELECT event_id, location_type INTO link_location_event_id, link_location_type
  FROM public.narrative_locations WHERE id = NEW.location_id;
  SELECT event_id INTO quest_event_id
  FROM public.narrative_quests WHERE id = NEW.quest_id;

  IF quest_event_id IS NULL OR link_location_event_id IS NULL THEN
    RAISE EXCEPTION 'Narrative quest location link references missing quest or location.';
  END IF;

  IF NEW.event_id <> quest_event_id OR NEW.event_id <> link_location_event_id THEN
    RAISE EXCEPTION 'Narrative quest location link event_id must match linked records.';
  END IF;

  IF NEW.floor_id IS NOT NULL THEN
    SELECT location_id, event_id INTO link_floor_location_id, link_floor_event_id
    FROM public.narrative_dungeon_floors WHERE id = NEW.floor_id;

    IF link_floor_location_id IS NULL THEN
      RAISE EXCEPTION 'Narrative quest location link references missing floor.';
    END IF;

    IF link_location_type <> 'dungeon' THEN
      RAISE EXCEPTION 'Narrative quest location link floor requires dungeon location.';
    END IF;

    IF link_floor_location_id <> NEW.location_id OR link_floor_event_id <> NEW.event_id THEN
      RAISE EXCEPTION 'Narrative quest location link floor must belong to the same location and event.';
    END IF;
  END IF;

  IF NEW.room_id IS NOT NULL THEN
    SELECT floor_id, location_id, event_id INTO link_room_floor_id, link_room_location_id, link_room_event_id
    FROM public.narrative_dungeon_rooms WHERE id = NEW.room_id;

    IF link_room_floor_id IS NULL THEN
      RAISE EXCEPTION 'Narrative quest location link references missing room.';
    END IF;

    IF NEW.floor_id IS NULL THEN
      RAISE EXCEPTION 'Narrative quest location link room requires floor.';
    END IF;

    IF link_room_floor_id <> NEW.floor_id OR link_room_location_id <> NEW.location_id OR link_room_event_id <> NEW.event_id THEN
      RAISE EXCEPTION 'Narrative quest location link room must belong to the same floor, location, and event.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.validate_narrative_plotline_location_link()
RETURNS TRIGGER AS $$
DECLARE
  link_location_event_id UUID;
  link_location_type TEXT;
  link_floor_location_id UUID;
  link_floor_event_id UUID;
  link_room_floor_id UUID;
  link_room_location_id UUID;
  link_room_event_id UUID;
  plotline_event_id UUID;
BEGIN
  SELECT event_id, location_type INTO link_location_event_id, link_location_type
  FROM public.narrative_locations WHERE id = NEW.location_id;
  SELECT event_id INTO plotline_event_id
  FROM public.narrative_plotlines WHERE id = NEW.plotline_id;

  IF plotline_event_id IS NULL OR link_location_event_id IS NULL THEN
    RAISE EXCEPTION 'Narrative plotline location link references missing plotline or location.';
  END IF;

  IF NEW.event_id <> plotline_event_id OR NEW.event_id <> link_location_event_id THEN
    RAISE EXCEPTION 'Narrative plotline location link event_id must match linked records.';
  END IF;

  IF NEW.floor_id IS NOT NULL THEN
    SELECT location_id, event_id INTO link_floor_location_id, link_floor_event_id
    FROM public.narrative_dungeon_floors WHERE id = NEW.floor_id;

    IF link_floor_location_id IS NULL THEN
      RAISE EXCEPTION 'Narrative plotline location link references missing floor.';
    END IF;

    IF link_location_type <> 'dungeon' THEN
      RAISE EXCEPTION 'Narrative plotline location link floor requires dungeon location.';
    END IF;

    IF link_floor_location_id <> NEW.location_id OR link_floor_event_id <> NEW.event_id THEN
      RAISE EXCEPTION 'Narrative plotline location link floor must belong to the same location and event.';
    END IF;
  END IF;

  IF NEW.room_id IS NOT NULL THEN
    SELECT floor_id, location_id, event_id INTO link_room_floor_id, link_room_location_id, link_room_event_id
    FROM public.narrative_dungeon_rooms WHERE id = NEW.room_id;

    IF link_room_floor_id IS NULL THEN
      RAISE EXCEPTION 'Narrative plotline location link references missing room.';
    END IF;

    IF NEW.floor_id IS NULL THEN
      RAISE EXCEPTION 'Narrative plotline location link room requires floor.';
    END IF;

    IF link_room_floor_id <> NEW.floor_id OR link_room_location_id <> NEW.location_id OR link_room_event_id <> NEW.event_id THEN
      RAISE EXCEPTION 'Narrative plotline location link room must belong to the same floor, location, and event.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.validate_narrative_plot_location_link()
RETURNS TRIGGER AS $$
DECLARE
  link_location_event_id UUID;
  link_location_type TEXT;
  link_floor_location_id UUID;
  link_floor_event_id UUID;
  link_room_floor_id UUID;
  link_room_location_id UUID;
  link_room_event_id UUID;
  plot_event_id UUID;
BEGIN
  SELECT event_id, location_type INTO link_location_event_id, link_location_type
  FROM public.narrative_locations WHERE id = NEW.location_id;
  SELECT event_id INTO plot_event_id
  FROM public.narrative_plots WHERE id = NEW.plot_id;

  IF plot_event_id IS NULL OR link_location_event_id IS NULL THEN
    RAISE EXCEPTION 'Narrative plot location link references missing plot or location.';
  END IF;

  IF NEW.event_id <> plot_event_id OR NEW.event_id <> link_location_event_id THEN
    RAISE EXCEPTION 'Narrative plot location link event_id must match linked records.';
  END IF;

  IF NEW.floor_id IS NOT NULL THEN
    SELECT location_id, event_id INTO link_floor_location_id, link_floor_event_id
    FROM public.narrative_dungeon_floors WHERE id = NEW.floor_id;

    IF link_floor_location_id IS NULL THEN
      RAISE EXCEPTION 'Narrative plot location link references missing floor.';
    END IF;

    IF link_location_type <> 'dungeon' THEN
      RAISE EXCEPTION 'Narrative plot location link floor requires dungeon location.';
    END IF;

    IF link_floor_location_id <> NEW.location_id OR link_floor_event_id <> NEW.event_id THEN
      RAISE EXCEPTION 'Narrative plot location link floor must belong to the same location and event.';
    END IF;
  END IF;

  IF NEW.room_id IS NOT NULL THEN
    SELECT floor_id, location_id, event_id INTO link_room_floor_id, link_room_location_id, link_room_event_id
    FROM public.narrative_dungeon_rooms WHERE id = NEW.room_id;

    IF link_room_floor_id IS NULL THEN
      RAISE EXCEPTION 'Narrative plot location link references missing room.';
    END IF;

    IF NEW.floor_id IS NULL THEN
      RAISE EXCEPTION 'Narrative plot location link room requires floor.';
    END IF;

    IF link_room_floor_id <> NEW.floor_id OR link_room_location_id <> NEW.location_id OR link_room_event_id <> NEW.event_id THEN
      RAISE EXCEPTION 'Narrative plot location link room must belong to the same floor, location, and event.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_narrative_locations_touch_updated_at ON public.narrative_locations;
CREATE TRIGGER trg_narrative_locations_touch_updated_at
BEFORE UPDATE ON public.narrative_locations
FOR EACH ROW EXECUTE FUNCTION public.touch_narrative_updated_at();

DROP TRIGGER IF EXISTS trg_narrative_dungeon_floors_touch_updated_at ON public.narrative_dungeon_floors;
CREATE TRIGGER trg_narrative_dungeon_floors_touch_updated_at
BEFORE UPDATE ON public.narrative_dungeon_floors
FOR EACH ROW EXECUTE FUNCTION public.touch_narrative_updated_at();

DROP TRIGGER IF EXISTS trg_narrative_dungeon_rooms_touch_updated_at ON public.narrative_dungeon_rooms;
CREATE TRIGGER trg_narrative_dungeon_rooms_touch_updated_at
BEFORE UPDATE ON public.narrative_dungeon_rooms
FOR EACH ROW EXECUTE FUNCTION public.touch_narrative_updated_at();

DROP TRIGGER IF EXISTS trg_validate_narrative_dungeon_floor_parent ON public.narrative_dungeon_floors;
CREATE TRIGGER trg_validate_narrative_dungeon_floor_parent
BEFORE INSERT OR UPDATE ON public.narrative_dungeon_floors
FOR EACH ROW EXECUTE FUNCTION public.validate_narrative_dungeon_floor_parent();

DROP TRIGGER IF EXISTS trg_validate_narrative_dungeon_room_parent ON public.narrative_dungeon_rooms;
CREATE TRIGGER trg_validate_narrative_dungeon_room_parent
BEFORE INSERT OR UPDATE ON public.narrative_dungeon_rooms
FOR EACH ROW EXECUTE FUNCTION public.validate_narrative_dungeon_room_parent();

DROP TRIGGER IF EXISTS trg_validate_narrative_quest_location_link ON public.narrative_quest_locations;
CREATE TRIGGER trg_validate_narrative_quest_location_link
BEFORE INSERT OR UPDATE ON public.narrative_quest_locations
FOR EACH ROW EXECUTE FUNCTION public.validate_narrative_quest_location_link();

DROP TRIGGER IF EXISTS trg_validate_narrative_plotline_location_link ON public.narrative_plotline_locations;
CREATE TRIGGER trg_validate_narrative_plotline_location_link
BEFORE INSERT OR UPDATE ON public.narrative_plotline_locations
FOR EACH ROW EXECUTE FUNCTION public.validate_narrative_plotline_location_link();

DROP TRIGGER IF EXISTS trg_validate_narrative_plot_location_link ON public.narrative_plot_locations;
CREATE TRIGGER trg_validate_narrative_plot_location_link
BEFORE INSERT OR UPDATE ON public.narrative_plot_locations
FOR EACH ROW EXECUTE FUNCTION public.validate_narrative_plot_location_link();

ALTER TABLE public.narrative_document_links DROP CONSTRAINT IF EXISTS narrative_document_links_entity_type_check;
ALTER TABLE public.narrative_document_links ADD CONSTRAINT narrative_document_links_entity_type_check
  CHECK (entity_type IN ('quest', 'plotline', 'plot', 'faction', 'item', 'location', 'dungeon_floor', 'dungeon_room'));

ALTER TABLE public.narrative_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_dungeon_floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_dungeon_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_quest_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_plotline_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_plot_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS narrative_locations_read ON public.narrative_locations;
DROP POLICY IF EXISTS narrative_locations_write ON public.narrative_locations;
CREATE POLICY narrative_locations_read ON public.narrative_locations
  FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_locations_write ON public.narrative_locations
  FOR ALL USING (public.can_access_narrative_event(event_id, true))
  WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_dungeon_floors_read ON public.narrative_dungeon_floors;
DROP POLICY IF EXISTS narrative_dungeon_floors_write ON public.narrative_dungeon_floors;
CREATE POLICY narrative_dungeon_floors_read ON public.narrative_dungeon_floors
  FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_dungeon_floors_write ON public.narrative_dungeon_floors
  FOR ALL USING (public.can_access_narrative_event(event_id, true))
  WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_dungeon_rooms_read ON public.narrative_dungeon_rooms;
DROP POLICY IF EXISTS narrative_dungeon_rooms_write ON public.narrative_dungeon_rooms;
CREATE POLICY narrative_dungeon_rooms_read ON public.narrative_dungeon_rooms
  FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_dungeon_rooms_write ON public.narrative_dungeon_rooms
  FOR ALL USING (public.can_access_narrative_event(event_id, true))
  WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_quest_locations_read ON public.narrative_quest_locations;
DROP POLICY IF EXISTS narrative_quest_locations_write ON public.narrative_quest_locations;
CREATE POLICY narrative_quest_locations_read ON public.narrative_quest_locations
  FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_quest_locations_write ON public.narrative_quest_locations
  FOR ALL USING (public.can_access_narrative_event(event_id, true))
  WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_plotline_locations_read ON public.narrative_plotline_locations;
DROP POLICY IF EXISTS narrative_plotline_locations_write ON public.narrative_plotline_locations;
CREATE POLICY narrative_plotline_locations_read ON public.narrative_plotline_locations
  FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_plotline_locations_write ON public.narrative_plotline_locations
  FOR ALL USING (public.can_access_narrative_event(event_id, true))
  WITH CHECK (public.can_access_narrative_event(event_id, true));

DROP POLICY IF EXISTS narrative_plot_locations_read ON public.narrative_plot_locations;
DROP POLICY IF EXISTS narrative_plot_locations_write ON public.narrative_plot_locations;
CREATE POLICY narrative_plot_locations_read ON public.narrative_plot_locations
  FOR SELECT USING (public.can_access_narrative_event(event_id, false));
CREATE POLICY narrative_plot_locations_write ON public.narrative_plot_locations
  FOR ALL USING (public.can_access_narrative_event(event_id, true))
  WITH CHECK (public.can_access_narrative_event(event_id, true));
