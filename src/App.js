import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth, provider } from "./firebase";
import { 
  collection, query, where, getDocs, addDoc, 
  updateDoc, deleteDoc, doc, serverTimestamp, Timestamp,
  getDoc
} from "firebase/firestore";
import { db } from "./firebase";
import * as d3 from "d3";

// ==========================================
// 1. CORE SYSTEM CONFIGURATION
// ==========================================

const APP_META = { 
  name: "Life OS Timeline", 
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
  Settings: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.72l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
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
  ShoppingCart: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
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

// AI Assistant Messages
const AI_MESSAGES = [
  "I notice you have 3 meetings today. Would you like me to optimize your schedule?",
  "Your workout streak is 12 days! Keep up the great work.",
  "You're spending 40% more on dining this month. Want budget tips?",
  "Based on your patterns, I suggest blocking 2 hours for deep work tomorrow.",
  "You have 3 birthdays coming up this week. Need gift suggestions?",
  "Energy levels seem low in the afternoon. Try a power nap at 3 PM.",
  "Investment portfolio up 8.2% this month. Well done!"
];

// ==========================================
// 3. AI ASSISTANT COMPONENT (Phase 5)
// ==========================================

const AIAssistant = ({ theme, onCommand, messages = [] }) => {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    
    setAiThinking(true);
    // Simulate AI thinking
    setTimeout(() => {
      const responses = [
        "I'll schedule that for you.",
        "Here's what I found...",
        "Based on your data, I recommend...",
        "I've updated your calendar.",
        "Let me optimize that for you."
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      onCommand(input, randomResponse);
      setInput("");
      setAiThinking(false);
    }, 1500);
  };

  const handleVoiceCommand = () => {
    setIsListening(true);
    // Simulate voice input
    setTimeout(() => {
      const commands = [
        "Schedule meeting with team tomorrow at 2 PM",
        "Add workout to calendar",
        "Show me my budget",
        "What's on my schedule today?"
      ];
      const randomCommand = commands[Math.floor(Math.random() * commands.length)];
      setInput(randomCommand);
      setIsListening(false);
    }, 2000);
  };

  return (
    <div style={{
      position: "fixed",
      bottom: 100,
      right: 30,
      width: 380,
      background: theme.card,
      borderRadius: 20,
      boxShadow: theme.shadow,
      zIndex: 1000,
      border: `1px solid ${theme.border}`,
      overflow: "hidden"
    }}>
      <div style={{
        padding: 20,
        borderBottom: `1px solid ${theme.border}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: theme.sidebar
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <ICONS.Brain />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Life OS Assistant</div>
          <div style={{ fontSize: 12, color: theme.textSec }}>AI-powered life optimization</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button 
            onClick={handleVoiceCommand}
            className="btn-reset"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: isListening ? theme.accent : theme.sidebar,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isListening ? "#fff" : theme.textSec} strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>
        </div>
      </div>

      <div style={{ maxHeight: 300, overflowY: "auto", padding: 20 }}>
        {messages.slice(-5).map((msg, idx) => (
          <div key={idx} style={{
            marginBottom: 12,
            display: "flex",
            flexDirection: "column",
            alignItems: msg.type === "user" ? "flex-end" : "flex-start"
          }}>
            <div style={{
              padding: "10px 14px",
              background: msg.type === "user" ? theme.accent : theme.sidebar,
              color: msg.type === "user" ? "#fff" : theme.text,
              borderRadius: 18,
              maxWidth: "80%",
              fontSize: 13
            }}>
              {msg.text}
            </div>
            <div style={{
              fontSize: 10,
              color: theme.textMuted,
              marginTop: 4,
              marginLeft: msg.type === "user" ? 0 : 12,
              marginRight: msg.type === "user" ? 12 : 0
            }}>
              {msg.type === "user" ? "You" : "Assistant"}
            </div>
          </div>
        ))}
        
        {aiThinking && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 10 }}>
            <div className="thinking-dots">
              <div style={{ 
                width: 8, 
                height: 8, 
                borderRadius: "50%", 
                background: theme.accent,
                animation: "bounce 1.4s infinite"
              }} />
              <div style={{ 
                width: 8, 
                height: 8, 
                borderRadius: "50%", 
                background: theme.accent,
                animation: "bounce 1.4s infinite 0.2s"
              }} />
              <div style={{ 
                width: 8, 
                height: 8, 
                borderRadius: "50%", 
                background: theme.accent,
                animation: "bounce 1.4s infinite 0.4s"
              }} />
            </div>
            <span style={{ fontSize: 12, color: theme.textSec }}>Thinking...</span>
          </div>
        )}
      </div>

      <div style={{ padding: 20, borderTop: `1px solid ${theme.border}` }}>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI to schedule, optimize, or analyze..."
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: 12,
              border: `1px solid ${theme.border}`,
              background: theme.bg,
              color: theme.text,
              fontSize: 13
            }}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            onClick={handleSend}
            className="btn-reset"
            style={{
              padding: "12px 20px",
              background: theme.accent,
              color: "#fff",
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 13
            }}
          >
            Send
          </button>
        </div>
        <div style={{ 
          display: "flex", 
          gap: 8, 
          marginTop: 12,
          flexWrap: "wrap" 
        }}>
          {["Schedule meeting", "Show budget", "Workout plan", "Energy tips"].map((cmd, idx) => (
            <button
              key={idx}
              onClick={() => setInput(cmd)}
              className="btn-reset"
              style={{
                padding: "6px 12px",
                background: theme.sidebar,
                color: theme.textSec,
                borderRadius: 20,
                fontSize: 11,
                border: `1px solid ${theme.border}`
              }}
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. FINANCIAL DASHBOARD (Phase 4)
// ==========================================

const FinancialDashboard = ({ theme, budget, investments, expenses }) => {
  const [timeRange, setTimeRange] = useState("month");
  
  const spendingByCategory = [
    { category: "Food & Dining", amount: 420, color: "#EF4444" },
    { category: "Shopping", amount: 280, color: "#8B5CF6" },
    { category: "Entertainment", amount: 150, color: "#3B82F6" },
    { category: "Transport", amount: 120, color: "#10B981" },
    { category: "Bills", amount: 350, color: "#F59E0B" }
  ];

  const portfolio = [
    { name: "Tech Stocks", value: 15200, change: 8.2, color: "#3B82F6" },
    { name: "Index Funds", value: 8700, change: 4.5, color: "#10B981" },
    { name: "Crypto", value: 4300, change: -2.3, color: "#8B5CF6" },
    { name: "Real Estate", value: 21000, change: 12.1, color: "#F59E0B" }
  ];

  return (
    <div style={{ padding: 30 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <h2 className="serif" style={{ fontSize: 28 }}>Financial Intelligence</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {["week", "month", "quarter", "year"].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className="btn-reset"
              style={{
                padding: "8px 16px",
                background: timeRange === range ? theme.accent : theme.sidebar,
                color: timeRange === range ? "#fff" : theme.text,
                borderRadius: 20,
                fontSize: 12,
                textTransform: "capitalize"
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 30 }}>
        {/* Budget Card */}
        <div style={{
          background: theme.card,
          borderRadius: 16,
          padding: 24,
          border: `1px solid ${theme.border}`
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <ICONS.DollarSign />
            </div>
            <div>
              <div style={{ fontSize: 14, color: theme.textSec }}>Monthly Budget</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>${budget.spent.toLocaleString()} / ${budget.limit.toLocaleString()}</div>
            </div>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: theme.textSec }}>Spending Progress</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: (budget.spent/budget.limit) > 0.8 ? theme.danger : theme.success }}>
                {Math.round((budget.spent/budget.limit) * 100)}%
              </span>
            </div>
            <div style={{
              height: 8,
              background: theme.border,
              borderRadius: 4,
              overflow: "hidden"
            }}>
              <div style={{
                width: `${Math.min(100, (budget.spent/budget.limit) * 100)}%`,
                height: "100%",
                background: (budget.spent/budget.limit) > 0.8 ? theme.danger : theme.success,
                borderRadius: 4
              }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4 }}>Daily Average</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>${(budget.spent / 30).toFixed(0)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4 }}>Remaining</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: theme.success }}>
                ${(budget.limit - budget.spent).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Investment Portfolio */}
        <div style={{
          background: theme.card,
          borderRadius: 16,
          padding: 24,
          border: `1px solid ${theme.border}`
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <ICONS.TrendingUp />
            </div>
            <div>
              <div style={{ fontSize: 14, color: theme.textSec }}>Investment Portfolio</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>$49,200</div>
              <div style={{ fontSize: 13, color: theme.success, display: "flex", alignItems: "center", gap: 4 }}>
                <ICONS.TrendingUp width={14} height={14} /> +8.2% this month
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            {portfolio.map((item, idx) => (
              <div key={idx} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13 }}>{item.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>${item.value.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    flex: 1,
                    height: 6,
                    background: theme.border,
                    borderRadius: 3,
                    overflow: "hidden"
                  }}>
                    <div style={{
                      width: `${(item.value / 49200) * 100}%`,
                      height: "100%",
                      background: item.color,
                      borderRadius: 3
                    }} />
                  </div>
                  <span style={{
                    fontSize: 11,
                    color: item.change >= 0 ? theme.success : theme.danger,
                    minWidth: 40,
                    textAlign: "right"
                  }}>
                    {item.change >= 0 ? "+" : ""}{item.change}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Spending Breakdown */}
      <div style={{
        background: theme.card,
        borderRadius: 16,
        padding: 24,
        border: `1px solid ${theme.border}`,
        marginBottom: 30
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Spending by Category</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {spendingByCategory.map((item, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: item.color
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13 }}>{item.category}</div>
                <div style={{ fontSize: 11, color: theme.textMuted }}>
                  ${item.amount} • {Math.round((item.amount / 1320) * 100)}%
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>${item.amount}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bill Management */}
      <div style={{
        background: theme.card,
        borderRadius: 16,
        padding: 24,
        border: `1px solid ${theme.border}`
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>Upcoming Bills</h3>
          <button className="btn-reset" style={{
            padding: "8px 16px",
            background: theme.sidebar,
            color: theme.text,
            borderRadius: 20,
            fontSize: 12
          }}>
            + Add Bill
          </button>
        </div>
        
        <div style={{ display: "grid", gap: 12 }}>
          {[
            { name: "Netflix", amount: 15.99, due: "Today", color: "#E50914" },
            { name: "Electricity", amount: 89.50, due: "Tomorrow", color: "#10B981" },
            { name: "Mortgage", amount: 2100, due: "Dec 15", color: "#3B82F6" },
            { name: "Car Insurance", amount: 145.25, due: "Dec 20", color: "#8B5CF6" }
          ].map((bill, idx) => (
            <div key={idx} style={{
              display: "flex",
              alignItems: "center",
              padding: 16,
              background: theme.sidebar,
              borderRadius: 12,
              borderLeft: `4px solid ${bill.color}`
            }}>
              <div style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 8, 
                background: bill.color + "20",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12
              }}>
                <ICONS.DollarSign />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{bill.name}</div>
                <div style={{ fontSize: 12, color: theme.textMuted }}>Due {bill.due}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>${bill.amount}</div>
                <button className="btn-reset" style={{
                  fontSize: 11,
                  color: theme.accent,
                  marginTop: 4
                }}>
                  Pay Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 5. HEALTH & FITNESS MODULE (Phase 3)
// ==========================================

const HealthFitnessModule = ({ theme, habits, healthData }) => {
  const [selectedMetric, setSelectedMetric] = useState("steps");
  
  const metrics = {
    steps: { value: 8542, goal: 10000, unit: "steps", icon: "👣", color: "#3B82F6" },
    calories: { value: 420, goal: 500, unit: "cal", icon: "🔥", color: "#EF4444" },
    sleep: { value: 7.2, goal: 8, unit: "hrs", icon: "😴", color: "#8B5CF6" },
    water: { value: 1.8, goal: 2.5, unit: "L", icon: "💧", color: "#3B82F6" }
  };

  const workouts = [
    { name: "Morning Run", duration: 45, calories: 320, type: "Cardio", time: "7:00 AM" },
    { name: "Weight Training", duration: 60, calories: 280, type: "Strength", time: "6:00 PM" },
    { name: "Yoga", duration: 30, calories: 150, type: "Flexibility", time: "8:00 AM" }
  ];

  return (
    <div style={{ padding: 30 }}>
      <h2 className="serif" style={{ fontSize: 28, marginBottom: 30 }}>Health & Wellness</h2>

      {/* Health Metrics Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 30 }}>
        {Object.entries(metrics).map(([key, metric]) => (
          <div 
            key={key}
            onClick={() => setSelectedMetric(key)}
            style={{
              background: theme.card,
              borderRadius: 16,
              padding: 20,
              border: `2px solid ${selectedMetric === key ? metric.color : theme.border}`,
              cursor: "pointer",
              transition: "all 0.3s"
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>{metric.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{metric.value}</div>
            <div style={{ fontSize: 13, color: theme.textSec, marginBottom: 12 }}>{metric.unit}</div>
            <div style={{
              height: 4,
              background: theme.border,
              borderRadius: 2,
              overflow: "hidden"
            }}>
              <div style={{
                width: `${(metric.value / metric.goal) * 100}%`,
                height: "100%",
                background: metric.color,
                borderRadius: 2
              }} />
            </div>
            <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>
              {Math.round((metric.value / metric.goal) * 100)}% of goal
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 30 }}>
        {/* Workout Schedule */}
        <div style={{
          background: theme.card,
          borderRadius: 16,
          padding: 24,
          border: `1px solid ${theme.border}`
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <ICONS.Dumbbell />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Today's Workouts</div>
              <div style={{ fontSize: 13, color: theme.textSec }}>3 activities • 2h 15m total</div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {workouts.map((workout, idx) => (
              <div key={idx} style={{
                display: "flex",
                alignItems: "center",
                padding: 16,
                background: theme.sidebar,
                borderRadius: 12
              }}>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 8, 
                  background: "#EF444420",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12
                }}>
                  {workout.type === "Cardio" ? "🏃" : workout.type === "Strength" ? "💪" : "🧘"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{workout.name}</div>
                  <div style={{ fontSize: 12, color: theme.textMuted }}>
                    {workout.duration}min • {workout.calories} cal
                  </div>
                </div>
                <div style={{ 
                  padding: "6px 12px", 
                  background: theme.accent + "20", 
                  color: theme.accent,
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600
                }}>
                  {workout.time}
                </div>
              </div>
            ))}
          </div>

          <button className="btn-reset" style={{
            width: "100%",
            padding: "14px",
            background: theme.accent,
            color: "#fff",
            borderRadius: 12,
            marginTop: 20,
            fontWeight: 600,
            fontSize: 14
          }}>
            + Add Workout
          </button>
        </div>

        {/* Habit Tracker */}
        <div style={{
          background: theme.card,
          borderRadius: 16,
          padding: 24,
          border: `1px solid ${theme.border}`
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <ICONS.Target />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Habit Streaks</div>
              <div style={{ fontSize: 13, color: theme.textSec }}>Keep your momentum going</div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {habits.map((habit, idx) => (
              <div key={idx} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
                background: theme.sidebar,
                borderRadius: 12
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 8, 
                    background: theme.accent + "20",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14
                  }}>
                    {habit.icon || "🎯"}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{habit.name}</div>
                    <div style={{ fontSize: 12, color: theme.textMuted }}>
                      Current streak: {habit.streak} days
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: habit.completed ? theme.success : theme.border,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer"
                  }}>
                    {habit.completed ? "✓" : "+"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${theme.border}` }}>
            <div style={{ fontSize: 13, color: theme.textSec, marginBottom: 8 }}>Weekly Progress</div>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <div key={day} style={{
                  flex: 1,
                  height: 40,
                  background: Math.random() > 0.3 ? theme.success : theme.border,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  color: Math.random() > 0.3 ? "#fff" : theme.text
                }}>
                  Day {day}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Meal Planning */}
      <div style={{
        background: theme.card,
        borderRadius: 16,
        padding: 24,
        border: `1px solid ${theme.border}`
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Today's Nutrition</div>
            <div style={{ fontSize: 13, color: theme.textSec }}>2,140 calories • 45% carbs, 30% protein, 25% fat</div>
          </div>
          <button className="btn-reset" style={{
            padding: "8px 16px",
            background: theme.sidebar,
            color: theme.text,
            borderRadius: 20,
            fontSize: 12
          }}>
            Log Meal
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            { meal: "Breakfast", name: "Oatmeal & Berries", calories: 420, time: "8:00 AM" },
            { meal: "Lunch", name: "Grilled Chicken Salad", calories: 560, time: "1:00 PM" },
            { meal: "Dinner", name: "Salmon & Vegetables", calories: 680, time: "7:30 PM" }
          ].map((item, idx) => (
            <div key={idx} style={{
              padding: 16,
              background: theme.sidebar,
              borderRadius: 12,
              textAlign: "center"
            }}>
              <div style={{ fontSize: 12, color: theme.accent, fontWeight: 600, marginBottom: 8 }}>{item.meal}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{item.name}</div>
              <div style={{ fontSize: 13, color: theme.textSec, marginBottom: 8 }}>{item.calories} cal</div>
              <div style={{ 
                padding: "4px 8px", 
                background: theme.accent + "20", 
                color: theme.accent,
                borderRadius: 20,
                fontSize: 11,
                display: "inline-block"
              }}>
                {item.time}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 6. FAMILY CALENDAR MODULE (Phase 3)
// ==========================================

const FamilyCalendarModule = ({ theme, familyMembers, sharedEvents }) => {
  const [activeMember, setActiveMember] = useState("all");
  
  const members = [
    { id: "me", name: "You", color: "#3B82F6", avatar: "👤" },
    { id: "spouse", name: "Sarah", color: "#8B5CF6", avatar: "👩" },
    { id: "child1", name: "Ethan", color: "#10B981", avatar: "👦" },
    { id: "child2", name: "Olivia", color: "#EF4444", avatar: "👧" }
  ];

  const todayEvents = [
    { member: "me", title: "Doctor Appointment", time: "10:00 AM", color: "#3B82F6" },
    { member: "spouse", title: "Dentist", time: "2:30 PM", color: "#8B5CF6" },
    { member: "child1", title: "Soccer Practice", time: "4:00 PM", color: "#10B981" },
    { member: "child2", title: "Piano Lesson", time: "5:30 PM", color: "#EF4444" },
    { member: "all", title: "Family Dinner", time: "7:00 PM", color: "#F59E0B" }
  ];

  const upcomingBirthdays = [
    { name: "John (Brother)", date: "Dec 15", daysLeft: 3 },
    { name: "Emma (Sister)", date: "Dec 24", daysLeft: 12 },
    { name: "Dad", date: "Jan 5", daysLeft: 24 }
  ];

  return (
    <div style={{ padding: 30 }}>
      <h2 className="serif" style={{ fontSize: 28, marginBottom: 30 }}>Family Life</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 30 }}>
        {/* Family Members */}
        <div style={{
          background: theme.card,
          borderRadius: 16,
          padding: 24,
          border: `1px solid ${theme.border}`
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <ICONS.Users />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Family Members</div>
              <div style={{ fontSize: 13, color: theme.textSec }}>4 members • Connected</div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {members.map((member) => (
              <div 
                key={member.id}
                onClick={() => setActiveMember(member.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: 16,
                  background: activeMember === member.id ? member.color + "20" : theme.sidebar,
                  borderRadius: 12,
                  border: `2px solid ${activeMember === member.id ? member.color : "transparent"}`,
                  cursor: "pointer",
                  transition: "all 0.3s"
                }}
              >
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: "50%", 
                  background: member.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  marginRight: 12
                }}>
                  {member.avatar}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{member.name}</div>
                  <div style={{ fontSize: 12, color: theme.textMuted }}>3 events today</div>
                </div>
                <div style={{ 
                  padding: "6px 12px", 
                  background: member.color + "20", 
                  color: member.color,
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600
                }}>
                  Active
                </div>
              </div>
            ))}
          </div>

          <button className="btn-reset" style={{
            width: "100%",
            padding: "14px",
            background: theme.sidebar,
            color: theme.text,
            borderRadius: 12,
            marginTop: 20,
            fontWeight: 600,
            fontSize: 14,
            border: `1px solid ${theme.border}`
          }}>
            + Add Family Member
          </button>
        </div>

        {/* Today's Family Schedule */}
        <div style={{
          background: theme.card,
          borderRadius: 16,
          padding: 24,
          border: `1px solid ${theme.border}`
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <ICONS.Calendar />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Today's Family Schedule</div>
              <div style={{ fontSize: 13, color: theme.textSec }}>{todayEvents.length} shared events</div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {todayEvents
              .filter(event => activeMember === "all" || event.member === activeMember)
              .map((event, idx) => (
                <div key={idx} style={{
                  display: "flex",
                  alignItems: "center",
                  padding: 16,
                  background: theme.sidebar,
                  borderRadius: 12,
                  borderLeft: `4px solid ${event.color}`
                }}>
                  <div style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 8, 
                    background: event.color + "20",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12
                  }}>
                    <ICONS.Clock />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{event.title}</div>
                    <div style={{ fontSize: 12, color: theme.textMuted }}>
                      {members.find(m => m.id === event.member)?.name || "All"} • {event.time}
                    </div>
                  </div>
                  <button className="btn-reset" style={{
                    padding: "6px 12px",
                    background: event.color,
                    color: "#fff",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600
                  }}>
                    Join
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Birthday Tracker */}
      <div style={{
        background: theme.card,
        borderRadius: 16,
        padding: 24,
        border: `1px solid ${theme.border}`,
        marginBottom: 30
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Upcoming Birthdays</div>
            <div style={{ fontSize: 13, color: theme.textSec }}>3 birthdays in the next 30 days</div>
          </div>
          <button className="btn-reset" style={{
            padding: "8px 16px",
            background: theme.sidebar,
            color: theme.text,
            borderRadius: 20,
            fontSize: 12
          }}>
            + Set Reminder
          </button>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {upcomingBirthdays.map((birthday, idx) => (
            <div key={idx} style={{
              display: "flex",
              alignItems: "center",
              padding: 16,
              background: theme.sidebar,
              borderRadius: 12
            }}>
              <div style={{ 
                width: 48, 
                height: 48, 
                borderRadius: "50%", 
                background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                marginRight: 12
              }}>
                🎂
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{birthday.name}</div>
                <div style={{ fontSize: 13, color: theme.textMuted }}>{birthday.date}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: theme.accent }}>{birthday.daysLeft}</div>
                <div style={{ fontSize: 11, color: theme.textMuted }}>days left</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shared Shopping List */}
      <div style={{
        background: theme.card,
        borderRadius: 16,
        padding: 24,
        border: `1px solid ${theme.border}`
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <ICONS.ShoppingCart />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Shared Shopping List</div>
            <div style={{ fontSize: 13, color: theme.textSec }}>Grocery items for the week</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {[
            { item: "Milk", assigned: "Sarah", completed: true },
            { item: "Eggs", assigned: "You", completed: true },
            { item: "Bread", assigned: "Ethan", completed: false },
            { item: "Coffee", assigned: "You", completed: false },
            { item: "Fruits", assigned: "Olivia", completed: false },
            { item: "Vegetables", assigned: "Sarah", completed: true }
          ].map((item, idx) => (
            <div key={idx} style={{
              display: "flex",
              alignItems: "center",
              padding: 12,
              background: theme.sidebar,
              borderRadius: 8
            }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: item.completed ? theme.success : theme.border,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
                cursor: "pointer"
              }}>
                {item.completed ? "✓" : ""}
              </div>
              <div style={{ flex: 1, fontSize: 14 }}>{item.item}</div>
              <div style={{ 
                padding: "4px 8px", 
                background: theme.accent + "20", 
                color: theme.accent,
                borderRadius: 20,
                fontSize: 11
              }}>
                {item.assigned}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <input
            type="text"
            placeholder="Add new item..."
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: 12,
              border: `1px solid ${theme.border}`,
              background: theme.bg,
              color: theme.text,
              fontSize: 13
            }}
          />
          <button className="btn-reset" style={{
            padding: "12px 24px",
            background: theme.accent,
            color: "#fff",
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 13
          }}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 7. LEARNING & GOALS MODULE (Phase 3)
// ==========================================

const LearningGoalsModule = ({ theme, goals, learningProgress }) => {
  const [activeGoal, setActiveGoal] = useState(0);
  
  const skillProgress = [
    { skill: "JavaScript", progress: 85, target: 100 },
    { skill: "React", progress: 90, target: 100 },
    { skill: "UI/UX Design", progress: 65, target: 100 },
    { skill: "Data Science", progress: 45, target: 100 },
    { skill: "Public Speaking", progress: 70, target: 100 }
  ];

  const courses = [
    { title: "Advanced React Patterns", progress: 75, hours: 12 },
    { title: "Machine Learning Basics", progress: 30, hours: 20 },
    { title: "Financial Literacy", progress: 90, hours: 8 }
  ];

  return (
    <div style={{ padding: 30 }}>
      <h2 className="serif" style={{ fontSize: 28, marginBottom: 30 }}>Learning & Goals</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 30 }}>
        {/* Goals Tracker */}
        <div style={{
          background: theme.card,
          borderRadius: 16,
          padding: 24,
          border: `1px solid ${theme.border}`
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <ICONS.Target />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Active Goals</div>
              <div style={{ fontSize: 13, color: theme.textSec }}>3 goals in progress</div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            {goals.slice(0, 3).map((goal, idx) => (
              <div 
                key={idx}
                onClick={() => setActiveGoal(idx)}
                style={{
                  marginBottom: 12,
                  padding: 16,
                  background: activeGoal === idx ? theme.accent + "20" : theme.sidebar,
                  borderRadius: 12,
                  border: `2px solid ${activeGoal === idx ? theme.accent : "transparent"}`,
                  cursor: "pointer"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{goal.title}</div>
                  <div style={{ fontSize: 12, color: theme.accent, fontWeight: 600 }}>
                    {goal.progress}%
                  </div>
                </div>
                <div style={{
                  height: 6,
                  background: theme.border,
                  borderRadius: 3,
                  overflow: "hidden"
                }}>
                  <div style={{
                    width: `${goal.progress}%`,
                    height: "100%",
                    background: theme.accent,
                    borderRadius: 3
                  }} />
                </div>
                <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 8 }}>
                  Due {goal.deadline} • {goal.tasksCompleted}/{goal.totalTasks} tasks
                </div>
              </div>
            ))}
          </div>

          <button className="btn-reset" style={{
            width: "100%",
            padding: "14px",
            background: theme.sidebar,
            color: theme.text,
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 14,
            border: `1px solid ${theme.border}`
          }}>
            + New Goal
          </button>
        </div>

        {/* Skill Development */}
        <div style={{
          background: theme.card,
          borderRadius: 16,
          padding: 24,
          border: `1px solid ${theme.border}`
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <ICONS.Brain />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Skill Development</div>
              <div style={{ fontSize: 13, color: theme.textSec }}>Track your progress</div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {skillProgress.map((skill, idx) => (
              <div key={idx}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{skill.skill}</div>
                  <div style={{ fontSize: 13, color: theme.accent }}>{skill.progress}%</div>
                </div>
                <div style={{
                  height: 8,
                  background: theme.border,
                  borderRadius: 4,
                  overflow: "hidden"
                }}>
                  <div style={{
                    width: `${skill.progress}%`,
                    height: "100%",
                    background: skill.progress > 80 ? theme.success : 
                              skill.progress > 60 ? theme.accent : 
                              skill.progress > 40 ? theme.warning : theme.danger,
                    borderRadius: 4
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Course Progress */}
      <div style={{
        background: theme.card,
        borderRadius: 16,
        padding: 24,
        border: `1px solid ${theme.border}`,
        marginBottom: 30
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Active Courses</div>
            <div style={{ fontSize: 13, color: theme.textSec }}>Continue your learning journey</div>
          </div>
          <button className="btn-reset" style={{
            padding: "8px 16px",
            background: theme.sidebar,
            color: theme.text,
            borderRadius: 20,
            fontSize: 12
          }}>
            Browse Courses
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {courses.map((course, idx) => (
            <div key={idx} style={{
              padding: 20,
              background: theme.sidebar,
              borderRadius: 12,
              textAlign: "center"
            }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>📚</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{course.title}</div>
              <div style={{ fontSize: 13, color: theme.textSec, marginBottom: 12 }}>{course.hours} hours</div>
              <div style={{
                height: 6,
                background: theme.border,
                borderRadius: 3,
                overflow: "hidden",
                marginBottom: 8
              }}>
                <div style={{
                  width: `${course.progress}%`,
                  height: "100%",
                  background: theme.accent,
                  borderRadius: 3
                }} />
              </div>
              <div style={{ fontSize: 12, color: theme.textMuted }}>{course.progress}% complete</div>
              <button className="btn-reset" style={{
                width: "100%",
                padding: "10px",
                background: theme.accent,
                color: "#fff",
                borderRadius: 8,
                marginTop: 16,
                fontSize: 13,
                fontWeight: 600
              }}>
                Continue
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Study Schedule */}
      <div style={{
        background: theme.card,
        borderRadius: 16,
        padding: 24,
        border: `1px solid ${theme.border}`
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <ICONS.Book />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Study Schedule</div>
            <div style={{ fontSize: 13, color: theme.textSec }}>Recommended study times based on your focus patterns</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, idx) => (
            <div key={idx} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, color: theme.textSec, marginBottom: 8 }}>{day}</div>
              <div style={{
                height: 60,
                background: idx === 2 || idx === 4 ? theme.accent + "40" : theme.sidebar,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid ${idx === 2 || idx === 4 ? theme.accent : "transparent"}`
              }}>
                <div style={{ fontSize: 11, color: theme.text }}>
                  {idx === 2 ? "2h" : idx === 4 ? "1.5h" : "Flex"}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: 14, color: theme.textSec, marginBottom: 12 }}>AI Recommendations</div>
          <div style={{
            padding: 16,
            background: theme.sidebar,
            borderRadius: 12,
            fontSize: 13,
            lineHeight: 1.6
          }}>
            Based on your focus patterns, I recommend studying React patterns tomorrow from 9-11 AM when your concentration is highest. You're most productive after your morning workout!
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 8. PRODUCTIVITY DASHBOARD (Phase 3)
// ==========================================

const ProductivityDashboard = ({ theme, focusSessions, tasks }) => {
  const [activeTab, setActiveTab] = useState("focus");
  
  const focusData = [
    { time: "9:00 AM", duration: 45, type: "Deep Work", rating: 8 },
    { time: "2:00 PM", duration: 30, type: "Meeting", rating: 6 },
    { time: "4:00 PM", duration: 60, type: "Deep Work", rating: 9 }
  ];

  const weeklyFocus = [45, 60, 30, 90, 45, 60, 75];

  return (
    <div style={{ padding: 30 }}>
      <h2 className="serif" style={{ fontSize: 28, marginBottom: 30 }}>Productivity</h2>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 30 }}>
        {/* Focus Sessions */}
        <div style={{
          background: theme.card,
          borderRadius: 16,
          padding: 24,
          border: `1px solid ${theme.border}`
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <ICONS.Zap />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Today's Focus Sessions</div>
              <div style={{ fontSize: 13, color: theme.textSec }}>2h 15m of deep work</div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
            {focusData.map((session, idx) => (
              <div key={idx} style={{
                display: "flex",
                alignItems: "center",
                padding: 16,
                background: theme.sidebar,
                borderRadius: 12
              }}>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 8, 
                  background: session.type === "Deep Work" ? "#F59E0B20" : "#3B82F620",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12
                }}>
                  {session.type === "Deep Work" ? "🧠" : "💬"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{session.type}</div>
                  <div style={{ fontSize: 12, color: theme.textMuted }}>
                    {session.time} • {session.duration} minutes
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 20 }}>{"⭐".repeat(Math.floor(session.rating / 2))}</div>
                  <div style={{ 
                    padding: "4px 8px", 
                    background: session.rating >= 8 ? theme.success + "20" : 
                              session.rating >= 6 ? theme.warning + "20" : theme.danger + "20",
                    color: session.rating >= 8 ? theme.success : 
                          session.rating >= 6 ? theme.warning : theme.danger,
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600
                  }}>
                    {session.rating}/10
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 14, color: theme.textSec, marginBottom: 12 }}>Weekly Focus Trends</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
              {weeklyFocus.map((minutes, idx) => (
                <div key={idx} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{
                    height: `${(minutes / 120) * 80}px`,
                    background: minutes > 60 ? theme.success : minutes > 30 ? theme.warning : theme.danger,
                    borderRadius: 4,
                    marginBottom: 8
                  }} />
                  <div style={{ fontSize: 10, color: theme.textMuted }}>
                    {["M", "T", "W", "T", "F", "S", "S"][idx]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pomodoro Timer */}
        <div style={{
          background: theme.card,
          borderRadius: 16,
          padding: 24,
          border: `1px solid ${theme.border}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div style={{ fontSize: 14, color: theme.textSec, marginBottom: 20 }}>Focus Timer</div>
          <div style={{
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            position: "relative"
          }}>
            <div style={{
              position: "absolute",
              inset: 8,
              borderRadius: "50%",
              background: theme.card,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column"
            }}>
              <div style={{ fontSize: 36, fontWeight: 700 }}>25:00</div>
              <div style={{ fontSize: 12, color: theme.textSec }}>Focus Time</div>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: 12, width: "100%" }}>
            <button className="btn-reset" style={{
              flex: 1,
              padding: "12px",
              background: theme.success,
              color: "#fff",
              borderRadius: 12,
              fontWeight: 600
            }}>
              Start
            </button>
            <button className="btn-reset" style={{
              flex: 1,
              padding: "12px",
              background: theme.sidebar,
              color: theme.text,
              borderRadius: 12,
              fontWeight: 600,
              border: `1px solid ${theme.border}`
            }}>
              Reset
            </button>
          </div>

          <div style={{ marginTop: 20, width: "100%" }}>
            <div style={{ fontSize: 12, color: theme.textSec, marginBottom: 8 }}>Today's Sessions: 3/8</div>
            <div style={{
              height: 6,
              background: theme.border,
              borderRadius: 3,
              overflow: "hidden"
            }}>
              <div style={{
                width: "37.5%",
                height: "100%",
                background: theme.success,
                borderRadius: 3
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Task Management */}
      <div style={{
        background: theme.card,
        borderRadius: 16,
        padding: 24,
        border: `1px solid ${theme.border}`
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>Task Management</div>
            <div style={{ fontSize: 13, color: theme.textSec }}>5 tasks remaining • 3 completed</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button 
              onClick={() => setActiveTab("focus")}
              className="btn-reset"
              style={{
                padding: "8px 16px",
                background: activeTab === "focus" ? theme.accent : theme.sidebar,
                color: activeTab === "focus" ? "#fff" : theme.text,
                borderRadius: 20,
                fontSize: 12
              }}
            >
              Focus
            </button>
            <button 
              onClick={() => setActiveTab("personal")}
              className="btn-reset"
              style={{
                padding: "8px 16px",
                background: activeTab === "personal" ? theme.accent : theme.sidebar,
                color: activeTab === "personal" ? "#fff" : theme.text,
                borderRadius: 20,
                fontSize: 12
              }}
            >
              Personal
            </button>
            <button 
              onClick={() => setActiveTab("work")}
              className="btn-reset"
              style={{
                padding: "8px 16px",
                background: activeTab === "work" ? theme.accent : theme.sidebar,
                color: activeTab === "work" ? "#fff" : theme.text,
                borderRadius: 20,
                fontSize: 12
              }}
            >
              Work
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {[
            { title: "Finish Q4 Report", project: "Work", priority: "high", due: "Today", completed: false },
            { title: "Gym Session", project: "Health", priority: "medium", due: "Today", completed: true },
            { title: "React Course Module 4", project: "Learning", priority: "medium", due: "Tomorrow", completed: false },
            { title: "Team Meeting Prep", project: "Work", priority: "high", due: "Today", completed: false },
            { title: "Groceries", project: "Personal", priority: "low", due: "Tomorrow", completed: true }
          ]
          .filter(task => activeTab === "focus" || task.project.toLowerCase() === activeTab)
          .map((task, idx) => (
            <div key={idx} style={{
              display: "flex",
              alignItems: "center",
              padding: 16,
              background: theme.sidebar,
              borderRadius: 12
            }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: task.completed ? theme.success : theme.border,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
                cursor: "pointer"
              }}>
                {task.completed ? "✓" : ""}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: 14, 
                  fontWeight: 600,
                  textDecoration: task.completed ? "line-through" : "none",
                  opacity: task.completed ? 0.6 : 1
                }}>
                  {task.title}
                </div>
                <div style={{ fontSize: 12, color: theme.textMuted }}>
                  {task.project} • Due {task.due}
                </div>
              </div>
              <div style={{ 
                padding: "6px 12px", 
                background: task.priority === "high" ? theme.danger + "20" : 
                          task.priority === "medium" ? theme.warning + "20" : theme.success + "20",
                color: task.priority === "high" ? theme.danger : 
                      task.priority === "medium" ? theme.warning : theme.success,
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 600,
                textTransform: "capitalize"
              }}>
                {task.priority}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <input
            type="text"
            placeholder="Add new task..."
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: 12,
              border: `1px solid ${theme.border}`,
              background: theme.bg,
              color: theme.text,
              fontSize: 13
            }}
          />
          <button className="btn-reset" style={{
            padding: "12px 24px",
            background: theme.accent,
            color: "#fff",
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 13
          }}>
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 9. MAIN TIMELINEOS COMPONENT
// ==========================================

export default function TimelineOS() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [viewMode, setViewMode] = useState("dashboard");
  const [context, setContext] = useState("personal");
  const [events, setEvents] = useState([]);
  const [deletedEvents, setDeletedEvents] = useState([]);
  const [tags, setTags] = useState(() => {
    const saved = localStorage.getItem('timeline_tags_v2');
    return saved ? JSON.parse(saved) : [
      { id: 'work', name: "Business", ...PALETTE.onyx },
      { id: 'health', name: "Wellness", ...PALETTE.rose },
      { id: 'finance', name: "Finance", ...PALETTE.emerald },
      { id: 'learning', name: "Learning", ...PALETTE.violet },
      { id: 'family', name: "Family", ...PALETTE.teal }
    ];
  });
  
  const [activeTagIds, setActiveTagIds] = useState(tags.map(t => t.id));
  const [quote, setQuote] = useState(QUOTES[0]);
  
  // Enhanced State for Roadmap Features
  const [habits, setHabits] = useState([
    { id: 1, name: "Workout", streak: 12, completed: true, icon: "💪" },
    { id: 2, name: "Reading", streak: 5, completed: false, icon: "📚" },
    { id: 3, name: "Meditation", streak: 8, completed: false, icon: "🧘" },
    { id: 4, name: "Water", streak: 21, completed: true, icon: "💧" }
  ]);
  
  const [budget, setBudget] = useState({ 
    spent: 1240, 
    limit: 3000,
    categories: [
      { name: "Food & Dining", spent: 420, limit: 600 },
      { name: "Shopping", spent: 280, limit: 400 },
      { name: "Entertainment", spent: 150, limit: 200 },
      { name: "Transport", spent: 120, limit: 150 },
      { name: "Bills", spent: 350, limit: 500 }
    ]
  });
  
  const [goals, setGoals] = useState([
    { id: 1, title: "Learn React Advanced", progress: 75, deadline: "Dec 31", totalTasks: 12, tasksCompleted: 9 },
    { id: 2, title: "Save $5,000", progress: 60, deadline: "Jan 15", totalTasks: 5, tasksCompleted: 3 },
    { id: 3, title: "Complete Marathon", progress: 30, deadline: "Mar 1", totalTasks: 20, tasksCompleted: 6 }
  ]);
  
  const [aiMessages, setAiMessages] = useState([]);
  const [showAI, setShowAI] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('timeline_v4_cfg');
    return saved ? JSON.parse(saved) : {
      darkMode: true,
      use24Hour: false,
      blurPast: true,
      weekStartMon: true,
      aiAssistant: true,
      financialTracking: true,
      healthTracking: true
    };
  });

  const scrollRef = useRef(null);
  const theme = config.darkMode ? THEMES.dark : THEMES.light;

  // Initialize
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap');
      :root { --ease: cubic-bezier(0.22, 1, 0.36, 1); }
      * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
      body { font-family: 'Inter', sans-serif; overflow: hidden; transition: background 0.4s var(--ease); }
      h1, h2, h3, .serif { font-family: 'Playfair Display', serif; }
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(120, 113, 108, 0.2); border-radius: 10px; }
      .fade-enter { animation: fadeIn 0.5s var(--ease) forwards; opacity: 0; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-8px); } }
      .glass-panel { backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
      .btn-reset { border: none; background: transparent; cursor: pointer; color: inherit; font-family: inherit; display: flex; align-items: center; justify-content: center; }
      .btn-hover:hover { transform: translateY(-1px); transition: transform 0.2s; }
      .tab-pill { padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; transition: 0.3s var(--ease); }
      .tab-pill.active { font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      .thinking-dots { display: flex; gap: 4px; }
    `;
    document.head.appendChild(style);

    const timeInterval = setInterval(() => setNow(new Date()), 60000);
    const quoteInterval = setInterval(() => {
      setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    }, APP_META.quoteInterval);

    // AI Message Interval
    const aiInterval = setInterval(() => {
      if (config.aiAssistant && Math.random() > 0.7) {
        const randomMessage = AI_MESSAGES[Math.floor(Math.random() * AI_MESSAGES.length)];
        setAiMessages(prev => [...prev, { 
          id: Date.now(), 
          text: randomMessage, 
          type: "ai",
          timestamp: new Date() 
        }]);
        notify(randomMessage, "info");
      }
    }, 30000);

    // Keyboard Shortcuts
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setShowAI(!showAI);
      }
      if (e.key === '1') setViewMode('dashboard');
      if (e.key === '2') setViewMode('financial');
      if (e.key === '3') setViewMode('health');
      if (e.key === '4') setViewMode('family');
      if (e.key === '5') setViewMode('learning');
      if (e.key === '6') setViewMode('productivity');
      if (e.key === 't') setCurrentDate(new Date());
    };

    window.addEventListener('keydown', handleKey);

    return () => {
      document.head.removeChild(style);
      clearInterval(timeInterval);
      clearInterval(quoteInterval);
      clearInterval(aiInterval);
      window.removeEventListener('keydown', handleKey);
    };
  }, [config.aiAssistant]);

  // Auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        await loadData(u);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Persist config
  useEffect(() => {
    localStorage.setItem('timeline_v4_cfg', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('timeline_tags_v2', JSON.stringify(tags));
  }, [tags]);

  const loadData = async (u) => {
    setLoading(true);
    try {
      const q = query(collection(db, "events"), where("uid", "==", u.uid));
      const snap = await getDocs(q);
      const allEvents = snap.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          start: data.startTime?.toDate() || new Date(),
          end: data.endTime?.toDate() || new Date()
        };
      });
      
      setEvents(allEvents.filter(e => !e.deleted));
      setDeletedEvents(allEvents.filter(e => e.deleted));
    } catch (error) {
      console.error("Error loading data:", error);
      notify("Sync failed.", "error");
    }
    setLoading(false);
  };

  const handleSave = async (data) => {
    if (!user) return;
    try {
      const startDate = data.start instanceof Date ? data.start : new Date(data.start);
      const endDate = data.end instanceof Date ? data.end : new Date(data.end);

      const payload = {
        uid: user.uid,
        title: data.title || "Untitled",
        category: data.category || tags[0].id,
        context: context,
        description: data.description || "",
        location: data.location || "",
        startTime: Timestamp.fromDate(startDate),
        endTime: Timestamp.fromDate(endDate),
        deleted: false,
        updatedAt: serverTimestamp()
      };

      if (data.id) {
        await updateDoc(doc(db, "events", data.id), payload);
      } else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, "events"), payload);
      }

      await loadData(user);
      notify("Event saved.");
    } catch (error) {
      console.error("Error saving event:", error);
      notify("Save failed.", "error");
    }
  };

  const handleAICommand = (command, response) => {
    setAiMessages(prev => [
      ...prev,
      { id: Date.now(), text: command, type: "user", timestamp: new Date() },
      { id: Date.now() + 1, text: response, type: "ai", timestamp: new Date() }
    ]);
    notify("AI responded to your command", "info");
  };

  const notify = (msg, type = 'neutral') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const filteredEvents = useMemo(() => 
    events.filter(e => e.context === context && activeTagIds.includes(e.category)),
    [events, context, activeTagIds]
  );

  const nav = (amt) => {
    const d = new Date(currentDate);
    if (viewMode === 'year') d.setFullYear(d.getFullYear() + amt);
    else if (viewMode === 'week') d.setDate(d.getDate() + (amt * 7));
    else if (viewMode === 'month') d.setMonth(d.getMonth() + amt);
    else d.setDate(d.getDate() + amt);
    setCurrentDate(d);
  };

  if (loading) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: theme.bg,
        color: theme.text,
        flexDirection: "column",
        gap: 20
      }}>
        <div style={{ fontSize: 24, fontWeight: 600 }}>Life OS Timeline</div>
        <div className="thinking-dots">
          <div style={{ 
            width: 12, 
            height: 12, 
            borderRadius: "50%", 
            background: theme.accent,
            animation: "bounce 1.4s infinite"
          }} />
          <div style={{ 
            width: 12, 
            height: 12, 
            borderRadius: "50%", 
            background: theme.accent,
            animation: "bounce 1.4s infinite 0.2s"
          }} />
          <div style={{ 
            width: 12, 
            height: 12, 
            borderRadius: "50%", 
            background: theme.accent,
            animation: "bounce 1.4s infinite 0.4s"
          }} />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onLogin={() => signInWithPopup(auth, provider)} theme={theme} />;
  }

  // Render different modules based on viewMode
  const renderModule = () => {
    switch(viewMode) {
      case "financial":
        return <FinancialDashboard theme={theme} budget={budget} />;
      case "health":
        return <HealthFitnessModule theme={theme} habits={habits} />;
      case "family":
        return <FamilyCalendarModule theme={theme} />;
      case "learning":
        return <LearningGoalsModule theme={theme} goals={goals} />;
      case "productivity":
        return <ProductivityDashboard theme={theme} />;
      default:
        return <DashboardOverview theme={theme} events={filteredEvents} habits={habits} budget={budget} goals={goals} />;
    }
  };

  return (
    <div style={{ 
      display: "flex", 
      height: "100vh", 
      background: theme.bg, 
      color: theme.text 
    }} className={config.darkMode ? 'dark' : 'light'}>
      
      {/* SIDEBAR */}
      <aside style={{ 
        width: LAYOUT.SIDEBAR_WIDTH, 
        background: theme.sidebar, 
        borderRight: `1px solid ${theme.border}`, 
        display: "flex", 
        flexDirection: "column", 
        padding: "28px 24px", 
        zIndex: 50, 
        overflowY: "auto" 
      }}>
        <div style={{ marginBottom: 32 }}>
          <h1 className="serif" style={{ 
            fontSize: 32, 
            fontWeight: 700, 
            color: theme.text, 
            letterSpacing: "-0.5px",
            display: "flex",
            alignItems: "center",
            gap: 8
          }}>
            <span style={{ 
              width: 12, 
              height: 12, 
              borderRadius: "50%", 
              background: theme.accent,
              display: "inline-block" 
            }} />
            Life OS
          </h1>
          <div style={{ 
            fontSize: 13, 
            color: theme.textSec, 
            marginTop: 4 
          }}>
            Welcome back, <span style={{fontWeight:600}}>
              {user.displayName?.split(" ")[0] || user.email?.split("@")[0]}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ 
          background: theme.card, 
          borderRadius: 12, 
          padding: 16, 
          marginBottom: 24,
          border: `1px solid ${theme.border}`
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>12</div>
              <div style={{ fontSize: 11, color: theme.textMuted }}>Streak</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>85%</div>
              <div style={{ fontSize: 11, color: theme.textMuted }}>Focus</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>8</div>
              <div style={{ fontSize: 11, color: theme.textMuted }}>Goals</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>24</div>
              <div style={{ fontSize: 11, color: theme.textMuted }}>Events</div>
            </div>
          </div>
        </div>

        {/* Module Navigation */}
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ 
            fontSize: 11, 
            fontWeight: 700, 
            color: theme.textMuted, 
            textTransform: "uppercase", 
            letterSpacing: 1, 
            marginBottom: 12 
          }}>
            Modules
          </h4>
          
          <div style={{ display: "grid", gap: 8 }}>
            {[
              { id: "dashboard", label: "Dashboard", icon: <ICONS.PieChart />, hotkey: "1" },
              { id: "financial", label: "Finance", icon: <ICONS.Finance />, hotkey: "2" },
              { id: "health", label: "Health", icon: <ICONS.Health />, hotkey: "3" },
              { id: "family", label: "Family", icon: <ICONS.Users />, hotkey: "4" },
              { id: "learning", label: "Learning", icon: <ICONS.Book />, hotkey: "5" },
              { id: "productivity", label: "Productivity", icon: <ICONS.Zap />, hotkey: "6" }
            ].map((module) => (
              <button
                key={module.id}
                onClick={() => setViewMode(module.id)}
                className="btn-reset btn-hover"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: viewMode === module.id ? theme.card : "transparent",
                  borderRadius: 12,
                  border: `1px solid ${viewMode === module.id ? theme.accent : "transparent"}`
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ 
                    width: 24, 
                    height: 24, 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    color: viewMode === module.id ? theme.accent : theme.textSec
                  }}>
                    {module.icon}
                  </div>
                  <span style={{ 
                    fontSize: 14, 
                    fontWeight: viewMode === module.id ? 600 : 500,
                    color: viewMode === module.id ? theme.text : theme.textSec
                  }}>
                    {module.label}
                  </span>
                </div>
                <div style={{ 
                  fontSize: 11, 
                  padding: "2px 6px", 
                  background: theme.border, 
                  borderRadius: 4,
                  color: theme.textMuted
                }}>
                  {module.hotkey}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ marginTop: "auto" }}>
          <button 
            onClick={() => setShowAI(!showAI)}
            className="btn-reset btn-hover"
            style={{
              width: "100%",
              padding: "14px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "#fff",
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14,
              marginBottom: 12
            }}
          >
            <ICONS.Brain /> AI Assistant
          </button>
          
          <button 
            onClick={() => {/* Open event modal */}}
            className="btn-reset btn-hover"
            style={{
              width: "100%",
              padding: "12px",
              background: theme.card,
              color: theme.text,
              borderRadius: 12,
              border: `1px solid ${theme.border}`,
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 12
            }}
          >
            <ICONS.Plus /> Quick Event
          </button>
        </div>

        {/* Settings */}
        <div style={{ 
          marginTop: 20, 
          paddingTop: 20, 
          borderTop: `1px solid ${theme.border}`, 
          display: "flex", 
          justifyContent: "space-between" 
        }}>
          <button 
            onClick={() => setConfig({...config, darkMode: !config.darkMode})}
            className="btn-reset"
            style={{ color: theme.textSec }}
          >
            {config.darkMode ? <ICONS.Sun /> : <ICONS.Moon />}
          </button>
          <button 
            onClick={() => signOut(auth)}
            className="btn-reset"
            style={{ color: theme.textSec, fontSize: 13 }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column", 
        overflow: "hidden" 
      }}>
        {/* Header */}
        <header style={{ 
          height: LAYOUT.HEADER_HEIGHT, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          padding: "0 40px", 
          borderBottom: `1px solid ${theme.border}`, 
          background: theme.bg 
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <h2 className="serif" style={{ fontSize: 28, fontWeight: 500 }}>
              {viewMode === 'dashboard' ? 'Life Dashboard' :
               viewMode === 'financial' ? 'Financial Intelligence' :
               viewMode === 'health' ? 'Health & Wellness' :
               viewMode === 'family' ? 'Family Life' :
               viewMode === 'learning' ? 'Learning & Goals' :
               viewMode === 'productivity' ? 'Productivity' : 'Timeline'}
            </h2>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ 
              fontSize: 13, 
              padding: "8px 16px", 
              background: theme.sidebar, 
              borderRadius: 20,
              color: theme.textSec
            }}>
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ 
              width: 40, 
              height: 40, 
              borderRadius: "50%", 
              background: theme.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              color: "#fff"
            }}>
              {user.displayName?.charAt(0) || user.email?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Module Content */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          {renderModule()}
        </div>
      </div>

      {/* AI Assistant */}
      {showAI && config.aiAssistant && (
        <AIAssistant 
          theme={theme} 
          onCommand={handleAICommand}
          messages={aiMessages}
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
        {notifications.map(n => (
          <div 
            key={n.id} 
            className="fade-enter" 
            style={{ 
              padding: "12px 24px", 
              background: n.type === 'error' ? theme.danger : 
                        n.type === 'success' ? theme.success : 
                        n.type === 'warning' ? theme.warning : 
                        n.type === 'info' ? theme.info : theme.card,
              color: "#fff", 
              borderRadius: 8, 
              boxShadow: theme.shadow, 
              fontSize: 13, 
              fontWeight: 600,
              minWidth: 200
            }}
          >
            {n.msg}
          </div>
        ))}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowAI(!showAI)}
        style={{
          position: "fixed",
          bottom: 24,
          left: LAYOUT.SIDEBAR_WIDTH + 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 32px rgba(102, 126, 234, 0.4)",
          zIndex: 100
        }}
      >
        <ICONS.Brain />
      </button>
    </div>
  );
}

// ==========================================
// 10. DASHBOARD OVERVIEW COMPONENT
// ==========================================

function DashboardOverview({ theme, events, habits, budget, goals }) {
  const [timeFilter, setTimeFilter] = useState("today");
  
  const stats = [
    { label: "Events Today", value: events.filter(e => 
      e.start.toDateString() === new Date().toDateString()).length, 
      change: "+2", icon: "📅" },
    { label: "Active Habits", value: habits.filter(h => h.completed).length, 
      change: "+1", icon: "🔥" },
    { label: "Budget Used", value: `${Math.round((budget.spent/budget.limit)*100)}%`, 
      change: "-5%", icon: "💰" },
    { label: "Goals Progress", value: `${Math.round(goals.reduce((a,g) => a + g.progress, 0)/goals.length)}%`, 
      change: "+12%", icon: "🎯" }
  ];

  const upcomingEvents = events
    .filter(e => e.start > new Date())
    .sort((a,b) => a.start - b.start)
    .slice(0, 5);

  return (
    <div style={{ padding: 30 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <h1 className="serif" style={{ fontSize: 36 }}>Life Dashboard</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {["today", "week", "month", "quarter"].map(filter => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className="btn-reset"
              style={{
                padding: "8px 16px",
                background: timeFilter === filter ? theme.accent : theme.sidebar,
                color: timeFilter === filter ? "#fff" : theme.text,
                borderRadius: 20,
                fontSize: 12,
                textTransform: "capitalize"
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 30 }}>
        {stats.map((stat, idx) => (
          <div key={idx} style={{
            background: theme.card,
            borderRadius: 16,
            padding: 24,
            border: `1px solid ${theme.border}`,
            display: "flex",
            alignItems: "center",
            gap: 16
          }}>
            <div style={{ fontSize: 32 }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{stat.value}</div>
              <div style={{ fontSize: 13, color: theme.textSec }}>{stat.label}</div>
              <div style={{ 
                fontSize: 11, 
                color: stat.change.startsWith("+") ? theme.success : theme.danger,
                marginTop: 4
              }}>
                {stat.change} from yesterday
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        {/* Upcoming Events */}
        <div style={{
          background: theme.card,
          borderRadius: 16,
          padding: 24,
          border: `1px solid ${theme.border}`
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <ICONS.Calendar />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>Upcoming Events</div>
              <div style={{ fontSize: 13, color: theme.textSec }}>Next 5 events on your schedule</div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {upcomingEvents.length > 0 ? upcomingEvents.map((event, idx) => (
              <div key={idx} style={{
                display: "flex",
                alignItems: "center",
                padding: 16,
                background: theme.sidebar,
                borderRadius: 12
              }}>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 8, 
                  background: "#3B82F620",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12
                }}>
                  <ICONS.Clock />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{event.title}</div>
                  <div style={{ fontSize: 12, color: theme.textMuted }}>
                    {event.start.toLocaleDateString()} • {event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ 
                  padding: "6px 12px", 
                  background: theme.accent + "20", 
                  color: theme.accent,
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600
                }}>
                  In {Math.ceil((event.start - new Date()) / (1000 * 60 * 60 * 24))}d
                </div>
              </div>
            )) : (
              <div style={{ 
                textAlign: "center", 
                padding: 40, 
                color: theme.textMuted,
                fontSize: 14
              }}>
                No upcoming events. Add some to your calendar!
              </div>
            )}
          </div>
        </div>

        {/* Quick Insights */}
        <div style={{
          background: theme.card,
          borderRadius: 16,
          padding: 24,
          border: `1px solid ${theme.border}`
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <ICONS.Brain />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>AI Insights</div>
              <div style={{ fontSize: 13, color: theme.textSec }}>Personalized recommendations</div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <div style={{
              padding: 16,
              background: theme.sidebar,
              borderRadius: 12,
              fontSize: 13,
              lineHeight: 1.6
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>📈 Productivity Peak</div>
              Your focus is highest between 9-11 AM. Schedule important tasks then.
            </div>
            
            <div style={{
              padding: 16,
              background: theme.sidebar,
              borderRadius: 12,
              fontSize: 13,
              lineHeight: 1.6
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>💪 Health Tip</div>
              You've been sitting for 4 hours. Time for a 5-minute stretch break!
            </div>
            
            <div style={{
              padding: 16,
              background: theme.sidebar,
              borderRadius: 12,
              fontSize: 13,
              lineHeight: 1.6
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>💰 Financial Alert</div>
              You're on track to exceed dining budget. Consider meal prepping.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 11. AUTH SCREEN
// ==========================================

function AuthScreen({ onLogin, theme }) {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await onLogin();
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      height: "100vh", 
      background: "linear-gradient(135deg, #0B0E11 0%, #1a1d24 100%)", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      flexDirection: "column" 
    }}>
      <div style={{
        width: "100%",
        maxWidth: 480,
        background: "rgba(255, 255, 255, 0.05)",
        backdropFilter: "blur(20px)",
        borderRadius: 32,
        padding: 48,
        border: "1px solid rgba(255, 255, 255, 0.1)",
        textAlign: "center"
      }}>
        <h1 className="serif" style={{ 
          fontSize: 64, 
          color: "#F5F5F4", 
          marginBottom: 16,
          background: "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          Life OS
        </h1>
        <p style={{ 
          color: "#A8A29E", 
          marginBottom: 40, 
          fontSize: 18, 
          fontFamily: "serif", 
          fontStyle: "italic",
          lineHeight: 1.6
        }}>
          "The ultimate system for designing your ideal life. Track time, health, finances, and goals in one unified dashboard."
        </p>
        
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(2, 1fr)", 
          gap: 16, 
          marginBottom: 32 
        }}>
          {[
            { icon: "⏰", label: "Time Intelligence" },
            { icon: "💪", label: "Health Tracking" },
            { icon: "💰", label: "Financial Dashboard" },
            { icon: "🎯", label: "Goal Management" }
          ].map((feature, idx) => (
            <div key={idx} style={{
              padding: 16,
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: 12,
              textAlign: "center"
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{feature.icon}</div>
              <div style={{ fontSize: 12, color: "#A8A29E" }}>{feature.label}</div>
            </div>
          ))}
        </div>
        
        <button 
          onClick={handleLogin}
          disabled={loading}
          style={{ 
            width: "100%",
            padding: "18px 40px", 
            borderRadius: 12, 
            background: "linear-gradient(135deg, #D97706 0%, #B45309 100%)", 
            color: "#fff", 
            border: "none", 
            fontSize: 16, 
            fontWeight: 600, 
            cursor: "pointer", 
            transition: "all 0.3s",
            opacity: loading ? 0.7 : 1
          }}
          onMouseEnter={(e) => !loading && (e.target.style.transform = "translateY(-2px)")}
          onMouseLeave={(e) => !loading && (e.target.style.transform = "translateY(0)")}
        >
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <div className="thinking-dots">
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />
              </div>
              Connecting...
            </div>
          ) : (
            "Enter Life OS →"
          )}
        </button>
        
        <div style={{ 
          fontSize: 11, 
          color: "rgba(168, 162, 158, 0.6)", 
          marginTop: 24,
          letterSpacing: 1,
          textTransform: "uppercase"
        }}>
          v5.0 • AI-Powered • Life Optimization
        </div>
      </div>
    </div>
  );
}