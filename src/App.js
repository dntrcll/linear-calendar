import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth, provider } from "./firebase";
import { 
  collection, query, where, getDocs, addDoc, updateDoc, 
  deleteDoc, doc, serverTimestamp, Timestamp 
} from "firebase/firestore";
import { db } from "./firebase";

// ==========================================
// 1. SYSTEM CONFIGURATION & CONSTANTS
// ==========================================

const APP_META = { 
  name: "Timeline OS", 
  version: "7.0.0-Master",
  quoteInterval: 14400000 
};

const LAYOUT = {
  SIDEBAR_WIDTH: 320,
  HEADER_HEIGHT: 84,
  PIXELS_PER_MINUTE: 2.2, 
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
  MapPin: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
};

const PALETTE = {
  onyx: { 
    bg: "#27272a", 
    bgDark: "#18181b",
    text: "#f4f4f5", 
    border: "#52525b", 
    color: "#71717a",
    colorLight: "#a1a1aa" 
  },
  ceramic: { 
    bg: "#fafaf9", 
    bgDark: "#292524",
    text: "#57534e", 
    border: "#d6d3d1", 
    color: "#78716c",
    colorLight: "#a8a29e"
  },
  gold: { 
    bg: "#fef3c7", 
    bgDark: "#78350f",
    text: "#78350f", 
    border: "#fbbf24", 
    color: "#f59e0b",
    colorLight: "#fbbf24"
  },
  emerald: { 
    bg: "#d1fae5", 
    bgDark: "#065f46",
    text: "#065f46", 
    border: "#34d399", 
    color: "#10b981",
    colorLight: "#6ee7b7"
  },
  rose: { 
    bg: "#ffe4e6", 
    bgDark: "#881337",
    text: "#881337", 
    border: "#fb7185", 
    color: "#f43f5e",
    colorLight: "#fda4af"
  },
  midnight: { 
    bg: "#dbeafe", 
    bgDark: "#1e3a8a",
    text: "#1e40af", 
    border: "#60a5fa", 
    color: "#3b82f6",
    colorLight: "#93c5fd"
  },
  lavender: { 
    bg: "#f3e8ff", 
    bgDark: "#6b21a8",
    text: "#6b21a8", 
    border: "#c084fc", 
    color: "#a855f7",
    colorLight: "#d8b4fe"
  },
  clay: { 
    bg: "#fed7aa", 
    bgDark: "#9a3412",
    text: "#9a3412", 
    border: "#fb923c", 
    color: "#f97316",
    colorLight: "#fdba74"
  },
  teal: {
    bg: "#ccfbf1",
    bgDark: "#115e59",
    text: "#115e59",
    border: "#2dd4bf",
    color: "#14b8a6",
    colorLight: "#5eead4"
  },
  amber: {
    bg: "#fef08a",
    bgDark: "#92400e",
    text: "#92400e",
    border: "#fbbf24",
    color: "#f59e0b",
    colorLight: "#fcd34d"
  }
};

const THEMES = {
  light: {
    id: 'light',
    bg: "#FCFCFC", 
    sidebar: "#F8F8F7", 
    card: "#FFFFFF",
    text: "#0F0F0F", 
    textSec: "#525252",
    textMuted: "#A3A3A3",
    border: "#E8E8E7",
    borderLight: "#F3F3F2",
    accent: "#EA580C", 
    accentHover: "#C2410C",
    familyAccent: "#059669", 
    familyAccentHover: "#047857",
    selection: "#FED7AA",
    shadow: "0 1px 3px rgba(0, 0, 0, 0.04), 0 8px 16px rgba(0, 0, 0, 0.06)",
    shadowLg: "0 4px 6px rgba(0, 0, 0, 0.05), 0 20px 40px rgba(0, 0, 0, 0.08)",
    glass: "rgba(255, 255, 255, 0.92)",
    indicator: "#DC2626", 
    manifestoLine: "#D4D4D3",
    hoverBg: "rgba(0, 0, 0, 0.03)",
    activeBg: "rgba(0, 0, 0, 0.06)"
  },
  dark: {
    id: 'dark',
    bg: "#0A0A0A", 
    sidebar: "#141414",
    card: "#1A1A1A",
    text: "#FAFAFA",
    textSec: "#A3A3A3",
    textMuted: "#525252",
    border: "#262626",
    borderLight: "#1F1F1F",
    accent: "#F97316", 
    accentHover: "#FB923C",
    familyAccent: "#10B981",
    familyAccentHover: "#34D399",
    selection: "#422006",
    shadow: "0 2px 8px rgba(0, 0, 0, 0.4), 0 12px 32px rgba(0, 0, 0, 0.6)",
    shadowLg: "0 8px 16px rgba(0, 0, 0, 0.6), 0 24px 48px rgba(0, 0, 0, 0.8)",
    glass: "rgba(10, 10, 10, 0.92)",
    indicator: "#EF4444",
    manifestoLine: "#262626",
    hoverBg: "rgba(255, 255, 255, 0.06)",
    activeBg: "rgba(255, 255, 255, 0.1)"
  }
};

