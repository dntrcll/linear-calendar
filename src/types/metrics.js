/**
 * @typedef {'manual' | 'auto'} MetricType
 */

/**
 * @typedef {Object} LifeMetric
 * @property {string} id - UUID
 * @property {string} user_id - User UUID
 * @property {string} recorded_at - ISO timestamp
 * @property {MetricType} metric_type - manual or auto-calculated
 * @property {string} metric_name - e.g., 'sleep_hours', 'productivity_score'
 * @property {number} [metric_value] - Numeric value if applicable
 * @property {Object} [metric_data] - Additional JSON data
 */

/**
 * @typedef {Object} ManualHealthEntry
 * @property {number} [sleep_hours] - 0-24
 * @property {number} [weight] - kg or lbs
 * @property {boolean} [worked_out]
 * @property {string} [workout_type]
 * @property {boolean} [ate_healthy]
 * @property {number} [mood] - 1-5 scale
 * @property {number} [energy] - 1-5 scale
 */

/**
 * @typedef {Object} AutoProductivityMetrics
 * @property {number} focus_time_minutes
 * @property {number} productivity_score - 0-100
 * @property {number} context_switches
 * @property {number} goal_completion_rate - 0-100
 * @property {Object} category_distribution - time per category
 */

/**
 * @typedef {Object} ProductivityInputs
 * @property {number} focusTimeMinutes - Total focused work time
 * @property {number} goalCompletionRate - Percentage 0-100
 * @property {number} contextSwitches - Number of context switches
 * @property {number} totalTrackedMinutes - Total tracked time
 */

export {};
