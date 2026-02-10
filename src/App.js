import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Routes, Route } from "react-router-dom";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import {
  PALETTE,
  THEMES,
  MOTIVATIONAL_QUOTES,
  DEFAULT_TAGS,
  AVAILABLE_ICONS,
  FOCUS_MODES,
  TIMER_COLORS,
  TIMER_ICONS,
  TIMER_PRESETS,
  LAYOUT
} from "./constants";
import {
  toLocalDateTimeString,
  getWeekNumber,
  eventsOverlap,
  findConflicts,
  getTagIcon
} from "./utils";
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signInWithPassword,
  signOut as supabaseSignOut,
  onAuthStateChange
} from "./services/authService";
import {
  loadEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  permanentlyDeleteEvent,
  restoreEvent as restoreSupabaseEvent,
  createRecurringInstances
} from "./services/eventService";
import {
  loadTags,
  createTag,
  updateTag,
  deleteTag,
  // getTagsByContext
} from "./services/tagService";
import {
  SUBSCRIPTION_PLANS,
  FEATURE_DESCRIPTIONS,
  TRIAL_CONFIG,
  getSubscriptionStatus,
  startFreeTrial,
  canUseFeature,
  hasReachedLimit,
  getTrialDaysRemaining,
  localSubscriptionManager
} from "./services/subscriptionService";
// import {
//   loadUserPreferences,
//   updateUserPreferences
// } from "./services/userPreferencesService";
import { supabase } from './supabaseClient';
import {
  runAllGuards,
  recordPerformance,
  runAnalysisCycle,
  initInstrumentation
} from "./utils/instrumentation";
import './components/LinearCalendar.css';
import './App.css';
import { InsightsDashboard } from './components/InsightsDashboard';
import { MetricsTab } from './components/MetricsTab';
import { TelemetryPage } from './components/TelemetryPage';
import ICONS from './constants/icons';

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
  version: "1.0.0",
  quoteInterval: 14400000,
  author: "Timeline Solutions",
  motto: "Time is the luxury you cannot buy."
};

// Ultra-Premium Logo Component - Clean 4K (No Orange Hue)
const AppLogo = ({ size = 32, theme, showText = false, animated = false }) => {
  const isDark = theme?.id === 'dark' || theme?.id === 'midnight' || theme?.id === 'monochrome';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: showText ? 12 : 0 }}>
      <div style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: isDark
          ? 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.05) 100%)'
          : 'linear-gradient(135deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.04) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isDark
          ? '0 4px 16px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.1)'
          : '0 4px 16px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.06), inset 0 1px 2px rgba(255,255,255,0.6)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${theme?.premiumGlassBorder || (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')}`
      }}>
        {/* Animated shimmer effect */}
        {animated && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: isDark
              ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 3s ease-in-out infinite',
            zIndex: 2
          }} />
        )}

        {/* Premium glass overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '50%',
          background: isDark
            ? 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%)',
          borderRadius: `${size * 0.28}px ${size * 0.28}px 0 0`,
          zIndex: 1
        }} />

        {/* Clean 4K Timeline Icon */}
        <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 48 48" fill="none" style={{ position: 'relative', zIndex: 3 }}>
          {/* Main vertical timeline - thicker, smoother */}
          <line
            x1="24" y1="4"
            x2="24" y2="44"
            stroke={theme?.accent || '#F97316'}
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="1"
          />

          {/* Horizontal branches - varying lengths for hierarchy */}
          {/* Top branch */}
          <line
            x1="24" y1="12"
            x2="38" y2="12"
            stroke={theme?.accent || '#F97316'}
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.95"
          />

          {/* Middle branch */}
          <line
            x1="24" y1="24"
            x2="34" y2="24"
            stroke={theme?.accent || '#F97316'}
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.95"
          />

          {/* Bottom branch - longest */}
          <line
            x1="24" y1="36"
            x2="42" y2="36"
            stroke={theme?.accent || '#F97316'}
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.95"
          />

          {/* Timeline nodes - crisp circles */}
          <circle cx="24" cy="12" r="4" fill={theme?.accent || '#F97316'} opacity="1"/>
          <circle cx="24" cy="24" r="4.5" fill={theme?.accent || '#F97316'} opacity="1"/>
          <circle cx="24" cy="36" r="4" fill={theme?.accent || '#F97316'} opacity="1"/>

          {/* Endpoint nodes on branches */}
          <circle cx="38" cy="12" r="3" fill={theme?.accent || '#F97316'} opacity="0.9"/>
          <circle cx="34" cy="24" r="3" fill={theme?.accent || '#F97316'} opacity="0.9"/>
          <circle cx="42" cy="36" r="3" fill={theme?.accent || '#F97316'} opacity="0.9"/>
        </svg>
      </div>

      {showText && (
        <div style={{ lineHeight: 1 }}>
          <div style={{
            fontSize: size * 0.47,
            fontWeight: 700,
            fontFamily: theme?.fontDisplay || "'Playfair Display', serif",
            color: theme?.text || '#000',
            letterSpacing: '-0.02em',
            marginBottom: size * 0.06
          }}>Timeline</div>
          <div style={{
            fontSize: size * 0.28,
            fontWeight: 600,
            fontFamily: theme?.fontFamily || "'Inter', sans-serif",
            color: theme?.textSec || '#666',
            letterSpacing: '0.15em',
            textTransform: 'uppercase'
          }}>OS</div>
        </div>
      )}
    </div>
  );
};

// Focus Modes Configuration
// Constants moved to src/constants/

// ICONS object kept in App.js (will be extracted later)
// ICONS moved to src/constants/icons.js

// PALETTE, THEMES, and DEFAULT_TAGS moved to src/constants/
// Helper functions moved to src/utils/

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap');

  :root {
    --ease: cubic-bezier(0.22, 1, 0.36, 1);
    --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-tap-highlight-color: transparent;
  }

  html {
    scroll-behavior: smooth;
    height: 100%;
    height: -webkit-fill-available;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    overflow: hidden;
    min-height: 100vh;
    min-height: -webkit-fill-available;
    overscroll-behavior: none;
    touch-action: manipulation;
  }

  /* Prevent pull-to-refresh */
  html, body {
    overscroll-behavior-y: contain;
  }

  /* Safari 100vh fix */
  @supports (-webkit-touch-callout: none) {
    .app-container {
      min-height: -webkit-fill-available;
    }
  }

  h1, h2, h3, h4, .serif {
    font-family: 'Playfair Display', serif;
    font-weight: 500;
    letter-spacing: -0.01em;
  }

  /* Hide scrollbars but keep functionality */
  ::-webkit-scrollbar {
    width: 0;
    height: 0;
    background: transparent;
  }

  * {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  /* Smooth inertial scrolling for touch devices */
  .scroll-container {
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
    overscroll-behavior: contain;
  }

  /* Prevent layout shift */
  img, svg {
    display: block;
    max-width: 100%;
  }

  /* GPU acceleration for smooth animations */
  .gpu-accelerated {
    transform: translateZ(0);
    backface-visibility: hidden;
    will-change: transform;
  }

  /* Smooth transitions for interactive elements */
  button, input, textarea, select {
    transition: all 0.2s var(--ease);
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

  @keyframes fadeInScale {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
    to {
      opacity: 1;
      transform: scale(1);
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

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .fade-enter {
    animation: fadeIn 0.3s var(--ease) forwards;
  }

  .scale-enter {
    animation: fadeInScale 0.25s var(--ease-out) forwards;
  }

  .slide-enter {
    animation: slideIn 0.2s var(--ease) forwards;
  }

  /* Liquid Glass Effects */
  .liquid-glass {
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
  }

  .liquid-card {
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    transition: all 0.3s var(--ease);
  }

  .liquid-card:hover {
    transform: translateY(-2px);
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  @keyframes glow {
    0%, 100% { box-shadow: 0 0 20px rgba(249, 115, 22, 0.2); }
    50% { box-shadow: 0 0 40px rgba(249, 115, 22, 0.4); }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-4px); }
  }

  .shimmer-effect {
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
  }

  .glow-effect {
    animation: glow 3s ease-in-out infinite;
  }

  .float-effect {
    animation: float 3s ease-in-out infinite;
  }

  /* Premium Button Styles */
  .btn-premium {
    position: relative;
    overflow: hidden;
    transition: all 0.3s var(--ease);
  }

  .btn-premium::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: left 0.5s;
  }

  .btn-premium:hover::before {
    left: 100%;
  }

  /* Focus mode transition */
  .focus-transition {
    transition: opacity 0.3s ease, filter 0.3s ease;
  }

  .focus-dimmed {
    opacity: 0.4;
    filter: grayscale(50%);
  }

  /* Mobile-specific styles */
  @media (max-width: 768px) {
    /* Hide sidebar on mobile by default */
    .sidebar-mobile-hidden {
      display: none !important;
    }

    /* Full-width content on mobile */
    .mobile-full-width {
      width: 100% !important;
      max-width: 100% !important;
    }

    /* Larger touch targets on mobile */
    button, .touchable {
      min-height: 44px;
      min-width: 44px;
    }

    /* Better input sizing */
    input, textarea, select {
      font-size: 16px !important; /* Prevents iOS zoom on focus */
    }

    /* Holidays grid responsive */
    .holidays-grid {
      grid-template-columns: repeat(3, 1fr) !important;
    }
    .holidays-grid .holiday-text {
      font-size: 9px !important;
    }
    .holidays-grid .holiday-date {
      font-size: 8px !important;
    }
    .holidays-grid .holiday-state {
      font-size: 7px !important;
    }
  }

  /* Small phone - 2 columns for holidays */
  @media (max-width: 480px) {
    .holidays-grid {
      grid-template-columns: repeat(2, 1fr) !important;
    }
    .holidays-grid .holiday-text {
      font-size: 9px !important;
    }
    .holidays-grid .holiday-date {
      font-size: 8px !important;
    }
    .holidays-grid .holiday-state {
      font-size: 7px !important;
    }
  }

  /* Ultrawide displays - scale up year view */
  @media (min-width: 1800px) {
    .year-view-container {
      padding: 0 20px !important;
    }
    .year-progress-bar {
      max-width: 1400px !important;
      padding: 12px 18px !important;
    }
    .year-calendar-grid {
      max-width: 1400px !important;
    }
    .holidays-section {
      max-width: 1400px !important;
    }
  }

  /* Small phone adjustments */
  @media (max-width: 375px) {
    .compact-mobile {
      padding: 12px !important;
    }
  }

  /* Tablet adjustments */
  @media (min-width: 769px) and (max-width: 1024px) {
    .tablet-optimize {
      padding: 16px;
    }
  }

  /* Prevent text selection on interactive elements */
  .no-select {
    -webkit-user-select: none;
    user-select: none;
  }

  /* Better touch feedback */
  .touch-feedback:active {
    opacity: 0.7;
    transform: scale(0.98);
    transition: all 0.1s ease;
  }

  /* Landscape mode adjustments */
  @media (orientation: landscape) and (max-height: 500px) {
    .landscape-compact {
      padding: 8px !important;
    }

    .landscape-hide {
      display: none !important;
    }
  }
`;

