/**
 * Internal Agent Loop - Rule-Based Code Quality Monitor
 * Observes performance metrics and anomaly logs
 * Flags problem areas and generates actionable TODOs
 * NO AI - purely deterministic rules
 */

let performanceLog = [];
let flaggedIssues = [];
let runtimeGuards = null;

const getRuntimeGuards = async () => {
  if (runtimeGuards) return runtimeGuards;

  try {
    runtimeGuards = await import('./runtimeGuards.js');
    return runtimeGuards;
  } catch {
    return null;
  }
};

export const recordPerformance = (operation, duration, metadata = {}) => {
  performanceLog.push({
    timestamp: new Date().toISOString(),
    operation,
    duration,
    metadata
  });

  if (performanceLog.length > 500) {
    performanceLog.shift();
  }

  analyzePerformanceMetric(operation, duration, metadata);
};

export const getPerformanceStats = () => {
  const stats = {
    total: performanceLog.length,
    byOperation: {}
  };

  performanceLog.forEach(log => {
    if (!stats.byOperation[log.operation]) {
      stats.byOperation[log.operation] = {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: Infinity
      };
    }

    const opStats = stats.byOperation[log.operation];
    opStats.count++;
    opStats.totalDuration += log.duration;
    opStats.maxDuration = Math.max(opStats.maxDuration, log.duration);
    opStats.minDuration = Math.min(opStats.minDuration, log.duration);
    opStats.avgDuration = opStats.totalDuration / opStats.count;
  });

  return stats;
};

const analyzePerformanceMetric = (operation, duration, metadata) => {
  const thresholds = {
    loadData: 2000,
    eventFilter: 500,
    eventSort: 300,
    conflictDetection: 1000,
    render: 100,
    default: 1000
  };

  const threshold = thresholds[operation] || thresholds.default;

  if (duration > threshold) {
    flagIssue({
      severity: 'WARNING',
      category: 'PERFORMANCE',
      operation,
      duration,
      threshold,
      metadata,
      codeLocation: getCodeLocationForOperation(operation),
      suggestion: getSuggestionForOperation(operation, duration, metadata)
    });
  }
};

const getCodeLocationForOperation = (operation) => {
  const locations = {
    loadData: 'App.js:loadData() function (useEffect)',
    eventFilter: 'App.js:useEffect with events/context/activeTagIds dependencies',
    eventSort: 'App.js:event sorting logic',
    conflictDetection: 'App.js:findConflicts() or utils.js',
    render: 'LinearCalendar.css or component render cycle',
    handleSaveEvent: 'App.js:handleSaveEvent() function',
    handleEventDrag: 'App.js:handleEventDrag() function'
  };

  return locations[operation] || 'Unknown location';
};

const getSuggestionForOperation = (operation, duration, metadata) => {
  const suggestions = {
    loadData: [
      'TODO: Consider implementing pagination or lazy loading',
      'TODO: Cache tags and user preferences to reduce queries',
      'TODO: Use Promise.all() to parallelize independent queries',
      'TODO: Add indexing on user_id columns in Supabase'
    ],
    eventFilter: [
      'TODO: Memoize filtered events with useMemo()',
      'TODO: Use Map for O(1) tag lookups instead of array filtering',
      'TODO: Debounce filter operations if triggered frequently'
    ],
    eventSort: [
      'TODO: Pre-sort events on load and maintain order on updates',
      'TODO: Use binary search for insertions to maintain sorted order',
      'TODO: Consider virtualization for large event lists'
    ],
    conflictDetection: [
      'TODO: Optimize O(n²) conflict detection algorithm',
      'TODO: Use interval tree or sweep line algorithm',
      'TODO: Only check conflicts for visible/nearby events',
      'TODO: Cache conflict results and invalidate on changes'
    ],
    render: [
      'TODO: Profile component re-renders with React DevTools',
      'TODO: Implement React.memo() for expensive child components',
      'TODO: Check for unnecessary useEffect dependencies',
      'TODO: Virtualize calendar grid for large date ranges'
    ]
  };

  const baseSuggestions = suggestions[operation] || [
    'TODO: Profile this operation to identify bottleneck',
    'TODO: Add performance.mark() calls to isolate slow section'
  ];

  if (metadata.eventCount && metadata.eventCount > 1000) {
    baseSuggestions.push('TODO: Event count is high - implement virtualization');
  }

  return baseSuggestions;
};

