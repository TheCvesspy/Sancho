# Searchable Link Picker Specification

Purpose: provide one reusable UI/UX and API contract for linking entities when candidate lists are large (characters, NPCs, items, users).

Applies to: event-scoped relation fields across modules.

## 1. When Required

Use this pattern when candidate count is expected to exceed 50, and always when it can exceed 100.

Do not use a plain static `Select` in these cases.

## 2. UX Contract

1. Trigger opens a popover picker.
2. Search input is focused immediately.
3. Input is debounced (250-400 ms, default 300 ms).
4. Result list excludes already linked entities.
5. Selecting a result creates the link immediately.
6. Picker remains open for rapid multi-add.
7. Selected links are shown as removable chips/badges.
8. Cancel closes picker and clears transient search state.

## 3. Required States

- `loading`: search/filter in progress.
- `empty`: no result for current query.
- `saving`: disable result selection while link request is running.
- `error`: toast message via normalized error helper.

## 4. Frontend Component Contract

Recommended implementation stack:

- `Popover`, `PopoverTrigger`, `PopoverContent`
- `Command`, `CommandInput`, `CommandList`, `CommandItem`
- `Badge` for linked entities

Suggested local state:

- `pickerOpen: boolean`
- `search: string`
- `debouncedSearch: string`
- `isFiltering: boolean`
- `isSaving: boolean`

Suggested integration API:

```ts
type Candidate = {
  id: string;
  name: string;
  type?: string;
  subtitle?: string | null;
};

type SearchableLinkPickerProps = {
  triggerLabel: string;
  searchPlaceholder: string;
  emptyLabel: string;
  loadingLabel: string;
  candidates: Candidate[];
  linkedIds: Set<string>;
  isSaving: boolean;
  onLink: (candidateId: string) => Promise<void>;
  onCancel?: () => void;
};
```

## 5. API Contract

Candidate search/list endpoints should be event-scoped and lightweight.

- Route scope: `/api/events/{eventId}/...`
- Query parameters:
  - `q`: search text
  - `limit`: default 20-30
  - `cursor`: pagination cursor for large sets
  - optional discriminator (`type`, `module`) when mixed entities are returned
- Response shape:
  - `id`
  - `name`
  - optional `type`
  - optional `subtitle`

## 6. Data Integrity Contract

- UI must exclude already linked IDs from candidate rendering.
- Backend/DB must enforce uniqueness for relation tuple (e.g. `(step_id, character_id)`).
- Soft-deleted entities must not be returned in candidate results.
- RLS and event membership rules must apply equally to:
  - candidate search/list
  - link add/remove mutations

## 7. Accessibility and Keyboard

- `CommandInput`: supports typing and clear focus indication.
- `CommandList`: arrow up/down selection.
- `Enter`: select highlighted option.
- `Esc`: close popover.
- Trigger/control labels and status text must be localizable.

## 8. Performance Guardrails

- Debounce search input (300 ms default).
- Do not render hundreds of options in DOM at once.
- Prefer server-side filtering for large datasets.
- Use pagination or virtualization if result windows can exceed 30-50 rows.

## 9. i18n Keys Checklist

At minimum, ensure keys exist for:

- picker trigger label
- search placeholder (`common.search`)
- loading label (`common.loading`)
- empty label (`common.noResults`)
- add/remove action labels
- error fallback (`documentsPanel.notifications.error` or module equivalent)

## 10. Example: Narrative Quest Step

Reference implementation:

- `frontend/components/narrative/quest-steps-panel.tsx`

Current pattern in this component:

- Replaced static select with `Popover + Command`
- Added debounced search (`300 ms`)
- Kept picker open after each add for multi-link speed
- Preserved chips/badges for current links and inline remove actions
