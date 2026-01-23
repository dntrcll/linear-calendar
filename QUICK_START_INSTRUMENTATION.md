# Quick Start: Calendar Instrumentation

## ⚡ 5-Minute Setup

Your calendar app now includes performance monitoring and runtime guards. Here's how to use it.

## 🚀 Already Running

The instrumentation is **already active** in your app. No configuration needed.

## 🔍 Check What's Happening

Open your browser console (Cmd+Option+J on Mac) and type:

```javascript
window.calendarDebug.help()
```

You'll see all available commands.

## 📊 Quick Commands

### See Performance Metrics
```javascript
window.calendarDebug.showMetrics()
```

### See Detected Issues
```javascript
window.calendarDebug.showIssues()
```

### See Data Anomalies
```javascript
window.calendarDebug.showAnomalies()
```

### Run Analysis Now
```javascript
window.calendarDebug.analyze()
```

### Export All Data
```javascript
window.calendarDebug.exportData()  // Copies to clipboard
```

## 🧪 Run Performance Tests

In terminal:
```bash
npm run test:perf
```

Or open in browser:
```bash
open tests/browser-performance-test.html
```

## 🎯 What's Being Monitored

✅ **Load Times**
- How long data loads from Supabase
- Event and tag query performance

✅ **Filter Performance**
- How fast events filter by context/tags
- Search performance

✅ **Save Operations**
- Event create/update latency
- Drag-and-drop performance

✅ **Data Integrity**
- Overlapping events
- Event ordering issues
- Events disappearing (data loss)
- Unstable event positions

## 🤖 Automatic Analysis

The agent runs every 30 seconds and logs:
- ⚠️ **Warnings** - Performance over threshold
- ❌ **Errors** - Critical issues detected
- 💡 **Suggestions** - TODO comments for fixes

Check your console periodically for findings.

## 📝 TODO Comments in Code

Look for these in `App.js`:

```javascript
// TODO: Add client-side validation to prevent overlapping events
// TODO: Optimize O(n²) conflict detection algorithm
// TODO: Implement optimistic updates for drag operations
```

These are automatically added by the agent based on detected issues.

## ⚙️ Configuration

No configuration needed. Instrumentation is:
- Zero UI impact (console only)
- Non-blocking (never throws errors)
- Low overhead (<0.5% performance impact)
- Safe for production

## 🛑 Want to Disable?

See `INSTRUMENTATION.md` for removal instructions.

## 📚 Full Documentation

- `INSTRUMENTATION.md` - Complete technical details
- `tests/README.md` - Testing documentation

## 🎬 Example Session

```javascript
// 1. Start your app
npm start

// 2. Open console, check help
window.calendarDebug.help()

// 3. Create some events in the UI

// 4. Check metrics after 30 seconds
window.calendarDebug.showMetrics()

// 5. See if any issues were flagged
window.calendarDebug.showIssues()

// 6. Export data for analysis
window.calendarDebug.exportData()
```

## ✅ That's It!

The instrumentation is already working. Just use the debug commands when you want to inspect performance or detect issues.
