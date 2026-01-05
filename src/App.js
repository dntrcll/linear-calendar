import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth, provider } from "./firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

// ==========================================
// 1. SYSTEM CONFIGURATION & CONSTANTS
// ==========================================

const APP_META = { name: "Meridian", version: "3.5.1-Stable" };

const CONFIG = {
  PIXELS_PER_MINUTE: 1.8,
  SNAP_MINUTES: 15,
  SIDEBAR_WIDTH: 280,
  SIDEBAR_COLLAPSED_WIDTH: 70,
  HEADER_HEIGHT: 72,
  YEAR_COLUMNS: 38,
  ANIMATION_SPEED: "0.3s",
  EASE: "cubic-bezier(0.25, 1, 0.5, 1)",
};

const SHORTCUTS = {
  TODAY: 't',
  VIEW_DAY: 'd',
  VIEW_WEEK: 'w',
  VIEW_YEAR: 'y',
  NEW_EVENT: 'n',
  SEARCH: '/',
  SAVE: 's' // with ctrl/cmd
};

// ==========================================
// 2. THEME ENGINE
// ==========================================

const THEMES = {
  light: {
    id: 'light',
    bg: "#FFFFFF",
    sidebar: "#F8FAFC",
    card: "#FFFFFF",
    text: "#0F172A", 
    textSecondary: "#64748B",
    border: "#E2E8F0",
    gridLine: "#F1F5F9",
    accent: "#4F46E5",
    weekendBg: "#FAFAFA",
    glass: "rgba(255, 255, 255, 0.9)",
    shadow: "0 4px 20px -2px rgba(0, 0, 0, 0.08)",
    eventShadow: "0 2px 4px rgba(0,0,0,0.04)",
    timeIndicator: "#EF4444",
    inputBg: "#F1F5F9",
    hover: "#F1F5F9",
  },
  dark: {
    id: 'dark',
    bg: "#0B0E11",
    sidebar: "#11161F",
    card: "#181E2A",
    text: "#F1F5F9",
    textSecondary: "#94A3B8",
    border: "#252D3D",
    gridLine: "#1E293B",
    accent: "#3B82F6",
    weekendBg: "#0F131A",
    glass: "rgba(17, 22, 31, 0.85)",
    shadow: "0 10px 30px -5px rgba(0, 0, 0, 0.5)",
    eventShadow: "0 4px 6px rgba(0,0,0,0.3)",
    timeIndicator: "#3B82F6",
    inputBg: "#1E293B",
    hover: "#1F2937",
  }
};

const TAGS = [
  { id: 'work',    name: "Business", bg: "#F0F9FF", border: "#0EA5E9", text: "#0369A1", darkBg: "#0C4A6E", darkText: "#BAE6FD" },
  { id: 'focus',   name: "Deep Work",bg: "#F0FDF4", border: "#22C55E", text: "#15803D", darkBg: "#14532D", darkText: "#BBF7D0" },
  { id: 'urgent',  name: "Critical", bg: "#FEF2F2", border: "#EF4444", text: "#B91C1C", darkBg: "#7F1D1D", darkText: "#FECACA" },
  { id: 'personal',name: "Personal", bg: "#FAF5FF", border: "#A855F7", text: "#7E22CE", darkBg: "#581C87", darkText: "#E9D5FF" },
  { id: 'meeting', name: "Meeting",  bg: "#FFF7ED", border: "#F97316", text: "#C2410C", darkBg: "#7C2D12", darkText: "#FED7AA" },
];

