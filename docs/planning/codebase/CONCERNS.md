# Codebase Concerns

**Analysis Date:** 2026-01-25

## Tech Debt

**Monolithic App Component:**
- Issue: The main component at `src/App.js` contains 10,943 lines of code, mixing state management, calendar logic, event handlers, rendering, and inline SVG icons. This creates tight coupling and makes the code difficult to test, maintain, and reuse.
- Files: `src/App.js` (lines 1-10943)
- Impact: Difficult to isolate bugs, refactor features, or test individual functionality. Adding new features requires modifying a massive file. Performance optimization is hindered because the entire component tree re-renders together.
- Fix approach: Split into smaller composable components: separate event handlers into custom hooks, extract calendar rendering into dedicated components, move icon definitions to a constant file, implement proper separation of concerns with clear data flow patterns.

**Missing Firebase Cleanup:**
- Issue: `src/utils/migrateToSupabase.js` still imports Firebase (`import { db } from '../firebase'` and `import { collection, getDocs, query, where } from 'firebase/firestore'`), but the firebase module doesn't exist in the codebase (`src/firebase.js` file is missing).
- Files: `src/utils/migrateToSupabase.js` (lines 15-16)
- Impact: Migration script will fail at runtime with "Cannot find module '../firebase'" error. Users attempting to migrate data from Firebase to Supabase will encounter broken imports and cannot complete the migration flow.
- Fix approach: Either (1) remove the migration utility if no longer needed, (2) restore the Firebase client configuration, or (3) rewrite the migration to work server-side only, documenting the alternative migration approach.

**Full Data Reload on Every Change:**
- Issue: `loadData()` function is called after every event operation (create, update, delete) at `src/App.js:1493`, `1521`, `1544`, `1569`. This re-fetches the entire events and tags collections from Supabase even though the app typically knows what changed.
- Files: `src/App.js` (lines 1493, 1521, 1544, 1569)
- Impact: Poor performance with large datasets. Every single-event edit triggers a full re-query of potentially 1000+ events. Network bandwidth wasted. User experience degraded with loading delays. Scales poorly as event count grows.
- Fix approach: Implement optimistic updates that immediately update local state, then reconcile with server response. Add selective reloads (only refresh affected events). Use Supabase real-time subscriptions instead of full refetches.

**No Optimistic Updates:**
- Issue: Event drag operations and edits wait for server confirmation before updating the UI. `handleEventDrag()` at `src/App.js:1531-1561` and `handleSaveEvent()` at `src/App.js:1454-1510` call `loadData()` synchronously, forcing users to wait for network requests.
- Files: `src/App.js` (lines 1531-1561, 1454-1510)
- Impact: Users experience lag and "event jumping" when dragging or editing. Network latency directly impacts perceived performance. Users see delayed updates which feels broken. Comments at lines 1529-1530 and 1452-1453 acknowledge this need but it's unimplemented.
- Fix approach: Update local state immediately on user action, show optimistic UI changes, sync with server in background, reconcile conflicts if server rejects update. Add visual indicators for pending changes.

## Known Bugs

**Event Overlap Prevention Missing:**
- Bug: No validation prevents users from creating overlapping events. The code detects overlaps (via `detectOverlaps()` in `src/utils/runtimeGuards.js`), but only logs warnings to console instead of blocking creation.
- Symptoms: Users can create events that overlap in time, violating calendar semantics. Overlaps are detected post-hoc but not prevented during creation.
- Files: `src/services/eventService.js` (lines 66-141 for createEvent validation), `src/App.js` (lines 1462-1479 for save handler), `src/utils/runtimeGuards.js` (lines 28-62)
- Trigger: Create two events with overlapping time ranges in the same context.
- Workaround: None - overlaps are allowed. Users must manually check for conflicts before creating events.

