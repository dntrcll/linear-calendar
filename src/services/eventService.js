import { supabase } from '../supabaseClient';

/**
 * Load all non-deleted events for the current user
 * @param {string} userId - The user ID
 * @returns {Promise<{data: Array, error: any}>}
 */
export const loadEvents = async (userId) => {
  try {
    console.log('Loading events for user:', userId);

    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        tags (
          tag_id,
          name,
          icon_name,
          color,
          bg_color,
          text_color,
          border_color
        )
      `)
      .eq('user_id', userId)
      .eq('deleted', false)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Supabase query error:', error);
      return { data: [], error };
    }

    console.log('Loaded events from Supabase:', data?.length || 0);

    // Transform Supabase data to match app format
    const events = (data || []).map(event => ({
      id: event.id,
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      category: event.tags?.tag_id || 'other',
      context: event.context,
      start: event.start_time,
      end: event.end_time,
      deleted: event.deleted,
      deleted_at: event.deleted_at,
      created_at: event.created_at,
      updated_at: event.updated_at
    }));

    return { data: events, error: null };
  } catch (error) {
    console.error('Error loading events:', error);
    return { data: [], error };
  }
};

/**
 * Create a new event
 * @param {string} userId - The user ID
 * @param {Object} eventData - The event data
 * @returns {Promise<{data: Object, error: any}>}
 */
export const createEvent = async (userId, eventData) => {
  try {
    // Validate required fields
    if (!eventData.title || !eventData.title.trim()) {
      throw new Error('Event title is required');
    }
    if (!eventData.category) {
      throw new Error('Event category is required');
    }
    if (!eventData.context) {
      throw new Error('Event context is required');
    }
    if (!eventData.start || !eventData.end) {
      throw new Error('Event start and end times are required');
    }

    // First, get the tag UUID from the tag_id string
    const { data: tagData, error: tagError } = await supabase
      .from('tags')
      .select('id')
      .eq('user_id', userId)
      .eq('tag_id', eventData.category)
      .eq('context', eventData.context)
      .single();

    if (tagError) {
      console.error('Tag lookup error:', tagError, 'for category:', eventData.category, 'context:', eventData.context);
      throw new Error(`Tag not found for category "${eventData.category}" in ${eventData.context} context`);
    }
    if (!tagData) {
      throw new Error(`No tag found for category "${eventData.category}" in ${eventData.context} context`);
    }

    const { data, error } = await supabase
      .from('events')
      .insert({
        user_id: userId,
        title: eventData.title,
        description: eventData.description || '',
        location: eventData.location || '',
        tag_id: tagData.id, // Use the UUID from tags table
        context: eventData.context,
        start_time: eventData.start,
        end_time: eventData.end,
        deleted: false
      })
      .select(`
        *,
        tags (*)
      `)
      .single();

    if (error) throw error;

    // Transform to app format
    const event = {
      id: data.id,
      title: data.title,
      description: data.description || '',
      location: data.location || '',
      category: data.tags?.tag_id || eventData.category,
      categoryData: data.tags,
      context: data.context,
      start: data.start_time,
      end: data.end_time,
      deleted: data.deleted,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    return { data: event, error: null };
  } catch (error) {
    console.error('Error creating event:', error);
    return { data: null, error };
  }
};

/**
 * Update an existing event
 * @param {string} eventId - The event ID
 * @param {string} userId - The user ID
 * @param {Object} updates - The fields to update
 * @returns {Promise<{data: Object, error: any}>}
 */
export const updateEvent = async (eventId, userId, updates) => {
  try {
    const updateData = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description || '';
    if (updates.location !== undefined) updateData.location = updates.location || '';
    if (updates.context !== undefined) updateData.context = updates.context;
    if (updates.start !== undefined) updateData.start_time = updates.start;
    if (updates.end !== undefined) updateData.end_time = updates.end;

    // If category changed, get the new tag UUID
    if (updates.category) {
      if (!updates.context) {
        throw new Error('Context is required when updating category');
      }

      const { data: tagData, error: tagError } = await supabase
        .from('tags')
        .select('id')
        .eq('user_id', userId)
        .eq('tag_id', updates.category)
        .eq('context', updates.context)
        .single();

      if (tagError) {
        console.error('Tag lookup error during update:', tagError, 'for category:', updates.category, 'context:', updates.context);
        throw new Error(`Tag not found for category "${updates.category}" in ${updates.context} context`);
      }
      if (!tagData) {
        throw new Error(`No tag found for category "${updates.category}" in ${updates.context} context`);
      }
      updateData.tag_id = tagData.id;
    }

    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .eq('user_id', userId)
      .select(`
        *,
        tags (*)
      `)
      .single();

    if (error) throw error;

    // Transform to app format
    const event = {
      id: data.id,
      title: data.title,
      description: data.description || '',
      location: data.location || '',
      category: data.tags?.tag_id || updates.category,
      categoryData: data.tags,
      context: data.context,
      start: data.start_time,
      end: data.end_time,
      deleted: data.deleted,
      updated_at: data.updated_at
    };

    return { data: event, error: null };
  } catch (error) {
    console.error('Error updating event:', error);
    return { data: null, error };
  }
};

/**
 * Soft delete an event
 * @param {string} eventId - The event ID
 * @param {string} userId - The user ID
 * @returns {Promise<{error: any}>}
 */
export const deleteEvent = async (eventId, userId) => {
  try {
    const { error } = await supabase
      .from('events')
      .update({
        deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .eq('user_id', userId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting event:', error);
    return { error };
  }
};

/**
 * Permanently delete an event (hard delete)
 * @param {string} eventId - The event ID
 * @param {string} userId - The user ID
 * @returns {Promise<{error: any}>}
 */
export const permanentlyDeleteEvent = async (eventId, userId) => {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', userId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error permanently deleting event:', error);
    return { error };
  }
};

/**
 * Restore a soft-deleted event
 * @param {string} eventId - The event ID
 * @param {string} userId - The user ID
 * @returns {Promise<{data: Object, error: any}>}
 */
export const restoreEvent = async (eventId, userId) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .update({
        deleted: false,
        deleted_at: null
      })
      .eq('id', eventId)
      .eq('user_id', userId)
      .select(`
        *,
        tags (*)
      `)
      .single();

    if (error) throw error;

    const event = {
      id: data.id,
      title: data.title,
      description: data.description || '',
      location: data.location || '',
      category: data.tags?.tag_id,
      categoryData: data.tags,
      context: data.context,
      start: data.start_time,
      end: data.end_time,
      deleted: data.deleted,
      updated_at: data.updated_at
    };

    return { data: event, error: null };
  } catch (error) {
    console.error('Error restoring event:', error);
    return { data: null, error };
  }
};
