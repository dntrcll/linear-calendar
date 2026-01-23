/**
 * Debug Console Utilities
 * Expose agent and guard functions to browser console for debugging
 * Usage: In browser console, type window.calendarDebug.showMetrics()
 */

export const initDebugConsole = async () => {
  let guards = null;
  let agent = null;

  try {
    [guards, agent] = await Promise.all([
      import('./runtimeGuards.js').catch(() => null),
      import('./agentLoop.js').catch(() => null)
    ]);
  } catch {
    // Silent fail
  }

  window.calendarDebug = {
    // Performance metrics
    showMetrics: () => {
      if (!agent) {
        console.warn('Agent loop not loaded');
        return {};
      }
      const stats = agent.getPerformanceStats();
      console.log('=== PERFORMANCE METRICS ===');
      console.table(stats.byOperation);
      return stats;
    },

    // Anomaly logs
    showAnomalies: () => {
      if (!guards) {
        console.warn('Runtime guards not loaded');
        return { stats: {}, logs: [] };
      }
      const logs = guards.getAnomalyLog();
      const stats = guards.getAnomalyStats();
      console.log('=== ANOMALY STATISTICS ===');
      console.table(stats.byType);
      console.log('\n=== ANOMALY LOG (last 20) ===');
      console.table(logs.slice(-20));
      return { stats, logs };
    },

    // Flagged issues
    showIssues: () => {
      if (!agent) {
        console.warn('Agent loop not loaded');
        return [];
      }
      const issues = agent.getFlaggedIssues();
      console.log('=== FLAGGED ISSUES ===');
      issues.forEach((issue, i) => {
        console.log(`\n${i + 1}. [${issue.severity}] ${issue.category} - ${issue.operation}`);
        console.log(`   Location: ${issue.codeLocation}`);
        console.log(`   Duration: ${issue.duration?.toFixed(2)}ms (threshold: ${issue.threshold}ms)`);
        console.log('   Suggestions:');
        issue.suggestion.forEach(s => console.log(`     - ${s}`));
      });
      return issues;
    },

    // Run analysis cycle manually
    analyze: () => {
      if (!agent) {
        console.warn('Agent loop not loaded');
        return {};
      }
      console.log('Running analysis cycle...');
      return agent.runAnalysisCycle();
    },

    // Clear all logs
    reset: () => {
      console.log('Resetting agent and clearing logs...');
      if (agent) agent.resetAgent();
      if (guards) guards.clearAnomalyLog();
      console.log('Reset complete');
    },

    // Export data for external analysis
    exportData: () => {
      if (!agent || !guards) {
        console.warn('Instrumentation not fully loaded');
        return {};
      }

      const data = {
        performance: agent.getPerformanceStats(),
        anomalies: {
          stats: guards.getAnomalyStats(),
          logs: guards.getAnomalyLog()
        },
        issues: agent.getFlaggedIssues(),
        timestamp: new Date().toISOString()
      };

      console.log('=== EXPORTED DATA ===');
      console.log(JSON.stringify(data, null, 2));

      if (navigator.clipboard) {
        navigator.clipboard.writeText(JSON.stringify(data, null, 2))
          .then(() => console.log('✅ Data copied to clipboard'))
          .catch(() => console.log('⚠️ Could not copy to clipboard'));
      }

      return data;
    },

    // Help
    help: () => {
      console.log(`
=== CALENDAR DEBUG CONSOLE ===

Available commands:

  window.calendarDebug.showMetrics()   - View performance metrics
  window.calendarDebug.showAnomalies() - View anomaly logs
  window.calendarDebug.showIssues()    - View flagged issues
  window.calendarDebug.analyze()       - Run analysis cycle
  window.calendarDebug.reset()         - Clear all logs
  window.calendarDebug.exportData()    - Export all data to clipboard
  window.calendarDebug.help()          - Show this help

Examples:

  // Check what's slow
  window.calendarDebug.showMetrics()

  // See detected issues
  window.calendarDebug.showIssues()

  // Run full analysis
  window.calendarDebug.analyze()
      `);
    }
  };

  // Log initialization
  if (guards || agent) {
    console.log('🔧 Calendar Debug Console initialized');
    console.log('Type window.calendarDebug.help() for available commands');
  }
};
