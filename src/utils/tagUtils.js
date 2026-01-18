/**
 * Tag utility functions for the Linear Calendar app
 */

/**
 * Get icon component from tag
 * @param {Object} tag - Tag object with iconName property
 * @param {Object} ICONS - Icon components object
 * @returns {React.Component|null} Icon component or null
 */
export const getTagIcon = (tag, ICONS) => {
  if (tag.iconName && ICONS[tag.iconName]) {
    return ICONS[tag.iconName];
  }
  return null;
};
