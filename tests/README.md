# Performance Testing & Runtime Guards

This directory contains performance testing tools and runtime integrity guards for the calendar application.

## 📁 Files

### `performance.test.js`
Node.js performance test suite that measures event processing performance.

**Run with:**
```bash
npm run test:perf
```

**Tests:**
- Event generation (100, 1000, 5000 events)
- Event filtering and sorting
- Conflict detection
- Per-event overhead calculation

### `run-performance-tests.js`
Test runner that executes performance tests and exits with error code if severe issues detected.

### `browser-performance-test.html`
Browser-based performance test that can be opened directly in a browser.

**Run with:**
```bash
open tests/browser-performance-test.html
```

Or access at: `http://localhost:3000/tests/browser-performance-test.html` when dev server is running.

## 🛡️ Runtime Guards

The application includes runtime guards that detect anomalies during execution:

### Anomaly Types Detected

1. **OVERLAP** - Events that overlap in time
2. **ORDERING_ISSUE** - Events not properly sorted by start time
3. **EVENT_JUMP** - Events that change position unexpectedly
4. **SKIPPED_EVENT** - Events that disappear from state

### Viewing Anomalies

In browser console:
```javascript
window.calendarDebug.showAnomalies()
```

## 📊 Performance Monitoring

The application tracks performance metrics for:
- `loadData` - Initial data loading from Supabase
- `loadEvents` - Event loading
- `loadTags` - Tag loading
- `eventFilter` - Event filtering operations
- `handleSaveEvent` - Event save operations
- `handleEventDrag` - Event drag operations

### Viewing Performance Metrics

In browser console:
```javascript
window.calendarDebug.showMetrics()
```

## 🤖 Agent Loop

A rule-based agent runs every 30 seconds analyzing:
- Performance metrics against thresholds
- Anomaly patterns
- Code quality issues

The agent automatically flags problem areas and outputs TODO comments with suggestions.

### Viewing Flagged Issues

In browser console:
```javascript
window.calendarDebug.showIssues()
```

### Manual Analysis

Run analysis cycle manually:
```javascript
window.calendarDebug.analyze()
```

## 🔧 Debug Console Commands

All available commands:

```javascript
// View performance metrics
window.calendarDebug.showMetrics()

// View anomaly logs
window.calendarDebug.showAnomalies()

// View flagged issues with suggestions
window.calendarDebug.showIssues()

// Run analysis cycle
window.calendarDebug.analyze()

// Export all data (copies to clipboard)
window.calendarDebug.exportData()

// Clear all logs
window.calendarDebug.reset()

// Show help
window.calendarDebug.help()
```

## 🎯 Performance Thresholds

The agent flags operations that exceed these thresholds:

| Operation | Threshold | Severity |
|-----------|-----------|----------|
| loadData | 2000ms | WARNING |
| eventFilter | 500ms | WARNING |
| eventSort | 300ms | WARNING |
| conflictDetection | 1000ms | WARNING |
| render | 100ms | WARNING |
| handleSaveEvent | 1000ms | WARNING |
| handleEventDrag | 1000ms | WARNING |

## 📝 TODO Comments in Code

The agent automatically adds TODO comments near problem areas with specific suggestions:

```javascript
// TODO: Implement pagination or lazy loading
// TODO: Use Promise.all() to parallelize independent queries
// TODO: Memoize filtered events with useMemo()
// TODO: Optimize O(n²) conflict detection algorithm
```

## 🚨 Zero UI Impact

All monitoring and testing:
- ✅ Runs in background
- ✅ Logs to console only
- ✅ No popups or user-facing indicators
- ✅ No external services
- ✅ Can be disabled by removing imports

## 📈 Continuous Monitoring

The system monitors itself in production and flags issues before they become critical. Check console periodically for warnings.

## 🔒 Production Safety

- All checks are non-blocking
- Failed checks log warnings, never throw errors
- Performance overhead is minimal (<1ms per operation)
- Can be stripped out in production builds if needed
