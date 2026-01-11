import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  auth,
  GoogleAuthProvider,
  db,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp
} from "./firebase";
import './components/LinearCalendar.css';
import './App.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 40,
          background: "#0F172A",
          color: "#F1F5F9",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center"
        }}>
          <h1 style={{ fontSize: 24, marginBottom: 20 }}>Something went wrong</h1>
          <div style={{ 
            background: "#1E293B", 
            padding: 20, 
            borderRadius: 8,
            maxWidth: 600,
            marginBottom: 20
          }}>
            <pre style={{ 
              fontSize: 12, 
              color: "#EF4444",
              overflow: "auto",
              textAlign: "left"
            }}>
              {this.state.error && this.state.error.toString()}
            </pre>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 24px",
              background: "#F97316",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 600
            }}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const APP_META = { 
  name: "Timeline OS", 
  version: "9.0.0",
  quoteInterval: 14400000,
  author: "Timeline Systems",
  motto: "Time is the luxury you cannot buy."
};

const LAYOUT = {
  SIDEBAR_WIDTH: 340,
  HEADER_HEIGHT: 72,
  PIXELS_PER_MINUTE: 2.5,
  SNAP_MINUTES: 15,
  YEAR_COLS: 38,
  LINEAR_YEAR_DAY_WIDTH: 2.8,
  EVENT_HEIGHT: 56,
  ROW_GAP: 12,
  DAY_WIDTH: 1440 * 2.5,
  HOUR_HEIGHT: 60
};

const MOTIVATIONAL_QUOTES = [
  "Well done is better than well said.",
  "What you do today can improve all your tomorrows.",
  "Action is the foundational key to all success.",
  "The secret of getting ahead is getting started.",
  "If it is important to you, you will find a way.",
  "We become what we repeatedly do.",
  "Discipline is the bridge between goals and accomplishment.",
  "Success is not final, failure is not fatal.",
  "You miss 100% of the shots you don't take.",
  "Do what you can, with what you have, where you are.",
  "The future depends on what you do today.",
  "Start where you are. Use what you have.",
  "Energy and persistence conquer all things.",
  "Motivation gets you started. Habit keeps you going.",
  "The harder the conflict, the greater the triumph.",
  "Do not wait to strike till the iron is hot.",
  "Nothing will work unless you do.",
  "Make each day your masterpiece.",
  "Success usually comes to those who are too busy to look for it.",
  "It always seems impossible until it's done.",
  "If you're going through hell, keep going.",
  "The way to get started is to quit talking and begin doing.",
  "Without discipline, there's no life at all.",
  "A goal is a dream with a deadline.",
  "What we fear doing most is usually what we most need to do.",
  "Quality is not an act, it is a habit.",
  "Do one thing every day that scares you.",
  "The pain you feel today will be the strength you feel tomorrow.",
  "If you want something you've never had, do something new.",
  "The only way out is through.",
  "You become what you think about.",
  "Excellence is never an accident.",
  "Fortune favors the bold.",
  "The best revenge is massive success.",
  "He who has a why can endure any how.",
  "You don't rise to the level of your goals.",
  "The mind is everything. What you think you become.",
  "Act, don't react.",
  "Success is walking from failure to failure with no loss of enthusiasm.",
  "Do the work. Especially when you don't feel like it.",
  "Hard choices, easy life.",
  "Suffer the pain of discipline or regret.",
  "If not now, when?",
  "What gets measured gets managed.",
  "You are what you repeatedly do.",
  "The obstacle is the way.",
  "Don't wish it were easier; wish you were better.",
  "Waste no more time arguing what a good man should be.",
  "To improve is to change.",
  "First we form habits, then they form us.",
  "You don't get what you want. You get what you work for.",
  "Luck is what happens when preparation meets opportunity.",
  "An ounce of action is worth a ton of theory.",
  "Fall seven times, stand up eight.",
  "Do today what others won't.",
  "The man who moves a mountain begins by carrying stones.",
  "If you want peace, prepare for war.",
  "No pressure, no diamonds.",
  "Be strict with yourself.",
  "Work hard in silence.",
  "Success is built daily.",
  "Don't count the days, make the days count.",
  "Decide. Commit. Execute.",
  "A year from now you may wish you had started today.",
  "Comfort is the enemy of progress.",
  "Great things are done by a series of small things.",
  "Do what is hard now so life is easy later.",
  "You can't escape the responsibility of tomorrow.",
  "If you're tired of starting over, stop quitting.",
  "Discipline equals freedom.",
  "What consumes your mind controls your life.",
  "Don't negotiate with weakness.",
  "The price of discipline is always less than regret.",
  "Master yourself.",
  "Earn your confidence.",
  "Sweat more in training, bleed less in battle.",
  "Do the difficult things while they are easy.",
  "A man conquers the world by conquering himself.",
  "Small disciplines repeated daily create big results.",
  "Success demands singleness of purpose.",
  "Your habits determine your future.",
  "The best project you'll ever work on is you.",
  "If you don't sacrifice for your goal, your goal becomes the sacrifice.",
  "Nothing great was ever achieved without discipline.",
  "Win the morning, win the day.",
  "Control your mind or it will control you."
];

