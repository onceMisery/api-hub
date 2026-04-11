# Workbench I18n Theme Navigation Design

> Date: 2026-04-11
> Scope: frontend shell, global theme system, locale system, project workbench information architecture, and navigation polish

## Goal

Turn the current console into a production-grade workspace that feels coherent in three ways at the same time:

- dark mode is real instead of partial
- Chinese becomes the default product language without removing English
- the project page becomes a tabbed workbench instead of one long stacked screen

This design keeps the existing backend APIs, keeps the current data model, and upgrades the frontend shell plus key workbench surfaces.

## Current State

The current frontend has four structural problems:

1. theme is not a system
   - `layout.tsx` hard-codes a light background
   - most components use direct light Tailwind classes
   - there is no persisted user theme preference
2. locale is not a system
   - user-facing copy is hard-coded inside components
   - there is no shared dictionary or locale switch
3. project workbench is vertically overloaded
   - project shell renders environments, debug, endpoint editing, and access controls in one long page
   - this creates poor scrolling and weak focus
4. navigation is incomplete
   - the project workspace has no explicit return affordance
   - shell-level controls are fragmented

## Design Principles

- keep backend contracts unchanged
- introduce a lightweight frontend foundation instead of a heavy framework rewrite
- default the app to `zh-CN`, but preserve `en-US`
- persist user preferences locally so theme and language survive refresh
- make the workbench feel like one coordinated product surface
- reduce cognitive load by showing one major work area at a time

## Architecture

### 1. App preference foundation

Add a lightweight client provider for:

- `locale`
  - values: `zh-CN`, `en-US`
  - default: `zh-CN`
- `theme`
  - values: `system`, `dark`, `light`
  - default: `system`
- `resolvedTheme`
  - computed from `theme` plus `prefers-color-scheme`

Responsibilities:

- load persisted preferences from `localStorage`
- expose `setLocale` and `setTheme`
- expose `t(key)` translation lookup
- sync `document.documentElement.lang`
- sync `document.documentElement.dataset.theme`

This stays intentionally lightweight and local to the web app. No server round-trip is required.

### 2. Semantic theme layer

Add global CSS variables for:

- page background
- shell surface
- elevated surface
- muted surface
- border
- foreground
- secondary foreground
- accent surface

Theme behavior:

- `:root` defines the light palette
- `[data-theme="dark"]` defines the dark palette
- body and shared surfaces use semantic variables
- dark-mode compatibility is reinforced with targeted overrides for the most common existing utility classes so upgraded and legacy components can coexist during migration

### 3. Lightweight i18n

Use a small dictionary-based translation layer instead of a large routing-based i18n framework.

Reasons:

- the app is already component-driven
- the user wants immediate product polish, not a large infrastructure migration
- current scope is UI copy, not locale-specific routing or server-rendered content negotiation

Dictionary design:

- one shared key-value map
- `zh-CN` is the runtime default
- `en-US` remains a first-class alternate locale
- missing keys fall back to English

### 4. Shell-level controls

Upgrade the shared session shell so it can host:

- optional back button
- current session identity
- language switch
- theme switch
- sign out

This creates one consistent command strip across:

- project catalog
- project workbench
- documentation browse pages
- share/mock pages where appropriate

## Workbench Information Architecture

### Project workbench tabs

The project page becomes a first-class tabbed workspace with six primary tabs:

1. `概览`
   - project summary
   - access posture
   - tree counts
   - current endpoint/environment focus
   - fast links to browse/share/mock routes
2. `文档`
   - project tree sidebar
   - endpoint basics
   - request parameters
   - response structure
   - endpoint version management
3. `环境`
   - environment lab
   - project debug policy
   - environment create/edit/import/export
4. `调试`
   - live request console
   - request presets
   - cURL bridge
   - debug history
5. `Mock`
   - conditional mock rules
   - draft simulation
   - published runtime inspection
6. `成员`
   - collaborator management
   - role posture
   - protected admin-seat messaging

### Why tabs instead of stacked panels

Tabs are the correct primary interaction because:

- environment management and debug execution are high-focus tasks, not passive side panels
- members and mock operations are whole work modes
- users should not scroll through unrelated panels to reach the active task

## Component Changes

### Root shell

Update:

- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/lib/ui-preferences.tsx`

### Shared shell controls

Update:

- `apps/web/src/features/auth/components/session-bar.tsx`

Add:

- locale toggle
- theme toggle
- optional back button support

### Project workbench

Update:

- `apps/web/src/features/projects/components/project-shell.tsx`
- `apps/web/src/features/projects/components/endpoint-editor.tsx`

The endpoint editor is split by visible section so the workbench can reuse the same data model while rendering:

- documentation-focused sections in `文档`
- mock-focused sections in `Mock`

### Core translated surfaces

Translate and theme the primary user-visible components:

- login page
- login form
- projects page
- project catalog toolbar
- project card
- project shell
- project sidebar
- environment panel
- debug console
- endpoint editor and its subpanels
- project members panel
- shared UI cards

## Navigation Design

### Back behavior

Project workbench adds an explicit back action to `/console/projects`.

Behavior goals:

- visible immediately on entry
- stable even when the page is opened directly
- not dependent on browser history state

### Shell consistency

The same visual shell should make three actions obvious:

- go back
- change language
- change theme

## Testing Strategy

Use TDD and add focused UI behavior tests for:

- default `zh-CN` locale in provider-backed renders
- locale switching between Chinese and English
- theme persistence and root `data-theme` synchronization
- session bar back button and preference controls
- project workbench tab rendering and tab switching
- only the active primary tab panel rendering in the workspace

Verification should include:

- focused Vitest runs for changed components
- full `apps/web` test suite
- `next build`

## Scope Boundaries

In scope:

- frontend shell foundation
- theme persistence and dark mode coverage
- component-level i18n with Chinese default
- tabbed project workspace
- explicit back navigation

Out of scope:

- backend locale negotiation
- server-side translated routing
- mobile-native shell patterns
- backend schema or API changes

## Acceptance Criteria

- dark mode applies coherently across the main console and project workbench
- Chinese is the default app language
- users can switch between Chinese and English without reload
- users can switch theme preference and keep it after refresh
- the project workbench no longer stacks all major modules in one long page
- the project workspace exposes a clear back action
- document, environment, debug, mock, and member management are reachable as first-class work modes
