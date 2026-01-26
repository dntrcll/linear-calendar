import { supabase } from '../supabaseClient';
import {
  calculateProductivityScore,
  calculateFocusTime,
  calculateContextSwitches
} from '../utils/metricsCalculations';

/**
 * Calculate and save productivity metrics from timeline events
 * @param {string} userId - User ID
 * @param {Date} date - Date to calculate metrics for
 * @param {Array} events - Timeline events for the date
 * @returns {Promise<{success: boolean, error: any}>}
 */
export const calculateAndSaveProductivityMetrics = async (userId, date, events) => {
  try {
    const dateStr = date.toISOString().split('T')[0];

    // Filter events for this specific date
    const dayEvents = events.filter(event => {
      const eventDate = new Date(event.start).toISOString().split('T')[0];
      return eventDate === dateStr && !event.deleted;
    });

    if (dayEvents.length === 0) {
      console.log('No events for date:', dateStr);
      return { success: true, error: null };
    }

    // Calculate total tracked minutes
    const totalTrackedMinutes = dayEvents.reduce((sum, event) => {
      const start = new Date(event.start);
      const end = new Date(event.end);
      return sum + (end - start) / (1000 * 60);
    }, 0);

    // Calculate focus time (events > 30 min)
    const focusTimeMinutes = calculateFocusTime(dayEvents);

    // Calculate context switches (number of different tags)
    const contextSwitches = calculateContextSwitches(dayEvents);

    // Calculate goal completion rate (events marked as completed / total events)
    const completedEvents = dayEvents.filter(e => e.completed || e.status === 'completed').length;
    const goalCompletionRate = dayEvents.length > 0
      ? (completedEvents / dayEvents.length) * 100
      : 0;

    // Calculate productivity score
    const productivityScore = calculateProductivityScore({
      focusTimeMinutes,
      goalCompletionRate,
      contextSwitches,
      totalTrackedMinutes
    });

    // Calculate category balance (time distribution)
    const categoryTime = {};
    dayEvents.forEach(event => {
      const tags = event.tags || [];
      const duration = (new Date(event.end) - new Date(event.start)) / (1000 * 60);
      tags.forEach(tag => {
        categoryTime[tag] = (categoryTime[tag] || 0) + duration;
      });
    });

    // Calculate weekly velocity (average events per day over last 7 days)
    const weekAgo = new Date(date);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekEvents = events.filter(e => {
      const eventDate = new Date(e.start);
      return eventDate >= weekAgo && eventDate <= date && !e.deleted;
    });
    const weeklyVelocity = weekEvents.length / 7;

    // Prepare metrics to save
    const metrics = [
      {
        user_id: userId,
        recorded_at: new Date(date).toISOString(),
        metric_type: 'auto',
        metric_name: 'focus_time',
        metric_value: Math.round(focusTimeMinutes),
        metric_data: { unit: 'minutes' }
      },
      {
        user_id: userId,
        recorded_at: new Date(date).toISOString(),
        metric_type: 'auto',
        metric_name: 'productivity_score',
        metric_value: productivityScore,
        metric_data: {}
      },
      {
        user_id: userId,
        recorded_at: new Date(date).toISOString(),
        metric_type: 'auto',
        metric_name: 'context_switches',
        metric_value: contextSwitches,
        metric_data: {}
      },
      {
        user_id: userId,
        recorded_at: new Date(date).toISOString(),
        metric_type: 'auto',
        metric_name: 'goal_completion',
        metric_value: Math.round(goalCompletionRate),
        metric_data: { completed: completedEvents, total: dayEvents.length }
      },
      {
        user_id: userId,
        recorded_at: new Date(date).toISOString(),
        metric_type: 'auto',
        metric_name: 'category_balance',
        metric_value: Object.keys(categoryTime).length,
        metric_data: { categories: categoryTime }
      },
      {
        user_id: userId,
        recorded_at: new Date(date).toISOString(),
        metric_type: 'auto',
        metric_name: 'weekly_velocity',
        metric_value: Math.round(weeklyVelocity * 10) / 10,
        metric_data: { total_events: weekEvents.length, days: 7 }
      }
    ];

    // Delete existing auto metrics for this date
    await supabase
      .from('life_metrics')
      .delete()
      .eq('user_id', userId)
      .eq('metric_type', 'auto')
      .gte('recorded_at', `${dateStr}T00:00:00.000Z`)
      .lte('recorded_at', `${dateStr}T23:59:59.999Z`);

    // Insert new metrics
    const { error } = await supabase
      .from('life_metrics')
      .insert(metrics);

    if (error) {
      console.error('Error saving productivity metrics:', error);
      return { success: false, error };
    }

    console.log(`Saved ${metrics.length} productivity metrics for ${dateStr}`);
    return { success: true, error: null };
  } catch (error) {
    console.error('Error calculating productivity metrics:', error);
    return { success: false, error };
  }
};

/**
 * Calculate productivity metrics for a date range
 * @param {string} userId - User ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Array} events - All timeline events
 * @returns {Promise<{success: boolean, error: any}>}
 */
export const calculateProductivityMetricsRange = async (userId, startDate, endDate, events) => {
  try {
    const currentDate = new Date(startDate);
    const promises = [];

    while (currentDate <= endDate) {
      promises.push(
        calculateAndSaveProductivityMetrics(userId, new Date(currentDate), events)
      );
      currentDate.setDate(currentDate.getDate() + 1);
    }

    await Promise.all(promises);
    return { success: true, error: null };
  } catch (error) {
    console.error('Error calculating metrics range:', error);
    return { success: false, error };
  }
};
