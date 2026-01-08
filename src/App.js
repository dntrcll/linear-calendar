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
  YEAR_COLS: 38,
  LINEAR_YEAR_DAY_WIDTH: 2 // pixels per day in linear view
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
  Settings: ({...props}) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.72l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
  Trash: ({...props}) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Plus: ({...props}) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  ChevronLeft: ({...props}) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevronRight: ({...props}) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Close: ({...props}) => <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Calendar: ({...props}) => <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Clock: ({...props}) => <svg {...props} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  MapPin: ({...props}) => <svg {...props} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Finance: ({...props}) => <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Health: ({...props}) => <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
};

const PALETTE = {
  onyx: { bg: "#27272a", text: "#f4f4f5", border: "#52525b", color: "#27272a", darkBg: "#18181b" },
  ceramic: { bg: "#f5f5f4", text: "#44403c", border: "#d6d3d1", color: "#f5f5f4", darkBg: "#292524" },
  gold: { bg: "#fffbeb", text: "#92400e", border: "#fcd34d", color: "#fffbeb", darkBg: "#78350f" },
  emerald: { bg: "#ecfdf5", text: "#065f46", border: "#6ee7b7", color: "#ecfdf5", darkBg: "#064e3b" },
  rose: { bg: "#fff1f2", text: "#9f1239", border: "#fda4af", color: "#fff1f2", darkBg: "#881337" },
  midnight: { bg: "#eff6ff", text: "#1e3a8a", border: "#93c5fd", color: "#eff6ff", darkBg: "#1e3a8a" },
  lavender: { bg: "#fdf4ff", text: "#86198f", border: "#f0abfc", color: "#fdf4ff", darkBg: "#86198f" },
  clay: { bg: "#fff7ed", text: "#9a3412", border: "#fdba74", color: "#fff7ed", darkBg: "#7c2d12" }
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
    manifestoLine: "#D6D3D1"
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
    manifestoLine: "#292524"
  }
};

