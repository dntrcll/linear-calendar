import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth, provider } from "./firebase";
import { 
  collection, query, where, getDocs, addDoc, updateDoc, 
  deleteDoc, doc, serverTimestamp, Timestamp, orderBy
} from "firebase/firestore";
import { db } from "./firebase";

// ==========================================
// 1. SYSTEM CONFIGURATION & CONSTANTS
// ==========================================

const APP_META = { 
  name: "Timeline OS", 
  version: "8.1.0",
  quoteInterval: 14400000,
  author: "Timeline Systems",
  motto: "Time is the luxury you cannot buy."
};

const LAYOUT = {
  SIDEBAR_WIDTH: 380,
  HEADER_HEIGHT: 84,
  PIXELS_PER_MINUTE: 2.5,
  SNAP_MINUTES: 15,
  YEAR_COLS: 38,
  LINEAR_YEAR_DAY_WIDTH: 2.8,
  EVENT_HEIGHT: 56,
  ROW_GAP: 12,
  DAY_WIDTH: 1440 * 2.5
};

const MOTIVATIONAL_QUOTES = [
  "Every day is a fresh start.",
  "Small progress is still progress.",
  "You're doing better than you think.",
  "Focus on what you can control.",
  "One step at a time.",
  "Your future self will thank you.",
  "Make today count.",
  "Progress over perfection.",
  "You've got this.",
  "Consistency beats intensity.",
  "Trust the process.",
  "Your only limit is you.",
  "Dream big, start small.",
  "Do it with passion or not at all.",
  "Success is a journey, not a destination.",
  "Be the energy you want to attract.",
  "Believe you can and you're halfway there.",
  "The best time to start was yesterday. The next best time is now.",
  "Time is the luxury you cannot buy.",
  "Design your life, or someone else will.",
  "Focus on the rhythm, not the speed.",
  "Simplicity is the ultimate sophistication.",
  "Act as if what you do makes a difference.",
  "The best way to predict the future is to create it.",
  "Order is the sanity of the mind."
];

// ==========================================
// 2. DESIGN SYSTEM & LUXURY ASSETS
// ==========================================

const ICONS = {
  Settings: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.72l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
  Trash: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Plus: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  ChevronLeft: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevronRight: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Close: (props) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Calendar: (props) => <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Clock: (props) => <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  MapPin: (props) => <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Finance: (props) => <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Health: (props) => <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  Users: (props) => <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Briefcase: (props) => <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  Home: (props) => <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Star: (props) => <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  TrendingUp: (props) => <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  Bell: (props) => <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
};

const PALETTE = {
  onyx: { 
    bg: "linear-gradient(135deg, #27272a 0%, #18181b 100%)", 
    text: "#f4f4f5", 
    border: "#52525b", 
    color: "#71717a",
    colorLight: "#a1a1aa",
    darkBg: "linear-gradient(135deg, #0a0a0a 0%, #18181b 100%)"
  },
  ceramic: { 
    bg: "linear-gradient(135deg, #fafaf9 0%, #f5f5f4 100%)", 
    text: "#57534e", 
    border: "#d6d3d1", 
    color: "#78716c",
    colorLight: "#a8a29e",
    darkBg: "linear-gradient(135deg, #292524 0%, #1c1917 100%)"
  },
  gold: { 
    bg: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)", 
    text: "#78350f", 
    border: "#fbbf24", 
    color: "#f59e0b",
    colorLight: "#fbbf24",
    darkBg: "linear-gradient(135deg, #78350f 0%, #92400e 100%)"
  },
  emerald: { 
    bg: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)", 
    text: "#065f46", 
    border: "#34d399", 
    color: "#10b981",
    colorLight: "#6ee7b7",
    darkBg: "linear-gradient(135deg, #065f46 0%, #047857 100%)"
  },
  rose: { 
    bg: "linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)", 
    text: "#881337", 
    border: "#fb7185", 
    color: "#f43f5e",
    colorLight: "#fda4af",
    darkBg: "linear-gradient(135deg, #881337 0%, #9f1239 100%)"
  },
  midnight: { 
    bg: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)", 
    text: "#1e3a8a", 
    border: "#60a5fa", 
    color: "#3b82f6",
    colorLight: "#93c5fd",
    darkBg: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)"
  },
  lavender: { 
    bg: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)", 
    text: "#6b21a8", 
    border: "#c084fc", 
    color: "#a855f7",
    colorLight: "#d8b4fe",
    darkBg: "linear-gradient(135deg, #6b21a8 0%, #7c3aed 100%)"
  },
  clay: { 
    bg: "linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)", 
    text: "#9a3412", 
    border: "#fb923c", 
    color: "#f97316",
    colorLight: "#fdba74",
    darkBg: "linear-gradient(135deg, #9a3412 0%, #ea580c 100%)"
  },
  teal: {
    bg: "linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)",
    text: "#115e59",
    border: "#2dd4bf",
    color: "#14b8a6",
    colorLight: "#5eead4",
    darkBg: "linear-gradient(135deg, #115e59 0%, #0f766e 100%)"
  },
  amber: {
    bg: "linear-gradient(135deg, #fef08a 0%, #fde047 100%)",
    text: "#92400e",
    border: "#fbbf24",
    color: "#f59e0b",
    colorLight: "#fcd34d",
    darkBg: "linear-gradient(135deg, #92400e 0%, #b45309 100%)"
  }
};

const THEMES = {
  light: {
    id: 'light',
    bg: "#FFFFFF",
    sidebar: "#FAFAFA",
    card: "#FFFFFF",
    text: "#111827",
    textSec: "#4B5563",
    textMuted: "#9CA3AF",
    border: "#E5E7EB",
    borderLight: "#F3F4F6",
    accent: "#EA580C",
    accentHover: "#C2410C",
    familyAccent: "#059669",
    familyAccentHover: "#047857",
    selection: "rgba(234, 88, 12, 0.1)",
    shadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 8px 16px rgba(0, 0, 0, 0.06)",
    shadowLg: "0 4px 6px rgba(0, 0, 0, 0.05), 0 20px 40px rgba(0, 0, 0, 0.08)",
    glass: "rgba(255, 255, 255, 0.92)",
    indicator: "#DC2626",
    manifestoLine: "#E5E7EB",
    hoverBg: "rgba(0, 0, 0, 0.03)",
    activeBg: "rgba(0, 0, 0, 0.06)",
    pulse: "rgba(234, 88, 12, 0.2)",
    glow: "0 0 20px rgba(234, 88, 12, 0.3)"
  },
  dark: {
    id: 'dark',
    bg: "#0F172A",
    sidebar: "#1E293B",
    card: "#1E293B",
    text: "#F1F5F9",
    textSec: "#94A3B8",
    textMuted: "#64748B",
    border: "#334155",
    borderLight: "#1E293B",
    accent: "#F97316",
    accentHover: "#FB923C",
    familyAccent: "#10B981",
    familyAccentHover: "#34D399",
    selection: "rgba(249, 115, 22, 0.2)",
    shadow: "0 2px 8px rgba(0, 0, 0, 0.4), 0 12px 32px rgba(0, 0, 0, 0.6)",
    shadowLg: "0 8px 16px rgba(0, 0, 0, 0.6), 0 24px 48px rgba(0, 0, 0, 0.8)",
    glass: "rgba(15, 23, 42, 0.92)",
    indicator: "#EF4444",
    manifestoLine: "#334155",
    hoverBg: "rgba(255, 255, 255, 0.06)",
    activeBg: "rgba(255, 255, 255, 0.1)",
    pulse: "rgba(249, 115, 22, 0.3)",
    glow: "0 0 20px rgba(249, 115, 22, 0.4)"
  }
};

