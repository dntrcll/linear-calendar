import { supabase } from '../supabaseClient';

/**
 * Load all tags for the current user
 * @param {string} userId - The user ID
 * @returns {Promise<{data: Array, error: any}>}
 */
export const loadTags = async (userId) => {
  try {
    console.log('Loading tags for user:', userId);

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase tags query error:', error);
      return { data: [], error };
    }

    console.log('Loaded tags from Supabase:', data?.length || 0);

    // Transform Supabase data to match app format
    const tags = (data || []).map(tag => ({
      id: tag.id, // Database UUID (needed for update/delete)
      tagId: tag.tag_id || tag.name?.toLowerCase().replace(/\s+/g, '-') || tag.id, // Fallback if tag_id is null
      name: tag.name,
      iconName: tag.icon_name,
      context: tag.context,
      color: tag.color,
      bgColor: tag.bg_color,
      textColor: tag.text_color,
      borderColor: tag.border_color,
      created_at: tag.created_at,
      updated_at: tag.updated_at
    }));

    return { data: tags, error: null };
  } catch (error) {
    console.error('Error loading tags:', error);
    return { data: [], error };
  }
};

/**
 * Create a new tag
 * @param {string} userId - The user ID
 * @param {Object} tagData - The tag data
 * @returns {Promise<{data: Object, error: any}>}
 */
export const createTag = async (userId, tagData) => {
  try {
    const { data, error } = await supabase
      .from('tags')
      .insert({
        user_id: userId,
        tag_id: tagData.tagId,
        name: tagData.name,
        icon_name: tagData.iconName,
        context: tagData.context,
        color: tagData.color,
        bg_color: tagData.bgColor,
        text_color: tagData.textColor,
        border_color: tagData.borderColor
      })
      .select()
      .single();

    if (error) throw error;

    const tag = {
      id: data.id,
      tagId: data.tag_id || data.name?.toLowerCase().replace(/\s+/g, '-') || data.id,
      name: data.name,
      iconName: data.icon_name,
      context: data.context,
      color: data.color,
      bgColor: data.bg_color,
      textColor: data.text_color,
      borderColor: data.border_color,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    return { data: tag, error: null };
  } catch (error) {
    console.error('Error creating tag:', error);
    return { data: null, error };
  }
};

/**
 * Update an existing tag
 * @param {string} tagUuid - The tag UUID
 * @param {string} userId - The user ID
 * @param {Object} updates - The fields to update
 * @returns {Promise<{data: Object, error: any}>}
 */
export const updateTag = async (tagUuid, userId, updates) => {
  try {
    const updateData = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.iconName !== undefined) updateData.icon_name = updates.iconName;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.bgColor !== undefined) updateData.bg_color = updates.bgColor;
    if (updates.textColor !== undefined) updateData.text_color = updates.textColor;
    if (updates.borderColor !== undefined) updateData.border_color = updates.borderColor;

    const { data, error } = await supabase
      .from('tags')
      .update(updateData)
      .eq('id', tagUuid)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    const tag = {
      id: data.id,
      tagId: data.tag_id || data.name?.toLowerCase().replace(/\s+/g, '-') || data.id,
      name: data.name,
      iconName: data.icon_name,
      context: data.context,
      color: data.color,
      bgColor: data.bg_color,
      textColor: data.text_color,
      borderColor: data.border_color,
      updated_at: data.updated_at
    };

    return { data: tag, error: null };
  } catch (error) {
    console.error('Error updating tag:', error);
    return { data: null, error };
  }
};

/**
 * Delete a tag
 * Note: This will fail if there are events using this tag due to foreign key constraint
 * @param {string} tagUuid - The tag UUID
 * @param {string} userId - The user ID
 * @returns {Promise<{error: any}>}
 */
export const deleteTag = async (tagUuid, userId) => {
  try {
    // Check if any events are using this tag
    const { data: events, error: checkError } = await supabase
      .from('events')
      .select('id')
      .eq('tag_id', tagUuid)
      .eq('deleted', false)
      .limit(1);

    if (checkError) throw checkError;

    if (events && events.length > 0) {
      return {
        error: {
          message: 'Cannot delete tag that is being used by events',
          code: 'TAG_IN_USE'
        }
      };
    }

    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', tagUuid)
      .eq('user_id', userId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting tag:', error);
    return { error };
  }
};

/**
 * Get tags by context
 * @param {string} userId - The user ID
 * @param {string} context - The context ('personal' or 'family')
 * @returns {Promise<{data: Array, error: any}>}
 */
export const getTagsByContext = async (userId, context) => {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', userId)
      .eq('context', context)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const tags = data.map(tag => ({
      id: tag.id,
      tagId: tag.tag_id || tag.name?.toLowerCase().replace(/\s+/g, '-') || tag.id,
      name: tag.name,
      iconName: tag.icon_name,
      context: tag.context,
      color: tag.color,
      bgColor: tag.bg_color,
      textColor: tag.text_color,
      borderColor: tag.border_color,
      created_at: tag.created_at,
      updated_at: tag.updated_at
    }));

    return { data: tags, error: null };
  } catch (error) {
    console.error('Error getting tags by context:', error);
    return { data: [], error };
  }
};

/**
 * Get a single tag by tag_id and context
 * @param {string} userId - The user ID
 * @param {string} tagId - The tag_id string (e.g., 'work', 'health')
 * @param {string} context - The context ('personal' or 'family')
 * @returns {Promise<{data: Object, error: any}>}
 */
export const getTagByTagId = async (userId, tagId, context) => {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', userId)
      .eq('tag_id', tagId)
      .eq('context', context)
      .single();

    if (error) throw error;

    const tag = {
      id: data.id,
      tagId: data.tag_id || data.name?.toLowerCase().replace(/\s+/g, '-') || data.id,
      name: data.name,
      iconName: data.icon_name,
      context: data.context,
      color: data.color,
      bgColor: data.bg_color,
      textColor: data.text_color,
      borderColor: data.border_color,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    return { data: tag, error: null };
  } catch (error) {
    console.error('Error getting tag by tagId:', error);
    return { data: null, error };
  }
};