const flagIssue = (issue) => {
  flaggedIssues.push({
    ...issue,
    timestamp: new Date().toISOString(),
    id: `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  });

  console.warn(`[AGENT FLAG] ${issue.severity} - ${issue.category}:`, {
    operation: issue.operation,
    duration: `${issue.duration.toFixed(2)}ms`,
    threshold: `${issue.threshold}ms`,
    location: issue.codeLocation
  });

  console.warn(`[SUGGESTIONS]:`);
  issue.suggestion.forEach((s, i) => {
    console.warn(`  ${i + 1}. ${s}`);
  });
};

export const analyzeAnomalies = async () => {
  const guards = await getRuntimeGuards();
  if (!guards) return;

  const stats = guards.getAnomalyStats();

  if (stats.byType.OVERLAP && stats.byType.OVERLAP > 5) {
    flagIssue({
      severity: 'WARNING',
      category: 'DATA_INTEGRITY',
      operation: 'overlap_detection',
      duration: 0,
      threshold: 5,
      metadata: { count: stats.byType.OVERLAP },
      codeLocation: 'App.js:handleSaveEvent() or event validation',
      suggestion: [
        'TODO: Add client-side validation to prevent overlapping events',
        'TODO: Show visual warning when user creates overlapping event',
        'TODO: Add database constraint or trigger to prevent overlaps',
        'TODO: Review event drag-and-drop logic for overlap prevention'
      ]
    });
  }

  if (stats.byType.ORDERING_ISSUE && stats.byType.ORDERING_ISSUE > 0) {
    flagIssue({
      severity: 'ERROR',
      category: 'DATA_INTEGRITY',
      operation: 'event_ordering',
      duration: 0,
      threshold: 0,
      metadata: { count: stats.byType.ORDERING_ISSUE },
      codeLocation: 'App.js:useEffect event sorting logic',
      suggestion: [
        'TODO: CRITICAL - Fix event sorting algorithm immediately',
        'TODO: Ensure consistent ISO string date comparison',
        'TODO: Add unit tests for event sorting edge cases',
        'TODO: Check for timezone handling bugs'
      ]
    });
  }

  if (stats.byType.EVENT_JUMP && stats.byType.EVENT_JUMP > 3) {
    flagIssue({
      severity: 'WARNING',
      category: 'DATA_INTEGRITY',
      operation: 'event_stability',
      duration: 0,
      threshold: 3,
      metadata: { count: stats.byType.EVENT_JUMP },
      codeLocation: 'App.js:state management or Supabase sync',
      suggestion: [
        'TODO: Review handleEventDrag and updateEvent logic',
        'TODO: Check for race conditions in event updates',
        'TODO: Ensure optimistic updates are properly reconciled',
        'TODO: Add event version tracking to detect conflicts'
      ]
    });
  }

  if (stats.byType.SKIPPED_EVENT && stats.byType.SKIPPED_EVENT > 0) {
    flagIssue({
      severity: 'ERROR',
      category: 'DATA_INTEGRITY',
      operation: 'event_persistence',
      duration: 0,
      threshold: 0,
      metadata: { count: stats.byType.SKIPPED_EVENT },
      codeLocation: 'App.js:loadData() or event filtering',
      suggestion: [
        'TODO: CRITICAL - Events are disappearing from state',
        'TODO: Check Supabase RLS policies for data visibility',
        'TODO: Review event deletion and soft-delete logic',
        'TODO: Add event audit log to track state changes'
      ]
    });
  }
};

export const runAnalysisCycle = async () => {
  console.log('\n[AGENT LOOP] Running analysis cycle...');

  const perfStats = getPerformanceStats();

  const guards = await getRuntimeGuards();
  const anomalyStats = guards ? guards.getAnomalyStats() : { total: 0, byType: {} };

  console.log('[AGENT LOOP] Performance operations tracked:', Object.keys(perfStats.byOperation).length);
  console.log('[AGENT LOOP] Anomalies detected:', anomalyStats.total);

  await analyzeAnomalies();

  console.log('[AGENT LOOP] Total issues flagged:', flaggedIssues.length);
  console.log('[AGENT LOOP] Analysis complete\n');

  return {
    performance: perfStats,
    anomalies: anomalyStats,
    issues: flaggedIssues
  };
};

export const getFlaggedIssues = () => flaggedIssues;

export const resetAgent = () => {
  performanceLog = [];
  flaggedIssues = [];
  console.log('[AGENT LOOP] Reset complete');
};

export const generateTODOComments = () => {
  const todos = {};

  flaggedIssues.forEach(issue => {
    const location = issue.codeLocation;
    if (!todos[location]) {
      todos[location] = [];
    }

    todos[location].push({
      severity: issue.severity,
      category: issue.category,
      suggestions: issue.suggestion
    });
  });

  return todos;
};
