import { supabase } from '../supabaseClient';

/**
 * Load all non-deleted events for the current user
 * @param {string} userId - The user ID
 * @returns {Promise<{data: Array, error: any}>}
 */
export const loadEvents = async (userId) => {
  try {
    // Run both queries in parallel to stay within timeout
    const [eventsResult, tagsResult] = await Promise.all([
      supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
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

    if (tagsResult.error) {
      console.error('Supabase tags query error:', tagsResult.error);
      // Continue with empty tagMap so events still appear
    }

    // Build tag UUID → tag_id map
    const tagMap = {};
    (tagsResult.data || []).forEach(t => { tagMap[t.id] = t.tag_id; });

    const data = eventsResult.data || [];

    // Transform Supabase data to match app format
    const events = data.map(event => transformEvent(event, tagMap));

    return { data: events, error: null };
  } catch (error) {
    console.error('Error loading events:', error);
    return { data: [], error };
  }
};

/**
 * Transform a database row into app event format
 * @param {Object} dbRow - The raw database row
 * @param {Object} tagMap - Map of tag UUID to tag_id string
 * @param {string} knownCategory - Optional known category (avoids tagMap lookup)
 * @returns {Object} - Transformed event object
 */
const transformEvent = (dbRow, tagMap = {}, knownCategory = null) => ({
  id: dbRow.id,
  title: dbRow.title,
  description: dbRow.description || '',
  location: dbRow.location || '',
  category: knownCategory || tagMap[dbRow.tag_id] || 'other',
  context: dbRow.context,
  start: dbRow.start_time,
  end: dbRow.end_time,
  deleted: dbRow.deleted,
  deleted_at: dbRow.deleted_at,
  created_at: dbRow.created_at,
  updated_at: dbRow.updated_at,
  recurrencePattern: dbRow.recurrence_pattern || 'none',
  recurrenceEndDate: dbRow.recurrence_end_date,
  parentEventId: dbRow.parent_event_id
});

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
      .select('id, context')
      .eq('user_id', userId)
      .eq('tag_id', category)
      .limit(1);

    if (fallbackError || !fallbackData || fallbackData.length === 0) {
      console.error('Tag not found:', category);
      return null;
    }
    // Warn about context mismatch - event may appear in wrong calendar
    console.warn(`Tag "${category}" not found in "${context}" context, using tag from "${fallbackData[0].context}" context`);
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

    // Transform to app format using helper
    return { data: transformEvent(data, {}, eventData.category), error: null };
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
    // Need to determine context - use provided context or fetch current from DB
    let resolvedCategory = null;
    if (updates.category) {
      let ctx = updates.context;
      if (!ctx) {
        // Fetch current event's context from DB
        const { data: currentEvent } = await supabase
          .from('events')
          .select('context, tag_id')
          .eq('id', eventId)
          .eq('user_id', userId)
          .single();
        ctx = currentEvent?.context || 'personal';
      }
      const tagUuid = await lookupTagId(userId, updates.category, ctx);
      if (!tagUuid) {
        throw new Error(`Tag not found for category "${updates.category}" in ${ctx} context`);
      }
      updateData.tag_id = tagUuid;
      resolvedCategory = updates.category;
    }

    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw error;

    // Need tagMap to resolve category if not explicitly updated
    let tagMap = {};
    if (!resolvedCategory) {
      const { data: tags } = await supabase
        .from('tags')
        .select('id, tag_id')
        .eq('user_id', userId);
      (tags || []).forEach(t => { tagMap[t.id] = t.tag_id; });
    }

    return { data: transformEvent(data, tagMap, resolvedCategory), error: null };
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

    // Fetch tagMap to resolve category
    const { data: tags } = await supabase
      .from('tags')
      .select('id, tag_id')
      .eq('user_id', userId);
    const tagMap = {};
    (tags || []).forEach(t => { tagMap[t.id] = t.tag_id; });

    return { data: transformEvent(data, tagMap), error: null };
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
  const originalDay = startDate.getDate(); // Preserve original day for monthly/yearly

  // Limit to 1000 instances for safety
  let count = 0;
  const MAX_INSTANCES = 1000;

  // Skip the first date since parent event already exists
  // Increment before loop starts
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
    case 'monthly': {
      // Fix: Set date to 1 first to avoid overflow (Jan 31 -> Feb 31 = Mar 3)
      currentDate.setDate(1);
      currentDate.setMonth(currentDate.getMonth() + 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
      currentDate.setDate(Math.min(originalDay, lastDay));
      break;
    }
    case 'yearly': {
      // Fix: Set date to 1 first to avoid overflow for leap year edge cases
      currentDate.setDate(1);
      currentDate.setFullYear(currentDate.getFullYear() + 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
      currentDate.setDate(Math.min(originalDay, lastDay));
      break;
    }
    default:
      return instances;
  }

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
      case 'monthly': {
        // Fix: Set date to 1 first to avoid overflow (Jan 31 -> Feb 31 = Mar 3)
        currentDate.setDate(1);
        currentDate.setMonth(currentDate.getMonth() + 1);
        // Clamp to original day or last day of month
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        currentDate.setDate(Math.min(originalDay, lastDayOfMonth));
        break;
      }
      case 'yearly': {
        // Fix: Set date to 1 first to avoid overflow for leap year edge cases
        currentDate.setDate(1);
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        // Handle Feb 29 -> Feb 28 for non-leap years
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        currentDate.setDate(Math.min(originalDay, lastDayOfMonth));
        break;
      }
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

    // Pre-resolve tag UUID once
    const tagUuid = await lookupTagId(userId, parentEvent.category, parentEvent.context);
    if (!tagUuid) {
      throw new Error(`Tag not found for category "${parentEvent.category}" in ${parentEvent.context} context`);
    }

    // Build insert array for batch insert
    const insertRows = instances.map(instance => ({
      user_id: userId,
      title: instance.title,
      description: instance.description || '',
      location: instance.location || '',
      tag_id: tagUuid,
      context: instance.context,
      start_time: instance.start,
      end_time: instance.end,
      deleted: false,
      parent_event_id: parentEvent.id,
      recurrence_pattern: 'none'
    }));

    // Single batch insert
    const { data, error } = await supabase
      .from('events')
      .insert(insertRows)
      .select('*');

    if (error) throw error;

    // Transform all results using helper
    const createdEvents = (data || []).map(row => transformEvent(row, {}, parentEvent.category));

    return { data: createdEvents, error: null };
  } catch (error) {
    console.error('Error creating recurring instances:', error);
    return { data: [], error };
  }
};