const DEFAULT_TAGS = {
  personal: [
    { id: 'work', name: "Business", bg: PALETTE.onyx.bg, bgDark: PALETTE.onyx.bgDark, text: PALETTE.onyx.text, border: PALETTE.onyx.border, color: PALETTE.onyx.color, colorLight: PALETTE.onyx.colorLight },
    { id: 'health', name: "Wellness", bg: PALETTE.rose.bg, bgDark: PALETTE.rose.bgDark, text: PALETTE.rose.text, border: PALETTE.rose.border, color: PALETTE.rose.color, colorLight: PALETTE.rose.colorLight },
    { id: 'finance', name: "Finance", bg: PALETTE.emerald.bg, bgDark: PALETTE.emerald.bgDark, text: PALETTE.emerald.text, border: PALETTE.emerald.border, color: PALETTE.emerald.color, colorLight: PALETTE.emerald.colorLight },
  ],
  family: [
    { id: 'family-events', name: "Events", bg: PALETTE.midnight.bg, bgDark: PALETTE.midnight.bgDark, text: PALETTE.midnight.text, border: PALETTE.midnight.border, color: PALETTE.midnight.color, colorLight: PALETTE.midnight.colorLight },
    { id: 'kids', name: "Kids", bg: PALETTE.lavender.bg, bgDark: PALETTE.lavender.bgDark, text: PALETTE.lavender.text, border: PALETTE.lavender.border, color: PALETTE.lavender.color, colorLight: PALETTE.lavender.colorLight },
    { id: 'household', name: "Household", bg: PALETTE.clay.bg, bgDark: PALETTE.clay.bgDark, text: PALETTE.clay.text, border: PALETTE.clay.border, color: PALETTE.clay.color, colorLight: PALETTE.clay.colorLight },
  ]
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
  :root { --ease: cubic-bezier(0.22, 1, 0.36, 1); --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; overflow: hidden; transition: background 0.4s var(--ease); }
  h1, h2, h3, .serif { font-family: 'Playfair Display', Georgia, serif; font-feature-settings: 'liga' 1, 'kern' 1; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(163, 163, 163, 0.3); border-radius: 10px; transition: background 0.2s; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(163, 163, 163, 0.5); }
  
  .fade-enter { animation: fadeIn 0.6s var(--ease) forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  
  .glass-panel { backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
  
  .btn-reset { 
    border: none; background: transparent; cursor: pointer; color: inherit; 
    font-family: inherit; display: flex; align-items: center; justify-content: center;
    transition: all 0.2s var(--ease);
  }
  
  .btn-hover:hover { 
    transform: translateY(-1px); 
  }
  
  .btn-hover:active { 
    transform: translateY(0); 
  }
  
  .tab-pill { 
    padding: 8px 16px; border-radius: 24px; font-size: 13px; font-weight: 500; 
    transition: all 0.3s var(--ease); user-select: none;
  }
  
  .tab-pill.active { 
    font-weight: 600; 
  }
  
  .input-luxe { 
    width: 100%; padding: 12px 16px; border-radius: 10px; font-size: 15px; 
    transition: all 0.2s var(--ease); border: 1.5px solid transparent; 
    font-family: inherit; letter-spacing: -0.01em;
  }
  
  .input-luxe:focus { 
    outline: none; 
  }
  
  /* Mini Calendar */
  .mini-cal-grid { 
    display: grid; grid-template-columns: repeat(7, 1fr); 
    gap: 3px; text-align: center; margin-top: 12px; 
  }
  
  .mini-cal-day { 
    font-size: 11px; padding: 8px 0; border-radius: 8px; 
    cursor: pointer; transition: all 0.2s var(--ease); 
    color: inherit; font-weight: 500; position: relative;
  }
  
  .mini-cal-day::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 8px;
    background: currentColor;
    opacity: 0;
    transition: opacity 0.2s var(--ease);
  }
  
  .mini-cal-day:hover::after { 
    opacity: 0.08;
  }
  
  .mini-cal-day.active { 
    font-weight: 700;
    position: relative;
  }
  
  /* Color Swatches */
  .color-swatch { 
    width: 28px; height: 28px; border-radius: 8px; cursor: pointer; 
    transition: all 0.2s var(--ease-spring); border: 2px solid transparent;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .color-swatch:hover { 
    transform: scale(1.15) translateY(-2px); 
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }
  
  .color-swatch:active { 
    transform: scale(1.05); 
  }
  
  .color-swatch.active { 
    border-color: currentColor; 
    box-shadow: 0 0 0 3px rgba(0,0,0,0.1);
  }
  
  /* Day View Journal Card */
  .event-card-journal { 
    transition: all 0.3s var(--ease); 
    border-left-width: 4px; 
    border-left-style: solid; 
  }
  
  .event-card-journal:hover { 
    transform: translateX(6px); 
  }

  /* Settings UI */
  .settings-row { 
    display: flex; justify-content: space-between; 
    align-items: center; padding: 16px 0; 
    border-bottom: 1px solid;
  }
  
  .settings-row:last-child {
    border-bottom: none;
  }
  
  .settings-label { 
    font-size: 14px; font-weight: 600; 
    letter-spacing: -0.01em; 
  }
  
  .settings-sub { 
    font-size: 12px; opacity: 0.6; 
    margin-top: 3px; 
  }
  
  /* Segmented Control */
  .segmented { 
    display: flex; padding: 4px; border-radius: 10px; 
    width: 100%; position: relative;
  }
  
  .seg-opt { 
    flex: 1; text-align: center; padding: 9px 12px; 
    font-size: 13px; font-weight: 500; cursor: pointer; 
    border-radius: 7px; color: inherit; 
    transition: all 0.2s var(--ease); position: relative;
    z-index: 1; user-select: none;
  }
  
  .seg-opt.active { 
    font-weight: 600; 
  }

  /* Switch */
  .switch-track { 
    width: 48px; height: 26px; border-radius: 13px; 
    position: relative; cursor: pointer; 
    transition: all 0.3s var(--ease); 
  }
  
  .switch-thumb { 
    width: 22px; height: 22px; border-radius: 50%; 
    background: #fff; position: absolute; top: 2px; left: 2px; 
    transition: all 0.3s var(--ease-spring); 
    box-shadow: 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.1); 
  }
  
  .switch-track.active .switch-thumb { 
    transform: translateX(22px); 
  }

  /* Year View Event Dots */
  .year-event-dot { 
    position: absolute; width: 5px; height: 5px; 
    border-radius: 50%; cursor: grab; 
    transition: all 0.2s var(--ease-spring); 
    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
  }
  
  .year-event-dot:active {
    cursor: grabbing;
  }
  
  .year-event-dot:hover { 
    transform: scale(1.6); 
    z-index: 10; 
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
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
    transform: translateX(2px);
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
  
  /* Improved focus states */
  *:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
  
  button:focus-visible {
    outline-offset: 3px;
  }
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
  
  const [tags, setTags] = useState(() => {
    const saved = localStorage.getItem('timeline_tags_v3');
    return saved ? JSON.parse(saved) : DEFAULT_TAGS;
  });
  
  const [activeTagIds, setActiveTagIds] = useState(() => {
    const currentTags = tags[context] || [];
    return currentTags.map(t => t.id);
  });
  
  const [quote, setQuote] = useState(QUOTES[0]);
  const [draggedEvent, setDraggedEvent] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  const [config, setConfig] = useState(() => JSON.parse(localStorage.getItem('timeline_v4_cfg')) || {
    darkMode: true, use24Hour: false, blurPast: true, weekStartMon: true
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
  useEffect(() => localStorage.setItem('timeline_tags_v3', JSON.stringify(tags)), [tags]);

  // Update active tags when context changes
  useEffect(() => {
    const currentTags = tags[context] || [];
    setActiveTagIds(currentTags.map(t => t.id));
  }, [context, tags]);

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

  const handleEventDrag = async (eventId, newDate) => {
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
      notify("Event moved.");
    } catch(e) {
      notify("Move failed.", "error");
    }
  };

  const notify = (msg, type='neutral') => {
    const id = Date.now();
    setNotifications(p => [...p, {id, msg, type}]);
    setTimeout(() => setNotifications(p => p.filter(n => n.id !== id)), 4000);
  };

  const currentTags = tags[context] || [];
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
      <aside style={{ width: LAYOUT.SIDEBAR_WIDTH, background: theme.sidebar, borderRight: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", padding: "32px 24px", zIndex: 50, overflowY: "auto" }}>
        <div style={{ marginBottom: 36 }}>
          <h1 className="serif" style={{ fontSize: 36, fontWeight: 700, color: theme.text, letterSpacing: "-0.02em", marginBottom: 6 }}>Timeline.</h1>
          <div style={{ fontSize: 13, color: theme.textSec, fontWeight: 500 }}>Welcome, <span style={{fontWeight:600, color: theme.text}}>{user.displayName?.split(" ")[0]}</span></div>
        </div>

        <div style={{ display: "flex", background: theme.borderLight, padding: 3, borderRadius: 14, marginBottom: 28, gap: 2 }}>
          <button onClick={() => setContext('personal')} className={`btn-reset tab-pill ${context==='personal'?'active':''}`} style={{ flex: 1, background: context==='personal' ? theme.card : 'transparent', color: context==='personal' ? theme.accent : theme.textSec, boxShadow: context==='personal' ? theme.shadow : 'none' }}>Personal</button>
          <button onClick={() => setContext('family')} className={`btn-reset tab-pill ${context==='family'?'active':''}`} style={{ flex: 1, background: context==='family' ? theme.card : 'transparent', color: context==='family' ? theme.familyAccent : theme.textSec, boxShadow: context==='family' ? theme.shadow : 'none' }}>Family</button>
        </div>

        <button onClick={() => { setEditingEvent(null); setModalOpen(true); }} className="btn-reset btn-hover" style={{ width: "100%", padding: "15px", borderRadius: 12, background: context==='family' ? theme.familyAccent : theme.accent, color: "#fff", fontSize: 14, fontWeight: 600, boxShadow: theme.shadow, marginBottom: 28, gap: 10, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = context==='family' ? theme.familyAccentHover : theme.accentHover} onMouseLeave={e => e.currentTarget.style.background = context==='family' ? theme.familyAccent : theme.accent}>
          <ICONS.Plus /> New Event
        </button>

        {/* Mini Calendar */}
        <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: `1px solid ${theme.border}` }}>
           <MiniCalendar currentDate={currentDate} setCurrentDate={setCurrentDate} theme={theme} config={config} context={context} />
        </div>

        {/* Tags */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
             <h4 style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: "uppercase", letterSpacing: 1.2 }}>Categories</h4>
             <button onClick={() => setTagManagerOpen(true)} className="btn-reset btn-hover" style={{ color: theme.textSec, padding: 6, borderRadius: 8, background: theme.hoverBg }} onMouseEnter={e => e.currentTarget.style.background = theme.activeBg} onMouseLeave={e => e.currentTarget.style.background = theme.hoverBg}><ICONS.Settings /></button>
          </div>
          {currentTags.map(t => (
            <div key={t.id} onClick={() => setActiveTagIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
              className="btn-hover tag-pill"
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", cursor: "pointer", opacity: activeTagIds.includes(t.id) ? 1 : 0.4, borderRadius: 10, marginBottom: 4, transition: 'all 0.2s', background: activeTagIds.includes(t.id) ? theme.hoverBg : 'transparent' }} onMouseEnter={e => !activeTagIds.includes(t.id) && (e.currentTarget.style.opacity = 0.6)} onMouseLeave={e => !activeTagIds.includes(t.id) && (e.currentTarget.style.opacity = 0.4)}>
              <div style={{ width: 12, height: 12, borderRadius: 6, background: config.darkMode ? t.colorLight : t.color, boxShadow: `0 0 0 2px ${theme.sidebar}`, border: `2px solid ${config.darkMode ? t.colorLight : t.color}` }} />
              <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>{t.name}</span>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", gap: 8 }}>
          <button onClick={() => setTrashOpen(true)} className="btn-reset btn-hover" style={{ color: theme.textSec, fontSize: 13, fontWeight: 600, gap: 8, padding: '8px 12px', borderRadius: 10, transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = theme.hoverBg; e.currentTarget.style.color = theme.text; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textSec; }}>
            <ICONS.Trash /> Trash
          </button>
          <button onClick={() => setSettingsOpen(true)} className="btn-reset btn-hover" style={{ color: theme.textSec, fontSize: 13, fontWeight: 600, gap: 8, padding: '8px 12px', borderRadius: 10, transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = theme.hoverBg; e.currentTarget.style.color = theme.text; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme.textSec; }}>
            <ICONS.Settings /> Settings
          </button>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        
        {/* Header */}
        <header style={{ height: LAYOUT.HEADER_HEIGHT, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", borderBottom: `1px solid ${theme.border}`, background: theme.bg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <h2 className="serif" style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em' }}>{viewMode === 'year' ? currentDate.getFullYear() : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => nav(-1)} className="btn-reset btn-hover" style={{ width: 36, height: 36, borderRadius: 18, border: `1px solid ${theme.border}`, background: theme.hoverBg, color: theme.text }} onMouseEnter={e => e.currentTarget.style.background = theme.activeBg} onMouseLeave={e => e.currentTarget.style.background = theme.hoverBg}><ICONS.ChevronLeft/></button>
              <button onClick={() => setCurrentDate(new Date())} className="btn-reset btn-hover" style={{ padding: "0 20px", height: 36, borderRadius: 18, border: `1px solid ${theme.border}`, fontSize: 13, fontWeight: 600, background: theme.hoverBg, color: theme.text, fontFamily: 'Inter' }} onMouseEnter={e => e.currentTarget.style.background = theme.activeBg} onMouseLeave={e => e.currentTarget.style.background = theme.hoverBg}>Today</button>
              <button onClick={() => nav(1)} className="btn-reset btn-hover" style={{ width: 36, height: 36, borderRadius: 18, border: `1px solid ${theme.border}`, background: theme.hoverBg, color: theme.text }} onMouseEnter={e => e.currentTarget.style.background = theme.activeBg} onMouseLeave={e => e.currentTarget.style.background = theme.hoverBg}><ICONS.ChevronRight/></button>
            </div>
          </div>
          <div style={{ display: "flex", background: theme.borderLight, padding: 4, borderRadius: 12, gap: 2 }}>
            {['day', 'week', 'month', 'year'].map(m => (
              <button key={m} onClick={() => setViewMode(m)} className={`btn-reset tab-pill ${viewMode===m?'active':''}`} style={{ background: viewMode===m ? theme.card : 'transparent', color: viewMode===m ? theme.text : theme.textMuted, textTransform: "capitalize", fontFamily: 'Inter', fontWeight: 600, boxShadow: viewMode===m ? theme.shadow : 'none' }}>{m}</button>
            ))}
          </div>
        </header>

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          
          {/* DAY VIEW */}
          {viewMode === 'day' && (
            <div className="fade-enter" style={{ padding: "40px 80px", maxWidth: 900, margin: "0 auto" }}>
              <div style={{ marginBottom: 60 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: context === 'family' ? theme.familyAccent : theme.accent, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8, fontFamily: 'Inter' }}>{currentDate.toLocaleDateString('en-US', {weekday:'long'})}</div>
                <h1 className="serif" style={{ fontSize: 64, fontWeight: 600, color: theme.text, letterSpacing: '-0.02em' }}>{currentDate.toDateString() === now.toDateString() ? "Today's Agenda" : currentDate.toLocaleDateString('en-US', {month:'long', day:'numeric'})}</h1>
              </div>
              <div style={{ position: "relative", borderLeft: `2px solid ${theme.manifestoLine}`, paddingLeft: 40 }}>
                {Array.from({length: 24}).map((_, h) => {
                  if (h < 5) return null;
                  const slotEvents = filteredEvents.filter(e => e.start.toDateString() === currentDate.toDateString() && e.start.getHours() === h);
                  return (
                    <div key={h} style={{ minHeight: 90, position: "relative", marginBottom: 20 }}>
                      <div className="serif" style={{ position: "absolute", left: -100, top: -8, fontSize: 18, color: theme.textMuted, width: 50, textAlign: "right", fontWeight: 600, letterSpacing: '-0.01em' }}>{config.use24Hour ? h : (h % 12 || 12) + (h<12?' AM':' PM')}</div>
                      <div style={{ position: "absolute", left: -44, top: 4, width: 9, height: 9, borderRadius: "50%", background: theme.sidebar, border: `3px solid ${theme.textMuted}` }} />
                      <div>
                        {slotEvents.map(ev => {
                          const tag = currentTags.find(t => t.id === ev.category) || currentTags[0];
                          const isPast = config.blurPast && ev.end < now;
                          return (
                            <div key={ev.id} onClick={() => { setEditingEvent(ev); setModalOpen(true); }} className={`event-card-journal ${isPast ? 'past-event' : ''}`} style={{ marginBottom: 16, cursor: "pointer", background: config.darkMode ? tag.bgDark : tag.bg, borderLeftColor: config.darkMode ? tag.colorLight : tag.color, padding: "20px 24px", borderRadius: 12, opacity: isPast ? 0.5 : 1, boxShadow: theme.shadow }}>
                              <div style={{ fontSize: 22, fontWeight: 600, color: config.darkMode ? '#FAFAFA' : tag.text, fontFamily: 'Playfair Display', marginBottom: 6, letterSpacing: '-0.02em' }}>{ev.title}</div>
                              <div style={{ display: "flex", gap: 16, fontSize: 13, color: config.darkMode ? theme.textSec : tag.text, alignItems: "center", fontWeight: 500, fontFamily: 'Inter', opacity: 0.8 }}>
                                <span style={{display:'flex', alignItems:'center', gap:6}}><ICONS.Clock/> {ev.start.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})} — {ev.end.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}</span>
                                {ev.location && <span style={{display:'flex', alignItems:'center', gap:6}}><ICONS.MapPin/> {ev.location}</span>}
                              </div>
                            </div>
                          );
                        })}
                        {slotEvents.length === 0 && <div style={{ height: 60, cursor: "pointer", borderRadius: 8, transition: 'background 0.2s' }} onClick={() => { const s = new Date(currentDate); s.setHours(h,0,0,0); setEditingEvent({ start: s, end: new Date(s.getTime()+3600000), title: "", category: currentTags[0].id }); setModalOpen(true); }} onMouseEnter={e => e.currentTarget.style.background = theme.hoverBg} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* YEAR VIEW WITH EVENTS */}
          {viewMode === 'year' && (
            <YearView 
              currentDate={currentDate} 
              events={filteredEvents} 
              theme={theme} 
              config={config} 
              tags={currentTags}
              context={context}
              onDayClick={(d) => { setCurrentDate(d); setViewMode('day'); }}
              onEventClick={(ev) => { setEditingEvent(ev); setModalOpen(true); }}
              onEventDrag={handleEventDrag}
              draggedEvent={draggedEvent}
              setDraggedEvent={setDraggedEvent}
            />
          )}

          {/* WEEK VIEW */}
          {viewMode === 'week' && <WeekView currentDate={currentDate} events={filteredEvents} theme={theme} config={config} tags={currentTags} onNew={(s,e) => { setEditingEvent({start:s, end:e, title:"", category: currentTags[0].id}); setModalOpen(true); }} onEventClick={(ev) => { setEditingEvent(ev); setModalOpen(true); }} />}
          
          {/* MONTH VIEW */}
          {viewMode === 'month' && <MonthView currentDate={currentDate} events={filteredEvents} theme={theme} config={config} setCurrentDate={setCurrentDate} setViewMode={setViewMode} />}
        </div>
      </div>

      {/* MODALS */}
      {settingsOpen && <SettingsModal config={config} setConfig={setConfig} theme={theme} onClose={() => setSettingsOpen(false)} />}
      {modalOpen && <EventEditor event={editingEvent} theme={theme} tags={currentTags} onSave={handleSave} onDelete={editingEvent?.id ? () => softDelete(editingEvent.id) : null} onCancel={() => setModalOpen(false)} config={config} />}
      {trashOpen && <TrashModal events={deletedEvents} theme={theme} onClose={() => setTrashOpen(false)} onRestore={(id) => restoreEvent(id)} onDelete={(id) => hardDelete(id)} />}
      {tagManagerOpen && <TagManager tags={tags} setTags={setTags} theme={theme} context={context} onClose={() => setTagManagerOpen(false)} />}

      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, display: "flex", flexDirection: "column", gap: 10 }}>{notifications.map(n => (<div key={n.id} className="fade-enter" style={{ padding: "14px 24px", background: n.type==='error' ? theme.indicator : theme.card, color: n.type==='error' ? '#fff' : theme.text, borderRadius: 12, boxShadow: theme.shadowLg, fontSize: 14, fontWeight: 600, fontFamily: 'Inter', border: `1px solid ${n.type==='error' ? theme.indicator : theme.border}` }}>{n.msg}</div>))}</div>
    </div>
  );
}

// ==========================================
// 4. SUB-COMPONENTS & UTILS
// ==========================================

function MiniCalendar({ currentDate, setCurrentDate, theme, config, context }) {
  const days = config.weekStartMon ? ["M","T","W","T","F","S","S"] : ["S","M","T","W","T","F","S"];
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  let startDay = startOfMonth.getDay();
  if (config.weekStartMon) startDay = startDay === 0 ? 6 : startDay - 1;
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const today = new Date();
  const accentColor = context === 'family' ? theme.familyAccent : theme.accent;

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
        <span style={{fontSize:13, fontWeight:700, color: theme.text, letterSpacing: '-0.02em'}}>{currentDate.toLocaleDateString('en-US', {month:'long', year:'numeric'})}</span>
        <div style={{display:'flex', gap:2}}>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()-1, 1))} className="btn-reset btn-hover" style={{color: theme.textSec, padding: 6, borderRadius: 8, background: theme.hoverBg}} onMouseEnter={e => e.currentTarget.style.background = theme.activeBg} onMouseLeave={e => e.currentTarget.style.background = theme.hoverBg}><ICONS.ChevronLeft/></button>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 1))} className="btn-reset btn-hover" style={{color: theme.textSec, padding: 6, borderRadius: 8, background: theme.hoverBg}} onMouseEnter={e => e.currentTarget.style.background = theme.activeBg} onMouseLeave={e => e.currentTarget.style.background = theme.hoverBg}><ICONS.ChevronRight/></button>
        </div>
      </div>
      <div className="mini-cal-grid">
        {days.map(d => <div key={d} style={{fontSize:10, color:theme.textMuted, fontWeight:700, paddingBottom: 4}}>{d}</div>)}
        {Array.from({length:startDay}).map((_,i) => <div key={`e-${i}`} />)}
        {Array.from({length:daysInMonth}).map((_,i) => {
          const day = i+1;
          const isToday = today.getDate() === day && today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
          const isSelected = currentDate.getDate() === day;
          return (
            <div key={day} className={`mini-cal-day ${isSelected?'active':''}`} onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))} style={{background: isSelected ? accentColor : isToday ? theme.selection : 'transparent', color: isSelected ? '#fff' : isToday ? (config.darkMode ? theme.text : theme.accent) : theme.text, position: 'relative', zIndex: 1}}>
              {day}
            </div>
          )
        })}
      </div>
    </div>
  );
}