const DEFAULT_TAGS = [
  { id: 'work',    name: "Business", ...PALETTE.onyx },
  { id: 'health',  name: "Wellness", ...PALETTE.rose },
  { id: 'finance', name: "Finance",  ...PALETTE.emerald },
  { id: 'personal',name: "Personal", ...PALETTE.midnight },
  { id: 'family',  name: "Family",   ...PALETTE.gold },
  { id: 'travel',  name: "Travel",   ...PALETTE.lavender }
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

  /* Linear Year View */
  .linear-year-container { position: relative; height: 100%; }
  .linear-year-timeline { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
  .linear-year-day { position: absolute; height: 30px; border-right: 1px solid rgba(0,0,0,0.1); pointer-events: none; }
  .linear-year-event { position: absolute; cursor: move; transition: all 0.2s ease; border-radius: 3px; overflow: hidden; }
  .linear-year-event:hover { transform: scale(1.02); z-index: 10 !important; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
  .linear-year-event.dragging { opacity: 0.8; z-index: 100 !important; cursor: grabbing; }
  .linear-year-event-content { padding: 2px 4px; font-size: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Settings UI */
  .settings-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .settings-label { font-size: 14px; font-weight: 500; }
  .settings-sub { font-size: 12px; opacity: 0.6; margin-top: 2px; }
  
  /* Segmented Control */
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
  
  // Drag state for linear year view
  const [draggingEvent, setDraggingEvent] = useState(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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
  const linearYearRef = useRef(null);
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

  const handleSave = async (data) => {
    if(!user) return;
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
      if(data.id) {
        await updateDoc(doc(db, "events", data.id), payload);
      } else { 
        payload.createdAt = serverTimestamp(); 
        await addDoc(collection(db, "events"), payload); 
      }
      setModalOpen(false); 
      loadData(user); 
      notify("Event saved.");
    } catch(e) { notify("Save failed.", "error"); }
  };

  const softDelete = async (id) => {
    if(!window.confirm("Move to trash?")) return;
    try { 
      await updateDoc(doc(db, "events", id), { deleted: true, deletedAt: serverTimestamp() }); 
      setModalOpen(false); 
      loadData(user); 
      notify("Moved to trash."); 
    } catch(e) { notify("Delete failed.", "error"); }
  };

  const restoreEvent = async (id) => {
    try { 
      await updateDoc(doc(db, "events", id), { deleted: false }); 
      loadData(user); 
      notify("Event restored."); 
    } catch(e) {}
  };

  const hardDelete = async (id) => {
    if(!window.confirm("Permanently destroy?")) return;
    try { 
      await deleteDoc(doc(db, "events", id)); 
      loadData(user); 
      notify("Permanently deleted."); 
    } catch(e) {}
  };

  const notify = (msg, type='neutral') => {
    const id = Date.now();
    setNotifications(p => [...p, {id, msg, type}]);
    setTimeout(() => setNotifications(p => p.filter(n => n.id !== id)), 4000);
  };

  // Filter events based on context and active tags
  const filteredEvents = useMemo(() => 
    events.filter(e => e.context === context && activeTagIds.includes(e.category)), 
    [events, context, activeTagIds]
  );

  // Calculate upcoming events for the sidebar
  const upcomingEvents = useMemo(() => 
    events
      .filter(e => e.context === context && e.start > now && !e.deleted)
      .sort((a,b) => a.start - b.start)
      .slice(0, 3), 
    [events, now, context]
  );

  const nav = (amt) => {
    const d = new Date(currentDate);
    if(viewMode === 'year') d.setFullYear(d.getFullYear() + amt);
    else if(viewMode === 'week') d.setDate(d.getDate() + (amt*7));
    else if(viewMode === 'month') d.setMonth(d.getMonth() + amt);
    else d.setDate(d.getDate() + amt);
    setCurrentDate(d);
  };

  // Linear Year View Drag Handlers
  const handleDragStart = (event, eventId) => {
    if (viewMode !== 'linear-year') return;
    setDraggingEvent(eventId);
    setDragStartPos({ x: event.clientX, y: event.clientY });
    setDragOffset({ x: 0, y: 0 });
    
    // Prevent text selection during drag
    event.preventDefault();
  };

  const handleDragMove = useCallback((e) => {
    if (!draggingEvent || !linearYearRef.current) return;
    
    const rect = linearYearRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragStartPos.x;
    const y = e.clientY - rect.top - dragStartPos.y;
    
    setDragOffset({ x, y });
  }, [draggingEvent, dragStartPos]);

  const handleDragEnd = async () => {
    if (!draggingEvent || !linearYearRef.current) return;
    
    const draggedEvent = events.find(e => e.id === draggingEvent);
    if (!draggedEvent) return;
    
    const daysOffset = Math.round(dragOffset.x / LAYOUT.LINEAR_YEAR_DAY_WIDTH);
    
    if (daysOffset !== 0) {
      const newStart = new Date(draggedEvent.start);
      newStart.setDate(newStart.getDate() + daysOffset);
      
      const newEnd = new Date(draggedEvent.end);
      newEnd.setDate(newEnd.getDate() + daysOffset);
      
      try {
        await updateDoc(doc(db, "events", draggingEvent), {
          startTime: Timestamp.fromDate(newStart),
          endTime: Timestamp.fromDate(newEnd),
          updatedAt: serverTimestamp()
        });
        
        loadData(user);
        notify(`Event moved ${daysOffset} day${Math.abs(daysOffset) !== 1 ? 's' : ''}`);
      } catch (e) {
        notify("Move failed.", "error");
      }
    }
    
    setDraggingEvent(null);
    setDragOffset({ x: 0, y: 0 });
  };

  // Add event listeners for drag
  useEffect(() => {
    if (draggingEvent) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [draggingEvent, handleDragMove]);

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

        {/* Upcoming Events */}
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Upcoming</h4>
          {upcomingEvents.length === 0 ? (
            <div style={{ fontSize: 12, color: theme.textMuted, textAlign: 'center', padding: '12px' }}>No upcoming events</div>
          ) : (
            upcomingEvents.map(ev => {
              const tag = tags.find(t => t.id === ev.category) || tags[0];
              return (
                <div key={ev.id} onClick={() => { setEditingEvent(ev); setModalOpen(true); }} className="btn-hover" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 6, borderRadius: 8, background: theme.card, cursor: "pointer", border: `1px solid ${theme.border}` }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: tag.color || tag.text }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{ev.title}</div>
                    <div style={{ fontSize: 10, color: theme.textMuted }}>{ev.start.toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
                  </div>
                </div>
              );
            })
          )}
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
            <h2 className="serif" style={{ fontSize: 32, fontWeight: 500 }}>
              {viewMode === 'year' || viewMode === 'linear-year' ? currentDate.getFullYear() : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => nav(-1)} className="btn-reset btn-hover" style={{ width: 36, height: 36, borderRadius: 18, border: `1px solid ${theme.border}` }}><ICONS.ChevronLeft/></button>
              <button onClick={() => setCurrentDate(new Date())} className="btn-reset btn-hover" style={{ padding: "0 20px", height: 36, borderRadius: 18, border: `1px solid ${theme.border}`, fontSize: 13, fontWeight: 500 }}>Today</button>
              <button onClick={() => nav(1)} className="btn-reset btn-hover" style={{ width: 36, height: 36, borderRadius: 18, border: `1px solid ${theme.border}` }}><ICONS.ChevronRight/></button>
            </div>
          </div>
          <div style={{ display: "flex", background: theme.sidebar, padding: 4, borderRadius: 12 }}>
            {['day', 'week', 'month', 'year', 'linear-year'].map(m => (
              <button key={m} onClick={() => setViewMode(m)} className={`btn-reset tab-pill ${viewMode===m?'active':''}`} style={{ background: viewMode===m ? theme.card : 'transparent', color: viewMode===m ? theme.text : theme.textMuted, textTransform: "capitalize" }}>
                {m.replace('-', ' ')}
              </button>
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

          {/* TRADITIONAL YEAR VIEW */}
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

          {/* LINEAR YEAR VIEW */}
          {viewMode === 'linear-year' && (
            <LinearYearView 
              ref={linearYearRef}
              currentDate={currentDate}
              events={filteredEvents}
              tags={tags}
              theme={theme}
              config={config}
              draggingEvent={draggingEvent}
              dragOffset={dragOffset}
              onEventClick={(ev) => { setEditingEvent(ev); setModalOpen(true); }}
              onEventDragStart={handleDragStart}
              onEventDrop={() => setDraggingEvent(null)}
            />
          )}

          {/* WEEK VIEW */}
          {viewMode === 'week' && <WeekView currentDate={currentDate} events={filteredEvents} theme={theme} config={config} tags={tags} onNew={(s,e) => { setEditingEvent({start:s, end:e, title:"", category: tags[0].id}); setModalOpen(true); }} />}
          
          {/* MONTH VIEW */}
          {viewMode === 'month' && <MonthView currentDate={currentDate} events={filteredEvents} theme={theme} config={config} setCurrentDate={setCurrentDate} setViewMode={setViewMode} />}
        </div>
      </div>

      {/* MODALS */}
      {settingsOpen && <SettingsModal config={config} setConfig={setConfig} theme={theme} onClose={() => setSettingsOpen(false)} />}
      {modalOpen && <EventEditor event={editingEvent} theme={theme} tags={tags} onSave={handleSave} onDelete={editingEvent?.id ? () => softDelete(editingEvent.id) : null} onCancel={() => setModalOpen(false)} />}
      {trashOpen && <TrashModal events={deletedEvents} theme={theme} onClose={() => setTrashOpen(false)} onRestore={(id) => restoreEvent(id)} onDelete={(id) => hardDelete(id)} />}
      {tagManagerOpen && <TagManager tags={tags} setTags={setTags} theme={theme} onClose={() => setTagManagerOpen(false)} />}

      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, display: "flex", flexDirection: "column", gap: 10 }}>{notifications.map(n => (<div key={n.id} className="fade-enter" style={{ padding: "12px 24px", background: n.type==='error' ? theme.indicator : theme.card, color: n.type==='error' ? '#fff' : theme.text, borderRadius: 8, boxShadow: "0 10px 40px rgba(0,0,0,0.2)", fontSize: 13, fontWeight: 600 }}>{n.msg}</div>))}</div>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>
          {currentDate.toLocaleDateString('en-US', {month:'long', year:'numeric'})}
        </span>
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
          const isToday = today.getDate() === day && today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
          const isSelected = currentDate.getDate() === day && currentDate.getMonth() === currentDate.getMonth();
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

const LinearYearView = React.forwardRef(({ 
  currentDate, 
  events, 
  tags, 
  theme, 
  config, 
  draggingEvent, 
  dragOffset, 
  onEventClick, 
  onEventDragStart, 
  onEventDrop 
}, ref) => {
  
  const totalDays = isLeapYear(currentDate.getFullYear()) ? 366 : 365;
  const containerWidth = totalDays * LAYOUT.LINEAR_YEAR_DAY_WIDTH;
  const today = new Date();
  const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
  
  // Calculate day of year for a date
  const getDayOfYear = (date) => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };
  
  // Helper to check if year is leap year
  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }
  
  // Position events on timeline
  const positionedEvents = useMemo(() => {
    return events.map(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const startDay = getDayOfYear(eventStart) - 1; // Zero-indexed
      const endDay = getDayOfYear(eventEnd) - 1;
      const durationDays = Math.max(1, endDay - startDay + 1);
      
      const tag = tags.find(t => t.id === event.category) || tags[0];
      
      return {
        ...event,
        startDay,
        durationDays,
        tag,
        width: durationDays * LAYOUT.LINEAR_YEAR_DAY_WIDTH,
        left: startDay * LAYOUT.LINEAR_YEAR_DAY_WIDTH,
        row: 0 // Simple single row for now
      };
    }).sort((a, b) => a.startDay - b.startDay);
  }, [events, tags]);
  
  // Simple row packing algorithm
  const packedEvents = useMemo(() => {
    const rows = [];
    const eventRows = [];
    
    positionedEvents.forEach(event => {
      let placed = false;
      
      // Try to place in existing row
      for (let i = 0; i < rows.length; i++) {
        const lastEvent = rows[i][rows[i].length - 1];
        if (!lastEvent || lastEvent.startDay + lastEvent.durationDays <= event.startDay) {
          rows[i].push(event);
          eventRows[i] = [...(eventRows[i] || []), event];
          event.row = i;
          placed = true;
          break;
        }
      }
      
      // Create new row if needed
      if (!placed) {
        rows.push([event]);
        eventRows.push([event]);
        event.row = rows.length - 1;
      }
    });
    
    return positionedEvents;
  }, [positionedEvents]);

  return (
    <div className="fade-enter" style={{ padding: "20px 40px", height: "100%" }}>
      <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 10 }}>
        Drag events horizontally to move them. Click to edit.
      </div>
      <div 
        ref={ref}
        className="linear-year-container" 
        style={{ 
          height: "calc(100% - 40px)", 
          overflowX: "auto", 
          overflowY: "hidden",
          position: "relative",
          border: `1px solid ${theme.border}`,
          borderRadius: 8,
          background: theme.sidebar
        }}
      >
        {/* Month markers */}
        {Array.from({length: 12}).map((_, month) => {
          const monthStart = new Date(currentDate.getFullYear(), month, 1);
          const daysInMonth = new Date(currentDate.getFullYear(), month + 1, 0).getDate();
          const startDay = getDayOfYear(monthStart) - 1;
          const width = daysInMonth * LAYOUT.LINEAR_YEAR_DAY_WIDTH;
          
          return (
            <div key={month} style={{
              position: "absolute",
              left: startDay * LAYOUT.LINEAR_YEAR_DAY_WIDTH,
              top: 0,
              width: width,
              height: "100%",
              borderRight: `1px solid ${theme.border}`,
              padding: "4px 8px",
              fontSize: 10,
              fontWeight: 600,
              color: theme.textSec,
              background: month % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)"
            }}>
              {monthStart.toLocaleDateString('en-US', {month: 'short'})}
            </div>
          );
        })}
        
        {/* Today marker */}
        {today.getFullYear() === currentDate.getFullYear() && (
          <div style={{
            position: "absolute",
            left: getDayOfYear(today) * LAYOUT.LINEAR_YEAR_DAY_WIDTH,
            top: 0,
            height: "100%",
            width: 2,
            background: theme.accent,
            zIndex: 5
          }} />
        )}
        
        {/* Events */}
        {packedEvents.map(event => {
          const isDragging = draggingEvent === event.id;
          const dragX = isDragging ? dragOffset.x : 0;
          
          return (
            <div
              key={event.id}
              className={`linear-year-event ${isDragging ? 'dragging' : ''}`}
              style={{
                position: "absolute",
                left: event.left + dragX,
                top: 20 + (event.row * 35),
                width: event.width,
                height: 25,
                background: config.darkMode ? event.tag.darkBg : event.tag.bg,
                borderLeft: `3px solid ${event.tag.color}`,
                zIndex: isDragging ? 100 : event.row + 1,
                transform: isDragging ? 'scale(1.05)' : 'none',
                cursor: "move"
              }}
              onClick={(e) => {
                if (!isDragging) onEventClick(event);
              }}
              onMouseDown={(e) => onEventDragStart(e, event.id)}
              onMouseUp={onEventDrop}
            >
              <div className="linear-year-event-content" style={{ color: event.tag.text }}>
                {event.title}
                <div style={{ fontSize: 8, opacity: 0.8 }}>
                  {event.start.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

function WeekView({ currentDate, events, theme, config, tags, onNew }) {
  const days = useMemo(() => {
    const s = new Date(currentDate);
    const day = s.getDay();
    const diff = s.getDate() - day + (config.weekStartMon ? (day === 0 ? -6 : 1) : 0);
    return Array.from({length:7}, (_,i) => { const d = new Date(s); d.setDate(diff + i); return d; });
  }, [currentDate, config.weekStartMon]);

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

function SettingsModal({ config, setConfig, theme, onClose }) {
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
        <div className="settings-row">
          <div><div className="settings-label">Blur Past Dates</div><div className="settings-sub">Fade old days</div></div>
          <div className={`switch-track ${config.blurPast?'active':''}`} onClick={() => setConfig({...config, blurPast:!config.blurPast})}><div className="switch-thumb"/></div>
        </div>
        <div className="settings-row">
          <div><div className="settings-label">Week Starts Monday</div><div className="settings-sub">Align calendar</div></div>
          <div className={`switch-track ${config.weekStartMon?'active':''}`} onClick={() => setConfig({...config, weekStartMon:!config.weekStartMon})}><div className="switch-thumb"/></div>
        </div>
        <button onClick={() => signOut(auth)} style={{ width: "100%", padding: "14px", borderRadius: 12, border: `1px solid ${theme.indicator}`, color: theme.indicator, background: "transparent", fontWeight: 600, cursor: "pointer" }}>Sign Out</button>
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

  const removeTag = (tagId) => {
    if (tags.length <= 1) {
      alert("You must have at least one tag");
      return;
    }
    setTags(tags.filter(tg => tg.id !== tagId));
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
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {Object.keys(PALETTE).map(key => (
              <div key={key} className={`color-swatch ${color === key ? 'active' : ''}`} style={{ background: PALETTE[key].bg, borderColor: PALETTE[key].border }} onClick={() => setColor(key)} title={key} />
            ))}
          </div>
          <button onClick={addTag} style={{ width: "100%", padding: "12px", background: theme.accent, color: "#fff", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600 }}>Create Tag</button>
        </div>
        <div style={{ maxHeight: 300, overflowY: "auto" }}>
          {tags.map((t, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${theme.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: t.color || t.text }} />
                <span>{t.name}</span>
              </div>
              <button onClick={() => removeTag(t.id)} className="btn-reset" style={{ color: theme.indicator }}><ICONS.Trash/></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EventEditor({ event, theme, tags, onSave, onDelete, onCancel }) {
  const [data, setData] = useState({ 
    title: event?.title || "", 
    category: event?.category || tags[0].id,
    start: event?.start ? event.start.toTimeString().slice(0,5) : "09:00",
    end: event?.end ? event.end.toTimeString().slice(0,5) : "10:00",
    description: event?.description || "", 
    location: event?.location || ""
  });

  const submit = () => {
    const s = new Date(event?.start || new Date()); 
    const [sh, sm] = data.start.split(':'); 
    s.setHours(sh, sm);
    const e = new Date(s); 
    const [eh, em] = data.end.split(':'); 
    e.setHours(eh, em);
    
    // Ensure end is after start
    if (e <= s) {
      e.setHours(s.getHours() + 1);
    }
    
    onSave({ ...data, id: event?.id, start: s, end: e });
  };

  return (
    <div className="glass-panel" onClick={e => e.stopPropagation()} style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }}>
      <div style={{ width: 440, background: theme.card, padding: 32, borderRadius: 24, boxShadow: theme.shadow }}>
        <h3 className="serif" style={{ fontSize: 24, marginBottom: 24 }}>{event?.id ? "Edit Event" : "Create Event"}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input autoFocus value={data.title} onChange={e => setData({...data, title: e.target.value})} placeholder="Title" className="input-luxe" style={{ fontSize: 18, fontWeight: 600, background: theme.bg, color: theme.text }} />
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: theme.textSec, marginBottom: 4 }}>Start</div>
              <input type="time" value={data.start} onChange={e => setData({...data, start: e.target.value})} className="input-luxe" style={{ color: theme.text }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: theme.textSec, marginBottom: 4 }}>End</div>
              <input type="time" value={data.end} onChange={e => setData({...data, end: e.target.value})} className="input-luxe" style={{ color: theme.text }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tags.map(t => (
              <button key={t.id} onClick={() => setData({...data, category: t.id})} className="btn-reset" style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, border: `1px solid ${data.category===t.id ? t.color : theme.border}`, background: data.category===t.id ? t.bg : "transparent", color: data.category===t.id ? t.text : theme.text }}>{t.name}</button>
            ))}
          </div>
          <input value={data.location} onChange={e => setData({...data, location: e.target.value})} placeholder="Location (optional)" className="input-luxe" style={{ color: theme.text }} />
          <textarea value={data.description} onChange={e => setData({...data, description: e.target.value})} placeholder="Notes (optional)" className="input-luxe" style={{ minHeight: 80, resize: "none", color: theme.text }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
            {onDelete ? <button onClick={onDelete} className="btn-reset" style={{ color: theme.indicator, fontWeight: 600 }}>Delete</button> : <div/>}
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={onCancel} className="btn-reset" style={{ padding: "10px 24px", borderRadius: 8, border: `1px solid ${theme.border}`, color: theme.textSec, fontWeight: 600 }}>Cancel</button>
              <button onClick={submit} className="btn-reset" style={{ padding: "10px 24px", borderRadius: 8, background: theme.accent, color: "#fff", fontWeight: 600 }}>Save</button>
            </div>
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
              <div>
                <div style={{fontWeight:600}}>{ev.title}</div>
                <div style={{fontSize:12, color:theme.textMuted}}>
                  {ev.start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <div style={{display:'flex', gap:8}}>
                <button onClick={() => onRestore(ev.id)} style={{ padding: "6px 12px", borderRadius: 6, background: theme.accent, color: "#fff", border: "none", cursor: "pointer", fontSize: 12 }}>Restore</button>
                <button onClick={() => onDelete(ev.id)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${theme.indicator}`, color: theme.indicator, background: "transparent", cursor: "pointer", fontSize: 12 }}>Purge</button>
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
    </div>
  );
}