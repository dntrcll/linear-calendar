# How to Delete Instrumentation

If you want to completely remove the agent/instrumentation layer:

## Quick Deletion (Keep App Working)

```bash
# Delete the 3 agent files
rm src/utils/runtimeGuards.js
rm src/utils/agentLoop.js
rm src/utils/debugConsole.js

# That's it! App still works (with webpack warnings)
npm start
```

The app will compile and run. You'll see webpack warnings about missing modules, but they're non-fatal.

## Clean Deletion (No Warnings)

```bash
# 1. Delete all agent files
rm src/utils/runtimeGuards.js
rm src/utils/agentLoop.js
rm src/utils/debugConsole.js
rm src/utils/instrumentation.js

# 2. Edit src/App.js - Remove these lines:
```

In `src/App.js`, remove:

```javascript
// Remove this import (around line 43-48)
import {
  runAllGuards,
  recordPerformance,
  runAnalysisCycle,
  initInstrumentation
} from "./utils/instrumentation";

// Remove this useEffect (around line 1220-1230)
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    initInstrumentation().then(loaded => {
      if (loaded) {
        console.log('[App] Instrumentation loaded');
      }
    });
  }
}, []);

// Remove this useEffect (around line 1232-1248)
useEffect(() => {
  if (process.env.NODE_ENV !== 'development') return;

  const analysisInterval = setInterval(() => {
    runAnalysisCycle();
  }, 30000);

  const initialAnalysis = setTimeout(() => {
    runAnalysisCycle();
  }, 5000);

  return () => {
    clearInterval(analysisInterval);
    clearTimeout(initialAnalysis);
  };
}, []);
```

In `loadData` function (around line 1020-1095), remove:

```javascript
// Remove these lines
const loadStartTime = performance.now();

recordPerformance('loadEvents', eventsEndTime - eventsStartTime, {
  eventCount: eventsResult.data?.length || 0
});

recordPerformance('loadTags', tagsEndTime - tagsStartTime, {
  tagCount: tagsResult.data?.length || 0
});

const loadEndTime = performance.now();
const totalLoadTime = loadEndTime - loadStartTime;

recordPerformance('loadData', totalLoadTime, {
  success: true
});
```

In event filtering useEffect (around line 1156-1176), remove:

```javascript
// Remove these lines
const filterStartTime = performance.now();
const filterEndTime = performance.now();

recordPerformance('eventFilter', filterEndTime - filterStartTime, {
  eventCount: events.length,
  filteredCount: filtered.length,
  hasSearch: searchLower.length > 0
});

if (filtered.length > 0) {
  runAllGuards(filtered, context);
}
```

In `handleSaveEvent` (around line 1255-1315), remove:

```javascript
// Remove these lines
const saveStartTime = performance.now();

const saveEndTime = performance.now();
recordPerformance('handleSaveEvent', saveEndTime - saveStartTime, {
  isUpdate: !!data.id
});

// And in the catch block
const saveEndTime = performance.now();
recordPerformance('handleSaveEvent', saveEndTime - saveStartTime, {
  isUpdate: !!data.id,
  failed: true
});
```

In `handleEventDrag` (around line 1332-1361), remove:

```javascript
// Remove these lines
const dragStartTime = performance.now();

const dragEndTime = performance.now();
recordPerformance('handleEventDrag', dragEndTime - dragStartTime, {
  eventId
});

// And in the catch block
const dragEndTime = performance.now();
recordPerformance('handleEventDrag', dragEndTime - dragStartTime, {
  eventId,
  failed: true
});
```

Also remove TODO comments:
```javascript
// Remove all TODO comments related to agent/instrumentation
// Search for "TODO:" and remove agent-related ones
```

```bash
# 3. Restart dev server
npm start

# 4. Verify it works
# Open http://localhost:3000
# Should load normally with no errors
```

## Delete Tests (Optional)

```bash
# Delete performance tests
rm -rf tests/

# Edit package.json to remove test:perf script
# Remove this line:
#   "test:perf": "node tests/run-performance-tests.js",
```

## Delete Documentation (Optional)

```bash
# Delete instrumentation docs
rm INSTRUMENTATION.md
rm QUICK_START_INSTRUMENTATION.md
rm IMPLEMENTATION_SUMMARY.txt
rm ARCHITECTURE_FIX_VERIFICATION.md
rm FINAL_VERIFICATION.txt
rm DELETE_AGENT_INSTRUCTIONS.md
```

## Verify Clean State

After deletion:

```bash
# Build should succeed with no warnings
npm start

# Production build should work
npm run build

# No agent code in bundle
grep -r "AGENT\|instrumentation" build/static/js/
# Should return nothing

# App should work normally
# Open browser, create events, everything functions
```

## Result

You now have a clean app with:
- ✅ No agent/instrumentation code
- ✅ No webpack warnings
- ✅ Full functionality intact
- ✅ Smaller bundle size
- ✅ No performance tracking overhead

The app works exactly as before, just without the optional monitoring layer.
