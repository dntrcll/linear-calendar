/**
 * Performance Test Suite
 * Measures calendar load and render times under different event loads
 * Run with: node tests/performance.test.js
 */

const generateMockEvents = (count) => {
  const events = [];
  const startDate = new Date('2024-01-01');
  const contexts = ['personal', 'family'];
  const categories = ['work', 'health', 'social', 'learning', 'other'];

  for (let i = 0; i < count; i++) {
    const start = new Date(startDate.getTime() + (i * 3600000)); // 1 hour apart
    const end = new Date(start.getTime() + 1800000); // 30 min duration

    events.push({
      id: `event-${i}`,
      title: `Event ${i}`,
      description: `Description for event ${i}`,
      location: i % 5 === 0 ? `Location ${i}` : '',
      category: categories[i % categories.length],
      context: contexts[i % contexts.length],
      start: start.toISOString(),
      end: end.toISOString(),
      deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  return events;
};

const measureEventProcessing = (events) => {
  const startTime = performance.now();

  // Simulate filtering operations
  const filtered = events.filter(e => !e.deleted);

  // Simulate sorting
  const sorted = [...filtered].sort((a, b) =>
    new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  // Simulate conflict detection
  const conflicts = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const event1 = sorted[i];
      const event2 = sorted[j];

      const start1 = new Date(event1.start).getTime();
      const end1 = new Date(event1.end).getTime();
      const start2 = new Date(event2.start).getTime();
      const end2 = new Date(event2.end).getTime();

      if (start1 < end2 && start2 < end1) {
        conflicts.push([event1.id, event2.id]);
      }

      // Break early if events are too far apart (optimization)
      if (start2 >= end1) break;
    }
  }

  const endTime = performance.now();

  return {
    duration: endTime - startTime,
    eventCount: events.length,
    filteredCount: filtered.length,
    conflictCount: conflicts.length
  };
};

const runPerformanceTests = () => {
  console.log('\n=== PERFORMANCE TEST SUITE ===\n');

  const testCases = [
    { count: 100, label: '100 events' },
    { count: 1000, label: '1,000 events' },
    { count: 5000, label: '5,000 events' }
  ];

  const results = [];

  testCases.forEach(({ count, label }) => {
    console.log(`Testing ${label}...`);

    const generateStart = performance.now();
    const events = generateMockEvents(count);
    const generateEnd = performance.now();

    const processingResult = measureEventProcessing(events);

    const result = {
      label,
      count,
      generateTime: generateEnd - generateStart,
      processTime: processingResult.duration,
      conflicts: processingResult.conflictCount
    };

    results.push(result);

    console.log(`  Generation: ${result.generateTime.toFixed(2)}ms`);
    console.log(`  Processing: ${result.processTime.toFixed(2)}ms`);
    console.log(`  Conflicts: ${result.conflicts}`);
    console.log('');
  });

  console.log('=== SUMMARY ===\n');
  results.forEach(r => {
    console.log(`${r.label}:`);
    console.log(`  Total time: ${(r.generateTime + r.processTime).toFixed(2)}ms`);
    console.log(`  Avg time per event: ${((r.generateTime + r.processTime) / r.count).toFixed(4)}ms`);
  });

  // Flag performance issues
  console.log('\n=== PERFORMANCE FLAGS ===\n');
  results.forEach(r => {
    const totalTime = r.generateTime + r.processTime;
    if (totalTime > 1000) {
      console.log(`⚠️  ${r.label}: Processing time exceeds 1s (${totalTime.toFixed(2)}ms)`);
      console.log(`    TODO: Optimize event filtering/sorting in App.js loadData()`);
    }
    if (r.processTime / r.count > 0.1) {
      console.log(`⚠️  ${r.label}: Per-event overhead is high (${(r.processTime / r.count).toFixed(4)}ms)`);
      console.log(`    TODO: Review conflict detection algorithm complexity`);
    }
  });

  console.log('\n');
  return results;
};

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateMockEvents,
    measureEventProcessing,
    runPerformanceTests
  };
}

// Run tests if executed directly
if (typeof window === 'undefined') {
  runPerformanceTests();
}
