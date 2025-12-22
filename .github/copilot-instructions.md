# Copilot instructions for this repository

This repository is a small client-only PWA calendar (single-page app) implemented with plain HTML/CSS/JS. There is no build system or server; run/debug by opening `index.html` in a browser (or serve the folder with any static file server).

Key architecture and components
- Single-page app with three screens: calendar (`calendar-screen`), settings (`settings-screen`), edit (`edit-screen`). See `index.html` for markup.
- UI and behavior: `script.js` contains virtually all app logic: rendering calendar, touch gestures, segment controls, theme, and IndexedDB interactions.
- Persistence:
  - IndexedDB: database `WorkHoursDB`, object store `days` (keyPath `date`) — read/write via `openDB()`, `loadDayData()` and `saveDayData()` in `script.js`.
  - localStorage: stores UI state and defaults (keys like `mon-hours`, `mon-overtime`, `shift`, `theme`, `selectedDate`, `btn-hours-on`). See `weekdayMapHours` / `weekdayMapOvertime` in `script.js`.
- Shifts: shift schedules are static arrays `smenaA..smenaD` (28 entries) in `script.js`. Date-to-shift mapping uses `daysBetween()` which uses a fixed baseline (Nov 1, 2025) — be careful if changing calendar logic.

PWA & service worker
- `service-worker.js` caches static assets listed in `FILES_TO_CACHE`. `urlsToCache.js` mirrors the same list.
- To update caches, change `CACHE_NAME` and deploy; `self.skipWaiting()` and `clients.claim()` are present.

Important patterns and gotchas (codebase-specific)
- Date keys: the app formats day keys as `YYYY-MM-DD` (ISO-like) using `formatDateISO()`; IndexedDB uses those strings as the `date` key.
- `daysBetween()` is intentionally anchored to `Date.UTC(2025, 10, 1)` (Nov 1, 2025). Any change to the rotation algorithm requires updating this baseline or the 28-day rotation arrays.
- `renderCalendar()` reads `localStorage.selectedDate` and restores selection; when navigating months the code sometimes re-renders and retries selection — preserve this flow when refactoring.
- UI elements are accessed by fixed IDs (`shift-control`, `theme-control`, `btn-hours`, `btn-edit`, `btn-prev`, `btn-next`, etc.). Use those IDs if you edit templates.
- Theme toggles rely on `document.body.dataset.theme` (`light`/`dark`) with CSS variables in `style.css`.

Developer workflows
- Run locally: open `index.html` in Chrome/Edge/Firefox or run a static server (e.g., `npx http-server .` or `python -m http.server 8000`) to test service worker behavior.
- SW debugging: use DevTools → Application → Service Workers to unregister/inspect. To force update, change `CACHE_NAME` or unregister then reload.
- IndexedDB debugging: DevTools → Application → IndexedDB → `WorkHoursDB`.

How to extend or modify safely
- If you change the rotation/shift logic, update `smenaA..D` and `daysBetween()` together and add a short unit test or manual checklist: verify selection, stored day hours, and month navigation around Nov 2025.
- Keep all persisted keys stable in `localStorage` and IndexedDB; adding new keys is fine but renaming keys will lose user data.

Examples (search for these symbols in `script.js`):
- `openDB()`, `saveDayData(selectedDate)`, `loadDayData(selectedDate)` — IndexedDB ops.
- `weekdayMapHours` / `weekdayMapOvertime` — mapping between weekday and localStorage keys.
- `getShiftArray()` and `smenaA`..`smenaD` — shift selection.

What is NOT in this repo
- No tests, no package.json, no CI. Changes are manual; if you add tooling, document commands here.

If anything is unclear or you want me to include explicit example edits (e.g., add a new localStorage key, change the 28-day rotation, or add a small test harness), tell me which area and I will update this file.