**Event Sorting Edge Cases:**
- Bug: Comments at `src/utils/agentLoop.js:204-207` flag "CRITICAL - Fix event sorting algorithm immediately" and mention timezone handling bugs. The sorting logic at `src/App.js:1398-1401` uses `new Date(e.start) - new Date(b.start)` which can fail with ISO strings if timezone context is lost.
- Symptoms: Events may appear out of chronological order, especially across timezone boundaries. Upcoming events list may display events in wrong order.
- Files: `src/App.js` (lines 1398-1401), `src/services/eventService.js` (line 28), `src/utils/runtimeGuards.js` (lines 64-87)
- Trigger: Create events near day boundaries or in different timezones. The anomaly detector tracks `ORDERING_ISSUE` type detections.
- Workaround: Manually adjust event times to match timezone context, but the underlying sorting bug remains.

**Race Condition in Event Updates:**
- Bug: Concurrent event updates can race. If a user updates an event while `loadData()` is fetching from Supabase, the local state update can be overwritten by the fetch result, losing the user's change.
- Symptoms: Event changes occasionally get lost after being saved. Drag-and-drop updates revert unexpectedly. Comments at `src/utils/agentLoop.js:222-226` flag this as requiring "event version tracking".
- Files: `src/App.js` (lines 1124-1273 loadData function, line 1493 call after save, line 1544 call after drag)
- Trigger: Rapidly save events or drag while the app is fetching data in the background.
- Workaround: Wait for loading to complete before making changes (UI shows loading state but doesn't block input).

**Auth Timing Bug with User Record Creation:**
- Bug: When a user signs in, there's a race between Supabase auth creating the user and the database trigger creating the user record. The code waits 1 second then re-checks at `src/services/authService.js:70`, but this may not be enough on slow networks.
- Symptoms: User record doesn't exist when app tries to load events immediately after sign-in. First-time sign-in may show empty calendar briefly.
- Files: `src/services/authService.js` (lines 53-88)
- Trigger: Sign in with Google for the first time on a slow network connection.
- Workaround: The app gracefully falls back to empty state and doesn't crash, but user experience is poor on first sign-in.

## Security Considerations

**Client-Side Supabase Key Exposure:**
- Risk: `src/supabaseClient.js` stores `REACT_APP_SUPABASE_ANON_KEY` which is a client-facing key. This key is embedded in every browser and visible in network requests. While Supabase is designed for this (anon key has limited RLS-based permissions), any misconfiguration in RLS policies makes data vulnerable.
- Files: `src/supabaseClient.js` (lines 3-4)
- Current mitigation: Supabase RLS policies are the only protection. The app relies entirely on backend-enforced row-level security.
- Recommendations: (1) Audit all RLS policies in Supabase to ensure they properly restrict user access, (2) add server-side authentication checks for sensitive operations if available, (3) rotate anon key regularly, (4) monitor for unusual data access patterns.

**OAuth Token Cleanup:**
- Risk: `src/services/authService.js:1283-1285` cleans up OAuth tokens from the URL after sign-in using `window.history.replaceState()`. However, tokens may be logged in browser console or error logs before cleanup.
- Files: `src/services/authService.js` (lines 1283-1285)
- Current mitigation: URL cleanup prevents token exposure in browser history.
- Recommendations: (1) Review error logs for token leaks, (2) implement error boundary that sanitizes logged tokens, (3) disable token logging in production.

**No CSRF/XSRF Protection:**
- Risk: The app uses localStorage for session management (`src/supabaseClient.js:16, window.localStorage`) and doesn't implement CSRF tokens for state-changing operations. A malicious site could potentially make requests on behalf of the user.
- Files: `src/supabaseClient.js` (line 15), `src/App.js` (lines 1344-1345)
- Current mitigation: Supabase handles CSRF protection at the auth layer for OAuth flows.
- Recommendations: (1) Verify Supabase's CSRF protection is enabled, (2) add SameSite cookie attributes if using cookies, (3) validate request origins for sensitive operations.

**Soft Delete Without Audit Trail:**
- Risk: Events are marked as deleted (`deleted: true`) at `src/services/eventService.js:230-233` without audit logging. There's no record of who deleted what or when (except `deleted_at` timestamp). Malicious users with database access could delete events without accountability.
- Files: `src/services/eventService.js` (lines 226-243)
- Current mitigation: `deleted_at` timestamp records when deletion occurred.
- Recommendations: (1) Implement audit logging for all data modifications, (2) store deleted-by user ID with each deletion, (3) add admin interface to view deletion history, (4) consider implementing logical deletion at DB layer with audit triggers.

## Performance Bottlenecks

**O(n²) Conflict Detection:**
- Problem: `detectOverlaps()` in `src/utils/runtimeGuards.js:28-62` uses nested loop to find overlapping events - checks every event against every other event. With 1000 events, this becomes 1,000,000 comparisons.
- Files: `src/utils/runtimeGuards.js` (lines 28-62), `src/App.js` (lines 1382-1386)
- Cause: Nested loop algorithm: `for (let i = 0; i < contextEvents.length - 1; i++)` compares each event with all subsequent ones.
- Improvement path: Replace with interval tree or sweep line algorithm. Pre-sort events once, then check only adjacent/nearby events. Cache results and invalidate only when events change.

**No Event Filtering Memoization:**
- Problem: Event filtering runs on every render at `src/App.js:1360-1371`. With 1000+ events and frequent re-renders, this wastes CPU re-filtering the same event list.
- Files: `src/App.js` (lines 1355-1403)
- Cause: `filtered` array is recreated in `useEffect` but the filter logic runs even if dependencies haven't changed. No `useMemo()` optimization.
- Improvement path: Wrap filter logic in `useMemo()` with proper dependencies. Use Map for tag lookups instead of array `.includes()` check on line 1362.

**Full Component Re-render on State Change:**
- Problem: Any state change (events, tags, config, timers) triggers re-render of the entire 10,943-line component including calendar rendering, event list rendering, and all event handlers. No component splitting means no memoization opportunities.
- Files: `src/App.js` (entire component, especially lines 2500+ where rendering occurs)
- Cause: Monolithic component architecture. No `React.memo()` or component extraction.
- Improvement path: Split into smaller components with `React.memo()`. Use context or state management library to prevent unnecessary re-renders. Implement virtual scrolling for event lists if they're large.

**Loading with 3-Second Timeout but No Progressive Rendering:**
- Problem: The app waits up to 3 seconds for data (lines 1130-1136) before showing the calendar, leaving users staring at blank screen. Comments at line 1382 flag high event counts as a performance concern.
- Files: `src/App.js` (lines 1130-1136, 1143-1146, 1168-1171)
- Cause: Sequential Promise.race() calls with fixed 2-second timeout per operation. No streaming or progressive rendering of data.
- Improvement path: Show the calendar immediately with skeleton loaders. Stream events as they arrive from Supabase. Use pagination or lazy loading instead of loading all events at once.

## Fragile Areas

**Event State Synchronization:**
- Files: `src/App.js` (lines 830-835 event state, 1149-1156 loading), `src/services/eventService.js` (entire file)
- Why fragile: Events are loaded in one function `loadEvents()`, but updated separately in `createEvent()`, `updateEvent()`, `deleteEvent()`. Each operation independently queries Supabase, so the in-memory state can diverge from server. Race conditions between concurrent updates. The `loadData()` reload pattern masks synchronization issues.
- Safe modification: (1) Before modifying event-related code, understand the full flow from `loadData()` → `setEvents()` → render → user action → `handleSaveEvent()` → `loadData()`. (2) Test concurrent operations. (3) Consider switching to Supabase real-time subscriptions to maintain sync automatically. (4) Add version numbers to events to detect conflicts.
- Test coverage: `src/App.test.js` is a stub with only one placeholder test. No tests for event operations, synchronization, or race conditions.

**Tag Context Switching:**
- Files: `src/App.js` (lines 1347-1353 context effect, 835-850 tag state)
- Why fragile: When `context` changes (personal ↔ family), the code updates `activeTagIds` by filtering tags by context. But if tags fail to load or are in wrong format, this silently sets empty tag list. See line 1350: `if (currentTags.length > 0)` - if length is 0, it doesn't update, potentially leaving stale tag selections from previous context.
- Safe modification: (1) Add validation that `tags[context]` exists before filtering. (2) Test switching between personal and family contexts with missing/incomplete tag data. (3) Verify that tag filtering doesn't leave selected tags from previous context selected.
- Test coverage: No tests for context switching or tag filtering.

**Deleted Events State Management:**
- Files: `src/App.js` (lines 830-831 deletedEvents state, 1155-1156 loading deleted), `src/services/eventService.js` (lines 226-243 soft delete)
- Why fragile: Deleted events are separated into a separate array (`deletedEvents`), but the app mixes deleted and non-deleted events in various places (e.g., `allNonDeleted` array at line 1395 filters `!e.deleted`). If a filter misses the `.deleted` check, deleted events appear in the calendar. Comments at `src/utils/agentLoop.js:240-243` flag "CRITICAL - Events are disappearing from state" related to deletion logic.
- Safe modification: (1) All event filters must check `!e.deleted`. (2) Use TypeScript or add runtime validation to enforce deleted events are never rendered. (3) Test soft-delete, restore, permanent delete flows thoroughly. (4) Add schema validation that all events have a `deleted` field.
- Test coverage: No tests for delete/restore flows.

**Quote Fetching with Silent Failures:**
- Files: `src/App.js` (lines 1107-1116 quote effect, likely lines 2500+ in render)
- Why fragile: `fetchLiveQuote()` presumably fetches quotes from an API, but the code doesn't show error handling. If the API fails or returns null, the quote display may break. The function is called in `useEffect` but with no timeout protection.
- Safe modification: (1) Review `fetchLiveQuote()` implementation for null checks and error handling. (2) Wrap in try-catch or Promise.catch(). (3) Add timeout to prevent hanging requests. (4) Test with network errors and slow connections.
- Test coverage: No tests for quote fetching.

## Scaling Limits

**Event Count Scaling:**
- Current capacity: App is tested with intent to support "high event count" (comments at line 1382 and agentLoop.js:144), but no explicit limit defined. Likely hits performance wall around 500-1000 events per user based on the O(n²) conflict detection and full-page filtering.
- Limit: Once event count exceeds ~1000 per user, the app becomes sluggish. Conflict detection becomes O(n²) expensive. The entire events array is re-filtered on every render.
- Scaling path: (1) Implement pagination - load events in chunks, show only current month or week. (2) Use Supabase `range()` queries to load on-demand. (3) Replace O(n²) conflict detection with interval tree. (4) Implement virtual scrolling for event lists. (5) Add database indexes on `user_id` and `start_time` (comment at agentLoop.js:112 suggests this).

**Concurrent Users Per Calendar (Family Context):**
- Current capacity: App supports personal and family contexts, but no conflict resolution for concurrent edits when multiple family members edit the same calendar.
- Limit: If two family members edit the same event simultaneously, the last write wins (no version tracking). Event drag by one user can be overwritten by another user's save.
- Scaling path: (1) Add optimistic locking - store event `version` number, check on update, reject if version mismatch. (2) Implement operational transformation or CRDT for collaborative editing. (3) Add UI warning if event is being edited by another user. (4) Consider moving to real-time collaboration tool if this is a core feature.

**Real-Time Subscription Load:**
- Current capacity: No real-time subscriptions currently implemented (app uses polling via `loadData()` refetches). If switching to Supabase real-time, each user connection requires a WebSocket, multiplying server load.
- Limit: Each user maintains a persistent WebSocket connection. With 1000 concurrent users, server must handle 1000 subscriptions. Supabase has limits on concurrent connections per project.
- Scaling path: (1) Use Supabase real-time for personal calendars only, not family (fewer subscribers per event). (2) Implement connection pooling or subscription sharing. (3) Monitor real-time connection count and connection failures. (4) Have a fallback to polling if real-time fails.

## Dependencies at Risk

**React 19 (Latest/Cutting Edge):**
- Risk: App uses React 19.2.3 (package.json:14), which is the very latest version released early 2024. No stable LTS version yet. Breaking changes in React 19 (Server Components, re-rendering behavior) may affect this codebase as the ecosystem catches up.
- Impact: Dependencies may not be compatible with React 19. Custom hooks may behave unexpectedly. Performance optimizations (memo, useMemo) may not work as expected in React 19's new concurrent rendering model.
- Migration plan: (1) Monitor React 19 compatibility of all dependencies (testing-library, supabase-js, lucide-react). (2) Lock version to stable minor once available (e.g., 19.x). (3) Test with React 18 as fallback if React 19-specific issues emerge.

**Supabase JS (Evolving API):**
- Risk: `@supabase/supabase-js` version 2.90.1 (package.json:6) is in the 2.x major version but minor/patch updates frequently. The auth API at `src/services/authService.js` relies on specific Supabase API behaviors (event names like 'SIGNED_IN').
- Impact: Future versions may change auth event names, RLS error formats, or subscription behavior. Breaking changes could silently fail (e.g., auth state not detected).
- Migration plan: (1) Pin to a specific minor version (2.90.x) rather than caret (^2.90.1). (2) Test major version upgrades in isolated branch. (3) Monitor Supabase changelog. (4) Consider abstracting Supabase behind a service layer so upgrades are centralized.

**Outdated React Testing Library:**
- Risk: `@testing-library/react` is 16.3.1 but the ecosystem is moving to version 17+. React Scripts (5.0.1) may become incompatible with newer testing-library versions.
- Impact: Can't upgrade testing tools to latest. Community examples and Stack Overflow answers use newer testing-library APIs.
- Migration plan: Upgrade React Scripts to 6+ and bump testing-library to latest when feasible (likely requires more React 19 compatibility work).

## Missing Critical Features

**No Event Conflict Detection for Creation:**
- Problem: The system detects overlapping events after creation (anomaly detector logs them) but doesn't prevent creation. Users can build schedules with conflicts unaware.
- Blocks: Can't use the calendar for strict scheduling (medical appointments, bookings). Teams can't collaborate on shared family calendar without manual conflict checking.

**No Real-Time Synchronization:**
- Problem: Multiple family members editing the same calendar don't see each other's changes in real-time. They must refresh the page to see updates.
- Blocks: Collaborative planning is difficult. Family members can't see live updates when one person adds an event.

**No Offline Support:**
- Problem: No service worker or offline caching. If network is lost, users can't view or edit their calendar.
- Blocks: Mobile users with intermittent connectivity can't use the app reliably.

**No Batch Operations:**
- Problem: Deleting or updating multiple events requires individual API calls. No bulk operations.
- Blocks: Managing large calendars is tedious. Can't easily move multiple events or delete a series.

**No Search History or Quick Filters:**
- Problem: Search resets on every page reload. No saved filters for common queries (e.g., "all personal/health events", "events this week").
- Blocks: Power users can't efficiently find and filter events.

## Test Coverage Gaps

**Missing Unit Tests for Event Service:**
- What's not tested: `src/services/eventService.js` - validation logic, tag lookup, event transformation, error handling
- Files: `src/services/eventService.js` (entire file, 310 lines)
- Risk: Tag lookup failures (line 92-93) may not be caught. Event transformation can silently drop fields. Tag ID mismatch could cause data corruption.
- Priority: High - event creation/update is core functionality

**Missing Tests for Event Conflicts:**
- What's not tested: Overlap detection, ordering validation, event jumping detection
- Files: `src/utils/runtimeGuards.js` (entire file, 191 lines)
- Risk: Ordering bugs (lines 64-87) won't be caught. Conflict detection logic is only validated by anomaly monitoring (too late).
- Priority: High - data integrity depends on this

**Missing Integration Tests for Auth:**
- What's not tested: Google OAuth flow, user record creation, session persistence, sign-in/sign-out
- Files: `src/services/authService.js` (entire file, 88 lines), `src/App.js` (auth setup, lines 1275-1341)
- Risk: Auth race condition (line 70 timeout) won't be caught until production. Session persists incorrectly on refresh.
- Priority: High - blocks user access to app

**Missing Tests for State Management:**
- What's not tested: Event state synchronization, deleted event filtering, tag context switching, race conditions
- Files: `src/App.js` (state hooks and effects, lines 830-835, 1103-1273, 1343-1403)
- Risk: State divergence from server can't be detected. Race conditions will cause silent failures.
- Priority: High - user-visible data loss

**Stub Test File:**
- What's not tested: Entire app (`src/App.test.js` has only one placeholder test that doesn't actually test anything)
- Files: `src/App.test.js` (3 lines of actual test code)
- Risk: No regression detection. Can't verify refactoring doesn't break functionality.
- Priority: High - currently zero real test coverage

---

*Concerns audit: 2026-01-25*
