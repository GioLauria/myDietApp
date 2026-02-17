# Changelog

All notable changes to My Diet App are documented here.

## Unreleased

- Meal Plan page now shows current week targets (kcal, protein, fat, carbs) and can generate a random daily meal plan based on foods from the Food DB.
- Improved meal plan generator algorithm to better match calorie and macro targets (within ~2% when possible).
- Analytics page weekly matrix now supports a resizable column width, persisted per user via `tblAnalytics.TableSize`.
- Workout and Phase selectors in Analytics are compact, left‑aligned, editable only for the most recent week, and clearly highlighted in red.
- Analytics week headers show `Week N` and the week start date on two lines.
- DB Relationships page gained an interactive, draggable table layout so you can freely arrange tables when exploring the schema.

## Analytics & Data Model

- Introduced `tblAnalytics` to store weekly analytics per profile, including:
  - Workout flag, linked diet phase, and all derived metrics (BMR, target kcal, macros, and FFMI).
- Linked analytics phases to `tblDietPhase` by ID (foreign key), replacing the previous string key design.
- Added automatic migration on server startup to create or extend `tblAnalytics` columns as needed.
- Implemented server‑side recomputation of weekly analytics metrics whenever workout or phase changes.
- Added endpoint `POST /api/analytics/rebuild` and backend logic to rebuild all analytics from existing weight logs.

## Weight Log & Sample Data

- Restricted destructive actions ("Generate Sample Data" and "Delete All Logs") to Master/Admin users and added subtle admin‑only hints in the UI.
- Updated weight, body‑fat, and composition gauges so "healthy" bands respect the actual chart range instead of extending beyond the data.
- Sample‑data generation now wipes old weight logs first, generates a new time series, calls analytics rebuild, and reloads both logs and analytics.
- Deleting all weight logs also deletes analytics rows for the current profile to keep data consistent.

## API & Admin Tools

- Added `/api/analytics` GET/PUT endpoints for loading and saving weekly analytics settings.
- Extended `/api/admin/routes` to include analytics and rebuild endpoints.
- Added `/api/admin/postman-collection` to generate a Postman collection for all documented routes (Master/Admin only).
- API Routes page now groups endpoints by area (Analytics, Admin, Admin DB, etc.) and exposes a Postman export button.
- DB Relationships page documents the updated schema, including the `tblAnalytics` ↔ `tblDietPhase` foreign key.
- Admin DB page shows example queries for reading and joining analytics with diet phases.

## UI & UX

- Analytics weekly matrix switched to a horizontally scrollable flex layout with fixed column widths and no wrapping.
- Workout and Phase fields are narrow, borderless Material selects aligned with the numeric columns.
- Only the current (most recent) week is editable for workout and phase; older weeks are read‑only.
- Meal Plan page shows a summary card with the current analytics week, target kcal, and macro grams.
- User Manual contents updated to describe Analytics, Weight Log, Meal Plan, Food DB, and admin tools.

## Maintenance & Cleanup

- Removed unused backend helper scripts and data files that were not used by the web app.
- Hardened server startup logging and error handling around database migrations.
