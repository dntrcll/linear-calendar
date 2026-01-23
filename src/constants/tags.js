import { PALETTE } from './themes';

// Helper to convert PALETTE format to tag format
const mapPaletteToTag = (palette) => ({
  color: palette.color,
  bgColor: palette.bg,
  textColor: palette.text,
  borderColor: palette.border
});

export const DEFAULT_TAGS = {
  personal: [
    { id: 'work', tagId: 'work', name: "Work", iconName: 'Briefcase', ...mapPaletteToTag(PALETTE.orange) },
    { id: 'personal', tagId: 'personal', name: "Personal", iconName: 'Home', ...mapPaletteToTag(PALETTE.purple) },
    { id: 'health', tagId: 'health', name: "Health", iconName: 'Heart', ...mapPaletteToTag(PALETTE.emerald) },
    { id: 'finance', tagId: 'finance', name: "Finance", iconName: 'DollarSign', ...mapPaletteToTag(PALETTE.amber) },
    { id: 'social', tagId: 'social', name: "Social", iconName: 'Users', ...mapPaletteToTag(PALETTE.rose) },
    { id: 'learning', tagId: 'learning', name: "Learning", iconName: 'BookOpen', ...mapPaletteToTag(PALETTE.blue) },
    { id: 'fitness', tagId: 'fitness', name: "Fitness", iconName: 'Dumbbell', ...mapPaletteToTag(PALETTE.teal) },
    { id: 'food', tagId: 'food', name: "Food", iconName: 'Coffee', ...mapPaletteToTag(PALETTE.orange) },
    { id: 'travel', tagId: 'travel', name: "Travel", iconName: 'Plane', ...mapPaletteToTag(PALETTE.indigo) },
    { id: 'entertainment', tagId: 'entertainment', name: "Entertainment", iconName: 'Film', ...mapPaletteToTag(PALETTE.purple) }
  ],
  family: [
    { id: 'family-time', tagId: 'family-time', name: "Family Time", iconName: 'Home', ...mapPaletteToTag(PALETTE.rose) },
    { id: 'kids', tagId: 'kids', name: "Kids", iconName: 'Baby', ...mapPaletteToTag(PALETTE.amber) },
    { id: 'household', tagId: 'household', name: "Household", iconName: 'Home', ...mapPaletteToTag(PALETTE.purple) },
    { id: 'family-health', tagId: 'family-health', name: "Family Health", iconName: 'Heart', ...mapPaletteToTag(PALETTE.emerald) },
    { id: 'events', tagId: 'events', name: "Events", iconName: 'Calendar', ...mapPaletteToTag(PALETTE.blue) }
  ]
};

// Available icon options for tag customization
// Only includes icons that exist in the ICONS object in App.js
export const AVAILABLE_ICONS = [
  // Work & Productivity
  { name: 'Briefcase', label: 'Briefcase' },
  { name: 'Laptop', label: 'Laptop' },
  { name: 'Target', label: 'Target' },
  { name: 'TrendingUp', label: 'Growth' },
  { name: 'Award', label: 'Award' },
  { name: 'Book', label: 'Book' },
  { name: 'Edit', label: 'Edit' },
  { name: 'List', label: 'List' },
  { name: 'Search', label: 'Search' },
  { name: 'Finance', label: 'Finance' },

  // Health & Wellness
  { name: 'Heart', label: 'Heart' },
  { name: 'Health', label: 'Activity' },
  { name: 'Dumbbell', label: 'Fitness' },
  { name: 'Zap', label: 'Power' },
  { name: 'Sunset', label: 'Sunset' },

  // Social & People
  { name: 'Users', label: 'Group' },
  { name: 'Smile', label: 'Happy' },

  // Home & Lifestyle
  { name: 'Home', label: 'Home' },
  { name: 'Coffee', label: 'Coffee' },
  { name: 'Music', label: 'Music' },
  { name: 'Camera', label: 'Photos' },
  { name: 'Gift', label: 'Gift' },

  // Travel & Transport
  { name: 'Plane', label: 'Plane' },
  { name: 'MapPin', label: 'Location' },
  { name: 'Globe', label: 'Globe' },

  // Calendar & Time
  { name: 'Calendar', label: 'Calendar' },
  { name: 'Clock', label: 'Clock' },
  { name: 'Bell', label: 'Reminder' },
  { name: 'Timer', label: 'Timer' },

  // General
  { name: 'Star', label: 'Star' },
  { name: 'Tag', label: 'Tag' },
  { name: 'Check', label: 'Complete' },
  { name: 'Plus', label: 'Add' },
  { name: 'Play', label: 'Play' },
  { name: 'Pause', label: 'Pause' }
];
