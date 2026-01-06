import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth, provider } from "./firebase";
import { 
  collection, query, where, getDocs, addDoc, 
  updateDoc, deleteDoc, doc, serverTimestamp, Timestamp 
} from "firebase/firestore";
import { db } from "./firebase";

// ==========================================
// 1. CORE SYSTEM CONFIGURATION
// ==========================================

const APP_META = { 
  name: "Timeline", 
  version: "5.0.0-Master",
  quoteInterval: 14400000 
};

const LAYOUT = {
  SIDEBAR_WIDTH: 320,
  HEADER_HEIGHT: 84,
  PIXELS_PER_MINUTE: 2.4, 
  SNAP_MINUTES: 15,
  YEAR_COLS: 38 
};

const QUOTES = [
  "Time is the luxury you cannot buy.",
  "Design your life, or someone else will.",
  "Focus on the rhythm, not the speed.",
  "Simplicity is the ultimate sophistication.",
  "Act as if what you do makes a difference.",
  "The best way to predict the future is to create it.",
  "Order is the sanity of the mind."
];

// ==========================================
// 2. DESIGN SYSTEM & ASSETS
// ==========================================

const ICONS = {
  Settings: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.72l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
  Trash: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Plus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  ChevronLeft: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevronRight: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Close: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Calendar: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Clock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  MapPin: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Finance: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Health: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  Brain: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0-1.32 4.24 3 3 0 0 0 .34 5.58 2.5 2.5 0 0 0 2.96 3.08A2.5 2.5 0 0 0 12 21.5a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 12 4.5"/><path d="M15.5 9.5c-.5-1-.5-2-1-3"/><path d="M8.5 9.5c.5-1 .5-2 1-3"/><path d="M12 12h.01"/></svg>,
  Target: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  Users: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  TrendingUp: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  Zap: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  PieChart: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>,
  DollarSign: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Bell: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  MessageSquare: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Moon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  Sun: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  Coffee: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
  Dumbbell: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h.01"/><path d="M17.5 17.5h.01"/><path d="M20 7l-7 7 7 7"/><path d="M4 17l7-7-7-7"/><circle cx="6.5" cy="17.5" r="3.5"/><circle cx="17.5" cy="6.5" r="3.5"/></svg>,
  Book: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Heart: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/></svg>,
  Battery: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="16" height="10" rx="2" ry="2"/><line x1="22" y1="11" x2="22" y2="13"/></svg>,
  BarChart: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
  ShoppingCart: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  CreditCard: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  Google: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>,
  Microsoft: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h11.377v11.372H0zM12.623 0H24v11.372H12.623zM0 12.623h11.377V24H0zM12.623 12.623H24V24H12.623z"/></svg>
};

const PALETTE = {
  onyx: { bg: "#27272a", text: "#f4f4f5", border: "#52525b", color: "#27272a", darkBg: "#18181b" },
  ceramic: { bg: "#f5f5f4", text: "#44403c", border: "#d6d3d1", color: "#f5f5f4", darkBg: "#292524" },
  gold: { bg: "#fffbeb", text: "#92400e", border: "#fcd34d", color: "#fffbeb", darkBg: "#78350f" },
  emerald: { bg: "#ecfdf5", text: "#065f46", border: "#6ee7b7", color: "#ecfdf5", darkBg: "#064e3b" },
  rose: { bg: "#fff1f2", text: "#9f1239", border: "#fda4af", color: "#fff1f2", darkBg: "#881337" },
  midnight: { bg: "#eff6ff", text: "#1e3a8a", border: "#93c5fd", color: "#eff6ff", darkBg: "#1e3a8a" },
  lavender: { bg: "#fdf4ff", text: "#86198f", border: "#f0abfc", color: "#fdf4ff", darkBg: "#86198f" },
  clay: { bg: "#fff7ed", text: "#9a3412", border: "#fdba74", color: "#fff7ed", darkBg: "#7c2d12" },
  teal: { bg: "#f0fdfa", text: "#0f766e", border: "#5eead4", color: "#f0fdfa", darkBg: "#134e4a" },
  violet: { bg: "#f5f3ff", text: "#6d28d9", border: "#c4b5fd", color: "#f5f3ff", darkBg: "#4c1d95" }
};

const THEMES = {
  light: {
    id: 'light',
    bg: "#FAFAF9", 
    sidebar: "#F5F5F4", 
    card: "#FFFFFF",
    text: "#1C1917", 
    textSec: "#57534E",
    textMuted: "#A8A29E",
    border: "#E7E5E4",
    accent: "#D97706", 
    familyAccent: "#059669", 
    selection: "#FDE68A",
    shadow: "0 12px 32px -4px rgba(28, 25, 23, 0.08)",
    glass: "rgba(255, 255, 255, 0.9)",
    indicator: "#BE123C", 
    manifestoLine: "#D6D3D1",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#3B82F6"
  },
  dark: {
    id: 'dark',
    bg: "#0B0E11", 
    sidebar: "#111418",
    card: "#181B21",
    text: "#F5F5F4",
    textSec: "#A8A29E",
    textMuted: "#57534E",
    border: "#292524",
    accent: "#3B82F6", 
    familyAccent: "#10B981",
    selection: "#1E3A8A",
    shadow: "0 24px 48px -12px rgba(0, 0, 0, 0.8)",
    glass: "rgba(11, 14, 17, 0.85)",
    indicator: "#F43F5E",
    manifestoLine: "#292524",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#3B82F6"
  }
};

