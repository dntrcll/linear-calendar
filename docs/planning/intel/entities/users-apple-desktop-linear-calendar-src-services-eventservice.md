---
path: /Users/apple/Desktop/linear-calendar/src/services/eventService.js
type: service
updated: 2026-01-27
status: active
---

# eventService.js

## Purpose

Provides CRUD operations for calendar events in Supabase, including loading, creating, updating, deleting, restoring, and permanently deleting events. Handles data transformation between Supabase schema and application format.

## Exports

- `loadEvents(userId)` - Loads all non-deleted events for a user from Supabase, transforms to app format
- `createEvent(userId, eventData)` - Creates a new event with validation, looks up tag UUID from category/context
- `updateEvent(eventId, eventData)` - Updates an existing event with validation, handles tag UUID lookup
- `deleteEvent(eventId)` - Soft deletes an event by setting deleted=true and deleted_at timestamp
- `permanentlyDeleteEvent(eventId)` - Permanently removes an event from database
- `restoreEvent(eventId)` - Restores a soft-deleted event by setting deleted=false and clearing deleted_at

## Dependencies

[[supabaseClient]]

## Used By

TBD

## Notes

Transforms between Supabase schema (snake_case, tag UUID references) and app format (camelCase, category strings). All mutations include validation for required fields. Tag lookups require matching both tag_id and context fields.