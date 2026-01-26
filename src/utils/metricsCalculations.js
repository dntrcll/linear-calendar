/**
 * Calculate productivity score (0-100)
 * Formula: (focusRatio * 0.4) + (goalCompletion * 0.4) + (contextPenalty * 0.2)
 * @param {import('../types/metrics').ProductivityInputs} inputs
 * @returns {number} Score 0-100
 */
export const calculateProductivityScore = ({
  focusTimeMinutes,
  goalCompletionRate,
  contextSwitches,
  totalTrackedMinutes
}) => {
  const focusRatio = totalTrackedMinutes > 0
    ? Math.min(100, (focusTimeMinutes / totalTrackedMinutes) * 100)
    : 0;

  const goalScore = Math.min(100, Math.max(0, goalCompletionRate));

  // Context switch penalty: fewer switches = higher score
  // Assume 0-3 switches is excellent, >10 is poor
  const switchPenalty = Math.max(0, 100 - (contextSwitches * 10));

  const score = (focusRatio * 0.4) + (goalScore * 0.4) + (switchPenalty * 0.2);

  return Math.round(Math.min(100, Math.max(0, score)));
};

/**
 * Transform daily data into visx heatmap bin structure
 * @param {Array<{date: string, value: number}>} dailyData
 * @returns {Array} Visx-compatible bin structure
 */
export const transformToHeatmapBins = (dailyData) => {
  const weeks = [];
  let currentWeek = [];

  dailyData.forEach((day, index) => {
    currentWeek.push({ bin: currentWeek.length, count: day.value });
    if (currentWeek.length === 7 || index === dailyData.length - 1) {
      weeks.push({ bin: weeks.length, bins: currentWeek });
      currentWeek = [];
    }
  });

  return weeks;
};

/**
 * Calculate focus time from timeline events
 * @param {Array} events - Timeline events
 * @returns {number} Focus time in minutes
 */
export const calculateFocusTime = (events) => {
  if (!events || events.length === 0) return 0;

  const focusCategories = ['work', 'deep-work', 'coding', 'learning'];

  return events.reduce((total, event) => {
    if (focusCategories.includes(event.category?.toLowerCase())) {
      const duration = event.duration || 0;
      return total + duration;
    }
    return total;
  }, 0);
};

/**
 * Calculate context switches from timeline events
 * @param {Array} events - Timeline events sorted by time
 * @returns {number} Number of context switches
 */
export const calculateContextSwitches = (events) => {
  if (!events || events.length <= 1) return 0;

  let switches = 0;
  for (let i = 1; i < events.length; i++) {
    if (events[i].category !== events[i - 1].category) {
      switches++;
    }
  }
  return switches;
};

/**
 * Calculate goal completion rate
 * @param {Array} goals - Goals with completion status
 * @returns {number} Percentage 0-100
 */
export const calculateGoalCompletionRate = (goals) => {
  if (!goals || goals.length === 0) return 0;

  const completed = goals.filter(g => g.completed || g.done).length;
  return Math.round((completed / goals.length) * 100);
};
