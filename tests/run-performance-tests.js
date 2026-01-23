#!/usr/bin/env node
/**
 * Performance Test Runner
 * Executes performance tests and outputs results
 */

// Make performance API available in Node
if (typeof performance === 'undefined') {
  global.performance = {
    now: () => {
      const [seconds, nanoseconds] = process.hrtime();
      return seconds * 1000 + nanoseconds / 1000000;
    }
  };
}

const { runPerformanceTests } = require('./performance.test.js');

console.log('Starting performance test suite...\n');
const results = runPerformanceTests();

// Exit with error code if any tests show severe performance issues
const hasSevereIssues = results.some(r => {
  const totalTime = r.generateTime + r.processTime;
  return totalTime > 5000; // 5 seconds is severe
});

if (hasSevereIssues) {
  console.log('❌ SEVERE PERFORMANCE ISSUES DETECTED');
  process.exit(1);
} else {
  console.log('✅ Performance tests passed');
  process.exit(0);
}