function YearView({ currentDate, events, theme, config, tags, context, onDayClick, onEventClick, onEventDrag, draggedEvent, setDraggedEvent }) {
  const now = new Date();
  const accentColor = context === 'family' ? theme.familyAccent : theme.accent;
  
  const handleDragStart = (e, event) => {
    e.stopPropagation();
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
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
    <div className="fade-enter" style={{ padding: "40px", overflowX: "auto" }}>
      <div style={{ minWidth: 1200 }}>
        <div style={{ display: "flex", marginLeft: 100, marginBottom: 16 }}>
          {Array.from({length: LAYOUT.YEAR_COLS}).map((_,i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: 700, color: theme.textMuted, letterSpacing: '0.5px', fontFamily: 'Inter' }}>{(config.weekStartMon ? ["M","T","W","T","F","S","S"] : ["S","M","T","W","T","F","S"])[i%7]}</div>
          ))}
        </div>
        {Array.from({length: 12}).map((_, m) => {
          const monthStart = new Date(currentDate.getFullYear(), m, 1);
          const daysInMonth = new Date(currentDate.getFullYear(), m+1, 0).getDate();
          let offset = monthStart.getDay(); 
          if(config.weekStartMon) offset = offset===0 ? 6 : offset-1;
          
          return (
            <div key={m} style={{ display: "flex", alignItems: "center", marginBottom: 10, height: 40 }}>
              <div className="serif" style={{ width: 100, fontSize: 15, fontWeight: 600, color: theme.textSec, letterSpacing: '-0.01em' }}>{monthStart.toLocaleDateString('en-US',{month:'short'})}</div>
              <div style={{ flex: 1, display: "flex", gap: 2 }}>
                {Array.from({length: LAYOUT.YEAR_COLS}).map((_, col) => {
                  const dayNum = col - offset + 1;
                  if(dayNum < 1 || dayNum > daysInMonth) return <div key={col} style={{ flex: 1 }} />;
                  
                  const d = new Date(currentDate.getFullYear(), m, dayNum);
                  const isT = d.toDateString() === now.toDateString();
                  const dayEvents = events.filter(e => e.start.toDateString() === d.toDateString());
                  const isDragTarget = draggedEvent !== null;
                  
                  return (
                    <div 
                      key={col} 
                      className="year-day-cell"
                      onClick={() => !isDragTarget && onDayClick(d)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, d)}
                      style={{ 
                        flex: 1, 
                        height: 36, 
                        borderRadius: 8, 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        fontSize: 12, 
                        fontWeight: 600,
                        fontFamily: 'Inter',
                        cursor: isDragTarget ? "copy" : "pointer",
                        background: isT ? accentColor : dayEvents.length > 0 ? theme.hoverBg : "transparent",
                        color: isT ? "#fff" : dayEvents.length > 0 ? theme.text : theme.textSec,
                        border: isT ? `2px solid ${accentColor}` : `1px solid ${theme.borderLight}`, 
                        position: "relative",
                        transition: 'all 0.2s',
                        boxShadow: isT ? `0 0 0 3px ${theme.selection}` : 'none',
                        outline: isDragTarget ? `2px dashed ${accentColor}` : 'none',
                        outlineOffset: isDragTarget ? '2px' : '0'
                      }}
                      onMouseEnter={e => !isT && (e.currentTarget.style.background = theme.activeBg)}
                      onMouseLeave={e => !isT && (e.currentTarget.style.background = dayEvents.length > 0 ? theme.hoverBg : 'transparent')}
                    >
                      {dayNum}
                      {dayEvents.length > 0 && (
                        <div style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 3 }}>
                          {dayEvents.slice(0, 3).map(ev => {
                            const tag = tags.find(t => t.id === ev.category) || tags[0];
                            const isDragging = draggedEvent?.id === ev.id;
                            return (
                              <div
                                key={ev.id}
                                className="year-event-dot"
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, ev)}
                                onDragEnd={handleDragEnd}
                                onClick={(e) => { e.stopPropagation(); if (!isDragTarget) onEventClick(ev); }}
                                style={{ 
                                  background: config.darkMode ? tag.colorLight : tag.color,
                                  opacity: isDragging ? 0.3 : 1,
                                  cursor: 'grab'
                                }}
                                title={`${ev.title} (drag to move)`}
                              />
                            );
                          })}
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

function WeekView({ currentDate, events, theme, config, tags, onNew, onEventClick }) {
  const days = useMemo(() => {
    const s = new Date(currentDate);
    const day = s.getDay();
    const diff = s.getDate() - day + (config.weekStartMon ? (day === 0 ? -6 : 1) : 0);
    return Array.from({length:7}, (_,i) => { const d = new Date(s); d.setDate(diff + i); return d; });
  }, [currentDate, config.weekStartMon]);

  const HOUR_HEIGHT = 60 * LAYOUT.PIXELS_PER_MINUTE;

  return (
    <div style={{ display: "flex", minHeight: "100%" }}>
      <div style={{ width: 70, flexShrink: 0, borderRight: `1px solid ${theme.border}`, background: theme.sidebar, paddingTop: 60 }}>
        {Array.from({length:24}).map((_,h) => (
          <div key={h} style={{ height: HOUR_HEIGHT, position:"relative" }}>
            <span style={{ position:"absolute", top:-8, right:12, fontSize:11, color:theme.textMuted, fontWeight: 600 }}>{config.use24Hour ? `${h}:00` : `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, display: "flex" }}>
        {days.map((d, i) => {
          const isT = d.toDateString() === new Date().toDateString();
          const dEvents = events.filter(e => e.start.toDateString() === d.toDateString());
          return (
            <div key={i} style={{ flex: 1, borderRight: `1px solid ${theme.border}`, position: "relative", background: isT ? theme.selection : "transparent" }}>
              <div style={{ height: 60, borderBottom: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "sticky", top: 0, background: theme.sidebar, zIndex: 10, gap: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: isT ? theme.accent : theme.textMuted, letterSpacing: '0.5px' }}>{d.toLocaleDateString('en-US',{weekday:'short'}).toUpperCase()}</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: isT ? theme.accent : theme.text }}>{d.getDate()}</span>
              </div>
              <div style={{ position: "relative", height: 24 * HOUR_HEIGHT }}>
                {Array.from({length:24}).map((_,h) => <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: `1px solid ${theme.borderLight}`, boxSizing: "border-box" }} />)}
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
                    <div 
                      key={ev.id} 
                      className="btn-hover" 
                      onClick={() => onEventClick(ev)}
                      style={{ 
                        position: "absolute", 
                        top, 
                        height: h, 
                        left: 4, 
                        right: 4, 
                        background: config.darkMode ? tag.bgDark : tag.bg, 
                        borderLeft: `3px solid ${config.darkMode ? tag.colorLight : tag.color}`, 
                        borderRadius: 6, 
                        padding: 6, 
                        fontSize: 11, 
                        color: config.darkMode ? tag.colorLight : tag.text, 
                        cursor: "pointer", 
                        zIndex: 5, 
                        overflow: "hidden", 
                        boxShadow: theme.shadow,
                        fontWeight: 600
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: 2, letterSpacing: '-0.01em' }}>{ev.title}</div>
                      {h > 40 && <div style={{fontSize: 10, opacity: 0.8}}>{ev.start.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}</div>}
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
  let startDay = startOfMonth.getDay();
  if (config.weekStartMon) startDay = startDay === 0 ? 6 : startDay - 1;
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

  return (
    <div className="fade-enter" style={{ padding: 40, height: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', height: '100%', gap: 8 }}>
        {(config.weekStartMon ? ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] : ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]).map(d => (
          <div key={d} style={{ textAlign: 'center', fontWeight: 700, color: theme.textMuted, paddingBottom: 10, fontSize: 12, fontFamily: 'Inter', letterSpacing: '0.5px' }}>{d}</div>
        ))}
        {Array.from({length: startDay}).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({length: daysInMonth}).map((_, i) => {
          const day = i + 1;
          const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const dayEvents = events.filter(e => e.start.toDateString() === d.toDateString());
          const isToday = d.toDateString() === new Date().toDateString();
          
          return (
            <div key={day} onClick={() => { setCurrentDate(d); setViewMode('day'); }} 
              style={{ border: `1px solid ${theme.border}`, borderRadius: 10, padding: 10, minHeight: 100, cursor: 'pointer', background: isToday ? theme.selection : 'transparent', transition: 'all 0.2s' }}
              className="btn-hover"
              onMouseEnter={e => !isToday && (e.currentTarget.style.background = theme.hoverBg)}
              onMouseLeave={e => !isToday && (e.currentTarget.style.background = 'transparent')}>
              <div style={{ fontWeight: isToday ? 700 : 600, color: isToday ? theme.accent : theme.text, marginBottom: 6, fontSize: 14, fontFamily: 'Inter' }}>{day}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {dayEvents.slice(0,3).map(ev => (
                  <div key={ev.id} style={{ fontSize: 11, padding: "4px 6px", borderRadius: 4, background: theme.borderLight, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600, fontFamily: 'Inter' }}>
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && <div style={{ fontSize: 10, color: theme.textMuted, fontWeight: 600, fontFamily: 'Inter' }}>+{dayEvents.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingsModal({ config, setConfig, theme, onClose }) {
  return (
    <div className="glass-panel fade-enter" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 440, background: theme.card, padding: 32, borderRadius: 24, boxShadow: theme.shadowLg, border: `1px solid ${theme.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h3 className="serif" style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>Settings</h3>
          <button onClick={onClose} className="btn-reset btn-hover" style={{ padding: 8, borderRadius: 10, background: theme.hoverBg, color: theme.text }} onMouseEnter={e => e.currentTarget.style.background = theme.activeBg} onMouseLeave={e => e.currentTarget.style.background = theme.hoverBg}><ICONS.Close/></button>
        </div>
        
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 12, color: theme.textSec, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Appearance</label>
          <div className="segmented" style={{background: theme.borderLight}}>
            <div onClick={() => setConfig({...config, darkMode: false})} className={`seg-opt ${!config.darkMode?'active':''}`} style={{background: !config.darkMode ? theme.card : 'transparent', color: !config.darkMode ? theme.accent : theme.textSec, boxShadow: !config.darkMode ? theme.shadow : 'none'}}>☀ Light</div>
            <div onClick={() => setConfig({...config, darkMode: true})} className={`seg-opt ${config.darkMode?'active':''}`} style={{background: config.darkMode ? theme.card : 'transparent', color: config.darkMode ? theme.accent : theme.textSec, boxShadow: config.darkMode ? theme.shadow : 'none'}}>☾ Dark</div>
          </div>
        </div>
        
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 12, color: theme.textSec, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time Format</label>
          <div className="segmented" style={{background: theme.borderLight}}>
            <div onClick={() => setConfig({...config, use24Hour: false})} className={`seg-opt ${!config.use24Hour?'active':''}`} style={{background: !config.use24Hour ? theme.card : 'transparent', color: !config.use24Hour ? theme.text : theme.textSec, boxShadow: !config.use24Hour ? theme.shadow : 'none'}}>12-hour</div>
            <div onClick={() => setConfig({...config, use24Hour: true})} className={`seg-opt ${config.use24Hour?'active':''}`} style={{background: config.use24Hour ? theme.card : 'transparent', color: config.use24Hour ? theme.text : theme.textSec, boxShadow: config.use24Hour ? theme.shadow : 'none'}}>24-hour</div>
          </div>
        </div>
        
        <div className="settings-row" style={{borderBottomColor: theme.border}}>
          <div><div className="settings-label">Blur Past Events</div><div className="settings-sub">Reduce visual clutter</div></div>
          <div className={`switch-track ${config.blurPast?'active':''}`} style={{background: config.blurPast ? theme.accent : theme.borderLight}} onClick={() => setConfig({...config, blurPast:!config.blurPast})}><div className="switch-thumb"/></div>
        </div>
        
        <div className="settings-row" style={{borderBottomColor: theme.border}}>
          <div><div className="settings-label">Week Starts Monday</div><div className="settings-sub">Calendar alignment</div></div>
          <div className={`switch-track ${config.weekStartMon?'active':''}`} style={{background: config.weekStartMon ? theme.accent : theme.borderLight}} onClick={() => setConfig({...config, weekStartMon:!config.weekStartMon})}><div className="switch-thumb"/></div>
        </div>
        
        <button onClick={() => signOut(auth)} style={{ width: "100%", padding: "14px", borderRadius: 12, border: `2px solid ${theme.indicator}`, color: theme.indicator, background: "transparent", fontWeight: 700, cursor: "pointer", marginTop: 24, fontSize: 14, letterSpacing: '0.02em', transition: 'all 0.2s' }} className="btn-hover" onMouseEnter={e => e.currentTarget.style.background = `${theme.indicator}15`} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Sign Out</button>
      </div>
    </div>
  );
}

function TagManager({ tags, setTags, theme, context, onClose }) {
  const [newTag, setNewTag] = useState("");
  const [color, setColor] = useState("onyx");

  const currentTags = tags[context] || [];

  const addTag = () => {
    if(!newTag.trim()) return;
    const palette = PALETTE[color];
    const id = newTag.toLowerCase().replace(/\s+/g,'-') + '-' + Date.now();
    setTags({
      ...tags,
      [context]: [...currentTags, { 
        id, 
        name: newTag, 
        bg: palette.bg,
        bgDark: palette.bgDark,
        text: palette.text,
        border: palette.border,
        color: palette.color,
        colorLight: palette.colorLight
      }]
    });
    setNewTag("");
  };

  const deleteTag = (tagId) => {
    setTags({
      ...tags,
      [context]: currentTags.filter(t => t.id !== tagId)
    });
  };

  return (
    <div className="glass-panel fade-enter" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 480, background: theme.card, padding: 32, borderRadius: 24, boxShadow: theme.shadowLg, border: `1px solid ${theme.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h3 className="serif" style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Manage Tags</h3>
            <div style={{fontSize: 13, color: theme.textSec, fontWeight: 600}}>{context === 'personal' ? 'Personal' : 'Family'} Context</div>
          </div>
          <button onClick={onClose} className="btn-reset btn-hover" style={{ padding: 8, borderRadius: 10, background: theme.hoverBg, color: theme.text }} onMouseEnter={e => e.currentTarget.style.background = theme.activeBg} onMouseLeave={e => e.currentTarget.style.background = theme.hoverBg}><ICONS.Close/></button>
        </div>
        
        <div style={{ marginBottom: 24, padding: 20, background: theme.borderLight, borderRadius: 16 }}>
          <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="New tag name..." className="input-luxe" style={{ color: theme.text, marginBottom: 14, background: theme.card, border: `1.5px solid ${theme.border}` }} onKeyPress={e => e.key === 'Enter' && addTag()} />
          
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Color Palette</label>
            <div style={{ display: "flex", gap: 10, flexWrap: 'wrap' }}>
              {Object.keys(PALETTE).map(key => (
                <div 
                  key={key} 
                  className={`color-swatch ${color === key ? 'active' : ''}`} 
                  style={{ 
                    background: PALETTE[key].color,
                    borderColor: color === key ? theme.text : 'transparent'
                  }} 
                  onClick={() => setColor(key)} 
                  title={key}
                />
              ))}
            </div>
          </div>
          
          <button onClick={addTag} style={{ width: "100%", padding: "12px", background: context === 'family' ? theme.familyAccent : theme.accent, color: "#fff", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, boxShadow: theme.shadow, transition: 'all 0.2s' }} className="btn-hover" onMouseEnter={e => e.currentTarget.style.background = context === 'family' ? theme.familyAccentHover : theme.accentHover} onMouseLeave={e => e.currentTarget.style.background = context === 'family' ? theme.familyAccent : theme.accent}>Create Tag</button>
        </div>
        
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Current Tags ({currentTags.length})</label>
          {currentTags.map((t) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", marginBottom: 6, borderRadius: 10, background: theme.hoverBg, border: `1px solid ${theme.borderLight}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 14, height: 14, borderRadius: 7, background: t.color, boxShadow: `0 0 0 2px ${theme.card}` }} />
                <span style={{fontWeight: 600, fontSize: 14}}>{t.name}</span>
              </div>
              <button onClick={() => deleteTag(t.id)} className="btn-reset btn-hover" style={{ color: theme.indicator, padding: 6, borderRadius: 8 }} onMouseEnter={e => e.currentTarget.style.background = `${theme.indicator}15`} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><ICONS.Trash/></button>
            </div>
          ))}
          {currentTags.length === 0 && (
            <div style={{textAlign: 'center', padding: 40, color: theme.textMuted, fontStyle: 'italic'}}>No tags yet. Create your first one!</div>
          )}
        </div>
      </div>
    </div>
  );
}

function EventEditor({ event, theme, tags, onSave, onDelete, onCancel, config }) {
  const [data, setData] = useState({ 
    title: event?.title || "", 
    category: event?.category || tags[0]?.id || '',
    start: event?.start ? event.start.toTimeString().slice(0,5) : "09:00",
    end: event?.end ? event.end.toTimeString().slice(0,5) : "10:00",
    description: event?.description || "", 
    location: event?.location || ""
  });

  const submit = () => {
    if (!data.title.trim()) return;
    const s = new Date(event?.start || new Date()); 
    const [sh, sm] = data.start.split(':'); 
    s.setHours(parseInt(sh), parseInt(sm));
    const e = new Date(s); 
    const [eh, em] = data.end.split(':'); 
    e.setHours(parseInt(eh), parseInt(em));
    onSave({ ...data, id: event?.id, start: s, end: e });
  };

  return (
    <div className="glass-panel fade-enter" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }} onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 480, background: theme.card, padding: 32, borderRadius: 24, boxShadow: theme.shadowLg, border: `1px solid ${theme.border}` }}>
        <h3 className="serif" style={{ fontSize: 28, fontWeight: 600, marginBottom: 28, letterSpacing: '-0.02em' }}>{event?.id ? "Edit Event" : "New Event"}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <input autoFocus value={data.title} onChange={e => setData({...data, title: e.target.value})} placeholder="Event title..." className="input-luxe" style={{ fontSize: 18, fontWeight: 600, background: theme.bg, color: theme.text, border: `1.5px solid ${theme.border}` }} />
          
          <div style={{ display: "flex", gap: 12 }}>
            <input type="time" value={data.start} onChange={e => setData({...data, start: e.target.value})} className="input-luxe" style={{ color: theme.text, background: theme.bg, border: `1.5px solid ${theme.border}` }} />
            <input type="time" value={data.end} onChange={e => setData({...data, end: e.target.value})} className="input-luxe" style={{ color: theme.text, background: theme.bg, border: `1.5px solid ${theme.border}` }} />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Category</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {tags.map(t => (
                <button key={t.id} onClick={() => setData({...data, category: t.id})} className="btn-reset btn-hover" style={{ padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, border: `2px solid ${data.category===t.id ? (config.darkMode ? t.colorLight : t.color) : theme.border}`, background: data.category===t.id ? (config.darkMode ? t.bgDark : t.bg) : 'transparent', color: data.category===t.id ? (config.darkMode ? t.colorLight : t.text) : theme.text, transition: 'all 0.2s' }}>{t.name}</button>
              ))}
            </div>
          </div>
          
          <input value={data.location} onChange={e => setData({...data, location: e.target.value})} placeholder="Location (optional)" className="input-luxe" style={{ color: theme.text, background: theme.bg, border: `1.5px solid ${theme.border}` }} />
          <textarea value={data.description} onChange={e => setData({...data, description: e.target.value})} placeholder="Description (optional)" className="input-luxe" style={{ minHeight: 90, resize: "none", color: theme.text, background: theme.bg, border: `1.5px solid ${theme.border}`, fontFamily: 'inherit' }} />
          
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 20, borderTop: `1px solid ${theme.border}` }}>
            {onDelete ? <button onClick={onDelete} className="btn-reset btn-hover" style={{ color: theme.indicator, fontWeight: 700, padding: '8px 16px', borderRadius: 10 }} onMouseEnter={e => e.currentTarget.style.background = `${theme.indicator}15`} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Delete</button> : <div/>}
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={onCancel} className="btn-reset btn-hover" style={{ color: theme.textSec, fontWeight: 600, padding: '10px 20px', borderRadius: 10 }} onMouseEnter={e => e.currentTarget.style.background = theme.hoverBg} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Cancel</button>
              <button onClick={submit} className="btn-reset btn-hover" style={{ padding: "10px 28px", borderRadius: 10, background: theme.accent, color: "#fff", fontWeight: 700, boxShadow: theme.shadow, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = theme.accentHover} onMouseLeave={e => e.currentTarget.style.background = theme.accent}>Save</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrashModal({ events, theme, onClose, onRestore, onDelete }) {
  return (
    <div className="glass-panel fade-enter" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 540, height: "70vh", background: theme.card, padding: 32, borderRadius: 24, boxShadow: theme.shadowLg, display: "flex", flexDirection: "column", border: `1px solid ${theme.border}` }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems: 'center', marginBottom:28}}>
          <div>
            <h3 className="serif" style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 }}>Trash</h3>
            <div style={{fontSize: 13, color: theme.textSec, fontWeight: 600}}>{events.length} deleted event{events.length !== 1 ? 's' : ''}</div>
          </div>
          <button onClick={onClose} className="btn-reset btn-hover" style={{ padding: 8, borderRadius: 10, background: theme.hoverBg, color: theme.text }} onMouseEnter={e => e.currentTarget.style.background = theme.activeBg} onMouseLeave={e => e.currentTarget.style.background = theme.hoverBg}><ICONS.Close/></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {events.length === 0 && <div style={{textAlign:'center', color:theme.textMuted, marginTop:80, fontStyle:'italic', fontSize: 15}}>Trash is empty</div>}
          {events.map(ev => (
            <div key={ev.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 18, marginBottom: 8, borderRadius: 12, background: theme.hoverBg, border: `1px solid ${theme.borderLight}` }}>
              <div style={{flex: 1}}>
                <div style={{fontWeight:700, marginBottom:6, fontSize: 15}}>{ev.title}</div>
                <div style={{fontSize:12, color:theme.textSec, fontWeight: 600}}>{ev.start.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})} • {ev.context}</div>
              </div>
              <div style={{display:'flex', gap:8}}>
                <button onClick={() => onRestore(ev.id)} className="btn-hover" style={{ padding: "8px 16px", borderRadius: 8, background: theme.accent, color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, boxShadow: theme.shadow, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = theme.accentHover} onMouseLeave={e => e.currentTarget.style.background = theme.accent}>Restore</button>
                <button onClick={() => onDelete(ev.id)} className="btn-hover" style={{ padding: "8px 16px", borderRadius: 8, border: `2px solid ${theme.indicator}`, color: theme.indicator, background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 700, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = `${theme.indicator}15`} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>Delete</button>
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
    <div style={{ height: "100vh", background: "linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, rgba(249, 115, 22, 0.05) 0%, transparent 50%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        <h1 className="serif" style={{ fontSize: 72, color: "#FAFAFA", marginBottom: 16, fontWeight: 700, letterSpacing: "-0.03em" }}>Timeline.</h1>
        <p style={{ color: "#A3A3A3", marginBottom: 48, fontSize: 18, fontFamily: "Playfair Display", fontStyle: "italic", fontWeight: 500 }}>"Time is the luxury you cannot buy."</p>
        <button onClick={onLogin} className="btn-hover" style={{ padding: "18px 48px", borderRadius: 14, background: "#EA580C", color: "#fff", border: "none", fontSize: 14, textTransform: "uppercase", letterSpacing: 2, cursor: "pointer", fontWeight: 700, boxShadow: "0 8px 24px rgba(234, 88, 12, 0.3)", transition: 'all 0.3s' }} onMouseEnter={e => { e.currentTarget.style.background = "#C2410C"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(234, 88, 12, 0.4)"; }} onMouseLeave={e => { e.currentTarget.style.background = "#EA580C"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(234, 88, 12, 0.3)"; }}>Enter Timeline</button>
      </div>
    </div>
  );
}