const DEFAULT_TAGS = [
  { id: 'work',    name: "Business", ...PALETTE.onyx },
  { id: 'project', name: "Project", ...PALETTE.emerald },
  { id: 'deadline',name: "Deadline", ...PALETTE.rose },
  { id: 'personal',name: "Personal", ...PALETTE.midnight },
  { id: 'travel',  name: "Travel", ...PALETTE.clay },
  { id: 'health',  name: "Health", ...PALETTE.teal }
];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap');
  :root { --ease: cubic-bezier(0.22, 1, 0.36, 1); }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
  body { font-family: 'Inter', sans-serif; overflow: hidden; transition: background 0.4s var(--ease); }
  h1, h2, h3, .serif { font-family: 'Playfair Display', serif; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(120, 113, 108, 0.2); border-radius: 10px; }
  .fade-enter { animation: fadeIn 0.5s var(--ease) forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .pulse-dot { animation: pulse 3s infinite; }
  @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.4); } 70% { box-shadow: 0 0 0 8px rgba(217, 119, 6, 0); } 100% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0); } }
  .glass-panel { backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
  .past-event { filter: grayscale(1) opacity(0.5); transition: 0.3s; pointer-events: none; }
  .btn-reset { border: none; background: transparent; cursor: pointer; color: inherit; font-family: inherit; display: flex; align-items: center; justify-content: center; }
  .btn-hover:hover { transform: translateY(-1px); transition: transform 0.2s; }
  .tab-pill { padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; transition: 0.3s var(--ease); }
  .tab-pill.active { font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
  .input-luxe { width: 100%; padding: 14px 16px; border-radius: 8px; font-size: 15px; transition: 0.2s; border: 1px solid transparent; background: rgba(0,0,0,0.03); }
  .input-luxe:focus { outline: none; background: rgba(0,0,0,0.05); box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.2); }
  
  /* Mini Calendar */
  .mini-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; margin-top: 12px; }
  .mini-cal-day { font-size: 12px; padding: 8px 0; border-radius: 6px; cursor: pointer; transition: 0.2s; color: inherit; opacity: 0.8; font-weight: 500; }
  .mini-cal-day:hover { background: rgba(0,0,0,0.05); opacity: 1; }
  .mini-cal-day.active { background: #D97706; color: #fff; font-weight: 600; opacity: 1; }
  
  /* Color Swatches */
  .color-swatch { width: 24px; height: 24px; border-radius: 50%; cursor: pointer; transition: transform 0.2s; border: 2px solid transparent; }
  .color-swatch:hover { transform: scale(1.1); }
  .color-swatch.active { border-color: #1C1917; }
  
  /* Day View Journal Card */
  .event-card-journal { transition: all 0.3s var(--ease); border-left-width: 3px; border-left-style: solid; }
  .event-card-journal:hover { transform: translateX(4px); box-shadow: 0 4px 20px rgba(0,0,0,0.05); }

  /* Roadmap Modules */
  .life-module { padding: 16px; border-radius: 12px; background: rgba(0,0,0,0.02); margin-bottom: 16px; border: 1px solid rgba(0,0,0,0.05); }
  .progress-bar { height: 6px; border-radius: 3px; background: rgba(0,0,0,0.1); overflow: hidden; margin-top: 8px; }
  .progress-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }

  /* Settings UI */
  .settings-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .settings-label { font-size: 14px; font-weight: 500; }
  .settings-sub { font-size: 12px; opacity: 0.6; margin-top: 2px; }
  
  /* Segmented Control - Fixed */
  .segmented { display: flex; background: rgba(0,0,0,0.05); padding: 3px; border-radius: 8px; width: 100%; }
  .seg-opt { flex: 1; text-align: center; padding: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 6px; color: inherit; opacity: 0.6; transition: 0.2s; }
  .seg-opt.active { background: #fff; opacity: 1; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.08); color: #000; }
  .dark .seg-opt.active { background: #3B82F6; color: #fff; }

  /* Switch */
  .switch-track { width: 44px; height: 24px; border-radius: 12px; background: rgba(0,0,0,0.1); position: relative; cursor: pointer; transition: 0.3s; }
  .switch-track.active { background: #3B82F6; }
  .switch-thumb { width: 20px; height: 20px; border-radius: 50%; background: #fff; position: absolute; top: 2px; left: 2px; transition: 0.3s var(--ease); box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
  .switch-track.active .switch-thumb { transform: translateX(20px); }
`;

// ==========================================
// 3. MAIN APPLICATION KERNEL
// ==========================================

export default function TimelineOS() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [viewMode, setViewMode] = useState("year");
  const [context, setContext] = useState("personal");
  const [events, setEvents] = useState([]);
  const [deletedEvents, setDeletedEvents] = useState([]);
  const [tags, setTags] = useState(() => JSON.parse(localStorage.getItem('timeline_tags_v2')) || DEFAULT_TAGS);
  const [activeTagIds, setActiveTagIds] = useState(tags.map(t => t.id));
  const [quote, setQuote] = useState(QUOTES[0]);
  
  // Roadmap: Phase 3 & 4 Data
  const [habits, setHabits] = useState([ { id: 1, name: "Workout", streak: 12 }, { id: 2, name: "Reading", streak: 5 } ]);
  const [budget, setBudget] = useState({ spent: 1240, limit: 3000 });

  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  const [config, setConfig] = useState(() => JSON.parse(localStorage.getItem('timeline_v4_cfg')) || {
    darkMode: true, use24Hour: false, blurPast: true, weekStartMon: true, googleSync: false, outlookSync: false
  });

  const scrollRef = useRef(null);
  const theme = config.darkMode ? THEMES.dark : THEMES.light;

  useEffect(() => {
    const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    const i = setInterval(() => setNow(new Date()), 60000);
    const qI = setInterval(() => setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]), APP_META.quoteInterval);
    return () => { s.remove(); clearInterval(i); clearInterval(qI); };
  }, []);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence);
    return auth.onAuthStateChanged(u => { setUser(u); if(u) loadData(u); else setLoading(false); });
  }, []);

  useEffect(() => localStorage.setItem('timeline_v4_cfg', JSON.stringify(config)), [config]);
  useEffect(() => localStorage.setItem('timeline_tags_v2', JSON.stringify(tags)), [tags]);

  // Scroll logic
  useEffect(() => {
    if ((viewMode === 'day' || viewMode === 'week') && scrollRef.current) {
      scrollRef.current.scrollTop = 6 * 60 * LAYOUT.PIXELS_PER_MINUTE;
    }
  }, [viewMode]);

  const loadData = async (u) => {
    setLoading(true);
    try {
      const q = query(collection(db, "events"), where("uid", "==", u.uid));
      const snap = await getDocs(q);
      const all = snap.docs.map(d => ({ id: d.id, ...d.data(), start: d.data().startTime.toDate(), end: d.data().endTime.toDate() }));
      setEvents(all.filter(e => !e.deleted));
      setDeletedEvents(all.filter(e => e.deleted));
    } catch(e) { notify("Sync failed.", "error"); }
    setLoading(false);
  };
  
  // Demo Data Injection
  const loadDemoData = async () => {
    if(!user) return;
    setLoading(true);
    const demoEvents = [
       { title: "Annual Planning", start: new Date(new Date().setHours(9,0,0,0)), end: new Date(new Date().setHours(12,0,0,0)), category: 'work', description: "Strategic planning for the year." },
       { title: "Project Alpha Launch", start: new Date(new Date().setDate(new Date().getDate()+2)), end: new Date(new Date().setDate(new Date().getDate()+2)), category: 'project', isAllDay: true },
       { title: "Health Checkup", start: new Date(new Date().setHours(14,0,0,0)), end: new Date(new Date().setHours(15,0,0,0)), category: 'health' },
       { title: "Hackathon", start: new Date(new Date().setDate(new Date().getDate()+5)), end: new Date(new Date().setDate(new Date().getDate()+7)), category: 'work', isAllDay: true }
    ];
    
    for (const ev of demoEvents) {
        await addDoc(collection(db, "events"), {
            uid: user.uid, ...ev, startTime: Timestamp.fromDate(ev.start), endTime: Timestamp.fromDate(ev.end), 
            deleted: false, context: 'personal', createdAt: serverTimestamp()
        });
    }
    loadData(user);
    notify("Demo data loaded.", "success");
  };

  const handleSave = async (data) => {
    if(!user) return;
    try {
      const payload = {
        uid: user.uid, title: data.title, category: data.category, context: context, description: data.description || "", location: data.location || "",
        startTime: Timestamp.fromDate(data.start), endTime: Timestamp.fromDate(data.end), deleted: false, updatedAt: serverTimestamp()
      };
      if(data.id) await updateDoc(doc(db, "events", data.id), payload);
      else { payload.createdAt = serverTimestamp(); await addDoc(collection(db, "events"), payload); }
      setModalOpen(false); loadData(user); notify("Event saved.");
    } catch(e) { notify("Save failed.", "error"); }
  };

  const softDelete = async (id) => {
    if(!window.confirm("Move to trash?")) return;
    try { await updateDoc(doc(db, "events", id), { deleted: true, deletedAt: serverTimestamp() }); setModalOpen(false); loadData(user); notify("Moved to trash."); } 
    catch(e) { notify("Delete failed.", "error"); }
  };

  const restoreEvent = async (id) => {
    try { await updateDoc(doc(db, "events", id), { deleted: false }); loadData(user); notify("Event restored."); } catch(e) {}
  };

  const hardDelete = async (id) => {
    if(!window.confirm("Permanently destroy?")) return;
    try { await deleteDoc(doc(db, "events", id)); loadData(user); notify("Permanently deleted."); } catch(e) {}
  };

  const notify = (msg, type='neutral') => {
    const id = Date.now();
    setNotifications(p => [...p, {id, msg, type}]);
    setTimeout(() => setNotifications(p => p.filter(n => n.id !== id)), 4000);
  };

  const filteredEvents = useMemo(() => events.filter(e => e.context === context && activeTagIds.includes(e.category)), [events, context, activeTagIds]);
  const nav = (amt) => {
    const d = new Date(currentDate);
    if(viewMode === 'year') d.setFullYear(d.getFullYear() + amt);
    else if(viewMode === 'week') d.setDate(d.getDate() + (amt*7));
    else if(viewMode === 'month') d.setMonth(d.getMonth() + amt);
    else d.setDate(d.getDate() + amt);
    setCurrentDate(d);
  };

  if (!user) return <AuthScreen onLogin={() => signInWithPopup(auth, provider)} theme={theme} />;

  return (
    <div style={{ display: "flex", height: "100vh", background: theme.bg, color: theme.text }} className={config.darkMode ? 'dark' : 'light'}>
      
      {/* SIDEBAR */}
      <aside style={{ width: LAYOUT.SIDEBAR_WIDTH, background: theme.sidebar, borderRight: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", padding: "28px 24px", zIndex: 50, overflowY: "auto" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 className="serif" style={{ fontSize: 32, fontWeight: 700, color: theme.text, letterSpacing: "-0.5px" }}>Timeline.</h1>
          <div style={{ fontSize: 13, color: theme.textSec, marginTop: 4 }}>Welcome back, <span style={{fontWeight:600}}>{user.displayName?.split(" ")[0]}</span></div>
        </div>

        <div style={{ display: "flex", background: "rgba(0,0,0,0.04)", padding: 4, borderRadius: 12, marginBottom: 24 }}>
          <button onClick={() => setContext('personal')} className={`btn-reset tab-pill ${context==='personal'?'active':''}`} style={{ flex: 1, background: context==='personal' ? theme.card : 'transparent', color: context==='personal' ? theme.accent : theme.textSec }}>Personal</button>
          <button onClick={() => setContext('family')} className={`btn-reset tab-pill ${context==='family'?'active':''}`} style={{ flex: 1, background: context==='family' ? theme.card : 'transparent', color: context==='family' ? theme.familyAccent : theme.textSec }}>Family</button>
        </div>

        <button onClick={() => { setEditingEvent(null); setModalOpen(true); }} className="btn-reset btn-hover" style={{ width: "100%", padding: "14px", borderRadius: 12, background: context==='family' ? theme.familyAccent : theme.accent, color: "#fff", fontSize: 14, fontWeight: 600, boxShadow: theme.shadow, marginBottom: 24, gap: 8 }}>
          <ICONS.Plus /> New Event
        </button>

        {/* Mini Calendar */}
        <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${theme.border}` }}>
           <MiniCalendar currentDate={currentDate} setCurrentDate={setCurrentDate} theme={theme} />
        </div>

        {/* Life Modules */}
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Life OS</h4>
          
          <div className="life-module">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              <span style={{display:'flex', gap:6, alignItems:'center'}}><ICONS.Health /> Habits</span>
              <span style={{color: theme.accent}}>High Perf</span>
            </div>
            {habits.map(h => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4, color: theme.textSec }}>
                <span>{h.name}</span>
                <span>{h.streak} day streak</span>
              </div>
            ))}
          </div>

          <div className="life-module">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
              <span style={{display:'flex', gap:6, alignItems:'center'}}><ICONS.Finance /> Monthly Budget</span>
              <span>{Math.round((budget.spent/budget.limit)*100)}%</span>
            </div>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${(budget.spent/budget.limit)*100}%`, background: theme.familyAccent }} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 4, color: theme.textMuted }}>
              <span>${budget.spent} spent</span>
              <span>${budget.limit} limit</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
             <h4 style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Tags</h4>
             <button onClick={() => setTagManagerOpen(true)} className="btn-reset btn-hover" style={{ color: theme.textSec }}><ICONS.Settings /></button>
          </div>
          {tags.map(t => (
            <div key={t.id} onClick={() => setActiveTagIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
              className="btn-hover"
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", cursor: "pointer", opacity: activeTagIds.includes(t.id) ? 1 : 0.5 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: theme.id === 'dark' ? t.color : t.text }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</span>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between" }}>
          <button onClick={() => setTrashOpen(true)} className="btn-reset btn-hover" style={{ color: theme.textSec, fontSize: 14, gap: 8 }}>
            <ICONS.Trash /> Trash
          </button>
          <button onClick={() => setSettingsOpen(true)} className="btn-reset btn-hover" style={{ color: theme.textSec, fontSize: 14, gap: 8 }}>
            <ICONS.Settings /> Preferences
          </button>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        
        {/* Header */}
        <header style={{ height: LAYOUT.HEADER_HEIGHT, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", borderBottom: `1px solid ${theme.border}`, background: theme.bg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <h2 className="serif" style={{ fontSize: 32, fontWeight: 500 }}>{viewMode === 'year' ? currentDate.getFullYear() : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => nav(-1)} className="btn-reset btn-hover" style={{ width: 36, height: 36, borderRadius: 18, border: `1px solid ${theme.border}` }}><ICONS.ChevronLeft/></button>
              <button onClick={() => setCurrentDate(new Date())} className="btn-reset btn-hover" style={{ padding: "0 20px", height: 36, borderRadius: 18, border: `1px solid ${theme.border}`, fontSize: 13, fontWeight: 500 }}>Today</button>
              <button onClick={() => nav(1)} className="btn-reset btn-hover" style={{ width: 36, height: 36, borderRadius: 18, border: `1px solid ${theme.border}` }}><ICONS.ChevronRight/></button>
            </div>
          </div>
          <div style={{ display: "flex", background: theme.sidebar, padding: 4, borderRadius: 12 }}>
            {['day', 'week', 'month', 'year'].map(m => (
              <button key={m} onClick={() => setViewMode(m)} className={`btn-reset tab-pill ${viewMode===m?'active':''}`} style={{ background: viewMode===m ? theme.card : 'transparent', color: viewMode===m ? theme.text : theme.textMuted, textTransform: "capitalize" }}>{m}</button>
            ))}
          </div>
        </header>

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          
          {/* DAY VIEW */}
          {viewMode === 'day' && (
            <div className="fade-enter" style={{ padding: "40px 80px", maxWidth: 900, margin: "0 auto" }}>
              <div style={{ marginBottom: 60 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.accent, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>{currentDate.toLocaleDateString('en-US', {weekday:'long'})}</div>
                <h1 className="serif" style={{ fontSize: 64, fontWeight: 500, color: theme.text }}>{currentDate.toDateString() === now.toDateString() ? "Today's Agenda" : currentDate.toLocaleDateString('en-US', {month:'long', day:'numeric'})}</h1>
              </div>
              <div style={{ position: "relative", borderLeft: `1px solid ${theme.manifestoLine}`, paddingLeft: 40 }}>
                {Array.from({length: 24}).map((_, h) => {
                  if (h < 5) return null;
                  const slotEvents = filteredEvents.filter(e => e.start.toDateString() === currentDate.toDateString() && e.start.getHours() === h);
                  return (
                    <div key={h} style={{ minHeight: 90, position: "relative", marginBottom: 20 }}>
                      <div className="serif" style={{ position: "absolute", left: -100, top: -8, fontSize: 18, color: theme.textMuted, width: 50, textAlign: "right" }}>{config.use24Hour ? h : (h % 12 || 12) + (h<12?' AM':' PM')}</div>
                      <div style={{ position: "absolute", left: -46, top: 4, width: 11, height: 11, borderRadius: "50%", background: theme.bg, border: `2px solid ${theme.textSec}` }} />
                      <div>
                        {slotEvents.map(ev => {
                          const tag = tags.find(t => t.id === ev.category) || tags[0];
                          const isPast = config.blurPast && ev.end < now;
                          return (
                            <div key={ev.id} onClick={() => { setEditingEvent(ev); setModalOpen(true); }} className={`event-card-journal ${isPast ? 'past-event' : ''}`} style={{ marginBottom: 16, cursor: "pointer", background: config.darkMode ? tag.darkBg : tag.bg, borderLeftColor: tag.color, padding: "20px 24px", borderRadius: 12 }}>
                              <div style={{ fontSize: 22, fontWeight: 500, color: theme.text, fontFamily: 'Playfair Display', marginBottom: 4 }}>{ev.title}</div>
                              <div style={{ display: "flex", gap: 16, fontSize: 13, color: theme.textSec, alignItems: "center" }}>
                                <span style={{display:'flex', alignItems:'center', gap:6}}><ICONS.Clock/> {ev.start.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})} — {ev.end.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}</span>
                                {ev.location && <span style={{display:'flex', alignItems:'center', gap:6}}><ICONS.MapPin/> {ev.location}</span>}
                              </div>
                            </div>
                          );
                        })}
                        {slotEvents.length === 0 && <div style={{ height: 60, cursor: "pointer" }} onClick={() => { const s = new Date(currentDate); s.setHours(h,0,0,0); setEditingEvent({ start: s, end: new Date(s.getTime()+3600000), title: "", category: tags[0].id }); setModalOpen(true); }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* YEAR VIEW */}
          {viewMode === 'year' && (
            <div className="fade-enter" style={{ padding: "40px", overflowX: "auto" }}>
              <div style={{ minWidth: 1200 }}>
                <div style={{ display: "flex", marginLeft: 100, marginBottom: 16 }}>
                  {Array.from({length: LAYOUT.YEAR_COLS}).map((_,i) => (
                    <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: 700, color: theme.textMuted }}>{(config.weekStartMon ? ["M","T","W","T","F","S","S"] : ["S","M","T","W","T","F","S"])[i%7]}</div>
                  ))}
                </div>
                {Array.from({length: 12}).map((_, m) => {
                  const monthStart = new Date(currentDate.getFullYear(), m, 1);
                  const daysInMonth = new Date(currentDate.getFullYear(), m+1, 0).getDate();
                  let offset = monthStart.getDay(); if(config.weekStartMon) offset = offset===0 ? 6 : offset-1;
                  return (
                    <div key={m} style={{ display: "flex", alignItems: "center", marginBottom: 8, height: 36 }}>
                      <div className="serif" style={{ width: 100, fontSize: 14, fontWeight: 600, color: theme.textSec }}>{monthStart.toLocaleDateString('en-US',{month:'short'})}</div>
                      <div style={{ flex: 1, display: "flex", gap: 2 }}>
                        {Array.from({length: LAYOUT.YEAR_COLS}).map((_, col) => {
                          const dayNum = col - offset + 1;
                          if(dayNum < 1 || dayNum > daysInMonth) return <div key={col} style={{ flex: 1 }} />;
                          const d = new Date(currentDate.getFullYear(), m, dayNum);
                          const isT = d.toDateString() === now.toDateString();
                          const hasEv = events.some(e => e.start.toDateString() === d.toDateString() && e.context === context);
                          return (
                            <div key={col} onClick={() => { setCurrentDate(d); setViewMode('day'); }}
                              style={{ 
                                flex: 1, height: 32, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, cursor: "pointer",
                                background: isT ? theme.accent : hasEv ? (config.darkMode ? "#1F2937" : "#E5E7EB") : "transparent",
                                color: isT ? "#fff" : hasEv ? (config.darkMode ? "#93C5FD" : "#1E40AF") : theme.text,
                                border: isT ? `1px solid ${theme.accent}` : "none", fontWeight: isT ? 700 : 400
                              }}>{dayNum}</div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WEEK VIEW - FIXED ALIGNMENT */}
          {viewMode === 'week' && <WeekView currentDate={currentDate} events={filteredEvents} theme={theme} config={config} tags={tags} onNew={(s,e) => { setEditingEvent({start:s, end:e, title:"", category: tags[0].id}); setModalOpen(true); }} />}
          
          {/* MONTH VIEW */}
          {viewMode === 'month' && <MonthView currentDate={currentDate} events={filteredEvents} theme={theme} config={config} setCurrentDate={setCurrentDate} setViewMode={setViewMode} />}
        </div>
      </div>

      {/* MODALS */}
      {settingsOpen && <SettingsModal config={config} setConfig={setConfig} theme={theme} onClose={() => setSettingsOpen(false)} onLoadDemo={loadDemoData} />}
      {modalOpen && <EventEditor event={editingEvent} theme={theme} tags={tags} onSave={handleSave} onDelete={editingEvent?.id ? () => softDelete(editingEvent.id) : null} onCancel={() => setModalOpen(false)} />}
      {trashOpen && <TrashModal events={deletedEvents} theme={theme} onClose={() => setTrashOpen(false)} onRestore={(id) => restoreEvent(id)} onDelete={(id) => hardDelete(id)} />}
      {tagManagerOpen && <TagManager tags={tags} setTags={setTags} theme={theme} onClose={() => setTagManagerOpen(false)} />}

      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, display: "flex", flexDirection: "column", gap: 10 }}>{notifications.map(n => (<div key={n.id} className="fade-enter" style={{ padding: "12px 24px", background: n.type==='error' ? theme.indicator : theme.card, color: n.type==='error' ? '#fff' : theme.text, borderRadius: 8, boxShadow: "0 10px 40px rgba(0,0,0,0.2)", fontSize: 13, fontWeight: 600 }}>{n.msg}</div>))}</div>
      
      {/* Footer Links (Auth) */}
      {!user && <div style={{position:'fixed', bottom:20, width:'100%', textAlign:'center', color: theme.textMuted, fontSize: 12, opacity: 0.6}}>
         <span style={{margin:'0 10px'}}>Privacy Policy</span> • <span style={{margin:'0 10px'}}>Terms</span> • <span style={{margin:'0 10px'}}>Commercial Act</span>
      </div>}
    </div>
  );
}

// ==========================================
// 4. SUB-COMPONENTS & UTILS
// ==========================================

function MiniCalendar({ currentDate, setCurrentDate, theme }) {
  const days = ["S","M","T","W","T","F","S"];
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const startDay = startOfMonth.getDay();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const today = new Date();

  return (
    <div>
      <div className="mini-cal-header" style={{color: theme.text}}>
        <span>{currentDate.toLocaleDateString('en-US', {month:'long', year:'numeric'})}</span>
        <div style={{display:'flex', gap:4}}>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()-1, 1))} className="btn-reset" style={{color: theme.textSec}}><ICONS.ChevronLeft/></button>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 1))} className="btn-reset" style={{color: theme.textSec}}><ICONS.ChevronRight/></button>
        </div>
      </div>
      <div className="mini-cal-grid">
        {days.map(d => <div key={d} style={{fontSize:10, color:theme.textMuted}}>{d}</div>)}
        {Array.from({length:startDay}).map((_,i) => <div key={`e-${i}`} />)}
        {Array.from({length:daysInMonth}).map((_,i) => {
          const day = i+1;
          const isToday = today.getDate() === day && today.getMonth() === currentDate.getMonth();
          const isSelected = currentDate.getDate() === day;
          return (
            <div key={day} className={`mini-cal-day ${isSelected?'active':''} ${isToday?'today':''}`} onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}>
              {day}
            </div>
          )
        })}
      </div>
    </div>
  );
}

function WeekView({ currentDate, events, theme, config, tags, onNew }) {
  const days = useMemo(() => {
    const s = new Date(currentDate);
    const day = s.getDay();
    const diff = s.getDate() - day + (config.weekStartMon ? (day === 0 ? -6 : 1) : 0);
    return Array.from({length:7}, (_,i) => { const d = new Date(s); d.setDate(diff + i); return d; });
  }, [currentDate, config.weekStartMon]);

  // Precise Grid Alignment (height 60px per hour)
  const HOUR_HEIGHT = 60 * LAYOUT.PIXELS_PER_MINUTE;

  return (
    <div style={{ display: "flex", minHeight: "100%" }}>
      <div style={{ width: 60, flexShrink: 0, borderRight: `1px solid ${theme.border}`, background: theme.bg }}>
        {Array.from({length:24}).map((_,h) => (
          <div key={h} style={{ height: HOUR_HEIGHT, position:"relative" }}>
            <span style={{ position:"absolute", top:-6, right:8, fontSize:11, color:theme.textMuted }}>{h}:00</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, display: "flex" }}>
        {days.map((d, i) => {
          const isT = d.toDateString() === new Date().toDateString();
          const dEvents = events.filter(e => e.start.toDateString() === d.toDateString());
          return (
            <div key={i} style={{ flex: 1, borderRight: `1px solid ${theme.border}`, position: "relative", background: isT ? (config.darkMode ? "#1C1917" : "#FAFAFA") : "transparent" }}>
              <div style={{ height: 60, borderBottom: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "sticky", top: 0, background: theme.sidebar, zIndex: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: isT ? theme.accent : theme.textMuted }}>{d.toLocaleDateString('en-US',{weekday:'short'})}</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: isT ? theme.accent : theme.text }}>{d.getDate()}</span>
              </div>
              <div style={{ position: "relative", height: 24 * HOUR_HEIGHT }}>
                {Array.from({length:24}).map((_,h) => <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: `1px solid ${theme.border}40`, boxSizing: "border-box" }} />)}
                <div style={{position:"absolute", inset:0, zIndex:1}} onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const m = Math.floor(y / LAYOUT.PIXELS_PER_MINUTE / 15) * 15;
                  const s = new Date(d); s.setHours(0, m, 0, 0);
                  const end = new Date(s); end.setMinutes(m+60);
                  onNew(s, end);
                }} />
                {dEvents.map(ev => {
                  const top = (ev.start.getHours()*60 + ev.start.getMinutes()) * LAYOUT.PIXELS_PER_MINUTE;
                  const h = Math.max(((ev.end - ev.start)/60000) * LAYOUT.PIXELS_PER_MINUTE, 24);
                  const tag = tags.find(t => t.id === ev.category) || tags[0];
                  return (
                    <div key={ev.id} className="btn-hover" style={{ position: "absolute", top, height: h, left: 4, right: 4, background: config.darkMode ? tag.darkBg : tag.bg, borderLeft: `3px solid ${tag.color}`, borderRadius: 4, padding: 4, fontSize: 11, color: theme.text, cursor: "pointer", zIndex: 5, overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                      <div style={{ fontWeight: 600 }}>{ev.title}</div>
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

function MonthView({ currentDate, events, theme, config, setCurrentDate, setViewMode }) {
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const startDay = startOfMonth.getDay();
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const offset = config.weekStartMon ? (startDay === 0 ? 6 : startDay - 1) : startDay;

  return (
    <div className="fade-enter" style={{ padding: 40, height: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', height: '100%', gap: 8 }}>
        {(config.weekStartMon ? ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]).map(d => (
          <div key={d} style={{ textAlign: 'center', fontWeight: 600, color: theme.textMuted, paddingBottom: 10 }}>{d}</div>
        ))}
        {Array.from({length: offset}).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({length: daysInMonth}).map((_, i) => {
          const day = i + 1;
          const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const dayEvents = events.filter(e => e.start.toDateString() === d.toDateString());
          const isToday = d.toDateString() === new Date().toDateString();
          
          return (
            <div key={day} onClick={() => { setCurrentDate(d); setViewMode('day'); }} 
              style={{ border: `1px solid ${theme.border}`, borderRadius: 8, padding: 8, minHeight: 100, cursor: 'pointer', background: isToday ? (config.darkMode ? '#1C1917' : '#FAFAFA') : 'transparent' }}
              className="btn-hover">
              <div style={{ fontWeight: isToday ? 700 : 500, color: isToday ? theme.accent : theme.text, marginBottom: 4 }}>{day}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {dayEvents.slice(0,3).map(ev => (
                  <div key={ev.id} style={{ fontSize: 10, padding: "2px 4px", borderRadius: 3, background: config.darkMode ? "#292524" : "#E7E5E4", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && <div style={{ fontSize: 10, color: theme.textMuted }}>+{dayEvents.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingsModal({ config, setConfig, theme, onClose, onLoadDemo }) {
  return (
    <div className="glass-panel fade-enter" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 400, background: theme.card, padding: 24, borderRadius: 20, boxShadow: theme.shadow }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <h3 className="serif" style={{ fontSize: 20 }}>Settings</h3>
          <button onClick={onClose} className="btn-reset"><ICONS.Close/></button>
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Theme</label>
          <div className={`segmented ${!config.darkMode ? 'light-mode' : ''}`}>
            <div onClick={() => setConfig({...config, darkMode: false})} className={`seg-opt ${!config.darkMode?'active':''}`}>☀ Light</div>
            <div onClick={() => setConfig({...config, darkMode: true})} className={`seg-opt ${config.darkMode?'active':''}`}>☾ Dark</div>
          </div>
        </div>
        <div className="settings-row" style={{marginBottom: 24}}>
           <div><div className="settings-label">Blur Past Dates</div><div className="settings-sub">Fade old days</div></div>
           <div className={`switch-track ${config.blurPast?'active':''}`} onClick={() => setConfig({...config, blurPast:!config.blurPast})}><div className="switch-thumb"/></div>
        </div>
        <div className="settings-row" style={{marginBottom: 24}}>
           <div><div className="settings-label">Sync Google Calendar</div><div className="settings-sub">View only</div></div>
           <div className={`switch-track ${config.googleSync?'active':''}`} onClick={() => setConfig({...config, googleSync:!config.googleSync})}><div className="switch-thumb"/></div>
        </div>
        <div style={{ marginBottom: 32 }}>
           <button onClick={onLoadDemo} className="btn-reset" style={{width:'100%', padding:'12px', border:`1px solid ${theme.border}`, borderRadius:8, fontSize:13}}>Load Demo Data</button>
        </div>
        <button onClick={() => signOut(auth)} style={{ width: "100%", padding: "12px", borderRadius: 8, border: `1px solid ${theme.indicator}`, color: theme.indicator, background: "transparent", fontWeight: 600, cursor: "pointer" }}>Sign Out</button>
      </div>
    </div>
  );
}

function TagManager({ tags, setTags, theme, onClose }) {
  const [newTag, setNewTag] = useState("");
  const [color, setColor] = useState("onyx");

  const addTag = () => {
    if(!newTag.trim()) return;
    const palette = PALETTE[color];
    const id = newTag.toLowerCase().replace(/\s+/g,'-') + Date.now();
    setTags([...tags, { id, name: newTag, ...palette }]);
    setNewTag("");
  };

  return (
    <div className="glass-panel fade-enter" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 400, background: theme.card, padding: 24, borderRadius: 20, boxShadow: theme.shadow }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <h3 className="serif" style={{ fontSize: 20 }}>Manage Tags</h3>
          <button onClick={onClose} className="btn-reset"><ICONS.Close/></button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Tag name..." className="input-luxe" style={{ color: theme.text, marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {Object.keys(PALETTE).map(key => (
              <div key={key} className={`color-swatch ${color === key ? 'active' : ''}`} style={{ background: PALETTE[key].bg, borderColor: PALETTE[key].border }} onClick={() => setColor(key)} />
            ))}
          </div>
          <button onClick={addTag} style={{ width: "100%", padding: "12px", background: theme.accent, color: "#fff", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Create Tag</button>
        </div>
        <div style={{ maxHeight: 300, overflowY: "auto" }}>
          {tags.map((t, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${theme.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: t.color || t.text }} />
                <span>{t.name}</span>
              </div>
              <button onClick={() => setTags(tags.filter(tg => tg.id !== t.id))} className="btn-reset" style={{ color: theme.indicator }}><ICONS.Trash/></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EventEditor({ event, theme, tags, onSave, onDelete, onCancel }) {
  const [data, setData] = useState({ 
    title: event?.title || "", category: event?.category || tags[0].id,
    start: event?.start ? event.start.toTimeString().slice(0,5) : "09:00",
    end: event?.end ? event.end.toTimeString().slice(0,5) : "10:00",
    description: event?.description || "", location: event?.location || ""
  });

  const submit = () => {
    const s = new Date(event?.start || new Date()); const [sh, sm] = data.start.split(':'); s.setHours(sh, sm);
    const e = new Date(s); const [eh, em] = data.end.split(':'); e.setHours(eh, em);
    onSave({ ...data, id: event?.id, start: s, end: e });
  };

  return (
    <div onClick={e => e.stopPropagation()} style={{ width: 440, background: theme.card, padding: 32, borderRadius: 24, boxShadow: theme.shadow }}>
      <h3 className="serif" style={{ fontSize: 24, marginBottom: 24 }}>{event?.id ? "Edit Event" : "Create Event"}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <input autoFocus value={data.title} onChange={e => setData({...data, title: e.target.value})} placeholder="Title" className="input-luxe" style={{ fontSize: 18, fontWeight: 600, background: theme.bg, color: theme.text }} />
        <div style={{ display: "flex", gap: 12 }}>
          <input type="time" value={data.start} onChange={e => setData({...data, start: e.target.value})} className="input-luxe" style={{ color: theme.text }} />
          <input type="time" value={data.end} onChange={e => setData({...data, end: e.target.value})} className="input-luxe" style={{ color: theme.text }} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tags.map(t => (
            <button key={t.id} onClick={() => setData({...data, category: t.id})} className="btn-reset" style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, border: `1px solid ${data.category===t.id ? t.color : theme.border}`, background: data.category===t.id ? t.bg : "transparent", color: t.color }}>{t.name}</button>
          ))}
        </div>
        <input value={data.location} onChange={e => setData({...data, location: e.target.value})} placeholder="Location..." className="input-luxe" style={{ color: theme.text }} />
        <textarea value={data.description} onChange={e => setData({...data, description: e.target.value})} placeholder="Notes..." className="input-luxe" style={{ minHeight: 80, resize: "none", color: theme.text }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
          {onDelete ? <button onClick={onDelete} className="btn-reset" style={{ color: theme.indicator, fontWeight: 600 }}>Delete</button> : <div/>}
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={onCancel} className="btn-reset" style={{ color: theme.textSec }}>Cancel</button>
            <button onClick={submit} className="btn-reset" style={{ padding: "10px 24px", borderRadius: 8, background: theme.accent, color: "#fff", fontWeight: 600 }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrashModal({ events, theme, onClose, onRestore, onDelete }) {
  return (
    <div className="glass-panel fade-enter" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 500, height: "70vh", background: theme.card, padding: 32, borderRadius: 24, boxShadow: theme.shadow, display: "flex", flexDirection: "column" }}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:24}}>
          <h3 className="serif" style={{ fontSize: 24 }}>Trash</h3>
          <button onClick={onClose} className="btn-reset"><ICONS.Close/></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {events.length === 0 && <div style={{textAlign:'center', color:theme.textMuted, marginTop:40}}>Empty</div>}
          {events.map(ev => (
            <div key={ev.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottom: `1px solid ${theme.border}` }}>
              <div><div style={{fontWeight:600}}>{ev.title}</div><div style={{fontSize:12, color:theme.textMuted}}>{ev.start.toLocaleDateString()}</div></div>
              <div style={{display:'flex', gap:8}}>
                <button onClick={() => onRestore(ev.id)} style={{ padding: "6px 12px", borderRadius: 6, background: theme.accent, color: "#fff", border: "none", cursor: "pointer" }}>Restore</button>
                <button onClick={() => onDelete(ev.id)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${theme.indicator}`, color: theme.indicator, background: "transparent", cursor: "pointer" }}>Purge</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthScreen({ onLogin, theme }) {
  return (
    <div style={{ height: "100vh", background: "#0B0E11", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <h1 className="serif" style={{ fontSize: 64, color: "#F5F5F4", marginBottom: 24 }}>Timeline.</h1>
      <p style={{ color: "#A8A29E", marginBottom: 40, fontSize: 18, fontFamily: "serif", fontStyle: "italic" }}>"Time is the luxury you cannot buy."</p>
      <button onClick={onLogin} style={{ padding: "16px 40px", borderRadius: 4, background: "#D97706", color: "#fff", border: "none", fontSize: 14, textTransform: "uppercase", letterSpacing: 2, cursor: "pointer", fontWeight: 600 }}>Enter System</button>
      
      {/* Footer Links (From Source Code) */}
      <div style={{ position: 'fixed', bottom: 24, display: 'flex', gap: 20, color: '#A8A29E', fontSize: 12 }}>
         <span>Privacy Policy</span>
         <span>Terms of Service</span>
         <span>Commercial Act</span>
      </div>
    </div>
  );
}