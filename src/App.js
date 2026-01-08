import { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
  version: "8.0.0-Master",
  quoteInterval: 14400000,
  author: "Timeline Systems",
  motto: "Time is the luxury you cannot buy."
};

const LAYOUT = {
  SIDEBAR_WIDTH: 380,
  HEADER_HEIGHT: 84,
  PIXELS_PER_MINUTE: 3.2,
  SNAP_MINUTES: 15,
  YEAR_COLS: 38,
  LINEAR_YEAR_DAY_WIDTH: 2.8,
  EVENT_HEIGHT: 56,
  ROW_GAP: 12,
  DAY_WIDTH: 1440 * 3.2
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
  },
  coral: {
    bg: "linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)",
    text: "#c2410c",
    border: "#fdba74",
    color: "#ea580c",
    colorLight: "#fb923c",
    darkBg: "linear-gradient(135deg, #c2410c 0%, #ea580c 100%)"
  },
  sky: {
    bg: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
    text: "#0369a1",
    border: "#38bdf8",
    color: "#0ea5e9",
    colorLight: "#7dd3fc",
    darkBg: "linear-gradient(135deg, #0369a1 0%, #0c4a6e 100%)"
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
    { id: 'healthcare', name: "Health", icon: <ICONS.Health />, ...PALETTE.coral }
  ]
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Cormorant+Garamond:wght@300;400;500;600;700&display=swap');
  
  :root {
    --ease: cubic-bezier(0.22, 1, 0.36, 1);
    --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
    --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }
  
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
    overflow: hidden;
    transition: background 0.4s var(--ease);
  }
  
  h1, h2, h3, h4, .serif {
    font-family: 'Cormorant Garamond', 'Playfair Display', Georgia, serif;
    font-feature-settings: 'liga' 1, 'kern' 1, 'ss01' 1;
    letter-spacing: -0.01em;
  }
  
  .luxe {
    font-family: 'Cormorant Garamond', serif;
    font-weight: 500;
    letter-spacing: -0.02em;
  }
  
  /* Scrollbar Styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 10px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.3);
    border-radius: 10px;
    transition: background 0.2s var(--ease);
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.5);
  }
  
  /* Animations */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
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
  
  @keyframes dayPulse {
    0%, 100% {
      transform: scale(1);
      box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);
    }
    50% {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(234, 88, 12, 0.5);
    }
  }
  
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }
  
  .fade-enter {
    animation: fadeIn 0.6s var(--ease) forwards;
  }
  
  .glass-panel {
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .dark .glass-panel {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  /* Button Styles */
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
    transform: translateY(-2px);
  }
  
  .btn-hover:active {
    transform: translateY(0);
  }
  
  /* Tab Pills */
  .tab-pill {
    padding: 10px 20px;
    border-radius: 24px;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.3s var(--ease);
    user-select: none;
    letter-spacing: 0.02em;
  }
  
  .tab-pill.active {
    font-weight: 600;
    box-shadow: var(--current-shadow);
  }
  
  /* Input Styles */
  .input-luxe {
    width: 100%;
    padding: 14px 18px;
    border-radius: 12px;
    font-size: 15px;
    transition: all 0.2s var(--ease);
    border: 1.5px solid transparent;
    font-family: 'Inter', sans-serif;
    letter-spacing: -0.01em;
    background: var(--input-bg);
    color: var(--input-text);
  }
  
  .input-luxe:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px var(--pulse-color);
  }
  
  /* Mini Calendar */
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
    color: inherit;
    font-weight: 500;
    position: relative;
  }
  
  .mini-cal-day::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 10px;
    background: currentColor;
    opacity: 0;
    transition: opacity 0.2s var(--ease);
  }
  
  .mini-cal-day:hover::after {
    opacity: 0.08;
  }
  
  .mini-cal-day.active {
    font-weight: 700;
    animation: dayPulse 2s ease-in-out infinite;
  }
  
  /* Color Swatches */
  .color-swatch {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s var(--ease-spring);
    border: 2px solid transparent;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
  
  .color-swatch:hover {
    transform: scale(1.15) translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }
  
  .color-swatch:active {
    transform: scale(1.05);
  }
  
  .color-swatch.active {
    border-color: currentColor;
    box-shadow: 0 0 0 4px var(--pulse-color);
  }
  
  /* Event Cards */
  .event-card-journal {
    transition: all 0.3s var(--ease);
    border-left-width: 4px;
    border-left-style: solid;
  }
  
  .event-card-journal:hover {
    transform: translateX(6px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  }
  
  /* Settings UI */
  .settings-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 0;
    border-bottom: 1px solid;
  }
  
  .settings-row:last-child {
    border-bottom: none;
  }
  
  .settings-label {
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  
  .settings-sub {
    font-size: 13px;
    opacity: 0.6;
    margin-top: 4px;
  }
  
  /* Segmented Control */
  .segmented {
    display: flex;
    padding: 4px;
    border-radius: 12px;
    width: 100%;
    position: relative;
    background: var(--border-light);
  }
  
  .seg-opt {
    flex: 1;
    text-align: center;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border-radius: 8px;
    color: inherit;
    transition: all 0.2s var(--ease);
    position: relative;
    z-index: 1;
    user-select: none;
  }
  
  .seg-opt.active {
    font-weight: 600;
    background: var(--card-bg);
    box-shadow: var(--shadow);
  }
  
  /* Switch */
  .switch-track {
    width: 52px;
    height: 28px;
    border-radius: 14px;
    position: relative;
    cursor: pointer;
    transition: all 0.3s var(--ease);
    background: var(--border);
  }
  
  .switch-thumb {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #fff;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: all 0.3s var(--ease-spring);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .switch-track.active {
    background: var(--accent-color);
  }
  
  .switch-track.active .switch-thumb {
    transform: translateX(24px);
  }
  
  /* Year View Event Dots */
  .year-event-dot {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    cursor: grab;
    transition: all 0.2s var(--ease-spring);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    z-index: 5;
  }
  
  .year-event-dot:active {
    cursor: grabbing;
  }
  
  .year-event-dot:hover {
    transform: scale(2);
    z-index: 10;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  .year-day-cell {
    position: relative;
  }
  
  .year-day-cell.drag-over {
    background: rgba(234, 88, 12, 0.1) !important;
    border-color: #EA580C !important;
  }
  
  /* Tag Pills */
  .tag-pill {
    transition: all 0.2s var(--ease);
  }
  
  .tag-pill:hover {
    transform: translateX(2px) translateY(-1px);
  }
  
  /* Modal Animations */
  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  .modal-content {
    animation: modalSlideIn 0.3s var(--ease) forwards;
  }
  
  /* Drag and Drop */
  .draggable-event {
    cursor: move;
    user-select: none;
    touch-action: none;
  }
  
  .draggable-event.dragging {
    opacity: 0.7;
    z-index: 1000;
    cursor: grabbing;
  }
  
  .drop-zone {
    border: 2px dashed var(--accent-color) !important;
    background: var(--selection) !important;
  }
  
  /* Timeline Elements */
  .timeline-now {
    position: absolute;
    width: 3px;
    background: linear-gradient(180deg, var(--accent-color), transparent);
    z-index: 10;
    pointer-events: none;
  }
  
  .timeline-now::before {
    content: '';
    position: absolute;
    top: 0;
    left: -5px;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: var(--accent-color);
    animation: glow 2s ease-in-out infinite;
  }
  
  /* Focus States */
  *:focus-visible {
    outline: 2px solid var(--accent-color);
    outline-offset: 3px;
  }
  
  button:focus-visible {
    outline-offset: 4px;
  }
  
  /* Loading Shimmer */
  .shimmer {
    background: linear-gradient(90deg, 
      var(--border-light) 0%, 
      var(--border) 50%, 
      var(--border-light) 100%);
    background-size: 1000px 100%;
    animation: shimmer 2s infinite;
  }
  
  /* Notification Toast */
  .notification-toast {
    animation: fadeIn 0.3s var(--ease);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
`;

// ==========================================
// 3. MAIN APPLICATION KERNEL
// ==========================================

export default function TimelineOS() {
  // Authentication & User State
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  
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
  
  // Tags & Categories
  const [tags, setTags] = useState(() => {
    const saved = localStorage.getItem('timeline_tags_v4');
    return saved ? JSON.parse(saved) : DEFAULT_TAGS;
  });
  
  const [activeTagIds, setActiveTagIds] = useState(() => {
    const currentTags = tags[context] || [];
    return currentTags.map(t => t.id);
  });
  
  // UI State
  const [quote, setQuote] = useState(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [resizingEvent, setResizingEvent] = useState(null);
  const [resizeHandle, setResizeHandle] = useState(null);
  
  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  // Configuration
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('timeline_v5_cfg');
    const defaultConfig = {
      darkMode: true,
      use24Hour: false,
      blurPast: true,
      weekStartMon: true,
      showSidebar: true,
      showMotivationalQuotes: true,
      showUpcomingEvents: true,
      showWeekNumbers: false,
      enableDragDrop: true,
      enableAnimations: true,
      enablePulseEffects: true,
      highContrast: false,
      fontSize: 'medium',
      density: 'comfortable',
      accentColor: 'orange',
      sidebarPosition: 'left'
    };
    return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig;
  });
  
  // Refs
  const scrollRef = useRef(null);
  const timelineRef = useRef(null);
  const dragStartX = useRef(0);
  const dragStartLeft = useRef(0);
  const dragStartWidth = useRef(0);
  const isSavingRef = useRef(false);
  
  // Theme
  const theme = config.darkMode ? THEMES.dark : THEMES.light;
  const accentColor = config.accentColor === 'family' ? theme.familyAccent : theme.accent;
  
  // CSS Variables Injection
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    
    // Update CSS variables
    document.documentElement.style.setProperty('--accent-color', accentColor);
    document.documentElement.style.setProperty('--card-bg', theme.card);
    document.documentElement.style.setProperty('--border-light', theme.borderLight);
    document.documentElement.style.setProperty('--input-bg', theme.card);
    document.documentElement.style.setProperty('--input-text', theme.text);
    document.documentElement.style.setProperty('--current-shadow', theme.shadow);
    document.documentElement.style.setProperty('--pulse-color', theme.pulse);
    document.documentElement.style.setProperty('--selection', theme.selection);
    
    return () => style.remove();
  }, [theme, accentColor]);
  
  // Timers & Intervals
  useEffect(() => {
    const nowInterval = setInterval(() => setNow(new Date()), 60000);
    const quoteInterval = setInterval(() => {
      if (config.showMotivationalQuotes) {
        setQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
      }
    }, APP_META.quoteInterval);
    
    return () => {
      clearInterval(nowInterval);
      clearInterval(quoteInterval);
    };
  }, [config.showMotivationalQuotes]);
  
  // Authentication
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(err => {
      console.error("Auth persistence error:", err);
      setAuthError("Authentication persistence failed");
    });
    
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
  
  // Configuration Persistence
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
  
  // Filter events
  useEffect(() => {
    const filtered = events.filter(e => 
      e.context === context && 
      activeTagIds.includes(e.category) &&
      !e.deleted
    );
    
    setFilteredEvents(filtered);
    
    // Update upcoming events
    const upcoming = filtered
      .filter(e => e.start > now)
      .sort((a, b) => a.start - b.start)
      .slice(0, 5);
    
    setUpcomingEvents(upcoming);
  }, [events, context, activeTagIds, now]);
  
  // Scroll to current time
  useEffect(() => {
    if ((viewMode === 'day' || viewMode === 'week') && scrollRef.current) {
      const isToday = currentDate.toDateString() === now.toDateString();
      if (isToday && viewMode === 'day') {
        setTimeout(() => {
          if (scrollRef.current) {
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const pixelsFromTop = (hours * 60 + minutes) * LAYOUT.PIXELS_PER_MINUTE;
            scrollRef.current.scrollTop = pixelsFromTop - 200;
          }
        }, 100);
      }
    }
  }, [viewMode, currentDate, now]);
  
  // Data Loading
  const loadData = async (u) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "events"),
        where("uid", "==", u.uid),
        orderBy("startTime", "asc")
      );
      
      const snap = await getDocs(q);
      const all = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        start: d.data().startTime.toDate(),
        end: d.data().endTime.toDate()
      }));
      
      setEvents(all.filter(e => !e.deleted));
      setDeletedEvents(all.filter(e => e.deleted));
    } catch (e) {
      notify("Failed to sync events", "error");
      console.error("Load error:", e);
    } finally {
      setLoading(false);
    }
  };
  
  // Event Operations
  const handleSaveEvent = async (data) => {
    if (!user) return;
    
    try {
      const payload = {
        uid: user.uid,
        title: data.title,
        category: data.category,
        context: context,
        description: data.description || "",
        location: data.location || "",
        startTime: Timestamp.fromDate(data.start),
        endTime: Timestamp.fromDate(data.end),
        deleted: false,
        updatedAt: serverTimestamp()
      };
      
      if (data.id) {
        await updateDoc(doc(db, "events", data.id), payload);
        notify("Event updated successfully", "success");
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, "events"), payload);
        notify("Event created successfully", "success");
      }
      
      setModalOpen(false);
      loadData(user);
    } catch (e) {
      notify("Failed to save event", "error");
      console.error("Save error:", e);
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
      notify("Event moved to trash", "info");
    } catch (e) {
      notify("Failed to delete event", "error");
    }
  };
  
  const restoreEvent = async (id) => {
    try {
      await updateDoc(doc(db, "events", id), { deleted: false });
      loadData(user);
      notify("Event restored", "success");
    } catch (e) {
      notify("Failed to restore event", "error");
    }
  };
  
  const hardDeleteEvent = async (id) => {
    if (!window.confirm("Permanently delete this event? This action cannot be undone.")) return;
    
    try {
      await deleteDoc(doc(db, "events", id));
      loadData(user);
      notify("Event permanently deleted", "info");
    } catch (e) {
      notify("Failed to delete event", "error");
    }
  };
  
  // Drag & Drop Operations
  const handleEventDrag = async (eventId, newDate) => {
    if (!config.enableDragDrop) return;
    
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    
    const duration = event.end - event.start;
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
    } catch (e) {
      notify("Failed to move event", "error");
    }
  };
  
  const handleEventResize = async (eventId, newStart, newEnd) => {
    if (!config.enableDragDrop) return;
    
    try {
      await updateDoc(doc(db, "events", eventId), {
        startTime: Timestamp.fromDate(newStart),
        endTime: Timestamp.fromDate(newEnd),
        updatedAt: serverTimestamp()
      });
      
      loadData(user);
      notify("Event resized successfully", "success");
    } catch (e) {
      notify("Failed to resize event", "error");
    }
  };
  
  // UI Utilities
  const notify = (message, type = "info") => {
    const id = Date.now();
    const notification = {
      id,
      message,
      type,
      timestamp: new Date()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
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
      case 'day':
      default:
        newDate.setDate(newDate.getDate() + amount);
        break;
    }
    
    setCurrentDate(newDate);
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
    
    if (viewMode === 'day' || viewMode === 'week') {
      setTimeout(() => {
        if (scrollRef.current) {
          const hours = now.getHours();
          const minutes = now.getMinutes();
          const pixelsFromTop = (hours * 60 + minutes) * LAYOUT.PIXELS_PER_MINUTE;
          scrollRef.current.scrollTop = pixelsFromTop - 200;
        }
      }, 100);
    }
  };
  
  // Get current tags for context
  const currentTags = tags[context] || [];
  
  // Render loading state
  if (loading && user) {
    return (
      <div style={{
        height: "100vh",
        background: theme.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 24
      }}>
        <div style={{
          width: 60,
          height: 60,
          borderRadius: "50%",
          border: `3px solid ${theme.border}`,
          borderTopColor: accentColor,
          animation: "spin 1s linear infinite"
        }} />
        <div style={{
          fontSize: 16,
          fontWeight: 600,
          color: theme.textSec
        }}>
          Loading your timeline...
        </div>
      </div>
    );
  }
  
  // Render auth screen
  if (!user) {
    return <AuthScreen onLogin={() => signInWithPopup(auth, provider)} theme={theme} />;
  }
  
  return (
    <div className={config.darkMode ? 'dark' : 'light'} style={{
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
          padding: "32px 24px",
          zIndex: 50,
          overflow: "hidden"
        }}>
          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <h1 className="luxe" style={{
              fontSize: 42,
              fontWeight: 700,
              color: theme.text,
              letterSpacing: "-0.03em",
              marginBottom: 8,
              lineHeight: 1
            }}>
              Timeline.
            </h1>
            <div style={{
              fontSize: 14,
              color: theme.textSec,
              fontWeight: 500,
              marginBottom: 4
            }}>
              Welcome back, <span style={{
                fontWeight: 600,
                color: theme.text
              }}>{user.displayName?.split(" ")[0]}</span>
            </div>
            {config.showMotivationalQuotes && (
              <div style={{
                fontSize: 13,
                color: theme.textMuted,
                fontStyle: "italic",
                marginTop: 12,
                lineHeight: 1.5
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
            borderRadius: 16,
            marginBottom: 28,
            gap: 2
          }}>
            <button
              onClick={() => setContext('personal')}
              className={`btn-reset tab-pill ${context === 'personal' ? 'active' : ''}`}
              style={{
                flex: 1,
                background: context === 'personal' ? theme.card : 'transparent',
                color: context === 'personal' ? theme.accent : theme.textSec,
                boxShadow: context === 'personal' ? theme.shadow : 'none'
              }}
            >
              Personal
            </button>
            <button
              onClick={() => setContext('family')}
              className={`btn-reset tab-pill ${context === 'family' ? 'active' : ''}`}
              style={{
                flex: 1,
                background: context === 'family' ? theme.card : 'transparent',
                color: context === 'family' ? theme.familyAccent : theme.textSec,
                boxShadow: context === 'family' ? theme.shadow : 'none'
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
            className="btn-reset btn-hover"
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: 14,
              background: context === 'family' ? theme.familyAccent : theme.accent,
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              boxShadow: theme.shadowLg,
              marginBottom: 28,
              gap: 10,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = context === 'family' ? theme.familyAccentHover : theme.accentHover}
            onMouseLeave={e => e.currentTarget.style.background = context === 'family' ? theme.familyAccent : theme.accent}
          >
            <ICONS.Plus /> New Event
          </button>
          
          {/* Mini Calendar */}
          <div style={{
            marginBottom: 28,
            paddingBottom: 28,
            borderBottom: `1px solid ${theme.border}`
          }}>
            <MiniCalendar
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              theme={theme}
              config={config}
              context={context}
            />
          </div>
          
          {/* Upcoming Events */}
          {config.showUpcomingEvents && upcomingEvents.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16
              }}>
                <h4 style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: theme.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 1.2
                }}>
                  Upcoming
                </h4>
                <span style={{
                  fontSize: 11,
                  color: theme.textMuted,
                  fontWeight: 600
                }}>
                  {upcomingEvents.length}
                </span>
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
                      className="btn-hover"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px",
                        borderRadius: 10,
                        background: theme.hoverBg,
                        cursor: "pointer",
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = theme.activeBg}
                      onMouseLeave={e => e.currentTarget.style.background = theme.hoverBg}
                    >
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: config.darkMode ? tag.colorLight : tag.color,
                        flexShrink: 0
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: theme.text,
                          marginBottom: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}>
                          {event.title}
                        </div>
                        <div style={{
                          fontSize: 11,
                          color: theme.textSec,
                          display: "flex",
                          alignItems: "center",
                          gap: 6
                        }}>
                          <ICONS.Calendar width={10} height={10} />
                          {event.start.toLocaleDateString([], { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                          <span style={{ opacity: 0.5 }}>•</span>
                          <ICONS.Clock width={10} height={10} />
                          {event.start.toLocaleTimeString([], { 
                            hour: 'numeric', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Tags Section */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16
            }}>
              <h4 style={{
                fontSize: 11,
                fontWeight: 700,
                color: theme.textMuted,
                textTransform: "uppercase",
                letterSpacing: 1.2
              }}>
                Categories
              </h4>
              <button
                onClick={() => setTagManagerOpen(true)}
                className="btn-reset btn-hover"
                style={{
                  color: theme.textSec,
                  padding: 6,
                  borderRadius: 8,
                  background: theme.hoverBg
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme.activeBg}
                onMouseLeave={e => e.currentTarget.style.background = theme.hoverBg}
              >
                <ICONS.Settings />
              </button>
            </div>
            
            <div style={{
              height: "calc(100% - 40px)",
              overflowY: "auto",
              paddingRight: 4
            }}>
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
                  className="btn-hover tag-pill"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px",
                    marginBottom: 6,
                    borderRadius: 10,
                    cursor: "pointer",
                    opacity: activeTagIds.includes(tag.id) ? 1 : 0.5,
                    background: activeTagIds.includes(tag.id) ? theme.hoverBg : 'transparent',
                    transition: 'all 0.2s',
                    border: `1px solid ${activeTagIds.includes(tag.id) ? theme.border : 'transparent'}`
                  }}
                  onMouseEnter={e => {
                    if (!activeTagIds.includes(tag.id)) {
                      e.currentTarget.style.opacity = 0.8;
                      e.currentTarget.style.background = theme.hoverBg;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!activeTagIds.includes(tag.id)) {
                      e.currentTarget.style.opacity = 0.5;
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    background: config.darkMode ? tag.colorLight : tag.color,
                    color: config.darkMode ? tag.text : "#fff",
                    flexShrink: 0
                  }}>
                    {tag.icon}
                  </div>
                  <span style={{
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    flex: 1
                  }}>
                    {tag.name}
                  </span>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: activeTagIds.includes(tag.id) 
                      ? (config.darkMode ? tag.colorLight : tag.color) 
                      : 'transparent',
                    border: `2px solid ${theme.border}`
                  }} />
                </div>
              ))}
            </div>
          </div>
          
          {/* Footer Actions */}
          <div style={{
            marginTop: 24,
            paddingTop: 24,
            borderTop: `1px solid ${theme.border}`,
            display: "flex",
            justifyContent: "space-between",
            gap: 8
          }}>
            <button
              onClick={() => setTrashOpen(true)}
              className="btn-reset btn-hover"
              style={{
                color: theme.textSec,
                fontSize: 13,
                fontWeight: 600,
                gap: 8,
                padding: '10px 14px',
                borderRadius: 10,
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = theme.hoverBg;
                e.currentTarget.style.color = theme.text;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = theme.textSec;
              }}
            >
              <ICONS.Trash /> Trash
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="btn-reset btn-hover"
              style={{
                color: theme.textSec,
                fontSize: 13,
                fontWeight: 600,
                gap: 8,
                padding: '10px 14px',
                borderRadius: 10,
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = theme.hoverBg;
                e.currentTarget.style.color = theme.text;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = theme.textSec;
              }}
            >
              <ICONS.Settings /> Settings
            </button>
          </div>
        </aside>
      )}
      
      {/* MAIN WORKSPACE */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative"
      }}>
        {/* Header */}
        <header style={{
          height: LAYOUT.HEADER_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          borderBottom: `1px solid ${theme.border}`,
          background: theme.bg,
          zIndex: 40
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <h2 className="luxe" style={{
              fontSize: 36,
              fontWeight: 600,
              letterSpacing: '-0.02em'
            }}>
              {viewMode === 'year' 
                ? currentDate.getFullYear()
                : viewMode === 'month'
                ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                : viewMode === 'week'
                ? `Week ${getWeekNumber(currentDate)}, ${currentDate.getFullYear()}`
                : currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
              }
            </h2>
            
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => navigateDate(-1)}
                className="btn-reset btn-hover"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  border: `1px solid ${theme.border}`,
                  background: theme.hoverBg,
                  color: theme.text
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme.activeBg}
                onMouseLeave={e => e.currentTarget.style.background = theme.hoverBg}
              >
                <ICONS.ChevronLeft />
              </button>
              
              <button
                onClick={goToToday}
                className="btn-reset btn-hover"
                style={{
                  padding: "0 20px",
                  height: 40,
                  borderRadius: 20,
                  border: `1px solid ${theme.border}`,
                  fontSize: 14,
                  fontWeight: 600,
                  background: theme.hoverBg,
                  color: theme.text
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme.activeBg}
                onMouseLeave={e => e.currentTarget.style.background = theme.hoverBg}
              >
                Today
              </button>
              
              <button
                onClick={() => navigateDate(1)}
                className="btn-reset btn-hover"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  border: `1px solid ${theme.border}`,
                  background: theme.hoverBg,
                  color: theme.text
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme.activeBg}
                onMouseLeave={e => e.currentTarget.style.background = theme.hoverBg}
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
            borderRadius: 14,
            gap: 2
          }}>
            {['day', 'week', 'month', 'year'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`btn-reset tab-pill ${viewMode === mode ? 'active' : ''}`}
                style={{
                  background: viewMode === mode ? theme.card : 'transparent',
                  color: viewMode === mode ? theme.text : theme.textMuted,
                  textTransform: "capitalize",
                  fontWeight: 600,
                  boxShadow: viewMode === mode ? theme.shadow : 'none'
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </header>
        
        {/* Main Content */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflow: "auto",
            position: "relative",
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
              <div className="shimmer" style={{
                width: 200,
                height: 4,
                borderRadius: 2
              }} />
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
              onNewEvent={(start, end) => {
                setEditingEvent({
                  start,
                  end,
                  title: "",
                  category: currentTags[0]?.id || ''
                });
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
              onNewEvent={(start, end) => {
                setEditingEvent({
                  start,
                  end,
                  title: "",
                  category: currentTags[0]?.id || ''
                });
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
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        gap: 10
      }}>
        {notifications.map(notification => (
          <div
            key={notification.id}
            className="notification-toast"
            style={{
              padding: "16px 24px",
              background: notification.type === 'error' 
                ? theme.indicator 
                : notification.type === 'success'
                ? theme.familyAccent
                : theme.card,
              color: notification.type === 'error' || notification.type === 'success' 
                ? "#fff" 
                : theme.text,
              borderRadius: 14,
              boxShadow: theme.shadowLg,
              fontSize: 14,
              fontWeight: 600,
              border: `1px solid ${notification.type === 'error' 
                ? theme.indicator 
                : notification.type === 'success'
                ? theme.familyAccent
                : theme.border}`,
              minWidth: 280,
              display: "flex",
              alignItems: "center",
              gap: 12
            }}
          >
            <div style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: notification.type === 'error' 
                ? "#fff" 
                : notification.type === 'success'
                ? "#fff"
                : accentColor,
              flexShrink: 0
            }} />
            {notification.message}
          </div>
        ))}
      </div>
      
      {/* Toggle Sidebar Button */}
      {!config.showSidebar && (
        <button
          onClick={() => setConfig({ ...config, showSidebar: true })}
          className="btn-reset btn-hover"
          style={{
            position: "fixed",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            background: accentColor,
            color: "#fff",
            padding: "16px 8px",
            borderRadius: "0 12px 12px 0",
            boxShadow: theme.shadowLg,
            zIndex: 45,
            transition: "all 0.3s"
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-50%) translateX(4px)";
            e.currentTarget.style.paddingLeft = "12px";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "translateY(-50%)";
            e.currentTarget.style.paddingLeft = "8px";
          }}
        >
          <ICONS.ChevronRight />
        </button>
      )}
    </div>
  );
}

// ==========================================
// 4. SUB-COMPONENTS
// ==========================================

function MiniCalendar({ currentDate, setCurrentDate, theme, config, context }) {
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
  
  const accentColor = context === 'family' ? theme.familyAccent : theme.accent;
  
  return (
    <div className="fade-enter">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
      }}>
        <span style={{
          fontSize: 15,
          fontWeight: 700,
          color: theme.text,
          letterSpacing: '-0.01em'
        }}>
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
            className="btn-reset btn-hover"
            style={{
              color: theme.textSec,
              padding: 6,
              borderRadius: 8,
              background: theme.hoverBg
            }}
            onMouseEnter={e => e.currentTarget.style.background = theme.activeBg}
            onMouseLeave={e => e.currentTarget.style.background = theme.hoverBg}
          >
            <ICONS.ChevronLeft />
          </button>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
            className="btn-reset btn-hover"
            style={{
              color: theme.textSec,
              padding: 6,
              borderRadius: 8,
              background: theme.hoverBg
            }}
            onMouseEnter={e => e.currentTarget.style.background = theme.activeBg}
            onMouseLeave={e => e.currentTarget.style.background = theme.hoverBg}
          >
            <ICONS.ChevronRight />
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
              fontWeight: 700,
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
              className={`mini-cal-day ${isSelected ? 'active' : ''}`}
              onClick={() => setCurrentDate(date)}
              style={{
                background: isSelected 
                  ? accentColor 
                  : isToday 
                  ? theme.selection 
                  : 'transparent',
                color: isSelected 
                  ? '#fff' 
                  : isToday 
                  ? accentColor 
                  : theme.text,
                fontWeight: isSelected || isToday ? 700 : 500,
                position: 'relative',
                zIndex: 1
              }}
            >
              {day}
              {isToday && config.enablePulseEffects && (
                <div style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: accentColor,
                  animation: 'pulse 2s ease-in-out infinite'
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({ currentDate, events, theme, config, tags, onEventClick, onNewEvent }) {
  const now = new Date();
  const isToday = currentDate.toDateString() === now.toDateString();
  
  return (
    <div className="fade-enter" style={{
      padding: "40px 80px",
      maxWidth: 1000,
      margin: "0 auto",
      width: "100%"
    }}>
      <div style={{ marginBottom: 60 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: theme.accent,
          textTransform: "uppercase",
          letterSpacing: 1.5,
          marginBottom: 8,
          fontFamily: 'Inter'
        }}>
          {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
        </div>
        <h1 className="luxe" style={{
          fontSize: 72,
          fontWeight: 600,
          color: theme.text,
          letterSpacing: '-0.02em',
          lineHeight: 1
        }}>
          {currentDate.toDateString() === now.toDateString() 
            ? "Today's Agenda" 
            : currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
          }
        </h1>
        {isToday && config.enablePulseEffects && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 12
          }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: theme.accent,
              animation: 'pulse 2s ease-in-out infinite'
            }} />
            <div style={{
              fontSize: 14,
              color: theme.textSec,
              fontWeight: 600
            }}>
              Live • {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </div>
          </div>
        )}
      </div>
      
      <div style={{
        position: "relative",
        borderLeft: `2px solid ${theme.manifestoLine}`,
        paddingLeft: 40,
        minHeight: 800
      }}>
        {Array.from({ length: 24 }).map((_, hour) => {
          if (hour < 5) return null;
          
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
                minHeight: 100,
                position: "relative",
                marginBottom: 20
              }}
            >
              {/* Time label */}
              <div className="luxe" style={{
                position: "absolute",
                left: -100,
                top: -8,
                fontSize: 20,
                color: theme.textMuted,
                width: 50,
                textAlign: "right",
                fontWeight: 600,
                letterSpacing: '-0.01em'
              }}>
                {config.use24Hour ? hour : (hour % 12 || 12)}
                <span style={{
                  fontSize: 12,
                  marginLeft: 4,
                  opacity: 0.6
                }}>
                  {config.use24Hour ? '' : hour < 12 ? 'AM' : 'PM'}
                </span>
              </div>
              
              {/* Time marker */}
              <div style={{
                position: "absolute",
                left: -46,
                top: 4,
                width: 11,
                height: 11,
                borderRadius: "50%",
                background: theme.sidebar,
                border: `3px solid ${theme.textMuted}`,
                zIndex: 2
              }} />
              
              {/* Events for this hour */}
              <div style={{ position: "relative", zIndex: 1 }}>
                {hourEvents.map(event => {
                  const tag = tags.find(t => t.id === event.category) || tags[0];
                  const isPast = config.blurPast && event.end < now;
                  const eventStart = new Date(event.start);
                  const eventEnd = new Date(event.end);
                  
                  // Calculate position and height
                  const startMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
                  const endMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes();
                  const top = (startMinutes - (hour * 60)) * (LAYOUT.PIXELS_PER_MINUTE / 60);
                  const height = Math.max((endMinutes - startMinutes) * (LAYOUT.PIXELS_PER_MINUTE / 60), 40);
                  
                  return (
                    <div
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className={`event-card-journal ${isPast ? 'past-event' : ''}`}
                      style={{
                        position: "absolute",
                        top,
                        height,
                        width: "100%",
                        marginBottom: 16,
                        cursor: "pointer",
                        background: config.darkMode ? tag.darkBg : tag.bg,
                        borderLeftColor: config.darkMode ? tag.colorLight : tag.color,
                        padding: "20px 24px",
                        borderRadius: 12,
                        opacity: isPast ? 0.5 : 1,
                        boxShadow: theme.shadow,
                        borderLeftWidth: 4
                      }}
                    >
                      <div style={{
                        fontSize: 22,
                        fontWeight: 600,
                        color: config.darkMode ? '#FAFAFA' : tag.text,
                        fontFamily: 'Cormorant Garamond',
                        marginBottom: 6,
                        letterSpacing: '-0.02em'
                      }}>
                        {event.title}
                      </div>
                      <div style={{
                        display: "flex",
                        gap: 16,
                        fontSize: 13,
                        color: config.darkMode ? theme.textSec : tag.text,
                        alignItems: "center",
                        fontWeight: 500,
                        fontFamily: 'Inter',
                        opacity: 0.8
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ICONS.Clock />
                          {event.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} 
                          — 
                          {event.end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        {event.location && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ICONS.MapPin /> {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* Empty slot - click to add event */}
                {hourEvents.length === 0 && (
                  <div
                    onClick={() => {
                      const start = new Date(currentDate);
                      start.setHours(hour, 0, 0, 0);
                      const end = new Date(start);
                      end.setHours(hour + 1, 0, 0, 0);
                      onNewEvent(start, end);
                    }}
                    style={{
                      height: 80,
                      cursor: "pointer",
                      borderRadius: 8,
                      transition: 'background 0.2s',
                      border: `2px dashed ${theme.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: theme.textMuted,
                      fontSize: 13,
                      fontWeight: 600
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = theme.hoverBg;
                      e.currentTarget.style.borderColor = theme.accent;
                      e.currentTarget.style.color = theme.accent;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = theme.border;
                      e.currentTarget.style.color = theme.textMuted;
                    }}
                  >
                    + Add event at {config.use24Hour ? `${hour}:00` : `${hour % 12 || 12}${hour < 12 ? 'AM' : 'PM'}`}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Current time indicator */}
        {isToday && config.enablePulseEffects && (
          <div className="timeline-now" style={{
            left: 40,
            top: (now.getHours() * 60 + now.getMinutes()) * (LAYOUT.PIXELS_PER_MINUTE / 60)
          }} />
        )}
      </div>
    </div>
  );
}

