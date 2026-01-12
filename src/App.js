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
  version: "10.0.0",
  quoteInterval: 14400000,
  author: "Timeline Systems",
  motto: "Time is the luxury you cannot buy."
};

// Premium Logo Component with Liquid Glass effect
const AppLogo = ({ size = 32, theme, showText = false }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={{
      width: size,
      height: size,
      borderRadius: size * 0.28,
      background: `linear-gradient(135deg, #F97316 0%, #FB923C 50%, #FDBA74 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: `0 4px 16px rgba(249, 115, 22, 0.35), inset 0 1px 1px rgba(255,255,255,0.3)`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Glass overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 100%)',
        borderRadius: `${size * 0.28}px ${size * 0.28}px 0 0`
      }} />
      {/* Timeline icon */}
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" style={{ position: 'relative', zIndex: 1 }}>
        <path d="M12 2L12 22M12 6L18 6M12 12L16 12M12 18L20 18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="12" cy="6" r="2" fill="white"/>
        <circle cx="12" cy="12" r="2" fill="white"/>
        <circle cx="12" cy="18" r="2" fill="white"/>
      </svg>
    </div>
    {showText && (
      <div>
        <div style={{
          fontSize: 15,
          fontWeight: 700,
          color: theme.text,
          letterSpacing: '-0.3px',
          lineHeight: 1.1
        }}>Timeline</div>
        <div style={{
          fontSize: 10,
          fontWeight: 500,
          color: theme.accent,
          letterSpacing: '1px',
          textTransform: 'uppercase'
        }}>OS</div>
      </div>
    )}
  </div>
);

// Focus Modes Configuration
const FOCUS_MODES = {
  normal: { id: 'normal', name: 'Normal', icon: 'Calendar', filter: null },
  work: { id: 'work', name: 'Work Focus', icon: 'Briefcase', filter: ['work'] },
  personal: { id: 'personal', name: 'Personal', icon: 'Star', filter: ['personal', 'health', 'travel'] },
  minimal: { id: 'minimal', name: 'Minimal', icon: 'Target', hideStats: true, hideSidebar: true }
};

// Smart Suggestions Engine
const generateSmartSuggestions = (events, today) => {
  const suggestions = [];
  const now = new Date();
  const hour = now.getHours();

  // Check for busy days
  const eventsByDate = {};
  events.forEach(e => {
    const dateKey = new Date(e.start).toDateString();
    eventsByDate[dateKey] = (eventsByDate[dateKey] || 0) + 1;
  });

  const todayEvents = eventsByDate[today.toDateString()] || 0;
  if (todayEvents >= 5) {
    suggestions.push({
      type: 'warning',
      icon: 'Clock',
      title: 'Busy Day Alert',
      message: `You have ${todayEvents} events today. Consider blocking focus time.`,
      action: 'Add Focus Block'
    });
  }

  // Morning suggestion
  if (hour >= 6 && hour < 10 && todayEvents === 0) {
    suggestions.push({
      type: 'tip',
      icon: 'Star',
      title: 'Morning Planning',
      message: 'Start your day by planning your priorities.',
      action: 'Add Event'
    });
  }

  // Evening review
  if (hour >= 18 && hour < 21) {
    suggestions.push({
      type: 'tip',
      icon: 'TrendingUp',
      title: 'Daily Review',
      message: 'Good time to review tomorrow\'s schedule.',
      action: 'View Tomorrow'
    });
  }

  // Check for gaps
  const weekEvents = events.filter(e => {
    const diff = (new Date(e.start) - today) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  });

  if (weekEvents.length < 3) {
    suggestions.push({
      type: 'info',
      icon: 'Calendar',
      title: 'Light Week Ahead',
      message: 'Your week looks open. Time for new goals?',
      action: 'Plan Week'
    });
  }

  return suggestions.slice(0, 3);
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
  ),
  // Premium Icons
  Coffee: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
      <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
    </svg>
  ),
  Book: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  Heart: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  Zap: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  Globe: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  Music: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  ),
  Camera: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  ),
  Gift: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/>
      <line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
  ),
  Laptop: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  Plane: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
    </svg>
  ),
  Smile: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>
  ),
  Target: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  Award: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
    </svg>
  ),
  Sunset: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="9" x2="12" y2="2"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/>
      <line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/>
      <line x1="23" y1="22" x2="1" y2="22"/><polyline points="16 5 12 9 8 5"/>
    </svg>
  ),
  Dumbbell: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5L17.5 17.5M6 12H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2M18 12h2a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2M6 12v4a2 2 0 0 0 2 2h2M18 12v4a2 2 0 0 1-2 2h-2"/>
    </svg>
  ),
  Check: (props) => (
    <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
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
    glass: "rgba(255, 255, 255, 0.85)",
    indicator: "#EF4444",
    manifestoLine: "#E2E8F0",
    hoverBg: "rgba(0, 0, 0, 0.02)",
    activeBg: "rgba(0, 0, 0, 0.04)",
    pulse: "rgba(249, 115, 22, 0.15)",
    glow: "0 0 16px rgba(249, 115, 22, 0.2)",
    cardGradient: "linear-gradient(145deg, #FFFFFF 0%, #FAFAFA 100%)",
    subtleBorder: "rgba(0, 0, 0, 0.04)",
    liquidGlass: "rgba(255, 255, 255, 0.72)",
    liquidBorder: "rgba(255, 255, 255, 0.5)",
    liquidShadow: "0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)"
  },
  dark: {
    id: 'dark',
    bg: "#09090B",
    sidebar: "#0F0F12",
    card: "#18181B",
    text: "#FAFAF9",
    textSec: "#A8A8B3",
    textMuted: "#6B6B76",
    border: "#2A2A30",
    borderLight: "#1A1A1F",
    accent: "#F97316",
    accentHover: "#FB923C",
    familyAccent: "#10B981",
    familyAccentHover: "#34D399",
    selection: "rgba(249, 115, 22, 0.18)",
    shadow: "0 2px 8px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.5)",
    shadowLg: "0 8px 16px rgba(0, 0, 0, 0.5), 0 24px 48px rgba(0, 0, 0, 0.6)",
    glass: "rgba(15, 15, 18, 0.9)",
    indicator: "#F87171",
    manifestoLine: "#2A2A30",
    hoverBg: "rgba(255, 255, 255, 0.05)",
    activeBg: "rgba(255, 255, 255, 0.1)",
    pulse: "rgba(249, 115, 22, 0.25)",
    glow: "0 0 20px rgba(249, 115, 22, 0.35)",
    cardGradient: "linear-gradient(145deg, #1C1C20 0%, #18181B 100%)",
    subtleBorder: "rgba(255, 255, 255, 0.06)",
    liquidGlass: "rgba(24, 24, 27, 0.75)",
    liquidBorder: "rgba(255, 255, 255, 0.08)",
    liquidShadow: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
  }
};

const DEFAULT_TAGS = {
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

// Helper to get icon component from tag
const getTagIcon = (tag) => {
  if (tag.iconName && ICONS[tag.iconName]) {
    return ICONS[tag.iconName];
  }
  return null;
};

// Helper to format date for datetime-local input (avoids UTC conversion issues)
const toLocalDateTimeString = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

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
  }

  html {
    scroll-behavior: smooth;
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
`;

function TimelineOS() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [nowTime, setNowTime] = useState(() => new Date()); // Separate state for current time display
  const [viewMode, setViewMode] = useState("year");
  const [context, setContext] = useState("personal");
  const [events, setEvents] = useState([]);
  const [deletedEvents, setDeletedEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [tags, setTags] = useState(() => {
    try {
      const saved = localStorage.getItem('timeline_tags_v5');
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
      enablePulseEffects: true,
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

  // Smart suggestions
  const smartSuggestions = useMemo(() => {
    return generateSmartSuggestions(events, new Date());
  }, [events]);

  // Current focus mode
  const currentFocusMode = FOCUS_MODES[config.focusMode] || FOCUS_MODES.normal;

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
    const nowInterval = setInterval(() => setNowTime(new Date()), 60000); // Update nowTime for time indicators
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
    localStorage.setItem('timeline_tags_v5', JSON.stringify(tags));
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
          background: config.darkMode ? theme.cardGradient : theme.sidebar,
          borderRight: `1px solid ${config.darkMode ? theme.subtleBorder : theme.border}`,
          display: "flex",
          flexDirection: "column",
          padding: "20px",
          overflow: "hidden"
        }}>
          {/* Premium Header with Logo */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <AppLogo size={36} theme={theme} showText={true} />
              <div style={{ display: 'flex', gap: 6 }}>
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
              marginBottom: 4
            }}>
              Welcome, {user.displayName?.split(" ")[0] || 'User'}
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

          {/* Smart Suggestions */}
          {smartSuggestions.length > 0 && (
            <div style={{
              marginBottom: 16,
              padding: 10,
              background: theme.liquidGlass,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: 10,
              border: `1px solid ${theme.liquidBorder}`
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: theme.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Suggestions
              </div>
              {smartSuggestions.slice(0, 2).map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 0',
                  borderBottom: i < smartSuggestions.length - 1 ? `1px solid ${theme.subtleBorder}` : 'none'
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: s.type === 'warning' ? '#f5970020' : s.type === 'tip' ? '#10b98120' : '#6366f120',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {ICONS[s.icon] && React.createElement(ICONS[s.icon], {
                      width: 12, height: 12,
                      style: { color: s.type === 'warning' ? '#f59700' : s.type === 'tip' ? '#10b981' : '#6366f1' }
                    })}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: theme.text }}>{s.title}</div>
                    <div style={{ fontSize: 9, color: theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.message}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Search & Filter Bar */}
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
                  color: theme.text, fontSize: 12, outline: 'none'
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
              <div style={{ fontSize: 11, fontWeight: 600, color: theme.text, marginBottom: 10 }}>Filter by Date</div>
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
            
            {/* Compact horizontal tag pills with Liquid Glass */}
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 12
            }}>
              {currentTags.map(tag => {
                const isActive = activeTagIds.includes(tag.id);

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
                      padding: "4px 8px",
                      borderRadius: 20,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      // Enhanced Liquid Glass
                      background: isActive
                        ? `linear-gradient(135deg, ${tag.color}30 0%, ${tag.color}15 100%)`
                        : config.darkMode
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                      border: isActive
                        ? `1px solid ${tag.color}60`
                        : `1px solid ${config.darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
                      boxShadow: isActive
                        ? `0 2px 12px ${tag.color}25, inset 0 1px 0 rgba(255,255,255,0.2)`
                        : `0 1px 3px ${config.darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)'}, inset 0 1px 0 rgba(255,255,255,${config.darkMode ? '0.05' : '0.8'})`,
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      fontSize: 9,
                      fontWeight: 600,
                      color: isActive ? tag.color : theme.textSec
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      if (!isActive) {
                        e.currentTarget.style.background = config.darkMode
                          ? 'rgba(255, 255, 255, 0.08)'
                          : 'rgba(255, 255, 255, 0.9)';
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'scale(1)';
                      if (!isActive) {
                        e.currentTarget.style.background = config.darkMode
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'rgba(255, 255, 255, 0.7)';
                      }
                    }}
                  >
                    <div style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: tag.color,
                      flexShrink: 0,
                      boxShadow: isActive ? `0 0 6px ${tag.color}` : 'none'
                    }} />
                    <span>{tag.name}</span>
                  </button>
                );
              })}

              {/* All/Clear toggle */}
              <button
                onClick={() => {
                  const allTagIds = currentTags.map(t => t.id);
                  setActiveTagIds(activeTagIds.length === allTagIds.length ? [] : allTagIds);
                }}
                style={{
                  padding: "4px 8px",
                  borderRadius: 20,
                  border: `1px dashed ${theme.border}`,
                  background: "transparent",
                  color: theme.textMuted,
                  fontSize: 9,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s"
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
              parentScrollRef={scrollRef}
            />
          ) : viewMode === 'week' ? (
            <WeekView
              currentDate={currentDate}
              nowTime={nowTime}
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
              accentColor={accentColor}
              onDayClick={(date) => {
                setCurrentDate(date);
                setViewMode('day');
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

      {/* Premium Insights Modal */}
      {insightsOpen && (
        <div className="scale-enter" style={{
          position: "fixed", inset: 0, zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)"
        }} onClick={() => setInsightsOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 600, maxHeight: "80vh", overflow: "auto",
            background: theme.liquidGlass, backdropFilter: "blur(24px)",
            borderRadius: 20, border: `1px solid ${theme.liquidBorder}`,
            boxShadow: theme.liquidShadow, padding: 24
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: theme.text, marginBottom: 4 }}>Insights</h2>
                <p style={{ fontSize: 12, color: theme.textMuted }}>Analytics & patterns from your calendar</p>
              </div>
              <button onClick={() => setInsightsOpen(false)} style={{
                width: 32, height: 32, borderRadius: 8, background: theme.hoverBg,
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
              }}><ICONS.Close width={16} height={16} style={{ color: theme.textMuted }} /></button>
            </div>

            {/* Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total Events", value: events.length, color: "#6366f1", icon: "Calendar" },
                { label: "This Month", value: events.filter(e => new Date(e.start).getMonth() === new Date().getMonth()).length, color: "#10b981", icon: "TrendingUp" },
                { label: "Categories", value: currentTags.length, color: "#f59700", icon: "Star" }
              ].map((stat, i) => (
                <div key={i} style={{
                  padding: 16, borderRadius: 12,
                  background: config.darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  border: `1px solid ${theme.subtleBorder}`
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6, background: `${stat.color}20`,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      {ICONS[stat.icon] && React.createElement(ICONS[stat.icon], { width: 12, height: 12, style: { color: stat.color } })}
                    </div>
                    <span style={{ fontSize: 11, color: theme.textMuted }}>{stat.label}</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Category Breakdown */}
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 12 }}>Events by Category</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {currentTags.map(tag => {
                  const count = events.filter(e => e.category === tag.id).length;
                  const pct = events.length > 0 ? Math.round((count / events.length) * 100) : 0;
                  return (
                    <div key={tag.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6, background: `${tag.color}20`,
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        {ICONS[tag.iconName] && React.createElement(ICONS[tag.iconName], { width: 12, height: 12, style: { color: tag.color } })}
                      </div>
                      <span style={{ fontSize: 12, color: theme.text, width: 80 }}>{tag.name}</span>
                      <div style={{ flex: 1, height: 8, background: theme.hoverBg, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: tag.color, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 11, color: theme.textMuted, width: 40, textAlign: "right" }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity Heatmap Preview */}
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 12 }}>Weekly Activity</h3>
              <div style={{ display: "flex", gap: 4 }}>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
                  const dayEvents = events.filter(e => new Date(e.start).getDay() === (i + 1) % 7).length;
                  const intensity = Math.min(dayEvents / 3, 1);
                  return (
                    <div key={day} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{
                        height: 40, borderRadius: 6, marginBottom: 4,
                        background: `rgba(249, 115, 22, ${0.1 + intensity * 0.6})`
                      }} />
                      <span style={{ fontSize: 9, color: theme.textMuted }}>{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <EventEditor
          event={editingEvent}
          theme={theme}
          tags={currentTags}
          onSave={handleSaveEvent}
          onDelete={editingEvent?.id ? () => softDeleteEvent(editingEvent.id) : null}
          onCancel={() => setModalOpen(false)}
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

function DayView({ currentDate, nowTime, events, theme, config, tags, onEventClick, onEventDrag, context, accentColor, parentScrollRef }) {
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropIndicator, setDropIndicator] = useState(null);
  const [isExtending, setIsExtending] = useState(false);

  const eventsColumnRef = useRef(null);
  const autoScrollRef = useRef(null);
  const currentTime = nowTime || new Date();
  const isToday = currentDate.toDateString() === currentTime.toDateString();
  
  const dayEvents = useMemo(() => {
    const filtered = events.filter(event => {
      if (!event?.start) return false;
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === currentDate.toDateString();
    });
    
    return filtered.sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [events, currentDate]);
  
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
      category: tags[0]?.id || '',
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
          
          {calculateEventPositions.map((pos) => {
            const { event, top, height, left, width } = pos;
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
                  boxShadow: `0 1px 3px ${tag.color}15`,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
                  overflow: "hidden",
                  zIndex: isDragged ? 1 : 5,
                  userSelect: 'none',
                  border: `1px solid ${tag.color}20`,
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
                {/* Header: Title + Tag (top-right) */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 6,
                  marginBottom: isShortEvent ? 1 : 4
                }}>
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
                      {(() => { const IconComponent = getTagIcon(tag); return IconComponent ? <IconComponent width={8} height={8} /> : null; })()}
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
function WeekView({ currentDate, nowTime, events, theme, config, tags, onEventClick }) {
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

              {/* Events */}
              {eventsWithLayout.map(event => {
                const tag = tags.find(t => t.id === event.category) || tags[0] || {};
                const eventStart = new Date(event.start);

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
                    title={`${event.title || 'Event'} - ${timeStr}`}
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
                      boxShadow: `0 1px 3px ${theme.text}08`,
                      transition: "box-shadow 0.15s ease"
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.boxShadow = `0 2px 8px ${theme.text}15`;
                      e.currentTarget.style.zIndex = "25";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.boxShadow = `0 1px 3px ${theme.text}08`;
                      e.currentTarget.style.zIndex = "5";
                    }}
                  >
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
<div style={{ maxWidth: 1600, margin: "0 auto", padding: "0 20px" }}>
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
      
      return (
        <div
          key={index}
          onClick={() => isCurrentMonth && onDayClick(date)}
          style={{
            minHeight: 110,
            padding: 10,
            borderRadius: 10,
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
accentColor,
onDayClick
}) {
const year = currentDate.getFullYear();
const today = React.useMemo(() => new Date(), []);
const isCurrentYear = year === today.getFullYear();
const [hoveredDay, setHoveredDay] = React.useState(null);
const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });

// Focus Timer State
const [timerSeconds, setTimerSeconds] = React.useState(25 * 60);
const [timerRunning, setTimerRunning] = React.useState(false);
const timerRef = React.useRef(null);

// Daily Goals State
const [goals, setGoals] = React.useState([
  { id: 1, text: 'Morning routine', done: false },
  { id: 2, text: 'Deep work session', done: false },
  { id: 3, text: 'Exercise', done: false }
]);
const [newGoal, setNewGoal] = React.useState('');

// Focus Timer Effect
React.useEffect(() => {
  if (timerRunning && timerSeconds > 0) {
    timerRef.current = setInterval(() => {
      setTimerSeconds(prev => prev - 1);
    }, 1000);
  } else if (timerSeconds === 0) {
    setTimerRunning(false);
  }
  return () => clearInterval(timerRef.current);
}, [timerRunning, timerSeconds]);

const formatTimer = (secs) => {
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
const CELL_SIZE = 28;
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
maxWidth: 1200,
margin: "0 auto",
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
    
    {/* Productivity Tools Section */}
    {(() => {
      const progress = isCurrentYear
        ? Math.floor((today - new Date(year, 0, 1)) / (1000 * 60 * 60 * 24 * 365) * 100)
        : year < today.getFullYear() ? 100 : 0;
      const totalEvents = events.length;
      const daysWithEvents = Object.keys(eventsByDay).length;

      // Upcoming events (next 7 days)
      const upcomingEvents = events
        .filter(e => {
          const start = new Date(e.start);
          const diffDays = (start - today) / (1000 * 60 * 60 * 24);
          return diffDays >= 0 && diffDays <= 7;
        })
        .sort((a, b) => new Date(a.start) - new Date(b.start))
        .slice(0, 5);

      const goalsCompleted = goals.filter(g => g.done).length;
      const goalsProgress = goals.length > 0 ? Math.round((goalsCompleted / goals.length) * 100) : 0;

      return (
        <div style={{
          marginTop: 16,
          paddingTop: 14,
          borderTop: `1px solid ${config.darkMode ? theme.subtleBorder : theme.border}`
        }}>
          {/* Compact Stats + Tools Row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 10,
            marginBottom: 12
          }}>
            {/* Year Progress */}
            <div style={{
              background: config.darkMode ? theme.card : theme.sidebar,
              padding: "12px",
              borderRadius: 10,
              border: `1px solid ${config.darkMode ? theme.subtleBorder : theme.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 5,
                  background: `${accentColor}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ICONS.TrendingUp width={11} height={11} style={{ color: accentColor }} />
                </div>
                <span style={{ fontSize: 10, color: theme.textMuted }}>Progress</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: theme.text }}>{progress}%</div>
              <div style={{ width: '100%', height: 3, background: config.darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', borderRadius: 2, marginTop: 6 }}>
                <div style={{ width: `${progress}%`, height: '100%', background: accentColor, borderRadius: 2 }} />
              </div>
            </div>

            {/* Events */}
            <div style={{
              background: config.darkMode ? theme.card : theme.sidebar,
              padding: "12px",
              borderRadius: 10,
              border: `1px solid ${config.darkMode ? theme.subtleBorder : theme.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 5,
                  background: '#6366f120',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ICONS.Calendar width={11} height={11} style={{ color: '#6366f1' }} />
                </div>
                <span style={{ fontSize: 10, color: theme.textMuted }}>Events</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#6366f1' }}>{totalEvents}</div>
              <div style={{ fontSize: 9, color: theme.textMuted, marginTop: 4 }}>This year</div>
            </div>

            {/* Active Days */}
            <div style={{
              background: config.darkMode ? theme.card : theme.sidebar,
              padding: "12px",
              borderRadius: 10,
              border: `1px solid ${config.darkMode ? theme.subtleBorder : theme.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 5,
                  background: '#10b98120',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ICONS.Check width={11} height={11} style={{ color: '#10b981' }} />
                </div>
                <span style={{ fontSize: 10, color: theme.textMuted }}>Active</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#10b981' }}>{daysWithEvents}</div>
              <div style={{ fontSize: 9, color: theme.textMuted, marginTop: 4 }}>Days busy</div>
            </div>

            {/* This Week */}
            <div style={{
              background: config.darkMode ? theme.card : theme.sidebar,
              padding: "12px",
              borderRadius: 10,
              border: `1px solid ${config.darkMode ? theme.subtleBorder : theme.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 5,
                  background: '#f5970020',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ICONS.Star width={11} height={11} style={{ color: '#f59700' }} />
                </div>
                <span style={{ fontSize: 10, color: theme.textMuted }}>Week</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#f59700' }}>{upcomingEvents.length}</div>
              <div style={{ fontSize: 9, color: theme.textMuted, marginTop: 4 }}>Coming up</div>
            </div>

            {/* Focus Timer - Compact */}
            <div style={{
              background: config.darkMode ? theme.card : theme.sidebar,
              padding: "12px",
              borderRadius: 10,
              border: `1px solid ${config.darkMode ? theme.subtleBorder : theme.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 5,
                  background: `${accentColor}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ICONS.Clock width={11} height={11} style={{ color: accentColor }} />
                </div>
                <span style={{ fontSize: 10, color: theme.textMuted }}>Focus</span>
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 600,
                color: timerRunning ? accentColor : theme.text,
                fontFamily: 'monospace',
                marginBottom: 6
              }}>{formatTimer(timerSeconds)}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setTimerRunning(!timerRunning)} style={{
                  flex: 1, padding: '4px', fontSize: 9, fontWeight: 600,
                  background: timerRunning ? theme.indicator : accentColor,
                  color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer'
                }}>{timerRunning ? 'Stop' : 'Start'}</button>
                <button onClick={() => { setTimerRunning(false); setTimerSeconds(25 * 60); }} style={{
                  padding: '4px 6px', fontSize: 9,
                  background: 'transparent', color: theme.textMuted,
                  border: `1px solid ${theme.border}`, borderRadius: 4, cursor: 'pointer'
                }}>↻</button>
              </div>
            </div>

            {/* Avg Events/Day */}
            <div style={{
              background: config.darkMode ? theme.card : theme.sidebar,
              padding: "12px",
              borderRadius: 10,
              border: `1px solid ${config.darkMode ? theme.subtleBorder : theme.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 5,
                  background: '#8b5cf620',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ICONS.Target width={11} height={11} style={{ color: '#8b5cf6' }} />
                </div>
                <span style={{ fontSize: 10, color: theme.textMuted }}>Avg/Day</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#8b5cf6' }}>
                {daysWithEvents > 0 ? (totalEvents / daysWithEvents).toFixed(1) : '0'}
              </div>
              <div style={{ fontSize: 9, color: theme.textMuted, marginTop: 4 }}>Events</div>
            </div>
          </div>

          {/* Goals + Upcoming Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* Daily Goals - Inline Compact */}
            <div style={{
              background: config.darkMode ? theme.card : theme.sidebar,
              padding: "12px",
              borderRadius: 10,
              border: `1px solid ${config.darkMode ? theme.subtleBorder : theme.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 5,
                  background: '#10b98120',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ICONS.Target width={11} height={11} style={{ color: '#10b981' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: theme.text }}>Daily Goals</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: goalsProgress === 100 ? '#10b981' : theme.textMuted }}>
                  {goalsCompleted}/{goals.length}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                {goals.slice(0, 3).map(goal => (
                  <div key={goal.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 8px',
                    background: goal.done ? (config.darkMode ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.08)') : 'transparent',
                    borderRadius: 6
                  }}>
                    <div onClick={() => toggleGoal(goal.id)} style={{
                      width: 14, height: 14, borderRadius: 4, cursor: 'pointer', flexShrink: 0,
                      border: `1.5px solid ${goal.done ? '#10b981' : theme.border}`,
                      background: goal.done ? '#10b981' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {goal.done && <svg width="8" height="8" viewBox="0 0 12 12"><path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2" fill="none"/></svg>}
                    </div>
                    <span style={{
                      fontSize: 11, flex: 1,
                      color: goal.done ? theme.textMuted : theme.text,
                      textDecoration: goal.done ? 'line-through' : 'none',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>{goal.text}</span>
                    <button onClick={() => removeGoal(goal.id)} style={{
                      background: 'none', border: 'none', color: theme.textMuted,
                      fontSize: 12, cursor: 'pointer', opacity: 0.5, padding: 0
                    }}>×</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text" value={newGoal} onChange={e => setNewGoal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addGoal()}
                  placeholder="Add goal..."
                  style={{
                    flex: 1, padding: '6px 10px', fontSize: 11,
                    background: config.darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    border: 'none', borderRadius: 6, color: theme.text, outline: 'none'
                  }}
                />
                <button onClick={addGoal} style={{
                  padding: '6px 10px', fontSize: 10, fontWeight: 600,
                  background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer'
                }}>Add</button>
              </div>
            </div>

            {/* Upcoming Events - Compact */}
            <div style={{
              background: config.darkMode ? theme.card : theme.sidebar,
              padding: "12px",
              borderRadius: 10,
              border: `1px solid ${config.darkMode ? theme.subtleBorder : theme.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 5,
                  background: '#6366f120',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <ICONS.Calendar width={11} height={11} style={{ color: '#6366f1' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: theme.text }}>Upcoming</span>
              </div>
              {upcomingEvents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {upcomingEvents.slice(0, 3).map(event => {
                    const tag = tags.find(t => t.id === event.category) || tags[0];
                    const start = new Date(event.start);
                    const isToday = start.toDateString() === today.toDateString();
                    return (
                      <div key={event.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 8px',
                        background: config.darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                        borderRadius: 6,
                        borderLeft: `2px solid ${tag?.color || accentColor}`
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                          background: `${tag?.color || accentColor}15`,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: tag?.color || accentColor, lineHeight: 1 }}>{start.getDate()}</span>
                          <span style={{ fontSize: 7, color: tag?.color || accentColor, textTransform: 'uppercase' }}>{start.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 500, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</div>
                          <div style={{ fontSize: 9, color: theme.textMuted }}>
                            {isToday ? <span style={{ color: accentColor }}>Today</span> : start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {' • '}{start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0', color: theme.textMuted }}>
                  <ICONS.Calendar width={18} height={18} style={{ opacity: 0.3, marginBottom: 4 }} />
                  <div style={{ fontSize: 10 }}>No events this week</div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    })()}
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
function EventEditor({ event, theme, tags, onSave, onDelete, onCancel, context }) {
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
const isDark = theme.id === 'dark';
return (
<div style={{
position: 'fixed',
top: 0,
left: 0,
right: 0,
bottom: 0,
background: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.4)',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
zIndex: 1000,
padding: 20,
backdropFilter: 'blur(8px)'
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
  <div
    className="scale-enter scroll-container"
    style={{
    background: isDark ? theme.cardGradient : theme.card,
    borderRadius: 20,
    width: '100%',
    maxWidth: 480,
    maxHeight: '85vh',
    overflow: 'auto',
    boxShadow: isDark
      ? '0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
      : '0 24px 48px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
    position: 'relative'
  }}>
    <div style={{
      padding: '20px 24px',
      borderBottom: `1px solid ${isDark ? theme.subtleBorder : theme.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: isDark ? 'rgba(255,255,255,0.02)' : 'transparent'
    }}>
      <div>
        <h3 style={{
          fontSize: 18,
          fontWeight: 600,
          color: theme.text,
          marginBottom: 2
        }}>
          {event?.id ? 'Edit Event' : 'New Event'}
        </h3>
        <span style={{ fontSize: 11, color: theme.textMuted }}>
          {context === 'family' ? 'Family calendar' : 'Personal calendar'}
        </span>
      </div>
      <button
        onClick={onCancel}
        style={{
          background: theme.hoverBg,
          border: 'none',
          color: theme.textSec,
          cursor: 'pointer',
          padding: 8,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = theme.activeBg;
          e.currentTarget.style.color = theme.text;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = theme.hoverBg;
          e.currentTarget.style.color = theme.textSec;
        }}
      >
        <ICONS.Close width={16} height={16} />
      </button>
    </div>
    
    <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          color: theme.textSec,
          marginBottom: 8
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
            padding: '12px 14px',
            fontSize: 14,
            background: isDark ? 'rgba(255,255,255,0.04)' : theme.sidebar,
            border: `1px solid ${errors.title ? theme.indicator : isDark ? theme.subtleBorder : theme.border}`,
            borderRadius: 10,
            color: theme.text,
            transition: 'all 0.2s'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = theme.accent;
            e.target.style.boxShadow = `0 0 0 3px ${theme.accent}15`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = errors.title ? theme.indicator : isDark ? theme.subtleBorder : theme.border;
            e.target.style.boxShadow = 'none';
          }}
          autoFocus
        />
        {errors.title && (
          <div style={{
            fontSize: 10,
            color: theme.indicator,
            marginTop: 4
          }}>
            {errors.title}
          </div>
        )}
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        marginBottom: 20
      }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 600,
            color: theme.textSec,
            marginBottom: 8
          }}>
            Start
          </label>
          <input
            type="datetime-local"
            value={toLocalDateTimeString(form.start)}
            onChange={(e) => {
              const newStart = new Date(e.target.value);
              if (!isNaN(newStart.getTime())) {
                const duration = form.end - form.start;
                const newEnd = new Date(newStart.getTime() + duration);
                setForm({ ...form, start: newStart, end: newEnd });
              }
            }}
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: 13,
              background: isDark ? 'rgba(255,255,255,0.04)' : theme.sidebar,
              border: `1px solid ${isDark ? theme.subtleBorder : theme.border}`,
              borderRadius: 10,
              color: theme.text,
              cursor: 'pointer'
            }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 600,
            color: theme.textSec,
            marginBottom: 8
          }}>
            End
          </label>
          <input
            type="datetime-local"
            value={toLocalDateTimeString(form.end)}
            onChange={(e) => {
              const newEnd = new Date(e.target.value);
              if (!isNaN(newEnd.getTime())) {
                setForm({ ...form, end: newEnd });
              }
            }}
            min={toLocalDateTimeString(form.start)}
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: 13,
              background: isDark ? 'rgba(255,255,255,0.04)' : theme.sidebar,
              border: `1px solid ${errors.end ? theme.indicator : isDark ? theme.subtleBorder : theme.border}`,
              borderRadius: 10,
              color: theme.text,
              cursor: 'pointer'
            }}
          />
          {errors.end && (
            <div style={{
              fontSize: 10,
              color: theme.indicator,
              marginTop: 4
            }}>
              {errors.end}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          color: theme.textSec,
          marginBottom: 10
        }}>
          Category
        </label>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8
        }}>
          {tags.map(tag => {
            const IconComponent = getTagIcon(tag);
            const isSelected = form.category === tag.id;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => setForm({ ...form, category: tag.id })}
                style={{
                  padding: '8px 12px',
                  background: isSelected
                    ? `${tag.color}18`
                    : isDark ? 'rgba(255,255,255,0.04)' : theme.sidebar,
                  border: `1px solid ${isSelected ? `${tag.color}50` : isDark ? theme.subtleBorder : theme.border}`,
                  borderRadius: 8,
                  color: isSelected ? tag.color : theme.textSec,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = theme.hoverBg;
                    e.currentTarget.style.borderColor = isDark ? theme.border : theme.border;
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : theme.sidebar;
                    e.currentTarget.style.borderColor = isDark ? theme.subtleBorder : theme.border;
                  }
                }}
              >
                {IconComponent && <IconComponent width={12} height={12} />}
                {tag.name}
              </button>
            );
          })}
        </div>
        {errors.category && (
          <div style={{
            fontSize: 10,
            color: theme.indicator,
            marginTop: 4
          }}>
            {errors.category}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          color: theme.textSec,
          marginBottom: 8
        }}>
          Location <span style={{ fontWeight: 400, color: theme.textMuted }}>(Optional)</span>
        </label>
        <input
          type="text"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          placeholder="Where?"
          style={{
            width: '100%',
            padding: '12px 14px',
            fontSize: 13,
            background: isDark ? 'rgba(255,255,255,0.04)' : theme.sidebar,
            border: `1px solid ${isDark ? theme.subtleBorder : theme.border}`,
            borderRadius: 10,
            color: theme.text
          }}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          color: theme.textSec,
          marginBottom: 8
        }}>
          Notes <span style={{ fontWeight: 400, color: theme.textMuted }}>(Optional)</span>
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Additional details..."
          rows={3}
          style={{
            width: '100%',
            padding: '12px 14px',
            fontSize: 13,
            background: isDark ? 'rgba(255,255,255,0.04)' : theme.sidebar,
            border: `1px solid ${isDark ? theme.subtleBorder : theme.border}`,
            borderRadius: 10,
            color: theme.text,
            resize: 'vertical',
            minHeight: 80,
            lineHeight: 1.5
          }}
        />
      </div>

      <div style={{
        display: 'flex',
        gap: 10,
        justifyContent: 'flex-end',
        borderTop: `1px solid ${isDark ? theme.subtleBorder : theme.border}`,
        paddingTop: 20,
        marginTop: 4
      }}>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            style={{
              padding: '11px 20px',
              background: 'transparent',
              border: `1px solid ${theme.indicator}50`,
              borderRadius: 10,
              color: theme.indicator,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = theme.indicator;
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = theme.indicator;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = theme.indicator;
              e.currentTarget.style.borderColor = `${theme.indicator}50`;
            }}
          >
            Delete
          </button>
        )}

        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '11px 20px',
            background: 'transparent',
            border: `1px solid ${isDark ? theme.subtleBorder : theme.border}`,
            borderRadius: 10,
            color: theme.textSec,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = theme.hoverBg;
            e.currentTarget.style.borderColor = theme.border;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = isDark ? theme.subtleBorder : theme.border;
          }}
        >
          Cancel
        </button>

        <button
          type="submit"
          style={{
            padding: '11px 28px',
            background: `linear-gradient(135deg, ${context === 'family' ? theme.familyAccent : theme.accent} 0%, ${context === 'family' ? theme.familyAccentHover : theme.accentHover} 100%)`,
            border: 'none',
            borderRadius: 10,
            boxShadow: `0 4px 12px ${context === 'family' ? theme.familyAccent : theme.accent}30`,
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
          : theme.id === 'dark' ? '#2A2A30' : '#E2E8F0',
        borderRadius: 12,
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: value
          ? `0 2px 8px ${theme.accent}40, inset 0 1px 1px rgba(255,255,255,0.2)`
          : `inset 0 1px 3px rgba(0,0,0,${theme.id === 'dark' ? '0.3' : '0.1'})`
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
    { id: 'appearance', label: 'Appearance', icon: '◐' },
    { id: 'interface', label: 'Interface', icon: '▣' },
    { id: 'features', label: 'Features', icon: '⚡' }
  ];

  const settingsGroups = {
    appearance: [
      { key: 'darkMode', label: 'Dark Mode', desc: 'Switch to dark theme' },
      { key: 'use24Hour', label: '24-Hour Time', desc: 'Use military time format' },
      { key: 'weekStartMon', label: 'Week Starts Monday', desc: 'Change first day of week' }
    ],
    interface: [
      { key: 'showSidebar', label: 'Show Sidebar', desc: 'Display navigation sidebar' },
      { key: 'showMotivationalQuotes', label: 'Show Quotes', desc: 'Daily motivational quotes' },
      { key: 'showUpcomingEvents', label: 'Show Upcoming', desc: 'Preview upcoming events' }
    ],
    features: [
      { key: 'enableDragDrop', label: 'Drag & Drop', desc: 'Move events by dragging' },
      { key: 'enableAnimations', label: 'Animations', desc: 'Enable UI animations' },
      { key: 'enablePulseEffects', label: 'Pulse Effects', desc: 'Highlight active events' }
    ]
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: theme.id === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20,
      backdropFilter: 'blur(8px)'
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
      <div
        className="scale-enter"
        style={{
        background: theme.id === 'dark' ? theme.cardGradient : theme.card,
        borderRadius: 20,
        width: '100%',
        maxWidth: 480,
        maxHeight: '85vh',
        overflow: 'hidden',
        boxShadow: theme.id === 'dark'
          ? '0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
          : '0 24px 48px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${theme.id === 'dark' ? theme.subtleBorder : theme.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: theme.id === 'dark' ? 'rgba(255,255,255,0.02)' : 'transparent'
        }}>
          <div>
            <h3 style={{
              fontSize: 18,
              fontWeight: 600,
              color: theme.text,
              marginBottom: 2
            }}>
              Settings
            </h3>
            <span style={{ fontSize: 11, color: theme.textMuted }}>
              Customize your experience
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: theme.hoverBg,
              border: 'none',
              color: theme.textSec,
              cursor: 'pointer',
              padding: 8,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = theme.activeBg;
              e.currentTarget.style.color = theme.text;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = theme.hoverBg;
              e.currentTarget.style.color = theme.textSec;
            }}
          >
            <ICONS.Close width={16} height={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          padding: '12px 24px',
          gap: 6,
          borderBottom: `1px solid ${theme.id === 'dark' ? theme.subtleBorder : theme.border}`
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '10px 12px',
                background: activeTab === tab.id
                  ? theme.id === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
                  : 'transparent',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.2s',
                color: activeTab === tab.id ? theme.text : theme.textMuted
              }}
              onMouseEnter={e => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = theme.hoverBg;
                }
              }}
              onMouseLeave={e => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: 12 }}>{tab.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600 }}>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px 24px'
        }}>
          {/* User Card */}
          {user && activeTab === 'appearance' && (
            <div style={{
              padding: 16,
              background: theme.id === 'dark' ? 'rgba(255,255,255,0.03)' : theme.sidebar,
              borderRadius: 12,
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              border: `1px solid ${theme.id === 'dark' ? theme.subtleBorder : theme.border}`
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accentHover} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: 16,
                boxShadow: `0 4px 12px ${theme.accent}30`
              }}>
                {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: theme.text,
                  marginBottom: 2
                }}>
                  {user.displayName || 'User'}
                </div>
                <div style={{
                  fontSize: 11,
                  color: theme.textMuted
                }}>
                  {user.email}
                </div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  padding: '8px 14px',
                  background: 'transparent',
                  border: `1px solid ${theme.id === 'dark' ? theme.subtleBorder : theme.border}`,
                  borderRadius: 8,
                  color: theme.textSec,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = theme.hoverBg;
                  e.currentTarget.style.borderColor = theme.border;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = theme.id === 'dark' ? theme.subtleBorder : theme.border;
                }}
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Settings List */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}>
            {settingsGroups[activeTab].map(({ key, label, desc }) => (
              <div
                key={key}
                onClick={() => handleToggle(key)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: 'transparent'
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme.hoverBg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: theme.text,
                    marginBottom: 2
                  }}>
                    {label}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: theme.textMuted
                  }}>
                    {desc}
                  </div>
                </div>
                <ToggleSwitch value={config[key]} label={label} />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${theme.id === 'dark' ? theme.subtleBorder : theme.border}`,
          background: theme.id === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: theme.textSec
              }}>
                Timeline OS
              </div>
              <div style={{
                fontSize: 10,
                color: theme.textMuted
              }}>
                v{APP_META.version}
              </div>
            </div>
            <div style={{
              fontSize: 10,
              color: theme.textMuted,
              fontStyle: 'italic',
              maxWidth: 200,
              textAlign: 'right'
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
const [selectedIcon, setSelectedIcon] = React.useState('Briefcase'); // null = color-only tag
const contextTags = tags[context] || [];
const handleSaveTag = () => {
if (!newTagName.trim() || !selectedPalette) return;
const palette = PALETTE[selectedPalette];

// Icon is now optional - allows color-only tags
const newTag = {
  id: editingTag?.id || `tag-${Date.now()}`,
  name: newTagName.trim(),
  iconName: selectedIcon && ICONS[selectedIcon] ? selectedIcon : null, // null for color-only
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
        <h3 className="serif" style={{
          fontSize: 14,
          fontWeight: 500,
          color: theme.text
        }}>
          Categories
        </h3>
        <div style={{
          fontSize: 9,
          color: theme.textMuted,
          marginTop: 2
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
        flex: '0 0 200px',
        padding: '12px',
        borderRight: `1px solid ${theme.border}`,
        maxHeight: 320,
        overflowY: 'auto'
      }}>
        <h4 style={{
          fontSize: 9,
          fontWeight: 700,
          color: theme.textMuted,
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: 0.8
        }}>
          Existing ({contextTags.length})
        </h4>

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {contextTags.map(tag => {
              const IconComponent = getTagIcon(tag);
              return (
                <div
                  key={tag.id}
                  style={{
                    padding: '6px 8px',
                    background: tag.color + '10',
                    border: `1px solid ${tag.color}25`,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {IconComponent ? (
                    <IconComponent width={10} height={10} style={{ color: tag.color, flexShrink: 0 }} />
                  ) : (
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: tag.color,
                      flexShrink: 0
                    }} />
                  )}

                  <span style={{
                    flex: 1,
                    fontSize: 10,
                    fontWeight: 600,
                    color: theme.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {tag.name}
                  </span>

                  <button
                    onClick={() => handleEditTag(tag)}
                    style={{
                      padding: '2px 5px',
                      background: 'transparent',
                      border: `1px solid ${theme.border}`,
                      borderRadius: 3,
                      color: theme.textMuted,
                      fontSize: 8,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    style={{
                      padding: '2px 5px',
                      background: 'transparent',
                      border: `1px solid ${theme.indicator}40`,
                      borderRadius: 3,
                      color: theme.indicator,
                      fontSize: 8,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ×
                  </button>
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
          fontSize: 9,
          fontWeight: 700,
          color: theme.textMuted,
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: 0.8
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
                fontSize: 9,
                fontWeight: 600,
                color: theme.textSec,
                marginBottom: 4
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
                fontSize: 9,
                fontWeight: 600,
                color: theme.textSec,
                marginBottom: 4
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
              {Object.keys(ICONS).filter(name => !['Settings', 'Trash', 'Plus', 'ChevronLeft', 'ChevronRight', 'Close'].includes(name)).map(iconName => {
                const IconComponent = ICONS[iconName];
                const isSelected = selectedIcon === iconName;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setSelectedIcon(iconName)}
                    title={iconName}
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
                    <IconComponent width={12} height={12} style={{ color: isSelected ? '#fff' : theme.text }} />
                  </button>
                );
              })}
            </div>
          )}

          {/* Color picker row */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 9,
              fontWeight: 600,
              color: theme.textSec,
              marginBottom: 4
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
export default function App() {
return (
<ErrorBoundary>
<TimelineOS />
</ErrorBoundary>
);
}