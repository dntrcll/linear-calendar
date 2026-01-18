/**
 * Event utility functions for the Linear Calendar app
 */

/**
 * Check if two events overlap in time
 * @param {Object} event1 - First event
 * @param {Object} event2 - Second event
 * @returns {boolean} True if events overlap
 */
export const eventsOverlap = (event1, event2) => {
  if (!event1.start || !event1.end || !event2.start || !event2.end) return false;
  const start1 = new Date(event1.start).getTime();
  const end1 = new Date(event1.end).getTime();
  const start2 = new Date(event2.start).getTime();
  const end2 = new Date(event2.end).getTime();
  return start1 < end2 && start2 < end1;
};

/**
 * Find all events that conflict with a given event
 * @param {Object} event - The event to check for conflicts
 * @param {Array} allEvents - Array of all events
 * @returns {Array} Array of conflicting events
 */
export const findConflicts = (event, allEvents) => {
  return allEvents.filter(e =>
    e.id !== event.id &&
    !e.deleted &&
    eventsOverlap(event, e)
  );
};