function WeekView({ currentDate, events, theme, config, tags, onEventClick, onNewEvent }) {
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
  const HOUR_HEIGHT = 60 * LAYOUT.PIXELS_PER_MINUTE;
  
  return (
    <div style={{ display: "flex", minHeight: "100%", height: "100%" }}>
      {/* Time column */}
      <div style={{
        width: 80,
        flexShrink: 0,
        borderRight: `1px solid ${theme.border}`,
        background: theme.sidebar,
        paddingTop: 60,
        position: "sticky",
        left: 0,
        zIndex: 20
      }}>
        {Array.from({ length: 24 }).map((_, hour) => (
          <div
            key={hour}
            style={{
              height: HOUR_HEIGHT,
              position: "relative",
              borderBottom: `1px solid ${theme.borderLight}`
            }}
          >
            <span style={{
              position: "absolute",
              top: -8,
              right: 12,
              fontSize: 12,
              color: theme.textMuted,
              fontWeight: 600
            }}>
              {config.use24Hour 
                ? `${hour}:00` 
                : `${hour % 12 || 12}${hour < 12 ? 'a' : 'p'}`
              }
            </span>
          </div>
        ))}
      </div>
      
      {/* Days columns */}
      <div style={{ flex: 1, display: "flex", overflowX: "auto" }}>
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
                minWidth: 200,
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
                zIndex: 10,
                gap: 2
              }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: isToday ? theme.accent : theme.textMuted,
                  letterSpacing: '0.5px'
                }}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                </span>
                <div className={isToday && config.enablePulseEffects ? "current-day-pulse" : ""} style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: isToday ? theme.accent : theme.text,
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isToday ? theme.accent + '20' : 'transparent'
                }}>
                  {day.getDate()}
                </div>
              </div>
              
              {/* Hours grid */}
              <div style={{
                position: "relative",
                height: 24 * HOUR_HEIGHT
              }}>
                {/* Hour lines */}
                {Array.from({ length: 24 }).map((_, hour) => (
                  <div
                    key={hour}
                    style={{
                      height: HOUR_HEIGHT,
                      borderBottom: `1px solid ${theme.borderLight}`,
                      boxSizing: "border-box"
                    }}
                  />
                ))}
                
                {/* Click to add event */}
                <div
                  style={{ position: "absolute", inset: 0, zIndex: 1 }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const minutes = Math.floor(y / LAYOUT.PIXELS_PER_MINUTE / 15) * 15;
                    
                    const start = new Date(day);
                    start.setHours(0, minutes, 0, 0);
                    const end = new Date(start);
                    end.setMinutes(minutes + 60);
                    
                    onNewEvent(start, end);
                  }}
                />
                
                {/* Events */}
                {dayEvents.map(event => {
                  const start = new Date(event.start);
                  const end = new Date(event.end);
                  const tag = tags.find(t => t.id === event.category) || tags[0];
                  
                  const top = (start.getHours() * 60 + start.getMinutes()) * LAYOUT.PIXELS_PER_MINUTE;
                  const height = Math.max(((end - start) / 60000) * LAYOUT.PIXELS_PER_MINUTE, 30);
                  
                  return (
                    <div
                      key={event.id}
                      className="btn-hover"
                      onClick={() => onEventClick(event)}
                      style={{
                        position: "absolute",
                        top,
                        height,
                        left: 4,
                        right: 4,
                        background: config.darkMode ? tag.darkBg : tag.bg,
                        borderLeft: `4px solid ${config.darkMode ? tag.colorLight : tag.color}`,
                        borderRadius: 8,
                        padding: 8,
                        fontSize: 12,
                        color: config.darkMode ? tag.colorLight : tag.text,
                        cursor: "pointer",
                        zIndex: 5,
                        overflow: "hidden",
                        boxShadow: theme.shadow,
                        fontWeight: 600
                      }}
                    >
                      <div style={{
                        fontWeight: 700,
                        marginBottom: 2,
                        letterSpacing: '-0.01em',
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}>
                        {event.title}
                      </div>
                      {height > 40 && (
                        <div style={{ fontSize: 11, opacity: 0.8 }}>
                          {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Current time indicator for today */}
                {isToday && config.enablePulseEffects && (
                  <div className="timeline-now" style={{
                    left: 4,
                    right: 4,
                    top: (now.getHours() * 60 + now.getMinutes()) * LAYOUT.PIXELS_PER_MINUTE
                  }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthView({ currentDate, events, theme, config, onDayClick, onEventClick }) {
  const now = new Date();
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  
  let startDay = startOfMonth.getDay();
  if (config.weekStartMon) {
    startDay = startDay === 0 ? 6 : startDay - 1;
  }
  
  const weekDays = config.weekStartMon 
    ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  return (
    <div className="fade-enter" style={{
      padding: 40,
      height: '100%',
      overflow: 'auto'
    }}>
      {/* Weekday headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 12,
        marginBottom: 16,
        padding: '0 8px'
      }}>
        {weekDays.map(day => (
          <div
            key={day}
            style={{
              textAlign: 'center',
              fontWeight: 700,
              color: theme.textMuted,
              paddingBottom: 12,
              fontSize: 13,
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}
          >
            {day.slice(0, 3)}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 12,
        height: 'calc(100% - 60px)'
      }}>
        {/* Empty cells for days before month start */}
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        
        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const isToday = date.toDateString() === now.toDateString();
          const dayEvents = events.filter(event => 
            event.start.toDateString() === date.toDateString()
          );
          
          return (
            <div
              key={day}
              onClick={() => onDayClick(date)}
              style={{
                border: `1px solid ${theme.border}`,
                borderRadius: 12,
                padding: 12,
                minHeight: 140,
                cursor: 'pointer',
                background: isToday ? theme.selection : theme.card,
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}
              className="btn-hover"
              onMouseEnter={e => !isToday && (e.currentTarget.style.background = theme.hoverBg)}
              onMouseLeave={e => !isToday && (e.currentTarget.style.background = theme.card)}
            >
              {/* Day number */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8
              }}>
                <div style={{
                  fontWeight: isToday ? 700 : 600,
                  color: isToday ? theme.accent : theme.text,
                  fontSize: 16
                }}>
                  {day}
                </div>
                {isToday && config.enablePulseEffects && (
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: theme.accent,
                    animation: 'pulse 2s ease-in-out infinite'
                  }} />
                )}
              </div>
              
              {/* Events */}
              <div style={{
                flex: 1,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    style={{
                      fontSize: 11,
                      padding: "6px 8px",
                      borderRadius: 6,
                      background: theme.borderLight,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 0.8}
                    onMouseLeave={e => e.currentTarget.style.opacity = 1}
                  >
                    {event.title}
                  </div>
                ))}
                
                {dayEvents.length > 3 && (
                  <div style={{
                    fontSize: 10,
                    color: theme.textMuted,
                    fontWeight: 600,
                    padding: '4px 0',
                    textAlign: 'center'
                  }}>
                    +{dayEvents.length - 3} more
                  </div>
                )}
                
                {dayEvents.length === 0 && (
                  <div style={{
                    fontSize: 10,
                    color: theme.textMuted,
                    fontStyle: 'italic',
                    textAlign: 'center',
                    padding: '12px 0'
                  }}>
                    No events
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

function YearView({ 
  currentDate, 
  events, 
  theme, 
  config, 
  tags, 
  context, 
  onDayClick, 
  onEventClick, 
  onEventDrag,
  draggedEvent,
  setDraggedEvent
}) {
  const now = new Date();
  const accentColor = context === 'family' ? theme.familyAccent : theme.accent;
  const year = currentDate.getFullYear();
  
  const handleDragStart = (e, event) => {
    e.stopPropagation();
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
    
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', event.id);
    }
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDrop = (e, date) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedEvent) {
      onEventDrag(draggedEvent.id, date);
      setDraggedEvent(null);
    }
  };
  
  const handleDragEnd = () => {
    setDraggedEvent(null);
  };
  
  return (
    <div className="fade-enter" style={{
      padding: "40px",
      overflow: "auto",
      height: "100%"
    }}>
      {/* Year header with navigation */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 40,
        padding: "0 20px"
      }}>
        <div>
          <h2 className="luxe" style={{
            fontSize: 48,
            fontWeight: 700,
            color: theme.text,
            letterSpacing: '-0.03em',
            marginBottom: 8
          }}>
            {year}
          </h2>
          <div style={{
            fontSize: 14,
            color: theme.textSec,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: accentColor
              }} />
              {events.length} events
            </div>
            {config.enableDragDrop && (
              <div style={{
                padding: '4px 12px',
                background: theme.hoverBg,
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600
              }}>
                🎯 Drag events to reschedule
              </div>
            )}
          </div>
        </div>
        
        {config.enablePulseEffects && year === now.getFullYear() && (
          <div style={{
            padding: '16px 24px',
            background: theme.selection,
            borderRadius: 16,
            border: `1px solid ${accentColor}20`,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: accentColor
            }} />
            <div style={{
              fontSize: 14,
              fontWeight: 700,
              color: theme.text
            }}>
              Current Year
            </div>
          </div>
        )}
      </div>
      
      {/* Calendar grid */}
      <div style={{ minWidth: 1400 }}>
        {/* Weekday headers */}
        <div style={{
          display: "flex",
          marginLeft: 120,
          marginBottom: 16,
          position: 'sticky',
          top: 0,
          background: theme.bg,
          zIndex: 30,
          padding: '12px 0',
          borderBottom: `1px solid ${theme.border}`
        }}>
          {Array.from({ length: LAYOUT.YEAR_COLS }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                textAlign: "center",
                fontSize: 11,
                fontWeight: 700,
                color: theme.textMuted,
                letterSpacing: '0.5px',
                fontFamily: 'Inter'
              }}
            >
              {(config.weekStartMon 
                ? ["M", "T", "W", "T", "F", "S", "S"] 
                : ["S", "M", "T", "W", "T", "F", "S"]
              )[i % 7]}
            </div>
          ))}
        </div>
        
        {/* Months */}
        {Array.from({ length: 12 }).map((_, month) => {
          const monthStart = new Date(year, month, 1);
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          let offset = monthStart.getDay();
          
          if (config.weekStartMon) {
            offset = offset === 0 ? 6 : offset - 1;
          }
          
          return (
            <div
              key={month}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 12,
                height: 42,
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = theme.hoverBg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Month label */}
              <div className="luxe" style={{
                width: 120,
                fontSize: 16,
                fontWeight: 600,
                color: theme.textSec,
                letterSpacing: '-0.01em',
                padding: '0 20px'
              }}>
                {monthStart.toLocaleDateString('en-US', { month: 'long' })}
              </div>
              
              {/* Days */}
              <div style={{ flex: 1, display: "flex", gap: 2 }}>
                {Array.from({ length: LAYOUT.YEAR_COLS }).map((_, col) => {
                  const dayNum = col - offset + 1;
                  
                  if (dayNum < 1 || dayNum > daysInMonth) {
                    return <div key={col} style={{ flex: 1 }} />;
                  }
                  
                  const date = new Date(year, month, dayNum);
                  const isToday = date.toDateString() === now.toDateString();
                  const dayEvents = events.filter(event => 
                    event.start.toDateString() === date.toDateString()
                  );
                  const isDragTarget = draggedEvent !== null;
                  
                  return (
                    <div
                      key={`${month}-${col}`}
                      className="year-day-cell"
                      onClick={() => !isDragTarget && onDayClick(date)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, date)}
                      style={{
                        flex: 1,
                        height: 38,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: isDragTarget ? "copy" : "pointer",
                        background: isToday 
                          ? accentColor 
                          : dayEvents.length > 0 
                          ? theme.hoverBg 
                          : "transparent",
                        color: isToday 
                          ? "#fff" 
                          : dayEvents.length > 0 
                          ? theme.text 
                          : theme.textSec,
                        border: isToday 
                          ? `2px solid ${accentColor}` 
                          : `1px solid ${theme.borderLight}`,
                        position: "relative",
                        transition: 'all 0.2s',
                        boxShadow: isToday ? theme.glow : 'none',
                        outline: isDragTarget ? `2px dashed ${accentColor}` : 'none',
                        outlineOffset: isDragTarget ? '2px' : '0'
                      }}
                      onMouseEnter={e => {
                        if (!isToday && !isDragTarget) {
                          e.currentTarget.style.background = theme.activeBg;
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isToday && !isDragTarget) {
                          e.currentTarget.style.background = dayEvents.length > 0 
                            ? theme.hoverBg 
                            : 'transparent';
                          e.currentTarget.style.transform = 'scale(1)';
                        }
                      }}
                    >
                      {dayNum}
                      
                      {/* Event dots */}
                      {dayEvents.length > 0 && (
                        <div style={{
                          position: "absolute",
                          bottom: 4,
                          left: "50%",
                          transform: "translateX(-50%)",
                          display: "flex",
                          gap: 3
                        }}>
                          {dayEvents.slice(0, 3).map(event => {
                            const tag = tags.find(t => t.id === event.category) || tags[0];
                            const isDragging = draggedEvent?.id === event.id;
                            
                            return (
                              <div
                                key={event.id}
                                className="year-event-dot"
                                draggable={config.enableDragDrop}
                                onDragStart={(e) => handleDragStart(e, event)}
                                onDragEnd={handleDragEnd}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isDragTarget) onEventClick(event);
                                }}
                                style={{
                                  background: config.darkMode ? tag.colorLight : tag.color,
                                  opacity: isDragging ? 0.3 : 1,
                                  cursor: config.enableDragDrop ? 'grab' : 'pointer'
                                }}
                                title={`${event.title} (${event.start.toLocaleTimeString([], { 
                                  hour: 'numeric', 
                                  minute: '2-digit' 
                                })})`}
                              />
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Today indicator */}
                      {isToday && config.enablePulseEffects && (
                        <div style={{
                          position: 'absolute',
                          top: -2,
                          right: -2,
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: '#fff',
                          border: `2px solid ${accentColor}`,
                          animation: 'pulse 2s ease-in-out infinite'
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
      
      {/* Legend */}
      <div style={{
        marginTop: 40,
        padding: 20,
        background: theme.card,
        borderRadius: 16,
        border: `1px solid ${theme.border}`,
        display: 'flex',
        gap: 24,
        flexWrap: 'wrap'
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: theme.textSec,
          marginBottom: 12,
          width: '100%'
        }}>
          Legend
        </div>
        
        {tags.map(tag => (
          <div
            key={tag.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: config.darkMode ? tag.colorLight : tag.color
            }} />
            <span style={{
              fontSize: 12,
              color: theme.text,
              fontWeight: 600
            }}>
              {tag.name}
            </span>
          </div>
        ))}
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginLeft: 'auto'
        }}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: accentColor,
            animation: config.enablePulseEffects ? 'pulse 2s ease-in-out infinite' : 'none'
          }} />
          <span style={{
            fontSize: 12,
            color: theme.text,
            fontWeight: 600
          }}>
            Today
          </span>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ config, setConfig, theme, onClose, user }) {
  const [activeTab, setActiveTab] = useState('appearance');
  
  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'calendar', label: 'Calendar', icon: '📅' },
    { id: 'features', label: 'Features', icon: '⚡' },
    { id: 'account', label: 'Account', icon: '👤' }
  ];
  
  return (
    <div
      className="glass-panel fade-enter"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(8px)"
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          width: 600,
          height: "80vh",
          background: theme.card,
          borderRadius: 24,
          boxShadow: theme.shadowLg,
          border: `1px solid ${theme.border}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "28px 32px",
          borderBottom: `1px solid ${theme.border}`
        }}>
          <h3 className="luxe" style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: '-0.02em'
          }}>
            Settings
          </h3>
          <button
            onClick={onClose}
            className="btn-reset btn-hover"
            style={{
              padding: 10,
              borderRadius: 12,
              background: theme.hoverBg,
              color: theme.text
            }}
            onMouseEnter={e => e.currentTarget.style.background = theme.activeBg}
            onMouseLeave={e => e.currentTarget.style.background = theme.hoverBg}
          >
            <ICONS.Close />
          </button>
        </div>
        
        {/* Tabs */}
        <div style={{
          display: "flex",
          padding: "0 32px",
          borderBottom: `1px solid ${theme.border}`,
          gap: 4
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`btn-reset tab-pill ${activeTab === tab.id ? 'active' : ''}`}
              style={{
                padding: "14px 20px",
                background: activeTab === tab.id ? theme.card : 'transparent',
                color: activeTab === tab.id ? theme.text : theme.textSec,
                marginBottom: -1
              }}
            >
              <span style={{ marginRight: 8 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "32px"
        }}>
          {activeTab === 'appearance' && (
            <div>
              <div style={{ marginBottom: 32 }}>
                <label style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 16,
                  color: theme.textSec,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Theme
                </label>
                <div className="segmented" style={{ background: theme.borderLight }}>
                  <div
                    onClick={() => setConfig({ ...config, darkMode: false })}
                    className={`seg-opt ${!config.darkMode ? 'active' : ''}`}
                    style={{
                      background: !config.darkMode ? theme.card : 'transparent',
                      color: !config.darkMode ? theme.accent : theme.textSec
                    }}
                  >
                    ☀ Light
                  </div>
                  <div
                    onClick={() => setConfig({ ...config, darkMode: true })}
                    className={`seg-opt ${config.darkMode ? 'active' : ''}`}
                    style={{
                      background: config.darkMode ? theme.card : 'transparent',
                      color: config.darkMode ? theme.accent : theme.textSec
                    }}
                  >
                    ☾ Dark
                  </div>
                </div>
              </div>
              
              <div style={{ marginBottom: 32 }}>
                <label style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 16,
                  color: theme.textSec,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Accent Color
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {['orange', 'family'].map(color => (
                    <button
                      key={color}
                      onClick={() => setConfig({ ...config, accentColor: color })}
                      style={{
                        padding: "10px 16px",
                        borderRadius: 10,
                        border: `2px solid ${config.accentColor === color ? theme.accent : theme.border}`,
                        background: config.accentColor === color ? theme.selection : 'transparent',
                        color: config.accentColor === color ? theme.accent : theme.text,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      {color === 'orange' ? 'Personal' : 'Family'}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="settings-row" style={{ borderBottomColor: theme.border }}>
                <div>
                  <div className="settings-label">High Contrast</div>
                  <div className="settings-sub">Increase contrast for better readability</div>
                </div>
                <div
                  className={`switch-track ${config.highContrast ? 'active' : ''}`}
                  style={{ background: config.highContrast ? theme.accent : theme.borderLight }}
                  onClick={() => setConfig({ ...config, highContrast: !config.highContrast })}
                >
                  <div className="switch-thumb" />
                </div>
              </div>
              
              <div className="settings-row" style={{ borderBottomColor: theme.border }}>
                <div>
                  <div className="settings-label">Show Motivational Quotes</div>
                  <div className="settings-sub">Display inspirational messages</div>
                </div>
                <div
                  className={`switch-track ${config.showMotivationalQuotes ? 'active' : ''}`}
                  style={{ background: config.showMotivationalQuotes ? theme.accent : theme.borderLight }}
                  onClick={() => setConfig({ ...config, showMotivationalQuotes: !config.showMotivationalQuotes })}
                >
                  <div className="switch-thumb" />
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'calendar' && (
            <div>
              <div style={{ marginBottom: 32 }}>
                <label style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 16,
                  color: theme.textSec,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  First Day of Week
                </label>
                <div className="segmented" style={{ background: theme.borderLight }}>
                  <div
                    onClick={() => setConfig({ ...config, weekStartMon: false })}
                    className={`seg-opt ${!config.weekStartMon ? 'active' : ''}`}
                    style={{
                      background: !config.weekStartMon ? theme.card : 'transparent',
                      color: !config.weekStartMon ? theme.text : theme.textSec
                    }}
                  >
                    Sunday
                  </div>
                  <div
                    onClick={() => setConfig({ ...config, weekStartMon: true })}
                    className={`seg-opt ${config.weekStartMon ? 'active' : ''}`}
                    style={{
                      background: config.weekStartMon ? theme.card : 'transparent',
                      color: config.weekStartMon ? theme.text : theme.textSec
                    }}
                  >
                    Monday
                  </div>
                </div>
              </div>
              
              <div style={{ marginBottom: 32 }}>
                <label style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 16,
                  color: theme.textSec,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Time Format
                </label>
                <div className="segmented" style={{ background: theme.borderLight }}>
                  <div
                    onClick={() => setConfig({ ...config, use24Hour: false })}
                    className={`seg-opt ${!config.use24Hour ? 'active' : ''}`}
                    style={{
                      background: !config.use24Hour ? theme.card : 'transparent',
                      color: !config.use24Hour ? theme.text : theme.textSec
                    }}
                  >
                    12-hour
                  </div>
                  <div
                    onClick={() => setConfig({ ...config, use24Hour: true })}
                    className={`seg-opt ${config.use24Hour ? 'active' : ''}`}
                    style={{
                      background: config.use24Hour ? theme.card : 'transparent',
                      color: config.use24Hour ? theme.text : theme.textSec
                    }}
                  >
                    24-hour
                  </div>
                </div>
              </div>
              
              <div className="settings-row" style={{ borderBottomColor: theme.border }}>
                <div>
                  <div className="settings-label">Show Week Numbers</div>
                  <div className="settings-sub">Display week numbers in month view</div>
                </div>
                <div
                  className={`switch-track ${config.showWeekNumbers ? 'active' : ''}`}
                  style={{ background: config.showWeekNumbers ? theme.accent : theme.borderLight }}
                  onClick={() => setConfig({ ...config, showWeekNumbers: !config.showWeekNumbers })}
                >
                  <div className="switch-thumb" />
                </div>
              </div>
              
              <div className="settings-row" style={{ borderBottomColor: theme.border }}>
                <div>
                  <div className="settings-label">Blur Past Events</div>
                  <div className="settings-sub">Fade out completed events</div>
                </div>
                <div
                  className={`switch-track ${config.blurPast ? 'active' : ''}`}
                  style={{ background: config.blurPast ? theme.accent : theme.borderLight }}
                  onClick={() => setConfig({ ...config, blurPast: !config.blurPast })}
                >
                  <div className="switch-thumb" />
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'features' && (
            <div>
              <div className="settings-row" style={{ borderBottomColor: theme.border }}>
                <div>
                  <div className="settings-label">Enable Drag & Drop</div>
                  <div className="settings-sub">Drag events to reschedule</div>
                </div>
                <div
                  className={`switch-track ${config.enableDragDrop ? 'active' : ''}`}
                  style={{ background: config.enableDragDrop ? theme.accent : theme.borderLight }}
                  onClick={() => setConfig({ ...config, enableDragDrop: !config.enableDragDrop })}
                >
                  <div className="switch-thumb" />
                </div>
              </div>
              
              <div className="settings-row" style={{ borderBottomColor: theme.border }}>
                <div>
                  <div className="settings-label">Show Sidebar</div>
                  <div className="settings-sub">Display the sidebar panel</div>
                </div>
                <div
                  className={`switch-track ${config.showSidebar ? 'active' : ''}`}
                  style={{ background: config.showSidebar ? theme.accent : theme.borderLight }}
                  onClick={() => setConfig({ ...config, showSidebar: !config.showSidebar })}
                >
                  <div className="switch-thumb" />
                </div>
              </div>
              
              <div className="settings-row" style={{ borderBottomColor: theme.border }}>
                <div>
                  <div className="settings-label">Show Upcoming Events</div>
                  <div className="settings-sub">Display upcoming events in sidebar</div>
                </div>
                <div
                  className={`switch-track ${config.showUpcomingEvents ? 'active' : ''}`}
                  style={{ background: config.showUpcomingEvents ? theme.accent : theme.borderLight }}
                  onClick={() => setConfig({ ...config, showUpcomingEvents: !config.showUpcomingEvents })}
                >
                  <div className="switch-thumb" />
                </div>
              </div>
              
              <div className="settings-row" style={{ borderBottomColor: theme.border }}>
                <div>
                  <div className="settings-label">Enable Animations</div>
                  <div className="settings-sub">Smooth transitions and effects</div>
                </div>
                <div
                  className={`switch-track ${config.enableAnimations ? 'active' : ''}`}
                  style={{ background: config.enableAnimations ? theme.accent : theme.borderLight }}
                  onClick={() => setConfig({ ...config, enableAnimations: !config.enableAnimations })}
                >
                  <div className="switch-thumb" />
                </div>
              </div>
              
              <div className="settings-row" style={{ borderBottomColor: theme.border }}>
                <div>
                  <div className="settings-label">Pulse Effects</div>
                  <div className="settings-sub">Animated indicators for today</div>
                </div>
                <div
                  className={`switch-track ${config.enablePulseEffects ? 'active' : ''}`}
                  style={{ background: config.enablePulseEffects ? theme.accent : theme.borderLight }}
                  onClick={() => setConfig({ ...config, enablePulseEffects: !config.enablePulseEffects })}
                >
                  <div className="switch-thumb" />
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'account' && (
            <div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 32,
                padding: 20,
                background: theme.hoverBg,
                borderRadius: 16
              }}>
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${theme.accent}, ${theme.familyAccent})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 24,
                  fontWeight: 700
                }}>
                  {user.displayName?.charAt(0) || 'U'}
                </div>
                <div>
                  <div style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: theme.text,
                    marginBottom: 4
                  }}>
                    {user.displayName}
                  </div>
                  <div style={{
                    fontSize: 14,
                    color: theme.textSec
                  }}>
                    {user.email}
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => signOut(auth)}
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: 12,
                  border: `2px solid ${theme.indicator}`,
                  color: theme.indicator,
                  background: "transparent",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 15,
                  transition: 'all 0.2s'
                }}
                className="btn-hover"
                onMouseEnter={e => e.currentTarget.style.background = `${theme.indicator}15`}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Sign Out
              </button>
              
              <div style={{
                marginTop: 24,
                padding: 16,
                background: theme.hoverBg,
                borderRadius: 12,
                fontSize: 12,
                color: theme.textSec
              }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>About Timeline</div>
                <div>Version {APP_META.version} • {APP_META.author}</div>
                <div style={{ marginTop: 4, fontStyle: 'italic' }}>"{APP_META.motto}"</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TagManager({ tags, setTags, theme, context, onClose }) {
  const [newTag, setNewTag] = useState("");
  const [selectedColor, setSelectedColor] = useState("onyx");
  const [editingTag, setEditingTag] = useState(null);
  
  const currentTags = tags[context] || [];
  
  const addTag = () => {
    if (!newTag.trim()) {
      alert("Please enter a tag name");
      return;
    }
    
    const palette = PALETTE[selectedColor];
    const id = newTag.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    
    const newTagObj = {
      id,
      name: newTag,
      icon: <ICONS.Star />,
      ...palette
    };
    
    setTags({
      ...tags,
      [context]: [...currentTags, newTagObj]
    });
    
    setNewTag("");
    setSelectedColor("onyx");
  };
  
  const updateTag = (tagId, updates) => {
    setTags({
      ...tags,
      [context]: currentTags.map(tag =>
        tag.id === tagId ? { ...tag, ...updates } : tag
      )
    });
  };
  
  const deleteTag = (tagId) => {
    if (currentTags.length <= 1) {
      alert("You must have at least one tag");
      return;
    }
    
    if (!window.confirm("Are you sure you want to delete this tag?")) {
      return;
    }
    
    setTags({
      ...tags,
      [context]: currentTags.filter(tag => tag.id !== tagId)
    });
    
    if (editingTag?.id === tagId) {
      setEditingTag(null);
    }
  };
  
  return (
    <div
      className="glass-panel fade-enter"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(8px)"
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          width: 500,
          background: theme.card,
          padding: 32,
          borderRadius: 24,
          boxShadow: theme.shadowLg,
          border: `1px solid ${theme.border}`,
          maxHeight: "80vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 28
        }}>
          <div>
            <h3 className="luxe" style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              marginBottom: 4
            }}>
              Manage Tags
            </h3>
            <div style={{
              fontSize: 13,
              color: theme.textSec,
              fontWeight: 600
            }}>
              {context === 'personal' ? 'Personal' : 'Family'} Context
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-reset btn-hover"
            style={{
              padding: 8,
              borderRadius: 10,
              background: theme.hoverBg,
              color: theme.text
            }}
            onMouseEnter={e => e.currentTarget.style.background = theme.activeBg}
            onMouseLeave={e => e.currentTarget.style.background = theme.hoverBg}
          >
            <ICONS.Close />
          </button>
        </div>
        
        {/* Create new tag */}
        <div style={{
          marginBottom: 24,
          padding: 20,
          background: theme.borderLight,
          borderRadius: 16
        }}>
          <input
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            placeholder="New tag name..."
            className="input-luxe"
            style={{
              color: theme.text,
              marginBottom: 16,
              background: theme.card,
              border: `1.5px solid ${theme.border}`
            }}
            onKeyPress={e => e.key === 'Enter' && addTag()}
          />
          
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 700,
              color: theme.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 10
            }}>
              Color Palette
            </label>
            <div style={{ display: "flex", gap: 10, flexWrap: 'wrap' }}>
              {Object.keys(PALETTE).map(key => (
                <div
                  key={key}
                  className={`color-swatch ${selectedColor === key ? 'active' : ''}`}
                  style={{
                    background: PALETTE[key].color,
                    borderColor: selectedColor === key ? theme.text : 'transparent'
                  }}
                  onClick={() => setSelectedColor(key)}
                  title={key}
                />
              ))}
            </div>
          </div>
          
          <button
            onClick={addTag}
            style={{
              width: "100%",
              padding: "14px",
              background: theme.accent,
              color: "#fff",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 14,
              boxShadow: theme.shadow,
              transition: 'all 0.2s'
            }}
            className="btn-hover"
            onMouseEnter={e => e.currentTarget.style.background = theme.accentHover}
            onMouseLeave={e => e.currentTarget.style.background = theme.accent}
          >
            Create Tag
          </button>
        </div>
        
        {/* Current tags */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <label style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 700,
            color: theme.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 12
          }}>
            Current Tags ({currentTags.length})
          </label>
          
          {currentTags.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: 40,
              color: theme.textMuted,
              fontStyle: 'italic'
            }}>
              No tags yet. Create your first one!
            </div>
          ) : (
            currentTags.map(tag => (
              <div
                key={tag.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px",
                  marginBottom: 8,
                  borderRadius: 12,
                  background: theme.hoverBg,
                  border: `1px solid ${theme.borderLight}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => setEditingTag(editingTag?.id === tag.id ? null : tag)}
                onMouseEnter={e => e.currentTarget.style.background = theme.activeBg}
                onMouseLeave={e => e.currentTarget.style.background = theme.hoverBg}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: tag.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}>
                    {tag.icon}
                  </div>
                  <div>
                    <div style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: theme.text,
                      marginBottom: 2
                    }}>
                      {tag.name}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: theme.textSec,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <div style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: tag.color
                      }} />
                      {Object.keys(PALETTE).find(key => PALETTE[key].color === tag.color) || 'Custom'}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTag(tag.id);
                    }}
                    className="btn-reset btn-hover"
                    style={{
                      color: theme.indicator,
                      padding: 8,
                      borderRadius: 8
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = `${theme.indicator}15`}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <ICONS.Trash />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EventEditor({ event, theme, tags, onSave, onDelete, onCancel, config }) {
  const [data, setData] = useState(() => {
    const now = new Date();
    const start = event?.start || new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);
    const end = event?.end || new Date(start.getTime() + 60 * 60 * 1000);
    
    return {
      title: event?.title || "",
      category: event?.category || (tags[0]?.id || ''),
      start: start,
      end: end,
      description: event?.description || "",
      location: event?.location || ""
    };
  });
  
  const [errors, setErrors] = useState({});
  
  const validate = () => {
    const newErrors = {};
    
    if (!data.title.trim()) {
      newErrors.title = "Title is required";
    }
    
    if (data.end <= data.start) {
      newErrors.time = "End time must be after start time";
    }
    
    if (!data.category) {
      newErrors.category = "Category is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const submit = () => {
    if (!validate()) return;
    
    onSave({
      ...data,
      id: event?.id
    });
  };
  
  const updateTime = (field, value) => {
    const newDate = new Date(data[field]);
    const [hours, minutes] = value.split(':').map(Number);
    
    newDate.setHours(hours, minutes);
    setData(prev => ({ ...prev, [field]: newDate }));
  };
  
  const updateDate = (field, value) => {
    const newDate = new Date(value);
    const oldDate = new Date(data[field]);
    
    newDate.setHours(oldDate.getHours(), oldDate.getMinutes());
    setData(prev => ({ ...prev, [field]: newDate }));
  };
  
  const formatTime = (date) => {
    return date.toTimeString().slice(0, 5);
  };
  
  const formatDate = (date) => {
    return date.toISOString().slice(0, 16);
  };
  
  return (
    <div
      className="glass-panel fade-enter"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(8px)"
      }}
      onClick={onCancel}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          width: 500,
          background: theme.card,
          padding: 32,
          borderRadius: 24,
          boxShadow: theme.shadowLg,
          border: `1px solid ${theme.border}`
        }}
      >
        <h3 className="luxe" style={{
          fontSize: 28,
          fontWeight: 600,
          marginBottom: 28,
          letterSpacing: '-0.02em'
        }}>
          {event?.id ? "Edit Event" : "New Event"}
        </h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Title */}
          <div>
            <input
              autoFocus
              value={data.title}
              onChange={e => setData({ ...data, title: e.target.value })}
              placeholder="Event title..."
              className="input-luxe"
              style={{
                fontSize: 18,
                fontWeight: 600,
                background: theme.bg,
                color: theme.text,
                border: `1.5px solid ${errors.title ? theme.indicator : theme.border}`,
                padding: "16px 20px"
              }}
            />
            {errors.title && (
              <div style={{
                fontSize: 12,
                color: theme.indicator,
                marginTop: 6,
                fontWeight: 600
              }}>
                {errors.title}
              </div>
            )}
          </div>
          
          {/* Date and Time */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 700,
                color: theme.textMuted,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Date
              </label>
              <input
                type="date"
                value={data.start.toISOString().slice(0, 10)}
                onChange={e => {
                  updateDate('start', e.target.value);
                  // Update end date to maintain duration
                  const duration = data.end - data.start;
                  const newEnd = new Date(new Date(e.target.value).getTime() + duration);
                  setData(prev => ({ ...prev, end: newEnd }));
                }}
                className="input-luxe"
                style={{
                  color: theme.text,
                  background: theme.bg,
                  border: `1.5px solid ${theme.border}`,
                  padding: "12px 16px"
                }}
              />
            </div>
            
            <div>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 700,
                color: theme.textMuted,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Duration
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="time"
                  value={formatTime(data.start)}
                  onChange={e => updateTime('start', e.target.value)}
                  className="input-luxe"
                  style={{
                    color: theme.text,
                    background: theme.bg,
                    border: `1.5px solid ${errors.time ? theme.indicator : theme.border}`,
                    padding: "12px 16px"
                  }}
                />
                <input
                  type="time"
                  value={formatTime(data.end)}
                  onChange={e => updateTime('end', e.target.value)}
                  className="input-luxe"
                  style={{
                    color: theme.text,
                    background: theme.bg,
                    border: `1.5px solid ${errors.time ? theme.indicator : theme.border}`,
                    padding: "12px 16px"
                  }}
                />
              </div>
              {errors.time && (
                <div style={{
                  fontSize: 12,
                  color: theme.indicator,
                  marginTop: 6,
                  fontWeight: 600
                }}>
                  {errors.time}
                </div>
              )}
            </div>
          </div>
          
          {/* Category */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 700,
              color: theme.textMuted,
              marginBottom: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Category
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {tags.map(tag => {
                const isSelected = data.category === tag.id;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setData({ ...data, category: tag.id })}
                    className="btn-reset btn-hover"
                    style={{
                      padding: "10px 16px",
                      borderRadius: 12,
                      fontSize: 13,
                      fontWeight: 600,
                      border: `2px solid ${isSelected ? tag.color : theme.border}`,
                      background: isSelected 
                        ? (config.darkMode ? tag.darkBg : tag.bg) 
                        : 'transparent',
                      color: isSelected 
                        ? (config.darkMode ? tag.colorLight : tag.text) 
                        : theme.text,
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <div style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: tag.color
                    }} />
                    {tag.name}
                  </button>
                );
              })}
            </div>
            {errors.category && (
              <div style={{
                fontSize: 12,
                color: theme.indicator,
                marginTop: 6,
                fontWeight: 600
              }}>
                {errors.category}
              </div>
            )}
          </div>
          
          {/* Location */}
          <div>
            <input
              value={data.location}
              onChange={e => setData({ ...data, location: e.target.value })}
              placeholder="📍 Location (optional)"
              className="input-luxe"
              style={{
                color: theme.text,
                background: theme.bg,
                border: `1.5px solid ${theme.border}`,
                padding: "12px 16px"
              }}
            />
          </div>
          
          {/* Description */}
          <div>
            <textarea
              value={data.description}
              onChange={e => setData({ ...data, description: e.target.value })}
              placeholder="📝 Description (optional)"
              className="input-luxe"
              style={{
                minHeight: 100,
                resize: "none",
                color: theme.text,
                background: theme.bg,
                border: `1.5px solid ${theme.border}`,
                fontFamily: 'inherit',
                padding: "12px 16px"
              }}
            />
          </div>
          
          {/* Actions */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 8,
            paddingTop: 24,
            borderTop: `1px solid ${theme.border}`
          }}>
            {onDelete ? (
              <button
                onClick={onDelete}
                className="btn-reset btn-hover"
                style={{
                  color: theme.indicator,
                  fontWeight: 700,
                  padding: '12px 20px',
                  borderRadius: 12
                }}
                onMouseEnter={e => e.currentTarget.style.background = `${theme.indicator}15`}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Delete
              </button>
            ) : (
              <div />
            )}
            
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={onCancel}
                className="btn-reset btn-hover"
                style={{
                  color: theme.textSec,
                  fontWeight: 600,
                  padding: '12px 24px',
                  borderRadius: 12,
                  border: `1px solid ${theme.border}`
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme.hoverBg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Cancel
              </button>
              <button
                onClick={submit}
                className="btn-reset btn-hover"
                style={{
                  padding: "12px 32px",
                  borderRadius: 12,
                  background: theme.accent,
                  color: "#fff",
                  fontWeight: 700,
                  boxShadow: theme.shadow,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme.accentHover}
                onMouseLeave={e => e.currentTarget.style.background = theme.accent}
              >
                {event?.id ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrashModal({ events, theme, onClose, onRestore, onDelete }) {
  const [search, setSearch] = useState("");
  
  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(search.toLowerCase()) ||
    event.description?.toLowerCase().includes(search.toLowerCase()) ||
    event.location?.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <div
      className="glass-panel fade-enter"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(8px)"
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          width: 600,
          height: "70vh",
          background: theme.card,
          borderRadius: 24,
          boxShadow: theme.shadowLg,
          border: `1px solid ${theme.border}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        {/* Header */}
        <div style={{
          padding: "28px 32px",
          borderBottom: `1px solid ${theme.border}`,
          flexShrink: 0
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20
          }}>
            <div>
              <h3 className="luxe" style={{
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                marginBottom: 4
              }}>
                Trash
              </h3>
              <div style={{
                fontSize: 13,
                color: theme.textSec,
                fontWeight: 600
              }}>
                {events.length} deleted event{events.length !== 1 ? 's' : ''}
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn-reset btn-hover"
              style={{
                padding: 10,
                borderRadius: 12,
                background: theme.hoverBg,
                color: theme.text
              }}
              onMouseEnter={e => e.currentTarget.style.background = theme.activeBg}
              onMouseLeave={e => e.currentTarget.style.background = theme.hoverBg}
            >
              <ICONS.Close />
            </button>
          </div>
          
          {/* Search */}
          <input
            type="text"
            placeholder="🔍 Search deleted events..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 12,
              border: `1px solid ${theme.border}`,
              background: theme.bg,
              color: theme.text,
              fontSize: 14,
              outline: "none"
            }}
          />
        </div>
        
        {/* Events list */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 32px"
        }}>
          {filteredEvents.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: theme.textMuted,
              padding: 60,
              fontStyle: 'italic'
            }}>
              {search ? 'No matching events found' : 'Trash is empty'}
            </div>
          ) : (
            filteredEvents.map(event => (
              <div
                key={event.id}
                style={{
                  padding: "20px",
                  marginBottom: 12,
                  borderRadius: 12,
                  background: theme.hoverBg,
                  border: `1px solid ${theme.borderLight}`,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme.activeBg}
                onMouseLeave={e => e.currentTarget.style.background = theme.hoverBg}
              >
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 12
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: 700,
                      fontSize: 16,
                      color: theme.text,
                      marginBottom: 6
                    }}>
                      {event.title}
                    </div>
                    <div style={{
                      fontSize: 13,
                      color: theme.textSec,
                      marginBottom: 4
                    }}>
                      {event.start.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })} • {event.start.toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit'
                      })} - {event.end.toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </div>
                    {event.location && (
                      <div style={{
                        fontSize: 13,
                        color: theme.textSec,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 4
                      }}>
                        <ICONS.MapPin width={12} height={12} />
                        {event.location}
                      </div>
                    )}
                    {event.description && (
                      <div style={{
                        fontSize: 13,
                        color: theme.textSec,
                        marginTop: 8,
                        lineHeight: 1.5
                      }}>
                        {event.description}
                      </div>
                    )}
                  </div>
                </div>
                
                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={() => onRestore(event.id)}
                    className="btn-hover"
                    style={{
                      padding: "10px 20px",
                      borderRadius: 10,
                      background: theme.accent,
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 700,
                      boxShadow: theme.shadow,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = theme.accentHover}
                    onMouseLeave={e => e.currentTarget.style.background = theme.accent}
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => onDelete(event.id)}
                    className="btn-hover"
                    style={{
                      padding: "10px 20px",
                      borderRadius: 10,
                      border: `2px solid ${theme.indicator}`,
                      color: theme.indicator,
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 700,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = `${theme.indicator}15`}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Delete Permanently
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function AuthScreen({ onLogin, theme }) {
  const [quoteIndex, setQuoteIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % MOTIVATIONAL_QUOTES.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div style={{
      height: "100vh",
      background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden",
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Background effects */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(circle at 50% 50%, rgba(249, 115, 22, 0.1) 0%, transparent 50%)",
        pointerEvents: "none"
      }} />
      
      <div style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        background: "linear-gradient(45deg, transparent 30%, rgba(249, 115, 22, 0.05) 50%, transparent 70%)",
        animation: "shimmer 8s infinite linear",
        pointerEvents: "none"
      }} />
      
      {/* Content */}
      <div style={{
        position: "relative",
        zIndex: 1,
        textAlign: "center",
        padding: 40,
        maxWidth: 600
      }}>
        <h1 className="luxe" style={{
          fontSize: 84,
          color: "#FAFAFA",
          marginBottom: 24,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1
        }}>
          Timeline.
        </h1>
        
        <div style={{
          height: 80,
          marginBottom: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <p className="luxe" style={{
            color: "#A3A3A3",
            fontSize: 20,
            fontStyle: "italic",
            fontWeight: 500,
            opacity: 0,
            animation: "fadeIn 1s ease forwards",
            maxWidth: 500,
            lineHeight: 1.6
          }}>
            "{MOTIVATIONAL_QUOTES[quoteIndex]}"
          </p>
        </div>
        
        <button
          onClick={onLogin}
          className="btn-hover"
          style={{
            padding: "20px 48px",
            borderRadius: 16,
            background: "#EA580C",
            color: "#fff",
            border: "none",
            fontSize: 16,
            textTransform: "uppercase",
            letterSpacing: 2,
            cursor: "pointer",
            fontWeight: 700,
            boxShadow: "0 8px 32px rgba(234, 88, 12, 0.4)",
            transition: 'all 0.3s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "#C2410C";
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 12px 40px rgba(234, 88, 12, 0.6)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "#EA580C";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 8px 32px rgba(234, 88, 12, 0.4)";
          }}
        >
          Enter Timeline
        </button>
        
        <div style={{
          marginTop: 48,
          fontSize: 12,
          color: "#64748B",
          letterSpacing: 1,
          textTransform: "uppercase",
          fontWeight: 600
        }}>
          Your Life, Beautifully Organized
        </div>
      </div>
    </div>
  );
}

// Utility function
function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}