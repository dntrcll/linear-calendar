import { supabase } from '../supabaseClient';

/**
 * Load all non-deleted events for the current user
 * @param {string} userId - The user ID
 * @returns {Promise<{data: Array, error: any}>}
 */
export const loadEvents = async (userId) => {
  try {
    console.log('Loading events for user:', userId);

    // Run both queries in parallel to stay within timeout
    const [eventsResult, tagsResult] = await Promise.all([
      supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .eq('deleted', false)
        .order('start_time', { ascending: true }),
      supabase
        .from('tags')
        .select('id, tag_id')
        .eq('user_id', userId)
    ]);

    if (eventsResult.error) {
      console.error('Supabase events query error:', eventsResult.error);
      return { data: [], error: eventsResult.error };
    }

    // Build tag UUID → tag_id map
    const tagMap = {};
    (tagsResult.data || []).forEach(t => { tagMap[t.id] = t.tag_id; });

    const data = eventsResult.data || [];
    console.log('Loaded events from Supabase:', data.length);

    // Transform Supabase data to match app format
    const events = data.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      category: tagMap[event.tag_id] || 'other',
      context: event.context,
      start: event.start_time,
      end: event.end_time,
      deleted: event.deleted,
      deleted_at: event.deleted_at,
      created_at: event.created_at,
      updated_at: event.updated_at,
      recurrencePattern: event.recurrence_pattern || 'none',
      recurrenceEndDate: event.recurrence_end_date,
      parentEventId: event.parent_event_id
    }));

    return { data: events, error: null };
  } catch (error) {
    console.error('Error loading events:', error);
    return { data: [], error };
  }
};

/**
 * Look up tag UUID from tag_id string - handles duplicates gracefully
 */
