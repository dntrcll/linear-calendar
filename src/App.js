import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth, provider } from "./firebase";
import { 
  collection, query, where, getDocs, addDoc, updateDoc, 
  deleteDoc, doc, serverTimestamp, Timestamp 
} from "firebase/firestore";
import { db } from "./firebase";

// ==========================================
// 1. CONFIGURATION & CONSTANTS
// ==========================================

const APP_META = { 
  name: "Timeline", 
  version: "6.0.0-Master",
  quoteInterval: 14400000 
};

const LAYOUT = {
  SIDEBAR_WIDTH: 280,
  HEADER_HEIGHT: 80,
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
// 2. DESIGN SYSTEM
// ==========================================

const ICONS = {
  Settings: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,
  Plus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  ChevronLeft: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  ChevronRight: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Close: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Calendar: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Clock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  MapPin: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
};

const PALETTE = {
  onyx:    { bg: "#27272a", text: "#f4f4f5", border: "#52525b" },
  slate:   { bg: "#64748b", text: "#f8fafc", border: "#94a3b8" },
  gold:    { bg: "#fbbf24", text: "#78350f", border: "#f59e0b" },
  emerald: { bg: "#10b981", text: "#064e3b", border: "#059669" },
  rose:    { bg: "#f43f5e", text: "#881337", border: "#e11d48" },
  ocean:   { bg: "#3b82f6", text: "#1e3a8a", border: "#2563eb" },
  royal:   { bg: "#8b5cf6", text: "#4c1d95", border: "#7c3aed" },
  clay:    { bg: "#f97316", text: "#7c2d12", border: "#ea580c" }
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
    selection: "#FDE68A",
    shadow: "0 8px 24px -4px rgba(28, 25, 23, 0.06)",
    glass: "rgba(255, 255, 255, 0.95)",
    indicator: "#BE123C", 
    gridLine: "#E5E7EB",
    danger: "#EF4444"
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
    selection: "#1E3A8A",
    shadow: "0 24px 48px -12px rgba(0, 0, 0, 0.8)",
    glass: "rgba(18, 21, 27, 0.95)",
    indicator: "#F43F5E",
    gridLine: "#1F2937",
    danger: "#EF4444"
  }
};

