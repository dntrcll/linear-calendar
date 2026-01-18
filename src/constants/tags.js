import { PALETTE } from './themes';

export const DEFAULT_TAGS = {
  personal: [
    { id: 'work', name: "Work", iconName: 'Briefcase', ...PALETTE.slate },
    { id: 'health', name: "Health", iconName: 'Health', ...PALETTE.rose },
    { id: 'finance', name: "Finance", iconName: 'Finance', ...PALETTE.emerald },
    { id: 'personal', name: "Personal", iconName: 'Star', ...PALETTE.blue },
    { id: 'travel', name: "Travel", iconName: 'MapPin', ...PALETTE.purple },
    { id: 'growth', name: "Growth", iconName: 'TrendingUp', ...PALETTE.amber }
  ],
  family: [
    { id: 'family-events', name: "Events", iconName: 'Calendar', ...PALETTE.blue },
    { id: 'kids', name: "Kids", iconName: 'Users', ...PALETTE.purple },
    { id: 'household', name: "Home", iconName: 'Home', ...PALETTE.orange },
    { id: 'vacation', name: "Vacation", iconName: 'MapPin', ...PALETTE.teal },
    { id: 'education', name: "Education", iconName: 'Star', ...PALETTE.amber },
    { id: 'healthcare', name: "Health", iconName: 'Health', ...PALETTE.emerald }
  ]
};