const DEFAULT_TAGS = {
  personal: [
    { id: 'work', name: "Business", icon: <ICONS.Briefcase />, ...PALETTE.onyx },
    { id: 'health', name: "Wellness", icon: <ICONS.Health />, ...PALETTE.rose },
    { id: 'finance', name: "Finance", icon: <ICONS.Finance />, ...PALETTE.emerald },
    { id: 'personal', name: "Personal", icon: <ICONS.Star />, ...PALETTE.midnight },
    { id: 'travel', name: "Travel", icon: <ICONS.MapPin />, ...PALETTE.lavender },
    { id: 'growth', name: "Growth", icon: <ICONS.TrendingUp />, ...PALETTE.gold }
  ],
  family: [
    { id: 'family-events', name: "Events", icon: <ICONS.Calendar />, ...PALETTE.midnight },
    { id: 'kids', name: "Kids", icon: <ICONS.Users />, ...PALETTE.lavender },
    { id: 'household', name: "Household", icon: <ICONS.Home />, ...PALETTE.clay },
    { id: 'vacation', name: "Vacation", icon: <ICONS.MapPin />, ...PALETTE.teal },
    { id: 'education', name: "Education", icon: <ICONS.Star />, ...PALETTE.amber },
    { id: 'healthcare', name: "Health", icon: <ICONS.Health />, ...PALETTE.emerald }
  ]
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@300;400;500;600;700&display=swap');
  
  :root {
    --ease: cubic-bezier(0.22, 1, 0.36, 1);
    --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    overflow: hidden;
  }
  
  h1, h2, h3, h4, .luxe {
    font-family: 'Cormorant Garamond', serif;
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  
  ::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.3);
    border-radius: 10px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.5);
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.8;
    }
  }
  
  @keyframes glow {
    0%, 100% {
      box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.2);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(234, 88, 12, 0.4);
    }
  }
  
  .fade-enter {
    animation: fadeIn 0.3s var(--ease) forwards;
  }
  
  .glass-panel {
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
  }
  
  .btn-reset {
    border: none;
    background: transparent;
    cursor: pointer;
    color: inherit;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s var(--ease);
  }
  
  .btn-hover:hover {
    transform: translateY(-1px);
  }
  
  .btn-hover:active {
    transform: translateY(0);
  }
  
  .input-luxe {
    width: 100%;
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 14px;
    transition: all 0.2s var(--ease);
    border: 1.5px solid;
    font-family: 'Inter', sans-serif;
    background: transparent;
  }
  
  .input-luxe:focus {
    outline: none;
  }
  
  .mini-cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    text-align: center;
    margin-top: 12px;
  }
  
  .mini-cal-day {
    font-size: 12px;
    padding: 10px 0;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s var(--ease);
    font-weight: 500;
    position: relative;
  }
  
  .year-event-dot {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s var(--ease);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
  
  .year-event-dot:hover {
    transform: scale(1.6);
    z-index: 10;
  }
`;

// ==========================================
// 3. MAIN APPLICATION KERNEL - FIXED VERSION
// ==========================================

export default function TimelineOS() {
  // Authentication & User State
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Date & Time State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [viewMode, setViewMode] = useState("year");
  
  // Context & Filtering
  const [context, setContext] = useState("personal");
  const [events, setEvents] = useState([]);
  const [deletedEvents, setDeletedEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  
  // Tags & Categories - FIXED: Use localStorage for persistence
  const [tags, setTags] = useState(() => {
    try {
      const saved = localStorage.getItem('timeline_tags_v4');
      return saved ? JSON.parse(saved) : DEFAULT_TAGS;
    } catch {
      return DEFAULT_TAGS;
    }
  });
  
  const [activeTagIds, setActiveTagIds] = useState(() => {
    const currentTags = tags[context] || [];
    return currentTags.map(t => t.id);
  });
  
  // UI State
  const [quote, setQuote] = useState(MOTIVATIONAL_QUOTES[0]);
  const [draggedEvent, setDraggedEvent] = useState(null);
  
  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  // Configuration
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('timeline_v5_cfg');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return {
      darkMode: true,
      use24Hour: false,
      blurPast: true,
      weekStartMon: true,
      showSidebar: true,
      showMotivationalQuotes: true,
      showUpcomingEvents: true,
      enableDragDrop: true,
      enableAnimations: true,
      enablePulseEffects: true
    };
  });
  
  // Refs
  const scrollRef = useRef(null);
  const theme = config.darkMode ? THEMES.dark : THEMES.light;
  const accentColor = context === 'family' ? theme.familyAccent : theme.accent;
  
  // Inject CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
  
  // Set up intervals
  useEffect(() => {
    const nowInterval = setInterval(() => setNow(new Date()), 60000);
    const quoteInterval = setInterval(() => {
      if (config.showMotivationalQuotes) {
        setQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
      }
    }, 10000);
    
    return () => {
      clearInterval(nowInterval);
      clearInterval(quoteInterval);
    };
  }, [config.showMotivationalQuotes]);
  
  // Authentication
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence);
    
    const unsubscribe = auth.onAuthStateChanged(u => {
      setUser(u);
      if (u) {
        loadData(u);
      } else {
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, []);
  
  // Persist configuration
  useEffect(() => {
    localStorage.setItem('timeline_v5_cfg', JSON.stringify(config));
  }, [config]);
  
  useEffect(() => {
    localStorage.setItem('timeline_tags_v4', JSON.stringify(tags));
  }, [tags]);
  
  // Update active tags when context changes
  useEffect(() => {
    const currentTags = tags[context] || [];
    setActiveTagIds(currentTags.map(t => t.id));
  }, [context, tags]);
  
  // Load events data - FIXED: Proper Firestore query
  const loadData = async (u) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "events"),
        where("uid", "==", u.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const eventsData = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        eventsData.push({
          id: doc.id,
          ...data,
          start: data.startTime?.toDate() || new Date(),
          end: data.endTime?.toDate() || new Date()
        });
      });
      
      setEvents(eventsData.filter(e => !e.deleted));
      setDeletedEvents(eventsData.filter(e => e.deleted));
      
    } catch (error) {
      console.error("Error loading events:", error);
      notify("Failed to load events", "error");
    } finally {
      setLoading(false);
    }
  };
  
  // Filter events - FIXED: Proper filtering logic
  useEffect(() => {
    const filtered = events.filter(e => {
      // Check if event has the correct context
      const matchesContext = e.context === context;
      
      // Check if event's category is in active tags
      const matchesCategory = activeTagIds.length === 0 || activeTagIds.includes(e.category);
      
      return matchesContext && matchesCategory && !e.deleted;
    });
    
    setFilteredEvents(filtered);
    
    // Update upcoming events (next 7 days)
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const upcoming = filtered
      .filter(e => e.start >= now && e.start <= nextWeek)
      .sort((a, b) => a.start - b.start)
      .slice(0, 5);
    
    setUpcomingEvents(upcoming);
  }, [events, context, activeTagIds]);
  
  // Save event - FIXED: Proper Firestore structure
  const handleSaveEvent = async (data) => {
    if (!user) {
      notify("You must be logged in to save events", "error");
      return;
    }
    
    try {
      const start = new Date(data.start);
      const end = new Date(data.end);
      
      // Validate dates
      if (end <= start) {
        notify("End time must be after start time", "error");
        return;
      }
      
      const eventData = {
        uid: user.uid,
        title: data.title.trim(),
        category: data.category,
        context: context,
        description: data.description?.trim() || "",
        location: data.location?.trim() || "",
        startTime: Timestamp.fromDate(start),
        endTime: Timestamp.fromDate(end),
        deleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      if (data.id) {
        // Update existing event
        await updateDoc(doc(db, "events", data.id), eventData);
        notify("Event updated successfully", "success");
      } else {
        // Create new event
        await addDoc(collection(db, "events"), eventData);
        notify("Event created successfully", "success");
      }
      
      setModalOpen(false);
      loadData(user); // Reload events
      
    } catch (error) {
      console.error("Error saving event:", error);
      notify("Failed to save event", "error");
    }
  };
  
  // Delete event
  const softDeleteEvent = async (id) => {
    if (!window.confirm("Move this event to trash?")) return;
    
    try {
      await updateDoc(doc(db, "events", id), {
        deleted: true,
        deletedAt: serverTimestamp()
      });
      
      setModalOpen(false);
      loadData(user);
      notify("Event moved to trash", "info");
    } catch (error) {
      notify("Failed to delete event", "error");
    }
  };
  
  // Restore event
  const restoreEvent = async (id) => {
    try {
      await updateDoc(doc(db, "events", id), { 
        deleted: false,
        updatedAt: serverTimestamp()
      });
      
      loadData(user);
      notify("Event restored", "success");
    } catch (error) {
      notify("Failed to restore event", "error");
    }
  };
  
  // Permanent delete
  const hardDeleteEvent = async (id) => {
    if (!window.confirm("Permanently delete this event?")) return;
    
    try {
      await deleteDoc(doc(db, "events", id));
      loadData(user);
      notify("Event permanently deleted", "info");
    } catch (error) {
      notify("Failed to delete event", "error");
    }
  };
  
  // Drag & Drop
  const handleEventDrag = async (eventId, newDate) => {
    if (!config.enableDragDrop) return;
    
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    
    const duration = event.end.getTime() - event.start.getTime();
    const newStart = new Date(newDate);
    newStart.setHours(event.start.getHours(), event.start.getMinutes());
    const newEnd = new Date(newStart.getTime() + duration);
    
    try {
      await updateDoc(doc(db, "events", eventId), {
        startTime: Timestamp.fromDate(newStart),
        endTime: Timestamp.fromDate(newEnd),
        updatedAt: serverTimestamp()
      });
      
      loadData(user);
      notify("Event moved successfully", "success");
    } catch (error) {
      notify("Failed to move event", "error");
    }
  };
  
  // Navigation
  const navigateDate = (amount) => {
    const newDate = new Date(currentDate);
    
    switch (viewMode) {
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + amount);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + amount);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (amount * 7));
        break;
      default: // day
        newDate.setDate(newDate.getDate() + amount);
    }
    
    setCurrentDate(newDate);
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Notification system
  const notify = (message, type = "info") => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };
  
  // Get current tags for context
  const currentTags = tags[context] || [];
  
  // Loading state
  if (loading && user) {
    return (
      <div style={{
        height: "100vh",
        background: theme.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: `3px solid ${theme.border}`,
          borderTopColor: accentColor,
          animation: "spin 1s linear infinite"
        }} />
      </div>
    );
  }
  
  // Auth screen
  if (!user) {
    return <AuthScreen onLogin={() => signInWithPopup(auth, provider)} theme={theme} />;
  }
  
  return (
    <div style={{
      display: "flex",
      height: "100vh",
      background: theme.bg,
      color: theme.text,
      fontFamily: "'Inter', sans-serif",
      overflow: "hidden"
    }}>
      {/* SIDEBAR */}
      {config.showSidebar && (
        <aside style={{
          width: LAYOUT.SIDEBAR_WIDTH,
          background: theme.sidebar,
          borderRight: `1px solid ${theme.border}`,
          display: "flex",
          flexDirection: "column",
          padding: "24px",
          overflow: "hidden"
        }}>
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <h1 className="luxe" style={{
              fontSize: 36,
              fontWeight: 700,
              color: theme.text,
              marginBottom: 8
            }}>
              Timeline.
            </h1>
            <div style={{
              fontSize: 14,
              color: theme.textSec,
              marginBottom: 8
            }}>
              Welcome, <span style={{ fontWeight: 600 }}>{user.displayName?.split(" ")[0]}</span>
            </div>
            {config.showMotivationalQuotes && (
              <div style={{
                fontSize: 13,
                color: theme.textMuted,
                fontStyle: "italic",
                lineHeight: 1.4
              }}>
                "{quote}"
              </div>
            )}
          </div>
          
          {/* Context Switcher */}
          <div style={{
            display: "flex",
            background: theme.borderLight,
            padding: 4,
            borderRadius: 12,
            marginBottom: 24
          }}>
            <button
              onClick={() => setContext('personal')}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                background: context === 'personal' ? theme.card : 'transparent',
                color: context === 'personal' ? theme.accent : theme.textSec,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Personal
            </button>
            <button
              onClick={() => setContext('family')}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                background: context === 'family' ? theme.card : 'transparent',
                color: context === 'family' ? theme.familyAccent : theme.textSec,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Family
            </button>
          </div>
          
          {/* New Event Button */}
          <button
            onClick={() => {
              setEditingEvent(null);
              setModalOpen(true);
            }}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 12,
              background: accentColor,
              color: "#fff",
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 24,
              transition: "all 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = context === 'family' ? theme.familyAccentHover : theme.accentHover}
            onMouseLeave={e => e.currentTarget.style.background = accentColor}
          >
            <ICONS.Plus /> New Event
          </button>
          
          {/* Mini Calendar */}
          <div style={{ marginBottom: 24 }}>
            <MiniCalendar
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              theme={theme}
              config={config}
              accentColor={accentColor}
            />
          </div>
          
          {/* Upcoming Events */}
          {config.showUpcomingEvents && upcomingEvents.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: theme.textMuted,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 12
              }}>
                Upcoming
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {upcomingEvents.map(event => {
                  const tag = currentTags.find(t => t.id === event.category) || currentTags[0];
                  return (
                    <div
                      key={event.id}
                      onClick={() => {
                        setEditingEvent(event);
                        setModalOpen(true);
                      }}
                      style={{
                        padding: "12px",
                        borderRadius: 8,
                        background: theme.hoverBg,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = theme.activeBg}
                      onMouseLeave={e => e.currentTarget.style.background = theme.hoverBg}
                    >
                      <div style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: theme.text,
                        marginBottom: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 8
                      }}>
                        <div style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: tag.color,
                          flexShrink: 0
                        }} />
                        {event.title}
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: theme.textSec,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginLeft: 16
                      }}>
                        {event.start.toLocaleDateString([], { month: 'short', day: 'numeric' })} • 
                        {event.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Tags */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: theme.textMuted,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span>Categories</span>
              <button
                onClick={() => setTagManagerOpen(true)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: theme.textSec,
                  cursor: "pointer",
                  padding: 4,
                  borderRadius: 6
                }}
              >
                <ICONS.Settings width={14} height={14} />
              </button>
            </div>
            
            <div style={{ height: "calc(100% - 24px)", overflowY: "auto" }}>
              {currentTags.map(tag => (
                <div
                  key={tag.id}
                  onClick={() => {
                    setActiveTagIds(prev =>
                      prev.includes(tag.id)
                        ? prev.filter(id => id !== tag.id)
                        : [...prev, tag.id]
                    );
                  }}
                  style={{
                    padding: "10px 12px",
                    marginBottom: 6,
                    borderRadius: 8,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: activeTagIds.includes(tag.id) ? theme.hoverBg : "transparent",
                    opacity: activeTagIds.includes(tag.id) ? 1 : 0.6,
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => {
                    if (!activeTagIds.includes(tag.id)) {
                      e.currentTarget.style.background = theme.hoverBg;
                      e.currentTarget.style.opacity = 0.8;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!activeTagIds.includes(tag.id)) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.opacity = 0.6;
                    }
                  }}
                >
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: tag.color,
                    flexShrink: 0
                  }} />
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    flex: 1
                  }}>
                    {tag.name}
                  </span>
                  <div style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: activeTagIds.includes(tag.id) ? tag.color : "transparent",
                    border: `2px solid ${theme.border}`
                  }} />
                </div>
              ))}
            </div>
          </div>
          
          {/* Footer */}
          <div style={{
            marginTop: 24,
            paddingTop: 24,
            borderTop: `1px solid ${theme.border}`,
            display: "flex",
            justifyContent: "space-between"
          }}>
            <button
              onClick={() => setTrashOpen(true)}
              style={{
                background: "transparent",
                border: "none",
                color: theme.textSec,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 8,
                transition: "all 0.2s"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = theme.hoverBg;
                e.currentTarget.style.color = theme.text;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = theme.textSec;
              }}
            >
              <ICONS.Trash width={14} height={14} /> Trash
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              style={{
                background: "transparent",
                border: "none",
                color: theme.textSec,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 8,
                transition: "all 0.2s"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = theme.hoverBg;
                e.currentTarget.style.color = theme.text;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = theme.textSec;
              }}
            >
              <ICONS.Settings width={14} height={14} /> Settings
            </button>
          </div>
        </aside>
      )}
      
      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <header style={{
          height: LAYOUT.HEADER_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          borderBottom: `1px solid ${theme.border}`,
          background: theme.bg,
          flexShrink: 0
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <h2 className="luxe" style={{ fontSize: 28, fontWeight: 600 }}>
              {viewMode === 'year' 
                ? currentDate.getFullYear()
                : viewMode === 'month'
                ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                : viewMode === 'week'
                ? `Week of ${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
              }
            </h2>
            
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => navigateDate(-1)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: `1px solid ${theme.border}`,
                  background: theme.hoverBg,
                  color: theme.text,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <ICONS.ChevronLeft />
              </button>
              
              <button
                onClick={goToToday}
                style={{
                  padding: "0 16px",
                  height: 36,
                  borderRadius: 18,
                  border: `1px solid ${theme.border}`,
                  background: theme.hoverBg,
                  color: theme.text,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Today
              </button>
              
              <button
                onClick={() => navigateDate(1)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: `1px solid ${theme.border}`,
                  background: theme.hoverBg,
                  color: theme.text,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <ICONS.ChevronRight />
              </button>
            </div>
          </div>
          
          {/* View Mode Selector */}
          <div style={{
            display: "flex",
            background: theme.borderLight,
            padding: 4,
            borderRadius: 12
          }}>
            {['day', 'week', 'month', 'year'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: viewMode === mode ? theme.card : "transparent",
                  color: viewMode === mode ? theme.text : theme.textSec,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "capitalize"
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </header>
        
        {/* Main View */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflow: "auto",
            padding: "24px",
            background: theme.bg
          }}
        >
          {loading ? (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: theme.textMuted
            }}>
              Loading events...
            </div>
          ) : viewMode === 'day' ? (
            <DayView
              currentDate={currentDate}
              events={filteredEvents}
              theme={theme}
              config={config}
              tags={currentTags}
              onEventClick={(event) => {
                setEditingEvent(event);
                setModalOpen(true);
              }}
            />
          ) : viewMode === 'week' ? (
            <WeekView
              currentDate={currentDate}
              events={filteredEvents}
              theme={theme}
              config={config}
              tags={currentTags}
              onEventClick={(event) => {
                setEditingEvent(event);
                setModalOpen(true);
              }}
            />
          ) : viewMode === 'month' ? (
            <MonthView
              currentDate={currentDate}
              events={filteredEvents}
              theme={theme}
              config={config}
              onDayClick={(date) => {
                setCurrentDate(date);
                setViewMode('day');
              }}
              onEventClick={(event) => {
                setEditingEvent(event);
                setModalOpen(true);
              }}
            />
          ) : viewMode === 'year' ? (
            <YearView
              currentDate={currentDate}
              events={filteredEvents}
              theme={theme}
              config={config}
              tags={currentTags}
              context={context}
              accentColor={accentColor}
              onDayClick={(date) => {
                setCurrentDate(date);
                setViewMode('day');
              }}
              onEventClick={(event) => {
                setEditingEvent(event);
                setModalOpen(true);
              }}
              onEventDrag={handleEventDrag}
              draggedEvent={draggedEvent}
              setDraggedEvent={setDraggedEvent}
            />
          ) : null}
        </div>
      </div>
      
      {/* MODALS */}
      {settingsOpen && (
        <SettingsModal
          config={config}
          setConfig={setConfig}
          theme={theme}
          onClose={() => setSettingsOpen(false)}
          user={user}
        />
      )}
      
      {modalOpen && (
        <EventEditor
          event={editingEvent}
          theme={theme}
          tags={currentTags}
          onSave={handleSaveEvent}
          onDelete={editingEvent?.id ? () => softDeleteEvent(editingEvent.id) : null}
          onCancel={() => setModalOpen(false)}
          config={config}
          context={context}
        />
      )}
      
      {trashOpen && (
        <TrashModal
          events={deletedEvents}
          theme={theme}
          onClose={() => setTrashOpen(false)}
          onRestore={restoreEvent}
          onDelete={hardDeleteEvent}
        />
      )}
      
      {tagManagerOpen && (
        <TagManager
          tags={tags}
          setTags={setTags}
          theme={theme}
          context={context}
          onClose={() => setTagManagerOpen(false)}
        />
      )}
      
      {/* Notifications */}
      <div style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: 8
      }}>
        {notifications.map(notification => (
          <div
            key={notification.id}
            className="fade-enter"
            style={{
              padding: "12px 20px",
              background: notification.type === 'error' 
                ? theme.indicator 
                : notification.type === 'success'
                ? theme.familyAccent
                : theme.card,
              color: notification.type === 'error' || notification.type === 'success' 
                ? "#fff" 
                : theme.text,
              borderRadius: 12,
              boxShadow: theme.shadowLg,
              fontSize: 14,
              fontWeight: 600,
              minWidth: 200
            }}
          >
            {notification.message}
          </div>
        ))}
      </div>
      
      {/* Toggle Sidebar Button */}
      {!config.showSidebar && (
        <button
          onClick={() => setConfig({ ...config, showSidebar: true })}
          style={{
            position: "fixed",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            background: accentColor,
            color: "#fff",
            padding: "12px 6px",
            border: "none",
            borderRadius: "0 8px 8px 0",
            cursor: "pointer",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <ICONS.ChevronRight />
        </button>
      )}
    </div>
  );
}

// ==========================================
// 4. SUB-COMPONENTS - FIXED VERSIONS
// ==========================================

function MiniCalendar({ currentDate, setCurrentDate, theme, config, accentColor }) {
  const today = new Date();
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  
  let startDay = startOfMonth.getDay();
  if (config.weekStartMon) {
    startDay = startDay === 0 ? 6 : startDay - 1;
  }
  
  const weekDays = config.weekStartMon 
    ? ["M", "T", "W", "T", "F", "S", "S"]
    : ["S", "M", "T", "W", "T", "F", "S"];
  
  return (
    <div>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12
      }}>
        <span style={{
          fontSize: 14,
          fontWeight: 600,
          color: theme.text
        }}>
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
            style={{
              background: "transparent",
              border: "none",
              color: theme.textSec,
              cursor: "pointer",
              padding: 4,
              borderRadius: 6
            }}
          >
            <ICONS.ChevronLeft width={16} height={16} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
            style={{
              background: "transparent",
              border: "none",
              color: theme.textSec,
              cursor: "pointer",
              padding: 4,
              borderRadius: 6
            }}
          >
            <ICONS.ChevronRight width={16} height={16} />
          </button>
        </div>
      </div>
      
      <div className="mini-cal-grid">
        {weekDays.map(day => (
          <div
            key={day}
            style={{
              fontSize: 11,
              color: theme.textMuted,
              fontWeight: 600,
              paddingBottom: 8
            }}
          >
            {day}
          </div>
        ))}
        
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const isToday = today.getDate() === day && 
                         today.getMonth() === currentDate.getMonth() && 
                         today.getFullYear() === currentDate.getFullYear();
          const isSelected = currentDate.getDate() === day;
          
          return (
            <div
              key={day}
              className="mini-cal-day"
              onClick={() => setCurrentDate(date)}
              style={{
                background: isSelected 
                  ? accentColor 
                  : isToday 
                  ? theme.selection 
                  : "transparent",
                color: isSelected 
                  ? "#fff" 
                  : isToday 
                  ? accentColor 
                  : theme.text,
                fontWeight: isSelected ? 700 : 500
              }}
            >
              {day}
              {isToday && config.enablePulseEffects && (
                <div style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: accentColor,
                  animation: "pulse 2s infinite"
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({ currentDate, events, theme, config, tags, onEventClick }) {
  const now = new Date();
  const isToday = currentDate.toDateString() === now.toDateString();
  
  return (
    <div style={{
      maxWidth: 800,
      margin: "0 auto",
      width: "100%"
    }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: theme.accent,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 8
        }}>
          {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
        </div>
        <h1 className="luxe" style={{
          fontSize: 48,
          fontWeight: 600,
          color: theme.text,
          marginBottom: 8
        }}>
          {currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        </h1>
        {isToday && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: theme.accent,
              animation: config.enablePulseEffects ? "pulse 2s infinite" : "none"
            }} />
            <div style={{
              fontSize: 14,
              color: theme.textSec,
              fontWeight: 600
            }}>
              Today • {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </div>
          </div>
        )}
      </div>
      
      <div style={{
        position: "relative",
        borderLeft: `2px solid ${theme.manifestoLine}`,
        paddingLeft: 40,
        minHeight: 600
      }}>
        {Array.from({ length: 24 }).map((_, hour) => {
          if (hour < 6) return null; // Start at 6 AM
          
          const hourStart = new Date(currentDate);
          hourStart.setHours(hour, 0, 0, 0);
          const hourEnd = new Date(hourStart);
          hourEnd.setHours(hour + 1, 0, 0, 0);
          
          const hourEvents = events.filter(event => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            return eventStart < hourEnd && eventEnd > hourStart;
          });
          
          return (
            <div
              key={hour}
              style={{
                minHeight: 80,
                position: "relative",
                marginBottom: 20
              }}
            >
              {/* Time label */}
              <div className="luxe" style={{
                position: "absolute",
                left: -40,
                top: -8,
                fontSize: 18,
                color: theme.textMuted,
                width: 30,
                textAlign: "right",
                fontWeight: 600
              }}>
                {config.use24Hour ? hour : (hour % 12 || 12)}
              </div>
              
              {/* Time marker */}
              <div style={{
                position: "absolute",
                left: -20,
                top: 4,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: theme.bg,
                border: `2px solid ${theme.textMuted}`,
                zIndex: 2
              }} />
              
              {/* Events for this hour */}
              <div style={{ position: "relative", zIndex: 1 }}>
                {hourEvents.map(event => {
                  const tag = tags.find(t => t.id === event.category) || tags[0];
                  const isPast = config.blurPast && event.end < now;
                  
                  return (
                    <div
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      style={{
                        marginBottom: 12,
                        cursor: "pointer",
                        background: config.darkMode ? tag.darkBg : tag.bg,
                        borderLeft: `3px solid ${tag.color}`,
                        padding: "16px 20px",
                        borderRadius: 10,
                        opacity: isPast ? 0.5 : 1,
                        boxShadow: theme.shadow,
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={e => {
                        if (!isPast) {
                          e.currentTarget.style.transform = "translateX(4px)";
                          e.currentTarget.style.boxShadow = theme.shadowLg;
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isPast) {
                          e.currentTarget.style.transform = "translateX(0)";
                          e.currentTarget.style.boxShadow = theme.shadow;
                        }
                      }}
                    >
                      <div style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: config.darkMode ? '#FAFAFA' : tag.text,
                        marginBottom: 4
                      }}>
                        {event.title}
                      </div>
                      <div style={{
                        display: "flex",
                        gap: 16,
                        fontSize: 13,
                        color: config.darkMode ? theme.textSec : tag.text,
                        alignItems: "center"
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ICONS.Clock width={12} height={12} />
                          {event.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – 
                          {event.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        {event.location && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ICONS.MapPin width={12} height={12} /> {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* Empty state */}
                {hourEvents.length === 0 && (
                  <div style={{ height: 60 }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ currentDate, events, theme, config, tags, onEventClick }) {
  const days = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - dayOfWeek + (config.weekStartMon ? (dayOfWeek === 0 ? -6 : 1) : 0);
    
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(diff + i);
      return day;
    });
  }, [currentDate, config.weekStartMon]);
  
  const now = new Date();
  const HOUR_HEIGHT = 60;
  
  return (
    <div style={{ display: "flex", height: "100%", overflow: "auto" }}>
      {/* Time column */}
      <div style={{
        width: 60,
        flexShrink: 0,
        borderRight: `1px solid ${theme.border}`,
        background: theme.sidebar,
        paddingTop: 60
      }}>
        {Array.from({ length: 24 }).map((_, hour) => (
          <div
            key={hour}
            style={{
              height: HOUR_HEIGHT,
              position: "relative"
            }}
          >
            <span style={{
              position: "absolute",
              top: -6,
              right: 8,
              fontSize: 11,
              color: theme.textMuted,
              fontWeight: 600
            }}>
              {config.use24Hour ? `${hour}:00` : `${hour % 12 || 12}${hour < 12 ? 'a' : 'p'}`}
            </span>
          </div>
        ))}
      </div>
      
      {/* Days columns */}
      <div style={{ flex: 1, display: "flex", overflow: "auto" }}>
        {days.map((day, dayIndex) => {
          const isToday = day.toDateString() === now.toDateString();
          const dayEvents = events.filter(event => 
            event.start.toDateString() === day.toDateString()
          );
          
          return (
            <div
              key={dayIndex}
              style={{
                flex: 1,
                minWidth: 160,
                borderRight: `1px solid ${theme.border}`,
                position: "relative",
                background: isToday ? theme.selection : "transparent"
              }}
            >
              {/* Day header */}
              <div style={{
                height: 60,
                borderBottom: `1px solid ${theme.border}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                position: "sticky",
                top: 0,
                background: theme.sidebar,
                zIndex: 10
              }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: isToday ? theme.accent : theme.textMuted,
                  marginBottom: 4
                }}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                </div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: isToday ? theme.accent : theme.text
                }}>
                  {day.getDate()}
                </div>
              </div>
              
              {/* Hours grid */}
              <div style={{
                position: "relative",
                height: 24 * HOUR_HEIGHT
              }}>
                {Array.from({ length: 24 }).map((_, hour) => (
                  <div
                    key={hour}
                    style={{
                      height: HOUR_HEIGHT,
                      borderBottom: `1px solid ${theme.borderLight}`
                    }}
                  />
                ))}
                
                {/* Events */}
                {dayEvents.map(event => {
                  const start = new Date(event.start);
                  const end = new Date(event.end);
                  const tag = tags.find(t => t.id === event.category) || tags[0];
                  
                  const top = (start.getHours() * 60 + start.getMinutes()) * (HOUR_HEIGHT / 60);
                  const height = Math.max(((end - start) / 60000) * (HOUR_HEIGHT / 60), 30);
                  
                  return (
                    <div
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      style={{
                        position: "absolute",
                        left: 4,
                        right: 4,
                        top: top,
                        height: height,
                        background: config.darkMode ? tag.darkBg : tag.bg,
                        borderLeft: `3px solid ${tag.color}`,
                        borderRadius: 8,
                        padding: "8px 10px",
                        overflow: "hidden",
                        cursor: "pointer",
                        zIndex: 5,
                        boxShadow: theme.shadow,
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "scale(1.02)";
                        e.currentTarget.style.zIndex = 20;
                        e.currentTarget.style.boxShadow = theme.shadowLg;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.zIndex = 5;
                        e.currentTarget.style.boxShadow = theme.shadow;
                      }}
                    >
                      <div style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: config.darkMode ? '#FAFAFA' : tag.text,
                        marginBottom: 2
                      }}>
                        {event.title}
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: config.darkMode ? theme.textSec : tag.text,
                        opacity: 0.9
                      }}>
                        {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthView({ currentDate, events, theme, config, onDayClick, onEventClick }) {
  const today = new Date();
  
  const getMonthDays = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    let startDay = firstDay.getDay();
    if (config.weekStartMon) {
      startDay = startDay === 0 ? 6 : startDay - 1;
    }
    
    const days = [];
    
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString()
      });
    }
    
    // Next month days
    const totalCells = 42; // 6 weeks
    const nextMonthDays = totalCells - days.length;
    for (let i = 1; i <= nextMonthDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false
      });
    }
    
    return days;
  }, [currentDate, today, config.weekStartMon]);
  
  const days = getMonthDays();
  const weekDays = config.weekStartMon 
    ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  const getDayEvents = (date) => {
    return events.filter(event => 
      event.start.toDateString() === date.toDateString()
    );
  };
  
  return (
    <div>
      {/* Weekday headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 4,
        marginBottom: 12,
        padding: "0 8px"
      }}>
        {weekDays.map(day => (
          <div
            key={day}
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: theme.textMuted,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              textAlign: "center",
              padding: "8px 0"
            }}
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 4
      }}>
        {days.map((day, index) => {
          const dayEvents = getDayEvents(day.date);
          const hasEvents = dayEvents.length > 0;
          
          return (
            <div
              key={index}
              onClick={() => day.isCurrentMonth && onDayClick(day.date)}
              style={{
                minHeight: 120,
                background: theme.card,
                borderRadius: 12,
                border: `1px solid ${theme.border}`,
                padding: 12,
                cursor: day.isCurrentMonth ? "pointer" : "default",
                opacity: day.isCurrentMonth ? 1 : 0.4,
                transition: "all 0.2s",
                position: "relative",
                overflow: "hidden"
              }}
              onMouseEnter={e => {
                if (day.isCurrentMonth) {
                  e.currentTarget.style.background = theme.hoverBg;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={e => {
                if (day.isCurrentMonth) {
                  e.currentTarget.style.background = theme.card;
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              {/* Day number */}
              <div style={{
                fontSize: 14,
                fontWeight: day.isToday ? 700 : 600,
                color: day.isToday ? theme.accent : theme.text,
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <span>{day.date.getDate()}</span>
                {day.isToday && (
                  <div style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: theme.accent,
                    animation: config.enablePulseEffects ? "pulse 2s infinite" : "none"
                  }} />
                )}
              </div>
              
              {/* Events */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: 6
              }}>
                {dayEvents.slice(0, 3).map((event, eventIndex) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    style={{
                      background: theme.selection,
                      padding: "6px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      color: theme.text,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = theme.activeBg;
                      e.currentTarget.style.transform = "translateX(2px)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = theme.selection;
                      e.currentTarget.style.transform = "translateX(0)";
                    }}
                  >
                    {event.title}
                  </div>
                ))}
                
                {dayEvents.length > 3 && (
                  <div style={{
                    fontSize: 10,
                    color: theme.textMuted,
                    fontWeight: 600,
                    paddingLeft: 4
                  }}>
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
              
              {/* Event indicator dots for small screens */}
              {hasEvents && window.innerWidth < 768 && (
                <div style={{
                  position: "absolute",
                  bottom: 8,
                  right: 8,
                  display: "flex",
                  gap: 2
                }}>
                  {Array.from({ length: Math.min(dayEvents.length, 3) }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: theme.accent,
                        opacity: 0.7
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearView({ currentDate, events, theme, config, tags, context, accentColor, onDayClick, onEventClick, onEventDrag, draggedEvent, setDraggedEvent }) {
  const year = currentDate.getFullYear();
  const today = new Date();
  
  // Initialize months grid
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthDate = new Date(year, i, 1);
    const monthEvents = events.filter(event => 
      event.start.getFullYear() === year && 
      event.start.getMonth() === i
    );
    
    // Group events by day
    const eventsByDay = {};
    monthEvents.forEach(event => {
      const day = event.start.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(event);
    });
    
    return {
      date: monthDate,
      name: monthDate.toLocaleDateString('en-US', { month: 'short' }),
      events: monthEvents,
      eventsByDay
    };
  });
  
  const handleDragStart = (event, e) => {
    e.preventDefault();
    setDraggedEvent(event);
  };
  
  const handleDayDrop = (dayDate) => {
    if (draggedEvent && onEventDrag) {
      onEventDrag(draggedEvent.id, dayDate);
      setDraggedEvent(null);
    }
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  
  return (
    <div style={{
      maxWidth: 1200,
      margin: "0 auto",
      width: "100%"
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 20
      }}>
        {months.map((month, monthIndex) => (
          <div
            key={monthIndex}
            style={{
              background: theme.card,
              borderRadius: 16,
              padding: 16,
              border: `1px solid ${theme.border}`,
              boxShadow: theme.shadow
            }}
          >
            {/* Month header */}
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              color: theme.text,
              marginBottom: 12,
              textAlign: "center"
            }}>
              {month.name}
            </div>
            
            {/* Mini calendar */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 2
            }}>
              {/* Weekday headers */}
              {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: theme.textMuted,
                    textAlign: "center",
                    padding: "2px 0"
                  }}
                >
                  {day}
                </div>
              ))}
              
              {/* Days */}
              {(() => {
                const firstDay = new Date(year, monthIndex, 1);
                const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
                let startDay = firstDay.getDay();
                
                if (config.weekStartMon) {
                  startDay = startDay === 0 ? 6 : startDay - 1;
                }
                
                const cells = [];
                
                // Empty cells for days before month start
                for (let i = 0; i < startDay; i++) {
                  cells.push(<div key={`empty-${i}`} />);
                }
                
                // Month days
                for (let day = 1; day <= daysInMonth; day++) {
                  const dayDate = new Date(year, monthIndex, day);
                  const isToday = today.toDateString() === dayDate.toDateString();
                  const dayEvents = month.eventsByDay[day] || [];
                  const dayHasEvents = dayEvents.length > 0;
                  
                  // Find primary event color for the day
                  let eventColor = null;
                  if (dayHasEvents) {
                    const primaryEvent = dayEvents[0];
                    const tag = tags.find(t => t.id === primaryEvent.category);
                    eventColor = tag ? tag.color : theme.accent;
                  }
                  
                  cells.push(
                    <div
                      key={day}
                      onClick={() => onDayClick(dayDate)}
                      onDrop={() => handleDayDrop(dayDate)}
                      onDragOver={handleDragOver}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: isToday ? theme.accent : 
                                  dayHasEvents ? eventColor + "20" : "transparent",
                        border: isToday ? `1px solid ${theme.accent}` : 
                               dayHasEvents ? `1px solid ${eventColor}40` : `1px solid ${theme.border}`,
                        color: isToday ? "#fff" : 
                               dayHasEvents ? eventColor : theme.text,
                        fontSize: 10,
                        fontWeight: isToday ? 700 : dayHasEvents ? 600 : 400,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        position: "relative",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = "scale(1.2)";
                        e.currentTarget.style.zIndex = 10;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.zIndex = 1;
                      }}
                    >
                      {day}
                      {dayHasEvents && (
                        <div
                          className="year-event-dot"
                          style={{
                            background: eventColor,
                            position: "absolute",
                            bottom: -3,
                            right: -3,
                            width: 4,
                            height: 4
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(dayEvents[0]);
                          }}
                        />
                      )}
                    </div>
                  );
                }
                
                return cells;
              })()}
            </div>
            
            {/* Month events summary */}
            {month.events.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: theme.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginBottom: 6
                }}>
                  Highlights
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {month.events.slice(0, 3).map(event => {
                    const tag = tags.find(t => t.id === event.category);
                    return (
                      <div
                        key={event.id}
                        draggable={config.enableDragDrop}
                        onDragStart={(e) => handleDragStart(event, e)}
                        onClick={() => onEventClick(event)}
                        style={{
                          background: theme.hoverBg,
                          padding: "6px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          color: theme.text,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          borderLeft: `3px solid ${tag?.color || theme.accent}`
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = "translateX(4px)";
                          e.currentTarget.style.background = theme.activeBg;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = "translateX(0)";
                          e.currentTarget.style.background = theme.hoverBg;
                        }}
                      >
                        <div style={{
                          fontSize: 9,
                          color: theme.textMuted,
                          minWidth: 24
                        }}>
                          {event.start.getDate()}
                        </div>
                        <div style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {event.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Year summary */}
      <div style={{
        marginTop: 40,
        background: theme.card,
        borderRadius: 16,
        padding: 24,
        border: `1px solid ${theme.border}`
      }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: theme.text,
          marginBottom: 16
        }}>
          {year} Summary
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16
        }}>
          <div style={{
            textAlign: "center",
            padding: 16,
            background: theme.hoverBg,
            borderRadius: 12
          }}>
            <div style={{
              fontSize: 24,
              fontWeight: 700,
              color: accentColor,
              marginBottom: 4
            }}>
              {events.length}
            </div>
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: theme.textMuted
            }}>
              Total Events
            </div>
          </div>
          <div style={{
            textAlign: "center",
            padding: 16,
            background: theme.hoverBg,
            borderRadius: 12
          }}>
            <div style={{
              fontSize: 24,
              fontWeight: 700,
              color: context === 'family' ? theme.familyAccent : theme.accent,
              marginBottom: 4
            }}>
              {new Set(events.map(e => e.category)).size}
            </div>
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: theme.textMuted
            }}>
              Categories Used
            </div>
          </div>
          <div style={{
            textAlign: "center",
            padding: 16,
            background: theme.hoverBg,
            borderRadius: 12
          }}>
            <div style={{
              fontSize: 24,
              fontWeight: 700,
              color: theme.familyAccent,
              marginBottom: 4
            }}>
              {new Set(events.filter(e => e.location).map(e => e.location)).size}
            </div>
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: theme.textMuted
            }}>
              Unique Locations
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. MODAL COMPONENTS
// ==========================================

function AuthScreen({ onLogin, theme }) {
  return (
    <div style={{
      height: "100vh",
      background: theme.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      padding: 40
    }}>
      <div style={{
        maxWidth: 400,
        width: "100%",
        textAlign: "center"
      }}>
        <h1 className="luxe" style={{
          fontSize: 48,
          fontWeight: 700,
          color: theme.text,
          marginBottom: 16
        }}>
          Timeline.
        </h1>
        <div style={{
          fontSize: 16,
          color: theme.textSec,
          marginBottom: 40,
          lineHeight: 1.6
        }}>
          Design your life with purpose. Every moment matters.
        </div>
        
        <button
          onClick={onLogin}
          style={{
            width: "100%",
            padding: "16px 24px",
            background: theme.accent,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
          onMouseEnter={e => e.currentTarget.style.background = theme.accentHover}
          onMouseLeave={e => e.currentTarget.style.background = theme.accent}
        >
          Sign in with Google
        </button>
        
        <div style={{
          marginTop: 40,
          fontSize: 13,
          color: theme.textMuted,
          padding: 20,
          background: theme.hoverBg,
          borderRadius: 12
        }}>
          "Time is the luxury you cannot buy."
          <div style={{ fontSize: 11, marginTop: 8 }}>
            – Timeline Systems
          </div>
        </div>
      </div>
    </div>
  );
}

function EventEditor({ event, theme, tags, onSave, onDelete, onCancel, config, context }) {
  const [form, setForm] = useState({
    title: event?.title || "",
    category: event?.category || (tags[0]?.id || ""),
    description: event?.description || "",
    location: event?.location || "",
    start: event?.start ? new Date(event.start) : new Date(),
    end: event?.end ? new Date(event.end) : new Date(Date.now() + 3600000)
  });
  
  const accentColor = context === 'family' ? theme.familyAccent : theme.accent;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };
  
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };
  
  const handleDateChange = (field, dateValue) => {
    const newDate = new Date(dateValue);
    setForm(prev => {
      const updated = { ...prev, [field]: newDate };
      
      // Ensure end time is after start time
      if (field === 'start' && updated.end <= newDate) {
        updated.end = new Date(newDate.getTime() + 3600000);
      } else if (field === 'end' && newDate <= updated.start) {
        updated.start = new Date(newDate.getTime() - 3600000);
      }
      
      return updated;
    });
  };
  
  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      backdropFilter: "blur(4px)"
    }}>
      <div style={{
        background: theme.card,
        borderRadius: 20,
        width: "100%",
        maxWidth: 500,
        maxHeight: "90vh",
        overflow: "auto",
        boxShadow: theme.shadowLg
      }}>
        <div style={{
          padding: 24,
          borderBottom: `1px solid ${theme.border}`
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20
          }}>
            <h2 className="luxe" style={{
              fontSize: 24,
              fontWeight: 600,
              color: theme.text
            }}>
              {event ? "Edit Event" : "New Event"}
            </h2>
            <button
              onClick={onCancel}
              style={{
                background: "transparent",
                border: "none",
                color: theme.textSec,
                cursor: "pointer",
                padding: 8,
                borderRadius: 8
              }}
            >
              <ICONS.Close />
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Title */}
              <div>
                <label style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: theme.text,
                  marginBottom: 8
                }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="input-luxe"
                  style={{
                    borderColor: theme.border,
                    color: theme.text,
                    background: theme.bg
                  }}
                  placeholder="What's happening?"
                  required
                />
              </div>
              
              {/* Category */}
              <div>
                <label style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: theme.text,
                  marginBottom: 8
                }}>
                  Category
                </label>
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8
                }}>
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleChange('category', tag.id)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: `2px solid ${form.category === tag.id ? tag.color : theme.border}`,
                        background: form.category === tag.id ? tag.bg : theme.bg,
                        color: form.category === tag.id ? tag.text : theme.text,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        transition: "all 0.2s"
                      }}
                    >
                      {tag.icon && React.cloneElement(tag.icon, { width: 12, height: 12 })}
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Dates */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: theme.text,
                    marginBottom: 8
                  }}>
                    Start
                  </label>
                  <input
                    type="datetime-local"
                    value={form.start.toISOString().slice(0, 16)}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    className="input-luxe"
                    style={{
                      borderColor: theme.border,
                      color: theme.text,
                      background: theme.bg
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: theme.text,
                    marginBottom: 8
                  }}>
                    End
                  </label>
                  <input
                    type="datetime-local"
                    value={form.end.toISOString().slice(0, 16)}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    className="input-luxe"
                    style={{
                      borderColor: theme.border,
                      color: theme.text,
                      background: theme.bg
                    }}
                    required
                  />
                </div>
              </div>
              
              {/* Location */}
              <div>
                <label style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: theme.text,
                  marginBottom: 8
                }}>
                  Location
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  className="input-luxe"
                  style={{
                    borderColor: theme.border,
                    color: theme.text,
                    background: theme.bg
                  }}
                  placeholder="Where is this happening?"
                />
              </div>
              
              {/* Description */}
              <div>
                <label style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: theme.text,
                  marginBottom: 8
                }}>
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="input-luxe"
                  style={{
                    borderColor: theme.border,
                    color: theme.text,
                    background: theme.bg,
                    minHeight: 80,
                    resize: "vertical"
                  }}
                  placeholder="Add details..."
                  rows={3}
                />
              </div>
            </div>
            
            {/* Actions */}
            <div style={{
              display: "flex",
              gap: 12,
              marginTop: 24
            }}>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: "14px",
                  background: accentColor,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = accentColor + "E0"}
                onMouseLeave={e => e.currentTarget.style.background = accentColor}
              >
                {event ? "Update Event" : "Create Event"}
              </button>
              
              {event && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  style={{
                    padding: "14px 20px",
                    background: theme.hoverBg,
                    color: theme.textSec,
                    border: "none",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = theme.indicator;
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = theme.hoverBg;
                    e.currentTarget.style.color = theme.textSec;
                  }}
                >
                  <ICONS.Trash width={16} height={16} />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ config, setConfig, theme, onClose, user }) {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      onClose();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };
  
  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      backdropFilter: "blur(4px)"
    }}>
      <div style={{
        background: theme.card,
        borderRadius: 20,
        width: "100%",
        maxWidth: 500,
        maxHeight: "90vh",
        overflow: "auto",
        boxShadow: theme.shadowLg
      }}>
        <div style={{
          padding: 24,
          borderBottom: `1px solid ${theme.border}`
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24
          }}>
            <h2 className="luxe" style={{
              fontSize: 24,
              fontWeight: 600,
              color: theme.text
            }}>
              Settings
            </h2>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: theme.textSec,
                cursor: "pointer",
                padding: 8,
                borderRadius: 8
              }}
            >
              <ICONS.Close />
            </button>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Theme Settings */}
            <div>
              <h3 style={{
                fontSize: 16,
                fontWeight: 600,
                color: theme.text,
                marginBottom: 16
              }}>
                Appearance
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: theme.hoverBg,
                  borderRadius: 10,
                  cursor: "pointer"
                }}>
                  <span style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: theme.text
                  }}>
                    Dark Mode
                  </span>
                  <div
                    onClick={() => setConfig({ ...config, darkMode: !config.darkMode })}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      background: config.darkMode ? theme.accent : theme.border,
                      position: "relative",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{
                      position: "absolute",
                      top: 2,
                      left: config.darkMode ? 22 : 2,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "#fff",
                      transition: "left 0.2s"
                    }} />
                  </div>
                </label>
              </div>
            </div>
            
            {/* Features */}
            <div>
              <h3 style={{
                fontSize: 16,
                fontWeight: 600,
                color: theme.text,
                marginBottom: 16
              }}>
                Features
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { key: 'showMotivationalQuotes', label: 'Show motivational quotes' },
                  { key: 'showUpcomingEvents', label: 'Show upcoming events' },
                  { key: 'enableDragDrop', label: 'Enable drag & drop' },
                  { key: 'enableAnimations', label: 'Enable animations' },
                  { key: 'enablePulseEffects', label: 'Enable pulse effects' },
                  { key: 'blurPast', label: 'Blur past events' },
                  { key: 'showSidebar', label: 'Show sidebar' }
                ].map(feature => (
                  <label
                    key={feature.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 0",
                      cursor: "pointer"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={config[feature.key]}
                      onChange={() => setConfig({ ...config, [feature.key]: !config[feature.key] })}
                      style={{
                        width: 18,
                        height: 18,
                        cursor: "pointer"
                      }}
                    />
                    <span style={{
                      fontSize: 14,
                      color: theme.text
                    }}>
                      {feature.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Account */}
            <div>
              <h3 style={{
                fontSize: 16,
                fontWeight: 600,
                color: theme.text,
                marginBottom: 16
              }}>
                Account
              </h3>
              <div style={{
                background: theme.hoverBg,
                padding: 16,
                borderRadius: 10,
                marginBottom: 16
              }}>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: theme.text,
                  marginBottom: 4
                }}>
                  {user?.displayName}
                </div>
                <div style={{
                  fontSize: 12,
                  color: theme.textSec
                }}>
                  {user?.email}
                </div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: theme.hoverBg,
                  color: theme.text,
                  border: "none",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = theme.activeBg;
                  e.currentTarget.style.color = theme.indicator;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = theme.hoverBg;
                  e.currentTarget.style.color = theme.text;
                }}
              >
                Sign Out
              </button>
            </div>
            
            {/* App Info */}
            <div style={{
              borderTop: `1px solid ${theme.border}`,
              paddingTop: 16
            }}>
              <div style={{
                fontSize: 11,
                color: theme.textMuted,
                textAlign: "center"
              }}>
                Timeline OS {APP_META.version} • {APP_META.author}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrashModal({ events, theme, onClose, onRestore, onDelete }) {
  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      backdropFilter: "blur(4px)"
    }}>
      <div style={{
        background: theme.card,
        borderRadius: 20,
        width: "100%",
        maxWidth: 600,
        maxHeight: "80vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: theme.shadowLg
      }}>
        {/* Header */}
        <div style={{
          padding: "24px 24px 16px 24px",
          borderBottom: `1px solid ${theme.border}`
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8
          }}>
            <h2 className="luxe" style={{
              fontSize: 24,
              fontWeight: 600,
              color: theme.text
            }}>
              Trash
            </h2>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: theme.textSec,
                cursor: "pointer",
                padding: 8,
                borderRadius: 8
              }}
            >
              <ICONS.Close />
            </button>
          </div>
          <div style={{
            fontSize: 13,
            color: theme.textSec
          }}>
            {events.length} deleted event{events.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        {/* Content */}
        <div style={{
          flex: 1,
          overflow: "auto",
          padding: 24
        }}>
          {events.length === 0 ? (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: 200,
              color: theme.textMuted
            }}>
              <ICONS.Trash width={48} height={48} style={{ opacity: 0.3, marginBottom: 16 }} />
              <div style={{ fontSize: 14 }}>
                Trash is empty
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {events.map(event => (
                <div
                  key={event.id}
                  style={{
                    background: theme.hoverBg,
                    borderRadius: 12,
                    padding: 16,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "all 0.2s"
                  }}
                >
                  <div>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: theme.text,
                      marginBottom: 4
                    }}>
                      {event.title}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: theme.textSec,
                      display: "flex",
                      gap: 12
                    }}>
                      <span>
                        {event.start.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span>
                        Deleted: {event.deletedAt?.toDate().toLocaleDateString() || 'Recently'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => onRestore(event.id)}
                      style={{
                        padding: "8px 12px",
                        background: theme.accent,
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = theme.accentHover}
                      onMouseLeave={e => e.currentTarget.style.background = theme.accent}
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => onDelete(event.id)}
                      style={{
                        padding: "8px 12px",
                        background: theme.hoverBg,
                        color: theme.indicator,
                        border: `1px solid ${theme.indicator}`,
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = theme.indicator;
                        e.currentTarget.style.color = "#fff";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = theme.hoverBg;
                        e.currentTarget.style.color = theme.indicator;
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div style={{
          padding: 16,
          borderTop: `1px solid ${theme.border}`,
          display: "flex",
          justifyContent: "flex-end"
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              background: theme.accent,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function TagManager({ tags, setTags, theme, context, onClose }) {
  const [localTags, setLocalTags] = useState(tags[context] || []);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PALETTE.onyx);
  
  const handleSave = () => {
    setTags(prev => ({
      ...prev,
      [context]: localTags
    }));
    onClose();
  };
  
  const handleAddTag = () => {
    if (!newTagName.trim()) return;
    
    const newTag = {
      id: `custom-${Date.now()}`,
      name: newTagName.trim(),
      ...selectedColor
    };
    
    setLocalTags([...localTags, newTag]);
    setNewTagName("");
  };
  
  const handleDeleteTag = (tagId) => {
    if (tagId.startsWith('custom-')) {
      setLocalTags(localTags.filter(tag => tag.id !== tagId));
    }
  };
  
  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      backdropFilter: "blur(4px)"
    }}>
      <div style={{
        background: theme.card,
        borderRadius: 20,
        width: "100%",
        maxWidth: 500,
        maxHeight: "80vh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: theme.shadowLg
      }}>
        {/* Header */}
        <div style={{
          padding: "24px 24px 16px 24px",
          borderBottom: `1px solid ${theme.border}`
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8
          }}>
            <h2 className="luxe" style={{
              fontSize: 24,
              fontWeight: 600,
              color: theme.text
            }}>
              Manage Categories
            </h2>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: theme.textSec,
                cursor: "pointer",
                padding: 8,
                borderRadius: 8
              }}
            >
              <ICONS.Close />
            </button>
          </div>
          <div style={{
            fontSize: 13,
            color: theme.textSec
          }}>
            {context === 'personal' ? 'Personal' : 'Family'} categories
          </div>
        </div>
        
        {/* Content */}
        <div style={{
          flex: 1,
          overflow: "auto",
          padding: 24
        }}>
          {/* Existing tags */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: theme.text,
              marginBottom: 12
            }}>
              Current Categories
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 12
            }}>
              {localTags.map(tag => (
                <div
                  key={tag.id}
                  style={{
                    background: tag.bg,
                    color: tag.text,
                    padding: "12px 16px",
                    borderRadius: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    border: `1px solid ${tag.border}`
                  }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                  }}>
                    <div style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: tag.color
                    }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {tag.name}
                    </span>
                  </div>
                  {tag.id.startsWith('custom-') && (
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: tag.text,
                        cursor: "pointer",
                        padding: 4,
                        borderRadius: 4,
                        opacity: 0.7
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
                    >
                      <ICONS.Trash width={14} height={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Add new tag */}
          <div>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: theme.text,
              marginBottom: 12
            }}>
              Add New Category
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="input-luxe"
                style={{
                  borderColor: theme.border,
                  color: theme.text,
                  background: theme.bg
                }}
                placeholder="Category name"
              />
              
              <div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: theme.text,
                  marginBottom: 8
                }}>
                  Color Theme
                </div>
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8
                }}>
                  {Object.entries(PALETTE).slice(0, 8).map(([name, color]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: color.bg,
                        border: `2px solid ${selectedColor.color === color.color ? color.color : 'transparent'}`,
                        cursor: "pointer"
                      }}
                      title={name.charAt(0).toUpperCase() + name.slice(1)}
                    />
                  ))}
                </div>
              </div>
              
              <button
                onClick={handleAddTag}
                style={{
                  padding: "12px",
                  background: theme.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  opacity: newTagName.trim() ? 1 : 0.5
                }}
                disabled={!newTagName.trim()}
                onMouseEnter={e => {
                  if (newTagName.trim()) {
                    e.currentTarget.style.background = theme.accentHover;
                  }
                }}
                onMouseLeave={e => {
                  if (newTagName.trim()) {
                    e.currentTarget.style.background = theme.accent;
                  }
                }}
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div style={{
          padding: 16,
          borderTop: `1px solid ${theme.border}`,
          display: "flex",
          justifyContent: "flex-end",
          gap: 12
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              background: theme.hoverBg,
              color: theme.text,
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "10px 20px",
              background: theme.accent,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}