export const FOCUS_MODES = {
  normal: { id: 'normal', name: 'Normal', icon: 'Calendar', filter: null },
  work: { id: 'work', name: 'Work Focus', icon: 'Briefcase', filter: ['work'] },
  personal: { id: 'personal', name: 'Personal', icon: 'Star', filter: ['personal', 'health', 'travel'] },
  minimal: { id: 'minimal', name: 'Minimal', icon: 'Target', hideStats: true, hideSidebar: true }
};

export const TIMER_COLORS = [
  { id: 'orange', color: '#F97316', name: 'Orange' },
  { id: 'green', color: '#10B981', name: 'Green' },
  { id: 'blue', color: '#3B82F6', name: 'Blue' },
  { id: 'purple', color: '#8B5CF6', name: 'Purple' },
  { id: 'pink', color: '#EC4899', name: 'Pink' },
  { id: 'red', color: '#EF4444', name: 'Red' },
  { id: 'yellow', color: '#F59E0B', name: 'Yellow' },
  { id: 'teal', color: '#14B8A6', name: 'Teal' },
  { id: 'indigo', color: '#6366F1', name: 'Indigo' },
];

export const TIMER_ICONS = [
  { id: 'clock', name: 'Clock', icon: 'Clock' },
  { id: 'target', name: 'Focus', icon: 'Target' },
  { id: 'coffee', name: 'Break', icon: 'Coffee' },
  { id: 'zap', name: 'Sprint', icon: 'Zap' },
  { id: 'book', name: 'Study', icon: 'Book' },
  { id: 'dumbbell', name: 'Exercise', icon: 'Dumbbell' },
  { id: 'heart', name: 'Wellness', icon: 'Heart' },
  { id: 'star', name: 'Priority', icon: 'Star' },
];

export const TIMER_PRESETS = [
  { name: 'Pomodoro', mins: 25, color: '#F97316', icon: 'Target' },
  { name: 'Short Break', mins: 5, color: '#10B981', icon: 'Coffee' },
  { name: 'Long Break', mins: 15, color: '#3B82F6', icon: 'Coffee' },
  { name: 'Deep Work', mins: 90, color: '#8B5CF6', icon: 'Zap' },
  { name: 'Quick Task', mins: 10, color: '#F59E0B', icon: 'Clock' },
  { name: 'Meeting', mins: 30, color: '#EC4899', icon: 'Clock' },
  { name: 'Exercise', mins: 45, color: '#EF4444', icon: 'Dumbbell' },
  { name: 'Reading', mins: 20, color: '#14B8A6', icon: 'Book' },
];
