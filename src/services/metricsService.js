import { supabase } from '../supabaseClient';

/**
 * Load metrics for date range
 * @param {string} userId - User ID
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {Promise<{data: Array, error: any}>}
 */
export const loadMetrics = async (userId, startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from('life_metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('recorded_at', startDate)
      .lte('recorded_at', endDate)
      .order('recorded_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error loading metrics:', error);
    return { data: [], error };
  }
};

/**
 * Insert a new metric
 * @param {import('../types/metrics').LifeMetric} metric
 * @returns {Promise<{data: any, error: any}>}
 */
export const insertMetric = async (metric) => {
  try {
    const { data, error } = await supabase
      .from('life_metrics')
      .insert(metric)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error inserting metric:', error);
    return { data: null, error };
  }
};

/**
 * Update an existing metric
 * @param {string} id - Metric ID
 * @param {Partial<import('../types/metrics').LifeMetric>} updates
 * @returns {Promise<{data: any, error: any}>}
 */
export const updateMetric = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('life_metrics')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating metric:', error);
    return { data: null, error };
  }
};

/**
 * Delete a metric
 * @param {string} id - Metric ID
 * @returns {Promise<{error: any}>}
 */
export const deleteMetric = async (id) => {
  try {
    const { error } = await supabase
      .from('life_metrics')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting metric:', error);
    return { error };
  }
};