const ICONS = {
  Settings: (props) => (
    <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.72l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Trash: (props) => (
    <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  Plus: (props) => (
    <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  ChevronLeft: (props) => (
    <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  ChevronRight: (props) => (
    <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  Close: (props) => (
    <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Calendar: (props) => (
    <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Clock: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  MapPin: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Finance: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  Health: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  Users: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Briefcase: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  Home: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Star: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  TrendingUp: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  Bell: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  Tag: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  )
};

const PALETTE = {
  slate: { bg: "#F8FAFC", text: "#334155", border: "#E2E8F0", color: "#64748B" },
  stone: { bg: "#FAFAF9", text: "#44403C", border: "#E7E5E4", color: "#78716C" },
  blue: { bg: "#EFF6FF", text: "#1E40AF", border: "#DBEAFE", color: "#3B82F6" },
  indigo: { bg: "#EEF2FF", text: "#4338CA", border: "#E0E7FF", color: "#6366F1" },
  purple: { bg: "#FAF5FF", text: "#7C3AED", border: "#F3E8FF", color: "#A855F7" },
  pink: { bg: "#FDF2F8", text: "#BE185D", border: "#FCE7F3", color: "#EC4899" },
  rose: { bg: "#FFF1F2", text: "#BE123C", border: "#FFE4E6", color: "#F43F5E" },
  orange: { bg: "#FFF7ED", text: "#C2410C", border: "#FFEDD5", color: "#F97316" },
  amber: { bg: "#FFFBEB", text: "#B45309", border: "#FEF3C7", color: "#F59E0B" },
  emerald: { bg: "#ECFDF5", text: "#047857", border: "#D1FAE5", color: "#10B981" },
  teal: { bg: "#F0FDFA", text: "#115E59", border: "#CCFBF1", color: "#14B8A6" },
  cyan: { bg: "#ECFEFF", text: "#0E7490", border: "#CFFAFE", color: "#06B6D4" }
};

const THEMES = {
  light: {
    id: 'light',
    bg: "#FAFAFA",
    sidebar: "#FFFFFF",
    card: "#FFFFFF",
    text: "#0F172A",
    textSec: "#475569",
    textMuted: "#94A3B8",
    border: "#E2E8F0",
    borderLight: "#F1F5F9",
    accent: "#F97316",
    accentHover: "#EA580C",
    familyAccent: "#10B981",
    familyAccentHover: "#059669",
    selection: "rgba(249, 115, 22, 0.08)",
    shadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.04)",
    shadowLg: "0 4px 6px rgba(0,0,0,0.04), 0 10px 20px rgba(0,0,0,0.06)",
    glass: "rgba(255, 255, 255, 0.95)",
    indicator: "#EF4444",
    manifestoLine: "#E2E8F0",
    hoverBg: "rgba(0, 0, 0, 0.02)",
    activeBg: "rgba(0, 0, 0, 0.04)",
    pulse: "rgba(249, 115, 22, 0.15)",
    glow: "0 0 16px rgba(249, 115, 22, 0.2)"
  },
  dark: {
    id: 'dark',
    bg: "#0A0A0A",
    sidebar: "#111111",
    card: "#151515",
    text: "#FAFAFA",
    textSec: "#A1A1AA",
    textMuted: "#71717A",
    border: "#27272A",
    borderLight: "#18181B",
    accent: "#F97316",
    accentHover: "#FB923C",
    familyAccent: "#10B981",
    familyAccentHover: "#34D399",
    selection: "rgba(249, 115, 22, 0.15)",
    shadow: "0 2px 4px rgba(0, 0, 0, 0.3), 0 8px 16px rgba(0, 0, 0, 0.4)",
    shadowLg: "0 4px 8px rgba(0, 0, 0, 0.5), 0 16px 32px rgba(0, 0, 0, 0.6)",
    glass: "rgba(10, 10, 10, 0.95)",
    indicator: "#EF4444",
    manifestoLine: "#27272A",
    hoverBg: "rgba(255, 255, 255, 0.04)",
    activeBg: "rgba(255, 255, 255, 0.08)",
    pulse: "rgba(249, 115, 22, 0.2)",
    glow: "0 0 16px rgba(249, 115, 22, 0.3)"
  }
};

const DEFAULT_TAGS = {
  personal: [
    { id: 'work', name: "Work", icon: ICONS.Briefcase, ...PALETTE.slate },
    { id: 'health', name: "Health", icon: ICONS.Health, ...PALETTE.rose },
    { id: 'finance', name: "Finance", icon: ICONS.Finance, ...PALETTE.emerald },
    { id: 'personal', name: "Personal", icon: ICONS.Star, ...PALETTE.blue },
    { id: 'travel', name: "Travel", icon: ICONS.MapPin, ...PALETTE.purple },
    { id: 'growth', name: "Growth", icon: ICONS.TrendingUp, ...PALETTE.amber }
  ],
  family: [
    { id: 'family-events', name: "Events", icon: ICONS.Calendar, ...PALETTE.blue },
    { id: 'kids', name: "Kids", icon: ICONS.Users, ...PALETTE.purple },
    { id: 'household', name: "Home", icon: ICONS.Home, ...PALETTE.orange },
    { id: 'vacation', name: "Vacation", icon: ICONS.MapPin, ...PALETTE.teal },
    { id: 'education', name: "Education", icon: ICONS.Star, ...PALETTE.amber },
    { id: 'healthcare', name: "Health", icon: ICONS.Health, ...PALETTE.emerald }
  ]
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap');
  
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
  
  h1, h2, h3, h4, .serif {
    font-family: 'Playfair Display', serif;
    font-weight: 500;
    letter-spacing: -0.01em;
  }
  
  ::-webkit-scrollbar {
    width: 0;
    height: 0;
    background: transparent;
  }
  
  * {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .fade-enter {
    animation: fadeIn 0.3s var(--ease) forwards;
  }
`;

function TimelineOS() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState("year");
  const [context, setContext] = useState("personal");
  const [events, setEvents] = useState([]);
  const [deletedEvents, setDeletedEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [tags, setTags] = useState(() => {
    try {
      const saved = localStorage.getItem('timeline_tags_v4');
      return saved ? JSON.parse(saved) : DEFAULT_TAGS;
    } catch {
      return DEFAULT_TAGS;
    }
  });
  
  const getCurrentTags = () => tags[context] || [];
  
  const [activeTagIds, setActiveTagIds] = useState(() => {
    return getCurrentTags().map(t => t.id);
  });
  
  const [quote, setQuote] = useState(MOTIVATIONAL_QUOTES[0]);
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  const currentTags = getCurrentTags();
  
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
  
  const scrollRef = useRef(null);
  const theme = config.darkMode ? THEMES.dark : THEMES.light;
  const accentColor = context === 'family' ? theme.familyAccent : theme.accent;
  
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
  
  useEffect(() => {
    const nowInterval = setInterval(() => setCurrentDate(new Date()), 60000);
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
  
  const loadData = useCallback(async (u) => {
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
  }, []);
  
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
  }, [loadData]);
  
  useEffect(() => {
    localStorage.setItem('timeline_v5_cfg', JSON.stringify(config));
  }, [config]);
  
  useEffect(() => {
    localStorage.setItem('timeline_tags_v4', JSON.stringify(tags));
  }, [tags]);
  
  useEffect(() => {
    const currentTags = tags[context] || [];
    setActiveTagIds(currentTags.map(t => t.id));
  }, [context, tags]);
  
  useEffect(() => {
    const filtered = events.filter(e => {
      const matchesContext = e.context === context;
      const matchesCategory = activeTagIds.length === 0 || activeTagIds.includes(e.category);
      return matchesContext && matchesCategory && !e.deleted;
    });
    
    setFilteredEvents(filtered);
    
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const upcoming = filtered
      .filter(e => e.start >= now && e.start <= nextWeek)
      .sort((a, b) => a.start - b.start)
      .slice(0, 5);
    
    setUpcomingEvents(upcoming);
  }, [events, context, activeTagIds]);

  // Keyboard shortcut: Cmd/Ctrl + L to jump to today
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux) + L
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
        // Prevent default browser behavior (focusing address bar)
        e.preventDefault();
        setCurrentDate(new Date());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  const handleSaveEvent = async (data) => {
    if (!user) {
      notify("You must be logged in to save events", "error");
      return;
    }
    
    try {
      const start = new Date(data.start);
      const end = new Date(data.end);
      
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
        await updateDoc(doc(db, "events", data.id), eventData);
        notify("Event updated", "success");
      } else {
        await addDoc(collection(db, "events"), eventData);
        notify("Event created", "success");
      }
      
      setModalOpen(false);
      loadData(user);
      
    } catch (error) {
      console.error("Error saving event:", error);
      notify("Failed to save event", "error");
    }
  };
  
  const softDeleteEvent = async (id) => {
    if (!window.confirm("Move this event to trash?")) return;
    
    try {
      await updateDoc(doc(db, "events", id), {
        deleted: true,
        deletedAt: serverTimestamp()
      });
      
      setModalOpen(false);
      loadData(user);
      notify("Moved to trash", "info");
    } catch (error) {
      notify("Failed to delete event", "error");
    }
  };

  const handleEventDrag = useCallback(async (eventId, newStart, newEnd) => {
    if (!user) return;
    
    try {
      await updateDoc(doc(db, "events", eventId), {
        startTime: Timestamp.fromDate(newStart),
        endTime: Timestamp.fromDate(newEnd),
        updatedAt: serverTimestamp()
      });
      
      loadData(user);
      notify("Event rescheduled", "success");
    } catch (error) {
      console.error("Error rescheduling event:", error);
      notify("Failed to reschedule event", "error");
    }
  }, [user, loadData]);
  
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
  
  const hardDeleteEvent = async (id) => {
    if (!window.confirm("Permanently delete this event?")) return;
    
    try {
      await deleteDoc(doc(db, "events", id));
      loadData(user);
      notify("Permanently deleted", "info");
    } catch (error) {
      notify("Failed to delete event", "error");
    }
  };
  
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
      default:
        newDate.setDate(newDate.getDate() + amount);
    }
    
    setCurrentDate(new Date(newDate));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  const notify = (message, type = "info") => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };
  
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
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: `2px solid ${theme.border}`,
          borderTopColor: accentColor,
          animation: "spin 0.8s linear infinite"
        }} />
      </div>
    );
  }
  
  if (!user) {
    return <AuthScreen onLogin={() => signInWithPopup(auth, new GoogleAuthProvider())} theme={theme} />;
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
      {config.showSidebar && (
        <aside style={{
          width: LAYOUT.SIDEBAR_WIDTH,
          background: theme.sidebar,
          borderRight: `1px solid ${theme.border}`,
          display: "flex",
          flexDirection: "column",
          padding: "20px",
          overflow: "hidden"
        }}>
          <div style={{ marginBottom: 24 }}>
            <h1 className="serif" style={{
              fontSize: 28,
              fontWeight: 500,
              color: theme.text,
              marginBottom: 6
            }}>
              Timeline
            </h1>
            <div style={{
              fontSize: 13,
              color: theme.textSec,
              marginBottom: 6
            }}>
              {user.displayName?.split(" ")[0] || 'User'}
            </div>
            {config.showMotivationalQuotes && (
              <div style={{
                fontSize: 10,
                color: theme.textMuted,
                fontStyle: "italic",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}>
                "{quote}"
              </div>
            )}
          </div>
          
          <div style={{
            display: "flex",
            background: theme.borderLight,
            padding: 3,
            borderRadius: 10,
            marginBottom: 20
          }}>
            <button
              onClick={() => setContext('personal')}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 7,
                border: "none",
                background: context === 'personal' ? theme.card : 'transparent',
                color: context === 'personal' ? theme.accent : theme.textSec,
                fontWeight: 600,
                fontSize: 12,
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
                padding: "8px 12px",
                borderRadius: 7,
                border: "none",
                background: context === 'family' ? theme.card : 'transparent',
                color: context === 'family' ? theme.familyAccent : theme.textSec,
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Family
            </button>
          </div>
          
          <button
            onClick={() => {
              setEditingEvent(null);
              setModalOpen(true);
            }}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              background: accentColor,
              color: "#fff",
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginBottom: 20,
              transition: "all 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <ICONS.Plus width={16} height={16} /> New Event
          </button>
          
          <div style={{ marginBottom: 20 }}>
            <MiniCalendar
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              theme={theme}
              config={config}
              accentColor={accentColor}
            />
          </div>
          
          {config.showUpcomingEvents && upcomingEvents.length > 0 && (
            <div style={{ 
              marginBottom: 16,
              maxHeight: 160,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column"
            }}>
              <div style={{
                fontSize: 9,
                fontWeight: 700,
                color: theme.textMuted,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 8,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span>Upcoming</span>
              </div>
              <div style={{ 
                flex: 1,
                overflowY: "auto"
              }}>
                {upcomingEvents.map(event => {
                  const tag = currentTags.find(t => t.id === event.category) || currentTags[0];
                  const eventDate = new Date(event.start);
                  const isToday = eventDate.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={event.id}
                      onClick={() => {
                        setEditingEvent(event);
                        setModalOpen(true);
                      }}
                      style={{
                        padding: "7px 8px",
                        marginBottom: 5,
                        borderRadius: 6,
                        background: theme.hoverBg,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        borderLeft: `2px solid ${tag?.color || theme.accent}`
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = theme.activeBg;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = theme.hoverBg;
                      }}
                    >
                      <div style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: theme.text,
                        marginBottom: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {event.title || 'Untitled'}
                      </div>
                      <div style={{
                        fontSize: 9,
                        color: theme.textSec,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                      }}>
                        <span style={{
                          fontWeight: 600,
                          color: isToday ? theme.accent : theme.textSec
                        }}>
                          {isToday ? 'Today' : eventDate.toLocaleDateString([], { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                        <span>
                          {eventDate.toLocaleTimeString([], { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          <div style={{ 
            flex: 1, 
            overflow: "hidden",
            marginBottom: 20,
            display: "flex",
            flexDirection: "column"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10
            }}>
              <div style={{
                fontSize: 9,
                fontWeight: 700,
                color: theme.textMuted,
                textTransform: "uppercase",
                letterSpacing: 1
              }}>
                Categories
              </div>
              <button
                onClick={() => setTagManagerOpen(true)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: theme.textSec,
                  cursor: "pointer",
                  padding: "3px",
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.color = theme.text}
                onMouseLeave={e => e.currentTarget.style.color = theme.textSec}
              >
                <ICONS.Settings width={11} height={11} />
              </button>
            </div>
            
            <div style={{ 
              flex: 1,
              overflowY: "auto"
            }}>
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6
              }}>
                {currentTags.map(tag => {
                  const isActive = activeTagIds.includes(tag.id);
                  const IconComponent = tag.icon;
                  
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        setActiveTagIds(prev =>
                          prev.includes(tag.id)
                            ? prev.filter(id => id !== tag.id)
                            : [...prev, tag.id]
                        );
                      }}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 6,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        background: isActive ? tag.color + '15' : theme.hoverBg,
                        border: `1px solid ${isActive ? tag.color + '40' : theme.border}`,
                        transition: "all 0.2s",
                        fontSize: 10,
                        fontWeight: 600,
                        color: isActive ? tag.color : theme.textSec
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          e.currentTarget.style.background = theme.activeBg;
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          e.currentTarget.style.background = theme.hoverBg;
                        }
                      }}
                    >
                      {IconComponent && <IconComponent width={10} height={10} />}
                      {tag.name}
                    </button>
                  );
                })}
              </div>
              
              <div style={{
                display: "flex",
                gap: 6,
                marginTop: 10,
                paddingTop: 10,
                borderTop: `1px solid ${theme.borderLight}`
              }}>
                <button
                  onClick={() => {
                    const allTagIds = currentTags.map(t => t.id);
                    setActiveTagIds(activeTagIds.length === allTagIds.length ? [] : allTagIds);
                  }}
                  style={{
                    flex: 1,
                    padding: "5px",
                    borderRadius: 6,
                    border: `1px solid ${theme.border}`,
                    background: "transparent",
                    color: theme.textSec,
                    fontSize: 9,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = theme.hoverBg;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {activeTagIds.length === currentTags.length ? "Clear" : "All"}
                </button>
              </div>
            </div>
          </div>
          
          <div style={{
            marginTop: "auto",
            paddingTop: 16,
            borderTop: `1px solid ${theme.border}`,
            display: "flex",
            justifyContent: "space-between",
            gap: 8
          }}>
            <button
              onClick={() => setTrashOpen(true)}
              style={{
                background: "transparent",
                border: "none",
                color: theme.textSec,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 10px",
                borderRadius: 6,
                transition: "all 0.2s"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = theme.hoverBg;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <ICONS.Trash width={12} height={12} /> Trash
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              style={{
                background: "transparent",
                border: "none",
                color: theme.textSec,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 10px",
                borderRadius: 6,
                transition: "all 0.2s"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = theme.hoverBg;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <ICONS.Settings width={12} height={12} /> Settings
            </button>
          </div>
        </aside>
      )}
      
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{
          height: LAYOUT.HEADER_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          borderBottom: `1px solid ${theme.border}`,
          background: theme.bg,
          flexShrink: 0
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <h2 className="serif" style={{ 
              fontSize: 22, 
              fontWeight: 500
            }}>
              {viewMode === 'year' 
                ? currentDate.getFullYear()
                : viewMode === 'month'
                ? currentDate.toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                  })
                : viewMode === 'week'
                ? `Week of ${currentDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}`
                : currentDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric' 
                  })
              }
            </h2>
            
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => navigateDate(-1)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: `1px solid ${theme.border}`,
                  background: theme.card,
                  color: theme.text,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme.hoverBg}
                onMouseLeave={e => e.currentTarget.style.background = theme.card}
              >
                <ICONS.ChevronLeft width={16} height={16} />
              </button>
              
              <button
                onClick={goToToday}
                style={{
                  padding: "0 12px",
                  height: 30,
                  borderRadius: 15,
                  border: `1px solid ${theme.border}`,
                  background: theme.card,
                  color: theme.text,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme.hoverBg}
                onMouseLeave={e => e.currentTarget.style.background = theme.card}
              >
                Today
              </button>
              
              <button
                onClick={() => navigateDate(1)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: `1px solid ${theme.border}`,
                  background: theme.card,
                  color: theme.text,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme.hoverBg}
                onMouseLeave={e => e.currentTarget.style.background = theme.card}
              >
                <ICONS.ChevronRight width={16} height={16} />
              </button>
            </div>
          </div>
          
          <div style={{
            display: "flex",
            background: theme.borderLight,
            padding: 3,
            borderRadius: 10
          }}>
            {['day', 'week', 'month', 'year'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 7,
                  border: "none",
                  background: viewMode === mode ? theme.card : "transparent",
                  color: viewMode === mode ? theme.text : theme.textSec,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "capitalize",
                  transition: "all 0.2s"
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </header>
        
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflow: "auto",
            padding: "20px",
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
              Loading...
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
              onEventDrag={handleEventDrag}
              context={context}
              accentColor={accentColor}
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
            <LinearYearView
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
            />
          ) : null}
        </div>
      </div>
      
      {settingsOpen && (
        <SettingsModal
          config={config}
          setConfig={setConfig}
          theme={theme}
          onClose={() => setSettingsOpen(false)}
          user={user}
          handleLogout={async () => {
            try {
              await signOut(auth);
            } catch (error) {
              console.error("Error signing out:", error);
            }
          }}
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
      
      <div style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: 6
      }}>
        {notifications.map(notification => (
          <div
            key={notification.id}
            className="fade-enter"
            style={{
              padding: "10px 16px",
              background: notification.type === 'error' 
                ? theme.indicator 
                : notification.type === 'success'
                ? theme.familyAccent
                : theme.card,
              color: notification.type === 'error' || notification.type === 'success' 
                ? "#fff" 
                : theme.text,
              borderRadius: 8,
              boxShadow: theme.shadowLg,
              fontSize: 12,
              fontWeight: 600,
              minWidth: 180
            }}
          >
            {notification.message}
          </div>
        ))}
      </div>
      
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
            padding: "10px 5px",
            border: "none",
            borderRadius: "0 6px 6px 0",
            cursor: "pointer",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <ICONS.ChevronRight width={16} height={16} />
        </button>
      )}
    </div>
  );
}

function AuthScreen({ onLogin, theme }) {
  return (
    <div style={{
      height: "100vh",
      background: theme.bg,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      textAlign: "center"
    }}>
      <div style={{
        maxWidth: 380,
        width: "100%",
        background: theme.card,
        borderRadius: 16,
        padding: 40,
        boxShadow: theme.shadowLg
      }}>
        <h1 className="serif" style={{
          fontSize: 40,
          fontWeight: 500,
          color: theme.text,
          marginBottom: 12
        }}>
          Timeline
        </h1>
        
        <p style={{
          fontSize: 14,
          color: theme.textSec,
          marginBottom: 32,
          lineHeight: 1.5
        }}>
          Your personal operating system for time.
          <br />
          <span style={{ fontStyle: "italic", color: theme.textMuted, fontSize: 12 }}>
            "Time is the luxury you cannot buy."
          </span>
        </p>
        
        <button
          onClick={onLogin}
          style={{
            width: "100%",
            padding: "14px 20px",
            background: theme.accent,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
        
        <div style={{
          marginTop: 24,
          paddingTop: 24,
          borderTop: `1px solid ${theme.border}`
        }}>
          <div style={{
            fontSize: 10,
            color: theme.textMuted,
            lineHeight: 1.5
          }}>
            <div>Version {APP_META.version}</div>
            <div>© {new Date().getFullYear()} {APP_META.author}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
        marginBottom: 10
      }}>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: theme.text
        }}>
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <div style={{ display: "flex", gap: 3 }}>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
            style={{
              background: "transparent",
              border: "none",
              color: theme.textSec,
              cursor: "pointer",
              padding: 3,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.color = theme.text}
            onMouseLeave={e => e.currentTarget.style.color = theme.textSec}
          >
            <ICONS.ChevronLeft width={14} height={14} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
            style={{
              background: "transparent",
              border: "none",
              color: theme.textSec,
              cursor: "pointer",
              padding: 3,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => e.currentTarget.style.color = theme.text}
            onMouseLeave={e => e.currentTarget.style.color = theme.textSec}
          >
            <ICONS.ChevronRight width={14} height={14} />
          </button>
        </div>
      </div>
      
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 3,
        textAlign: "center"
      }}>
        {weekDays.map(day => (
          <div
            key={day}
            style={{
              fontSize: 9,
              color: theme.textMuted,
              fontWeight: 600,
              paddingBottom: 6
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
              onClick={() => setCurrentDate(date)}
              style={{
                fontSize: 10,
                padding: "6px 0",
                borderRadius: 6,
                cursor: "pointer",
                transition: "all 0.2s",
                fontWeight: isSelected ? 700 : 500,
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
                position: "relative"
              }}
              onMouseEnter={e => {
                if (!isSelected) {
                  e.currentTarget.style.background = theme.hoverBg;
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  e.currentTarget.style.background = isToday ? theme.selection : "transparent";
                }
              }}
            >
              {day}
              {isToday && config.enablePulseEffects && !isSelected && (
                <div style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  width: 3,
                  height: 3,
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

function DayView({ currentDate, events, theme, config, tags, onEventClick, onEventDrag, context, accentColor }) {
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropIndicator, setDropIndicator] = useState(null);
  const [isExtending, setIsExtending] = useState(false);
  
  const eventsColumnRef = useRef(null);
  const currentTime = new Date();
  const isToday = currentDate.toDateString() === currentTime.toDateString();
  
  const dayEvents = useMemo(() => {
    const filtered = events.filter(event => {
      if (!event?.start) return false;
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === currentDate.toDateString();
    });
    
    return filtered.sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [events, currentDate]);
  
  const HOUR_HEIGHT = 60;
  const START_HOUR = 0;
  const END_HOUR = 23;
  const TOTAL_HOURS = 24;
  
  const calculateEventPositions = useMemo(() => {
    const positions = [];
    const eventGroups = [];
    
    dayEvents.forEach(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
      const endMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();
      
      let placed = false;
      
      for (let group of eventGroups) {
        const overlaps = group.some(existing => {
          const existingStart = new Date(existing.event.start);
          const existingEnd = new Date(existing.event.end);
          const existingStartMinutes = existingStart.getHours() * 60 + existingStart.getMinutes();
          const existingEndMinutes = existingEnd.getHours() * 60 + existingEnd.getMinutes();
          
          return !(endMinutes <= existingStartMinutes || startMinutes >= existingEndMinutes);
        });
        
        if (!overlaps) {
          group.push({ event, startMinutes, endMinutes });
          placed = true;
          
          const groupSize = group.length;
          const groupIndex = group.findIndex(item => item.event.id === event.id);
          const widthPercentage = 100 / groupSize;
          const leftOffset = groupIndex * widthPercentage;
          
          positions.push({
            event,
            top: (startMinutes / 60) * HOUR_HEIGHT,
            height: Math.max(50, ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT),
            left: `${leftOffset}%`,
            width: `${widthPercentage}%`,
            groupIndex,
            groupSize,
            startTime: eventStart,
            endTime: eventEnd,
            durationMinutes: endMinutes - startMinutes
          });
          break;
        }
      }
      
      if (!placed) {
        const newGroup = [{ event, startMinutes, endMinutes }];
        eventGroups.push(newGroup);
        
        positions.push({
          event,
          top: (startMinutes / 60) * HOUR_HEIGHT,
          height: Math.max(50, ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT),
          left: '0%',
          width: '100%',
          groupIndex: 0,
          groupSize: 1,
          startTime: eventStart,
          endTime: eventEnd,
          durationMinutes: endMinutes - startMinutes
        });
      }
    });
    
    return positions;
  }, [dayEvents]);
  
  const handleTimelineClick = (e) => {
    if (isDragging || isExtending) return;
    
    const columnRect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY - columnRect.top;
    
    const totalMinutes = (mouseY / HOUR_HEIGHT) * 60;
    const targetHour = Math.floor(totalMinutes / 60);
    const targetMinute = Math.floor((totalMinutes % 60) / 15) * 15;
    
    const validHour = Math.max(START_HOUR, Math.min(END_HOUR, targetHour));
    const validMinute = Math.max(0, Math.min(45, targetMinute));
    
    const startTime = new Date(currentDate);
    startTime.setHours(validHour, validMinute, 0, 0);
    const endTime = new Date(startTime.getTime() + (60 * 60 * 1000));
    
    onEventClick({
      id: null,
      title: 'New Event',
      start: startTime,
      end: endTime,
      category: tags[0]?.id || '',
      context: context
    });
  };
  
  const handleMouseMove = (e) => {
    if (!eventsColumnRef.current || !isDragging || !draggedEvent) return;
    
    const columnRect = eventsColumnRef.current.getBoundingClientRect();
    const mouseY = Math.max(0, Math.min(columnRect.height, e.clientY - columnRect.top));
    
    const totalMinutes = (mouseY / HOUR_HEIGHT) * 60;
    const targetHour = Math.floor(totalMinutes / 60);
    const targetMinute = Math.floor((totalMinutes % 60) / 15) * 15;
    
    const validHour = Math.max(START_HOUR, Math.min(END_HOUR, targetHour));
    const validMinute = Math.max(0, Math.min(45, targetMinute));
    
    const eventStart = new Date(draggedEvent.start);
    const eventEnd = new Date(draggedEvent.end);
    
    let newStart, newEnd, duration;
    
    if (isExtending) {
      const newEndTime = new Date(currentDate);
      newEndTime.setHours(validHour, validMinute, 0, 0);
      
      if (newEndTime > eventStart) {
        newStart = eventStart;
        newEnd = newEndTime;
        duration = newEnd - newStart;
      } else {
        newStart = eventStart;
        newEnd = new Date(eventStart.getTime() + (15 * 60 * 1000));
        duration = 15 * 60 * 1000;
      }
    } else {
      duration = eventEnd - eventStart;
      
      newStart = new Date(currentDate);
      newStart.setHours(validHour, validMinute, 0, 0);
      
      newEnd = new Date(newStart.getTime() + duration);
    }
    
    const startMinutes = isExtending ? 
      (eventStart.getHours() * 60 + eventStart.getMinutes()) : 
      (validHour * 60 + validMinute);
    
    const endMinutes = isExtending ? 
      (validHour * 60 + validMinute) : 
      (startMinutes + (duration / (1000 * 60)));
    
    const topPosition = (startMinutes / 60) * HOUR_HEIGHT;
    const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;
    
    setDropIndicator({
      top: topPosition,
      height: Math.max(40, height),
      hour: validHour,
      minute: validMinute,
      isExtending: isExtending
    });
  };
  
  const handleMouseUp = () => {
    if (isDragging && draggedEvent && dropIndicator) {
      const { hour, minute, isExtending } = dropIndicator;
      const eventStart = new Date(draggedEvent.start);
      const eventEnd = new Date(draggedEvent.end);
      
      let newStart, newEnd;
      
      if (isExtending) {
        newStart = eventStart;
        newEnd = new Date(currentDate);
        newEnd.setHours(hour, minute, 0, 0);
        
        if (newEnd <= newStart) {
          newEnd = new Date(newStart.getTime() + (15 * 60 * 1000));
        }
      } else {
        const duration = eventEnd - eventStart;
        
        newStart = new Date(currentDate);
        newStart.setHours(hour, minute, 0, 0);
        
        newEnd = new Date(newStart.getTime() + duration);
      }
      
      if (newEnd > newStart && onEventDrag) {
        onEventDrag(draggedEvent.id, newStart, newEnd);
      }
    }
    
    resetState();
  };
  
  const handleEventMouseDown = (e, event) => {
    if (!config.enableDragDrop) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const totalHeight = rect.height;
    
    const isNearBottom = relativeY > totalHeight - 8;
    
    if (isNearBottom) {
      setDraggedEvent(event);
      setIsDragging(true);
      setIsExtending(true);
    } else {
      setDraggedEvent(event);
      setIsDragging(true);
      setIsExtending(false);
    }
  };
  
  const resetState = () => {
    setDraggedEvent(null);
    setIsDragging(false);
    setIsExtending(false);
    setDropIndicator(null);
  };
  
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div style={{
      maxWidth: 900,
      margin: "0 auto",
      width: "100%",
      userSelect: 'none'
    }}>
      
      <div style={{ 
        marginBottom: 24,
        padding: '0 6px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          marginBottom: 6
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: accentColor,
            textTransform: "uppercase",
            letterSpacing: 1.5,
            opacity: 0.9
          }}>
            {currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}
          </div>
          
          {isToday && (
            <div style={{
              fontSize: 9,
              fontWeight: 700,
              color: accentColor,
              background: `${accentColor}10`,
              padding: '2px 7px',
              borderRadius: 10,
              letterSpacing: 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: 3
            }}>
              <div style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: accentColor,
                animation: config.enablePulseEffects ? "pulse 2s infinite" : "none"
              }} />
              TODAY
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <div className="serif" style={{
            fontSize: 40,
            fontWeight: 400,
            color: theme.text,
            lineHeight: 1,
            letterSpacing: '-0.5px'
          }}>
            {currentDate.getDate()}
          </div>
          <div style={{ 
            paddingBottom: 4,
            borderBottom: `1px solid ${accentColor}30`
          }}>
            <div className="serif" style={{
              fontSize: 16,
              fontWeight: 400,
              color: theme.text,
              lineHeight: 1.2,
              letterSpacing: '0.3px'
            }}>
              {currentDate.toLocaleDateString('en-US', { month: 'long' })}
            </div>
            <div style={{
              fontSize: 11,
              fontWeight: 500,
              color: theme.textSec,
              lineHeight: 1.2,
              opacity: 0.7,
              letterSpacing: '0.2px'
            }}>
              {currentDate.getFullYear()}
            </div>
          </div>
        </div>
        
        {isToday && (
          <div style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: accentColor,
              animation: config.enablePulseEffects ? "pulse 1.5s infinite" : "none",
              boxShadow: `0 0 0 3px ${accentColor}15`
            }} />
            <div style={{
              fontSize: 11,
              color: theme.textSec,
              fontWeight: 600,
              letterSpacing: '0.2px'
            }}>
              {currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </div>
          </div>
        )}
      </div>
      
      <div style={{
        display: "flex",
        background: theme.card,
        borderRadius: 12,
        border: `1px solid ${theme.border}`,
        boxShadow: theme.shadow,
        overflow: "hidden",
        position: 'relative'
      }}>
        
        <div style={{
          width: 70,
          flexShrink: 0,
          borderRight: `1px solid ${theme.border}`,
          background: theme.sidebar,
          position: 'relative'
        }}>
          {Array.from({ length: TOTAL_HOURS }).map((_, hour) => {
            const isMajorHour = hour % 3 === 0;
            
            return (
              <div
                key={`hour-${hour}`}
                style={{
                  height: HOUR_HEIGHT,
                  borderBottom: `1px solid ${theme.borderLight}`,
                  position: 'relative',
                  padding: '0 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end'
                }}
              >
                <div style={{
                  fontSize: 10,
                  fontWeight: isMajorHour ? 600 : 500,
                  color: isMajorHour ? theme.text : theme.textMuted,
                  letterSpacing: '0.3px'
                }}>
                  {config.use24Hour 
                    ? `${hour.toString().padStart(2, '0')}:00`
                    : `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`
                  }
                </div>
              </div>
            );
          })}
        </div>
        
        <div 
          ref={eventsColumnRef}
          onClick={handleTimelineClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={resetState}
          style={{
            flex: 1,
            position: "relative",
            minHeight: TOTAL_HOURS * HOUR_HEIGHT,
            cursor: isDragging || isExtending ? 
                   (isExtending ? 'ns-resize' : 'grabbing') : 
                   'crosshair',
            background: theme.card
          }}
        >
          
          {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
            <div
              key={`line-${i}`}
              style={{
                position: "absolute",
                top: i * HOUR_HEIGHT,
                left: 0,
                right: 0,
                height: 1,
                background: theme.borderLight,
                opacity: 0.2
              }}
            />
          ))}
          
          {Array.from({ length: TOTAL_HOURS / 3 }).map((_, i) => (
            <div
              key={`sep-${i}`}
              style={{
                position: "absolute",
                top: i * 3 * HOUR_HEIGHT,
                left: 0,
                right: 0,
                height: 1,
                background: theme.border,
                opacity: 0.3
              }}
            />
          ))}
          
          {isToday && (() => {
            const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
            const topPosition = (currentMinutes / 60) * HOUR_HEIGHT;
            
            if (topPosition >= 0 && topPosition <= TOTAL_HOURS * HOUR_HEIGHT) {
              return (
                <>
                  <div style={{
                    position: "absolute",
                    top: topPosition,
                    left: 0,
                    right: 0,
                    height: 1.5,
                    background: accentColor,
                    zIndex: 8,
                    pointerEvents: "none",
                    boxShadow: `0 0 0 1px ${theme.card}`
                  }} />
                  <div style={{
                    position: "absolute",
                    left: -6,
                    top: topPosition - 4,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: accentColor,
                    border: `1.5px solid ${theme.card}`,
                    zIndex: 9,
                    pointerEvents: "none"
                  }} />
                </>
              );
            }
          })()}
          
          {dropIndicator && (
            <div
              style={{
                position: "absolute",
                top: dropIndicator.top,
                left: 6,
                right: 6,
                height: dropIndicator.height,
                background: isExtending 
                  ? `${accentColor}15` 
                  : `${accentColor}10`,
                border: `1.5px dashed ${accentColor}`,
                borderRadius: 8,
                pointerEvents: "none",
                zIndex: 10
              }}
            />
          )}
          
          {calculateEventPositions.map((pos) => {
            const { event, top, height, left, width, groupSize } = pos;
            const tag = tags.find(t => t.id === event.category) || tags[0] || {};
            const isDragged = draggedEvent?.id === event.id;
            const isShortEvent = height < 60;
            
            return (
              <div
                key={event.id}
                onMouseDown={(e) => handleEventMouseDown(e, event)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isDragging && !isExtending) {
                    onEventClick(event);
                  }
                }}
                style={{
                  position: "absolute",
                  top: top,
                  left: left,
                  width: `calc(${width} - 12px)`,
                  height: Math.max(50, height),
                  background: config.darkMode 
                    ? `${tag.color}15`
                    : `${tag.color}08`,
                  borderLeft: `3px solid ${tag.color}`,
                  borderRadius: 8,
                  padding: isShortEvent ? "6px 8px" : "8px 10px",
                  cursor: 'pointer',
                  opacity: isDragged ? 0.3 : 1,
                  boxShadow: isDragged ? 'none' : theme.shadow,
                  transition: 'all 0.2s',
                  overflow: "hidden",
                  zIndex: isDragged ? 1 : (groupSize > 1 ? 2 : 1),
                  userSelect: 'none',
                  border: `1px solid ${config.darkMode ? `${tag.color}25` : `${tag.color}12`}`,
                  display: 'flex',
                  flexDirection: 'column',
                  margin: '0 6px'
                }}
                onMouseEnter={(e) => {
                  if (!isDragged && !isDragging) {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = theme.shadowLg;
                    e.currentTarget.style.zIndex = 20;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDragged && !isDragging) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = theme.shadow;
                    e.currentTarget.style.zIndex = (groupSize > 1 ? 2 : 1);
                  }
                }}>
                  <div style={{
                    display: 'flex',
alignItems: 'flex-start',
marginBottom: isShortEvent ? 3 : 5
}}>
<div style={{
fontSize: isShortEvent ? 11 : 12,
fontWeight: 600,
color: theme.text,
lineHeight: 1.2,
flex: 1,
overflow: 'hidden',
textOverflow: 'ellipsis',
whiteSpace: isShortEvent ? 'nowrap' : 'normal',
display: '-webkit-box',
WebkitLineClamp: isShortEvent ? 1 : 2,
WebkitBoxOrient: 'vertical'
}}>
{event.title || 'Event'}
</div>
</div>
            {!isShortEvent && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                marginBottom: 5
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 4, 
                  fontWeight: 500,
                  fontSize: 10,
                  color: theme.textSec,
                  opacity: 0.9
                }}>
                  <ICONS.Clock width={9} height={9} />
                  {formatTime(pos.startTime)} – {formatTime(pos.endTime)}
                </div>
              </div>
            )}
            
            {!isShortEvent && event.location && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                marginBottom: 5
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 4, 
                  fontWeight: 500,
                  fontSize: 9,
                  color: theme.textSec,
                  opacity: 0.8
                }}>
                  <ICONS.MapPin width={8} height={8} />
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {event.location}
                  </span>
                </div>
              </div>
            )}
            
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              background: `${tag.color}${config.darkMode ? '25' : '12'}`,
              padding: isShortEvent ? '2px 5px' : '3px 6px',
              borderRadius: 4,
              fontSize: isShortEvent ? 8 : 9,
              fontWeight: 600,
              color: tag.color,
              width: 'fit-content',
              lineHeight: 1,
              letterSpacing: '0.1px',
              marginTop: 'auto',
              border: `1px solid ${tag.color}${config.darkMode ? '35' : '20'}`
            }}>
              {tag.icon && <tag.icon width={isShortEvent ? 7 : 8} height={isShortEvent ? 7 : 8} />}
              <span style={{ 
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: isShortEvent ? '40px' : '70px'
              }}>
                {tag.name}
              </span>
            </div>
            
            {config.enableDragDrop && !isShortEvent && (
              <div 
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 5,
                  cursor: 'ns-resize',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  zIndex: 2
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.background = `${tag.color}30`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0';
                }}
              />
            )}
          </div>
        );
      })}
      
      {dayEvents.length === 0 && !isDragging && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: theme.textMuted,
          pointerEvents: 'none',
          padding: '0 16px'
        }}>
          <div style={{ 
            fontSize: 36, 
            marginBottom: 10, 
            opacity: 0.08
          }}>
            📅
          </div>
          <div style={{ 
            fontSize: 14, 
            fontWeight: 500, 
            marginBottom: 6,
            color: theme.textSec
          }}>
            No events
          </div>
          <div style={{ 
            fontSize: 11, 
            opacity: 0.6
          }}>
            Click to add
          </div>
        </div>
      )}
    </div>
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
const HOUR_HEIGHT = 50;
const TOTAL_HOURS = 24;
const eventsByDay = useMemo(() => {
const grouped = {};
days.forEach(day => {
const dayStr = day.toDateString();
grouped[dayStr] = events.filter(event =>
event?.start && new Date(event.start).toDateString() === dayStr
);
});
return grouped;
}, [events, days]);
return (
<div style={{
display: "flex",
height: "100%",
overflow: "auto"
}}>
<div style={{
width: 60,
flexShrink: 0,
borderRight: `1px solid ${theme.border}`,
background: theme.sidebar,
paddingTop: 36,
position: "sticky",
left: 0,
zIndex: 5
}}>
{Array.from({ length: TOTAL_HOURS }).map((_, hour) => (
<div
key={hour}
style={{
height: HOUR_HEIGHT,
display: "flex",
alignItems: "flex-start",
justifyContent: "flex-end",
paddingRight: 8,
paddingTop: 6,
borderBottom: `1px solid ${theme.borderLight}`,
position: "relative"
}}
>
<span style={{
fontSize: 9,
color: theme.textMuted,
fontWeight: 500,
position: "relative",
top: -6
}}>
{config.use24Hour 
  ? `${hour.toString().padStart(2, '0')}:00`
  : `${hour % 12 || 12}${hour < 12 ? 'a' : 'p'}`
}
</span>
</div>
))}
</div>
  <div style={{ 
    flex: 1, 
    display: "flex",
    minWidth: "fit-content"
  }}>
    {days.map((day, index) => {
      const dayStr = day.toDateString();
      const isToday = day.toDateString() === new Date().toDateString();
      const dayEvents = eventsByDay[dayStr] || [];
      
      return (
        <div
          key={index}
          style={{
            flex: 1,
            minWidth: 100,
            borderRight: index < 6 ? `1px solid ${theme.border}` : "none",
            position: "relative",
            paddingTop: 36
          }}
        >
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 36,
            padding: "6px 8px",
            background: theme.sidebar,
            borderBottom: `1px solid ${theme.border}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 4
          }}>
            <div style={{
              fontSize: 9,
              fontWeight: 700,
              color: isToday ? theme.accent : theme.textMuted,
              textTransform: "uppercase",
              letterSpacing: 0.8
            }}>
              {day.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 600,
              color: isToday ? theme.accent : theme.text,
              marginTop: 2
            }}>
              {day.getDate()}
            </div>
          </div>

          <div style={{ 
            position: "relative",
            height: HOUR_HEIGHT * TOTAL_HOURS
          }}>
            {Array.from({ length: TOTAL_HOURS }).map((_, hour) => (
              <div
                key={hour}
                style={{
                  position: "absolute",
                  top: hour * HOUR_HEIGHT,
                  left: 0,
                  right: 0,
                  height: 1,
                  background: theme.borderLight,
                  opacity: 0.2
                }}
              />
            ))}
            
            {isToday && (() => {
              const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
              const topPosition = (currentMinutes / 60) * HOUR_HEIGHT;
              
              return (
                <div style={{
                  position: "absolute",
                  top: topPosition,
                  left: 0,
                  right: 0,
                  height: 1.5,
                  background: theme.accent,
                  zIndex: 3,
                  pointerEvents: "none"
                }}>
                  <div style={{
                    position: "absolute",
                    left: -3,
                    top: -2.5,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: theme.accent
                  }} />
                </div>
              );
            })()}
            
            {dayEvents.map(event => {
              const tag = tags.find(t => t.id === event.category) || tags[0] || {};
              const eventStart = new Date(event.start);
              const eventEnd = new Date(event.end);
              const startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
              const endMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();
              
              const top = (startMinutes / 60) * HOUR_HEIGHT;
              const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;
              
              const isShortEvent = height < 25;
              
              return (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  style={{
                    position: "absolute",
                    top: `${top}px`,
                    left: "3px",
                    right: "3px",
                    height: `${Math.max(height, 20)}px`,
                    background: config.darkMode 
                      ? `${tag.color}20`
                      : `${tag.color}10`,
                    borderLeft: `2px solid ${tag.color}`,
                    borderRadius: 5,
                    padding: isShortEvent ? "2px 5px" : "5px 6px",
                    cursor: "pointer",
                    overflow: "hidden",
                    zIndex: 2,
                    boxShadow: theme.shadow,
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "scale(1.02)";
                    e.currentTarget.style.zIndex = 10;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.zIndex = 2;
                  }}
                >
                  {!isShortEvent && (
                    <>
                      <div style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: theme.text,
                        marginBottom: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {event.title || 'Event'}
                      </div>
                      <div style={{
                        fontSize: 8,
                        color: theme.textSec,
                        opacity: 0.8
                      }}>
                        {eventStart.toLocaleTimeString([], { 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </>
                  )}
                  {isShortEvent && (
                    <div style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: theme.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      lineHeight: "16px"
                    }}>
                      {event.title?.substring(0, 1) || 'E'}
                    </div>
                  )}
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
const today = useMemo(() => new Date(), []);
const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
const startDay = monthStart.getDay();
const daysInMonth = monthEnd.getDate();
const days = useMemo(() => {
const dayArray = [];
const totalCells = 42;
const prevMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
for (let i = startDay - 1; i >= 0; i--) {
  const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevMonthEnd - i);
  dayArray.push({ date, isCurrentMonth: false });
}

for (let i = 1; i <= daysInMonth; i++) {
  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
  dayArray.push({ date, isCurrentMonth: true });
}

const nextMonthDays = totalCells - dayArray.length;
for (let i = 1; i <= nextMonthDays; i++) {
  const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i);
  dayArray.push({ date, isCurrentMonth: false });
}

return dayArray;
}, [currentDate, startDay, daysInMonth]);
const weekDays = config.weekStartMon
? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
return (
<div style={{ maxWidth: 1200, margin: "0 auto" }}>
<div style={{
display: "grid",
gridTemplateColumns: "repeat(7, 1fr)",
marginBottom: 12,
borderBottom: `1px solid ${theme.border}`,
paddingBottom: 10
}}>
{weekDays.map(day => (
<div
key={day}
style={{
textAlign: "center",
fontSize: 10,
fontWeight: 700,
color: theme.textMuted,
textTransform: "uppercase",
letterSpacing: 0.8
}}
>
{day}
</div>
))}
</div>
  <div style={{
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 6
  }}>
    {days.map((dayInfo, index) => {
      const { date, isCurrentMonth } = dayInfo;
      const isToday = date.toDateString() === today.toDateString();
      const dayEvents = events.filter(event => 
        event?.start && new Date(event.start).toDateString() === date.toDateString()
      );
      
      return (
        <div
          key={index}
          onClick={() => isCurrentMonth && onDayClick(date)}
          style={{
            minHeight: 100,
            padding: 8,
            borderRadius: 8,
            background: isCurrentMonth ? (isToday ? theme.selection : theme.hoverBg) : theme.bg,
            border: `1px solid ${isToday ? theme.accent + '40' : theme.border}`,
            cursor: isCurrentMonth ? "pointer" : "default",
            opacity: isCurrentMonth ? 1 : 0.3,
            transition: "all 0.2s"
          }}
          onMouseEnter={e => {
            if (isCurrentMonth) {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = theme.shadow;
            }
          }}
          onMouseLeave={e => {
            if (isCurrentMonth) {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }
          }}
        >
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: isCurrentMonth ? (isToday ? theme.accent : theme.text) : theme.textMuted,
            marginBottom: 6,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span>{date.getDate()}</span>
            {isToday && config.enablePulseEffects && (
              <div style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: theme.accent,
                animation: "pulse 2s infinite"
              }} />
            )}
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {dayEvents.slice(0, 3).map(event => (
              <div
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(event);
                }}
                style={{
                  padding: "3px 6px",
                  background: theme.accent + '15',
                  borderRadius: 4,
                  fontSize: 9,
                  fontWeight: 600,
                  color: theme.accent,
                  cursor: "pointer",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme.accent + '25'}
                onMouseLeave={e => e.currentTarget.style.background = theme.accent + '15'}
              >
                {event.title || 'Event'}
              </div>
            ))}
            
            {dayEvents.length > 3 && (
              <div style={{
                fontSize: 8,
                color: theme.textMuted,
                fontWeight: 600,
                padding: "2px 3px"
              }}>
                +{dayEvents.length - 3}
              </div>
            )}
          </div>
        </div>
      );
    })}
  </div>
</div>
);
}
function LinearYearView({
currentDate,
events,
theme,
config,
tags,
context,
accentColor,
onDayClick,
onEventClick
}) {
const year = currentDate.getFullYear();
const today = React.useMemo(() => new Date(), []);
const isCurrentYear = year === today.getFullYear();
const [hoveredDay, setHoveredDay] = React.useState(null);
const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });
React.useEffect(() => {
if (isCurrentYear) {
const interval = setInterval(() => {
const now = new Date();
if (now.getDate() !== today.getDate()) {
window.location.reload();
}
}, 60000);
  return () => clearInterval(interval);
}
}, [isCurrentYear, today]);
const eventsByDay = React.useMemo(() => {
const grouped = {};
events.forEach(event => {
if (!event?.start) return;
const dayStr = new Date(event.start).toDateString();
if (!grouped[dayStr]) grouped[dayStr] = [];
grouped[dayStr].push(event);
});
return grouped;
}, [events]);
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const weekDayAbbr = config.weekStartMon
? ["M", "T", "W", "T", "F", "S", "S"]
: ["S", "M", "T", "W", "T", "F", "S"];
const getMonthRowData = React.useCallback((monthIndex) => {
const firstDay = new Date(year, monthIndex, 1);
const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
let startDay = firstDay.getDay();
if (config.weekStartMon) {
  startDay = startDay === 0 ? 6 : startDay - 1;
}

const cells = [];

for (let i = 0; i < startDay; i++) {
  cells.push({ isEmpty: true });
}

for (let day = 1; day <= daysInMonth; day++) {
  const date = new Date(year, monthIndex, day);
  const dayStr = date.toDateString();
  const isToday = date.toDateString() === today.toDateString();
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const dayEvents = eventsByDay[dayStr] || [];
  
  cells.push({
    isEmpty: false,
    date,
    day,
    isToday,
    isWeekend,
    events: dayEvents
  });
}

return cells;
}, [year, config.weekStartMon, today, eventsByDay]);
const CELL_SIZE = 24;
return (
<div style={{
width: "100%",
height: "100%",
display: "flex",
flexDirection: "column",
gap: 16,
overflow: "auto",
paddingBottom: 12
}}>
<div style={{
width: "100%",
display: "flex",
flexDirection: "column",
gap: 0
}}>
<div style={{
position: "sticky",
top: 0,
zIndex: 10,
background: theme.bg,
borderBottom: `1px solid ${theme.border}`,
paddingBottom: 5,
marginBottom: 5
}}>
<div style={{
display: "flex",
alignItems: "center",
gap: 0
}}>
<div style={{
width: 40,
flexShrink: 0
}} />
        <div style={{
          display: "flex",
          gap: 0
        }}>
          {Array.from({ length: 37 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: CELL_SIZE,
                textAlign: "center",
                fontSize: 8,
                fontWeight: 600,
                color: (i % 7 === 5 || i % 7 === 6) ? theme.familyAccent : theme.textMuted,
                padding: "2px 0"
              }}
            >
              {weekDayAbbr[i % 7]}
            </div>
          ))}
        </div>
      </div>
    </div>
    
    {Array.from({ length: 12 }).map((_, monthIndex) => {
      const monthData = getMonthRowData(monthIndex);
      
      return (
        <div
          key={monthIndex}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            marginBottom: 2
          }}
        >
          <div style={{
            width: 40,
            flexShrink: 0,
            fontSize: 10,
            fontWeight: 600,
            color: accentColor,
            paddingRight: 6,
            textAlign: "right"
          }}>
            {monthNames[monthIndex]}
          </div>
          
          <div style={{
            display: "flex",
            gap: 0
          }}>
            {monthData.map((cell, cellIndex) => {
              if (cell.isEmpty) {
                return (
                  <div
                    key={cellIndex}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE
                    }}
                  />
                );
              }
              
              const { date, day, isToday, isWeekend, events } = cell;
              const hasEvents = events.length > 0;
              
              return (
                <div
                  key={cellIndex}
                  onClick={() => onDayClick(date)}
                  onMouseEnter={(e) => {
                    if (hasEvents) {
                      setHoveredDay({ date, events });
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltipPos({ x: rect.left, y: rect.bottom + 6 });
                    }
                    if (!isToday) {
                      e.currentTarget.style.transform = "scale(1.15)";
                      e.currentTarget.style.zIndex = 5;
                    }
                  }}
                  onMouseLeave={(e) => {
                    setHoveredDay(null);
                    if (!isToday) {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.zIndex = 1;
                    }
                  }}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 3,
                    cursor: "pointer",
                    position: "relative",
                    background: isToday 
                      ? accentColor 
                      : hasEvents
                      ? theme.selection
                      : isWeekend 
                      ? theme.hoverBg 
                      : "transparent",
                    border: isToday ? `1.5px solid ${accentColor}` : hasEvents ? `1px solid ${accentColor}30` : "1px solid transparent",
                    transition: "all 0.15s",
                    fontSize: 9,
                    fontWeight: isToday ? 700 : hasEvents ? 600 : 500,
                    color: isToday 
                      ? "#fff" 
                      : hasEvents
                      ? accentColor
                      : theme.text
                  }}
                >
                  {day}
                  
                  {hasEvents && !isToday && (
                    <div style={{
                      position: "absolute",
                      bottom: 2,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 2,
                      height: 2,
                      borderRadius: "50%",
                      background: accentColor
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    })}
    
    <div style={{
      marginTop: 16,
      paddingTop: 12,
      borderTop: `1px solid ${theme.border}`,
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 8
    }}>
      {(() => {
        const totalEvents = events.length;
        const daysWithEvents = Object.keys(eventsByDay).length;
        const monthCounts = Array.from({ length: 12 }).map((_, i) => ({
          month: i,
          count: events.filter(e => new Date(e.start).getMonth() === i && new Date(e.start).getFullYear() === year).length
        }));
        const busiest = monthCounts.reduce((a, b) => a.count > b.count ? a : b, { month: 0, count: 0 });
        const progress = isCurrentYear 
          ? Math.floor((today - new Date(year, 0, 1)) / (1000 * 60 * 60 * 24 * 365) * 100)
          : year < today.getFullYear() ? 100 : 0;
        
        const stats = [
          { label: "Events", value: totalEvents, sub: "total" },
          { label: "Active", value: daysWithEvents, sub: "days" },
          { label: "Busiest", value: monthNames[busiest.month], sub: `${busiest.count} events` },
          { label: "Progress", value: `${progress}%`, sub: "year" }
        ];
        
        return stats.map((stat, idx) => (
          <div key={idx} style={{
            background: theme.sidebar,
            padding: "10px",
            borderRadius: 8,
            textAlign: "center"
          }}>
            <div style={{
              fontSize: 9,
              fontWeight: 700,
              color: theme.textMuted,
              marginBottom: 3,
              textTransform: "uppercase",
              letterSpacing: 0.5
            }}>
              {stat.label}
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 700,
              color: accentColor,
              marginBottom: 2
            }}>
              {stat.value}
            </div>
            <div style={{
              fontSize: 8,
              color: theme.textSec
            }}>
              {stat.sub}
            </div>
          </div>
        ));
      })()}
    </div>
  </div>
  
  {hoveredDay && (
    <div style={{
      position: "fixed",
      left: tooltipPos.x,
      top: tooltipPos.y,
      background: theme.card,
      borderRadius: 8,
      padding: "10px",
      boxShadow: theme.shadowLg,
      border: `1px solid ${theme.border}`,
      zIndex: 1000,
      minWidth: "180px",
      maxWidth: "280px",
      pointerEvents: "none"
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: theme.text,
        marginBottom: 6,
        display: "flex",
        alignItems: "center",
        gap: 5
      }}>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: accentColor
        }} />
        {hoveredDay.date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric'
        })}
      </div>
      
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 5
      }}>
        {hoveredDay.events.slice(0, 3).map(event => {
          const tag = tags.find(t => t.id === event.category) || tags[0];
          return (
            <div 
              key={event.id}
              style={{
                padding: "5px 7px",
                background: theme.hoverBg,
                borderRadius: 5,
                cursor: "pointer"
              }}
            >
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                color: theme.text,
                marginBottom: 2,
                display: "flex",
                alignItems: "center",
                gap: 4
              }}>
                <div style={{
                  width: 3,
                  height: 3,
                  borderRadius: "50%",
                  background: tag?.color || accentColor
                }} />
                {event.title || 'Untitled'}
              </div>
              <div style={{
                fontSize: 9,
                color: theme.textSec
              }}>
                {new Date(event.start).toLocaleTimeString([], { 
                  hour: 'numeric', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          );
        })}
        
        {hoveredDay.events.length > 3 && (
          <div style={{
            fontSize: 9,
            color: theme.textMuted,
            textAlign: "center",
            padding: "3px"
          }}>
            +{hoveredDay.events.length - 3} more
          </div>
        )}
      </div>
    </div>
  )}