const CSS_INJECT = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap');
  
  :root { --ease: ${CONFIG.EASE}; --anim: ${CONFIG.ANIMATION_SPEED}; }
  * { box-sizing: border-box; margin: 0; padding: 0; outline: none; -webkit-font-smoothing: antialiased; }
  
  body { font-family: 'Inter', sans-serif; overflow: hidden; transition: background var(--anim) var(--ease), color var(--anim) var(--ease); }
  h1, h2, h3, h4, .brand { font-family: 'Outfit', sans-serif; }
  .mono { font-family: 'JetBrains Mono', monospace; }
  
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.5); }
  
  .fade-in { animation: fadeIn 0.4s var(--ease) forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  
  .pulse-active { animation: pulse 2s infinite; }
  @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(79, 70, 229, 0); } 100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); } }

  .past-blur { filter: grayscale(1) opacity(0.5); pointer-events: none; transition: 0.3s; }
  
  .btn-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; border: none; background: transparent; cursor: pointer; transition: 0.2s; }
  .btn-icon:hover { background: rgba(125,125,125,0.1); }

  .input-base { width: 100%; padding: 10px 12px; border-radius: 8px; font-size: 14px; transition: 0.2s; border: 1px solid transparent; }
  .input-base:focus { border-color: #4F46E5; box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2); }
  
  /* Toggle Switch */
  .switch { position: relative; width: 44px; height: 24px; border-radius: 12px; background: #CBD5E1; transition: 0.3s; cursor: pointer; }
  .switch.active { background: #4F46E5; }
  .knob { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: white; transition: 0.3s var(--ease); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  .switch.active .knob { transform: translateX(20px); }
  
  [data-tooltip]:hover::after { content: attr(data-tooltip); position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%) translateY(-4px); padding: 4px 8px; background: #0F172A; color: white; border-radius: 4px; font-size: 11px; white-space: nowrap; z-index: 1000; pointer-events: none; }
`;

// ==========================================
// 3. UTILITY HOOKS & HELPERS
// ==========================================

const useKeyboard = (handlers) => {
  useEffect(() => {
    const handle = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.metaKey || e.ctrlKey) && e.key === SHORTCUTS.SAVE && handlers.onSave) {
        e.preventDefault(); handlers.onSave();
      } else if (e.key === SHORTCUTS.TODAY && handlers.onToday) handlers.onToday();
      else if (e.key === SHORTCUTS.VIEW_DAY && handlers.onViewDay) handlers.onViewDay();
      else if (e.key === SHORTCUTS.VIEW_WEEK && handlers.onViewWeek) handlers.onViewWeek();
      else if (e.key === SHORTCUTS.VIEW_YEAR && handlers.onViewYear) handlers.onViewYear();
      else if (e.key === SHORTCUTS.NEW_EVENT && handlers.onNew) { e.preventDefault(); handlers.onNew(); }
      else if (e.key === SHORTCUTS.SEARCH && handlers.onSearch) { e.preventDefault(); handlers.onSearch(); }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [handlers]);
};

// Advanced layout algorithm for overlapping events
const computeEventLayout = (events) => {
  if (!events.length) return [];
  const sorted = [...events].sort((a, b) => a.start - b.start);
  const columns = [];
  sorted.forEach(ev => {
    let placed = false;
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      if (ev.start >= col[col.length - 1].end) {
        col.push(ev);
        placed = true;
        break;
      }
    }
    if (!placed) columns.push([ev]);
  });
  return columns.flatMap((col, i) => col.map(ev => ({
    ...ev,
    left: (i / columns.length) * 100,
    width: 100 / columns.length
  })));
};

// ==========================================
// 4. MAIN COMPONENT
// ==========================================

export default function MeridianEnterprise() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [viewMode, setViewMode] = useState("year");
  
  // Settings
  const [settings, setSettings] = useState(() => JSON.parse(localStorage.getItem('meridian_ent_cfg')) || {
    darkMode: true, use24Hour: false, blurPast: true, weekStartMon: true, activeTags: TAGS.map(t=>t.id), collapsed: false
  });
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Interaction
  const [editingEvent, setEditingEvent] = useState(null);
  const [dragData, setDragData] = useState(null);
  const searchInputRef = useRef(null);
  const scrollRef = useRef(null);
  
  const theme = settings.darkMode ? THEMES.dark : THEMES.light;

  // --- INITIALIZATION ---
  useEffect(() => { const s = document.createElement('style'); s.textContent = CSS_INJECT; document.head.appendChild(s); return () => s.remove(); }, []);
  useEffect(() => { setPersistence(auth, browserLocalPersistence); return auth.onAuthStateChanged(u => { setUser(u); if(u) loadEvents(u); }); }, []);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  useEffect(() => localStorage.setItem('meridian_ent_cfg', JSON.stringify(settings)), [settings]);
  
  useEffect(() => {
    if ((viewMode === 'day' || viewMode === 'week') && scrollRef.current) {
      scrollRef.current.scrollTop = 8 * 60 * CONFIG.PIXELS_PER_MINUTE;
    }
  }, [viewMode]);

  useKeyboard({
    onToday: () => setCurrentDate(new Date()),
    onViewDay: () => setViewMode('day'),
    onViewWeek: () => setViewMode('week'),
    onViewYear: () => setViewMode('year'),
    onNew: () => { setEditingEvent(null); setModalOpen(true); },
    onSearch: () => { if (!settings.collapsed) searchInputRef.current?.focus(); },
    onSave: () => { /* Handled in Modal */ }
  });

  // --- DATA LAYER ---
  const loadEvents = async (u) => {
    if(!u) return;
    setLoading(true);
    try {
      const q = query(collection(db, "events"), where("uid", "==", u.uid), where("deleted", "==", false));
      const snap = await getDocs(q);
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data(), start: d.data().startTime.toDate(), end: d.data().endTime.toDate() })));
    } catch(e) { notify("Sync error: " + e.message, "error"); }
    setLoading(false);
  };

  const notify = (msg, type='info') => {
    const id = Date.now();
    setNotifications(p => [...p, {id, msg, type}]);
    setTimeout(() => setNotifications(p => p.filter(n => n.id !== id)), 4000);
  };

  const handleSave = async (data) => {
    if(!user) return;
    try {
      const payload = { 
        uid: user.uid, title: data.title, category: data.category, 
        description: data.description || "", location: data.location || "",
        startTime: Timestamp.fromDate(data.start), endTime: Timestamp.fromDate(data.end), 
        deleted: false, updatedAt: serverTimestamp() 
      };
      if(data.id) await updateDoc(doc(db, "events", data.id), payload);
      else { payload.createdAt = serverTimestamp(); await addDoc(collection(db, "events"), payload); }
      setModalOpen(false); loadEvents(user); notify("Event saved successfully", "success");
    } catch(e) { notify("Failed to save event", "error"); }
  };

  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(events));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `meridian_export_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    notify("Data exported to JSON", "success");
  };

  // --- NAVIGATION HELPER (This was missing) ---
  const nav = (amt) => {
    const d = new Date(currentDate);
    if (viewMode === 'year') d.setFullYear(d.getFullYear() + amt);
    else if (viewMode === 'week') d.setDate(d.getDate() + (amt * 7));
    else d.setDate(d.getDate() + amt);
    setCurrentDate(d);
  };

  // --- DRAG LOGIC ---
  const onDragStart = (e, ev, mode) => {
    if(e.button !== 0) return;
    e.stopPropagation();
    setDragData({ id: ev.id, mode, startY: e.clientY, origStart: ev.start, origEnd: ev.end });
  };

  const onDragMove = useCallback((e) => {
    if(!dragData) return;
    const diff = Math.floor((e.clientY - dragData.startY) / CONFIG.PIXELS_PER_MINUTE / CONFIG.SNAP_MINUTES) * CONFIG.SNAP_MINUTES;
    if(diff === 0) return;

    setEvents(prev => prev.map(ev => {
      if(ev.id !== dragData.id) return ev;
      const s = new Date(dragData.origStart);
      const end = new Date(dragData.origEnd);
      if(dragData.mode === 'move') { s.setMinutes(s.getMinutes() + diff); end.setMinutes(end.getMinutes() + diff); }
      else { end.setMinutes(end.getMinutes() + diff); if((end-s) < 15*60000) return ev; }
      return { ...ev, start: s, end };
    }));
  }, [dragData]);

  const onDragEnd = useCallback(async () => {
    if(!dragData) return;
    const ev = events.find(e => e.id === dragData.id);
    if(ev) try {
      await updateDoc(doc(db, "events", ev.id), { startTime: Timestamp.fromDate(ev.start), endTime: Timestamp.fromDate(ev.end) });
      notify("Event updated", "success");
    } catch(e) { loadEvents(user); notify("Failed to sync move", "error"); }
    setDragData(null);
  }, [dragData, events, user]);

  useEffect(() => {
    if(dragData) { window.addEventListener('mousemove', onDragMove); window.addEventListener('mouseup', onDragEnd); }
    return () => { window.removeEventListener('mousemove', onDragMove); window.removeEventListener('mouseup', onDragEnd); };
  }, [dragData, onDragMove, onDragEnd]);

  // --- RENDER HELPERS ---
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchTag = settings.activeTags.includes(e.category);
      const matchSearch = searchQuery ? e.title.toLowerCase().includes(searchQuery.toLowerCase()) : true;
      return matchTag && matchSearch;
    });
  }, [events, settings.activeTags, searchQuery]);

  const isToday = (d) => d.toDateString() === now.toDateString();
  const fmtTime = (d) => d.toLocaleTimeString([], { hour: settings.use24Hour?"2-digit":"numeric", minute:"2-digit", hour12:!settings.use24Hour });

  if (!user) return <AuthScreen onLogin={() => signInWithPopup(auth, provider)} theme={theme} />;

  return (
    <div style={{ display: "flex", height: "100vh", background: theme.bg, color: theme.text }}>
      
      {/* SIDEBAR */}
      <aside style={{ 
        width: settings.collapsed ? CONFIG.SIDEBAR_COLLAPSED_WIDTH : CONFIG.SIDEBAR_WIDTH, 
        background: theme.sidebar, 
        borderRight: `1px solid ${theme.border}`, 
        display: "flex", flexDirection: "column", padding: settings.collapsed ? "24px 12px" : 24, 
        zIndex: 20, transition: `width ${CONFIG.ANIMATION_SPEED} ${CONFIG.EASE}` 
      }}>
        <div style={{ marginBottom: 40, display: "flex", alignItems: "center", justifyContent: settings.collapsed ? "center" : "flex-start", gap: 12 }}>
          <div style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${theme.accent}, #8B5CF6)`, borderRadius: 8, boxShadow: `0 0 15px ${theme.accent}66` }} />
          {!settings.collapsed && <h1 className="brand" style={{ fontSize: 24, fontWeight: 700, color: theme.text }}>{APP_META.name}</h1>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
           <button onClick={() => { setEditingEvent(null); setModalOpen(true); }} 
             style={{ width: "100%", height: 44, borderRadius: 12, background: theme.accent, color: "#fff", border: "none", fontSize: 20, fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 12px ${theme.accent}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
             + {!settings.collapsed && <span style={{fontSize: 14, marginLeft: 8}}>New Event</span>}
           </button>
        </div>

        {!settings.collapsed && (
          <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ position: "relative" }}>
               <input ref={searchInputRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="input-base" style={{ background: settings.darkMode ? theme.bg : theme.bg, color: theme.text, borderColor: theme.border }} />
               <span style={{ position: "absolute", right: 10, top: 10, fontSize: 10, color: theme.textSecondary, border: `1px solid ${theme.border}`, padding: "2px 6px", borderRadius: 4 }}>/</span>
            </div>

            <div>
               <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{currentDate.toLocaleString('default', {month:'long'})}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => {const d=new Date(currentDate); d.setMonth(d.getMonth()-1); setCurrentDate(d)}} className="btn-icon" style={{color:theme.text}}>‹</button>
                    <button onClick={() => {const d=new Date(currentDate); d.setMonth(d.getMonth()+1); setCurrentDate(d)}} className="btn-icon" style={{color:theme.text}}>›</button>
                  </div>
               </div>
               <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, textAlign: "center" }}>
                  {["S","M","T","W","T","F","S"].map(d => <span key={d} style={{ fontSize: 10, color: theme.textSecondary }}>{d}</span>)}
                  {(() => {
                     const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                     const days = [];
                     for(let i=0; i<d.getDay(); i++) days.push(<div key={`e-${i}`} />);
                     while(d.getMonth() === currentDate.getMonth()) {
                       const c = new Date(d);
                       days.push(<div key={d.getDate()} onClick={() => setCurrentDate(c)} style={{ fontSize: 11, padding: 4, borderRadius: 4, cursor: "pointer", background: isToday(c) ? theme.accent : "transparent", color: isToday(c) ? "#fff" : theme.text }}>{d.getDate()}</div>);
                       d.setDate(d.getDate()+1);
                     }
                     return days;
                  })()}
               </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.textSecondary, textTransform: "uppercase", marginBottom: 12, letterSpacing: 1 }}>Filters</div>
              {TAGS.map(t => (
                <div key={t.id} onClick={() => setSettings(s => ({...s, activeTags: s.activeTags.includes(t.id) ? s.activeTags.filter(x=>x!==t.id) : [...s.activeTags, t.id] }))} 
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", cursor: "pointer", opacity: settings.activeTags.includes(t.id) ? 1 : 0.4, transition: "0.2s" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.border }} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: "auto", borderTop: `1px solid ${theme.border}`, paddingTop: 16, display: "flex", flexDirection: settings.collapsed ? "column" : "row", gap: 8 }}>
           <button onClick={() => setSettings(s => ({...s, collapsed: !s.collapsed}))} className="btn-icon" data-tooltip="Toggle Sidebar" style={{ color: theme.textSecondary }}>{settings.collapsed ? '»' : '«'}</button>
           <button onClick={() => setShowSettings(true)} className="btn-icon" data-tooltip="Settings" style={{ color: theme.textSecondary }}>⚙</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        <header style={{ height: CONFIG.HEADER_HEIGHT, borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: theme.bg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <h2 className="brand" style={{ fontSize: 24, fontWeight: 600, minWidth: 220 }}>{viewMode === 'year' ? currentDate.getFullYear() : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <div style={{ display: "flex", background: theme.sidebar, padding: 4, borderRadius: 10, border: `1px solid ${theme.border}` }}>
              <button onClick={() => nav(-1)} className="btn-icon" style={{ color: theme.text }}>←</button>
              <button onClick={() => setCurrentDate(new Date())} style={{ padding: "0 12px", border: "none", background: "transparent", color: theme.text, fontWeight: 600, cursor: "pointer" }}>Today</button>
              <button onClick={() => nav(1)} className="btn-icon" style={{ color: theme.text }}>→</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ display: "flex", background: theme.sidebar, padding: 4, borderRadius: 10, border: `1px solid ${theme.border}` }}>
              {['day', 'week', 'year'].map(m => (
                <button key={m} onClick={() => setViewMode(m)} style={{ padding: "6px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, textTransform: "capitalize", cursor: "pointer", transition: "0.2s", background: viewMode === m ? theme.bg : "transparent", color: viewMode === m ? theme.accent : theme.textSecondary, boxShadow: viewMode === m ? theme.eventShadow : "none" }}>{m}</button>
              ))}
            </div>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: theme.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>{user.displayName ? user.displayName[0] : "U"}</div>
          </div>
        </header>

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", position: "relative", scrollBehavior: "smooth" }}>
          
          {(viewMode === 'day' || viewMode === 'week') && (
            <div style={{ display: "flex", minHeight: "100%" }}>
              <div style={{ width: 60, flexShrink: 0, borderRight: `1px solid ${theme.border}`, background: theme.bg }}>
                {Array.from({length: 24}).map((_, h) => (
                  <div key={h} style={{ height: 60 * CONFIG.PIXELS_PER_MINUTE, position: "relative" }}>
                    <span style={{ position: "absolute", top: -6, right: 8, fontSize: 11, color: theme.textSecondary, fontWeight: 600, fontFamily: "var(--font-mono)" }}>{settings.use24Hour ? `${h}:00` : `${h===0?12:h>12?h-12:h} ${h>=12?'PM':'AM'}`}</span>
                  </div>
                ))}
              </div>

              <div style={{ flex: 1, display: "flex" }}>
                {(viewMode === 'day' ? [currentDate] : (() => {
                  const s = new Date(currentDate);
                  const day = s.getDay();
                  const diff = s.getDate() - day + (settings.weekStartMon ? (day === 0 ? -6 : 1) : 0);
                  return Array.from({length:7}, (_,i) => { const d = new Date(s); d.setDate(diff + i); return d; });
                })()).map((date, colIndex) => {
                  const isT = isToday(date);
                  const isPast = settings.blurPast && date < new Date(new Date().setHours(0,0,0,0));
                  const dEvents = filteredEvents.filter(e => e.start.toDateString() === date.toDateString());
                  const layoutEvents = computeEventLayout(dEvents);

                  return (
                    <div key={colIndex} style={{ flex: 1, borderRight: `1px solid ${theme.border}`, position: "relative", background: isT ? (settings.darkMode ? "#131B2D" : "#F8FAFC") : "transparent" }} className={isPast ? "past-blur" : ""}>
                      {viewMode === 'week' && (
                        <div style={{ height: 50, borderBottom: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: theme.sidebar, position: "sticky", top: 0, zIndex: 20 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: isT ? theme.accent : theme.textSecondary, textTransform: "uppercase" }}>{date.toLocaleDateString('en-US',{weekday:'short'})}</div>
                          <div style={{ fontSize: 18, fontWeight: 600, color: isT ? theme.accent : theme.text }}>{date.getDate()}</div>
                        </div>
                      )}
                      {Array.from({length: 24}).map((_, h) => <div key={h} style={{ height: 60 * CONFIG.PIXELS_PER_MINUTE, borderBottom: `1px solid ${theme.gridLine}` }} />)}
                      {isT && <div style={{ position: "absolute", top: (now.getHours() * 60 + now.getMinutes()) * CONFIG.PIXELS_PER_MINUTE, left: 0, right: 0, height: 2, background: theme.timeIndicator, zIndex: 10, pointerEvents: "none" }}><div className="pulse-active" style={{ position: "absolute", left: -4, top: -4, width: 10, height: 10, borderRadius: "50%", background: theme.timeIndicator }} /></div>}
                      <div style={{ position: "absolute", inset: 0, zIndex: 1 }} onClick={(e) => {
                        if(dragData) return;
                        const m = Math.floor(e.nativeEvent.offsetY / CONFIG.PIXELS_PER_MINUTE / CONFIG.SNAP_MINUTES) * CONFIG.SNAP_MINUTES;
                        const s = new Date(date); s.setHours(0, m, 0, 0);
                        const en = new Date(s); en.setMinutes(m+60);
                        setEditingEvent({ start: s, end: en, title: "", category: TAGS[0].id });
                        setModalOpen(true);
                      }} />
                      {layoutEvents.map(ev => {
                        const top = (ev.start.getHours() * 60 + ev.start.getMinutes()) * CONFIG.PIXELS_PER_MINUTE;
                        const h = Math.max(((ev.end - ev.start)/60000) * CONFIG.PIXELS_PER_MINUTE, 24);
                        const tag = TAGS.find(t => t.id === ev.category) || TAGS[0];
                        const isDrag = dragData?.id === ev.id;
                        return (
                          <div key={ev.id} onMouseDown={(e) => onDragStart(e, ev, 'move')} className="fade-in"
                            style={{
                              position: "absolute", top, height: h, left: `${ev.left}%`, width: `${ev.width}%`,
                              background: settings.darkMode ? tag.darkBg : tag.bg,
                              borderLeft: `3px solid ${tag.border}`, borderRadius: 4, padding: "2px 6px",
                              boxShadow: isDrag ? theme.shadow : theme.eventShadow,
                              cursor: isDrag ? "grabbing" : "grab", zIndex: isDrag ? 100 : 10, opacity: isDrag ? 0.8 : 1,
                              borderTop: !settings.darkMode ? `1px solid ${tag.border}20` : 'none'
                            }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: settings.darkMode ? tag.darkText : tag.text, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{ev.title || "(No Title)"}</div>
                            {h > 30 && <div style={{ fontSize: 10, color: settings.darkMode ? "rgba(255,255,255,0.7)" : tag.text, opacity: 0.8 }}>{fmtTime(ev.start)} - {fmtTime(ev.end)}</div>}
                            <div onMouseDown={(e) => onDragStart(e, ev, 'resize')} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, cursor: "ns-resize" }} />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'year' && (
            <div className="fade-in" style={{ padding: 40, overflowX: "auto" }}>
              <div style={{ minWidth: 1000, maxWidth: 1400, margin: "0 auto" }}>
                <div style={{ display: "flex", marginLeft: 100, marginBottom: 12 }}>{Array.from({length: CONFIG.YEAR_COLUMNS}).map((_,i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 10, fontWeight: 700, color: theme.textSecondary, opacity: 0.6 }}>{(settings.weekStartMon ? ["M","T","W","T","F","S","S"] : ["S","M","T","W","T","F","S"])[i%7]}</div>)}</div>
                {Array.from({length: 12}).map((_, m) => {
                  const d = new Date(currentDate.getFullYear(), m, 1);
                  const days = new Date(currentDate.getFullYear(), m+1, 0).getDate();
                  let start = d.getDay(); if(settings.weekStartMon) start = start===0?6:start-1;
                  return (
                    <div key={m} style={{ display: "flex", alignItems: "center", marginBottom: 6, height: 36 }}>
                      <div style={{ width: 100, fontSize: 13, fontWeight: 600, color: theme.textSecondary }}>{d.toLocaleDateString('en-US',{month:'short'})}</div>
                      <div style={{ flex: 1, display: "flex", gap: 2 }}>
                        {Array.from({length: CONFIG.YEAR_COLUMNS}).map((_, col) => {
                          const num = col - start + 1;
                          if(num < 1 || num > days) return <div key={col} style={{ flex: 1 }} />;
                          const date = new Date(currentDate.getFullYear(), m, num);
                          const isT = isToday(date);
                          const hasEv = events.some(e => e.start.toDateString() === date.toDateString());
                          return <div key={col} onClick={() => { setCurrentDate(date); setViewMode('day'); }} style={{ flex: 1, borderRadius: 3, height: 30, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, cursor: "pointer", background: isT ? theme.accent : hasEv ? (settings.darkMode ? "#1E293B" : "#E0F2FE") : "transparent", color: isT ? "#fff" : hasEv ? (settings.darkMode ? "#60A5FA" : "#0369A1") : theme.text, fontWeight: isT?700:400, border: isT ? `1px solid ${theme.accent}` : "none" }}>{num}</div>
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {showSettings && (
        <div className="fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={() => setShowSettings(false)}>
          <div style={{ width: 380, background: theme.card, padding: 24, borderRadius: 20, boxShadow: theme.shadow, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}><h3 className="brand" style={{ fontSize: 18, color: theme.text }}>Settings</h3><button onClick={() => setShowSettings(false)} className="btn-icon" style={{color:theme.text}}>✕</button></div>
            <SettingRow label="Theme" sub="Interface appearance">
               <div style={{ display: "flex", background: theme.bg, padding: 4, borderRadius: 10, width: 120 }}>
                <button onClick={() => setSettings(s => ({...s, darkMode: false}))} style={{ flex: 1, padding: 6, borderRadius: 6, border: "none", background: !settings.darkMode ? theme.card : "transparent", color: !settings.darkMode ? theme.text : theme.textSecondary, fontWeight: 600, boxShadow: !settings.darkMode ? theme.eventShadow : "none", cursor: "pointer" }}>☀</button>
                <button onClick={() => setSettings(s => ({...s, darkMode: true}))} style={{ flex: 1, padding: 6, borderRadius: 6, border: "none", background: settings.darkMode ? theme.card : "transparent", color: settings.darkMode ? theme.text : theme.textSecondary, fontWeight: 600, boxShadow: settings.darkMode ? theme.eventShadow : "none", cursor: "pointer" }}>☾</button>
              </div>
            </SettingRow>
            <SettingRow label="Blur Past" sub="Dim previous days" toggle={() => setSettings(s => ({...s, blurPast:!s.blurPast}))} active={settings.blurPast} />
            <SettingRow label="Monday Start" sub="Week alignment" toggle={() => setSettings(s => ({...s, weekStartMon:!s.weekStartMon}))} active={settings.weekStartMon} />
            <SettingRow label="24-Hour Time" sub="Military format" toggle={() => setSettings(s => ({...s, use24Hour:!s.use24Hour}))} active={settings.use24Hour} />
            <div style={{ marginTop: 24, borderTop: `1px solid ${theme.border}`, paddingTop: 16, display: "flex", gap: 12 }}>
               <button onClick={exportData} style={{ flex: 1, padding: 10, border: `1px solid ${theme.border}`, background: theme.bg, color: theme.text, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Export JSON</button>
               <button onClick={() => signOut(auth)} style={{ flex: 1, padding: 10, border: "1px solid #EF4444", color: "#EF4444", background: "transparent", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setModalOpen(false)}>
          <EventEditor 
            event={editingEvent} 
            theme={theme} 
            settings={settings}
            onSave={handleSave} 
            onDelete={async (id) => { if(window.confirm("Delete event?")) { await updateDoc(doc(db,"events",id), {deleted:true}); setModalOpen(false); loadEvents(user); notify("Event deleted"); } }} 
            onClose={() => setModalOpen(false)} 
          />
        </div>
      )}
      
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, display: "flex", flexDirection: "column", gap: 10 }}>
        {notifications.map(n => (<div key={n.id} className="fade-in" style={{ padding: "12px 24px", background: n.type==='error'?"#EF4444":n.type==='success'?"#10B981":theme.card, color: n.type==='info'?theme.text:"#FFF", borderRadius: 12, fontSize: 13, fontWeight: 600, boxShadow: "0 10px 40px -10px rgba(0,0,0,0.2)", border: n.type==='info'?`1px solid ${theme.border}`:'none', display: "flex", alignItems: "center", gap: 8 }}>{n.type==='success' && <span>✓</span>}{n.msg}</div>))}
      </div>
    </div>
  );
}

function AuthScreen({ onLogin, theme }) {
  return (
    <div style={{height:"100vh", background: "#0B0E11", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", position: "relative", overflow: "hidden"}}>
      <div style={{position: "absolute", width: "60%", height: "60%", background: "radial-gradient(circle, rgba(79,70,229,0.15) 0%, rgba(0,0,0,0) 70%)", top: "20%", left: "20%"}} />
      <h1 className="brand" style={{fontSize: 72, color: "#fff", marginBottom: 24, letterSpacing: "-3px", zIndex: 1}}>{APP_META.name}</h1>
      <p style={{color: "#94A3B8", marginBottom: 40, fontSize: 18, zIndex: 1}}>Precision Time Architecture</p>
      <button onClick={onLogin} style={{padding: "16px 48px", borderRadius: 16, background: "#4F46E5", color: "#fff", border:"none", fontSize: 16, fontWeight: 600, cursor: "pointer", boxShadow: "0 0 30px rgba(79, 70, 229, 0.4)", zIndex: 1, transition: "transform 0.2s"}}>Enter Workspace</button>
    </div>
  );
}

function SettingRow({ label, sub, toggle, active, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
      <div><div style={{fontSize:14, fontWeight:600}}>{label}</div>{sub && <div style={{fontSize:12, opacity: 0.6}}>{sub}</div>}</div>
      {children ? children : <div className={`switch ${active?'active':''}`} onClick={toggle}><div className="knob"/></div>}
    </div>
  );
}

function EventEditor({ event, theme, settings, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(event?.title || "");
  const [cat, setCat] = useState(event?.category || TAGS[0].id);
  const [sTime, setSTime] = useState(event?.start?.toTimeString().slice(0,5) || "09:00");
  const [eTime, setETime] = useState(event?.end?.toTimeString().slice(0,5) || "10:00");
  const [desc, setDesc] = useState(event?.description || "");
  const [loc, setLoc] = useState(event?.location || "");

  const submit = () => {
    if(!title) return;
    const s = new Date(event?.start || new Date()); 
    const [sh, sm] = sTime.split(':'); s.setHours(sh, sm, 0, 0);
    const e = new Date(s); 
    const [eh, em] = eTime.split(':'); e.setHours(eh, em, 0, 0);
    if(e <= s) e.setDate(e.getDate() + 1);
    onSave({ id: event?.id, title, category: cat, start: s, end: e, description: desc, location: loc });
  };

  return (
    <div style={{ width: 440, background: theme.card, padding: 32, borderRadius: 24, boxShadow: theme.shadow }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
         <h3 className="brand" style={{ fontSize: 22, color: theme.text }}>{event?.id ? "Edit Event" : "Create Event"}</h3>
         {event?.id && <button onClick={() => onDelete(event.id)} className="btn-icon" style={{color: "#EF4444"}}>🗑</button>}
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: 16}}>
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Event Title" className="input-base" style={{ fontSize: 18, fontWeight: 600, background: theme.bg, color: theme.text, borderColor: theme.border }} />
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{flex: 1}}><label style={{fontSize:11, fontWeight:700, color:theme.textSecondary, marginBottom:4, display:"block"}}>START</label><input type="time" value={sTime} onChange={e => setSTime(e.target.value)} className="input-base" style={{ background: theme.bg, color: theme.text, borderColor: theme.border }} /></div>
          <div style={{flex: 1}}><label style={{fontSize:11, fontWeight:700, color:theme.textSecondary, marginBottom:4, display:"block"}}>END</label><input type="time" value={eTime} onChange={e => setETime(e.target.value)} className="input-base" style={{ background: theme.bg, color: theme.text, borderColor: theme.border }} /></div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{TAGS.map(t => <button key={t.id} onClick={() => setCat(t.id)} style={{ padding: "6px 12px", borderRadius: 20, border: cat === t.id ? `2px solid ${t.border}` : `1px solid ${theme.border}`, background: cat === t.id ? t.bg : "transparent", color: cat === t.id ? t.text : theme.text, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "0.2s" }}>{t.name}</button>)}</div>
        <input value={loc} onChange={e => setLoc(e.target.value)} placeholder="📍 Add Location" className="input-base" style={{ background: theme.bg, color: theme.text, borderColor: theme.border }} />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Add description..." className="input-base" style={{ background: theme.bg, color: theme.text, borderColor: theme.border, minHeight: 80, resize: "none" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 12, background: "transparent", color: theme.textSecondary, border: "none", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
        <button onClick={submit} style={{ padding: "10px 32px", borderRadius: 12, background: theme.accent, color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, boxShadow: `0 4px 12px ${theme.accent}66` }}>Save Event</button>
      </div>
    </div>
  );
}