const lookupTagId = async (userId, category, context) => {
  const { data, error } = await supabase
    .from('tags')
    .select('id')
    .eq('user_id', userId)
    .eq('tag_id', category)
    .eq('context', context)
    .limit(1);

  if (error) {
    console.error('Tag lookup error:', error, 'for category:', category, 'context:', context);
    return null;
  }

  if (!data || data.length === 0) {
    // Fallback: try without context filter (tag might be shared across contexts)
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('tags')
      .select('id')
      .eq('user_id', userId)
      .eq('tag_id', category)
      .limit(1);

    if (fallbackError || !fallbackData || fallbackData.length === 0) {
      console.error('Tag not found even without context filter:', category);
      return null;
    }
    return fallbackData[0].id;
  }

  return data[0].id;
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

    // Get the tag UUID
    const tagUuid = await lookupTagId(userId, eventData.category, eventData.context);
    if (!tagUuid) {
      throw new Error(`Tag not found for category "${eventData.category}" in ${eventData.context} context`);
    }

    // Build base insert data (only core columns that definitely exist)
    const insertData = {
      user_id: userId,
      title: eventData.title,
      description: eventData.description || '',
      location: eventData.location || '',
      tag_id: tagUuid,
      context: eventData.context,
      start_time: eventData.start,
      end_time: eventData.end,
      deleted: false
    };

    // Try inserting - first attempt includes recurrence fields, fallback without
    let data, error;

    const hasRecurrence = eventData.recurrencePattern && eventData.recurrencePattern !== 'none';

    if (hasRecurrence || eventData.recurrenceEndDate || eventData.parentEventId) {
      const fullInsertData = { ...insertData };
      if (hasRecurrence) {
        fullInsertData.recurrence_pattern = eventData.recurrencePattern;
      }
      if (eventData.recurrenceEndDate) {
        fullInsertData.recurrence_end_date = eventData.recurrenceEndDate;
      }
      if (eventData.parentEventId) {
        fullInsertData.parent_event_id = eventData.parentEventId;
      }

      const result = await supabase
        .from('events')
        .insert(fullInsertData)
        .select('*')
        .single();

      if (result.error) {
        // If error is about unknown columns, retry without recurrence fields
        const errMsg = (result.error.message || result.error.code || '').toLowerCase();
        if (errMsg.includes('column') || errMsg.includes('undefined') || errMsg.includes('42703')) {
          console.warn('Recurrence columns may not exist, retrying without them:', result.error.message);
          const fallbackResult = await supabase
            .from('events')
            .insert(insertData)
            .select('*')
            .single();
          data = fallbackResult.data;
          error = fallbackResult.error;
        } else {
          data = result.data;
          error = result.error;
        }
      } else {
        data = result.data;
        error = result.error;
      }
    } else {
      // No recurrence - simple insert
      const result = await supabase
        .from('events')
        .insert(insertData)
        .select('*')
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) throw error;

    // Transform to app format
    const event = {
      id: data.id,
      title: data.title,
      description: data.description || '',
      location: data.location || '',
      category: eventData.category,
      context: data.context,
      start: data.start_time,
      end: data.end_time,
      deleted: data.deleted,
      created_at: data.created_at,
      updated_at: data.updated_at,
      recurrencePattern: data.recurrence_pattern || 'none',
      recurrenceEndDate: data.recurrence_end_date,
      parentEventId: data.parent_event_id
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
      const ctx = updates.context || 'personal';
      const tagUuid = await lookupTagId(userId, updates.category, ctx);
      if (!tagUuid) {
        throw new Error(`Tag not found for category "${updates.category}" in ${ctx} context`);
      }
      updateData.tag_id = tagUuid;
    }

    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw error;

    // Transform to app format
    const event = {
      id: data.id,
      title: data.title,
      description: data.description || '',
      location: data.location || '',
      category: updates.category || data.tag_id,
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
      .select('*')
      .single();

    if (error) throw error;

    const event = {
      id: data.id,
      title: data.title,
      description: data.description || '',
      location: data.location || '',
      category: data.tag_id,
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

/**
 * Generate recurring event instances from a parent event
 * @param {Object} parentEvent - The parent event with recurrence pattern
 * @param {Date} endDate - End date for generation (defaults to 2 years from start)
 * @returns {Array<Object>} - Array of event instances
 */
export const generateRecurringInstances = (parentEvent, endDate = null) => {
  if (!parentEvent.recurrencePattern || parentEvent.recurrencePattern === 'none') {
    return [];
  }

  const instances = [];
  const pattern = parentEvent.recurrencePattern;
  const startDate = new Date(parentEvent.start);
  const eventEndDate = new Date(parentEvent.end);
  const eventDuration = eventEndDate.getTime() - startDate.getTime();

  // Use provided end date, recurrence end date, or default to 2 years
  const maxEndDate = endDate
    ? new Date(endDate)
    : parentEvent.recurrenceEndDate
    ? new Date(parentEvent.recurrenceEndDate)
    : new Date(startDate.getTime() + (2 * 365 * 24 * 60 * 60 * 1000)); // 2 years

  let currentDate = new Date(startDate);

  // Limit to 1000 instances for safety
  let count = 0;
  const MAX_INSTANCES = 1000;

  while (currentDate <= maxEndDate && count < MAX_INSTANCES) {
    // Create instance
    const instanceStart = new Date(currentDate);
    const instanceEnd = new Date(currentDate.getTime() + eventDuration);

    instances.push({
      ...parentEvent,
      id: null, // Will be generated on creation
      start: instanceStart.toISOString(),
      end: instanceEnd.toISOString(),
      parentEventId: parentEvent.id,
      recurrencePattern: 'none' // Instances themselves are not recurring
    });

    // Increment based on pattern
    switch (pattern) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'fortnightly':
        currentDate.setDate(currentDate.getDate() + 14);
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
      default:
        return instances;
    }

    count++;
  }

  return instances;
};

/**
 * Create recurring event instances in the database
 * @param {string} userId - The user ID
 * @param {Object} parentEvent - The parent event
 * @param {Date} endDate - Optional end date for generation
 * @returns {Promise<{data: Array, error: any}>}
 */
export const createRecurringInstances = async (userId, parentEvent, endDate = null) => {
  try {
    const instances = generateRecurringInstances(parentEvent, endDate);

    if (instances.length === 0) {
      return { data: [], error: null };
    }

    // Create all instances
    const createdEvents = [];
    for (const instance of instances) {
      const { data, error } = await createEvent(userId, {
        title: instance.title,
        description: instance.description,
        location: instance.location,
        category: instance.category,
        context: instance.context,
        start: instance.start,
        end: instance.end,
        parentEventId: parentEvent.id,
        recurrencePattern: 'none'
      });

      if (error) {
        console.error('Error creating recurring instance:', error);
        continue;
      }

      createdEvents.push(data);
    }

    return { data: createdEvents, error: null };
  } catch (error) {
    console.error('Error creating recurring instances:', error);
    return { data: [], error };
  }
};
