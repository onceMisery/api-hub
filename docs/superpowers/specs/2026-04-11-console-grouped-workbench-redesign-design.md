# ApiHub Console Grouped Workbench Redesign

## Outcome

Rebuild the web console so the primary navigation becomes group first, then project, while upgrading the project workspace into a compact tabbed workbench that feels closer to the prototype and the small black console control reference.

## Experience Goals

- The projects entry page should communicate information architecture immediately: users choose a project group before scanning projects.
- The visual language should feel deliberate and console-like: darker control surfaces, compact spacing, stronger hierarchy, less long-page drift.
- Dark mode must apply consistently to the redesigned surfaces.
- Chinese should be the default visible language, with i18n-backed switching to English.
- Project detail should stop stacking every module into one long page and instead expose focused work areas through tabs.

## Information Architecture

### Project Catalog

- Left/primary control surface: grouped navigation deck.
- Right/content surface: project cards belonging to the active group.
- Initial groups are derived from current backend capabilities:
  - all
  - manage
  - editable
  - review
- Because the backend does not yet expose user-defined project folders, the grouped UI is implemented as a first-class derived organization layer rather than fake persisted folders.

### Project Workbench

- Overview
- Documentation
- Environments
- Debug
- Mock
- Members

Each tab owns a specific activity lane so the user no longer scrolls through every panel in one page.

## Component Changes

### Preferences and i18n

- Repair corrupted Chinese strings in the shared preferences provider.
- Expand shared messages for session controls, project catalog labels, and workbench tabs.
- Make preference initialization resilient when `matchMedia` is unavailable.

### Project Catalog

- Replace the current broad hero toolbar with a split command surface:
  - compact dark group console
  - search and action area
  - grouped metrics
- Reframe filter helpers as project grouping helpers while preserving compatibility with existing access-derived data.
- Update project cards to feel denser and more premium, with Chinese-first copy and stronger emphasis on access posture and entry actions.

### Project Workbench

- Add a tab bar directly under the project header.
- Documentation tab contains the tree and documentation-focused endpoint editor sections.
- Mock tab contains mock-focused endpoint editor sections.
- Environments, Debug, and Members each render as isolated work areas.
- Session bar receives a back button to the grouped projects directory.

### Endpoint Editor

- Introduce `visibleSections` so the same editor can power documentation and mock tabs without duplicating logic.

## Verification

- Update and run focused Vitest suites for preferences, session bar, endpoint editor, project shell, and project catalog helpers.
- Run the web test suite after the focused failures are resolved.
- Run the web build if the test suite is green.