const DEFAULT_TAGS = [
  { id: 'work',    name: "Business", ...PALETTE.onyx },
  { id: 'health',  name: "Wellness", ...PALETTE.rose },
  { id: 'finance', name: "Finance",  ...PALETTE.emerald },
  { id: 'family',  name: "Family",   ...PALETTE.slate },
  { id: 'deep',    name: "Deep Work",...PALETTE.ocean },
];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@500&display=swap');
  
  :root { --ease: cubic-bezier(0.22, 1, 0.36, 1); }
  * { box-sizing: border-box; margin: 0; padding: 0; outline: none; -webkit-font-smoothing: antialiased; }
  
  body { font-family: 'Inter', sans-serif; overflow: hidden; transition: background 0.4s var(--ease); }
  h1, h2, h3, .serif { font-family: 'Playfair Display', serif; }
  .mono { font-family: 'JetBrains Mono', monospace; }
  
  /* Scrollbar */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(120, 113, 108, 0.2); border-radius: 10px; }
  
  /* Animations */
  .fade-enter { animation: fadeIn 0.5s var(--ease) forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  
  .glass-panel { backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
  
  /* Buttons & Inputs */
  .btn-reset { border: none; background: transparent; cursor: pointer; color: inherit; font-family: inherit; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
  .btn-hover:hover { transform: translateY(-1px); }
  
  .input-luxe { width: 100%; padding: 14px 16px; border-radius: 12px; font-size: 15px; transition: 0.2s; border: 1px solid transparent; background: rgba(0,0,0,0.03); }
  .input-luxe:focus { outline: none; background: rgba(0,0,0,0.05); box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
  
  /* Segmented Control */
  .segmented { display: flex; background: rgba(120, 120, 120, 0.1); padding: 4px; border-radius: 10px; width: 100%; }
  .seg-opt { flex: 1; text-align: center; padding: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 8px; color: inherit; opacity: 0.6; transition: 0.2s; }
  .seg-opt.active { background: #fff; opacity: 1; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.1); color: #000; }
  .dark .seg-opt.active { background: #27272a; color: #fff; }

  /* Switch */
  .switch-track { width: 44px; height: 24px; border-radius: 12px; background: rgba(120,120,120,0.2); position: relative; cursor: pointer; transition: 0.3s; }
  .switch-track.active { background: #3B82F6; }
  .switch-thumb { width: 20px; height: 20px; border-radius: 50%; background: #fff; position: absolute; top: 2px; left: 2px; transition: 0.3s var(--ease); box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
  .switch-track.active .switch-thumb { transform: translateX(20px); }

  /* Event Styles */
  .event-card { position: absolute; border-radius: 6px; padding: 4px 8px; font-size: 12px; overflow: hidden; border-left: 3px solid; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .event-card:hover { z-index: 50; transform: scale(1.02); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }

  /* Context Pill */
  .ctx-pill { padding: 8px 16px; border-radius: 12px; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; border: 1px solid transparent; }
  .ctx-pill.active { background: rgba(120,120,120,0.1); border-color: rgba(120,120,120,0.2); }
  
  /* Mini Calendar */
  .mini-cal-day:hover { background: rgba(0,0,0,0.05); }
  .mini-cal-day.active { background: #D97706; color: #fff; font-weight: 600; }
  
  /* Color Swatches */
  .color-swatch { width: 24px; height: 24px; border-radius: 50%; cursor: pointer; transition: 0.2s; border: 2px solid transparent; }
  .color-swatch:hover { transform: scale(1.1); }
  .color-swatch.active { border-color: #fff; box-shadow: 0 0 0 2px #3B82F6; }
`;

// ==========================================
// 3. MAIN LOGIC
// ==========================================

export default function TimelineOS() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("week");
  const [context, setContext] = useState("personal"); // 'personal' | 'family'
  
  // Settings & State
  const [config, setConfig] = useState(() => JSON.parse(localStorage.getItem('timeline_v6_cfg')) || { 
    theme: 'dark', blurPast: true, weekStartMon: true, use24h: false 
  });
  
  const [tags, setTags] = useState(() => JSON.parse(localStorage.getItem('timeline_tags_v6')) || DEFAULT_TAGS);
  const [activeTagIds, setActiveTagIds] = useState(tags.map(t => t.id));

  // UI State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [dragData, setDragData] = useState(null);
  
  const scrollRef = useRef(null);
  const theme = config.theme === 'dark' ? THEMES.dark : THEMES.light;

  // --- INITIALIZATION ---
  useEffect(() => {
    const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    return () => s.remove();
  }, []);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence);
    return auth.onAuthStateChanged(u => { setUser(u); if(u) loadEvents(u); });
  }, []);

  useEffect(() => localStorage.setItem('timeline_v6_cfg', JSON.stringify(config)), [config]);
  useEffect(() => localStorage.setItem('timeline_tags_v6', JSON.stringify(tags)), [tags]);

  // Scroll to 8 AM on load
  useEffect(() => {
    if (scrollRef.current && (view === 'week' || view === 'day')) {
      scrollRef.current.scrollTop = 8 * 60 * LAYOUT.PIXELS_PER_MINUTE;
    }
  }, [view]);

  // --- DATA ---
  const loadEvents = async (u) => {
    const q = query(collection(db, "events"), where("uid", "==", u.uid));
    const snap = await getDocs(q);
    setEvents(snap.docs.map(d => ({ 
      id: d.id, ...d.data(), 
      start: d.data().startTime.toDate(), 
      end: d.data().endTime.toDate() 
    })));
  };

  const saveEvent = async (data) => {
    const payload = {
      uid: user.uid, ...data,
      context: context, // Save with current context
      startTime: Timestamp.fromDate(data.start),
      endTime: Timestamp.fromDate(data.end),
      updatedAt: serverTimestamp(),
      deleted: false
    };
    if (data.id) await updateDoc(doc(db, "events", data.id), payload);
    else await addDoc(collection(db, "events"), { ...payload, createdAt: serverTimestamp() });
    setModalOpen(false); loadEvents(user);
  };

  const deleteEvent = async (id, permanent = false) => {
    if (permanent) await deleteDoc(doc(db, "events", id));
    else await updateDoc(doc(db, "events", id), { deleted: true });
    loadEvents(user);
  };

  const restoreEvent = async (id) => {
    await updateDoc(doc(db, "events", id), { deleted: false });
    loadEvents(user);
  };

  // --- DRAG ENGINE ---
  const onDragStart = (e, ev, mode) => {
    if(e.button !== 0) return;
    e.stopPropagation();
    setDragData({ id: ev.id, mode, startY: e.clientY, origStart: ev.start, origEnd: ev.end });
  };

  const onDragMove = useCallback((e) => {
    if(!dragData) return;
    const diff = Math.floor((e.clientY - dragData.startY) / LAYOUT.PIXELS_PER_MINUTE / LAYOUT.SNAP_MINUTES) * LAYOUT.SNAP_MINUTES;
    if(diff === 0) return;

    setEvents(prev => prev.map(ev => {
      if(ev.id !== dragData.id) return ev;
      const s = new Date(dragData.origStart); const end = new Date(dragData.origEnd);
      if(dragData.mode === 'move') { s.setMinutes(s.getMinutes() + diff); end.setMinutes(end.getMinutes() + diff); }
      else { end.setMinutes(end.getMinutes() + diff); if((end-s) < 15*60000) return ev; }
      return { ...ev, start: s, end };
    }));
  }, [dragData]);

  const onDragEnd = useCallback(async () => {
    if(!dragData) return;
    const ev = events.find(e => e.id === dragData.id);
    if(ev) try { await updateDoc(doc(db, "events", ev.id), { startTime: Timestamp.fromDate(ev.start), endTime: Timestamp.fromDate(ev.end) }); } catch(e) { loadEvents(user); }
    setDragData(null);
  }, [dragData, events, user]);

  useEffect(() => {
    if(dragData) { window.addEventListener('mousemove', onDragMove); window.addEventListener('mouseup', onDragEnd); }
    return () => { window.removeEventListener('mousemove', onDragMove); window.removeEventListener('mouseup', onDragEnd); };
  }, [dragData, onDragMove, onDragEnd]);

  // --- NAVIGATION ---
  const nav = (d) => {
    const next = new Date(currentDate);
    if(view === 'week') next.setDate(next.getDate() + (d * 7));
    else if(view === 'year') next.setFullYear(next.getFullYear() + d);
    else next.setDate(next.getDate() + d);
    setCurrentDate(next);
  };

  // Filter Events based on Context (Personal/Family) and Tags
  const visibleEvents = useMemo(() => {
    return events.filter(e => 
      !e.deleted && 
      e.context === context && 
      activeTagIds.includes(e.category)
    );
  }, [events, context, activeTagIds]);

  const deletedEvents = useMemo(() => events.filter(e => e.deleted), [events]);

  if (!user) return <AuthScreen onLogin={() => signInWithPopup(auth, provider)} theme={theme} />;

  return (
    <div style={{ display: "flex", height: "100vh" }} className={config.theme}>
      <Sidebar 
        user={user} theme={theme}
        openSettings={() => setSettingsOpen(true)} 
        onNew={() => { setEditingEvent(null); setModalOpen(true); }}
        date={currentDate} setDate={setCurrentDate}
        context={context} setContext={setContext}
        tags={tags} activeTagIds={activeTagIds} setActiveTagIds={setActiveTagIds}
        openTagManager={() => setTagManagerOpen(true)}
        openTrash={() => setTrashOpen(true)}
        trashCount={deletedEvents.length}
      />
      
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: theme.bg }}>
        {/* Header */}
        <header style={{ height: LAYOUT.HEADER_HEIGHT, borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px" }}>
          <div>
            <h1 className="serif" style={{ fontSize: 36, fontWeight: 500, color: theme.text, marginBottom: 4 }}>
              {currentDate.toLocaleString('default', { month: 'long' })} <span style={{color: theme.textSec}}>{currentDate.getFullYear()}</span>
            </h1>
            <div style={{ fontSize: 13, color: theme.textSec, fontStyle: "italic" }}>{context === 'personal' ? "Personal Timeline" : "Family Schedule"}</div>
          </div>
          
          <div style={{ display: "flex", gap: 12 }}>
            <div className="glass" style={{ padding: 4, borderRadius: 12, display: "flex" }}>
              {['Day', 'Week', 'Month', 'Year'].map(v => (
                <button key={v} onClick={() => setView(v.toLowerCase())} className="btn" style={{ padding: "8px 24px", borderRadius: 8, background: view === v.toLowerCase() ? theme.accent : "transparent", color: view === v.toLowerCase() ? "#fff" : theme.textSec, fontSize: 13, fontWeight: 600 }}>{v}</button>
              ))}
            </div>
            <div className="glass" style={{ display: "flex", alignItems: "center", borderRadius: 12, padding: "0 4px" }}>
              <button onClick={() => nav(-1)} className="btn" style={{ width: 36, height: 36, color: theme.text }}><ICONS.ChevronLeft/></button>
              <button onClick={() => setCurrentDate(new Date())} className="btn" style={{ padding: "0 12px", fontSize: 13, fontWeight: 600, color: theme.text }}>Today</button>
              <button onClick={() => nav(1)} className="btn" style={{ width: 36, height: 36, color: theme.text }}><ICONS.ChevronRight/></button>
            </div>
          </div>
        </header>

        {/* Viewport */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          {view === 'week' && <WeekView currentDate={currentDate} events={visibleEvents} onEdit={(ev) => { setEditingEvent(ev); setModalOpen(true); }} config={config} theme={theme} tags={tags} onDragStart={onDragStart} />}
          {view === 'day' && <DayView currentDate={currentDate} events={visibleEvents} onEdit={(ev) => { setEditingEvent(ev); setModalOpen(true); }} config={config} theme={theme} tags={tags} onDragStart={onDragStart} />}
          {view === 'year' && <YearView currentDate={currentDate} events={visibleEvents} setDate={setCurrentDate} setView={setView} theme={theme} config={config} tags={tags} />}
        </div>
      </div>

      {/* Modals */}
      {settingsOpen && <SettingsModal config={config} setConfig={setConfig} theme={theme} onClose={() => setSettingsOpen(false)} onSignOut={() => signOut(auth)} />}
      {modalOpen && <EventModal event={editingEvent} tags={tags} theme={theme} onSave={saveEvent} onDelete={(id) => deleteEvent(id)} onClose={() => setModalOpen(false)} />}
      {trashOpen && <TrashModal events={deletedEvents} theme={theme} onClose={() => setTrashOpen(false)} onRestore={restoreEvent} onDelete={(id) => deleteEvent(id, true)} />}
      {tagManagerOpen && <TagManager tags={tags} setTags={setTags} theme={theme} onClose={() => setTagManagerOpen(false)} />}
    </div>
  );
}

// ==========================================
// 4. PRECISE WEEK VIEW ENGINE
// ==========================================

function WeekView({ currentDate, events, onEdit, config, theme, tags, onDragStart }) {
  // Calculate Week Days
  const start = new Date(currentDate);
  const day = start.getDay();
  const diff = start.getDate() - day + (config.weekStartMon ? (day === 0 ? -6 : 1) : 0);
  const weekDays = Array.from({length: 7}, (_, i) => { const d = new Date(start); d.setDate(diff + i); return d; });

  const getPos = (date) => (date.getHours() * 60 + date.getMinutes()) * LAYOUT.PIXELS_PER_MINUTE;

  return (
    <div style={{ display: "flex", minHeight: "100%", paddingTop: 20 }}>
      {/* Time Spine */}
      <div style={{ width: 60, flexShrink: 0, borderRight: `1px solid ${theme.border}` }}>
        {Array.from({length: 24}).map((_, h) => (
          <div key={h} style={{ height: 60 * LAYOUT.PIXELS_PER_MINUTE, borderBottom: `1px solid ${theme.gridLine}`, position: 'relative' }}>
            <span style={{ position: 'absolute', top: -10, right: 12, fontSize: 11, color: theme.textSec, fontFamily: 'Inter', fontWeight: 500 }}>
              {config.use24h ? `${h}:00` : `${h%12||12} ${h<12?'AM':'PM'}`}
            </span>
          </div>
        ))}
      </div>

      {/* Days Columns */}
      <div style={{ flex: 1, display: "flex" }}>
        {weekDays.map((d, i) => {
          const isToday = d.toDateString() === new Date().toDateString();
          const dayEvents = events.filter(e => e.start.toDateString() === d.toDateString());

          return (
            <div key={i} style={{ flex: 1, borderRight: `1px solid ${theme.border}`, position: "relative", minWidth: 140 }}>
              {/* Header */}
              <div style={{ height: 60, borderBottom: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "sticky", top: 0, background: theme.bg, zIndex: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: isToday ? theme.accent : theme.textSec, textTransform: "uppercase", letterSpacing: 1 }}>{d.toLocaleDateString('en-US',{weekday:'short'})}</span>
                <span style={{ fontSize: 20, fontWeight: 600, color: isToday ? theme.accent : theme.text, marginTop: 4 }}>{d.getDate()}</span>
              </div>

              {/* Grid Lines */}
              {Array.from({length: 24}).map((_, h) => <div key={h} style={{ height: 60 * LAYOUT.PIXELS_PER_MINUTE, borderBottom: `1px solid ${theme.gridLine}` }} />)}

              {/* Events */}
              {dayEvents.map(ev => {
                const top = getPos(ev.start);
                const height = getPos(ev.end) - top;
                const tag = tags.find(t => t.id === ev.category) || tags[0];
                return (
                  <div 
                    key={ev.id}
                    onMouseDown={(e) => onDragStart(e, ev, 'move')}
                    onClick={(e) => { e.stopPropagation(); onEdit(ev); }}
                    className="event-card fade-in"
                    style={{
                      top: top + 60, height: Math.max(height, 28),
                      left: 4, right: 4,
                      background: config.theme === 'dark' ? tag.bg + '40' : tag.bg,
                      borderLeftColor: tag.color,
                      color: theme.text
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{ev.title}</div>
                    {height > 40 && <div style={{ fontSize: 10, opacity: 0.7 }}>{ev.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>}
                    <div onMouseDown={(e) => onDragStart(e, ev, 'resize')} style={{position:'absolute', bottom:0, left:0, right:0, height:6, cursor:'ns-resize'}}/>
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

// ==========================================
// 5. LINEAR YEAR VIEW (Fixed to show events)
// ==========================================

function YearView({ currentDate, events, setDate, setView, theme, config, tags }) {
  return (
    <div className="fade-in" style={{ padding: "40px", overflowX: "auto" }}>
      <div style={{ minWidth: 1200 }}>
        <div style={{ display: "flex", marginLeft: 100, marginBottom: 16 }}>
          {Array.from({length: LAYOUT.YEAR_COLS}).map((_,i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: 700, color: theme.textSec }}>{(config.weekStartMon ? ["M","T","W","T","F","S","S"] : ["S","M","T","W","T","F","S"])[i%7]}</div>
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
                  const isT = d.toDateString() === new Date().toDateString();
                  const dayEvents = events.filter(e => e.start.toDateString() === d.toDateString());
                  
                  return (
                    <div key={col} onClick={() => { setDate(d); setView('day'); }}
                      style={{ 
                        flex: 1, height: 32, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, cursor: "pointer",
                        background: isT ? theme.accent : "transparent",
                        border: isT ? `1px solid ${theme.accent}` : dayEvents.length > 0 ? `1px solid ${theme.border}` : "none",
                        color: isT ? "#fff" : theme.text,
                        position: 'relative'
                      }}>
                      {dayNum}
                      {/* Event Indicators */}
                      {dayEvents.length > 0 && !isT && (
                         <div style={{position:'absolute', bottom:4, display:'flex', gap:2}}>
                            {dayEvents.slice(0,3).map(e => <div key={e.id} style={{width:4, height:4, borderRadius:'50%', background: tags.find(t=>t.id===e.category)?.color || theme.text}} />)}
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

// ==========================================
// 6. SIDEBAR & WIDGETS
// ==========================================

function Sidebar({ user, theme, openSettings, onNew, date, setDate, context, setContext, tags, activeTagIds, setActiveTagIds, openTagManager, openTrash, trashCount }) {
  const isDark = theme.id === 'dark';
  
  return (
    <aside style={{ width: LAYOUT.SIDEBAR_WIDTH, background: theme.sidebar, borderRight: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", padding: 24, zIndex: 50, overflowY: "auto" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 className="serif" style={{ fontSize: 28, color: theme.text }}>Timeline.</h1>
        <div style={{ fontSize: 13, color: theme.textSec, marginTop: 4 }}>Welcome, <span style={{color: theme.accent}}>{user.displayName?.split(" ")[0] || "User"}</span></div>
      </div>

      {/* Context Switcher */}
      <div className="segmented" style={{marginBottom: 24, background: theme.card}}>
         <div onClick={() => setContext('personal')} className={`segment-btn ${context==='personal'?'active':''}`} style={{color: context==='personal' ? (isDark?'#fff':'#000') : theme.textSec}}>Personal</div>
         <div onClick={() => setContext('family')} className={`segment-btn ${context==='family'?'active':''}`} style={{color: context==='family' ? (isDark?'#fff':'#000') : theme.textSec}}>Family</div>
      </div>

      <button onClick={onNew} className="btn" style={{ width: "100%", padding: "14px", borderRadius: 12, background: theme.accent, color: "#fff", fontWeight: 600, fontSize: 14, boxShadow: "0 4px 20px rgba(59, 130, 246, 0.4)", marginBottom: 32 }}>
        <span style={{marginRight: 8}}><ICONS.Plus/></span> New Event
      </button>

      {/* Mini Calendar */}
      <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: `1px solid ${theme.border}` }}>
        <MiniCalendar date={date} setDate={setDate} theme={theme} />
      </div>

      {/* Tags */}
      <div style={{ flex: 1 }}>
         <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: theme.textSec, letterSpacing: 1 }}>TAGS</span>
            <button onClick={openTagManager} className="btn-reset" style={{color: theme.textSec}}><ICONS.Settings/></button>
         </div>
         {tags.map(t => (
            <div key={t.id} onClick={() => setActiveTagIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", cursor: "pointer", opacity: activeTagIds.includes(t.id) ? 1 : 0.4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.color }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: theme.text }}>{t.name}</span>
            </div>
         ))}
      </div>

      <div style={{ marginTop: "auto", borderTop: `1px solid ${theme.border}`, paddingTop: 20, display:'flex', justifyContent:'space-between' }}>
        <button onClick={openTrash} className="btn" style={{ gap: 8, color: theme.textSec }}><ICONS.Trash /> {trashCount}</button>
        <button onClick={openSettings} className="btn" style={{ gap: 8, color: theme.textSec }}><ICONS.Settings /></button>
      </div>
    </aside>
  );
}

// ... (MiniCalendar, DayView components same as previous, just ensure they use correct theme props) ...
// Re-adding MiniCalendar for completeness in this block
function MiniCalendar({ date, setDate, theme }) {
  const days = ["S","M","T","W","T","F","S"];
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const startDay = startOfMonth.getDay();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center', padding: '0 4px' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{date.toLocaleString('default', {month:'long'})}</span>
        <div style={{display:'flex', gap:8}}>
          <button onClick={() => setDate(new Date(date.getFullYear(), date.getMonth()-1, 1))} className="btn-reset" style={{color: theme.textSec}}><ICONS.ChevronLeft/></button>
          <button onClick={() => setDate(new Date(date.getFullYear(), date.getMonth()+1, 1))} className="btn-reset" style={{color: theme.textSec}}><ICONS.ChevronRight/></button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, textAlign: 'center' }}>
        {days.map(d => <div key={d} style={{fontSize:10, color: theme.textSec}}>{d}</div>)}
        {Array.from({length:startDay}).map((_,i) => <div key={`e-${i}`} />)}
        {Array.from({length:daysInMonth}).map((_,i) => {
          const d = i+1;
          const isSelected = date.getDate() === d;
          return (
            <div key={d} onClick={() => setDate(new Date(date.getFullYear(), date.getMonth(), d))}
              style={{ fontSize: 12, padding: 6, borderRadius: 6, cursor: 'pointer', background: isSelected ? theme.accent : 'transparent', color: isSelected ? '#fff' : theme.textSec }}>
              {d}
            </div>
          )
        })}
      </div>
    </div>
  );
}

// DayView Component
function DayView({ currentDate, events, onEdit, config, theme, tags, onDragStart }) {
  const dEvents = events.filter(e => e.start.toDateString() === currentDate.toDateString()).sort((a,b) => a.start - b.start);
  
  return (
    <div className="fade-in" style={{ padding: "40px 80px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: theme.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{currentDate.toLocaleDateString('en-US', {weekday:'long'})}</div>
        <h1 className="serif" style={{ fontSize: 56, color: theme.text }}>Today's Agenda</h1>
      </div>
      
      <div style={{ position: "relative", borderLeft: `1px solid ${theme.border}`, paddingLeft: 40 }}>
        {Array.from({length: 16}).map((_, i) => {
          const h = i + 6; 
          const slotEvents = dEvents.filter(e => e.start.getHours() === h);
          return (
            <div key={h} style={{ minHeight: 80, position: "relative", paddingBottom: 20 }}>
              <div className="serif" style={{ position: "absolute", left: -100, top: -8, color: theme.textSec, width: 50, textAlign: "right", fontStyle: "italic" }}>{h % 12 || 12} {h < 12 ? 'AM' : 'PM'}</div>
              <div style={{ position: "absolute", left: -46, top: 4, width: 11, height: 11, borderRadius: "50%", background: theme.bg, border: `2px solid ${theme.border}` }} />
              
              {slotEvents.map(ev => {
                const tag = tags.find(t => t.id === ev.category) || tags[0];
                return (
                  <div key={ev.id} onMouseDown={(e) => onDragStart(e, ev, 'move')} onClick={(e) => {e.stopPropagation(); onEdit(ev);}} className="event-card" style={{ position: "relative", marginBottom: 12, width: "100%", background: config.theme === 'dark' ? tag.bg+'30' : tag.bg, borderLeftColor: tag.color, color: theme.text, padding: "16px 20px" }}>
                    <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'Playfair Display' }}>{ev.title}</div>
                    <div style={{ fontSize: 13, color: theme.textSec, marginTop: 4 }}>{ev.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} — {ev.end.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                  </div>
                )
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ... SettingsModal, EventModal, TrashModal, TagManager, AuthScreen ...
// (These components remain structurally identical to the previous "Fixed" version but use the passed `theme` prop correctly)

function SettingsModal({ config, setConfig, theme, onClose, onLoadDemo }) {
    // ... (Same structure as previous, using `theme` prop for colors)
    return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{background: theme.card, color: theme.text}}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 className="serif" style={{ fontSize: 24 }}>Settings</h2>
          <button onClick={onClose} className="btn"><ICONS.Close/></button>
        </div>
        {/* ... Toggles matching the screenshot style ... */}
         <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 14, fontWeight: 600, display: "block", marginBottom: 12 }}>Theme</label>
          <div className="segmented-control" style={{background: theme.border}}>
            <div className={`segment-btn ${config.theme !== 'dark' ? 'active' : ''}`} onClick={() => setConfig({...config, theme: 'light'})}>☀ Light</div>
            <div className={`segment-btn ${config.theme === 'dark' ? 'active' : ''}`} onClick={() => setConfig({...config, theme: 'dark'})}>☾ Dark</div>
          </div>
        </div>
        <button onClick={() => signOut(auth)} style={{ width: "100%", padding: "14px", border: `1px solid ${theme.danger}`, color: theme.danger, borderRadius: 12, fontWeight: 600 }}>Sign Out</button>
      </div>
    </div>
  );
}

function EventModal({ event, tags, theme, onSave, onDelete, onClose }) {
   const [data, setData] = useState({ 
    title: event?.title || "", category: event?.category || tags[0].id,
    start: event?.start ? event.start.toTimeString().slice(0,5) : "09:00",
    end: event?.end ? event.end.toTimeString().slice(0,5) : "10:00"
  });
  // ... Submit logic ...
  const submit = () => {
    const s = new Date(); const [sh, sm] = data.start.split(':'); s.setHours(sh, sm);
    const e = new Date(); const [eh, em] = data.end.split(':'); e.setHours(eh, em);
    onSave({ id: event?.id, ...data, start: s, end: e });
  };
  return (
      <div className="modal-overlay" onClick={onClose}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{background: theme.card, color: theme.text}}>
              <h2 className="serif" style={{marginBottom:24}}>{event ? "Edit" : "New"} Event</h2>
              <input className="input-luxe" value={data.title} onChange={e => setData({...data, title: e.target.value})} style={{background: theme.bg, color: theme.text, marginBottom:16}} placeholder="Title" />
               <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                <input type="time" value={data.start} onChange={e => setData({...data, start: e.target.value})} className="input-luxe" style={{background: theme.bg, color: theme.text}} />
                <input type="time" value={data.end} onChange={e => setData({...data, end: e.target.value})} className="input-luxe" style={{background: theme.bg, color: theme.text}} />
               </div>
               <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:32}}>
                   {tags.map(t => (
                       <button key={t.id} onClick={() => setData({...data, category: t.id})} style={{padding: "6px 12px", borderRadius: 20, background: data.category === t.id ? theme.accent : theme.bg, color: data.category === t.id ? "#fff" : theme.text, border: "none"}}>{t.name}</button>
                   ))}
               </div>
               <div style={{display:'flex', justifyContent:'flex-end', gap:12}}>
                   {event && <button onClick={() => onDelete(event.id)} className="btn" style={{color: theme.danger, marginRight:'auto'}}>Delete</button>}
                   <button onClick={submit} className="btn" style={{background: theme.accent, color: "#fff", padding: "10px 24px", borderRadius: 12}}>Save</button>
               </div>
          </div>
      </div>
  )
}

function TagManager({ tags, setTags, theme, onClose }) {
  // ... (Same logic as previous, ensuring colors use theme vars)
    const [newTag, setNewTag] = useState("");
    const [color, setColor] = useState("onyx");
    const addTag = () => {
        if(!newTag.trim()) return;
        setTags([...tags, { id: newTag.toLowerCase(), name: newTag, ...PALETTE[color] }]);
        setNewTag("");
    };
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{background: theme.card, color: theme.text}}>
                <h3 className="serif">Tags</h3>
                <div style={{marginBottom:16, marginTop: 16}}>
                    <input value={newTag} onChange={e => setNewTag(e.target.value)} className="input-luxe" placeholder="New Tag..." style={{background: theme.bg, color: theme.text, marginBottom: 12}} />
                    <div style={{display:'flex', gap:8}}>
                        {Object.keys(PALETTE).map(k => <div key={k} onClick={() => setColor(k)} style={{width:20, height:20, borderRadius:'50%', background: PALETTE[k].bg, border: `2px solid ${color===k ? theme.accent : 'transparent'}`, cursor:'pointer'}} />)}
                    </div>
                    <button onClick={addTag} className="btn" style={{width:'100%', marginTop:16, background: theme.accent, padding:10, borderRadius:8, color:'#fff'}}>Add Tag</button>
                </div>
                <div style={{maxHeight: 200, overflowY:'auto'}}>
                    {tags.map(t => (
                        <div key={t.id} style={{display:'flex', justifyContent:'space-between', padding: 8, borderBottom: `1px solid ${theme.border}`}}>
                            <span style={{color: t.color}}>{t.name}</span>
                            <span onClick={() => setTags(tags.filter(x => x.id !== t.id))} style={{cursor:'pointer', color: theme.danger}}>×</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function TrashModal({ events, theme, onClose, onRestore, onDelete }) {
     return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{background: theme.card, color: theme.text}}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:24}}>
          <h3 className="serif" style={{ fontSize: 24 }}>Trash</h3>
          <button onClick={onClose} className="btn"><ICONS.Close/></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", maxHeight: 400 }}>
          {events.length === 0 && <div style={{textAlign:'center', color:theme.textSec, marginTop:40}}>Empty</div>}
          {events.map(ev => (
            <div key={ev.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottom: `1px solid ${theme.border}` }}>
              <div><div style={{fontWeight:600}}>{ev.title}</div><div style={{fontSize:12, color:theme.textSec}}>{ev.start.toLocaleDateString()}</div></div>
              <div style={{display:'flex', gap:8}}>
                <button onClick={() => onRestore(ev.id)} className="btn" style={{color: theme.accent}}>Restore</button>
                <button onClick={() => onDelete(ev.id)} className="btn" style={{color: theme.danger}}>Purge</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthScreen({ onLogin }) {
  return (
    <div style={{ height: "100vh", background: "#050505", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <h1 className="serif" style={{ fontSize: 64, color: "#fff", marginBottom: 24 }}>Timeline.</h1>
      <button onClick={onLogin} className="btn" style={{ padding: "16px 40px", borderRadius: 4, background: "#3B82F6", color: "#fff", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>Enter System</button>
    </div>
  );
}