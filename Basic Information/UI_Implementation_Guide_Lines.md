# UI Implementation Guide (Lines)

Purpose: Baseline UI plan for Sancho using shadcn/ui (violet theme), with dark/light mode and bilingual (EN/CS) support baked in.

Scope: Frontend (Next.js 15.5.12 App Router). Applies to all modules and shared components.

## 1. UI Stack Decision
- Use `shadcn/ui` as the primary component set.
- Use Radix UI primitives for accessibility and behavior.
- Use Tailwind CSS for styling and theming.
- Use the `violet` theme variant as the default palette.

## 2. Theming (Dark/Light) – Required From Day 1
- Implement global theme switching with `next-themes`.
- Default theme: `system`, with explicit user toggle.
- Ensure all components support both light and dark styles.
- Define tokens in `tailwind.config.ts` and CSS variables in `frontend/app/globals.css`.
- Keep color choices consistent with shadcn/ui `violet` theme.

## 3. Internationalization (EN/CS) – Required From Day 1
- Use `next-intl` (App Router compatible) for i18n.
- Supported locales: `en` and `cs`.
- All user-facing text must be sourced from translation files.
- No hardcoded strings in components except for test/dev scaffolding.
- Every enum label and status must have EN/CS translation keys.

## 4. Baseline Project Structure (Frontend)
- `frontend/app/[locale]/...` for locale-aware routes.
- `frontend/modules/` for feature areas aligned with bounded contexts.
- `frontend/components/` for shared UI components.
- `frontend/messages/en/*.json` and `frontend/messages/cs/*.json` for translations.

## 5. Design System Foundations
- Establish `colors`, `radius`, `spacing`, `font`, `shadow` tokens in Tailwind.
- Keep token naming stable across modules.
- Create a shared `Typography` component set (Headings, Body, Caption).
- Create shared `Form` primitives that integrate with i18n labels.

## 6. Forms & Validation
- Use `react-hook-form` with `zod` for validation.
- Validation messages must be localized via `next-intl`.
- Each form must define:
  - Labels, placeholders, help text in i18n files.
  - Error messages for required/format/length constraints in i18n files.

## 7. Custom Visual Assets (Per-Form)
- Allow visual overrides for specific forms via:
  - Optional background illustration.
  - Form header icons or badges.
  - Layout templates (standard, compact, split).
- Visual customizations must not affect validation or form logic.
- Implement via shared `FormLayout` component and per-form variant props.

## 8. Accessibility
- All interactive elements must use Radix primitives or equivalent ARIA support.
- Follow WCAG 2.1 AA contrasts in both themes.
- Ensure focus states visible in light/dark modes.

## 9. Initial UI Inventory (Phase 1)
- Navigation: App shell, sidebar, breadcrumbs.
- Auth: Sign-in, Join organization, Role selection.
- Event: Event dashboard, event switcher.
- Characters: Character list, character profile.
- Communications: Announcement list.

## 10. Required Setup Tasks
- Add shadcn/ui with `violet` theme config.
- Add Tailwind + CSS variables for light/dark palettes.
- Add `next-themes` and theme toggle component.
- Add `next-intl` and locale routing.
- Add sample translation keys in `en` and `cs`.

## 11. Definition of Done (UI Baseline)
- Light/dark switch available globally.
- All visible strings switch between EN/CS without code changes.
- At least 1 module page implemented using shared UI primitives.
- Lint and typecheck pass.

## 12. Notes
- All new UI components must be localized and theme-aware.
- Avoid one-off styling; prefer shared tokens and variants.
- Keep components small and composable to align with modular monolith boundaries.



