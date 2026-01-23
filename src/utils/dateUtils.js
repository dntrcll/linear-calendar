/**
 * Date utility functions for the Linear Calendar app
 */

/**
 * Format date for datetime-local input (avoids UTC conversion issues)
 * @param {Date|string|number} date - The date to format
 * @returns {string} Date string in format YYYY-MM-DDTHH:mm
 */
export const toLocalDateTimeString = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Get ISO week number for a given date
 * @param {Date} date - The date to get week number for
 * @returns {number} ISO week number (1-53)
 */
export const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};
