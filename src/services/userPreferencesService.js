import { supabase } from '../supabaseClient';

/**
 * Load user preferences
 * @param {string} userId - The user ID
 * @returns {Promise<{data: Object, error: any}>}
 */
export const loadUserPreferences = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    // Transform to camelCase for app
    const preferences = {
      id: data.id,
      userId: data.user_id,
      darkMode: data.dark_mode,
      use24Hour: data.use_24_hour,
      blurPast: data.blur_past,
      weekStartMonday: data.week_start_monday,
      showSidebar: data.show_sidebar,
      showQuotes: data.show_quotes,
      showUpcoming: data.show_upcoming,
      enableDragDrop: data.enable_drag_drop,
      enableAnimations: data.enable_animations,
      enablePulseEffects: data.enable_pulse_effects,
      showConflictNotifications: data.show_conflict_notifications,
      focusMode: data.focus_mode,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    return { data: preferences, error: null };
  } catch (error) {
    console.error('Error loading user preferences:', error);
    return { data: null, error };
  }
};

/**
 * Update user preferences
 * @param {string} userId - The user ID
 * @param {Object} updates - The preferences to update
 * @returns {Promise<{data: Object, error: any}>}
 */
export const updateUserPreferences = async (userId, updates) => {
  try {
    // Transform camelCase to snake_case for database
    const updateData = {};

    if (updates.darkMode !== undefined) updateData.dark_mode = updates.darkMode;
    if (updates.use24Hour !== undefined) updateData.use_24_hour = updates.use24Hour;
    if (updates.blurPast !== undefined) updateData.blur_past = updates.blurPast;
    if (updates.weekStartMonday !== undefined) updateData.week_start_monday = updates.weekStartMonday;
    if (updates.showSidebar !== undefined) updateData.show_sidebar = updates.showSidebar;
    if (updates.showQuotes !== undefined) updateData.show_quotes = updates.showQuotes;
    if (updates.showUpcoming !== undefined) updateData.show_upcoming = updates.showUpcoming;
    if (updates.enableDragDrop !== undefined) updateData.enable_drag_drop = updates.enableDragDrop;
    if (updates.enableAnimations !== undefined) updateData.enable_animations = updates.enableAnimations;
    if (updates.enablePulseEffects !== undefined) updateData.enable_pulse_effects = updates.enablePulseEffects;
    if (updates.showConflictNotifications !== undefined) updateData.show_conflict_notifications = updates.showConflictNotifications;
    if (updates.focusMode !== undefined) updateData.focus_mode = updates.focusMode;

    const { data, error } = await supabase
      .from('user_preferences')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    // Transform back to camelCase
    const preferences = {
      id: data.id,
      userId: data.user_id,
      darkMode: data.dark_mode,
      use24Hour: data.use_24_hour,
      blurPast: data.blur_past,
      weekStartMonday: data.week_start_monday,
      showSidebar: data.show_sidebar,
      showQuotes: data.show_quotes,
      showUpcoming: data.show_upcoming,
      enableDragDrop: data.enable_drag_drop,
      enableAnimations: data.enable_animations,
      enablePulseEffects: data.enable_pulse_effects,
      showConflictNotifications: data.show_conflict_notifications,
      focusMode: data.focus_mode,
      updated_at: data.updated_at
    };

    return { data: preferences, error: null };
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return { data: null, error };
  }
};

/**
 * Create default user preferences (usually handled by database trigger)
 * @param {string} userId - The user ID
 * @returns {Promise<{data: Object, error: any}>}
 */
export const createUserPreferences = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .insert({
        user_id: userId
        // All other fields will use defaults from schema
      })
      .select()
      .single();

    if (error) throw error;

    const preferences = {
      id: data.id,
      userId: data.user_id,
      darkMode: data.dark_mode,
      use24Hour: data.use_24_hour,
      blurPast: data.blur_past,
      weekStartMonday: data.week_start_monday,
      showSidebar: data.show_sidebar,
      showQuotes: data.show_quotes,
      showUpcoming: data.show_upcoming,
      enableDragDrop: data.enable_drag_drop,
      enableAnimations: data.enable_animations,
      enablePulseEffects: data.enable_pulse_effects,
      showConflictNotifications: data.show_conflict_notifications,
      focusMode: data.focus_mode,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    return { data: preferences, error: null };
  } catch (error) {
    console.error('Error creating user preferences:', error);
    return { data: null, error };
  }
};