function TimelineOS() {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(() => {
    // Initialize from localStorage for demo mode
    const local = localSubscriptionManager.getLocalSubscription();
    return local || {
      plan: 'free',
      status: 'active',
      trialActive: false,
      features: SUBSCRIPTION_PLANS.FREE.features
    };
  });
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [nowTime, setNowTime] = useState(() => new Date()); // Separate state for current time display
  const [viewMode, setViewMode] = useState("year");
  const [context, setContext] = useState("personal");
  const [events, setEvents] = useState([]);
  const [deletedEvents, setDeletedEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [unifiedUpcoming, setUnifiedUpcoming] = useState([]); // All calendars combined
  const [allCalendarEvents, setAllCalendarEvents] = useState([]); // All non-deleted events for conflict detection
  const [tags, setTags] = useState(() => {
    try {
      const saved = localStorage.getItem('timeline_tags_v5');
      return saved ? JSON.parse(saved) : DEFAULT_TAGS;
    } catch {
      return DEFAULT_TAGS;
    }
  });
  
  const getCurrentTags = () => tags[context] || [];
  const getAllTags = () => [...(tags.personal || []), ...(tags.family || [])];

  // Helper functions (eventsOverlap, findConflicts) moved to src/utils/

  const [activeTagIds, setActiveTagIds] = useState(() => {
    return getCurrentTags().map(t => t.tagId);
  });
  
  const [quote, setQuote] = useState(() => {
    const firstQuote = MOTIVATIONAL_QUOTES[0];
    return typeof firstQuote === 'string'
      ? { text: firstQuote, author: null }
      : { text: firstQuote.text, author: firstQuote.author };
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [eventListOpen, setEventListOpen] = useState(false);
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
      selectedTheme: 'dark',
      use24Hour: false,
      blurPast: true,
      weekStartMon: true,
      showWeekNumbers: true,
      showSidebar: true,
      showMotivationalQuotes: true,
      showUpcomingEvents: true,
      enableDragDrop: true,
      enableAnimations: true,
      enablePulseEffects: true,
      showConflictNotifications: true,
      focusMode: 'normal'
    };
  });

  // Premium Features State
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState({ start: null, end: null });
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-Timer State (persists across views)
  const [timers, setTimers] = useState(() => {
    try {
      const saved = localStorage.getItem('timeline_timers');
      return saved ? JSON.parse(saved) : [
        { id: 1, name: 'Focus', seconds: 25 * 60, originalSeconds: 25 * 60, running: false, color: '#F97316', icon: 'Target' },
        { id: 2, name: 'Break', seconds: 5 * 60, originalSeconds: 5 * 60, running: false, color: '#10B981', icon: 'Coffee' }
      ];
    } catch {
      return [
        { id: 1, name: 'Focus', seconds: 25 * 60, originalSeconds: 25 * 60, running: false, color: '#F97316', icon: 'Target' },
        { id: 2, name: 'Break', seconds: 5 * 60, originalSeconds: 5 * 60, running: false, color: '#10B981', icon: 'Coffee' }
      ];
    }
  });
  const [floatingTimerVisible, setFloatingTimerVisible] = useState(false);
  const [customizingTimer, setCustomizingTimer] = useState(null);
  const timerIntervalsRef = useRef({});
  const notificationTimeoutsRef = useRef(new Set());

  // Centralized Goals State (persists across views)
  const [goals, setGoals] = useState(() => {
    try {
      const saved = localStorage.getItem('timeline_goals');
      return saved ? JSON.parse(saved) : [
        { id: 1, text: 'Morning routine', done: false },
        { id: 2, text: 'Deep work session', done: false },
        { id: 3, text: 'Exercise', done: false }
      ];
    } catch {
      return [
        { id: 1, text: 'Morning routine', done: false },
        { id: 2, text: 'Deep work session', done: false },
        { id: 3, text: 'Exercise', done: false }
      ];
    }
  });
  const [newGoal, setNewGoal] = useState('');

  // Calculate goals progress
  const goalsCompleted = goals.filter(g => g.done).length;
  const goalsProgress = goals.length > 0 ? Math.round((goalsCompleted / goals.length) * 100) : 0;

  // Multi-Timer Effect - manages all timers globally
  useEffect(() => {
    const intervals = timerIntervalsRef.current;

    // Clear all existing intervals first
    Object.values(intervals).forEach(clearInterval);
    Object.keys(intervals).forEach(key => delete intervals[key]);

    // Set up intervals for running timers
    timers.forEach(timer => {
      if (timer.running && timer.seconds > 0) {
        intervals[timer.id] = setInterval(() => {
          setTimers(prev => {
            const updated = prev.map(t => {
              if (t.id === timer.id) {
                const newSeconds = t.seconds - 1;
                if (newSeconds <= 0) {
                  // Timer complete - play notification sound
                  try {
                    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQEAStPx6IpkDwBM2ezqh3EJAFXZ7OiDcQ0AW9fr5Xp0DABV2OrnfXUNAFjX6uZ9dAwAWNfq5n10DABZ1+rmfXQMAFnX6uZ9dAwA');
                    audio.volume = 0.5;
                    audio.play().catch(() => {});
                  } catch {}
                  return { ...t, seconds: 0, running: false };
                }
                return { ...t, seconds: newSeconds };
              }
              return t;
            });
            localStorage.setItem('timeline_timers', JSON.stringify(updated));
            return updated;
          });
        }, 1000);
      }
    });

    return () => {
      Object.values(intervals).forEach(clearInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timers]);

  // Persist timers to localStorage when they change (non-running updates)
  useEffect(() => {
    localStorage.setItem('timeline_timers', JSON.stringify(timers));
  }, [timers]);

  // Persist goals to localStorage
  useEffect(() => {
    localStorage.setItem('timeline_goals', JSON.stringify(goals));
  }, [goals]);

  // Set document title
  useEffect(() => {
    document.title = APP_META.name;
  }, []);

  // Timer helpers
  const formatTimer = (secs) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleTimer = (id) => {
    setTimers(prev => prev.map(t => t.id === id ? { ...t, running: !t.running } : t));
  };

  const resetTimer = (id) => {
    setTimers(prev => prev.map(t => t.id === id ? { ...t, seconds: t.originalSeconds, running: false } : t));
  };

  const updateTimer = (id, updates) => {
    setTimers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const addTimer = (name = 'New Timer', minutes = 25, color = null, icon = 'Clock') => {
    const colors = ['#F97316', '#10B981', '#6366F1', '#EC4899', '#F59E0B', '#14B8A6'];
    const newTimer = {
      id: Date.now(),
      name,
      seconds: minutes * 60,
      originalSeconds: minutes * 60,
      running: false,
      color: color || colors[timers.length % colors.length],
      icon: icon
    };
    setTimers(prev => [...prev, newTimer]);
  };

  const addTimerFromPreset = (preset) => {
    addTimer(preset.name, preset.mins, preset.color, preset.icon);
  };

  const removeTimer = (id) => {
    if (timerIntervalsRef.current[id]) {
      clearInterval(timerIntervalsRef.current[id]);
      delete timerIntervalsRef.current[id];
    }
    setTimers(prev => prev.filter(t => t.id !== id));
  };

  const toggleGoal = (id) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, done: !g.done } : g));
  };

  const addGoal = () => {
    if (newGoal.trim()) {
      setGoals(prev => [...prev, { id: Date.now(), text: newGoal.trim(), done: false }]);
      setNewGoal('');
    }
  };

  const removeGoal = (id) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  // Get running timers count for floating indicator
  const runningTimersCount = timers.filter(t => t.running).length;

  // Current focus mode
  const currentFocusMode = FOCUS_MODES[config.focusMode] || FOCUS_MODES.normal;

  const scrollRef = useRef(null);
  const theme = THEMES[config.selectedTheme] || (config.darkMode ? THEMES.dark : THEMES.light);
  const accentColor = context === 'family' ? theme.familyAccent : theme.accent;

  // Calculate week start date for header display
  const weekStartDate = useMemo(() => {
    const start = new Date(currentDate);
    const dayOfWeek = start.getDay();
    const diff = start.getDate() - dayOfWeek + (config.weekStartMon ? (dayOfWeek === 0 ? -6 : 1) : 0);
    start.setDate(diff);
    return start;
  }, [currentDate, config.weekStartMon]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
  
  // Use curated local quotes (365+ from world's greatest minds)
  const fetchLiveQuote = useCallback(() => {
    const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    // Handle both old format (string) and new format (object with text/author)
    if (typeof randomQuote === 'string') {
      setQuote({ text: randomQuote, author: null });
    } else {
      setQuote({ text: randomQuote.text, author: randomQuote.author });
    }
  }, []);

  useEffect(() => {
    const nowInterval = setInterval(() => setNowTime(new Date()), 60000);

    // Fetch initial quote
    if (config.showMotivationalQuotes) {
      fetchLiveQuote();
    }

    // Refresh quote every 4 hours
    const quoteInterval = setInterval(() => {
      if (config.showMotivationalQuotes) {
        fetchLiveQuote();
      }
    }, APP_META.quoteInterval);

    return () => {
      clearInterval(nowInterval);
      clearInterval(quoteInterval);
    };
  }, [config.showMotivationalQuotes, fetchLiveQuote]);
  
  const loadData = useCallback(async (u) => {
    const loadStartTime = performance.now();

    // Generate unique request ID to prevent race conditions
    const requestId = ++loadRequestIdRef.current;
    const isCurrentRequest = () => loadRequestIdRef.current === requestId;

    setLoading(true);

    // Set a maximum time for loading - only affects loading indicator, not data
    // Increased to 20s to allow for Supabase cold starts
    const loadTimeout = setTimeout(() => {
      if (isCurrentRequest()) {
        console.warn('Loading timeout - showing app with current data');
        setLoading(false);
      }
    }, 20000);

    try {
      // Load events from Supabase
      const eventsStartTime = performance.now();
      const eventsPromise = loadEvents(u.uid);
      const eventsResult = await Promise.race([
        eventsPromise,
        new Promise((resolve) => setTimeout(() => resolve({ data: [], error: 'timeout' }), 15000))
      ]);
      const eventsEndTime = performance.now();

      // Skip state updates if this request is stale
      if (!isCurrentRequest()) return;

      if (eventsResult.error) {
        console.error("Error loading events:", eventsResult.error);
        setEvents([]);
        setDeletedEvents([]);
      } else {
        setEvents(eventsResult.data.filter(e => !e.deleted));
        setDeletedEvents(eventsResult.data.filter(e => e.deleted));

        // Record performance
        recordPerformance('loadEvents', eventsEndTime - eventsStartTime, {
          eventCount: eventsResult.data?.length || 0
        });
      }

      // Load tags from Supabase
      const tagsStartTime = performance.now();
      const tagsPromise = loadTags(u.uid);
      const tagsResult = await Promise.race([
        tagsPromise,
        new Promise((resolve) => setTimeout(() => resolve({ data: [], error: 'timeout' }), 15000))
      ]);
      const tagsEndTime = performance.now();

      // Skip state updates if this request is stale
      if (!isCurrentRequest()) return;

      if (tagsResult.error) {
        console.error("Error loading tags:", tagsResult.error);
        // Use DEFAULT_TAGS as fallback so UI still works
        setTags(DEFAULT_TAGS);
        // Note: Events won't save to DB without proper tags, but UI will be functional
      } else {

        // If no tags exist, initialize with defaults
        if (!tagsResult.data || tagsResult.data.length === 0) {
          // Create default tags - extract only needed properties (don't pass 'id')
          const defaultTagsToCreate = [
            ...DEFAULT_TAGS.personal.map(t => ({
              tagId: t.tagId,
              name: t.name,
              iconName: t.iconName,
              context: 'personal',
              color: t.color,
              bgColor: t.bgColor,
              textColor: t.textColor,
              borderColor: t.borderColor
            })),
            ...DEFAULT_TAGS.family.map(t => ({
              tagId: t.tagId,
              name: t.name,
              iconName: t.iconName,
              context: 'family',
              color: t.color,
              bgColor: t.bgColor,
              textColor: t.textColor,
              borderColor: t.borderColor
            }))
          ];

          // Create tags in parallel
          const createPromises = defaultTagsToCreate.map(tag =>
            createTag(u.uid, tag)
          );

          const createdTags = await Promise.all(createPromises);

          // Skip if request is stale after async tag creation
          if (!isCurrentRequest()) return;

          const successfulTags = createdTags
            .filter(result => result.data)
            .map(result => result.data);

          const failedTags = createdTags.filter(result => result.error);
          if (failedTags.length > 0) {
            console.error('Failed to create some tags:', failedTags.length);
          }

          const tagsByContext = {
            personal: successfulTags.filter(t => t.context === 'personal'),
            family: successfulTags.filter(t => t.context === 'family')
          };
          setTags(tagsByContext);
        } else {
          const tagsByContext = {
            personal: tagsResult.data.filter(t => t.context === 'personal'),
            family: tagsResult.data.filter(t => t.context === 'family')
          };
          setTags(tagsByContext);
        }

        // Record performance
        recordPerformance('loadTags', tagsEndTime - tagsStartTime, {
          tagCount: tagsResult.data?.length || 0
        });
      }

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      clearTimeout(loadTimeout);

      // Only update loading state if this is still the current request
      if (isCurrentRequest()) {
        const loadEndTime = performance.now();
        const totalLoadTime = loadEndTime - loadStartTime;

        // Record total load performance
        recordPerformance('loadData', totalLoadTime, {
          success: true
        });

        setLoading(false);
      }
    }
  }, []);
  
  useEffect(() => {
    let subscription;

    const setupAuth = async () => {
      try {
        // If URL has OAuth tokens, let Supabase process them first
        const hasOAuthCallback = window.location.hash && window.location.hash.includes('access_token');
        if (hasOAuthCallback) {
          // Let Supabase exchange the hash tokens for a session
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // First check if there's an existing session
        const { data: { session } } = await supabase.auth.getSession();

        // Clean up URL after session is established (removes ugly tokens from address bar)
        if (hasOAuthCallback) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (session?.user) {
          setUser({
            uid: session.user.id,
            email: session.user.email,
            displayName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
            photoURL: session.user.user_metadata?.avatar_url
          });
          loadData({ uid: session.user.id });
        } else {
          setUser(null);
          setLoading(false);
        }

        // Then listen for changes - but only reload on actual sign-in, not token refresh
        subscription = onAuthStateChange(async (event, session) => {
          const user = session?.user || null;

          if (user) {
            setUser({
              uid: user.id,
              email: user.email,
              displayName: user.user_metadata?.full_name || user.email?.split('@')[0],
              photoURL: user.user_metadata?.avatar_url
            });
            // Only reload data on actual sign-in events, not token refresh
            // TOKEN_REFRESHED fires periodically and causes unwanted reloads
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
              loadData({ uid: user.id });
            }
          } else {
            setUser(null);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('[Auth Setup] Error:', error);
        setLoading(false);
      }
    };

    setupAuth();

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [loadData]);

  // Reload data when user returns to the app (only if away for >60s, no loading flash)
  const lastLoadTimeRef = useRef(Date.now());
  const loadRequestIdRef = useRef(0); // Track current load request to prevent race conditions
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        const elapsed = Date.now() - lastLoadTimeRef.current;
        if (elapsed > 60000) {
          lastLoadTimeRef.current = Date.now();
          // Silently reload without showing loading state
          (async () => {
            try {
              const [eventsResult, tagsResult] = await Promise.all([
                loadEvents(user.uid),
                loadTags(user.uid)
              ]);
              if (!eventsResult.error && eventsResult.data) {
                setEvents(eventsResult.data.filter(e => !e.deleted));
                setDeletedEvents(eventsResult.data.filter(e => e.deleted));
              }
              if (!tagsResult.error && tagsResult.data) {
                setTags({
                  personal: tagsResult.data.filter(t => t.context === 'personal'),
                  family: tagsResult.data.filter(t => t.context === 'family')
                });
              }
            } catch (err) {
              console.error('Background refresh error:', err);
            }
          })();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  useEffect(() => {
    localStorage.setItem('timeline_v5_cfg', JSON.stringify(config));
  }, [config]);
  
  useEffect(() => {
    const currentTags = tags[context] || [];
    // Only update if we have tags to prevent flashing empty state
    if (currentTags.length > 0) {
      setActiveTagIds(currentTags.map(t => t.tagId));
    }
  }, [context, tags]);
  
  useEffect(() => {
    const filterStartTime = performance.now();
    const currentFocus = FOCUS_MODES[config.focusMode] || FOCUS_MODES.normal;
    const searchLower = searchQuery.toLowerCase().trim();

    const filtered = events.filter(e => {
      const matchesContext = e.context === context;
      const matchesCategory = activeTagIds.length === 0 || activeTagIds.includes(e.category);
      // Apply Focus Mode filter - if focus mode has a filter array, only show matching categories
      const matchesFocusMode = !currentFocus.filter || currentFocus.filter.includes(e.category);
      // Apply search filter - search in title, description, and notes
      const matchesSearch = !searchLower ||
        (e.title && e.title.toLowerCase().includes(searchLower)) ||
        (e.description && e.description.toLowerCase().includes(searchLower)) ||
        (e.notes && e.notes.toLowerCase().includes(searchLower));
      return matchesContext && matchesCategory && matchesFocusMode && matchesSearch && !e.deleted;
    });
    const filterEndTime = performance.now();

    // Record filter performance
    recordPerformance('eventFilter', filterEndTime - filterStartTime, {
      eventCount: events.length,
      filteredCount: filtered.length,
      hasSearch: searchLower.length > 0
    });

    // Run runtime guards on filtered events
    // TODO: High event count detected - consider implementing virtualization for performance
    // TODO: Optimize O(n²) conflict detection algorithm with interval tree or sweep line
    if (filtered.length > 0) {
      runAllGuards(filtered, context);
    }

    setFilteredEvents(filtered);

    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Unified upcoming events from ALL calendars (personal + family)
    const allNonDeleted = events.filter(e => !e.deleted);
    setAllCalendarEvents(allNonDeleted);

    const unifiedUp = allNonDeleted
      .filter(e => new Date(e.start) >= now && new Date(e.start) <= nextWeek)
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 8);
    setUnifiedUpcoming(unifiedUp);
  }, [events, context, activeTagIds, config.focusMode, searchQuery]);

  // Initialize instrumentation (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      initInstrumentation().then(loaded => {
        if (loaded) {
          console.log('[App] Instrumentation loaded');
        }
      });
    }
  }, []);

  // Internal agent loop - analyzes performance and anomalies periodically
  // TODO: Agent loop running - monitors performance bottlenecks and data integrity
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    // Run analysis every 30 seconds
    const analysisInterval = setInterval(() => {
      runAnalysisCycle();
    }, 30000);

    // Run initial analysis after 5 seconds
    const initialAnalysis = setTimeout(() => {
      runAnalysisCycle();
    }, 5000);

    return () => {
      clearInterval(analysisInterval);
      clearTimeout(initialAnalysis);
    };
  }, []);

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
  
  // TODO: Add client-side validation to prevent overlapping events before save
  // TODO: Consider optimistic updates for better perceived performance
  const handleSaveEvent = async (data) => {
    const saveStartTime = performance.now();

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
        title: data.title.trim(),
        category: data.category,
        context: context,
        description: data.description?.trim() || "",
        location: data.location?.trim() || "",
        start: start.toISOString(),
        end: end.toISOString(),
        recurrencePattern: data.recurrencePattern || 'none',
        recurrenceEndDate: data.recurrenceEndDate || null
      };

      let result;
      if (data.id) {
        result = await updateEvent(data.id, user.uid, eventData);
        if (result.error) throw result.error;
        notify("Event updated", "success");
      } else {
        result = await createEvent(user.uid, eventData);
        if (result.error) throw result.error;

        // Generate recurring instances if pattern is set
        if (eventData.recurrencePattern && eventData.recurrencePattern !== 'none') {
          const { error: recError } = await createRecurringInstances(user.uid, result.data);
          if (recError) {
            console.error('Error creating recurring instances:', recError);
            notify("Event created but recurring instances failed", "warning");
          } else {
            notify("Recurring events created", "success");
          }
        } else {
          notify("Event created", "success");
        }
      }

      setModalOpen(false);
      loadData(user);

      const saveEndTime = performance.now();
      recordPerformance('handleSaveEvent', saveEndTime - saveStartTime, {
        isUpdate: !!data.id
      });

    } catch (error) {
      console.error("Error saving event:", error);
      const msg = error?.message || error?.details || 'Unknown error';
      notify(`Failed to save event: ${msg}`, "error");

      const saveEndTime = performance.now();
      recordPerformance('handleSaveEvent', saveEndTime - saveStartTime, {
        isUpdate: !!data.id,
        failed: true
      });
    }
  };
  
  const softDeleteEvent = async (id) => {
    if (!window.confirm("Move this event to trash?")) return;

    try {
      const { error } = await deleteEvent(id, user.uid);

      if (error) throw error;

      setModalOpen(false);
      loadData(user);
      notify("Moved to trash", "info");
    } catch (error) {
      console.error("Error deleting event:", error);
      notify("Failed to delete event", "error");
    }
  };

  const bulkDeleteRecurringEvents = async (options = {}) => {
    if (!user) return;
    const { onlyNoExpiry = false } = options;
    const recurring = events.filter(e => {
      if (!e.recurrencePattern || e.recurrencePattern === 'none') return false;
      if (onlyNoExpiry && e.recurrenceEndDate) return false;
      return true;
    });
    if (recurring.length === 0) {
      notify('No recurring events found', 'info');
      return;
    }
    if (!window.confirm(`Delete ${recurring.length} recurring event${recurring.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
    try {
      for (const event of recurring) {
        await deleteEvent(event.id, user.uid);
      }
      await loadData(user);
      notify(`Deleted ${recurring.length} recurring event${recurring.length > 1 ? 's' : ''}`, 'info');
    } catch (error) {
      console.error('Error bulk deleting recurring events:', error);
      notify('Failed to delete some events', 'error');
    }
  };

  // TODO: Implement optimistic updates to prevent event "jumping" during drag
  // TODO: Add visual feedback during drag to show potential conflicts
  const handleEventDrag = useCallback(async (eventId, newStart, newEnd) => {
    const dragStartTime = performance.now();

    if (!user) return;

    try {
      const { error } = await updateEvent(eventId, user.uid, {
        start: newStart.toISOString(),
        end: newEnd.toISOString()
      });

      if (error) throw error;

      loadData(user);
      notify("Event rescheduled", "success");

      const dragEndTime = performance.now();
      recordPerformance('handleEventDrag', dragEndTime - dragStartTime, {
        eventId
      });
    } catch (error) {
      console.error("Error rescheduling event:", error);
      notify("Failed to reschedule event", "error");

      const dragEndTime = performance.now();
      recordPerformance('handleEventDrag', dragEndTime - dragStartTime, {
        eventId,
        failed: true
      });
    }
  }, [user, loadData]);
  
  const restoreEvent = async (id) => {
    try {
      const { error } = await restoreSupabaseEvent(id, user.uid);

      if (error) throw error;

      loadData(user);
      notify("Event restored", "success");
    } catch (error) {
      console.error("Error restoring event:", error);
      notify("Failed to restore event", "error");
    }
  };
  
  const hardDeleteEvent = async (id) => {
    if (!window.confirm("Permanently delete this event?")) return;

    try {
      const { error } = await permanentlyDeleteEvent(id, user.uid);

      if (error) throw error;

      loadData(user);
      notify("Permanently deleted", "info");
    } catch (error) {
      console.error("Error permanently deleting event:", error);
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

    const timeoutId = setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
      notificationTimeoutsRef.current.delete(timeoutId);
    }, 3000);
    notificationTimeoutsRef.current.add(timeoutId);
  };

  // Cleanup notification timeouts on unmount
  useEffect(() => {
    const timeouts = notificationTimeoutsRef.current;
    return () => {
      timeouts.forEach(id => clearTimeout(id));
    };
  }, []);
  
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
    return <AuthScreen
      onLogin={signInWithGoogle}
      onEmailLogin={signInWithEmail}
      onEmailSignUp={signUpWithEmail}
      onPasswordLogin={signInWithPassword}
      theme={theme}
    />;
  }

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      background: theme.bg,
      color: theme.text,
      fontFamily: theme.fontFamily,
      overflow: "hidden"
    }}>
      {config.showSidebar && (
        <aside style={{
          width: LAYOUT.SIDEBAR_WIDTH,
          background: config.darkMode
            ? (theme.premiumGlass || `linear-gradient(135deg, ${theme.bg} 0%, ${theme.sidebar} 100%)`)
            : (theme.premiumGlass || theme.sidebar),
          backdropFilter: theme.glassBlur || 'blur(32px)',
          WebkitBackdropFilter: theme.glassBlur || 'blur(32px)',
          borderRight: `1px solid ${theme.premiumGlassBorder || theme.liquidBorder}`,
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
          boxShadow: theme.premiumShadow || (config.darkMode
            ? 'inset -1px 0 0 rgba(255,255,255,0.03)'
            : 'none')
        }}>
          {/* Fixed Header Section */}
          <div style={{
            padding: "20px 20px 0 20px",
            flexShrink: 0
          }}>
          {/* Premium Header with Logo */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <AppLogo size={36} theme={theme} showText={true} />
              <div style={{ display: 'flex', gap: 6 }}>
                {/* Timer Icon Button */}
                <button
                  onClick={() => setFloatingTimerVisible(!floatingTimerVisible)}
                  title={runningTimersCount > 0 ? `${formatTimer(timers.find(t => t.running)?.seconds || 0)} - ${timers.find(t => t.running)?.name}` : 'Timer'}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: runningTimersCount > 0 ? `${timers.find(t => t.running)?.color || theme.accent}20` : theme.hoverBg,
                    border: runningTimersCount > 0 ? `1px solid ${timers.find(t => t.running)?.color || theme.accent}40` : `1px solid ${theme.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    color: runningTimersCount > 0 ? timers.find(t => t.running)?.color || theme.accent : theme.textMuted,
                    position: 'relative'
                  }}
                >
                  <ICONS.Timer width={14} height={14} />
                  {runningTimersCount > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: -2,
                      right: -2,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: timers.find(t => t.running)?.color || theme.accent,
                      border: `2px solid ${config.darkMode ? theme.sidebar : '#fff'}`,
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }} />
                  )}
                </button>
                {/* Focus Mode Button */}
                <button
                  onClick={() => {
                    const modes = Object.keys(FOCUS_MODES);
                    const idx = modes.indexOf(config.focusMode);
                    const next = modes[(idx + 1) % modes.length];
                    setConfig(c => ({ ...c, focusMode: next }));
                  }}
                  title={`Focus: ${currentFocusMode.name}`}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: config.focusMode !== 'normal' ? `${accentColor}20` : theme.hoverBg,
                    border: config.focusMode !== 'normal' ? `1px solid ${accentColor}40` : `1px solid ${theme.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: config.focusMode !== 'normal' ? accentColor : theme.textMuted
                  }}
                >
                  <ICONS.Target width={14} height={14} />
                </button>
                {/* Insights Button */}
                <button
                  onClick={() => setInsightsOpen(true)}
                  title="Insights"
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: theme.hoverBg,
                    border: `1px solid ${theme.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: theme.textMuted
                  }}
                >
                  <ICONS.TrendingUp width={14} height={14} />
                </button>
              </div>
            </div>
            <div style={{
              fontSize: 12,
              color: theme.textSec,
              marginBottom: 4,
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              fontWeight: 500,
              letterSpacing: '0.01em'
            }}>
              Welcome, {user.displayName?.split(" ")[0] || 'User'}
            </div>
            {config.showMotivationalQuotes && quote && (
              <div style={{
                fontSize: 11,
                color: theme.textMuted,
                fontStyle: "italic",
                lineHeight: 1.5,
                maxWidth: 280,
                letterSpacing: '0.01em',
                fontFamily: theme.fontDisplay
              }}>
                "{quote.text}"
                {quote.author && <span style={{ fontStyle: 'normal', opacity: 0.7 }}> — {quote.author}</span>}
              </div>
            )}
          </div>
          </div>

          {/* Scrollable Content Area */}
          <div
            className="sidebar-scroll"
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              padding: "0 20px",
              scrollbarWidth: "thin",
              scrollbarColor: `${theme.border} transparent`
            }}
          >
          {/* Focus Mode Banner - Shows when not in normal mode */}
          {config.focusMode !== 'normal' && (
            <div style={{
              marginBottom: 16,
              padding: '10px 14px',
              background: `linear-gradient(135deg, ${accentColor}15 0%, ${accentColor}08 100%)`,
              borderRadius: 10,
              border: `1px solid ${accentColor}30`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `${accentColor}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {currentFocusMode.icon && ICONS[currentFocusMode.icon] ? (
                  React.createElement(ICONS[currentFocusMode.icon], {
                    width: 16, height: 16, style: { color: accentColor }
                  })
                ) : (
                  <ICONS.Target width={16} height={16} style={{ color: accentColor }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: accentColor,
                  marginBottom: 2,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  letterSpacing: '0.01em'
                }}>
                  {currentFocusMode.name}
                </div>
                <div style={{
                  fontSize: 10,
                  color: theme.textMuted,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  fontWeight: 500
                }}>
                  {currentFocusMode.id === 'work' && 'Showing work events only'}
                  {currentFocusMode.id === 'personal' && 'Showing personal events'}
                  {currentFocusMode.id === 'minimal' && 'Distraction-free view'}
                </div>
              </div>
              <button
                onClick={() => setConfig(c => ({ ...c, focusMode: 'normal' }))}
                style={{
                  padding: '5px 10px',
                  fontSize: 10,
                  fontWeight: 600,
                  background: config.darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  color: theme.textSec,
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Exit
              </button>
            </div>
          )}

          {/* Search Bar */}
          <div style={{
            marginBottom: 16,
            display: 'flex',
            gap: 8
          }}>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              background: theme.hoverBg,
              borderRadius: 8,
              border: `1px solid ${theme.border}`
            }}>
              <ICONS.Calendar width={14} height={14} style={{ color: theme.textMuted }} />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  flex: 1, border: 'none', background: 'transparent',
                  color: theme.text, fontSize: 12, outline: 'none',
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  fontWeight: 500
                }}
              />
            </div>
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              style={{
                width: 36, height: 36, borderRadius: 8,
                background: filterOpen || dateFilter.start ? `${accentColor}15` : theme.hoverBg,
                border: `1px solid ${filterOpen || dateFilter.start ? accentColor : theme.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: filterOpen || dateFilter.start ? accentColor : theme.textMuted
              }}
            >
              <ICONS.Settings width={14} height={14} />
            </button>
          </div>

          {/* Filter Panel */}
          {filterOpen && (
            <div style={{
              marginBottom: 16,
              padding: 12,
              background: theme.card,
              borderRadius: 10,
              border: `1px solid ${theme.border}`
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: theme.text, marginBottom: 10, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", letterSpacing: '0.02em' }}>Filter by Date</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  type="date"
                  value={dateFilter.start || ''}
                  onChange={e => setDateFilter(f => ({ ...f, start: e.target.value }))}
                  style={{
                    flex: 1, padding: '6px 8px', fontSize: 11,
                    background: theme.bg, border: `1px solid ${theme.border}`,
                    borderRadius: 6, color: theme.text, outline: 'none'
                  }}
                />
                <input
                  type="date"
                  value={dateFilter.end || ''}
                  onChange={e => setDateFilter(f => ({ ...f, end: e.target.value }))}
                  style={{
                    flex: 1, padding: '6px 8px', fontSize: 11,
                    background: theme.bg, border: `1px solid ${theme.border}`,
                    borderRadius: 6, color: theme.text, outline: 'none'
                  }}
                />
              </div>
              <button
                onClick={() => { setDateFilter({ start: null, end: null }); setFilterOpen(false); }}
                style={{
                  width: '100%', padding: '6px', fontSize: 11,
                  background: theme.hoverBg, border: `1px solid ${theme.border}`,
                  borderRadius: 6, color: theme.textSec, cursor: 'pointer'
                }}
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Bulk Actions Bar */}
          {bulkMode && selectedEvents.length > 0 && (
            <div style={{
              marginBottom: 16,
              padding: 10,
              background: `${accentColor}15`,
              borderRadius: 10,
              border: `1px solid ${accentColor}40`
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: accentColor, marginBottom: 8 }}>
                {selectedEvents.length} events selected
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{
                  flex: 1, padding: '6px', fontSize: 10, fontWeight: 600,
                  background: theme.indicator, color: '#fff', border: 'none',
                  borderRadius: 6, cursor: 'pointer'
                }}>Delete All</button>
                <button
                  onClick={() => { setSelectedEvents([]); setBulkMode(false); }}
                  style={{
                    padding: '6px 10px', fontSize: 10,
                    background: 'transparent', color: theme.textSec,
                    border: `1px solid ${theme.border}`, borderRadius: 6, cursor: 'pointer'
                  }}
                >Cancel</button>
              </div>
            </div>
          )}
          
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
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                letterSpacing: '0.02em',
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
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                letterSpacing: '0.02em',
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
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              letterSpacing: '0.02em',
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
          
          {config.showUpcomingEvents && unifiedUpcoming.length > 0 && (
            <div style={{
              marginBottom: 16,
              maxHeight: 200,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column"
            }}>
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                color: theme.textMuted,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                marginBottom: 8,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
              }}>
                <span>Unified Schedule</span>
                <span style={{
                  fontSize: 8,
                  fontWeight: 500,
                  color: theme.textMuted,
                  textTransform: 'none',
                  letterSpacing: 0
                }}>All Calendars</span>
              </div>
              <div style={{
                flex: 1,
                overflowY: "auto"
              }}>
                {unifiedUpcoming.map(event => {
                  const allTags = getAllTags();
                  const tag = allTags.find(t => t.tagId === event.category) || allTags[0];
                  const eventDate = new Date(event.start);
                  const isToday = eventDate.toDateString() === new Date().toDateString();
                  const isFamily = event.context === 'family';
                  const isOtherCalendar = event.context !== context;
                  // Find conflicts - events overlapping this one
                  const conflicts = findConflicts(event, allCalendarEvents);
                  const hasConflict = conflicts.length > 0;

                  return (
                    <div
                      key={event.id}
                      onClick={() => {
                        // Switch context if clicking event from other calendar
                        if (isOtherCalendar) setContext(event.context);
                        setEditingEvent(event);
                        setModalOpen(true);
                      }}
                      style={{
                        padding: "7px 8px",
                        marginBottom: 5,
                        borderRadius: 6,
                        background: isOtherCalendar ? `${isFamily ? theme.familyAccent : theme.accent}08` : theme.hoverBg,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        borderLeft: `2px solid ${tag?.color || (isFamily ? theme.familyAccent : theme.accent)}`,
                        position: 'relative'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = isOtherCalendar
                          ? `${isFamily ? theme.familyAccent : theme.accent}15`
                          : theme.activeBg;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = isOtherCalendar
                          ? `${isFamily ? theme.familyAccent : theme.accent}08`
                          : theme.hoverBg;
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 2
                      }}>
                        {/* Calendar indicator */}
                        <span style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: isFamily ? theme.familyAccent : theme.accent,
                          flexShrink: 0
                        }} />
                        <div style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: theme.text,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1
                        }}>
                          {event.title || 'Untitled'}
                        </div>
                        {/* Conflict indicator */}
                        {hasConflict && config.showConflictNotifications && (
                          <span
                            title={`Overlaps with: ${conflicts.map(c => c.title || 'Untitled').join(', ')}`}
                            style={{
                              fontSize: 8,
                              padding: '2px 4px',
                              background: theme.indicator + '20',
                              color: theme.indicator,
                              borderRadius: 3,
                              fontWeight: 700,
                              flexShrink: 0
                            }}
                          >
                            BUSY
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 9,
                        color: theme.textSec,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{
                            fontWeight: 600,
                            color: isToday ? theme.accent : theme.textSec
                          }}>
                            {isToday ? 'Today' : eventDate.toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                          {/* Calendar label for other calendar events */}
                          {isOtherCalendar && (
                            <span style={{
                              fontSize: 8,
                              padding: '1px 4px',
                              background: `${isFamily ? theme.familyAccent : theme.accent}20`,
                              color: isFamily ? theme.familyAccent : theme.accent,
                              borderRadius: 3,
                              fontWeight: 600
                            }}>
                              {isFamily ? 'Family' : 'Personal'}
                            </span>
                          )}
                        </div>
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
            
            {/* Compact horizontal tag pills */}
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 12
            }}>
              {currentTags.map(tag => {
                const isActive = activeTagIds.includes(tag.tagId);

                return (
                  <button
                    key={tag.id}
                    onClick={() => {
                      setActiveTagIds(prev =>
                        prev.includes(tag.tagId)
                          ? prev.filter(id => id !== tag.tagId)
                          : [...prev, tag.tagId]
                      );
                    }}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 16,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      background: isActive
                        ? `${tag.color}18`
                        : config.darkMode
                          ? 'rgba(255, 255, 255, 0.04)'
                          : 'rgba(255, 255, 255, 0.7)',
                      border: isActive
                        ? `1px solid ${tag.color}40`
                        : `1px solid ${config.darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                      transition: "all 0.15s ease",
                      fontSize: 10,
                      fontWeight: 600,
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                      color: isActive ? tag.color : theme.textSec,
                      lineHeight: 1
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = tag.color + '30';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = config.darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
                      }
                    }}
                  >
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: tag.color,
                      flexShrink: 0
                    }} />
                    <span>{tag.name}</span>
                  </button>
                );
              })}

              {/* Clear toggle */}
              <button
                onClick={() => {
                  const allTagIds = currentTags.map(t => t.id);
                  setActiveTagIds(activeTagIds.length === allTagIds.length ? [] : allTagIds);
                }}
                style={{
                  padding: "5px 10px",
                  borderRadius: 16,
                  border: `1px dashed ${config.darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
                  background: "transparent",
                  color: theme.textMuted,
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  lineHeight: 1
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderStyle = 'solid';
                  e.currentTarget.style.color = theme.textSec;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderStyle = 'dashed';
                  e.currentTarget.style.color = theme.textMuted;
                }}
              >
                {activeTagIds.length === currentTags.length ? "Clear" : "All"}
              </button>
            </div>
          </div>
          </div>

          {/* Fixed Footer Section */}
          <div style={{
            padding: "0 20px 20px 20px",
            flexShrink: 0
          }}>
          <div style={{
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
          </div>
        </aside>
      )}
      
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{
          height: LAYOUT.HEADER_HEIGHT,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          borderBottom: `1px solid ${theme.premiumGlassBorder || theme.border}`,
          background: theme.premiumGlass || theme.liquidGlass,
          backdropFilter: theme.glassBlur || 'blur(32px)',
          WebkitBackdropFilter: theme.glassBlur || 'blur(32px)',
          boxShadow: theme.metallicShadow || theme.premiumShadow,
          flexShrink: 0,
          position: 'relative',
          zIndex: 10
        }}>
          {/* Left Section - Date & Navigation */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
            {viewMode !== 'day' && (
              <h2 style={{
                fontSize: 28,
                fontWeight: 600,
                fontFamily: theme.fontDisplay,
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {viewMode === 'year'
                  ? currentDate.getFullYear()
                  : viewMode === 'month'
                  ? `${config.showWeekNumbers ? `W${getWeekNumber(currentDate)} · ` : ''}${currentDate.toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}`
                  : viewMode === 'week'
                  ? `${config.showWeekNumbers ? `W${getWeekNumber(weekStartDate)} · ` : ''}Week of ${weekStartDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}`
                  : ''
                }
              </h2>
            )}

            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => navigateDate(-1)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: `1px solid ${theme.premiumGlassBorder || theme.border}`,
                  background: theme.metallicGradient || theme.card,
                  color: theme.text,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  boxShadow: theme.metallicShadow || theme.shadow
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = theme.metallicGradientHover || theme.hoverBg;
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = theme.metallicGradient || theme.card;
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <ICONS.ChevronLeft width={16} height={16} />
              </button>

              <button
                onClick={goToToday}
                style={{
                  padding: "0 14px",
                  height: 30,
                  borderRadius: 15,
                  border: `1px solid ${theme.premiumGlassBorder || theme.border}`,
                  background: theme.chromeGradient || theme.card,
                  color: theme.text,
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  letterSpacing: '0.02em',
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: theme.metallicShadow || theme.shadow
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = theme.metallicGradientHover || theme.hoverBg;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = theme.chromeGradient || theme.card;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Today
              </button>

              <button
                onClick={() => navigateDate(1)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: `1px solid ${theme.premiumGlassBorder || theme.border}`,
                  background: theme.metallicGradient || theme.card,
                  color: theme.text,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  boxShadow: theme.metallicShadow || theme.shadow
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = theme.metallicGradientHover || theme.hoverBg;
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = theme.metallicGradient || theme.card;
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <ICONS.ChevronRight width={16} height={16} />
              </button>
            </div>
          </div>

          {/* Center Section - View Mode Tabs (Always Centered) */}
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            display: "flex",
            background: theme.premiumGlass || theme.borderLight,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            padding: 3,
            borderRadius: 10,
            border: `1px solid ${theme.premiumGlassBorder || theme.border}`,
            boxShadow: theme.metallicShadow || `0 1px 3px ${theme.id === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.06)'}`
          }}>
            {['day', 'week', 'month', 'year', 'focus', 'metrics', 'telemetry'].map(mode => {
              // Custom label for telemetry
              const label = mode === 'telemetry' ? 'insights' : mode;

              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 7,
                    border: "none",
                    background: viewMode === mode ? (theme.chromeGradient || theme.card) : "transparent",
                    color: viewMode === mode ? theme.text : theme.textSec,
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                    letterSpacing: '0.02em',
                    cursor: "pointer",
                    textTransform: "capitalize",
                    transition: "all 0.2s",
                    boxShadow: viewMode === mode ? (theme.metallicShadow || `0 1px 2px ${theme.id === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)'}`) : 'none'
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Right Section - Event List Toggle */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            {viewMode === 'year' && (
              <button
                onClick={() => setEventListOpen(!eventListOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  background: eventListOpen ? `${accentColor}12` : theme.card,
                  border: `1px solid ${eventListOpen ? accentColor : theme.border}`,
                  borderRadius: 10,
                  color: eventListOpen ? accentColor : theme.textSec,
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <ICONS.List width={14} height={14} />
                Events
              </button>
            )}
          </div>
        </header>

        {/* Main Content Area with optional Event List Panel */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          <div
            ref={scrollRef}
            className="scroll-container"
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
                nowTime={nowTime}
                events={filteredEvents}
                allCalendarEvents={allCalendarEvents}
                theme={theme}
                config={config}
                tags={currentTags}
                onEventClick={(event) => {
                  if (event.context !== context) setContext(event.context);
                  setEditingEvent(event);
                  setModalOpen(true);
                }}
                onEventDrag={handleEventDrag}
                context={context}
                accentColor={accentColor}
                parentScrollRef={scrollRef}
                eventsOverlap={eventsOverlap}
              />
            ) : viewMode === 'week' ? (
              <WeekView
                currentDate={currentDate}
                nowTime={nowTime}
                events={filteredEvents}
                allCalendarEvents={allCalendarEvents}
                theme={theme}
                config={config}
                tags={currentTags}
                onEventClick={(event) => {
                  if (event.context !== context) setContext(event.context);
                  setEditingEvent(event);
                  setModalOpen(true);
                }}
                context={context}
                eventsOverlap={eventsOverlap}
              />
            ) : viewMode === 'month' ? (
              <MonthView
                currentDate={currentDate}
                events={filteredEvents}
                allCalendarEvents={allCalendarEvents}
                theme={theme}
                config={config}
                onDayClick={(date) => {
                  setCurrentDate(date);
                  setViewMode('day');
                }}
                onEventClick={(event) => {
                  if (event.context !== context) setContext(event.context);
                  setEditingEvent(event);
                  setModalOpen(true);
                }}
                context={context}
                eventsOverlap={eventsOverlap}
              />
            ) : viewMode === 'year' ? (
              <LinearYearView
                currentDate={currentDate}
                events={filteredEvents}
                allCalendarEvents={allCalendarEvents}
                theme={theme}
                config={config}
                tags={currentTags}
                accentColor={accentColor}
                onDayClick={(date) => {
                  setCurrentDate(date);
                  setViewMode('day');
                }}
                context={context}
                eventsOverlap={eventsOverlap}
                timers={timers}
                toggleTimer={toggleTimer}
                formatTimer={formatTimer}
                resetTimer={resetTimer}
                goals={goals}
                setGoals={setGoals}
                toggleGoal={toggleGoal}
                addGoal={addGoal}
                removeGoal={removeGoal}
                newGoal={newGoal}
                setNewGoal={setNewGoal}
              />
            ) : viewMode === 'focus' ? (
              <FocusView
                theme={theme}
                config={config}
                goals={goals}
                toggleGoal={toggleGoal}
                addGoal={addGoal}
                removeGoal={removeGoal}
                newGoal={newGoal}
                setNewGoal={setNewGoal}
                timers={timers}
                toggleTimer={toggleTimer}
                resetTimer={resetTimer}
                formatTimer={formatTimer}
                accentColor={accentColor}
                goalsProgress={goalsProgress}
                goalsCompleted={goalsCompleted}
                events={events}
                tags={currentTags}
                setEditingEvent={setEditingEvent}
              />
            ) : viewMode === 'metrics' ? (
              <MetricsTab
                theme={theme}
                config={config}
                accentColor={accentColor}
                user={user}
                events={events}
              />
            ) : viewMode === 'telemetry' ? (
              <TelemetryPage
                theme={theme}
                config={config}
                accentColor={accentColor}
                user={user}
              />
            ) : null}
          </div>

          {/* Event List Panel - Shows in Year View */}
          {viewMode === 'year' && eventListOpen && (
            <EventListPanel
              events={events}
              theme={theme}
              tags={getAllTags()}
              config={config}
              accentColor={accentColor}
              onClose={() => setEventListOpen(false)}
              onEventClick={(event) => {
                setEditingEvent(event);
                setModalOpen(true);
              }}
              onEventReschedule={async (updatedEvent) => {
                try {
                  await handleSaveEvent({
                    id: updatedEvent.id,
                    title: updatedEvent.title,
                    category: updatedEvent.category,
                    description: updatedEvent.description,
                    location: updatedEvent.location,
                    start: updatedEvent.start,
                    end: updatedEvent.end
                  });
                  notify('Event rescheduled', 'success');
                } catch (error) {
                  notify('Failed to reschedule', 'error');
                }
              }}
            />
          )}
        </div>
      </div>
      
      {settingsOpen && (
        <SettingsModal
          config={config}
          setConfig={setConfig}
          theme={theme}
          onClose={() => setSettingsOpen(false)}
          user={user}
          events={events}
          bulkDeleteRecurringEvents={bulkDeleteRecurringEvents}
          softDeleteEvent={softDeleteEvent}
          handleLogout={async () => {
            try {
              await supabaseSignOut();
            } catch (error) {
              console.error("Error signing out:", error);
            }
          }}
        />
      )}

      {/* Insights Dashboard */}
      {insightsOpen && (
        <InsightsDashboard
          events={events}
          goals={allCalendarEvents.filter(e => e.type === 'goal')}
          tags={currentTags}
          theme={theme}
          config={config}
          accentColor={accentColor}
          onClose={() => setInsightsOpen(false)}
        />
      )}

      {modalOpen && (
        <EventEditor
          event={editingEvent}
          currentDate={currentDate}
          theme={theme}
          config={config}
          tags={currentTags}
          onSave={handleSaveEvent}
          onDelete={editingEvent?.id ? () => softDeleteEvent(editingEvent.id) : null}
          onCancel={() => setModalOpen(false)}
          context={context}
          allCalendarEvents={allCalendarEvents}
          eventsOverlap={eventsOverlap}
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
          user={user}
          loadData={loadData}
          onClose={() => setTagManagerOpen(false)}
        />
      )}

      <div
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 10001,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          maxWidth: 320
        }}>
        {notifications.map(notification => (
          <div
            key={notification.id}
            className="fade-enter touch-feedback"
            style={{
              padding: "12px 16px",
              background: notification.type === 'error'
                ? `linear-gradient(135deg, ${theme.indicator}, ${theme.indicator}dd)`
                : notification.type === 'success'
                ? `linear-gradient(135deg, ${theme.familyAccent}, ${theme.familyAccentHover})`
                : theme.liquidGlass,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              color: notification.type === 'error' || notification.type === 'success'
                ? "#fff"
                : theme.text,
              borderRadius: 12,
              border: notification.type === 'error'
                ? `1px solid ${theme.indicator}40`
                : notification.type === 'success'
                ? `1px solid ${theme.familyAccent}40`
                : `1px solid ${theme.liquidBorder}`,
              boxShadow: notification.type === 'error'
                ? `0 8px 24px ${theme.indicator}40, inset 0 1px 0 rgba(255,255,255,0.2)`
                : notification.type === 'success'
                ? `0 8px 24px ${theme.familyAccent}40, inset 0 1px 0 rgba(255,255,255,0.2)`
                : theme.liquidShadow,
              fontSize: 13,
              fontWeight: 600,
              minWidth: 180,
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
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

      {/* Floating Timer Toggle Button - Always Visible */}
      {!floatingTimerVisible && (
        <button
          onClick={() => setFloatingTimerVisible(true)}
          title={runningTimersCount > 0 ? `${formatTimer(timers.find(t => t.running)?.seconds || 0)} - ${timers.find(t => t.running)?.name}` : 'Open Timer'}
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            width: 44,
            height: 44,
            borderRadius: 14,
            background: runningTimersCount > 0
              ? `linear-gradient(135deg, ${timers.find(t => t.running)?.color || accentColor}, ${timers.find(t => t.running)?.color || accentColor}cc)`
              : (config.darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
            border: `1px solid ${runningTimersCount > 0 ? 'transparent' : theme.border}`,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: runningTimersCount > 0 ? '#fff' : theme.textMuted,
            boxShadow: runningTimersCount > 0
              ? `0 4px 16px ${timers.find(t => t.running)?.color || accentColor}40`
              : (config.darkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)'),
            zIndex: 9999,
            transition: 'all 0.2s'
          }}
        >
          <ICONS.Timer width={20} height={20} />
          {runningTimersCount > 0 && (
            <div style={{
              position: 'absolute',
              bottom: -6,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 9,
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
              color: '#fff',
              background: timers.find(t => t.running)?.color || accentColor,
              padding: '1px 5px',
              borderRadius: 6,
              whiteSpace: 'nowrap'
            }}>
              {formatTimer(timers.find(t => t.running)?.seconds || 0)}
            </div>
          )}
        </button>
      )}

      {/* Floating Timer Popup - Global */}
      {floatingTimerVisible && (
        <div
          style={{
            position: 'fixed',
            bottom: 80,
            right: 20,
            width: 280,
            background: theme.liquidGlass,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: 16,
            border: `1px solid ${theme.liquidBorder}`,
            boxShadow: theme.liquidShadow,
            zIndex: 10000,
            overflow: 'hidden',
          }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderBottom: `1px solid ${config.darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ICONS.Timer width={14} height={14} style={{ color: theme.accent }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: theme.text, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>Timers</span>
              {runningTimersCount > 0 && (
                <span style={{
                  fontSize: 9,
                  padding: '2px 6px',
                  background: `${theme.accent}20`,
                  color: theme.accent,
                  borderRadius: 8,
                  fontWeight: 600,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
                }}>
                  {runningTimersCount} active
                </span>
              )}
            </div>
            <button
              onClick={() => setFloatingTimerVisible(false)}
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: theme.textMuted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ICONS.X width={14} height={14} />
            </button>
          </div>

          {/* Timer List */}
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {timers.slice(0, 4).map(timer => {
              const TimerIcon = ICONS[timer.icon] || ICONS.Clock;
              const isCustomizing = customizingTimer === timer.id;
              return (
                <div key={timer.id}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      background: timer.running
                        ? `${timer.color}12`
                        : config.darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      borderRadius: 12,
                      border: timer.running
                        ? `1px solid ${timer.color}30`
                        : `1px solid ${config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                    }}
                  >
                    {/* Icon */}
                    <div
                      onClick={() => setCustomizingTimer(isCustomizing ? null : timer.id)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: `${timer.color}18`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'transform 0.15s',
                      }}
                    >
                      <TimerIcon width={18} height={18} style={{ color: timer.color }} />
                    </div>

                    {/* Time & Name */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 22,
                        fontWeight: 700,
                        fontFamily: 'SF Mono, Menlo, monospace',
                        color: timer.running ? timer.color : theme.text,
                        letterSpacing: '-0.5px',
                        lineHeight: 1,
                      }}>
                        {formatTimer(timer.seconds)}
                      </div>
                      <div style={{
                        fontSize: 10,
                        fontWeight: 500,
                        color: theme.textMuted,
                        marginTop: 2,
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
                      }}>
                        {timer.name}
                      </div>
                    </div>

                    {/* Controls */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => toggleTimer(timer.id)}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          background: timer.running ? `${timer.color}20` : timer.color,
                          border: 'none',
                          cursor: 'pointer',
                          color: timer.running ? timer.color : '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}
                      >
                        {timer.running ? <ICONS.Pause width={14} height={14} /> : <ICONS.Play width={14} height={14} />}
                      </button>
                      <button
                        onClick={() => resetTimer(timer.id)}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          background: config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                          border: 'none',
                          cursor: 'pointer',
                          color: theme.textMuted,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Reset"
                      >
                        <ICONS.Clock width={14} height={14} />
                      </button>
                    </div>
                  </div>

                  {/* Customization Panel */}
                  {isCustomizing && (
                    <div style={{
                      marginTop: 6,
                      padding: 10,
                      background: config.darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      borderRadius: 10,
                      border: `1px solid ${config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                    }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: theme.textMuted, marginBottom: 6, textTransform: 'uppercase', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", letterSpacing: '0.04em' }}>
                        Color
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                        {TIMER_COLORS.map(c => (
                          <button
                            key={c.id}
                            onClick={() => updateTimer(timer.id, { color: c.color })}
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 6,
                              background: c.color,
                              border: timer.color === c.color ? '2px solid #fff' : '2px solid transparent',
                              boxShadow: timer.color === c.color ? `0 0 0 1px ${c.color}` : 'none',
                              cursor: 'pointer',
                            }}
                          />
                        ))}
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 600, color: theme.textMuted, marginBottom: 6, textTransform: 'uppercase', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", letterSpacing: '0.04em' }}>
                        Icon
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                        {TIMER_ICONS.map(ic => {
                          const IconComp = ICONS[ic.icon];
                          const isSelected = timer.icon === ic.icon;
                          return (
                            <button
                              key={ic.id}
                              onClick={() => updateTimer(timer.id, { icon: ic.icon })}
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: 6,
                                background: isSelected ? `${timer.color}20` : config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                border: isSelected ? `1px solid ${timer.color}` : '1px solid transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <IconComp width={12} height={12} style={{ color: isSelected ? timer.color : theme.textSec }} />
                            </button>
                          );
                        })}
                      </div>
                      {/* Duration Selector */}
                      <div style={{ fontSize: 9, fontWeight: 600, color: theme.textMuted, marginBottom: 6, textTransform: 'uppercase', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", letterSpacing: '0.04em' }}>
                        Duration
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 8, color: theme.textMuted, display: 'block', marginBottom: 3, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>Hours</label>
                          <input
                            type="number"
                            min="0"
                            max="23"
                            value={Math.floor(timer.originalSeconds / 3600)}
                            onChange={(e) => {
                              const hrs = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
                              const currentMins = Math.floor((timer.originalSeconds % 3600) / 60);
                              const secs = Math.max(60, (hrs * 3600) + (currentMins * 60));
                              updateTimer(timer.id, { seconds: secs, originalSeconds: secs });
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              fontSize: 12,
                              fontWeight: 600,
                              fontFamily: 'SF Mono, Menlo, monospace',
                              background: config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                              border: `1px solid ${config.darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                              borderRadius: 6,
                              color: theme.text,
                              textAlign: 'center',
                              outline: 'none'
                            }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 8, color: theme.textMuted, display: 'block', marginBottom: 3, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>Minutes</label>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={Math.floor((timer.originalSeconds % 3600) / 60)}
                            onChange={(e) => {
                              const mins = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                              const currentHrs = Math.floor(timer.originalSeconds / 3600);
                              const secs = Math.max(60, (currentHrs * 3600) + (mins * 60));
                              updateTimer(timer.id, { seconds: secs, originalSeconds: secs });
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              fontSize: 12,
                              fontWeight: 600,
                              fontFamily: 'SF Mono, Menlo, monospace',
                              background: config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                              border: `1px solid ${config.darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                              borderRadius: 6,
                              color: theme.text,
                              textAlign: 'center',
                              outline: 'none'
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => setCustomizingTimer(null)}
                          style={{
                            flex: 1,
                            padding: '6px',
                            fontSize: 9,
                            fontWeight: 600,
                            color: theme.textSec,
                            background: config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
                          }}
                        >
                          Done
                        </button>
                        {timers.length > 1 && (
                          <button
                            onClick={() => { removeTimer(timer.id); setCustomizingTimer(null); }}
                            style={{
                              padding: '6px 10px',
                              fontSize: 9,
                              fontWeight: 600,
                              color: '#EF4444',
                              background: 'rgba(239,68,68,0.1)',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Add Presets */}
          {timers.length < 5 && (
            <div style={{
              padding: '0 12px 12px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
            }}>
              {TIMER_PRESETS.slice(0, 4).map(preset => {
                const PresetIcon = ICONS[preset.icon] || ICONS.Clock;
                return (
                  <button
                    key={preset.name}
                    onClick={() => addTimerFromPreset(preset)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '5px 10px',
                      fontSize: 10,
                      fontWeight: 500,
                      color: theme.textSec,
                      background: 'transparent',
                      border: `1px dashed ${theme.border}`,
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = preset.color;
                      e.currentTarget.style.color = preset.color;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = theme.border;
                      e.currentTarget.style.color = theme.textSec;
                    }}
                  >
                    <PresetIcon width={11} height={11} />
                    {preset.name} ({preset.mins}m)
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AuthScreen({ onLogin, onEmailLogin, onEmailSignUp, onPasswordLogin, theme }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showEmailInput, setShowEmailInput] = React.useState(false);
  const [authMode, setAuthMode] = React.useState('magic'); // 'magic', 'signin', 'signup'
  const [isLoading, setIsLoading] = React.useState(false);
  const [message, setMessage] = React.useState(null);
  const [error, setError] = React.useState(null);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (authMode === 'magic') {
        // Magic link (passwordless)
        const { error } = await onEmailLogin(email);
        if (error) throw error;
        setMessage('Check your email for a magic link to sign in.');
      } else if (authMode === 'signup') {
        // Email + Password Sign Up
        if (!password || password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        const { error } = await onEmailSignUp(email, password);
        if (error) throw error;
        setMessage('Check your email to confirm your account.');
      } else {
        // Email + Password Sign In
        const { error } = await onPasswordLogin(email, password);
        if (error) throw error;
        // Success - will redirect automatically
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      height: "100vh",
      background: `linear-gradient(135deg, ${theme.bg} 0%, ${theme.sidebar} 100%)`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      textAlign: "center",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Premium Animated Background - Symmetrical */}
      <div style={{
        position: "absolute",
        top: "20%",
        left: "10%",
        width: 450,
        height: 450,
        background: `radial-gradient(circle, ${theme.accent}20 0%, transparent 70%)`,
        borderRadius: "50%",
        filter: "blur(80px)",
        animation: "glassFloat 12s ease-in-out infinite"
      }} />
      <div style={{
        position: "absolute",
        top: "20%",
        right: "10%",
        width: 450,
        height: 450,
        background: `radial-gradient(circle, ${theme.familyAccent}20 0%, transparent 70%)`,
        borderRadius: "50%",
        filter: "blur(80px)",
        animation: "glassFloat 12s ease-in-out infinite 1.5s"
      }} />
      <div style={{
        position: "absolute",
        bottom: "15%",
        left: "50%",
        width: 380,
        height: 380,
        background: `radial-gradient(circle, ${theme.accent}15 0%, transparent 70%)`,
        borderRadius: "50%",
        filter: "blur(100px)",
        animation: "glassFloat 15s ease-in-out infinite 3s",
        transform: "translateX(-50%)"
      }} />

      <div className="fade-in" style={{
        maxWidth: 500,
        width: "100%",
        background: theme.premiumGlass || theme.liquidGlass,
        backdropFilter: theme.glassBlur || "blur(40px)",
        WebkitBackdropFilter: theme.glassBlur || "blur(40px)",
        borderRadius: 24,
        padding: "48px 44px",
        boxShadow: theme.premiumShadow || theme.liquidShadow,
        border: `1px solid ${theme.premiumGlassBorder || theme.liquidBorder}`,
        position: "relative",
        zIndex: 1
      }}>
        {/* Premium Logo - Centered */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 24
        }}>
          <AppLogo size={64} theme={theme} animated={true} />
        </div>

        {/* Brand Name - Premium Typography with Superscript OS */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{
            fontSize: 44,
            fontWeight: 700,
            fontFamily: theme.fontDisplay,
            color: theme.text,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            margin: 0,
            marginBottom: 10,
            background: theme.metallicAccent || `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            position: 'relative',
            display: 'inline-block'
          }}>
            Timeline
            <sup style={{
              fontSize: 16,
              fontWeight: 700,
              fontFamily: theme.fontFamily,
              color: theme.textSec,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              opacity: 0.85,
              marginLeft: 2,
              position: 'relative',
              top: -4,
              background: 'none',
              WebkitBackgroundClip: 'initial',
              WebkitTextFillColor: 'initial'
            }}>OS</sup>
          </h1>

          {/* Status Indicators - Centered */}
          <div style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            marginTop: 10
          }}>
            {[0, 0.5, 1].map((delay, i) => (
              <div key={i} style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: i === 1 ? theme.familyAccent : theme.accent,
                boxShadow: `0 0 14px ${(i === 1 ? theme.familyAccent : theme.accent)}70`,
                animation: `pulse 2s ease-in-out infinite ${delay}s`
              }} />
            ))}
          </div>
        </div>

        {/* Tagline */}
        <p style={{
          fontSize: 16,
          fontFamily: theme.fontFamily,
          color: theme.text,
          marginBottom: 8,
          lineHeight: 1.5,
          fontWeight: 500,
          letterSpacing: '0.01em'
        }}>
          Your Personal Operating System for Time
        </p>

        {/* Motto */}
        <p style={{
          fontSize: 13,
          fontStyle: "italic",
          fontFamily: theme.fontDisplay,
          color: theme.textSec,
          marginBottom: 32,
          lineHeight: 1.5
        }}>
          "{APP_META.motto}"
        </p>

        {/* Feature Pills - Premium 4K Icons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
          marginBottom: 36
        }}>
          {[
            {
              name: 'Smart Calendar',
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <path d="M8 14h.01"/>
                <path d="M12 14h.01"/>
                <path d="M16 14h.01"/>
                <path d="M8 18h.01"/>
                <path d="M12 18h.01"/>
              </svg>
            },
            {
              name: 'Focus Mode',
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="6"/>
                <circle cx="12" cy="12" r="2" fill="currentColor"/>
              </svg>
            },
            {
              name: 'Daily Goals',
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            },
            {
              name: 'Multi-Context',
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
              </svg>
            }
          ].map((feature, i) => (
            <div key={feature.name} style={{
              padding: '11px 16px',
              background: theme.metallicGradient || (theme.id === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: 16,
              fontSize: 12,
              fontFamily: theme.fontFamily,
              fontWeight: 600,
              color: theme.text,
              border: `1px solid ${theme.premiumGlassBorder || theme.border}`,
              boxShadow: theme.metallicShadow || `0 2px 8px rgba(0,0,0,0.08), inset 0 1px 1px rgba(255,255,255,0.1)`,
              animation: `fadeIn 0.5s ease-out ${i * 0.1}s both`,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'default'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = theme.premiumShadow || '0 4px 12px rgba(0,0,0,0.12), inset 0 1px 1px rgba(255,255,255,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = theme.metallicShadow || '0 2px 8px rgba(0,0,0,0.08), inset 0 1px 1px rgba(255,255,255,0.1)';
            }}
            >
              <span style={{ display: 'flex', alignItems: 'center', opacity: 0.85 }}>
                {feature.icon}
              </span>
              <span style={{ letterSpacing: '0.01em' }}>{feature.name}</span>
            </div>
          ))}
        </div>

        {/* Authentication Buttons - Premium Compact */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Google Sign In - Primary */}
          <button
            onClick={onLogin}
            style={{
              width: "100%",
              padding: "15px 28px",
              background: theme.metallicAccent || `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accentHover} 100%)`,
              color: "#fff",
              border: 'none',
              borderRadius: 14,
              fontSize: 14.5,
              fontWeight: 600,
              fontFamily: theme.fontFamily,
              letterSpacing: '0.01em',
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              boxShadow: `0 6px 20px ${theme.accent}50, 0 12px 40px ${theme.accent}30, inset 0 1px 2px rgba(255,255,255,0.3)`,
              position: "relative",
              overflow: "hidden"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-2px) scale(1.01)";
              e.currentTarget.style.boxShadow = `0 8px 28px ${theme.accent}60, 0 16px 48px ${theme.accent}40, inset 0 1px 2px rgba(255,255,255,0.4)`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0) scale(1)";
              e.currentTarget.style.boxShadow = `0 6px 20px ${theme.accent}50, 0 12px 40px ${theme.accent}30, inset 0 1px 2px rgba(255,255,255,0.3)`;
            }}
          >
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 3s ease-in-out infinite'
            }} />
            <svg width="19" height="19" viewBox="0 0 24 24" style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span style={{ position: 'relative', zIndex: 1 }}>Continue with Google</span>
          </button>

          {/* Email Sign In - Secondary */}
          {!showEmailInput ? (
            <button
              onClick={() => setShowEmailInput(true)}
              style={{
                width: "100%",
                padding: "15px 28px",
                background: theme.metallicGradient || (theme.id === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'),
                color: theme.text,
                border: `1.5px solid ${theme.premiumGlassBorder || theme.border}`,
                borderRadius: 14,
                fontSize: 14.5,
                fontWeight: 600,
                fontFamily: theme.fontFamily,
                letterSpacing: '0.01em',
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: theme.metallicShadow || '0 4px 12px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.1)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.background = theme.metallicGradientHover || (theme.id === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)');
                e.currentTarget.style.borderColor = theme.accent;
                e.currentTarget.style.boxShadow = `0 6px 20px rgba(0,0,0,0.08), inset 0 1px 1px rgba(255,255,255,0.15)`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.background = theme.metallicGradient || (theme.id === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)');
                e.currentTarget.style.borderColor = theme.premiumGlassBorder || theme.border;
                e.currentTarget.style.boxShadow = theme.metallicShadow || '0 4px 12px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.1)';
              }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <rect x="3" y="5" width="18" height="14" rx="2"/>
                <path d="M3 7l9 6 9-6"/>
              </svg>
              <span>Continue with Email</span>
            </button>
          ) : (
            <div style={{ width: '100%' }}>
              {/* Auth Mode Tabs */}
              <div style={{
                display: 'flex',
                gap: 4,
                marginBottom: 12,
                padding: 4,
                background: theme.id === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                borderRadius: 10
              }}>
                {[
                  { id: 'magic', label: 'Magic Link' },
                  { id: 'signin', label: 'Sign In' },
                  { id: 'signup', label: 'Sign Up' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => { setAuthMode(mode.id); setError(null); setMessage(null); }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: authMode === mode.id
                        ? `linear-gradient(135deg, ${theme.accent}20, ${theme.accent}10)`
                        : 'transparent',
                      border: authMode === mode.id
                        ? `1px solid ${theme.accent}40`
                        : '1px solid transparent',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: theme.fontFamily,
                      color: authMode === mode.id ? theme.accent : theme.textSec,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Message/Error Display */}
              {(message || error) && (
                <div style={{
                  padding: '10px 14px',
                  marginBottom: 12,
                  borderRadius: 10,
                  fontSize: 12,
                  fontFamily: theme.fontFamily,
                  background: message
                    ? `${theme.accent}15`
                    : 'rgba(239, 68, 68, 0.1)',
                  color: message ? theme.accent : '#EF4444',
                  border: `1px solid ${message ? theme.accent + '30' : 'rgba(239, 68, 68, 0.2)'}`
                }}>
                  {message || error}
                </div>
              )}

              <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoFocus
                  required
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: "14px 18px",
                    background: theme.id === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                    color: theme.text,
                    border: `1.5px solid ${theme.premiumGlassBorder || theme.border}`,
                    borderRadius: 12,
                    fontSize: 14,
                    fontFamily: theme.fontFamily,
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box',
                    opacity: isLoading ? 0.6 : 1
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = theme.accent;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.accent}15`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = theme.premiumGlassBorder || theme.border;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />

                {/* Password field for signin/signup modes */}
                {(authMode === 'signin' || authMode === 'signup') && (
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={authMode === 'signup' ? "Create password (min 6 chars)" : "Password"}
                    required
                    disabled={isLoading}
                    minLength={authMode === 'signup' ? 6 : undefined}
                    style={{
                      width: '100%',
                      padding: "14px 18px",
                      background: theme.id === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                      color: theme.text,
                      border: `1.5px solid ${theme.premiumGlassBorder || theme.border}`,
                      borderRadius: 12,
                      fontSize: 14,
                      fontFamily: theme.fontFamily,
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box',
                      opacity: isLoading ? 0.6 : 1
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = theme.accent;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.accent}15`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = theme.premiumGlassBorder || theme.border;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => { setShowEmailInput(false); setEmail(''); setPassword(''); setError(null); setMessage(null); }}
                    disabled={isLoading}
                    style={{
                      padding: "14px 18px",
                      background: theme.id === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                      color: theme.textSec,
                      border: `1.5px solid ${theme.premiumGlassBorder || theme.border}`,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 500,
                      fontFamily: theme.fontFamily,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: isLoading ? 0.6 : 1
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      padding: "14px 22px",
                      background: theme.metallicAccent || `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`,
                      color: "#fff",
                      border: 'none',
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      fontFamily: theme.fontFamily,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      transition: "all 0.3s",
                      boxShadow: `0 4px 16px ${theme.accent}40`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: isLoading ? 0.7 : 1
                    }}
                  >
                    {isLoading ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="32" strokeLinecap="round"/>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      authMode === 'magic' ? 'Send Magic Link' :
                      authMode === 'signup' ? 'Create Account' : 'Sign In'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Trust & Security Badges - Compact */}
        <div style={{
          marginTop: 24,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          color: theme.textSec,
          fontFamily: theme.fontFamily,
          fontWeight: 500
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
            <span>Secure & Private</span>
          </div>
          <span style={{ opacity: 0.3 }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span>Encrypted</span>
          </div>
        </div>

        {/* Premium Footer - Compact */}
        <div style={{
          marginTop: 28,
          paddingTop: 24,
          borderTop: `1px solid ${theme.premiumGlassBorder || theme.subtleBorder}`,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          alignItems: "center"
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 11,
            color: theme.textSec,
            fontFamily: theme.fontFamily,
            fontWeight: 500
          }}>
            <span>v{APP_META.version}</span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>© {new Date().getFullYear()} {APP_META.author}</span>
          </div>
          <div style={{
            fontSize: 11,
            fontFamily: theme.fontDisplay,
            fontStyle: 'italic',
            color: theme.textSec,
            opacity: 0.9,
            lineHeight: 1.5,
            fontWeight: 500
          }}>
            Crafted with precision for those who value their time
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
        {weekDays.map((day, index) => (
          <div
            key={index}
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

function DayView({ currentDate, nowTime, events, allCalendarEvents = [], theme, config, tags, onEventClick, onEventDrag, context, accentColor, parentScrollRef, eventsOverlap }) {
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropIndicator, setDropIndicator] = useState(null);
  const [isExtending, setIsExtending] = useState(false);

  const eventsColumnRef = useRef(null);
  const autoScrollRef = useRef(null);
  const currentTime = nowTime || new Date();
  const isToday = currentDate.toDateString() === currentTime.toDateString();

  // Events from the current context for this day
  const dayEvents = useMemo(() => {
    const filtered = events.filter(event => {
      if (!event?.start) return false;
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === currentDate.toDateString();
    });

    return filtered.sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [events, currentDate]);

  // Events from OTHER calendars for this day (shown as background/subtle indicators)
  const otherCalendarEvents = useMemo(() => {
    return allCalendarEvents.filter(event => {
      if (!event?.start || event.context === context) return false;
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === currentDate.toDateString();
    }).sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [allCalendarEvents, currentDate, context]);

  // Combined events for this day (for conflict checking)
  const allDayEvents = useMemo(() => {
    return [...dayEvents, ...otherCalendarEvents];
  }, [dayEvents, otherCalendarEvents]);

  // Check if an event has conflicts
  const hasConflict = (event) => {
    if (!eventsOverlap) return false;
    return allDayEvents.some(e => e.id !== event.id && eventsOverlap(event, e));
  };
  
  const HOUR_HEIGHT = 52;
  const START_HOUR = 0;
  const END_HOUR = 23;
  const TOTAL_HOURS = 24;
  
  const calculateEventPositions = useMemo(() => {
    if (!dayEvents.length) return [];

    // Prepare events with timing info
    const eventsWithTimes = dayEvents.map(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
      const endMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();
      return {
        event,
        startMinutes,
        endMinutes: Math.max(endMinutes, startMinutes + 30), // Min 30 min duration for display
        startTime: eventStart,
        endTime: eventEnd
      };
    }).sort((a, b) => a.startMinutes - b.startMinutes || b.endMinutes - a.endMinutes);

    // Assign columns - find first column where event doesn't overlap
    const columns = [];
    eventsWithTimes.forEach(evt => {
      let placed = false;
      for (let colIdx = 0; colIdx < columns.length; colIdx++) {
        const col = columns[colIdx];
        const lastInCol = col[col.length - 1];
        // No overlap if this event starts after last event ends
        if (evt.startMinutes >= lastInCol.endMinutes) {
          col.push(evt);
          evt.column = colIdx;
          placed = true;
          break;
        }
      }
      if (!placed) {
        evt.column = columns.length;
        columns.push([evt]);
      }
    });

    // Find max columns that overlap with each event
    eventsWithTimes.forEach(evt => {
      let maxOverlappingCols = evt.column + 1;
      eventsWithTimes.forEach(other => {
        // Check if they overlap in time
        if (other.startMinutes < evt.endMinutes && other.endMinutes > evt.startMinutes) {
          maxOverlappingCols = Math.max(maxOverlappingCols, other.column + 1);
        }
      });
      evt.totalColumns = maxOverlappingCols;
    });

    // Calculate positions
    return eventsWithTimes.map(evt => {
      const widthPercent = (100 - 8) / evt.totalColumns; // 8px padding total
      const leftPercent = 4 + (evt.column * widthPercent); // 4px left padding

      return {
        event: evt.event,
        top: (evt.startMinutes / 60) * HOUR_HEIGHT,
        height: Math.max(45, ((evt.endMinutes - evt.startMinutes) / 60) * HOUR_HEIGHT),
        left: `${leftPercent}%`,
        width: `calc(${widthPercent}% - 4px)`,
        groupIndex: evt.column,
        groupSize: evt.totalColumns,
        startTime: evt.startTime,
        endTime: evt.endTime,
        durationMinutes: evt.endMinutes - evt.startMinutes
      };
    });
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
      category: tags[0]?.tagId || '',
      context: context
    });
  };
  
  // Auto-scroll while dragging near edges
  const startAutoScroll = (direction, speed) => {
    if (autoScrollRef.current) return;
    autoScrollRef.current = setInterval(() => {
      if (parentScrollRef?.current) {
        parentScrollRef.current.scrollTop += direction * speed;
      }
    }, 16);
  };

  const stopAutoScroll = () => {
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  };

  const handleMouseMove = (e) => {
    if (!eventsColumnRef.current || !isDragging || !draggedEvent) return;

    // Auto-scroll when near edges
    if (parentScrollRef?.current) {
      const scrollRect = parentScrollRef.current.getBoundingClientRect();
      const edgeThreshold = 80;
      const scrollSpeed = 10;

      if (e.clientY < scrollRect.top + edgeThreshold) {
        const intensity = 1 - (e.clientY - scrollRect.top) / edgeThreshold;
        startAutoScroll(-1, scrollSpeed * Math.max(0.3, intensity));
      } else if (e.clientY > scrollRect.bottom - edgeThreshold) {
        const intensity = 1 - (scrollRect.bottom - e.clientY) / edgeThreshold;
        startAutoScroll(1, scrollSpeed * Math.max(0.3, intensity));
      } else {
        stopAutoScroll();
      }
    }

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
    stopAutoScroll();

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
    if (config.use24Hour) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
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
          <div style={{ fontFamily: theme.fontDisplay,
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
            <div style={{ fontFamily: theme.fontDisplay,
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
              {formatTime(currentTime)}
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
          width: 56,
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
                  padding: '0 6px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end',
                  paddingTop: 2
                }}
              >
                <div style={{
                  fontSize: 9,
                  fontWeight: isMajorHour ? 600 : 500,
                  color: isMajorHour ? theme.text : theme.textMuted,
                  letterSpacing: '0.2px'
                }}>
                  {config.use24Hour
                    ? `${hour.toString().padStart(2, '0')}:00`
                    : `${hour % 12 || 12}${hour < 12 ? 'a' : 'p'}`
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
            const timeStr = config.use24Hour
              ? `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`
              : `${currentTime.getHours() % 12 || 12}:${currentTime.getMinutes().toString().padStart(2, '0')}`;

            if (topPosition >= 0 && topPosition <= TOTAL_HOURS * HOUR_HEIGHT) {
              return (
                <div style={{
                  position: "absolute",
                  top: topPosition,
                  left: 0,
                  right: 0,
                  zIndex: 1,
                  pointerEvents: "none"
                }}>
                  {/* Time badge */}
                  <div style={{
                    position: "absolute",
                    left: 4,
                    top: -8,
                    background: theme.indicator,
                    color: "#fff",
                    fontSize: 8,
                    fontWeight: 700,
                    padding: "2px 5px",
                    borderRadius: 3,
                    boxShadow: `0 1px 4px ${theme.indicator}40`,
                    zIndex: 2
                  }}>{timeStr}</div>
                  {/* Line - behind events */}
                  <div style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    height: 1.5,
                    background: `linear-gradient(90deg, ${theme.indicator} 0%, ${theme.indicator}30 100%)`,
                    borderRadius: 1
                  }} />
                </div>
              );
            }
          })()}
          
          {dropIndicator && (
            <div
              className="gpu-accelerated"
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
                zIndex: 10,
                transition: 'top 0.05s ease-out, height 0.05s ease-out'
              }}
            />
          )}
          
          {/* Events from OTHER calendars (shown as subtle background) */}
          {otherCalendarEvents.map((event) => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            const startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
            const endMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();
            const top = ((startMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
            const height = Math.max(30, ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT);
            const isFamily = event.context === 'family';
            const otherAccent = isFamily ? theme.familyAccent : theme.accent;

            return (
              <div
                key={`other-${event.id}`}
                onClick={() => onEventClick(event)}
                title={`${event.title || 'Untitled'} (${isFamily ? 'Family' : 'Personal'} Calendar)`}
                style={{
                  position: "absolute",
                  top: top,
                  right: 8,
                  width: 32,
                  height: Math.max(24, height),
                  background: `${otherAccent}15`,
                  borderRight: `3px solid ${otherAccent}60`,
                  borderRadius: 4,
                  cursor: 'pointer',
                  opacity: 0.7,
                  zIndex: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'opacity 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
              >
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: otherAccent
                }} />
              </div>
            );
          })}

          {calculateEventPositions.map((pos) => {
            const { event, top, height, left, width } = pos;
            const tag = tags.find(t => t.tagId === event.category) || tags[0] || {};
            const isDragged = draggedEvent?.id === event.id;
            const isShortEvent = height < 60;
            const eventHasConflict = hasConflict(event);

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
                  width: `calc(${width} - 8px)`,
                  height: Math.max(45, height),
                  background: config.darkMode
                    ? `linear-gradient(135deg, ${tag.color}22 0%, ${tag.color}15 100%)`
                    : `linear-gradient(135deg, ${theme.card}f5 0%, ${tag.color}18 100%)`,
                  borderLeft: `3px solid ${tag.color}`,
                  borderRadius: 6,
                  padding: isShortEvent ? "4px 8px" : "6px 10px",
                  cursor: 'pointer',
                  opacity: isDragged ? 0.3 : 1,
                  boxShadow: (eventHasConflict && config.showConflictNotifications)
                    ? `0 1px 3px ${theme.indicator}30, inset 0 0 0 1px ${theme.indicator}40`
                    : `0 1px 3px ${tag.color}15`,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
                  overflow: "hidden",
                  zIndex: isDragged ? 1 : 5,
                  userSelect: 'none',
                  border: (eventHasConflict && config.showConflictNotifications) ? `1px solid ${theme.indicator}50` : `1px solid ${tag.color}20`,
                  borderLeftWidth: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  margin: '0 4px',
                  backdropFilter: "blur(8px)",
                  transform: 'translateZ(0)',
                  willChange: 'transform, box-shadow',
                  contain: 'layout style'
                }}
                onMouseEnter={(e) => {
                  if (!isDragged && !isDragging) {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = `0 4px 12px ${tag.color}25`;
                    e.currentTarget.style.zIndex = "20";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDragged && !isDragging) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = `0 1px 3px ${tag.color}15`;
                    e.currentTarget.style.zIndex = "5";
                  }
                }}>
                {/* Header: Title + Conflict indicator + Tag (top-right) */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 6,
                  marginBottom: isShortEvent ? 1 : 4
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    flex: 1,
                    minWidth: 0
                  }}>
                    {eventHasConflict && config.showConflictNotifications && (
                      <span
                        title="Time conflict with another event"
                        style={{
                          fontSize: 7,
                          padding: '1px 3px',
                          background: theme.indicator,
                          color: '#fff',
                          borderRadius: 2,
                          fontWeight: 700,
                          flexShrink: 0
                        }}
                      >!</span>
                    )}
                    <div style={{
                      fontSize: isShortEvent ? 11 : 13,
                      fontWeight: 600,
                      color: theme.text,
                      lineHeight: 1.25,
                      flex: 1,
                      minWidth: 0,
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
                  {/* Tag badge - top right (compact dot for short events) */}
                  {isShortEvent ? (
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: tag.color,
                      flexShrink: 0,
                      boxShadow: `0 0 0 2px ${tag.color}20`
                    }} title={tag.name} />
                  ) : (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      background: `${tag.color}${config.darkMode ? '20' : '10'}`,
                      padding: '3px 7px',
                      borderRadius: 4,
                      fontSize: 9,
                      fontWeight: 600,
                      color: tag.color,
                      lineHeight: 1,
                      letterSpacing: '0.2px',
                      flexShrink: 0,
                      maxWidth: 80,
                      border: `1px solid ${tag.color}${config.darkMode ? '30' : '18'}`
                    }}>
                      {(() => { const IconComponent = getTagIcon(tag, ICONS); return IconComponent ? <IconComponent width={8} height={8} /> : null; })()}
                      <span style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {tag.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Time - always visible, compact for short events */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: isShortEvent ? 3 : 4,
                  marginBottom: isShortEvent ? 0 : 4
                }}>
                  <ICONS.Clock
                    width={isShortEvent ? 8 : 10}
                    height={isShortEvent ? 8 : 10}
                    style={{ color: theme.textMuted, flexShrink: 0 }}
                  />
                  <span style={{
                    fontSize: isShortEvent ? 9 : 10,
                    fontWeight: 500,
                    color: theme.textSec,
                    letterSpacing: '0.1px',
                    whiteSpace: 'nowrap'
                  }}>
                    {formatTime(pos.startTime)}{isShortEvent ? '' : ` – ${formatTime(pos.endTime)}`}
                  </span>
                </div>

                {/* Location - only for longer events */}
                {!isShortEvent && event.location && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <ICONS.MapPin width={9} height={9} style={{ color: theme.textMuted, flexShrink: 0 }} />
                    <span style={{
                      fontSize: 9,
                      fontWeight: 500,
                      color: theme.textMuted,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {event.location}
                    </span>
                  </div>
                )}
            
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
function WeekView({ currentDate, nowTime, events, allCalendarEvents = [], theme, config, tags, onEventClick, context, eventsOverlap }) {
  const HOUR_HEIGHT = 52;
  const HEADER_HEIGHT = 60;
  const TIME_COL_WIDTH = 50;
  const TOTAL_HOURS = 24;

  const now = nowTime || new Date();
  const todayStr = now.toDateString();

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

  // Events from OTHER calendars grouped by day
  const otherEventsByDay = useMemo(() => {
    const grouped = {};
    days.forEach(day => {
      const dayStr = day.toDateString();
      grouped[dayStr] = allCalendarEvents.filter(event =>
        event?.start && event.context !== context && new Date(event.start).toDateString() === dayStr
      );
    });
    return grouped;
  }, [allCalendarEvents, days, context]);

  // Check if an event has conflicts
  const hasConflict = (event) => {
    if (!eventsOverlap) return false;
    return allCalendarEvents.some(e => e.id !== event.id && eventsOverlap(event, e));
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: theme.bg
    }}>
      {/* Fixed Header Row */}
      <div style={{
        display: "flex",
        flexShrink: 0,
        borderBottom: `1px solid ${theme.border}`,
        background: theme.bg,
        position: "sticky",
        top: 0,
        zIndex: 20
      }}>
        {/* Time column header spacer */}
        <div style={{
          width: TIME_COL_WIDTH,
          height: HEADER_HEIGHT,
          flexShrink: 0,
          borderRight: `1px solid ${theme.border}`,
          background: theme.bg
        }} />

        {/* Day headers */}
        {days.map((day, index) => {
          const isToday = day.toDateString() === todayStr;
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <div
              key={index}
              style={{
                flex: 1,
                minWidth: 100,
                height: HEADER_HEIGHT,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderRight: index < 6 ? `1px solid ${theme.border}` : "none",
                background: isToday ? `${theme.accent}06` : theme.bg
              }}
            >
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: isToday ? theme.accent : isWeekend ? theme.textMuted : theme.textSec,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 3
              }}>
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span style={{
                fontSize: 18,
                fontWeight: 600,
                width: 30,
                height: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                background: isToday ? theme.accent : "transparent",
                color: isToday ? "#fff" : theme.text
              }}>
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Scrollable Grid Area */}
      <div style={{
        flex: 1,
        display: "flex",
        overflow: "auto"
      }}>
        {/* Time Column */}
        <div style={{
          width: TIME_COL_WIDTH,
          flexShrink: 0,
          position: "sticky",
          left: 0,
          zIndex: 10,
          background: theme.bg
        }}>
          {Array.from({ length: TOTAL_HOURS }).map((_, hour) => (
            <div
              key={hour}
              style={{
                height: HOUR_HEIGHT,
                position: "relative",
                borderRight: `1px solid ${theme.border}`
              }}
            >
              {hour > 0 && (
                <span style={{
                  position: "absolute",
                  top: -6,
                  right: 8,
                  fontSize: 10,
                  fontWeight: 500,
                  color: theme.textMuted,
                  background: theme.bg,
                  padding: "0 2px"
                }}>
                  {config.use24Hour
                    ? `${hour.toString().padStart(2, '0')}:00`
                    : `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`
                  }
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Day Columns */}
        {days.map((day, dayIndex) => {
          const dayStr = day.toDateString();
          const isToday = dayStr === todayStr;
          const dayEvents = eventsByDay[dayStr] || [];

          // Calculate overlapping events
          const eventsWithLayout = dayEvents.map(event => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            const startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
            const endMinutes = Math.min(eventEnd.getHours() * 60 + eventEnd.getMinutes(), 24 * 60);
            return { ...event, startMinutes, endMinutes };
          }).sort((a, b) => a.startMinutes - b.startMinutes);

          const columns = [];
          eventsWithLayout.forEach(event => {
            let placed = false;
            for (let col = 0; col < columns.length; col++) {
              const lastInCol = columns[col][columns[col].length - 1];
              if (event.startMinutes >= lastInCol.endMinutes) {
                columns[col].push(event);
                event.column = col;
                placed = true;
                break;
              }
            }
            if (!placed) {
              event.column = columns.length;
              columns.push([event]);
            }
          });

          eventsWithLayout.forEach(event => {
            let maxCol = event.column;
            eventsWithLayout.forEach(other => {
              if (other.startMinutes < event.endMinutes && other.endMinutes > event.startMinutes) {
                maxCol = Math.max(maxCol, other.column);
              }
            });
            event.totalColumns = maxCol + 1;
          });

          return (
            <div
              key={dayIndex}
              style={{
                flex: 1,
                minWidth: 120,
                position: "relative",
                borderRight: dayIndex < 6 ? `1px solid ${theme.border}` : "none",
                background: isToday ? `${theme.accent}04` : "transparent",
                height: HOUR_HEIGHT * TOTAL_HOURS,
                overflow: "hidden"
              }}
            >
              {/* Hour grid lines */}
              {Array.from({ length: TOTAL_HOURS }).map((_, hour) => (
                <div
                  key={hour}
                  style={{
                    position: "absolute",
                    top: hour * HOUR_HEIGHT,
                    left: 0,
                    right: 0,
                    height: HOUR_HEIGHT,
                    borderBottom: `1px solid ${theme.borderLight}`
                  }}
                />
              ))}

              {/* Current time line - simple, behind events */}
              {isToday && (() => {
                const currentMinutes = now.getHours() * 60 + now.getMinutes();
                const topPosition = (currentMinutes / 60) * HOUR_HEIGHT;
                return (
                  <div style={{
                    position: "absolute",
                    top: topPosition,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: theme.indicator,
                    zIndex: 0,
                    pointerEvents: "none",
                    opacity: 0.6
                  }} />
                );
              })()}

              {/* Other calendar events (subtle indicators) */}
              {(otherEventsByDay[dayStr] || []).map(event => {
                const eventStart = new Date(event.start);
                const eventEnd = new Date(event.end);
                const startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
                const endMinutes = Math.min(eventEnd.getHours() * 60 + eventEnd.getMinutes(), 24 * 60);
                const top = (startMinutes / 60) * HOUR_HEIGHT;
                const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;

                return (
                  <div
                    key={`other-${event.id}`}
                    title={`${event.context === 'family' ? 'Family' : 'Personal'}: ${event.title || 'Event'}`}
                    style={{
                      position: "absolute",
                      top: top + 2,
                      right: 2,
                      width: 4,
                      height: Math.max(height - 4, 8),
                      background: event.context === 'family' ? theme.familyAccent : theme.accent,
                      borderRadius: 2,
                      opacity: 0.5,
                      zIndex: 1,
                      pointerEvents: "none"
                    }}
                  />
                );
              })}

              {/* Events */}
              {eventsWithLayout.map(event => {
                const tag = tags.find(t => t.tagId === event.category) || tags[0] || {};
                const eventStart = new Date(event.start);
                const eventHasConflict = hasConflict(event);

                const top = (event.startMinutes / 60) * HOUR_HEIGHT;
                const height = ((event.endMinutes - event.startMinutes) / 60) * HOUR_HEIGHT;
                const showTime = height >= 32;

                const colWidth = (100 - 4) / event.totalColumns;
                const left = 2 + event.column * colWidth;

                const timeStr = config.use24Hour
                  ? `${eventStart.getHours().toString().padStart(2, '0')}:${eventStart.getMinutes().toString().padStart(2, '0')}`
                  : `${eventStart.getHours() % 12 || 12}:${eventStart.getMinutes().toString().padStart(2, '0')}`;

                return (
                  <div
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    title={`${event.title || 'Event'} - ${timeStr}${eventHasConflict ? ' (Conflict!)' : ''}`}
                    style={{
                      position: "absolute",
                      top: top + 2,
                      left: `${left}%`,
                      width: `calc(${colWidth}% - 4px)`,
                      height: Math.max(height - 4, 18),
                      background: theme.card,
                      borderLeft: `3px solid ${tag.color}`,
                      borderRadius: 4,
                      padding: "4px 6px",
                      cursor: "pointer",
                      overflow: "hidden",
                      zIndex: 5,
                      boxShadow: (eventHasConflict && config.showConflictNotifications)
                        ? `0 0 0 1px #EF4444, 0 1px 3px ${theme.text}08`
                        : `0 1px 3px ${theme.text}08`,
                      transition: "box-shadow 0.15s ease"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.boxShadow = (eventHasConflict && config.showConflictNotifications)
                        ? `0 0 0 1px #EF4444, 0 2px 8px ${theme.text}15`
                        : `0 2px 8px ${theme.text}15`;
                      e.currentTarget.style.zIndex = "25";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.boxShadow = (eventHasConflict && config.showConflictNotifications)
                        ? `0 0 0 1px #EF4444, 0 1px 3px ${theme.text}08`
                        : `0 1px 3px ${theme.text}08`;
                      e.currentTarget.style.zIndex = "5";
                    }}
                  >
                    {/* Conflict indicator badge */}
                    {eventHasConflict && config.showConflictNotifications && (
                      <div style={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        width: 16,
                        height: 16,
                        background: "#EF4444",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#fff",
                        zIndex: 10,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        border: "1.5px solid #fff"
                      }}>!</div>
                    )}
                    <div style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: theme.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      lineHeight: 1.2
                    }}>
                      {event.title || 'Event'}
                    </div>
                    {showTime && (
                      <div style={{
                        fontSize: 9,
                        color: theme.textMuted,
                        marginTop: 2
                      }}>{timeStr}</div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
function MonthView({ currentDate, events, allCalendarEvents = [], theme, config, onDayClick, onEventClick, context, eventsOverlap }) {
const today = useMemo(() => new Date(), []);
const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
let startDay = monthStart.getDay();
// Adjust for week starting on Monday
if (config.weekStartMon) {
  startDay = startDay === 0 ? 6 : startDay - 1;
}
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
}, [currentDate, startDay, daysInMonth, config.weekStartMon]);

// Check if an event has conflicts across all calendars
const hasConflict = (event) => {
  if (!eventsOverlap) return false;
  return allCalendarEvents.some(e => e.id !== event.id && eventsOverlap(event, e));
};

// Get other calendar events for a date
const getOtherCalendarEventsForDate = (date) => {
  return allCalendarEvents.filter(event =>
    event?.start && event.context !== context &&
    new Date(event.start).toDateString() === date.toDateString()
  );
};
const weekDays = config.weekStartMon
? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
return (
<div style={{ width: "100%", padding: "0 20px" }}>
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
fontSize: 11,
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
    gap: 8
  }}>
    {days.map((dayInfo, index) => {
      const { date, isCurrentMonth } = dayInfo;
      const isToday = date.toDateString() === today.toDateString();
      const dayEvents = events.filter(event =>
        event?.start && new Date(event.start).toDateString() === date.toDateString()
      );
      const otherCalendarEvents = getOtherCalendarEventsForDate(date);
      // Check if any event on this day has conflicts
      const dayHasConflicts = dayEvents.some(e => hasConflict(e));

      return (
        <div
          key={index}
          onClick={() => isCurrentMonth && onDayClick(date)}
          style={{
            minHeight: 110,
            padding: 10,
            borderRadius: 10,
            background: isCurrentMonth ? (isToday ? theme.selection : theme.hoverBg) : theme.bg,
            border: `1px solid ${(dayHasConflicts && config.showConflictNotifications) ? '#EF4444' : (isToday ? theme.accent + '40' : theme.border)}`,
            cursor: isCurrentMonth ? "pointer" : "default",
            opacity: isCurrentMonth ? 1 : 0.3,
            transition: "all 0.2s",
            position: "relative"
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
          {/* Conflict indicator for the day */}
          {dayHasConflicts && config.showConflictNotifications && (
            <div style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 12,
              height: 12,
              background: "#EF4444",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 8,
              fontWeight: 700,
              color: "#fff"
            }}>!</div>
          )}

          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: isCurrentMonth ? (isToday ? theme.accent : theme.text) : theme.textMuted,
            marginBottom: 6,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {date.getDate()}
              {/* Other calendar indicator dots */}
              {otherCalendarEvents.length > 0 && (
                <span style={{
                  display: "flex",
                  gap: 2
                }}>
                  {otherCalendarEvents.slice(0, 3).map((e, i) => (
                    <span
                      key={i}
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: e.context === 'family' ? theme.familyAccent : theme.accent,
                        opacity: 0.6
                      }}
                      title={`${e.context === 'family' ? 'Family' : 'Personal'}: ${e.title || 'Event'}`}
                    />
                  ))}
                </span>
              )}
            </span>
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
            {dayEvents.slice(0, 3).map(event => {
              const eventHasConflict = hasConflict(event);
              return (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                  style={{
                    padding: "3px 6px",
                    background: (eventHasConflict && config.showConflictNotifications) ? '#EF444420' : theme.accent + '15',
                    borderRadius: 4,
                    fontSize: 9,
                    fontWeight: 600,
                    color: (eventHasConflict && config.showConflictNotifications) ? '#EF4444' : theme.accent,
                    cursor: "pointer",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    transition: "all 0.2s",
                    border: (eventHasConflict && config.showConflictNotifications) ? '1px solid #EF4444' : 'none'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = (eventHasConflict && config.showConflictNotifications) ? '#EF444430' : theme.accent + '25'}
                  onMouseLeave={e => e.currentTarget.style.background = (eventHasConflict && config.showConflictNotifications) ? '#EF444420' : theme.accent + '15'}
                >
                  {event.title || 'Event'}
                </div>
              );
            })}

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
allCalendarEvents = [],
theme,
config,
tags,
accentColor,
onDayClick,
context,
eventsOverlap,
// Timer props (for compact display)
// timers,
// toggleTimer,
// formatTimer,
// resetTimer,
// Goals props
goals,
// setGoals,
// toggleGoal,
// addGoal,
// removeGoal,
// newGoal,
// setNewGoal
}) {
const year = currentDate.getFullYear();
const today = React.useMemo(() => new Date(), []);
// const isCurrentYear = year === today.getFullYear();
const [hoveredDay, setHoveredDay] = React.useState(null);
const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });

// Auto-reload removed - app handles day changes internally
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

// Check if any event on a given day has conflicts
const dayHasConflicts = React.useCallback((dayEvents) => {
  if (!eventsOverlap || !dayEvents || dayEvents.length === 0) return false;
  return dayEvents.some(event =>
    allCalendarEvents.some(e => e.id !== event.id && eventsOverlap(event, e))
  );
}, [allCalendarEvents, eventsOverlap]);

// Get other calendar events for a date
const getOtherCalendarEventsForDate = React.useCallback((date) => {
  return allCalendarEvents.filter(event =>
    event?.start && event.context !== context &&
    new Date(event.start).toDateString() === date.toDateString()
  );
}, [allCalendarEvents, context]);
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
// Responsive cell size - slightly larger to fill the width better
const CELL_SIZE = 30;

// Calculate year progress
const now = new Date();
const startOfYear = new Date(year, 0, 1);
const endOfYear = new Date(year, 11, 31, 23, 59, 59);
const totalYearMs = endOfYear - startOfYear;
const elapsedMs = now - startOfYear;
const yearProgress = Math.min(100, Math.max(0, (elapsedMs / totalYearMs) * 100));
const daysInYear = Math.ceil((endOfYear - startOfYear) / (1000 * 60 * 60 * 24));
const daysElapsed = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
const daysRemaining = daysInYear - daysElapsed;
const isCurrentYear = year === now.getFullYear();

// Calculate year statistics
const yearEvents = events.filter(e => {
  const eventDate = new Date(e.start);
  return eventDate.getFullYear() === year;
});
const eventsByMonth = Array.from({ length: 12 }, (_, i) =>
  yearEvents.filter(e => new Date(e.start).getMonth() === i).length
);
const totalYearEvents = yearEvents.length;
const busiestMonthIndex = eventsByMonth.indexOf(Math.max(...eventsByMonth));
const busiestMonth = monthNames[busiestMonthIndex];
const upcomingEvents = yearEvents.filter(e => new Date(e.start) > now).length;

return (
<div className="year-view-container" style={{
width: "100%",
height: "100%",
display: "flex",
flexDirection: "column",
gap: 6,
overflowX: "auto",
overflowY: "auto",
padding: '0 4px',
WebkitOverflowScrolling: 'touch'
}}>
{/* Year Progress Indicator - Ultra Premium Pill */}
{isCurrentYear && (
<div className="year-progress-bar" style={{
width: "fit-content",
minWidth: 1150,
margin: "0 auto",
padding: '8px 14px',
background: config.darkMode
  ? 'linear-gradient(135deg, #1a1a1d 0%, #18181b 100%)'
  : 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
border: `1px solid ${config.darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
borderRadius: 12,
boxShadow: config.darkMode
  ? 'inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.2)'
  : 'inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.04)',
display: 'flex',
alignItems: 'center',
gap: 12,
position: 'relative',
overflow: 'hidden',
flexShrink: 0
}}>

{/* Left side - Text content */}
<div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
<div style={{
display: 'flex',
alignItems: 'baseline',
gap: 8,
marginBottom: 4
}}>
<h3 style={{
fontSize: 13,
fontWeight: 700,
fontFamily: theme.fontDisplay,
color: theme.text,
letterSpacing: '-0.02em',
lineHeight: 1
}}>
{year} Progress
</h3>
<span style={{
fontSize: 11,
fontWeight: 600,
color: theme.textMuted,
fontFamily: theme.fontFamily,
letterSpacing: '0.02em'
}}>
{daysElapsed}d • {daysRemaining}d left
</span>
</div>

{/* Premium Progress Bar */}
<div style={{
height: 5,
background: config.darkMode
? `${accentColor}18`
: `${accentColor}12`,
borderRadius: 10,
overflow: 'hidden',
position: 'relative',
boxShadow: config.darkMode
? 'inset 0 1px 2px rgba(0,0,0,0.2)'
: 'inset 0 1px 2px rgba(0,0,0,0.06)'
}}>
<div style={{
width: `${yearProgress}%`,
height: '100%',
background: theme.metallicAccent || `linear-gradient(90deg, ${accentColor}, ${accentColor}dd, ${accentColor}aa)`,
borderRadius: 10,
transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
boxShadow: `0 0 12px ${accentColor}40, inset 0 1px 0 rgba(255,255,255,0.3)`,
position: 'relative'
}}>
{/* Shimmer effect */}
<div style={{
position: 'absolute',
inset: 0,
background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
backgroundSize: '200% 100%',
animation: yearProgress > 0 ? 'shimmer 2s infinite' : 'none'
}} />
</div>
</div>
</div>

{/* Right side - Premium percentage badge */}
<div style={{
padding: '5px 12px',
background: theme.metallicAccent || `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
borderRadius: 8,
boxShadow: `0 2px 8px ${accentColor}30`,
border: `1px solid ${accentColor}30`,
position: 'relative',
zIndex: 1
}}>
<div style={{
fontSize: 12,
fontWeight: 700,
fontFamily: 'SF Mono, monospace',
color: config.darkMode ? '#000000' : '#FFFFFF',
letterSpacing: '-0.02em',
lineHeight: 1
}}>
{yearProgress.toFixed(1)}%
</div>
</div>
</div>
)}

<div className="year-calendar-grid" style={{
width: "fit-content",
minWidth: 1150,
margin: "0 auto",
display: "flex",
flexDirection: "column",
gap: 0,
flexShrink: 0
}}>
<div style={{
position: "sticky",
top: 0,
zIndex: 10,
background: theme.bg,
borderBottom: `1px solid ${theme.border}`,
paddingBottom: 3,
marginBottom: 3,
flexShrink: 0
}}>
<div style={{
display: "flex",
alignItems: "center",
gap: 0
}}>
<div style={{
width: 36,
flexShrink: 0
}} />
        <div style={{
          display: "flex",
          gap: 0
        }}>
          {Array.from({ length: 37 }).map((_, i) => {
            const isWeekendHeader = (i % 7 === 5 || i % 7 === 6);
            return (
            <div
              key={i}
              style={{
                width: CELL_SIZE,
                textAlign: "center",
                fontSize: 10,
                fontWeight: 500,
                color: isWeekendHeader ? '#F97316' : theme.textMuted,
                padding: "3px 0",
                fontFamily: 'SF Mono, Menlo, Monaco, monospace',
                letterSpacing: '0.01em'
              }}
            >
              {weekDayAbbr[i % 7]}
            </div>
          );
          })}
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
            marginBottom: 0
          }}
        >
          <div style={{
            width: 36,
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 500,
            color: accentColor,
            paddingRight: 8,
            textAlign: "right",
            fontFamily: 'SF Mono, Menlo, Monaco, monospace',
            letterSpacing: '-0.01em'
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

              const { date, day, isToday, isWeekend, events: cellEvents } = cell;
              const hasEvents = cellEvents.length > 0;
              const hasConflicts = dayHasConflicts(cellEvents);
              const otherEvents = getOtherCalendarEventsForDate(date);
              const hasOtherCalendarEvents = otherEvents.length > 0;

              return (
                <div
                  key={cellIndex}
                  onClick={() => onDayClick(date)}
                  onMouseEnter={(e) => {
                    if (hasEvents || hasOtherCalendarEvents) {
                      setHoveredDay({ date, events: cellEvents, otherEvents });
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltipPos({ x: rect.left, y: rect.bottom + 6 });
                    }
                    e.currentTarget.style.opacity = "0.7";
                  }}
                  onMouseLeave={(e) => {
                    setHoveredDay(null);
                    e.currentTarget.style.opacity = "1";
                  }}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    position: "relative",
                    transition: "opacity 0.15s",
                    fontSize: 12,
                    fontWeight: 500,
                    fontFamily: 'SF Mono, Menlo, Monaco, monospace',
                    letterSpacing: '-0.01em',
                    color: isToday
                      ? accentColor
                      : (hasConflicts && config.showConflictNotifications)
                      ? '#EF4444'
                      : hasEvents
                      ? theme.text
                      : isWeekend
                      ? '#F97316'
                      : theme.textMuted
                  }}
                >
                  {/* Today circle indicator */}
                  {isToday && (
                    <div style={{
                      position: "absolute",
                      inset: 3,
                      borderRadius: "50%",
                      border: `2px solid ${accentColor}`,
                      pointerEvents: "none"
                    }} />
                  )}

                  {day}

                  {/* Event indicator - subtle underline */}
                  {hasEvents && !isToday && (
                    <div style={{
                      position: "absolute",
                      bottom: 4,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 8,
                      height: 2,
                      borderRadius: 1,
                      background: (hasConflicts && config.showConflictNotifications)
                        ? '#EF4444'
                        : accentColor,
                      opacity: 0.8
                    }} />
                  )}

                  {/* Other calendar indicator */}
                  {hasOtherCalendarEvents && !hasEvents && (
                    <div style={{
                      position: "absolute",
                      bottom: 4,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 4,
                      height: 2,
                      borderRadius: 1,
                      background: otherEvents[0]?.context === 'family' ? theme.familyAccent : theme.accent,
                      opacity: 0.5
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    })}

  </div>

  {/* Year Insights - Clean Pill */}
  {(() => {
    const maxEvents = Math.max(...eventsByMonth, 1);
    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
    yearEvents.forEach(e => {
      dayOfWeekCounts[new Date(e.start).getDay()]++;
    });
    const busiestDayIndex = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
    const busiestDayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][busiestDayIndex];
    const eventDates = yearEvents.map(e => new Date(e.start).toDateString());
    const uniqueDays = [...new Set(eventDates)].length;
    const monthInitials = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

    return (
      <div style={{
        width: "100%",
        maxWidth: 1160,
        margin: "10px auto",
        padding: '10px 16px',
        background: config.darkMode
          ? 'rgba(255,255,255,0.02)'
          : 'rgba(0,0,0,0.015)',
        border: `1px solid ${theme.border}`,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexShrink: 0
      }}>
        {/* Monthly activity sparkline with labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 3,
            height: 28
          }}>
            {eventsByMonth.map((count, i) => {
              const h = maxEvents > 0 ? Math.max(4, (count / maxEvents) * 26) : 4;
              const isBusiest = i === busiestMonthIndex && count > 0;
              const isCurrent = i === now.getMonth() && year === now.getFullYear();
              return (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: h,
                    background: isBusiest ? accentColor
                      : isCurrent ? `${accentColor}aa`
                      : count > 0 ? (config.darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)')
                      : (config.darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                    borderRadius: 2
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {monthInitials.map((m, i) => (
              <span
                key={i}
                style={{
                  width: 8,
                  textAlign: 'center',
                  fontSize: 7,
                  fontFamily: 'SF Mono, Menlo, Monaco, monospace',
                  fontWeight: i === busiestMonthIndex ? 700 : 400,
                  color: i === busiestMonthIndex ? accentColor
                    : (i === now.getMonth() && year === now.getFullYear()) ? theme.text
                    : theme.textMuted
                }}
              >
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: theme.border }} />

        {/* Stats */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <span style={{
            fontSize: 18,
            fontWeight: 700,
            fontFamily: 'SF Mono, Menlo, Monaco, monospace',
            color: accentColor,
            letterSpacing: '-0.03em'
          }}>
            {totalYearEvents}
          </span>
          <span style={{ fontSize: 10, color: theme.textMuted }}>events</span>
        </div>

        <div style={{ width: 1, height: 28, background: theme.border }} />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'SF Mono, Menlo, Monaco, monospace',
            color: theme.text
          }}>
            {busiestMonth}
          </span>
          <span style={{ fontSize: 10, color: theme.textMuted }}>peak</span>
        </div>

        <div style={{ width: 1, height: 28, background: theme.border }} />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'SF Mono, Menlo, Monaco, monospace',
            color: theme.text
          }}>
            {busiestDayName}
          </span>
          <span style={{ fontSize: 10, color: theme.textMuted }}>busiest</span>
        </div>

        <div style={{ width: 1, height: 28, background: theme.border }} />

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'SF Mono, Menlo, Monaco, monospace',
            color: theme.textSec
          }}>
            {uniqueDays}
          </span>
          <span style={{ fontSize: 10, color: theme.textMuted }}>active days</span>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Upcoming pill */}
        {upcomingEvents > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 10px',
            background: `${accentColor}12`,
            borderRadius: 6,
            border: `1px solid ${accentColor}20`
          }}>
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'SF Mono, Menlo, Monaco, monospace',
              color: accentColor
            }}>
              {upcomingEvents}
            </span>
            <span style={{ fontSize: 10, color: theme.textSec }}>upcoming</span>
          </div>
        )}
      </div>
    );
  })()}

  {/* Australian Public Holidays - Compact Premium Grid */}
  <div className="holidays-section" style={{
    width: "100%",
    maxWidth: 1160,
    margin: "8px auto 0",
    padding: '10px 14px',
    background: config.darkMode ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.01)',
    border: `1px solid ${theme.border}`,
    borderRadius: 10,
    flexShrink: 0
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: theme.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {year} Public Holidays
      </span>
      <span style={{ fontSize: 9, color: theme.textMuted, opacity: 0.6 }}>* regional</span>
    </div>
    <div className="holidays-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
      {[
        { month: 'Jan', holidays: [{ d: 1, n: "New Year's", s: 'ALL' }, { d: 26, n: 'Australia Day', s: 'ALL' }] },
        { month: 'Feb', holidays: [{ d: 9, n: 'Regatta', s: 'TAS*' }] },
        { month: 'Mar', holidays: [{ d: 2, n: 'Labour', s: 'WA' }, { d: 9, n: 'Labour', s: 'VIC' }, { d: 9, n: 'Canberra', s: 'ACT' }, { d: 9, n: 'Adelaide Cup', s: 'SA' }] },
        { month: 'Apr', holidays: [{ d: 3, n: 'Good Fri', s: 'ALL' }, { d: 4, n: 'Easter Sat', s: 'ALL' }, { d: 6, n: 'Easter Mon', s: 'ALL' }, { d: 25, n: 'ANZAC', s: 'ALL' }] },
        { month: 'May', holidays: [{ d: 4, n: 'Labour', s: 'QLD' }, { d: 4, n: 'May Day', s: 'NT' }] },
        { month: 'Jun', holidays: [{ d: 1, n: 'WA Day', s: 'WA' }, { d: 1, n: 'Reconciliation', s: 'ACT' }, { d: 8, n: "King's Bday", s: 'NSW VIC' }] },
        { month: 'Jul', holidays: [] },
        { month: 'Aug', holidays: [{ d: 12, n: 'Ekka', s: 'QLD*' }] },
        { month: 'Sep', holidays: [{ d: 28, n: "King's Bday", s: 'WA' }] },
        { month: 'Oct', holidays: [{ d: 5, n: 'Labour', s: 'NSW ACT SA' }] },
        { month: 'Nov', holidays: [{ d: 2, n: 'Recreation', s: 'TAS*' }, { d: 3, n: 'Melb Cup', s: 'VIC*' }] },
        { month: 'Dec', holidays: [{ d: 25, n: 'Christmas', s: 'ALL' }, { d: 26, n: 'Boxing', s: 'ALL' }] },
      ].map(({ month, holidays }) => (
        <div key={month} style={{
          padding: '6px 8px',
          background: config.darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.5)',
          borderRadius: 6,
          border: `1px solid ${config.darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}`,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: accentColor, marginBottom: 3, fontFamily: theme.fontFamily }}>{month}</div>
          {holidays.length === 0 ? (
            <div className="holiday-text" style={{ fontSize: 10, color: theme.textMuted, opacity: 0.4 }}>—</div>
          ) : holidays.map((h, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1, lineHeight: 1.3 }}>
              <span className="holiday-date" style={{ fontSize: 9, color: theme.textMuted, fontFamily: 'SF Mono, monospace', minWidth: 14, opacity: 0.7 }}>{h.d}</span>
              <span className="holiday-text" style={{ fontSize: 10, color: theme.text, fontWeight: 500, flex: 1 }}>{h.n}</span>
              <span className="holiday-state" style={{
                fontSize: 8,
                padding: '1px 3px',
                borderRadius: 2,
                background: h.s === 'ALL' ? `${accentColor}15` : 'transparent',
                color: h.s === 'ALL' ? accentColor : theme.textMuted,
                fontWeight: 600,
                opacity: h.s === 'ALL' ? 1 : 0.6
              }}>{h.s}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>

  {hoveredDay && (
    <div style={{
      position: "fixed",
      left: tooltipPos.x,
      top: tooltipPos.y,
      background: theme.liquidGlass,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 12,
      padding: "12px",
      boxShadow: theme.liquidShadow,
      border: `1px solid ${theme.liquidBorder}`,
      zIndex: 900, // Tooltips layer
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
          const tag = tags.find(t => t.tagId === event.category) || tags[0];
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

// Premium Event List Panel - Birdseye-inspired
// Memoized event item component for better performance
const EventListItem = React.memo(({ event, tag, accentColor, theme, isDark, formatEventTime, draggedEvent, onDragStart, onEventClick }) => {
  const tagColor = tag?.color || accentColor;
  const isBeingDragged = draggedEvent?.id === event.id;

  return (
    <div
      key={event.id}
      draggable
      onDragStart={(e) => onDragStart(e, event)}
      onClick={() => onEventClick(event)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 12px',
        background: isDark ? 'rgba(255,255,255,0.03)' : '#FAFBFC',
        borderRadius: 10,
        cursor: 'grab',
        opacity: isBeingDragged ? 0.5 : 1,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9'}`,
        transition: 'all 0.15s',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9';
        e.currentTarget.style.transform = 'translateX(2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : '#FAFBFC';
        e.currentTarget.style.transform = 'translateX(0)';
      }}
    >
      {/* Color indicator */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        background: tagColor,
        borderRadius: '10px 0 0 10px'
      }} />

      {/* Time */}
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        color: theme.textMuted,
        minWidth: 52,
        paddingTop: 2
      }}>
        {formatEventTime(event.start)}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: theme.text,
          marginBottom: 2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {event.title}
        </div>
        {event.location && (
          <div style={{
            fontSize: 10,
            color: theme.textMuted,
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <ICONS.MapPin width={10} height={10} />
            {event.location}
          </div>
        )}
      </div>

      {/* Drag handle */}
      <div style={{
        color: theme.textMuted,
        opacity: 0.4,
        display: 'flex',
        alignItems: 'center'
      }}>
        <ICONS.GripVertical width={14} height={14} />
      </div>
    </div>
  );
});

// Focus View - For Goals and Timers
function FocusView({
  theme,
  config,
  goals,
  toggleGoal,
  addGoal,
  removeGoal,
  newGoal,
  setNewGoal,
  timers,
  toggleTimer,
  resetTimer,
  formatTimer,
  accentColor,
  goalsProgress,
  goalsCompleted,
  events,
  tags,
  setEditingEvent
}) {
  const isDark = config.darkMode;
  const [quickNotes, setQuickNotes] = React.useState(() => {
    const saved = localStorage.getItem('quickNotes');
    return saved || '';
  });

  // Save quick notes to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem('quickNotes', quickNotes);
  }, [quickNotes]);

  // Get today's events
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayEvents = events
    .filter(e => {
      const eventDate = new Date(e.start);
      return eventDate >= today && eventDate < tomorrow;
    })
    .sort((a, b) => new Date(a.start) - new Date(b.start));

  return (
    <div style={{
      height: 'calc(100vh - 120px)',
      width: '100%',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4
      }}>
        <div>
          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            fontFamily: theme.fontDisplay,
            color: theme.text,
            marginBottom: 4,
            letterSpacing: '-0.03em',
            background: theme.metallicAccent || `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Focus Mode
          </h1>
          <p style={{
            fontSize: 13,
            color: theme.textSec,
            fontFamily: theme.fontFamily,
            fontWeight: 500
          }}>
            Your productivity command center
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 16,
        minHeight: 0
      }}>
        {/* Daily Goals Card */}
        <div style={{
          background: theme.premiumGlass || theme.liquidGlass,
          backdropFilter: theme.glassBlur || 'blur(32px)',
          WebkitBackdropFilter: theme.glassBlur || 'blur(32px)',
          border: `1px solid ${theme.premiumGlassBorder || theme.liquidBorder}`,
          borderRadius: 16,
          padding: 20,
          boxShadow: theme.premiumShadow || theme.liquidShadow,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          {/* Goals Header */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: `linear-gradient(135deg, #10b981, #059669)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}>
                {goalsProgress === 100 ? (
                  <svg width="20" height="20" viewBox="0 0 24 24"><path d="M4 12L10 18L20 6" stroke="#fff" strokeWidth="3" fill="none"/></svg>
                ) : (
                  <ICONS.Target width={20} height={20} style={{ color: '#fff' }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{
                  fontSize: 17,
                  fontWeight: 600,
                  fontFamily: theme.fontDisplay,
                  color: theme.text,
                  marginBottom: 4,
                  letterSpacing: '-0.02em'
                }}>
                  Daily Goals
                </h2>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}>
                  <div style={{
                    flex: 1,
                    height: 5,
                    background: isDark ? `${accentColor}18` : `${accentColor}12`,
                    borderRadius: 3,
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${goalsProgress}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${accentColor}, ${accentColor}cc)`,
                      borderRadius: 3,
                      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                  </div>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: theme.fontFamily,
                    color: goalsProgress === 100 ? '#10b981' : theme.textSec,
                    minWidth: 45
                  }}>
                    {goalsCompleted}/{goals.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Goals List */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 12,
            overflow: 'auto',
            minHeight: 0
          }}>
            {goals.map(goal => (
              <div
                key={goal.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  background: goal.done
                    ? (isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)')
                    : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                  border: `1px solid ${goal.done ? 'rgba(16,185,129,0.2)' : theme.liquidBorder}`,
                  borderRadius: 10,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <div
                  onClick={() => toggleGoal(goal.id)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    cursor: 'pointer',
                    flexShrink: 0,
                    border: `2px solid ${goal.done ? '#10b981' : theme.border}`,
                    background: goal.done ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  {goal.done && (
                    <svg width="11" height="11" viewBox="0 0 12 12">
                      <path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2" fill="none"/>
                    </svg>
                  )}
                </div>
                <span style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: theme.fontFamily,
                  color: goal.done ? theme.textMuted : theme.text,
                  textDecoration: goal.done ? 'line-through' : 'none',
                  letterSpacing: '0.01em'
                }}>
                  {goal.text}
                </span>
                <button
                  onClick={() => removeGoal(goal.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: theme.textMuted,
                    cursor: 'pointer',
                    padding: 5,
                    borderRadius: 5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = theme.hoverBg;
                    e.currentTarget.style.color = theme.indicator;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = theme.textMuted;
                  }}
                >
                  <ICONS.Close width={13} height={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Add Goal Input */}
          <div style={{
            display: 'flex',
            gap: 8
          }}>
            <input
              type="text"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addGoal()}
              placeholder="Add a new goal..."
              style={{
                flex: 1,
                padding: '10px 14px',
                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${theme.liquidBorder}`,
                borderRadius: 8,
                color: theme.text,
                fontSize: 13,
                fontFamily: theme.fontFamily,
                outline: 'none'
              }}
            />
            <button
              onClick={addGoal}
              disabled={!newGoal.trim()}
              style={{
                padding: '10px 18px',
                background: newGoal.trim() ? `linear-gradient(135deg, #10b981, #059669)` : theme.hoverBg,
                border: 'none',
                borderRadius: 8,
                color: newGoal.trim() ? '#fff' : theme.textMuted,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: theme.fontFamily,
                cursor: newGoal.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                boxShadow: newGoal.trim() ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none'
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Focus Timers Card - Compact */}
        <div style={{
          background: theme.premiumGlass || theme.liquidGlass,
          backdropFilter: theme.glassBlur || 'blur(32px)',
          WebkitBackdropFilter: theme.glassBlur || 'blur(32px)',
          border: `1px solid ${theme.premiumGlassBorder || theme.liquidBorder}`,
          borderRadius: 16,
          padding: 20,
          boxShadow: theme.premiumShadow || theme.liquidShadow,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 6
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: theme.metallicAccent || `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: theme.metallicShadow || `0 4px 12px ${accentColor}40`
              }}>
                <ICONS.Clock width={20} height={20} style={{ color: '#fff' }} />
              </div>
              <h2 style={{
                fontSize: 17,
                fontWeight: 600,
                fontFamily: theme.fontDisplay,
                color: theme.text,
                letterSpacing: '-0.02em'
              }}>
                Focus Timers
              </h2>
            </div>
          </div>

          {/* Timers List - Compact */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            overflow: 'auto',
            minHeight: 0
          }}>
            {timers.map(timer => (
              <div
                key={timer.id}
                style={{
                  padding: 12,
                  background: timer.running
                    ? (theme.premiumGlass || `linear-gradient(135deg, ${timer.color}15, ${timer.color}08)`)
                    : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                  border: `1px solid ${timer.running ? `${timer.color}40` : theme.premiumGlassBorder || theme.liquidBorder}`,
                  borderRadius: 10,
                  boxShadow: timer.running ? (theme.metallicShadow || `0 2px 8px ${timer.color}20`) : 'none',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                {/* Timer Info - Left Side */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 4
                  }}>
                    <div style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: timer.color,
                      boxShadow: timer.running ? `0 0 10px ${timer.color}` : 'none',
                      animation: timer.running ? 'pulse 1.5s ease-in-out infinite' : 'none'
                    }} />
                    <span style={{
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: theme.fontFamily,
                      color: timer.running ? timer.color : theme.text,
                      letterSpacing: '0.01em'
                    }}>
                      {timer.name}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 20,
                    fontWeight: 600,
                    fontFamily: 'SF Mono, monospace',
                    color: timer.running ? timer.color : theme.text,
                    letterSpacing: '-0.01em'
                  }}>
                    {formatTimer(timer.seconds)}
                  </div>
                </div>

                {/* Timer Controls - Right Side */}
                <div style={{
                  display: 'flex',
                  gap: 5
                }}>
                  <button
                    onClick={() => toggleTimer(timer.id)}
                    style={{
                      padding: '7px 14px',
                      background: timer.running
                        ? `${timer.color}20`
                        : (theme.metallicAccent || `linear-gradient(135deg, ${timer.color}, ${timer.color}dd)`),
                      color: timer.running ? timer.color : '#fff',
                      border: timer.running ? `1px solid ${timer.color}40` : 'none',
                      borderRadius: 7,
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: theme.fontFamily,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: timer.running ? 'none' : (theme.metallicShadow || `0 2px 8px ${timer.color}30`),
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {timer.running ? 'Pause' : 'Start'}
                  </button>
                  <button
                    onClick={() => resetTimer(timer.id)}
                    style={{
                      padding: '7px 10px',
                      background: theme.metallicGradient || 'transparent',
                      color: theme.textMuted,
                      border: `1px solid ${theme.premiumGlassBorder || theme.liquidBorder}`,
                      borderRadius: 7,
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: theme.fontFamily,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: theme.metallicShadow || 'none'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = theme.metallicGradientHover || theme.hoverBg;
                      e.currentTarget.style.borderColor = theme.border;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = theme.metallicGradient || 'transparent';
                      e.currentTarget.style.borderColor = theme.premiumGlassBorder || theme.liquidBorder;
                    }}
                  >
                    ↻
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Agenda Card */}
        <div style={{
          background: theme.premiumGlass || theme.liquidGlass,
          backdropFilter: theme.glassBlur || 'blur(32px)',
          WebkitBackdropFilter: theme.glassBlur || 'blur(32px)',
          border: `1px solid ${theme.premiumGlassBorder || theme.liquidBorder}`,
          borderRadius: 16,
          padding: 20,
          boxShadow: theme.premiumShadow || theme.liquidShadow,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 6
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: `linear-gradient(135deg, #6366f1, #818cf8)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 12px rgba(99, 102, 241, 0.4)`
              }}>
                <ICONS.Calendar width={20} height={20} style={{ color: '#fff' }} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{
                  fontSize: 17,
                  fontWeight: 600,
                  fontFamily: theme.fontDisplay,
                  color: theme.text,
                  letterSpacing: '-0.02em'
                }}>
                  Today's Agenda
                </h2>
                <p style={{
                  fontSize: 11,
                  color: theme.textMuted,
                  fontFamily: theme.fontFamily,
                  fontWeight: 500
                }}>
                  {todayEvents.length} {todayEvents.length === 1 ? 'event' : 'events'}
                </p>
              </div>
            </div>
          </div>

          {/* Today's Events List */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            overflow: 'auto',
            minHeight: 0
          }}>
            {todayEvents.length > 0 ? (
              todayEvents.map(event => {
                const tag = tags.find(t => t.tagId === event.category) || tags[0];
                const start = new Date(event.start);
                const end = new Date(event.end);
                return (
                  <div
                    key={event.id}
                    onClick={() => setEditingEvent(event)}
                    style={{
                      padding: 12,
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      border: `1px solid ${theme.liquidBorder}`,
                      borderLeft: `3px solid ${tag?.color || accentColor}`,
                      borderRadius: 10,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
                      e.currentTarget.style.transform = 'translateX(2px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: theme.text,
                      marginBottom: 3,
                      fontFamily: theme.fontFamily
                    }}>
                      {event.title}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: theme.textMuted,
                      fontFamily: theme.fontFamily
                    }}>
                      {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      {' - '}
                      {end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </div>
                    {event.location && (
                      <div style={{
                        fontSize: 10,
                        color: theme.textSec,
                        marginTop: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <ICONS.MapPin width={9} height={9} />
                        {event.location}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '30px 20px',
                color: theme.textMuted
              }}>
                <ICONS.Calendar width={28} height={28} style={{ opacity: 0.3, marginBottom: 10 }} />
                <div style={{ fontSize: 12 }}>No events scheduled</div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Notes Card */}
        <div style={{
          background: theme.premiumGlass || theme.liquidGlass,
          backdropFilter: theme.glassBlur || 'blur(32px)',
          WebkitBackdropFilter: theme.glassBlur || 'blur(32px)',
          border: `1px solid ${theme.premiumGlassBorder || theme.liquidBorder}`,
          borderRadius: 16,
          padding: 20,
          boxShadow: theme.premiumShadow || theme.liquidShadow,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 6
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: `linear-gradient(135deg, #f59e0b, #f97316)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 12px rgba(245, 158, 11, 0.4)`
              }}>
                <ICONS.Edit width={20} height={20} style={{ color: '#fff' }} />
              </div>
              <h2 style={{
                fontSize: 17,
                fontWeight: 600,
                fontFamily: theme.fontDisplay,
                color: theme.text,
                letterSpacing: '-0.02em'
              }}>
                Quick Notes
              </h2>
            </div>
          </div>

          {/* Notes Textarea */}
          <textarea
            value={quickNotes}
            onChange={(e) => setQuickNotes(e.target.value)}
            placeholder="Start typing..."
            style={{
              flex: 1,
              width: '100%',
              padding: '14px',
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${theme.liquidBorder}`,
              borderRadius: 10,
              color: theme.text,
              fontSize: 13,
              fontFamily: theme.fontFamily,
              lineHeight: 1.6,
              outline: 'none',
              resize: 'none',
              transition: 'all 0.2s',
              minHeight: 0
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = accentColor;
              e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = theme.liquidBorder;
              e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
            }}
          />
          <div style={{
            marginTop: 8,
            fontSize: 10,
            color: theme.textMuted,
            textAlign: 'right'
          }}>
            {quickNotes.length} chars • Auto-saved
          </div>
        </div>
      </div>
    </div>
  );
}

function EventListPanel({
  events,
  theme,
  tags,
  config,
  onEventClick,
  onEventReschedule,
  onClose,
  accentColor
}) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterCategory, setFilterCategory] = React.useState('all');
  const [draggedEvent, setDraggedEvent] = React.useState(null);
  const [dropTarget, setDropTarget] = React.useState(null);
  const [showAllDays, setShowAllDays] = React.useState(false);
  const isDark = config.darkMode;

  // Group events by date
  const groupedEvents = React.useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let filtered = events
      .filter(e => !e.deleted && new Date(e.start) >= now)
      .filter(e => {
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          return e.title?.toLowerCase().includes(term) ||
                 e.description?.toLowerCase().includes(term);
        }
        return true;
      })
      .filter(e => filterCategory === 'all' || e.category === filterCategory)
      .sort((a, b) => new Date(a.start) - new Date(b.start));

    const groups = {};
    filtered.forEach(event => {
      const date = new Date(event.start);
      const dateKey = date.toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = { date, events: [] };
      }
      groups[dateKey].events.push(event);
    });

    const allGroups = Object.values(groups);
    return showAllDays ? allGroups : allGroups.slice(0, 30); // Limit to next 30 days with events or show all
  }, [events, searchTerm, filterCategory, showAllDays]);

  const getTag = (categoryId) => tags.find(t => t.tagId === categoryId);

  const formatEventTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: !config.use24Hour
    });
  };

  const formatDateHeader = (date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDragStart = (e, event) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
  };

  const handleDragOver = (e, targetDate) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(targetDate.toDateString());
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e, targetDate) => {
    e.preventDefault();
    if (draggedEvent && onEventReschedule) {
      const oldStart = new Date(draggedEvent.start);
      const oldEnd = new Date(draggedEvent.end);
      const duration = oldEnd - oldStart;

      // Keep the same time, just change the date
      const newStart = new Date(targetDate);
      newStart.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
      const newEnd = new Date(newStart.getTime() + duration);

      onEventReschedule({
        ...draggedEvent,
        start: newStart,
        end: newEnd
      });
    }
    setDraggedEvent(null);
    setDropTarget(null);
  };

  const totalEvents = groupedEvents.reduce((sum, g) => sum + g.events.length, 0);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: 360,
      background: theme.premiumGlass || theme.liquidGlass,
      backdropFilter: theme.glassBlur || 'blur(32px)',
      WebkitBackdropFilter: theme.glassBlur || 'blur(32px)',
      borderLeft: `1px solid ${theme.premiumGlassBorder || theme.liquidBorder}`,
      boxShadow: theme.premiumShadow || '-8px 0 32px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      zIndex: 950, // Sidebar/panel layer - below modals
      transform: 'translateX(0)',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'}`,
        background: isDark ? 'rgba(255,255,255,0.02)' : '#FAFBFC'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}CC 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 12px ${accentColor}30`
            }}>
              <ICONS.Calendar width={16} height={16} style={{ color: '#fff' }} />
            </div>
            <div>
              <h3 style={{
                fontSize: 14,
                fontWeight: 600,
                color: theme.text,
                margin: 0,
                letterSpacing: '-0.2px'
              }}>
                All Events
              </h3>
              <span style={{ fontSize: 11, color: theme.textMuted }}>
                {totalEvents} upcoming
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.textMuted,
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex'
            }}
          >
            <ICONS.Close width={16} height={16} />
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <ICONS.Search
            width={14}
            height={14}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: theme.textMuted
            }}
          />
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              fontSize: 12,
              background: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9',
              border: 'none',
              borderRadius: 8,
              color: theme.text,
              outline: 'none'
            }}
          />
        </div>

        {/* Category Filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterCategory('all')}
            style={{
              padding: '4px 10px',
              fontSize: 10,
              fontWeight: 600,
              background: filterCategory === 'all' ? `${accentColor}15` : 'transparent',
              border: `1px solid ${filterCategory === 'all' ? accentColor : isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
              borderRadius: 6,
              color: filterCategory === 'all' ? accentColor : theme.textSec,
              cursor: 'pointer'
            }}
          >
            All
          </button>
          {tags.slice(0, 4).map(tag => (
            <button
              key={tag.id}
              onClick={() => setFilterCategory(tag.tagId)}
              style={{
                padding: '4px 10px',
                fontSize: 10,
                fontWeight: 600,
                background: filterCategory === tag.tagId ? `${tag.color}15` : 'transparent',
                border: `1px solid ${filterCategory === tag.tagId ? tag.color : isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
                borderRadius: 6,
                color: filterCategory === tag.tagId ? tag.color : theme.textSec,
                cursor: 'pointer'
              }}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      {/* Event List */}
      <div
        className="scroll-container"
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '12px 16px'
        }}
      >
        {groupedEvents.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: theme.textMuted
          }}>
            <ICONS.Calendar width={32} height={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ fontSize: 13, margin: 0 }}>No upcoming events</p>
            <p style={{ fontSize: 11, margin: '4px 0 0', opacity: 0.7 }}>
              {searchTerm ? 'Try a different search' : 'Create your first event'}
            </p>
          </div>
        ) : (
          groupedEvents.map((group, groupIndex) => (
            <div
              key={group.date.toDateString()}
              onDragOver={(e) => handleDragOver(e, group.date)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, group.date)}
              style={{
                marginBottom: 16,
                background: dropTarget === group.date.toDateString()
                  ? `${accentColor}10`
                  : 'transparent',
                borderRadius: 12,
                padding: dropTarget === group.date.toDateString() ? 8 : 0,
                transition: 'all 0.2s',
                border: dropTarget === group.date.toDateString()
                  ? `2px dashed ${accentColor}`
                  : '2px dashed transparent'
              }}
            >
              {/* Date Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
                paddingLeft: 4
              }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: groupIndex === 0 ? accentColor : theme.textSec,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {formatDateHeader(group.date)}
                </span>
                <div style={{
                  flex: 1,
                  height: 1,
                  background: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'
                }} />
                <span style={{
                  fontSize: 10,
                  color: theme.textMuted,
                  fontWeight: 500
                }}>
                  {group.events.length}
                </span>
              </div>

              {/* Events */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {group.events.map(event => {
                  const tag = getTag(event.category);
                  return (
                    <div
                      key={event.id}
                      onDragEnd={() => setDraggedEvent(null)}
                    >
                      <EventListItem
                        event={event}
                        tag={tag}
                        accentColor={accentColor}
                        theme={theme}
                        isDark={isDark}
                        formatEventTime={formatEventTime}
                        draggedEvent={draggedEvent}
                        onDragStart={handleDragStart}
                        onEventClick={onEventClick}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Load More Button */}
        {!showAllDays && groupedEvents.length >= 30 && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <button
              onClick={() => setShowAllDays(true)}
              style={{
                padding: '8px 16px',
                fontSize: 11,
                fontWeight: 600,
                background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
                borderRadius: 8,
                color: theme.text,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9';
              }}
            >
              Show All Events
            </button>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div style={{
        padding: '10px 16px',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'}`,
        background: isDark ? 'rgba(255,255,255,0.02)' : '#FAFBFC'
      }}>
        <p style={{
          fontSize: 10,
          color: theme.textMuted,
          margin: 0,
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6
        }}>
          <ICONS.GripVertical width={12} height={12} />
          Drag events to reschedule
        </p>
      </div>
    </div>
  );
}

function EventEditor({ event, currentDate, theme, config, tags, onSave, onDelete, onCancel, context, allCalendarEvents = [], eventsOverlap }) {
  // For new events, use currentDate with current time rounded to 15 min
  const getInitialStart = () => {
    if (event?.start) return new Date(event.start);
    const now = new Date();
    const base = currentDate ? new Date(currentDate) : new Date();
    base.setHours(now.getHours(), Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
    return base;
  };
  const initialStart = getInitialStart();

  const [form, setForm] = React.useState({
    title: event?.title || '',
    category: event?.category || (tags[0]?.tagId || ''),
    description: event?.description || '',
    location: event?.location || '',
    start: initialStart,
    end: event?.end ? new Date(event.end) : new Date(initialStart.getTime() + 60 * 60 * 1000),
    recurrencePattern: event?.recurrencePattern || 'none',
    recurrenceEndDate: event?.recurrenceEndDate || ''
  });
  const [errors, setErrors] = React.useState({});
  const [showMore, setShowMore] = React.useState(false);
  const isDark = config.darkMode;
  const accentColor = context === 'family' ? theme.familyAccent : theme.accent;

  // Find conflicts with current form times across ALL calendars
  const conflictingEvents = React.useMemo(() => {
    if (!eventsOverlap || !form.start || !form.end) return [];
    return allCalendarEvents.filter(e => {
      // Don't count the event being edited as a conflict
      if (event?.id && e.id === event.id) return false;
      return eventsOverlap({ start: form.start, end: form.end }, e);
    });
  }, [form.start, form.end, allCalendarEvents, event?.id, eventsOverlap]);

  React.useEffect(() => {
    // Show more options if editing existing event with location/notes
    if (event?.id && (event.location || event.description)) {
      setShowMore(true);
    }
  }, [event?.id, event?.location, event?.description]);

  const validateForm = () => {
    const newErrors = {};
    if (!form.title.trim()) newErrors.title = 'Title required';
    if (form.end <= form.start) newErrors.end = 'End must be after start';
    if (!form.category) newErrors.category = 'Select a category';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    onSave({ id: event?.id || null, ...form });
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontSize: 13,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontWeight: 500,
    background: isDark ? 'rgba(255,255,255,0.03)' : '#FAFBFC',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'}`,
    borderRadius: 10,
    color: theme.text,
    boxSizing: 'border-box',
    outline: 'none'
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-editor-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(15, 23, 42, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
        backdropFilter: 'blur(8px)'
      }}>
      <div onClick={onCancel} aria-label="Close dialog" style={{ position: 'absolute', inset: 0 }} />

      <div
        className="scale-enter"
        style={{
          background: theme.liquidGlass,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 20,
          width: '100%',
          maxWidth: 400,
          border: `1px solid ${theme.liquidBorder}`,
          boxShadow: isDark
            ? '0 24px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)'
            : '0 24px 48px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.9)',
          position: 'relative'
        }}
      >
        {/* Compact Header */}
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 id="event-editor-title" style={{ fontSize: 22, fontWeight: 600, fontFamily: theme.fontDisplay, color: theme.text, margin: 0, letterSpacing: '-0.02em' }}>
              {event?.id ? 'Edit Event' : 'New Event'}
            </h3>
            <span style={{
              fontSize: 10,
              padding: '3px 8px',
              background: `${accentColor}15`,
              color: accentColor,
              borderRadius: 6,
              fontWeight: 600,
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              letterSpacing: '0.02em'
            }}>
              {context === 'family' ? 'Family' : 'Personal'}
            </span>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.textMuted,
              cursor: 'pointer',
              padding: 6
            }}
          >
            <ICONS.Close width={18} height={18} />
          </button>
        </div>

        {/* Compact Form */}
        <form onSubmit={handleSubmit} style={{ padding: '16px 20px' }}>
          {/* Title */}
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Event title"
            style={{
              ...inputStyle,
              fontSize: 15,
              fontWeight: 500,
              padding: '12px 14px',
              marginBottom: 12,
              border: `1px solid ${errors.title ? theme.indicator : isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'}`
            }}
            autoFocus
          />

          {/* Date & Time - Stacked for proper display */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, color: theme.textMuted, marginBottom: 4, display: 'block', fontWeight: 600, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase' }}>Start</label>
              <input
                type="datetime-local"
                value={toLocalDateTimeString(form.start)}
                onChange={(e) => {
                  const newStart = new Date(e.target.value);
                  if (!isNaN(newStart.getTime())) {
                    setForm(prev => {
                      const duration = prev.end - prev.start;
                      return { ...prev, start: newStart, end: new Date(newStart.getTime() + duration) };
                    });
                  }
                }}
                style={{ ...inputStyle, fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, color: theme.textMuted, marginBottom: 4, display: 'block', fontWeight: 600, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase' }}>End</label>
              <input
                type="datetime-local"
                value={toLocalDateTimeString(form.end)}
                onChange={(e) => {
                  const newEnd = new Date(e.target.value);
                  if (!isNaN(newEnd.getTime())) setForm(prev => ({ ...prev, end: newEnd }));
                }}
                style={{ ...inputStyle, fontSize: 13, border: `1px solid ${errors.end ? theme.indicator : isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'}` }}
              />
              {errors.end && <div style={{ fontSize: 10, color: theme.indicator, marginTop: 4 }}>{errors.end}</div>}
            </div>
          </div>

          {/* Recurrence Options */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, color: theme.textMuted, marginBottom: 6, display: 'block', fontWeight: 600, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase' }}>Repeat</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { value: 'none', label: 'Never' },
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'fortnightly', label: '2 Wks' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'yearly', label: 'Yearly' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, recurrencePattern: option.value }))}
                  style={{
                    flex: 1,
                    padding: '5px 0',
                    fontSize: 10,
                    fontWeight: 600,
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                    borderRadius: 6,
                    border: `1px solid ${form.recurrencePattern === option.value ? accentColor : (isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB')}`,
                    background: form.recurrencePattern === option.value ? `${accentColor}15` : (isDark ? 'rgba(255,255,255,0.03)' : '#FAFBFC'),
                    color: form.recurrencePattern === option.value ? accentColor : theme.textSec,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'center'
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {form.recurrencePattern && form.recurrencePattern !== 'none' && (
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 10, color: theme.textMuted, marginBottom: 4, display: 'block', fontWeight: 600, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase' }}>Repeat Until (optional)</label>
                <input
                  type="date"
                  value={form.recurrenceEndDate || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, recurrenceEndDate: e.target.value || null }))}
                  style={{ ...inputStyle, fontSize: 13 }}
                />
              </div>
            )}
          </div>

          {/* Conflict Warning - Show when time overlaps with other events */}
          {conflictingEvents.length > 0 && (
            <div style={{
              marginBottom: 12,
              padding: '10px 12px',
              background: `${theme.indicator}10`,
              border: `1px solid ${theme.indicator}30`,
              borderRadius: 10
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: theme.indicator,
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Time Conflict
              </div>
              <div style={{ fontSize: 10, color: theme.textSec, lineHeight: 1.5 }}>
                This overlaps with {conflictingEvents.length} event{conflictingEvents.length > 1 ? 's' : ''}:
              </div>
              <div style={{ marginTop: 6 }}>
                {conflictingEvents.slice(0, 3).map(ce => {
                  const isFamily = ce.context === 'family';
                  return (
                    <div key={ce.id} style={{
                      fontSize: 10,
                      padding: '4px 8px',
                      marginTop: 4,
                      background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.8)',
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      <span style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: isFamily ? theme.familyAccent : theme.accent,
                        flexShrink: 0
                      }} />
                      <span style={{ color: theme.text, fontWeight: 600, flex: 1 }}>
                        {ce.title || 'Untitled'}
                      </span>
                      <span style={{
                        fontSize: 8,
                        padding: '2px 4px',
                        background: `${isFamily ? theme.familyAccent : theme.accent}20`,
                        color: isFamily ? theme.familyAccent : theme.accent,
                        borderRadius: 3,
                        fontWeight: 600
                      }}>
                        {isFamily ? 'Family' : 'Personal'}
                      </span>
                    </div>
                  );
                })}
                {conflictingEvents.length > 3 && (
                  <div style={{ fontSize: 9, color: theme.textMuted, marginTop: 4, paddingLeft: 8 }}>
                    +{conflictingEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Category - Compact chips */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 10, color: theme.textMuted, marginBottom: 6, display: 'block', fontWeight: 600, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", letterSpacing: '0.04em', textTransform: 'uppercase' }}>Category {errors.category && <span style={{ color: '#EF4444', marginLeft: 4 }}>*</span>}</label>
            {(!tags || tags.length === 0) ? (
              <div style={{ padding: '10px 12px', background: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: '1px solid #EF4444', borderRadius: 8, fontSize: 12, color: '#EF4444' }}>
                No categories available. Please reload the page or check your connection.
              </div>
            ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tags.map(tag => {
                const IconComponent = getTagIcon(tag, ICONS);
                const isSelected = form.category === tag.tagId;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, category: tag.tagId }))}
                    style={{
                      padding: '6px 10px',
                      background: isSelected ? `${tag.color}15` : 'transparent',
                      border: `1px solid ${isSelected ? tag.color : isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB'}`,
                      borderRadius: 8,
                      color: isSelected ? tag.color : theme.textSec,
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                      letterSpacing: '0.01em',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5
                    }}
                  >
                    {IconComponent && <IconComponent width={12} height={12} />}
                    {tag.name}
                  </button>
                );
              })}
            </div>
            )}
          </div>

          {/* Optional fields toggle */}
          {!showMore && (
            <button
              type="button"
              onClick={() => setShowMore(true)}
              style={{
                background: 'none',
                border: 'none',
                color: accentColor,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                letterSpacing: '0.01em',
                cursor: 'pointer',
                padding: '4px 0',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <ICONS.Plus width={14} height={14} /> Add location & notes
            </button>
          )}

          {/* Location & Notes - Collapsible */}
          {showMore && (
            <>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Location (optional)"
                style={{ ...inputStyle, marginBottom: 10 }}
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Notes (optional)"
                rows={2}
                style={{ ...inputStyle, resize: 'none', marginBottom: 12 }}
              />
            </>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 12, borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'}` }}>
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  border: `1px solid rgba(239, 68, 68, 0.3)`,
                  borderRadius: 10,
                  color: '#EF4444',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  letterSpacing: '0.02em',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '10px 18px',
                background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                border: 'none',
                borderRadius: 10,
                color: theme.textSec,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                letterSpacing: '0.02em',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 24px',
                background: accentColor,
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                letterSpacing: '0.02em',
                cursor: 'pointer'
              }}
            >
              {event?.id ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
// Subscription/Billing Content Component
function SubscriptionContent({ theme, user }) {
  const [subscription, setSubscription] = React.useState({
    plan: 'free',
    status: 'active',
    trialActive: false,
    features: SUBSCRIPTION_PLANS.FREE.features
  });
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [billingPeriod, setBillingPeriod] = React.useState('monthly');

  // Load subscription from Supabase on mount
  React.useEffect(() => {
    if (user?.uid) {
      getSubscriptionStatus(user.id).then(status => {
        setSubscription(status);
      }).catch(() => {
        // Fallback to localStorage
        const local = localSubscriptionManager.getLocalSubscription();
        if (local) setSubscription(local);
      });
    }
  }, [user?.uid]);

  const isPro = subscription.plan === 'pro' && (subscription.status === 'active' || subscription.trialActive);
  const trialDays = subscription.trialEndsAt ? getTrialDaysRemaining(subscription.trialEndsAt) : 0;

  // Use theme-consistent styling
  const cardBg = theme.premiumGlass || theme.liquidGlass || `${theme.accent}08`;
  const cardBorder = theme.premiumGlassBorder || theme.liquidBorder || `${theme.accent}20`;

  const handleStartTrial = async () => {
    if (!user?.uid) return;
    setIsProcessing(true);
    try {
      const { error } = await startFreeTrial(user.id);
      if (error) throw error;
      const status = await getSubscriptionStatus(user.id);
      setSubscription(status);
    } catch (err) {
      console.error('Trial start failed:', err);
      // Fallback to local demo
      const newSub = localSubscriptionManager.startTrialDemo();
      setSubscription(newSub);
    }
    setIsProcessing(false);
  };

  const handleUpgrade = async () => {
    setIsProcessing(true);
    try {
      const priceId = billingPeriod === 'yearly'
        ? (process.env.REACT_APP_STRIPE_PRO_YEARLY_PRICE_ID || SUBSCRIPTION_PLANS.PRO.yearlyPriceId)
        : (process.env.REACT_APP_STRIPE_PRO_PRICE_ID || SUBSCRIPTION_PLANS.PRO.priceId);

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid,
          userEmail: user?.email,
          priceId,
          isYearly: billingPeriod === 'yearly',
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error(data.error || 'Failed to create checkout session');
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Unable to start checkout. Please try again.');
    }
    setIsProcessing(false);
  };

  const handleManageSubscription = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user?.email }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error(data.error || 'Failed to open billing portal');
    } catch (err) {
      console.error('Portal error:', err);
      alert('Unable to open billing portal. Please try again.');
    }
    setIsProcessing(false);
  };

  const handleDowngrade = async () => {
    // Redirect to Stripe portal for cancellation
    handleManageSubscription();
  };

  // Check for payment success on mount
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success' && user?.uid) {
      // Refresh subscription status from Supabase
      getSubscriptionStatus(user.id).then(status => {
        setSubscription(status);
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      });
    }
  }, [user?.uid]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Current Plan Status */}
      <div style={{
        padding: '18px 20px',
        borderRadius: 14,
        background: isPro
          ? `linear-gradient(135deg, ${theme.accent}15, ${theme.accent}08)`
          : cardBg,
        border: `1.5px solid ${isPro ? theme.accent + '50' : cardBorder}`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: isPro
                ? theme.metallicAccent || `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`
                : `linear-gradient(135deg, ${theme.accent}15, ${theme.accent}08)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isPro ? `0 4px 12px ${theme.accent}40` : 'none',
              border: `1px solid ${theme.accent}30`
            }}>
              {isPro ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.textSec} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              )}
            </div>
            <div>
              <div style={{
                fontSize: 15,
                fontWeight: 700,
                color: theme.text,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
              }}>
                {subscription.trialActive ? 'Pro Trial' : isPro ? 'Pro Plan' : 'Free Plan'}
              </div>
              <div style={{
                fontSize: 11,
                color: theme.textSec,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
              }}>
                {subscription.trialActive
                  ? `${trialDays} days remaining`
                  : isPro ? 'All features unlocked' : 'Basic features'}
              </div>
            </div>
          </div>
          {isPro && (
            <div style={{
              padding: '4px 10px',
              borderRadius: 20,
              background: theme.accent,
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Active
            </div>
          )}
        </div>

        {/* Trial/Upgrade CTA */}
        {!isPro && !subscription.trialActive && (
          <button
            onClick={handleStartTrial}
            disabled={isProcessing}
            style={{
              width: '100%',
              padding: '12px 16px',
              marginTop: 8,
              background: theme.metallicAccent || `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`,
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: `0 4px 16px ${theme.accent}40`,
              opacity: isProcessing ? 0.7 : 1
            }}
          >
            {isProcessing ? 'Starting...' : `Start ${TRIAL_CONFIG.durationDays}-Day Free Trial`}
          </button>
        )}
      </div>

      {/* Pricing Cards */}
      {!isPro && (
        <>
          {/* Billing Period Toggle */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 4,
            padding: 4,
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 12,
            marginBottom: 4,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}>
            {['monthly', 'yearly'].map(period => (
              <button
                key={period}
                onClick={() => setBillingPeriod(period)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: billingPeriod === period
                    ? `linear-gradient(135deg, ${theme.accent}25, ${theme.accent}15)`
                    : 'transparent',
                  border: billingPeriod === period
                    ? `1.5px solid ${theme.accent}50`
                    : '1.5px solid transparent',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  color: billingPeriod === period ? theme.accent : theme.textSec,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: billingPeriod === period ? `0 2px 8px ${theme.accent}20` : 'none'
                }}
              >
                {period === 'monthly' ? 'Monthly' : 'Yearly (Save 17%)'}
              </button>
            ))}
          </div>

          {/* Pro Plan Card */}
          <div style={{
            padding: '20px',
            borderRadius: 14,
            background: `linear-gradient(135deg, ${theme.accent}12, ${theme.accent}06)`,
            border: `2px solid ${theme.accent}50`,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: theme.text,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  marginBottom: 2
                }}>
                  Timeline Pro
                </div>
                <div style={{
                  fontSize: 11,
                  color: theme.textSec,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
                }}>
                  For power users
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: theme.accent,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  lineHeight: 1
                }}>
                  ${billingPeriod === 'monthly' ? '9.99' : '99.99'}
                </div>
                <div style={{
                  fontSize: 11,
                  color: theme.textSec,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
                }}>
                  /{billingPeriod === 'monthly' ? 'month' : 'year'}
                </div>
              </div>
            </div>

            {/* Feature List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {Object.entries(FEATURE_DESCRIPTIONS).slice(0, 6).map(([key, feat]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span style={{
                    fontSize: 12,
                    color: theme.text,
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
                  }}>
                    {feat.proValue === true ? feat.label : `${feat.proValue} ${feat.label}`}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={handleUpgrade}
              disabled={isProcessing}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: theme.metallicAccent || `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: `0 6px 24px ${theme.accent}50`,
                opacity: isProcessing ? 0.7 : 1
              }}
            >
              {isProcessing ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="32" strokeLinecap="round"/>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                  </svg>
                  Upgrade to Pro
                </>
              )}
            </button>
          </div>
        </>
      )}

      {/* Manage Subscription (for Pro users) */}
      {isPro && (
        <div style={{
          padding: '14px 16px',
          borderRadius: 12,
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: theme.accent,
            marginBottom: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Manage Subscription
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleManageSubscription}
              style={{
                flex: 1,
                padding: '10px 14px',
                background: `linear-gradient(135deg, ${theme.accent}15, ${theme.accent}08)`,
                color: theme.text,
                border: `1px solid ${theme.accent}30`,
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Update Payment
            </button>
            <button
              onClick={handleDowngrade}
              style={{
                padding: '10px 14px',
                background: cardBg,
                color: theme.textSec,
                border: `1px solid ${cardBorder}`,
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Security Badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '10px 0',
        fontSize: 10,
        color: theme.textSec,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span>Secure payment powered by Stripe</span>
      </div>
    </div>
  );
}

// Family Sharing Content Component
function SharingContent({ theme, user }) {
  const [inviteLink, setInviteLink] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const generateInviteLink = () => {
    setIsGenerating(true);
    // Generate a unique invite code based on user ID and timestamp
    const inviteCode = btoa(`${user?.uid || 'guest'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`).replace(/=/g, '');
    const link = `${window.location.origin}/invite/${inviteCode}`;
    setTimeout(() => {
      setInviteLink(link);
      setIsGenerating(false);
    }, 500);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Use theme-consistent glass background
  const cardBg = theme.premiumGlass || theme.liquidGlass || `${theme.accent}08`;
  const cardBorder = theme.premiumGlassBorder || theme.liquidBorder || `${theme.accent}20`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Info Card */}
      <div style={{
        padding: '16px 18px',
        borderRadius: 12,
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${theme.accent}25, ${theme.accent}15)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: `1.5px solid ${theme.accent}40`
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: theme.text,
              marginBottom: 4,
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
            }}>
              Share with Family
            </div>
            <div style={{
              fontSize: 11,
              color: theme.textSec,
              lineHeight: 1.5,
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
            }}>
              Generate an invite link to share your calendar with family members. They'll be able to view and add events to your shared family calendar.
            </div>
          </div>
        </div>
      </div>

      {/* Generate Link Button */}
      {!inviteLink ? (
        <button
          onClick={generateInviteLink}
          disabled={isGenerating}
          style={{
            width: '100%',
            padding: '14px 20px',
            background: theme.metallicAccent || `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`,
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: `0 4px 16px ${theme.accent}40`,
            opacity: isGenerating ? 0.7 : 1
          }}
        >
          {isGenerating ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="32" strokeLinecap="round"/>
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Generate Invite Link
            </>
          )}
        </button>
      ) : (
        /* Invite Link Display */
        <div style={{
          padding: '14px 16px',
          borderRadius: 12,
          background: cardBg,
          border: `1px solid ${theme.accent}40`,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: theme.accent,
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Your Invite Link
          </div>
          <div style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center'
          }}>
            <input
              type="text"
              value={inviteLink}
              readOnly
              style={{
                flex: 1,
                padding: '10px 12px',
                background: theme.card || theme.sidebar,
                color: theme.text,
                border: `1px solid ${cardBorder}`,
                borderRadius: 8,
                fontSize: 11,
                fontFamily: "'SF Mono', 'Monaco', monospace",
                outline: 'none'
              }}
            />
            <button
              onClick={copyToClipboard}
              style={{
                padding: '10px 16px',
                background: copied
                  ? `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`
                  : theme.hoverBg,
                color: copied ? '#fff' : theme.text,
                border: `1px solid ${copied ? 'transparent' : cardBorder}`,
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap'
              }}
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <div style={{
            marginTop: 10,
            display: 'flex',
            gap: 8
          }}>
            <button
              onClick={() => { setInviteLink(''); setCopied(false); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'transparent',
                color: theme.textSec,
                border: `1px solid ${cardBorder}`,
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 500,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Generate New Link
            </button>
          </div>
        </div>
      )}

      {/* Shared Members (placeholder) */}
      <div style={{
        padding: '14px 16px',
        borderRadius: 12,
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: theme.accent,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Shared With
          </span>
        </div>
        <div style={{
          fontSize: 12,
          color: theme.textSec,
          fontStyle: 'italic',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
        }}>
          No family members yet. Share your invite link to get started.
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ config, setConfig, theme, onClose, user, handleLogout, events = [], bulkDeleteRecurringEvents, softDeleteEvent }) {
  const isDark = theme.id === 'dark' || theme.id === 'midnight' || theme.id === 'forest';
  const [activeTab, setActiveTab] = React.useState('appearance');

  const handleToggle = (key) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Premium Toggle Switch Component
  const ToggleSwitch = ({ value }) => (
    <div
      onClick={() => {}}
      style={{
        width: 44,
        height: 24,
        background: value
          ? `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accentHover} 100%)`
          : isDark ? '#2A2A30' : '#E2E8F0',
        borderRadius: 12,
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: value
          ? `0 2px 8px ${theme.accent}40, inset 0 1px 1px rgba(255,255,255,0.2)`
          : `inset 0 1px 3px rgba(0,0,0,${isDark ? '0.3' : '0.1'})`
      }}
    >
      <div style={{
        position: 'absolute',
        top: 2,
        left: value ? 22 : 2,
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: '#FFFFFF',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: value
          ? '0 2px 4px rgba(0,0,0,0.2)'
          : '0 1px 3px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {value && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6L5 9L10 3" stroke={theme.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    </div>
  );

  const tabs = [
    {
      id: 'appearance',
      label: 'Appearance',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      )
    },
    {
      id: 'interface',
      label: 'Interface',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
      )
    },
    {
      id: 'features',
      label: 'Features',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      )
    },
    {
      id: 'data',
      label: 'Data',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3"/>
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
        </svg>
      )
    },
    {
      id: 'sharing',
      label: 'Sharing',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      )
    },
    {
      id: 'subscription',
      label: 'Pro',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      )
    }
  ];

  const settingsGroups = {
    appearance: [
      {
        key: 'use24Hour',
        label: '24-Hour Time',
        desc: 'Use military time format',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        )
      },
      {
        key: 'weekStartMon',
        label: 'Week Starts Monday',
        desc: 'Change first day of week',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        )
      }
    ],
    interface: [
      {
        key: 'showSidebar',
        label: 'Show Sidebar',
        desc: 'Display navigation sidebar',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
        )
      },
      {
        key: 'showWeekNumbers',
        label: 'Week Numbers',
        desc: 'Display ISO week numbers',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="10" y1="3" x2="10" y2="21"/>
            <line x1="21" y1="12" x2="3" y2="12"/>
            <path d="M3 3h18v18H3z"/>
          </svg>
        )
      },
      {
        key: 'showMotivationalQuotes',
        label: 'Show Quotes',
        desc: 'Daily motivational quotes',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
          </svg>
        )
      },
      {
        key: 'showUpcomingEvents',
        label: 'Show Upcoming',
        desc: 'Preview upcoming events',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        )
      }
    ],
    features: [
      {
        key: 'enableDragDrop',
        label: 'Drag & Drop',
        desc: 'Move events by dragging',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="5 9 2 12 5 15"/>
            <polyline points="9 5 12 2 15 5"/>
            <polyline points="15 19 12 22 9 19"/>
            <polyline points="19 9 22 12 19 15"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <line x1="12" y1="2" x2="12" y2="22"/>
          </svg>
        )
      },
      {
        key: 'enableAnimations',
        label: 'Animations',
        desc: 'Enable UI animations',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
        )
      },
      {
        key: 'enablePulseEffects',
        label: 'Pulse Effects',
        desc: 'Highlight active events',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="6"/>
            <circle cx="12" cy="12" r="2"/>
          </svg>
        )
      },
      {
        key: 'showConflictNotifications',
        label: 'Conflict Alerts',
        desc: 'Show overlapping event warnings',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        )
      }
    ]
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100, // Settings modal layer - above base modals
        padding: 20,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)'
      }}>
      <div
        onClick={onClose}
        aria-label="Close dialog"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
      />
      <div
        className="scale-enter"
        style={{
        background: isDark
          ? 'rgba(22, 22, 26, 0.94)'
          : 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(40px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
        borderRadius: 18,
        width: '100%',
        maxWidth: 660,
        height: '80vh',
        overflow: 'hidden',
        boxShadow: isDark
          ? '0 25px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)'
          : '0 25px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
        border: isDark
          ? '1px solid rgba(255,255,255,0.1)'
          : '1px solid rgba(0,0,0,0.06)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: isDark
            ? '1px solid rgba(255,255,255,0.07)'
            : '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div>
            <h3 id="settings-modal-title" style={{
              fontSize: 26,
              fontWeight: 600,
              fontFamily: theme.fontDisplay,
              color: theme.text,
              marginBottom: 4,
              letterSpacing: '-0.02em'
            }}>
              Settings
            </h3>
            <span style={{
              fontSize: 12,
              color: theme.textMuted,
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              fontWeight: 500,
              letterSpacing: '0.01em'
            }}>
              Customize your experience
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              border: 'none',
              color: theme.textMuted,
              cursor: 'pointer',
              padding: 7,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
              e.currentTarget.style.color = theme.text;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
              e.currentTarget.style.color = theme.textMuted;
            }}
          >
            <ICONS.Close width={15} height={15} />
          </button>
        </div>

        {/* Body: Sidebar + Content */}
        <div style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden'
        }}>
          {/* Vertical Sidebar Tabs */}
          <div style={{
            width: 150,
            flexShrink: 0,
            padding: '12px 8px',
            borderRight: isDark
              ? '1px solid rgba(255,255,255,0.07)'
              : '1px solid rgba(0,0,0,0.06)',
            background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.025)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '8px 10px',
                    background: isActive
                      ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)')
                      : 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    transition: 'all 0.15s ease',
                    color: isActive ? theme.text : theme.textMuted,
                    width: '100%',
                    textAlign: 'left',
                    position: 'relative'
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
                      e.currentTarget.style.color = theme.text;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = theme.textMuted;
                    }
                  }}
                >
                  {isActive && <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3,
                    height: 16,
                    borderRadius: 2,
                    background: theme.accent
                  }} />}
                  <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, opacity: isActive ? 1 : 0.6 }}>
                    {tab.icon}
                  </span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 500,
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                    letterSpacing: '0.01em',
                    whiteSpace: 'nowrap'
                  }}>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 24px'
          }}>
          {/* User Card */}
          {user && activeTab === 'appearance' && (
            <div style={{
              padding: 16,
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
              borderRadius: 12,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              border: isDark
                ? '1px solid rgba(255,255,255,0.06)'
                : '1px solid rgba(0,0,0,0.05)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Avatar */}
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: 17,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                flexShrink: 0
              }}>
                {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                <div style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: theme.text,
                  marginBottom: 4,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  letterSpacing: '-0.01em'
                }}>
                  {user.displayName || 'User'}
                </div>
                <div style={{
                  fontSize: 11,
                  color: theme.textMuted,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  fontWeight: 500,
                  letterSpacing: '0.01em'
                }}>
                  {user.email}
                </div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  padding: '8px 14px',
                  background: 'transparent',
                  border: isDark
                    ? '1px solid rgba(255,255,255,0.12)'
                    : '1px solid rgba(0,0,0,0.1)',
                  borderRadius: 8,
                  color: theme.textSec,
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  flexShrink: 0
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
                  e.currentTarget.style.color = theme.text;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = theme.textSec;
                }}
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Theme Selector */}
          {activeTab === 'appearance' && (
            <div style={{ marginBottom: 16 }}>
              {/* Compact 4-Column Grid for Themes */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 6
              }}>
                {Object.values(THEMES).map(themeOption => {
                  const isSelected = config.selectedTheme === themeOption.id;
                  return (
                    <button
                      key={themeOption.id}
                      onClick={() => {
                        setConfig({ ...config, selectedTheme: themeOption.id, darkMode: themeOption.id === 'dark' || themeOption.id === 'midnight' || themeOption.id === 'forest' });
                      }}
                      style={{
                        padding: 8,
                        background: isSelected
                          ? `linear-gradient(135deg, ${themeOption.selection}, ${themeOption.hoverBg})`
                          : config.darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                        backdropFilter: 'blur(10px)',
                        border: isSelected
                          ? `1.5px solid ${themeOption.accent}`
                          : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: isSelected
                          ? `0 3px 10px ${themeOption.accent}25, inset 0 1px 0 rgba(255,255,255,0.08)`
                          : 'none'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = isSelected
                          ? `0 6px 16px ${themeOption.accent}30, inset 0 1px 0 rgba(255,255,255,0.1)`
                          : `0 4px 8px ${themeOption.accent}15`;
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = themeOption.accent + '60';
                        }
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = isSelected
                          ? `0 4px 12px ${themeOption.accent}25, inset 0 1px 0 rgba(255,255,255,0.08)`
                          : 'none';
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
                        }
                      }}
                    >
                      {/* Single Large Color Circle with Mode Badge */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: 6,
                        position: 'relative'
                      }}>
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, ${themeOption.accent}, ${themeOption.accentHover})`,
                          border: `2px solid ${isSelected ? themeOption.accent : themeOption.liquidBorder}`,
                          boxShadow: isSelected
                            ? `0 3px 10px ${themeOption.accent}40, inset 0 1px 0 rgba(255,255,255,0.2)`
                            : `0 2px 6px ${themeOption.accent}20, inset 0 1px 0 rgba(255,255,255,0.15)`,
                          transition: 'all 0.2s',
                          position: 'relative'
                        }}>
                          {/* Mode Indicator Badge */}
                          <div style={{
                            position: 'absolute',
                            bottom: -1,
                            right: -1,
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: themeOption.id === 'dark' || themeOption.id === 'midnight' || themeOption.id === 'forest'
                              ? 'rgba(0, 0, 0, 0.7)'
                              : 'rgba(255, 255, 255, 0.95)',
                            border: `1.5px solid ${themeOption.id === 'dark' || themeOption.id === 'midnight' || themeOption.id === 'forest'
                              ? 'rgba(255, 255, 255, 0.4)'
                              : 'rgba(0, 0, 0, 0.2)'}`,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {themeOption.id === 'dark' || themeOption.id === 'midnight' || themeOption.id === 'forest' ? (
                              // Filled circle for dark mode
                              <div style={{
                                width: 4,
                                height: 4,
                                borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.9)'
                              }} />
                            ) : (
                              // Hollow circle for light mode
                              <div style={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                border: '1px solid rgba(0, 0, 0, 0.5)'
                              }} />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Theme Name */}
                      <div style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: isSelected ? themeOption.accent : theme.text,
                        textAlign: 'center',
                        letterSpacing: '0.01em',
                        lineHeight: 1.2
                      }}>
                        {themeOption.name}
                      </div>

                      {/* Selected Indicator - Checkmark inside circle */}
                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: themeOption.accent,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: `0 2px 6px ${themeOption.accent}50`
                        }}>
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Settings List */}
          <div>
            {/* Compact Section Title */}
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              color: theme.textMuted,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: 10,
              paddingLeft: 4
            }}>
              {activeTab === 'appearance' ? 'Display' :
               activeTab === 'interface' ? 'Interface' :
               activeTab === 'sharing' ? 'Family Sharing' :
               activeTab === 'subscription' ? 'Your Plan' :
               activeTab === 'data' ? 'Data Management' :
               'Features'}
            </div>

            {/* Sharing Tab Content */}
            {activeTab === 'sharing' ? (
              <SharingContent theme={theme} user={user} />
            ) : activeTab === 'subscription' ? (
              <SubscriptionContent theme={theme} user={user} />
            ) : activeTab === 'data' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(() => {
                  const recurringEvents = events.filter(e => e.recurrencePattern && e.recurrencePattern !== 'none');
                  const noExpiryEvents = recurringEvents.filter(e => !e.recurrenceEndDate);
                  const patternLabels = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };
                  const pastEvents = events.filter(e => new Date(e.end) < new Date());
                  const thisWeekEvents = events.filter(e => {
                    const d = new Date(e.start);
                    const now = new Date();
                    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
                    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
                    return d >= weekStart && d < weekEnd;
                  });
                  const categories = {};
                  events.forEach(e => { const c = e.category || 'Uncategorized'; categories[c] = (categories[c] || 0) + 1; });
                  const sortedCats = Object.entries(categories).sort((a, b) => b[1] - a[1]);
                  const topCat = sortedCats[0];

                  return (
                    <>
                      {/* Stats grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: 8
                      }}>
                        {[
                          { val: events.length, label: 'Total', color: theme.text },
                          { val: thisWeekEvents.length, label: 'This Week', color: theme.accent },
                          { val: pastEvents.length, label: 'Past', color: theme.textSec },
                          { val: recurringEvents.length, label: 'Recurring', color: theme.accent },
                          { val: noExpiryEvents.length, label: 'No Expiry', color: noExpiryEvents.length > 0 ? '#F59E0B' : theme.textSec },
                          { val: topCat ? topCat[1] : 0, label: topCat ? topCat[0] : '—', color: theme.textSec }
                        ].map((stat, i) => (
                          <div key={i} style={{
                            padding: '10px 8px',
                            borderRadius: 8,
                            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
                            textAlign: 'center'
                          }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: stat.color, lineHeight: 1.2 }}>{stat.val}</div>
                            <div style={{ fontSize: 9, color: theme.textMuted, fontWeight: 500, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stat.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Category breakdown */}
                      {sortedCats.length > 1 && (
                        <div style={{
                          padding: '12px',
                          borderRadius: 10,
                          background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}`
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                            Categories
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {sortedCats.slice(0, 5).map(([cat, count]) => (
                              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1, fontSize: 11, color: theme.text, fontWeight: 500 }}>{cat}</div>
                                <div style={{
                                  height: 4,
                                  borderRadius: 2,
                                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                  width: 80,
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    height: '100%',
                                    borderRadius: 2,
                                    background: theme.accent,
                                    width: `${Math.round((count / events.length) * 100)}%`,
                                    transition: 'width 0.3s'
                                  }} />
                                </div>
                                <div style={{ fontSize: 10, color: theme.textMuted, fontWeight: 600, width: 24, textAlign: 'right' }}>{count}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recurring events section */}
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, paddingLeft: 2 }}>
                          Recurring Events {recurringEvents.length > 0 && `(${recurringEvents.length})`}
                        </div>
                        {recurringEvents.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {recurringEvents.map(event => (
                              <div key={event.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '8px 10px',
                                borderRadius: 8,
                                background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.015)',
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}`,
                                gap: 8,
                                transition: 'background 0.1s'
                              }}
                                onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.015)'; }}
                              >
                                <div style={{
                                  width: 4,
                                  height: 28,
                                  borderRadius: 2,
                                  background: event.color || theme.accent,
                                  flexShrink: 0
                                }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: theme.text,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    lineHeight: 1.3
                                  }}>
                                    {event.title || 'Untitled'}
                                  </div>
                                  <div style={{ fontSize: 10, color: theme.textMuted, lineHeight: 1.3 }}>
                                    {patternLabels[event.recurrencePattern] || event.recurrencePattern}
                                    {event.category ? ` · ${event.category}` : ''}
                                    {event.recurrenceEndDate ? ` · ends ${new Date(event.recurrenceEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                                  </div>
                                </div>
                                {!event.recurrenceEndDate && (
                                  <span style={{
                                    fontSize: 8,
                                    fontWeight: 700,
                                    color: '#F59E0B',
                                    background: '#F59E0B15',
                                    padding: '2px 5px',
                                    borderRadius: 3,
                                    flexShrink: 0,
                                    letterSpacing: '0.04em'
                                  }}>
                                    NO END
                                  </span>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); softDeleteEvent(event.id); }}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: theme.textMuted,
                                    cursor: 'pointer',
                                    padding: 4,
                                    borderRadius: 4,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'all 0.1s',
                                    opacity: 0.5
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = 'transparent'; }}
                                  title="Delete event"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{
                            textAlign: 'center',
                            padding: '20px 16px',
                            color: theme.textMuted,
                            fontSize: 11,
                            borderRadius: 8,
                            background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}`
                          }}>
                            No recurring events
                          </div>
                        )}
                      </div>

                      {/* Bulk actions */}
                      {recurringEvents.length > 0 && (
                        <div style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          background: isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.03)',
                          border: `1px solid ${isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)'}`
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                            Bulk Actions
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {noExpiryEvents.length > 0 && (
                              <button
                                onClick={() => bulkDeleteRecurringEvents({ onlyNoExpiry: true })}
                                style={{
                                  flex: 1,
                                  padding: '8px 10px',
                                  borderRadius: 7,
                                  border: '1px solid #F59E0B30',
                                  background: '#F59E0B0A',
                                  color: '#F59E0B',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#F59E0B18'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#F59E0B0A'; }}
                              >
                                Delete no-end ({noExpiryEvents.length})
                              </button>
                            )}
                            <button
                              onClick={() => bulkDeleteRecurringEvents()}
                              style={{
                                flex: 1,
                                padding: '8px 10px',
                                borderRadius: 7,
                                border: '1px solid #EF444430',
                                background: '#EF44440A',
                                color: '#EF4444',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = '#EF444418'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = '#EF44440A'; }}
                            >
                              Delete all recurring ({recurringEvents.length})
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
            /* Settings Items - Compact List */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}>
              {settingsGroups[activeTab]?.map(({ key, label, desc, icon }) => (
                <div
                  key={key}
                  onClick={() => handleToggle(key)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    background: config[key]
                      ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)')
                      : 'transparent',
                    border: isDark
                      ? `1px solid ${config[key] ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`
                      : `1px solid ${config[key] ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.03)'}`
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = config[key]
                      ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)')
                      : 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    {/* Icon Container */}
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      background: config[key]
                        ? `linear-gradient(135deg, ${theme.accent}, ${theme.accentHover})`
                        : `${theme.accent}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: config[key] ? '#FFFFFF' : theme.accent,
                      flexShrink: 0
                    }}>
                      {icon}
                    </div>

                    {/* Text Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: theme.text,
                        marginBottom: 3,
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                        letterSpacing: '-0.01em'
                      }}>
                        {label}
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: theme.textMuted,
                        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                        fontWeight: 500,
                        letterSpacing: '0.01em',
                        lineHeight: 1.4
                      }}>
                        {desc}
                      </div>
                    </div>
                  </div>

                  <ToggleSwitch value={config[key]} label={label} />
                </div>
              ))}
            </div>
            )}
          </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: isDark
            ? '1px solid rgba(255,255,255,0.07)'
            : '1px solid rgba(0,0,0,0.06)',
          flexShrink: 0
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{
                fontFamily: theme.fontDisplay,
                fontSize: 13,
                fontWeight: 600,
                color: theme.text,
                letterSpacing: '0.01em',
                marginBottom: 2
              }}>
                Timeline OS
              </div>
              <div style={{
                fontSize: 11,
                color: theme.textSec,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                fontWeight: 500
              }}>
                v{APP_META.version}
              </div>
            </div>
            <div style={{
              fontFamily: theme.fontDisplay,
              fontSize: 11,
              color: theme.textSec,
              fontStyle: 'italic',
              maxWidth: 220,
              textAlign: 'right',
              letterSpacing: '0.01em',
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
<div
role="dialog"
aria-modal="true"
aria-labelledby="trash-modal-title"
style={{
position: 'fixed',
top: 0,
left: 0,
right: 0,
bottom: 0,
background: 'rgba(0, 0, 0, 0.5)',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
zIndex: 1100, // Secondary modal layer - above base modals
padding: 16,
backdropFilter: 'blur(3px)'
}}>
<div
onClick={onClose}
aria-label="Close dialog"
style={{
position: 'absolute',
top: 0,
left: 0,
right: 0,
bottom: 0
}}
/>
  <div style={{
    background: theme.liquidGlass,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 20,
    width: '100%',
    maxWidth: 540,
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: theme.liquidShadow,
    position: 'relative',
    border: `1px solid ${theme.liquidBorder}`
  }}>
    <div style={{
      padding: '20px',
      borderBottom: `1px solid ${theme.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <h3 id="trash-modal-title" style={{
          fontSize: 24,
          fontWeight: 600,
          fontFamily: theme.fontDisplay,
          color: theme.text,
          letterSpacing: '-0.02em'
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
        aria-label="Close"
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
function TagManager({ tags, theme, context, user, loadData, onClose }) {
const [editingTag, setEditingTag] = React.useState(null);
const [newTagName, setNewTagName] = React.useState('');
const [selectedPalette, setSelectedPalette] = React.useState(Object.keys(PALETTE)[0]);
const [selectedIcon, setSelectedIcon] = React.useState('Briefcase'); // null = color-only tag
const [, setSaving] = React.useState(false);
const contextTags = tags[context] || [];

const handleSaveTag = async () => {
  if (!newTagName.trim() || !selectedPalette || !user) return;

  setSaving(true);
  try {
    const palette = PALETTE[selectedPalette];

    const tagData = {
      tagId: editingTag?.tagId || `${newTagName.trim().toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name: newTagName.trim(),
      iconName: selectedIcon && ICONS[selectedIcon] ? selectedIcon : null,
      context: context,
      color: palette.color,
      bgColor: palette.bg,
      textColor: palette.text,
      borderColor: palette.border
    };

    if (editingTag) {
      const { error } = await updateTag(editingTag.id, user.uid, tagData);
      if (error) throw error;
    } else {
      const { error } = await createTag(user.uid, tagData);
      if (error) throw error;
    }

    // Reload data to get updated tags
    await loadData(user);

    setEditingTag(null);
    setNewTagName('');
    setSelectedIcon('Briefcase');
    setSelectedPalette(Object.keys(PALETTE)[0]);
  } catch (error) {
    console.error('Error saving tag:', error);
    alert('Failed to save tag: ' + error.message);
  } finally {
    setSaving(false);
  }
};

const handleDeleteTag = async (tag) => {
  if (!window.confirm('Delete this tag?')) return;
  if (!user) return;

  try {
    const { error } = await deleteTag(tag.id, user.uid);

    if (error) {
      if (error.code === 'TAG_IN_USE') {
        alert('Cannot delete tag that is being used by events');
      } else {
        throw error;
      }
      return;
    }

    // Reload data to get updated tags
    await loadData(user);
  } catch (error) {
    console.error('Error deleting tag:', error);
    alert('Failed to delete tag');
  }
};
const handleEditTag = (tag) => {
setEditingTag(tag);
setNewTagName(tag.name);
const paletteKey = Object.keys(PALETTE).find(key => {
  const palette = PALETTE[key];
  return palette.color === tag.color;
});

setSelectedPalette(paletteKey || Object.keys(PALETTE)[0]);

// Support color-only tags (null iconName)
setSelectedIcon(tag.iconName || null);
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
zIndex: 1100, // Secondary modal layer - above base modals
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
    maxWidth: 720,
    boxShadow: theme.shadowLg,
    position: 'relative',
    border: `1px solid ${theme.border}`
  }}>
    <div style={{
      padding: '12px 16px',
      borderBottom: `1px solid ${theme.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <h3 style={{
          fontSize: 24,
          fontWeight: 600,
          color: theme.text,
          fontFamily: theme.fontDisplay,
          letterSpacing: '-0.02em',
          marginBottom: 4
        }}>
          Categories
        </h3>
        <div style={{
          fontSize: 13,
          color: theme.textMuted,
          fontFamily: theme.fontFamily,
          fontWeight: 400,
          letterSpacing: '0.01em'
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
          padding: 4,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.color = theme.text}
        onMouseLeave={e => e.currentTarget.style.color = theme.textSec}
      >
        <ICONS.Close width={16} height={16} />
      </button>
    </div>
    
    {/* Side-by-side layout */}
    <div style={{ display: 'flex' }}>
      {/* Left: Existing tags */}
      <div style={{
        flex: '0 0 220px',
        padding: '12px',
        borderRight: `1px solid ${theme.border}`,
        maxHeight: 360,
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12
        }}>
          <h4 style={{
            fontSize: 11,
            fontWeight: 600,
            color: theme.textSec,
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            margin: 0,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
          }}>
            Existing
          </h4>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            color: theme.accent,
            background: theme.accent + '15',
            padding: '2px 8px',
            borderRadius: 10,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
          }}>
            {contextTags.length}
          </span>
        </div>

        {contextTags.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '10px',
            color: theme.textMuted,
            fontSize: 10
          }}>
            No tags yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {contextTags.map(tag => {
              const IconComponent = getTagIcon(tag, ICONS);
              return (
                <div
                  key={tag.id}
                  style={{
                    padding: '7px 10px',
                    background: editingTag?.id === tag.id
                      ? `${tag.color}18`
                      : `${tag.color}08`,
                    border: `1px solid ${editingTag?.id === tag.id ? tag.color + '40' : tag.color + '15'}`,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s ease',
                    cursor: 'default'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `${tag.color}14`;
                    e.currentTarget.style.borderColor = `${tag.color}30`;
                    e.currentTarget.querySelectorAll('.tag-action-btn').forEach(btn => btn.style.opacity = '1');
                  }}
                  onMouseLeave={e => {
                    if (editingTag?.id !== tag.id) {
                      e.currentTarget.style.background = `${tag.color}08`;
                      e.currentTarget.style.borderColor = `${tag.color}15`;
                    }
                    e.currentTarget.querySelectorAll('.tag-action-btn').forEach(btn => btn.style.opacity = '0.5');
                  }}
                >
                  {/* Color indicator bar */}
                  <div style={{
                    width: 3,
                    height: 20,
                    borderRadius: 2,
                    background: tag.color,
                    flexShrink: 0,
                    opacity: 0.8
                  }} />

                  {IconComponent ? (
                    <IconComponent width={13} height={13} style={{ color: tag.color, flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: tag.color,
                      flexShrink: 0,
                      boxShadow: `0 0 0 2px ${tag.color}25`
                    }} />
                  )}

                  <span style={{
                    flex: 1,
                    fontSize: 11,
                    fontWeight: 600,
                    color: theme.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.01em'
                  }}>
                    {tag.name}
                  </span>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button
                      className="tag-action-btn"
                      onClick={() => handleEditTag(tag)}
                      title="Edit tag"
                      style={{
                        width: 24,
                        height: 24,
                        padding: 0,
                        background: 'transparent',
                        border: `1px solid transparent`,
                        borderRadius: 6,
                        color: theme.textMuted,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.5,
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = theme.accent + '18';
                        e.currentTarget.style.borderColor = theme.accent + '30';
                        e.currentTarget.style.color = theme.accent;
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.color = theme.textMuted;
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                        <path d="m15 5 4 4"/>
                      </svg>
                    </button>
                    <button
                      className="tag-action-btn"
                      onClick={() => handleDeleteTag(tag)}
                      title="Delete tag"
                      style={{
                        width: 24,
                        height: 24,
                        padding: 0,
                        background: 'transparent',
                        border: `1px solid transparent`,
                        borderRadius: 6,
                        color: theme.textMuted,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.5,
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = (theme.indicator || '#ef4444') + '15';
                        e.currentTarget.style.borderColor = (theme.indicator || '#ef4444') + '30';
                        e.currentTarget.style.color = theme.indicator || '#ef4444';
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.color = theme.textMuted;
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Create/Edit form */}
      <div style={{
        flex: 1,
        padding: '12px 16px'
      }}>
        <h4 style={{
          fontSize: 11,
          fontWeight: 600,
          color: theme.textSec,
          marginBottom: 12,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
        }}>
          {editingTag ? 'Edit Tag' : 'New Tag'}
        </h4>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
          {/* Name and Style row */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: '0 0 140px' }}>
              <label style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 500,
                color: theme.textSec,
                marginBottom: 4,
                letterSpacing: '0.01em',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
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
                  padding: '6px 8px',
                  fontSize: 11,
                  background: theme.card,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 6,
                  color: theme.text
                }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 500,
                color: theme.textSec,
                marginBottom: 4,
                letterSpacing: '0.01em',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
              }}>
                Style
              </label>
              {/* Color Only vs Icon toggle */}
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setSelectedIcon(null)}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    background: selectedIcon === null
                      ? `linear-gradient(135deg, ${PALETTE[selectedPalette]?.color}20 0%, ${PALETTE[selectedPalette]?.color}08 100%)`
                      : 'transparent',
                    border: `1.5px solid ${selectedIcon === null ? PALETTE[selectedPalette]?.color + '50' : theme.border}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: PALETTE[selectedPalette]?.color || theme.accent
                  }} />
                  <span style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: selectedIcon === null ? PALETTE[selectedPalette]?.color : theme.textSec
                  }}>
                    Color Only
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => !selectedIcon && setSelectedIcon('Briefcase')}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    background: selectedIcon !== null
                      ? `linear-gradient(135deg, ${theme.accent}20 0%, ${theme.accent}08 100%)`
                      : 'transparent',
                    border: `1.5px solid ${selectedIcon !== null ? theme.accent + '50' : theme.border}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    transition: 'all 0.2s'
                  }}
                >
                  <ICONS.Star width={10} height={10} style={{ color: selectedIcon !== null ? theme.accent : theme.textSec }} />
                  <span style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: selectedIcon !== null ? theme.accent : theme.textSec
                  }}>
                    With Icon
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Icon grid - compact, only when With Icon selected */}
          {selectedIcon !== null && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(10, 1fr)',
              gap: 3,
              padding: 6,
              background: theme.sidebar,
              borderRadius: 6,
              border: `1px solid ${theme.border}`
            }}>
              {AVAILABLE_ICONS.map(icon => {
                const IconComponent = ICONS[icon.name];
                const isSelected = selectedIcon === icon.name;
                return (
                  <button
                    key={icon.name}
                    type="button"
                    onClick={() => setSelectedIcon(icon.name)}
                    title={icon.label}
                    style={{
                      width: 24,
                      height: 24,
                      background: isSelected ? theme.accent : 'transparent',
                      border: 'none',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = theme.hoverBg;
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {IconComponent && <IconComponent width={12} height={12} style={{ color: isSelected ? '#fff' : theme.text }} />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Color picker row */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 500,
              color: theme.textSec,
              marginBottom: 4,
              letterSpacing: '0.01em',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
            }}>
              Color
            </label>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4
            }}>
              {Object.keys(PALETTE).map(paletteName => {
                const palette = PALETTE[paletteName];
                const isSelected = selectedPalette === paletteName;
                return (
                  <button
                    key={paletteName}
                    type="button"
                    onClick={() => setSelectedPalette(paletteName)}
                    title={paletteName.charAt(0).toUpperCase() + paletteName.slice(1)}
                    style={{
                      width: 24,
                      height: 24,
                      background: isSelected ? `${palette.color}20` : 'transparent',
                      border: `2px solid ${isSelected ? palette.color : 'transparent'}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.border = `2px solid ${palette.color}50`;
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.border = '2px solid transparent';
                    }}
                  >
                    <div style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: palette.color
                    }} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{
            display: 'flex',
            gap: 6,
            justifyContent: 'flex-end',
            marginTop: 4
          }}>
            {editingTag && (
              <button
                type="button"
                onClick={() => {
                  setEditingTag(null);
                  setNewTagName('');
                }}
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
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveTag}
              disabled={!newTagName.trim()}
              style={{
                padding: '6px 14px',
                background: newTagName.trim() ? theme.accent : theme.border,
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                fontSize: 10,
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

// MetricsView Component - Track and visualize life metrics
function MetricsView({ theme, accentColor, user }) {
  const [metrics, setMetrics] = React.useState([]);
  const [timeRange, setTimeRange] = React.useState('month'); // week, month, year, all
  const selectedMetrics = ['sleep', 'weight', 'workouts'];
  const [showAddMetric, setShowAddMetric] = React.useState(false);
  const [newMetric, setNewMetric] = React.useState({ date: new Date().toISOString().split('T')[0], sleep: '', weight: '', workouts: '' });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState(null);

  const isDark = theme.id === 'dark';

  // Load metrics from Supabase
  React.useEffect(() => {
    if (!user) return;

    const loadMetrics = async () => {
      try {
        const { data, error } = await supabase
          .from('life_metrics')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: true });

        if (error) throw error;
        setMetrics(data || []);
      } catch (error) {
        console.error('Error loading metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [user]);

  // Save metric to database
  const saveMetric = async () => {
    if (!user) {
      alert('You must be signed in to save metrics');
      return;
    }

    if (!newMetric.date) {
      alert('Please select a date');
      return;
    }

    // Check if at least one metric is filled
    if (!newMetric.sleep && !newMetric.weight && !newMetric.workouts) {
      alert('Please enter at least one metric value');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const metricData = {
        user_id: user.id,
        date: newMetric.date,
        sleep_hours: newMetric.sleep ? parseFloat(newMetric.sleep) : null,
        weight_kg: newMetric.weight ? parseFloat(newMetric.weight) : null,
        workouts_count: newMetric.workouts ? parseInt(newMetric.workouts) : null
      };

      const { data, error } = await supabase
        .from('life_metrics')
        .upsert(metricData, { onConflict: 'user_id,date' })
        .select();

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from database');
      }

      // Update local state
      setMetrics(prev => {
        const existing = prev.findIndex(m => m.date === newMetric.date);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data[0];
          return updated;
        }
        return [...prev, data[0]].sort((a, b) => new Date(a.date) - new Date(b.date));
      });

      // Reset form
      setNewMetric({ date: new Date().toISOString().split('T')[0], sleep: '', weight: '', workouts: '' });
      setShowAddMetric(false);
      alert('Metric saved successfully!');
    } catch (error) {
      console.error('[MetricsView] Error saving metric:', error);
      const errorMessage = error.message || 'Failed to save metric. Please check console for details.';
      setSaveError(errorMessage);
      alert(`Error: ${errorMessage}\n\nMake sure:\n1. You've run the database setup SQL\n2. The table exists\n3. RLS policies are configured`);
    } finally {
      setSaving(false);
    }
  };

  // Filter metrics by time range
  const filteredMetrics = React.useMemo(() => {
    const now = new Date();
    const filtered = metrics.filter(m => {
      const metricDate = new Date(m.date);
      switch (timeRange) {
        case 'week':
          return (now - metricDate) / (1000 * 60 * 60 * 24) <= 7;
        case 'month':
          return (now - metricDate) / (1000 * 60 * 60 * 24) <= 30;
        case 'year':
          return (now - metricDate) / (1000 * 60 * 60 * 24) <= 365;
        default:
          return true;
      }
    });
    return filtered;
  }, [metrics, timeRange]);

  // Calculate stats
  const stats = React.useMemo(() => {
    if (filteredMetrics.length === 0) return null;

    const sleepData = filteredMetrics.filter(m => m.sleep_hours).map(m => m.sleep_hours);
    const weightData = filteredMetrics.filter(m => m.weight_kg).map(m => m.weight_kg);
    const workoutData = filteredMetrics.filter(m => m.workouts_count).map(m => m.workouts_count);

    return {
      avgSleep: sleepData.length > 0 ? (sleepData.reduce((a, b) => a + b, 0) / sleepData.length).toFixed(1) : null,
      currentWeight: weightData.length > 0 ? weightData[weightData.length - 1] : null,
      weightChange: weightData.length > 1 ? (weightData[weightData.length - 1] - weightData[0]).toFixed(1) : null,
      totalWorkouts: workoutData.reduce((a, b) => a + b, 0)
    };
  }, [filteredMetrics]);

  if (!user) {
    return (
      <div style={{
        height: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.textSec
      }}>
        Please sign in to track metrics
      </div>
    );
  }

  return (
    <div style={{
      height: 'calc(100vh - 120px)',
      width: '100%',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            fontFamily: theme.fontDisplay,
            color: theme.text,
            marginBottom: 4,
            letterSpacing: '-0.03em',
            background: theme.metallicAccent || `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Life Metrics
          </h1>
          <p style={{
            fontSize: 12,
            color: theme.textSec,
            fontFamily: theme.fontFamily,
            fontWeight: 500
          }}>
            Track and visualize your health & performance data
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Time Range Selector */}
          <div style={{
            display: 'flex',
            gap: 6,
            background: isDark ? '#1a1a1d' : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            borderRadius: 10,
            padding: 4
          }}>
            {['week', 'month', 'year', 'all'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 7,
                  border: 'none',
                  background: timeRange === range ? accentColor : 'transparent',
                  color: timeRange === range ? '#fff' : theme.textSec,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s'
                }}
              >
                {range}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAddMetric(!showAddMetric)}
            style={{
              padding: '8px 16px',
              background: accentColor,
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span style={{ fontSize: 16 }}>+</span>
            Add Entry
          </button>
        </div>
      </div>

      {/* Add Metric Form */}
      {showAddMetric && (
        <div style={{
          background: isDark ? '#1a1a1d' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          borderRadius: 16,
          padding: 20,
          boxShadow: isDark
            ? 'inset 0 1px 0 rgba(255,255,255,0.05)'
            : 'inset 0 1px 0 rgba(255,255,255,0.8)'
        }}>
          <h3 style={{
            fontSize: 14,
            fontWeight: 600,
            color: theme.text,
            marginBottom: 16
          }}>
            New Metric Entry
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: theme.textSec, display: 'block', marginBottom: 6 }}>
                Date
              </label>
              <input
                type="date"
                value={newMetric.date}
                onChange={(e) => setNewMetric({ ...newMetric, date: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                  borderRadius: 8,
                  color: theme.text,
                  fontSize: 13,
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: theme.textSec, display: 'block', marginBottom: 6 }}>
                Sleep (hours)
              </label>
              <input
                type="number"
                step="0.5"
                value={newMetric.sleep}
                onChange={(e) => setNewMetric({ ...newMetric, sleep: e.target.value })}
                placeholder="e.g. 7.5"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                  borderRadius: 8,
                  color: theme.text,
                  fontSize: 13,
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: theme.textSec, display: 'block', marginBottom: 6 }}>
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={newMetric.weight}
                onChange={(e) => setNewMetric({ ...newMetric, weight: e.target.value })}
                placeholder="e.g. 75.5"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                  borderRadius: 8,
                  color: theme.text,
                  fontSize: 13,
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: theme.textSec, display: 'block', marginBottom: 6 }}>
                Workouts
              </label>
              <input
                type="number"
                value={newMetric.workouts}
                onChange={(e) => setNewMetric({ ...newMetric, workouts: e.target.value })}
                placeholder="e.g. 3"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                  borderRadius: 8,
                  color: theme.text,
                  fontSize: 13,
                  outline: 'none'
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowAddMetric(false)}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                borderRadius: 8,
                color: theme.textSec,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={saveMetric}
              disabled={saving}
              style={{
                padding: '8px 16px',
                background: saving ? 'rgba(128,128,128,0.5)' : accentColor,
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          {saveError && (
            <div style={{
              marginTop: 12,
              padding: '10px 12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              color: '#ef4444',
              fontSize: 12,
              lineHeight: 1.5
            }}>
              <strong>Error:</strong> {saveError}
            </div>
          )}
        </div>
      )}

      {/* Stats Overview */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12
        }}>
          {[
            { label: 'Avg Sleep', value: stats.avgSleep ? `${stats.avgSleep}h` : '—', icon: '😴', color: '#8B5CF6' },
            { label: 'Current Weight', value: stats.currentWeight ? `${stats.currentWeight}kg` : '—', icon: '⚖️', color: '#06B6D4' },
            { label: 'Weight Change', value: stats.weightChange ? `${stats.weightChange > 0 ? '+' : ''}${stats.weightChange}kg` : '—', icon: '📊', color: '#10B981' },
            { label: 'Total Workouts', value: stats.totalWorkouts || '—', icon: '💪', color: '#F59E0B' }
          ].map(stat => (
            <div key={stat.label} style={{
              background: isDark ? '#1a1a1d' : '#ffffff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: 12,
              padding: 16,
              boxShadow: isDark
                ? 'inset 0 1px 0 rgba(255,255,255,0.05)'
                : 'inset 0 1px 0 rgba(255,255,255,0.8)'
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{stat.icon}</div>
              <div style={{
                fontSize: 24,
                fontWeight: 700,
                color: stat.color,
                fontFamily: 'SF Mono, monospace',
                marginBottom: 4
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: theme.textSec,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <MultiLineChart
          data={filteredMetrics}
          theme={theme}
          accentColor={accentColor}
          selectedMetrics={selectedMetrics}
          loading={loading}
        />
      </div>
    </div>
  );
}

// Multi-Line Chart Component
function MultiLineChart({ data, theme, accentColor, selectedMetrics, loading }) {
  const isDark = theme.id === 'dark';

  if (loading) {
    return (
      <div style={{
        height: '100%',
        background: isDark ? '#1a1a1d' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.textSec
      }}>
        Loading metrics...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div style={{
        height: '100%',
        background: isDark ? '#1a1a1d' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📈</div>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 8 }}>
          No metrics yet
        </h3>
        <p style={{ fontSize: 13, color: theme.textSec }}>
          Start tracking your metrics to see beautiful visualizations
        </p>
      </div>
    );
  }

  const metrics = {
    sleep: { key: 'sleep_hours', label: 'Sleep (hours)', color: '#8B5CF6' },
    weight: { key: 'weight_kg', label: 'Weight (kg)', color: '#06B6D4' },
    workouts: { key: 'workouts_count', label: 'Workouts', color: '#F59E0B' }
  };

  // Chart dimensions
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = 1000;
  const chartHeight = 400;
  const width = chartWidth - padding.left - padding.right;
  const height = chartHeight - padding.top - padding.bottom;

  // Get data ranges
  const getRange = (key) => {
    const values = data.filter(d => d[key] != null).map(d => d[key]);
    if (values.length === 0) return [0, 10];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1 || 1;
    return [min - padding, max + padding];
  };

  // Create scales
  const dates = data.map(d => new Date(d.date));
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const xScale = (date) => {
    const d = new Date(date);
    return ((d - minDate) / (maxDate - minDate)) * width;
  };

  const createYScale = (key) => {
    const [min, max] = getRange(key);
    return (value) => height - ((value - min) / (max - min)) * height;
  };

  // Generate path for a metric
  const generatePath = (metricKey) => {
    const yScale = createYScale(metricKey);
    const points = data
      .filter(d => d[metricKey] != null)
      .map(d => ({ x: xScale(d.date), y: yScale(d[metricKey]) }));

    if (points.length === 0) return '';

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      path += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return path;
  };

  return (
    <div style={{
      height: '100%',
      background: isDark ? '#1a1a1d' : '#ffffff',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
      borderRadius: 16,
      padding: 24,
      boxShadow: isDark
        ? 'inset 0 1px 0 rgba(255,255,255,0.05)'
        : 'inset 0 1px 0 rgba(255,255,255,0.8)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: 20,
        marginBottom: 20,
        paddingBottom: 16,
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`
      }}>
        {selectedMetrics.map(key => {
          const metric = metrics[key];
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: metric.color
              }} />
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: theme.text
              }}>
                {metric.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ overflow: 'visible' }}>
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => {
            const y = padding.top + (height / 4) * i;
            return (
              <line
                key={i}
                x1={padding.left}
                y1={y}
                x2={padding.left + width}
                y2={y}
                stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                strokeWidth="1"
              />
            );
          })}

          {/* Lines for each metric */}
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {selectedMetrics.map(key => {
              const metric = metrics[key];
              const path = generatePath(metric.key);
              if (!path) return null;

              return (
                <g key={key}>
                  {/* Gradient for line */}
                  <defs>
                    <linearGradient id={`gradient-${key}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={metric.color} stopOpacity="0.3" />
                      <stop offset="100%" stopColor={metric.color} stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Area under curve */}
                  <path
                    d={`${path} L ${xScale(data[data.length - 1].date)} ${height} L ${xScale(data[0].date)} ${height} Z`}
                    fill={`url(#gradient-${key})`}
                  />

                  {/* Line */}
                  <path
                    d={path}
                    fill="none"
                    stroke={metric.color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data points */}
                  {data.filter(d => d[metric.key] != null).map((d, i) => {
                    const yScale = createYScale(metric.key);
                    return (
                      <circle
                        key={i}
                        cx={xScale(d.date)}
                        cy={yScale(d[metric.key])}
                        r="4"
                        fill={metric.color}
                        stroke={isDark ? '#1a1a1d' : '#ffffff'}
                        strokeWidth="2"
                      />
                    );
                  })}
                </g>
              );
            })}
          </g>

          {/* X-axis labels */}
          {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0).map((d, i) => {
            const date = new Date(d.date);
            const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
              <text
                key={i}
                x={padding.left + xScale(d.date)}
                y={chartHeight - 10}
                fill={theme.textMuted}
                fontSize="10"
                fontWeight="500"
                textAnchor="middle"
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// LifeView Component - Visualize life in weeks
function LifeView({ theme, config, accentColor }) {
  const [birthDate, setBirthDate] = React.useState(() => {
    const saved = localStorage.getItem('userBirthDate');
    return saved || '';
  });

  const [lifeExpectancy, setLifeExpectancy] = React.useState(() => {
    const saved = localStorage.getItem('lifeExpectancy');
    return saved ? parseInt(saved) : 80;
  });

  const [hoveredWeek, setHoveredWeek] = React.useState(null);

  React.useEffect(() => {
    if (birthDate) {
      localStorage.setItem('userBirthDate', birthDate);
    }
  }, [birthDate]);

  React.useEffect(() => {
    localStorage.setItem('lifeExpectancy', lifeExpectancy.toString());
  }, [lifeExpectancy]);

  // Calculate life statistics
  const lifeStats = React.useMemo(() => {
    if (!birthDate) return null;

    const birth = new Date(birthDate);
    const now = new Date();
    const diffMs = now - birth;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffYears = diffWeeks / 52;
    const age = Math.floor(diffYears);

    // More interesting calculations
    const minutesLived = Math.floor(diffMs / (1000 * 60));
    const heartbeats = Math.floor(minutesLived * 70); // 70 bpm
    const breaths = Math.floor(minutesLived * 16); // 16 per minute
    const sleepHours = Math.floor(diffDays * 8); // 8h per day
    const mealsEaten = Math.floor(diffDays * 3); // 3 meals per day
    const blinks = Math.floor(minutesLived * 20); // ~20 blinks per minute

    // Future milestones
    const retirementAge = 65;
    const weeksUntilRetirement = retirementAge > age ? (retirementAge - age) * 52 : 0;
    const weekendsLived = Math.floor(diffWeeks / 7 * 2);
    const weekendsRemaining = Math.floor((lifeExpectancy - age) * 52 * 2 / 7);

    return {
      weeks: diffWeeks,
      days: diffDays,
      years: diffYears.toFixed(2),
      age,
      months: Math.floor(diffDays / 30.44),
      hours: Math.floor(diffMs / (1000 * 60 * 60)),
      minutes: minutesLived,
      heartbeats,
      breaths,
      sleepHours,
      mealsEaten,
      blinks,
      weekendsLived,
      weekendsRemaining,
      weeksUntilRetirement,
      percentLived: ((diffYears / lifeExpectancy) * 100).toFixed(1)
    };
  }, [birthDate, lifeExpectancy]);

  const isDark = config.darkMode;
  const totalWeeks = 52 * lifeExpectancy;
  const weeksLived = lifeStats?.weeks || 0;

  return (
    <div style={{
      height: 'calc(100vh - 120px)',
      width: '100%',
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }}>
      {/* Header Section */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20
      }}>
        <div>
          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            fontFamily: theme.fontDisplay,
            color: theme.text,
            marginBottom: 4,
            letterSpacing: '-0.03em',
            background: theme.metallicAccent || `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Life in Weeks
          </h1>
          <p style={{
            fontSize: 12,
            color: theme.textSec,
            fontFamily: theme.fontFamily,
            fontWeight: 500
          }}>
            {birthDate ? `${weeksLived.toLocaleString()} weeks lived • ${(totalWeeks - weeksLived).toLocaleString()} remaining` : 'Enter your details to begin'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            style={{
              padding: '8px 14px',
              background: isDark ? '#1a1a1d' : '#ffffff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: 10,
              color: theme.text,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: theme.fontFamily,
              outline: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              background: isDark ? '#1a1a1d' : '#ffffff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: 10
            }}>
              <span style={{
                fontSize: 12,
                fontWeight: 500,
                color: theme.textSec
              }}>
                Expected lifespan:
              </span>
              <input
                type="number"
                value={lifeExpectancy}
                onChange={(e) => setLifeExpectancy(Math.max(1, Math.min(120, parseInt(e.target.value) || 80)))}
                min="1"
                max="120"
                style={{
                  width: 50,
                  padding: '4px 8px',
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                  borderRadius: 6,
                  color: theme.text,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: theme.fontFamily,
                  textAlign: 'center',
                  outline: 'none'
                }}
              />
              <span style={{
                fontSize: 12,
                fontWeight: 500,
                color: theme.textSec
              }}>
                yrs
              </span>
            </div>
            {/* Preset buttons */}
            <div style={{
              display: 'flex',
              gap: 4
            }}>
              {[70, 75, 80, 85, 90].map(preset => (
                <button
                  key={preset}
                  onClick={() => setLifeExpectancy(preset)}
                  style={{
                    padding: '4px 10px',
                    background: lifeExpectancy === preset
                      ? `${accentColor}20`
                      : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                    border: `1px solid ${lifeExpectancy === preset ? accentColor : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')}`,
                    borderRadius: 6,
                    color: lifeExpectancy === preset ? accentColor : theme.textSec,
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: theme.fontFamily,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (lifeExpectancy !== preset) {
                      e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (lifeExpectancy !== preset) {
                      e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
                    }
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer Banner */}
      <div style={{
        padding: '12px 16px',
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }}>
        <span style={{ fontSize: 14 }}>ℹ️</span>
        <p style={{
          fontSize: 13,
          color: theme.textSec,
          margin: 0,
          fontStyle: 'italic',
          fontFamily: theme.fontFamily,
          lineHeight: 1.5
        }}>
          This visualization is an approximation based on average life expectancy. It's a tool for reflection and perspective, not a prediction.
        </p>
      </div>

      {/* Main Content Grid */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '400px 1fr',
        gap: 16,
        minHeight: 0
      }}>
        {/* Life Grid - Left Side (Compact) */}
        <div style={{
          background: isDark ? '#1a1a1d' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          borderRadius: 16,
          padding: 16,
          boxShadow: isDark
            ? 'inset 0 1px 0 rgba(255,255,255,0.05)'
            : 'inset 0 1px 0 rgba(255,255,255,0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            color: theme.textSec,
            marginBottom: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {lifeExpectancy} Years • {totalWeeks.toLocaleString()} Weeks
          </div>

          {/* Weeks Grid - Smaller */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(52, 1fr)',
            gap: 2,
            overflow: 'auto',
            paddingRight: 4
          }}>
            {Array.from({ length: totalWeeks }).map((_, i) => {
              const isLived = birthDate && i < weeksLived;
              const isCurrent = birthDate && i === weeksLived;
              const year = Math.floor(i / 52);
              const week = i % 52;

              return (
                <div
                  key={i}
                  onMouseEnter={() => setHoveredWeek({ year, week, index: i })}
                  onMouseLeave={() => setHoveredWeek(null)}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 1.5,
                    background: isCurrent
                      ? accentColor
                      : isLived
                        ? (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)')
                        : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                    border: isCurrent ? `1px solid ${accentColor}` : 'none',
                    transition: 'all 0.12s',
                    cursor: 'default',
                    boxShadow: isCurrent ? `0 0 6px ${accentColor}40` : 'none'
                  }}
                  title={`Year ${year + 1}, Week ${week + 1}`}
                />
              );
            })}
          </div>

          {hoveredWeek && (
            <div style={{
              marginTop: 10,
              padding: '6px 10px',
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 500,
              color: theme.textSec,
              textAlign: 'center'
            }}>
              Year {hoveredWeek.year + 1}, Week {hoveredWeek.week + 1}
            </div>
          )}
        </div>

        {/* Insights Grid - Right Side */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          overflow: 'auto',
          alignContent: 'start'
        }}>
          {birthDate && lifeStats && (
            <>
              {/* Life Highlights */}
              <div style={{
                background: isDark ? '#1a1a1d' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                borderRadius: 12,
                padding: 16,
                boxShadow: isDark
                  ? 'inset 0 1px 0 rgba(255,255,255,0.05)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.8)'
              }}>
                <h3 style={{
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: theme.fontDisplay,
                  color: theme.text,
                  marginBottom: 12,
                  letterSpacing: '-0.01em'
                }}>
                  Life Highlights
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Years', value: lifeStats.years },
                    { label: 'Months', value: lifeStats.months.toLocaleString() },
                    { label: 'Days', value: lifeStats.days.toLocaleString() },
                    { label: 'Hours', value: lifeStats.hours.toLocaleString() }
                  ].map(stat => (
                    <div key={stat.label} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 10px',
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      borderRadius: 6
                    }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: theme.textSec
                      }}>
                        {stat.label}
                      </span>
                      <span style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: accentColor,
                        fontFamily: 'monospace'
                      }}>
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Body's Work */}
              <div style={{
                background: isDark ? '#1a1a1d' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                borderRadius: 12,
                padding: 16,
                boxShadow: isDark
                  ? 'inset 0 1px 0 rgba(255,255,255,0.05)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.8)'
              }}>
                <h3 style={{
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: theme.fontDisplay,
                  color: theme.text,
                  marginBottom: 12,
                  letterSpacing: '-0.01em'
                }}>
                  Body's Work
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Heartbeats', value: (lifeStats.heartbeats / 1e9).toFixed(2) + 'B', icon: '❤️' },
                    { label: 'Breaths', value: (lifeStats.breaths / 1e6).toFixed(0) + 'M', icon: '🫁' },
                    { label: 'Sleep', value: (lifeStats.sleepHours / 24 / 365).toFixed(1) + ' yrs', icon: '😴' }
                  ].map(stat => (
                    <div key={stat.label} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 10px',
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      borderRadius: 6
                    }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: theme.textSec,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <span>{stat.icon}</span>
                        {stat.label}
                      </span>
                      <span style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: theme.text,
                        fontFamily: 'monospace'
                      }}>
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Milestones & Future */}
              <div style={{
                background: isDark ? '#1a1a1d' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                borderRadius: 12,
                padding: 16,
                boxShadow: isDark
                  ? 'inset 0 1px 0 rgba(255,255,255,0.05)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.8)'
              }}>
                <h3 style={{
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: theme.fontDisplay,
                  color: theme.text,
                  marginBottom: 12,
                  letterSpacing: '-0.01em'
                }}>
                  Milestones
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: '🎯 Current Age', value: lifeStats.age + ' yrs' },
                    { label: '⏳ Life Progress', value: lifeStats.percentLived + '%' },
                    { label: '📅 Weeks Until 65', value: lifeStats.weeksUntilRetirement > 0 ? lifeStats.weeksUntilRetirement.toLocaleString() : '—' }
                  ].map(stat => (
                    <div key={stat.label} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 10px',
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      borderRadius: 6
                    }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: theme.textSec
                      }}>
                        {stat.label}
                      </span>
                      <span style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: accentColor,
                        fontFamily: 'monospace'
                      }}>
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekends & Free Time */}
              <div style={{
                background: isDark ? '#1a1a1d' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                borderRadius: 12,
                padding: 16,
                boxShadow: isDark
                  ? 'inset 0 1px 0 rgba(255,255,255,0.05)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.8)'
              }}>
                <h3 style={{
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: theme.fontDisplay,
                  color: theme.text,
                  marginBottom: 12,
                  letterSpacing: '-0.01em'
                }}>
                  Weekends & Time
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: '🌅 Weekends Lived', value: lifeStats.weekendsLived.toLocaleString() },
                    { label: '🎉 Weekends Left', value: lifeStats.weekendsRemaining.toLocaleString() },
                    { label: '🍽️ Meals Eaten', value: (lifeStats.mealsEaten / 1000).toFixed(0) + 'K' }
                  ].map(stat => (
                    <div key={stat.label} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 10px',
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      borderRadius: 6
                    }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: theme.textSec
                      }}>
                        {stat.label}
                      </span>
                      <span style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: theme.text,
                        fontFamily: 'monospace'
                      }}>
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interesting Facts */}
              <div style={{
                background: isDark ? '#1a1a1d' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                borderRadius: 12,
                padding: 16,
                boxShadow: isDark
                  ? 'inset 0 1px 0 rgba(255,255,255,0.05)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.8)',
                gridColumn: 'span 2'
              }}>
                <h3 style={{
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: theme.fontDisplay,
                  color: theme.text,
                  marginBottom: 12,
                  letterSpacing: '-0.01em'
                }}>
                  Interesting Perspective
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10
                }}>
                  {[
                    { label: '👁️ Blinks', value: (lifeStats.blinks / 1e9).toFixed(2) + 'B' },
                    { label: '⏰ Minutes', value: (lifeStats.minutes / 1e6).toFixed(2) + 'M' },
                    { label: '🌍 Earth Trips', value: (lifeStats.days * 1037 / 40075).toFixed(0) }
                  ].map(stat => (
                    <div key={stat.label} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '12px',
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      borderRadius: 8
                    }}>
                      <span style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: accentColor,
                        fontFamily: 'monospace',
                        marginBottom: 4
                      }}>
                        {stat.value}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 500,
                        color: theme.textSec,
                        textAlign: 'center'
                      }}>
                        {stat.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!birthDate && (
            <div style={{
              gridColumn: 'span 2',
              background: isDark ? '#1a1a1d' : '#ffffff',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: 12,
              padding: 32,
              boxShadow: isDark
                ? 'inset 0 1px 0 rgba(255,255,255,0.05)'
                : 'inset 0 1px 0 rgba(255,255,255,0.8)',
              textAlign: 'center',
              color: theme.textSec,
              fontSize: 13
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
              <p style={{ fontSize: 14, fontWeight: 500, color: theme.text, marginBottom: 8 }}>
                Visualize Your Life in Weeks
              </p>
              <p>Enter your birth date and life expectancy to begin</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer with Privacy Policy and Terms links */}
      <footer style={{
        padding: '24px 0',
        textAlign: 'center',
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
        marginTop: 40
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 24,
          fontSize: 12,
          color: theme.textSec
        }}>
          <a
            href="/privacy"
            style={{
              color: theme.textSec,
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.color = theme.text}
            onMouseLeave={(e) => e.target.style.color = theme.textSec}
          >
            Privacy Policy
          </a>
          <span style={{ opacity: 0.3 }}>•</span>
          <a
            href="/terms"
            style={{
              color: theme.textSec,
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.color = theme.text}
            onMouseLeave={(e) => e.target.style.color = theme.textSec}
          >
            Terms of Service
          </a>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
return (
<ErrorBoundary>
<Routes>
<Route path="/" element={<TimelineOS />} />
<Route path="/privacy" element={<PrivacyPolicy />} />
<Route path="/terms" element={<TermsOfService />} />
</Routes>
</ErrorBoundary>
);
}
