/**
 * Runtime Guards for Calendar Event Integrity
 * Detects anomalies in event ordering, overlaps, and stability
 * Logs warnings without affecting production behavior
 */

let previousEventSnapshot = [];
let anomalyLog = [];

export const logAnomaly = (type, details) => {
  const timestamp = new Date().toISOString();
  const anomaly = { timestamp, type, details };
  anomalyLog.push(anomaly);

  if (anomalyLog.length > 100) {
    anomalyLog.shift();
  }

  console.warn(`[ANOMALY DETECTED] ${type}:`, details);
};

export const getAnomalyLog = () => anomalyLog;

export const clearAnomalyLog = () => {
  anomalyLog = [];
};

export const detectOverlaps = (events, context) => {
  const contextEvents = events
    .filter(e => e.context === context && !e.deleted)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const overlaps = [];

  for (let i = 0; i < contextEvents.length - 1; i++) {
    const event1 = contextEvents[i];
    const event2 = contextEvents[i + 1];

    const start1 = new Date(event1.start).getTime();
    const end1 = new Date(event1.end).getTime();
    const start2 = new Date(event2.start).getTime();
    const end2 = new Date(event2.end).getTime();

    if (start1 < end2 && start2 < end1) {
      overlaps.push({
        event1: event1.id,
        event2: event2.id,
        title1: event1.title,
        title2: event2.title
      });

      logAnomaly('OVERLAP', {
        event1: event1.title,
        event2: event2.title,
        event1_time: `${event1.start} - ${event1.end}`,
        event2_time: `${event2.start} - ${event2.end}`
      });
    }
  }

  return overlaps;
};

export const detectOrderingIssues = (events) => {
  const nonDeletedEvents = events.filter(e => !e.deleted);

  for (let i = 0; i < nonDeletedEvents.length - 1; i++) {
    const current = nonDeletedEvents[i];
    const next = nonDeletedEvents[i + 1];

    const currentStart = new Date(current.start).getTime();
    const nextStart = new Date(next.start).getTime();

    if (currentStart > nextStart) {
      logAnomaly('ORDERING_ISSUE', {
        index: i,
        current_event: current.title,
        next_event: next.title,
        current_start: current.start,
        next_start: next.start
      });
      return true;
    }
  }

  return false;
};

export const detectEventJumping = (currentEvents) => {
  if (previousEventSnapshot.length === 0) {
    previousEventSnapshot = currentEvents.map(e => ({
      id: e.id,
      start: e.start,
      end: e.end,
      title: e.title
    }));
    return [];
  }

  const jumps = [];

  currentEvents.forEach(currentEvent => {
    const previousEvent = previousEventSnapshot.find(e => e.id === currentEvent.id);

    if (previousEvent) {
      if (previousEvent.start !== currentEvent.start || previousEvent.end !== currentEvent.end) {
        jumps.push({
          id: currentEvent.id,
          title: currentEvent.title,
          previous: {
            start: previousEvent.start,
            end: previousEvent.end
          },
          current: {
            start: currentEvent.start,
            end: currentEvent.end
          }
        });

        logAnomaly('EVENT_JUMP', {
          event: currentEvent.title,
          previous_start: previousEvent.start,
          current_start: currentEvent.start,
          previous_end: previousEvent.end,
          current_end: currentEvent.end
        });
      }
    }
  });

  previousEventSnapshot = currentEvents.map(e => ({
    id: e.id,
    start: e.start,
    end: e.end,
    title: e.title
  }));

  return jumps;
};

export const detectSkippedEvents = (currentEvents) => {
  if (previousEventSnapshot.length === 0) {
    return [];
  }

  const currentIds = new Set(currentEvents.map(e => e.id));
  const skipped = [];

  previousEventSnapshot.forEach(prevEvent => {
    if (!currentIds.has(prevEvent.id)) {
      skipped.push({
        id: prevEvent.id,
        title: prevEvent.title,
        last_seen_start: prevEvent.start
      });

      logAnomaly('SKIPPED_EVENT', {
        event: prevEvent.title,
        id: prevEvent.id,
        last_seen_start: prevEvent.start
      });
    }
  });

  return skipped;
};

export const runAllGuards = (events, context) => {
  const results = {
    overlaps: detectOverlaps(events, context),
    orderingIssues: detectOrderingIssues(events),
    jumps: detectEventJumping(events),
    skipped: detectSkippedEvents(events),
    timestamp: new Date().toISOString()
  };

  return results;
};

export const getAnomalyStats = () => {
  const stats = {
    total: anomalyLog.length,
    byType: {}
  };

  anomalyLog.forEach(anomaly => {
    stats.byType[anomaly.type] = (stats.byType[anomaly.type] || 0) + 1;
  });

  return stats;
};
