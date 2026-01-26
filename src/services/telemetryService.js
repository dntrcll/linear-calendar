import { supabase } from '../supabaseClient';

/**
 * Load all telemetry data for a specific month
 * @param {string} userId - User ID
 * @param {number} year - Year (e.g., 2025)
 * @param {number} month - Month (1-12)
 * @returns {Promise<{habits, days, completions, summary, error}>}
 */
export const loadMonthTelemetry = async (userId, year, month) => {
  try {
    // Calculate date range for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    // Load habits
    const { data: habits, error: habitsError } = await supabase
      .from('telemetry_habits')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (habitsError) throw habitsError;

    // Load days (mood scores and notes)
    const { data: days, error: daysError } = await supabase
      .from('telemetry_days')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (daysError) throw daysError;

    // Load completions
    const { data: completions, error: completionsError } = await supabase
      .from('telemetry_completions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (completionsError) throw completionsError;

    // Load monthly summary
    const { data: summaryData, error: summaryError } = await supabase
      .from('telemetry_month_summaries')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .eq('month', month)
      .single();

    // Summary might not exist yet, that's okay
    const summary = summaryError ? null : summaryData;

    return {
      habits: habits || [],
      days: days || [],
      completions: completions || [],
      summary,
      error: null
    };
  } catch (error) {
    console.error('Error loading month telemetry:', error);
    return { habits: [], days: [], completions: [], summary: null, error };
  }
};

/**
 * Toggle habit completion for a specific day
 * @param {string} userId - User ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {string} habitId - Habit ID
 * @param {boolean} completed - New completion status
 * @returns {Promise<{data, error}>}
 */
export const toggleHabitCompletion = async (userId, date, habitId, completed) => {
  try {
    const { data, error } = await supabase
      .from('telemetry_completions')
      .upsert({
        user_id: userId,
        date,
        habit_id: habitId,
        completed
      }, {
        onConflict: 'user_id,date,habit_id'
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error toggling habit completion:', error);
    return { data: null, error };
  }
};

/**
 * Update mood score, note, emoji, and memorable moment for a day
 * @param {string} userId - User ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {number|null} moodScore - Mood score (0-10) or null
 * @param {string} note - Daily note
 * @param {string} moodEmoji - Mood emoji
 * @param {string} memorableMoment - Memorable moment for the day
 * @returns {Promise<{data, error}>}
 */
export const updateDayTelemetry = async (userId, date, moodScore, note, moodEmoji = '', memorableMoment = '') => {
  try {
    const { data, error } = await supabase
      .from('telemetry_days')
      .upsert({
        user_id: userId,
        date,
        mood_score: moodScore,
        note,
        mood_emoji: moodEmoji,
        memorable_moment: memorableMoment,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,date'
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating day telemetry:', error);
    return { data: null, error };
  }
};

/**
 * Update monthly summary (memorable moments)
 * @param {string} userId - User ID
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {string} memorableMoments - Narrative text
 * @returns {Promise<{data, error}>}
 */
export const updateMonthSummary = async (userId, year, month, memorableMoments) => {
  try {
    const { data, error } = await supabase
      .from('telemetry_month_summaries')
      .upsert({
        user_id: userId,
        year,
        month,
        memorable_moments: memorableMoments,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,year,month'
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating month summary:', error);
    return { data: null, error };
  }
};

/**
 * Create a new habit
 * @param {string} userId - User ID
 * @param {string} name - Habit name
 * @param {string} habitType - 'build' or 'eliminate'
 * @param {number} displayOrder - Display order
 * @returns {Promise<{data, error}>}
 */
export const createHabit = async (userId, name, habitType, displayOrder) => {
  try {
    const { data, error } = await supabase
      .from('telemetry_habits')
      .insert({
        user_id: userId,
        name,
        habit_type: habitType,
        display_order: displayOrder
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating habit:', error);
    return { data: null, error };
  }
};

/**
 * Update habit name or order
 * @param {string} habitId - Habit ID
 * @param {object} updates - Fields to update
 * @returns {Promise<{data, error}>}
 */
export const updateHabit = async (habitId, updates) => {
  try {
    const { data, error } = await supabase
      .from('telemetry_habits')
      .update(updates)
      .eq('id', habitId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating habit:', error);
    return { data: null, error };
  }
};

/**
 * Archive a habit (soft delete)
 * @param {string} habitId - Habit ID
 * @returns {Promise<{error}>}
 */
export const archiveHabit = async (habitId) => {
  try {
    const { error } = await supabase
      .from('telemetry_habits')
      .update({ active: false })
      .eq('id', habitId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error archiving habit:', error);
    return { error };
  }
};
