/**
 * Instrumentation Dynamic Loader
 * Conditionally loads agent/guards only in development
 * Safe to use even if agent files are deleted
 */

let runtimeGuards = null;
let agentLoop = null;
let debugConsole = null;
let isLoaded = false;

const noop = () => {};
const noopReturn = () => ({});

const fallbacks = {
  runAllGuards: noop,
  clearAnomalyLog: noop,
  recordPerformance: noop,
  runAnalysisCycle: noop,
  resetAgent: noop,
  initDebugConsole: noop
};

/**
 * Load instrumentation modules dynamically
 */
const loadInstrumentation = async () => {
  if (isLoaded) return true;

  // Only load in development
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }

  try {
    // Use dynamic import with webpack magic comments to make optional
    const [guards, agent, debug] = await Promise.all([
      import(/* webpackMode: "lazy" */ './runtimeGuards.js').catch(() => null),
      import(/* webpackMode: "lazy" */ './agentLoop.js').catch(() => null),
      import(/* webpackMode: "lazy" */ './debugConsole.js').catch(() => null)
    ]);

    runtimeGuards = guards;
    agentLoop = agent;
    debugConsole = debug;
    isLoaded = true;

    if (guards || agent || debug) {
      console.log('[Instrumentation] Loaded successfully');
    }

    return true;
  } catch (error) {
    // Silent fail - instrumentation is optional
    return false;
  }
};

/**
 * Safe wrapper for runAllGuards
 */
export const runAllGuards = (...args) => {
  if (runtimeGuards?.runAllGuards) {
    return runtimeGuards.runAllGuards(...args);
  }
  return fallbacks.runAllGuards();
};

/**
 * Safe wrapper for recordPerformance
 */
export const recordPerformance = (...args) => {
  if (agentLoop?.recordPerformance) {
    return agentLoop.recordPerformance(...args);
  }
  return fallbacks.recordPerformance();
};

/**
 * Safe wrapper for runAnalysisCycle
 */
export const runAnalysisCycle = (...args) => {
  if (agentLoop?.runAnalysisCycle) {
    return agentLoop.runAnalysisCycle(...args);
  }
  return fallbacks.runAnalysisCycle();
};

/**
 * Safe wrapper for initDebugConsole
 */
export const initDebugConsole = (...args) => {
  if (debugConsole?.initDebugConsole) {
    return debugConsole.initDebugConsole(...args);
  }
  return fallbacks.initDebugConsole();
};

/**
 * Initialize instrumentation (call once on app mount)
 */
export const initInstrumentation = async () => {
  const loaded = await loadInstrumentation();

  if (loaded && debugConsole?.initDebugConsole) {
    debugConsole.initDebugConsole();
  }

  return loaded;
};

/**
 * Check if instrumentation is available
 */
export const isInstrumentationAvailable = () => {
  return isLoaded && process.env.NODE_ENV === 'development';
};