</div>
);
}
function EventEditor({ event, theme, tags, onSave, onDelete, onCancel, config, context }) {
const [form, setForm] = React.useState({
title: event?.title || '',
category: event?.category || (tags[0]?.id || ''),
description: event?.description || '',
location: event?.location || '',
start: event?.start ? new Date(event.start) : new Date(),
end: event?.end ? new Date(event.end) : new Date(new Date().getTime() + 60 * 60 * 1000)
});
const [errors, setErrors] = React.useState({});
React.useEffect(() => {
if (!event?.id) {
const now = new Date();
const roundedMinutes = Math.ceil(now.getMinutes() / 15) * 15;
const start = new Date(now);
start.setMinutes(roundedMinutes, 0, 0);
const end = new Date(start.getTime() + 60 * 60 * 1000);
  setForm(prev => ({
    ...prev,
    start,
    end
  }));
}
}, [event?.id]);
const validateForm = () => {
const newErrors = {};
if (!form.title.trim()) {
  newErrors.title = 'Title required';
}

if (form.end <= form.start) {
  newErrors.end = 'End must be after start';
}

if (!form.category) {
  newErrors.category = 'Select a category';
}

setErrors(newErrors);
return Object.keys(newErrors).length === 0;
};
const handleSubmit = (e) => {
e.preventDefault();
if (!validateForm()) return;
onSave({
  id: event?.id || null,
  ...form
});
};
return (
<div style={{
position: 'fixed',
top: 0,
left: 0,
right: 0,
bottom: 0,
background: 'rgba(0, 0, 0, 0.5)',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
zIndex: 1000,
padding: 16,
backdropFilter: 'blur(3px)'
}}>
<div
onClick={onCancel}
style={{
position: 'absolute',
top: 0,
left: 0,
right: 0,
bottom: 0
}}
/>
  <div style={{
    background: theme.card,
    borderRadius: 16,
    width: '100%',
    maxWidth: 460,
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: theme.shadowLg,
    position: 'relative',
    border: `1px solid ${theme.border}`
  }}>
    <div style={{
      padding: '20px',
      borderBottom: `1px solid ${theme.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <h3 className="serif" style={{
        fontSize: 18,
        fontWeight: 500,
        color: theme.text
      }}>
        {event?.id ? 'Edit Event' : 'New Event'}
      </h3>
      <button
        onClick={onCancel}
        style={{
          background: 'transparent',
          border: 'none',
          color: theme.textSec,
          cursor: 'pointer',
          padding: 6,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.color = theme.text}
        onMouseLeave={e => e.currentTarget.style.color = theme.textSec}
      >
        <ICONS.Close width={18} height={18} />
      </button>
    </div>
    
    <form onSubmit={handleSubmit} style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <label style={{
          display: 'block',
          fontSize: 10,
          fontWeight: 700,
          color: theme.textSec,
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: 0.8
        }}>
          Title
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Event name"
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 14,
            background: theme.sidebar,
            border: `1px solid ${errors.title ? theme.indicator : theme.border}`,
            borderRadius: 8,
            color: theme.text,
            transition: 'all 0.2s'
          }}
          onFocus={(e) => e.target.style.borderColor = theme.accent}
          onBlur={(e) => e.target.style.borderColor = errors.title ? theme.indicator : theme.border}
          autoFocus
        />
        {errors.title && (
          <div style={{
            fontSize: 10,
            color: theme.indicator,
            marginTop: 3
          }}>
            {errors.title}
          </div>
        )}
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        marginBottom: 16
      }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: 10,
            fontWeight: 700,
            color: theme.textSec,
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: 0.8
          }}>
            Start
          </label>
          <input
            type="datetime-local"
            value={form.start.toISOString().slice(0, 16)}
            onChange={(e) => {
              const newStart = new Date(e.target.value);
              const duration = form.end - form.start;
              const newEnd = new Date(newStart.getTime() + duration);
              setForm({ ...form, start: newStart, end: newEnd });
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: 12,
              background: theme.sidebar,
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              color: theme.text
            }}
          />
        </div>
        
        <div>
          <label style={{
            display: 'block',
            fontSize: 10,
            fontWeight: 700,
            color: theme.textSec,
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: 0.8
          }}>
            End
          </label>
          <input
            type="datetime-local"
            value={form.end.toISOString().slice(0, 16)}
            onChange={(e) => setForm({ ...form, end: new Date(e.target.value) })}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: 12,
              background: theme.sidebar,
              border: `1px solid ${errors.end ? theme.indicator : theme.border}`,
              borderRadius: 8,
              color: theme.text
            }}
          />
          {errors.end && (
            <div style={{
              fontSize: 10,
              color: theme.indicator,
              marginTop: 3
            }}>
              {errors.end}
            </div>
          )}
        </div>
      </div>
      
      <div style={{ marginBottom: 16 }}>
        <label style={{
          display: 'block',
          fontSize: 10,
          fontWeight: 700,
          color: theme.textSec,
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: 0.8
        }}>
          Category
        </label>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6
        }}>
          {tags.map(tag => {
            const IconComponent = tag.icon;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => setForm({ ...form, category: tag.id })}
                style={{
                  padding: '7px 10px',
                  background: form.category === tag.id 
                    ? tag.color + '15' 
                    : theme.sidebar,
                  border: `1px solid ${form.category === tag.id ? tag.color + '40' : theme.border}`,
                  borderRadius: 6,
                  color: form.category === tag.id ? tag.color : theme.textSec,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  if (form.category !== tag.id) {
                    e.currentTarget.style.background = theme.hoverBg;
                  }
                }}
                onMouseLeave={e => {
                  if (form.category !== tag.id) {
                    e.currentTarget.style.background = theme.sidebar;
                  }
                }}
              >
                {IconComponent && <IconComponent width={11} height={11} />}
                {tag.name}
              </button>
            );
          })}
        </div>
        {errors.category && (
          <div style={{
            fontSize: 10,
            color: theme.indicator,
            marginTop: 3
          }}>
            {errors.category}
          </div>
        )}
      </div>
      
      <div style={{ marginBottom: 16 }}>
        <label style={{
          display: 'block',
          fontSize: 10,
          fontWeight: 700,
          color: theme.textSec,
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: 0.8
        }}>
          Location (Optional)
        </label>
        <input
          type="text"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          placeholder="Where?"
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 12,
            background: theme.sidebar,
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            color: theme.text
          }}
        />
      </div>
      
      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'block',
          fontSize: 10,
          fontWeight: 700,
          color: theme.textSec,
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: 0.8
        }}>
          Notes (Optional)
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Details..."
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 12,
            background: theme.sidebar,
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            color: theme.text,
            resize: 'vertical',
            minHeight: 80
          }}
        />
      </div>
      
      <div style={{
        display: 'flex',
        gap: 10,
        justifyContent: 'flex-end',
        borderTop: `1px solid ${theme.border}`,
        paddingTop: 16
      }}>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            style={{
              padding: '10px 18px',
              background: 'transparent',
              border: `1px solid ${theme.indicator}`,
              borderRadius: 8,
              color: theme.indicator,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = theme.indicator;
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = theme.indicator;
            }}
          >
            Delete
          </button>
        )}
        
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            color: theme.textSec,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = theme.hoverBg;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          Cancel
        </button>
        
        <button
          type="submit"
          style={{
            padding: '10px 24px',
            background: context === 'family' ? theme.familyAccent : theme.accent,
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {event?.id ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  </div>
</div>
);
}
function SettingsModal({ config, setConfig, theme, onClose, user, handleLogout }) {
const handleToggle = (key) => {
setConfig(prev => ({ ...prev, [key]: !prev[key] }));
};
const ToggleSwitch = ({ value }) => (
<div style={{
width: 36,
height: 20,
background: value ? theme.accent : theme.border,
borderRadius: 10,
position: 'relative',
cursor: 'pointer',
transition: 'all 0.2s'
}}>
<div style={{
position: 'absolute',
top: 2,
left: value ? 18 : 2,
width: 16,
height: 16,
borderRadius: '50%',
background: '#fff',
transition: 'left 0.2s'
}} />
</div>
);
return (
<div style={{
position: 'fixed',
top: 0,
left: 0,
right: 0,
bottom: 0,
background: 'rgba(0, 0, 0, 0.5)',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
zIndex: 1000,
padding: 16,
backdropFilter: 'blur(3px)'
}}>
<div
onClick={onClose}
style={{
position: 'absolute',
top: 0,
left: 0,
right: 0,
bottom: 0
}}
/>
  <div style={{
    background: theme.card,
    borderRadius: 16,
    width: '100%',
    maxWidth: 460,
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: theme.shadowLg,
    position: 'relative',
    border: `1px solid ${theme.border}`
  }}>
    <div style={{
      padding: '20px',
      borderBottom: `1px solid ${theme.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <h3 className="serif" style={{
        fontSize: 18,
        fontWeight: 500,
        color: theme.text
      }}>
        Settings
      </h3>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: theme.textSec,
          cursor: 'pointer',
          padding: 6,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.color = theme.text}
        onMouseLeave={e => e.currentTarget.style.color = theme.textSec}
      >
        <ICONS.Close width={18} height={18} />
      </button>
    </div>
    
    <div style={{ padding: 20 }}>
      {user && (
        <div style={{
          padding: 12,
          background: theme.sidebar,
          borderRadius: 8,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: theme.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14
          }}>
            {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: theme.text
            }}>
              {user.displayName || 'User'}
            </div>
            <div style={{
              fontSize: 10,
              color: theme.textSec
            }}>
              {user.email}
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: `1px solid ${theme.border}`,
              borderRadius: 6,
              color: theme.textSec,
              fontSize: 10,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = theme.hoverBg}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            Sign Out
          </button>
        </div>
      )}
      
      <div style={{ marginBottom: 20 }}>
        <h4 style={{
          fontSize: 10,
          fontWeight: 700,
          color: theme.text,
          marginBottom: 12,
          textTransform: 'uppercase',
          letterSpacing: 0.8
        }}>
          Appearance
        </h4>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
          {[
            { key: 'darkMode', label: 'Dark Mode' },
            { key: 'use24Hour', label: '24-Hour Time' },
            { key: 'weekStartMon', label: 'Week Starts Monday' }
          ].map(({ key, label }) => (
            <div key={key} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: 12,
                color: theme.text
              }}>
                {label}
              </span>
              <button
                onClick={() => handleToggle(key)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <ToggleSwitch value={config[key]} />
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ marginBottom: 20 }}>
        <h4 style={{
          fontSize: 10,
          fontWeight: 700,
          color: theme.text,
          marginBottom: 12,
          textTransform: 'uppercase',
          letterSpacing: 0.8
        }}>
          Interface
        </h4>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
          {[
            { key: 'showSidebar', label: 'Show Sidebar' },
            { key: 'showMotivationalQuotes', label: 'Show Quotes' },
            { key: 'showUpcomingEvents', label: 'Show Upcoming' }
          ].map(({ key, label }) => (
            <div key={key} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: 12,
                color: theme.text
              }}>
                {label}
              </span>
              <button
                onClick={() => handleToggle(key)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <ToggleSwitch value={config[key]} />
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ marginBottom: 20 }}>
        <h4 style={{
          fontSize: 10,
          fontWeight: 700,
          color: theme.text,
          marginBottom: 12,
          textTransform: 'uppercase',
          letterSpacing: 0.8
        }}>
          Features
        </h4>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
          {[
            { key: 'enableDragDrop', label: 'Drag & Drop' },
            { key: 'enableAnimations', label: 'Animations' },
            { key: 'enablePulseEffects', label: 'Pulse Effects' }
          ].map(({ key, label }) => (
            <div key={key} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: 12,
                color: theme.text
              }}>
                {label}
              </span>
              <button
                onClick={() => handleToggle(key)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <ToggleSwitch value={config[key]} />
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div style={{
        padding: 12,
        background: theme.sidebar,
        borderRadius: 8,
        marginTop: 20
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          color: theme.textSec,
          marginBottom: 3
        }}>
          Timeline OS v{APP_META.version}
        </div>
        <div style={{
          fontSize: 9,
          color: theme.textMuted,
          lineHeight: 1.4
        }}>
          {APP_META.motto}
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
position: 'fixed',
top: 0,
left: 0,
right: 0,
bottom: 0,
background: 'rgba(0, 0, 0, 0.5)',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
zIndex: 1000,
padding: 16,
backdropFilter: 'blur(3px)'
}}>
<div
onClick={onClose}
style={{
position: 'absolute',
top: 0,
left: 0,
right: 0,
bottom: 0
}}
/>
  <div style={{
    background: theme.card,
    borderRadius: 16,
    width: '100%',
    maxWidth: 540,
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: theme.shadowLg,
    position: 'relative',
    border: `1px solid ${theme.border}`
  }}>
    <div style={{
      padding: '20px',
      borderBottom: `1px solid ${theme.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <h3 className="serif" style={{
          fontSize: 18,
          fontWeight: 500,
          color: theme.text
        }}>
          Trash
        </h3>
        <div style={{
          fontSize: 10,
          color: theme.textMuted,
          marginTop: 3
        }}>
          {events.length} deleted
        </div>
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: theme.textSec,
          cursor: 'pointer',
          padding: 6,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.color = theme.text}
        onMouseLeave={e => e.currentTarget.style.color = theme.textSec}
      >
        <ICONS.Close width={18} height={18} />
      </button>
    </div>
    
    <div style={{ padding: 20 }}>
      {events.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '32px 16px'
        }}>
          <div style={{
            fontSize: 36,
            marginBottom: 10,
            opacity: 0.08
          }}>
            🗑️
          </div>
          <div style={{
            fontSize: 14,
            fontWeight: 500,
            color: theme.text,
            marginBottom: 6
          }}>
            Trash is empty
          </div>
          <div style={{
            fontSize: 11,
            color: theme.textMuted
          }}>
            Deleted events appear here
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
          {events.map(event => {
            const eventDate = new Date(event.start);
            
            return (
              <div
                key={event.id}
                style={{
                  background: theme.sidebar,
                  borderRadius: 8,
                  border: `1px solid ${theme.border}`,
                  padding: 12
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: theme.text,
                      marginBottom: 3
                    }}>
                      {event.title || 'Untitled'}
                    </div>
                    <div style={{
                      fontSize: 10,
                      color: theme.textSec,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10
                    }}>
                      <span>
                        {eventDate.toLocaleDateString()}
                      </span>
                      <span>
                        {eventDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => onRestore(event.id)}
                      style={{
                        padding: '5px 10px',
                        background: theme.familyAccent,
                        border: 'none',
                        borderRadius: 5,
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      Restore
                    </button>
                    
                    <button
                      onClick={() => onDelete(event.id)}
                      style={{
                        padding: '5px 10px',
                        background: theme.indicator,
                        border: 'none',
                        borderRadius: 5,
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
</div>
);
}
function TagManager({ tags, setTags, theme, context, onClose }) {
const [editingTag, setEditingTag] = React.useState(null);
const [newTagName, setNewTagName] = React.useState('');
const [selectedPalette, setSelectedPalette] = React.useState(Object.keys(PALETTE)[0]);
const [selectedIcon, setSelectedIcon] = React.useState('Briefcase');
const contextTags = tags[context] || [];
const handleSaveTag = () => {
if (!newTagName.trim() || !selectedIcon || !selectedPalette) return;
const palette = PALETTE[selectedPalette];
const IconComponent = ICONS[selectedIcon];

if (!IconComponent) return;

const newTag = {
  id: editingTag?.id || `tag-${Date.now()}`,
  name: newTagName.trim(),
  icon: IconComponent,
  ...palette
};

if (editingTag) {
  const updatedTags = contextTags.map(tag => 
    tag.id === editingTag.id ? newTag : tag
  );
  setTags({
    ...tags,
    [context]: updatedTags
  });
} else {
  setTags({
    ...tags,
    [context]: [...contextTags, newTag]
  });
}

setEditingTag(null);
setNewTagName('');
};
const handleDeleteTag = (tagId) => {
if (!window.confirm('Delete this tag?')) return;
const updatedTags = contextTags.filter(tag => tag.id !== tagId);
setTags({
  ...tags,
  [context]: updatedTags
});
};
const handleEditTag = (tag) => {
setEditingTag(tag);
setNewTagName(tag.name);
const paletteKey = Object.keys(PALETTE).find(key => {
  const palette = PALETTE[key];
  return palette.color === tag.color;
});

setSelectedPalette(paletteKey || Object.keys(PALETTE)[0]);

const iconName = Object.keys(ICONS).find(name => {
  return ICONS[name] === tag.icon;
});

setSelectedIcon(iconName || 'Briefcase');
};
return (
<div style={{
position: 'fixed',
top: 0,
left: 0,
right: 0,
bottom: 0,
background: 'rgba(0, 0, 0, 0.5)',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
zIndex: 1000,
padding: 16,
backdropFilter: 'blur(3px)'
}}>
<div
onClick={onClose}
style={{
position: 'absolute',
top: 0,
left: 0,
right: 0,
bottom: 0
}}
/>
  <div style={{
    background: theme.card,
    borderRadius: 16,
    width: '100%',
    maxWidth: 540,
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: theme.shadowLg,
    position: 'relative',
    border: `1px solid ${theme.border}`
  }}>
    <div style={{
      padding: '20px',
      borderBottom: `1px solid ${theme.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <h3 className="serif" style={{
          fontSize: 18,
          fontWeight: 500,
          color: theme.text
        }}>
          Categories
        </h3>
        <div style={{
          fontSize: 10,
          color: theme.textMuted,
          marginTop: 3
        }}>
          Manage {context} tags
        </div>
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: theme.textSec,
          cursor: 'pointer',
          padding: 6,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.color = theme.text}
        onMouseLeave={e => e.currentTarget.style.color = theme.textSec}
      >
        <ICONS.Close width={18} height={18} />
      </button>
    </div>
    
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 24 }}>
        <h4 style={{
          fontSize: 10,
          fontWeight: 700,
          color: theme.text,
          marginBottom: 12,
          textTransform: 'uppercase',
          letterSpacing: 0.8
        }}>
          Existing
        </h4>
        
        {contextTags.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '16px',
            background: theme.sidebar,
            borderRadius: 8,
            color: theme.textMuted,
            fontSize: 11
          }}>
            No tags yet
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 10
          }}>
            {contextTags.map(tag => {
              const IconComponent = tag.icon;
              return (
                <div
                  key={tag.id}
                  style={{
                    padding: 10,
                    background: tag.color + '10',
                    border: `1px solid ${tag.color}30`,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: tag.color + '20',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {IconComponent && (
                      <IconComponent width={14} height={14} color={tag.color} />
                    )}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: theme.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {tag.name}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => handleEditTag(tag)}
                      style={{
                        padding: '3px 7px',
                        background: 'transparent',
                        border: `1px solid ${theme.border}`,
                        borderRadius: 4,
                        color: theme.textSec,
                        fontSize: 9,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = theme.hoverBg}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      style={{
                        padding: '3px 7px',
                        background: theme.indicator,
                        border: 'none',
                        borderRadius: 4,
                        color: '#fff',
                        fontSize: 9,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      Del
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <div style={{ 
        padding: 16,
        background: theme.sidebar,
        borderRadius: 8
      }}>
        <h4 style={{
          fontSize: 10,
          fontWeight: 700,
          color: theme.text,
          marginBottom: 12,
          textTransform: 'uppercase',
          letterSpacing: 0.8
        }}>
          {editingTag ? 'Edit' : 'Create'}
        </h4>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 600,
              color: theme.textSec,
              marginBottom: 6
            }}>
              Name
            </label>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag name"
              style={{
                width: '100%',
                padding: '8px 10px',
                fontSize: 12,
                background: theme.card,
                border: `1px solid ${theme.border}`,
                borderRadius: 6,
                color: theme.text
              }}
            />
          </div>
          
          <div>
            <label style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 600,
              color: theme.textSec,
              marginBottom: 6
            }}>
              Icon
            </label>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6
            }}>
              {Object.keys(ICONS).slice(0, 12).map(iconName => {
                const IconComponent = ICONS[iconName];
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setSelectedIcon(iconName)}
                    style={{
                      width: 32,
                      height: 32,
                      background: selectedIcon === iconName ? theme.accent : theme.card,
                      border: `1px solid ${selectedIcon === iconName ? theme.accent : theme.border}`,
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <IconComponent width={14} height={14} color={selectedIcon === iconName ? '#fff' : theme.text} />
                  </button>
                );
              })}
            </div>
          </div>
          
          <div>
            <label style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 600,
              color: theme.textSec,
              marginBottom: 6
            }}>
              Color
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: 6
            }}>
              {Object.keys(PALETTE).map(paletteName => {
                const palette = PALETTE[paletteName];
                return (
                  <button
                    key={paletteName}
                    type="button"
                    onClick={() => setSelectedPalette(paletteName)}
                    style={{
                      padding: '8px',
                      background: palette.bg,
                      border: `2px solid ${selectedPalette === paletteName ? palette.color : 'transparent'}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      width: 16,
                      height: 16,
                      borderRadius: 3,
                      background: palette.color
                    }} />
                  </button>
                );
              })}
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            marginTop: 8
          }}>
            {editingTag && (
              <button
                type="button"
                onClick={() => {
                  setEditingTag(null);
                  setNewTagName('');
                }}
                style={{
                  padding: '8px 14px',
                  background: 'transparent',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 6,
                  color: theme.textSec,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme.hoverBg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Cancel
              </button>
            )}
            
            <button
              type="button"
              onClick={handleSaveTag}
              disabled={!newTagName.trim()}
              style={{
                padding: '8px 16px',
                background: newTagName.trim() ? theme.accent : theme.border,
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                fontSize: 11,
                fontWeight: 600,
                cursor: newTagName.trim() ? 'pointer' : 'not-allowed',
                opacity: newTagName.trim() ? 1 : 0.5,
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                if (newTagName.trim()) {
                  e.currentTarget.style.opacity = '0.9';
                }
              }}
              onMouseLeave={e => {
                if (newTagName.trim()) {
                  e.currentTarget.style.opacity = '1';
                }
              }}
            >
              {editingTag ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
);
}
export default function App() {
return (
<ErrorBoundary>
<TimelineOS />
</ErrorBoundary>
);
}