import { useEffect, useState, useRef, useCallback } from "react";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth, provider } from "./firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

// ==========================================
// 1. CONFIGURATION
// ==========================================

const APP_NAME = "Meridian";
const CONFIG = {
  PIXELS_PER_MINUTE: 1.8,
  SNAP_MINUTES: 15,
  SIDEBAR_WIDTH: 260,
  HEADER_HEIGHT: 70,
  YEAR_COLUMNS: 38,
};

// ==========================================
// 2. PREMIUM THEME ENGINE
// ==========================================

const THEMES = {
  light: {
    id: 'light',
    bg: "#FFFFFF", // Pure White Canvas
    sidebar: "#F8FAFC", // Cool Porcelain Sidebar
    card: "#FFFFFF",
    text: "#0F172A", // Slate 900 (High contrast)
    textSecondary: "#64748B", // Slate 500
    border: "#E2E8F0", 
    gridLine: "#F1F5F9", // Very subtle grid
    accent: "#4F46E5", // Indigo 600 (More premium than standard blue)
    weekendBg: "#FAFAFA",
    glass: "rgba(255, 255, 255, 0.9)",
    shadow: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
    eventShadow: "0 2px 4px rgba(0,0,0,0.04)",
    timeIndicator: "#EF4444", // Rose Red
  },
  dark: {
    id: 'dark',
    bg: "#0B0E11", // Deep Midnight
    sidebar: "#11161F",
    card: "#181E2A",
    text: "#F1F5F9", 
    textSecondary: "#94A3B8",
    border: "#252D3D",
    gridLine: "#1E293B",
    accent: "#3B82F6", // Electric Blue
    weekendBg: "#0F131A",
    glass: "rgba(17, 22, 31, 0.85)",
    shadow: "0 10px 30px -5px rgba(0, 0, 0, 0.5)",
    eventShadow: "0 4px 6px rgba(0,0,0,0.3)",
    timeIndicator: "#3B82F6", // Blue glow
  }
};

const TAGS = [
  { id: 'work',    name: "Business", bg: "#F0F9FF", border: "#0EA5E9", text: "#0369A1", darkBg: "#0C4A6E" },
  { id: 'focus',   name: "Focus",    bg: "#F0FDF4", border: "#22C55E", text: "#15803D", darkBg: "#14532D" },
  { id: 'urgent',  name: "Critical", bg: "#FEF2F2", border: "#EF4444", text: "#B91C1C", darkBg: "#7F1D1D" },
  { id: 'personal',name: "Life",     bg: "#FAF5FF", border: "#A855F7", text: "#7E22CE", darkBg: "#581C87" },
  { id: 'travel',  name: "Travel",   bg: "#FFF7ED", border: "#F97316", text: "#C2410C", darkBg: "#7C2D12" },
];

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
  
  :root { --ease: cubic-bezier(0.25, 1, 0.5, 1); }
  * { box-sizing: border-box; margin: 0; padding: 0; outline: none; -webkit-font-smoothing: antialiased; }
  
  body { font-family: 'Inter', sans-serif; overflow: hidden; transition: background 0.3s ease; }
  h1, h2, h3, h4, .brand { font-family: 'Outfit', sans-serif; }
  
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 3px; }
  
  .fade-in { animation: fadeIn 0.4s var(--ease) forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  
  .pulse-red { animation: pulseRed 2s infinite; }
  @keyframes pulseRed { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
  
  .pulse-blue { animation: pulseBlue 2s infinite; }
  @keyframes pulseBlue { 0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }

  .past-blur { filter: grayscale(1) opacity(0.5); pointer-events: none; transition: 0.3s; }
  
  /* Toggle Switch */
  .switch { position: relative; width: 44px; height: 24px; border-radius: 12px; background: #CBD5E1; transition: 0.3s; cursor: pointer; }
  .switch.active { background: #4F46E5; }
  .knob { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: white; transition: 0.3s var(--ease); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  .switch.active .knob { transform: translateX(20px); }
  
  /* Buttons */
  .btn-nav { padding: 6px 14px; border-radius: 8px; font-weight: 600; font-size: 13px; transition: all 0.2s; border: none; cursor: pointer; }
  .btn-nav:hover { background: rgba(0,0,0,0.05); }
`;

export default function MeridianCalendar() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [viewMode, setViewMode] = useState("year");
  
  // Settings
  const [settings, setSettings] = useState(() => JSON.parse(localStorage.getItem('meridian_cfg')) || {
    darkMode: false, use24Hour: false, blurPast: true, weekStartMon: true, activeTags: TAGS.map(t=>t.id)
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  // Interaction
  const [editingEvent, setEditingEvent] = useState(null);
  const [dragData, setDragData] = useState(null);
  const scrollRef = useRef(null);
  const theme = settings.darkMode ? THEMES.dark : THEMES.light;

  // --- SETUP ---
  useEffect(() => { const s = document.createElement('style'); s.textContent = GLOBAL_CSS; document.head.appendChild(s); return () => s.remove(); }, []);
  useEffect(() => { setPersistence(auth, browserLocalPersistence); return auth.onAuthStateChanged(u => { setUser(u); if(u) loadEvents(u); }); }, []);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  useEffect(() => localStorage.setItem('meridian_cfg', JSON.stringify(settings)), [settings]);
  
  useEffect(() => {
    if ((viewMode === 'day' || viewMode === 'week') && scrollRef.current) {
      scrollRef.current.scrollTop = 8 * 60 * CONFIG.PIXELS_PER_MINUTE;
    }
  }, [viewMode]);

  // --- DATA ---
  const loadEvents = async (u) => {
    if(!u) return;
    try {
      const q = query(collection(db, "events"), where("uid", "==", u.uid), where("deleted", "==", false));
      const snap = await getDocs(q);
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data(), start: d.data().startTime.toDate(), end: d.data().endTime.toDate() })));
    } catch(e) { notify("Sync error", "error"); }
  };

  const notify = (msg, type='info') => {
    const id = Date.now();
    setNotifications(p => [...p, {id, msg, type}]);
    setTimeout(() => setNotifications(p => p.filter(n => n.id !== id)), 3000);
  };

  const handleSave = async (data) => {
    try {
      const payload = { 
        uid: user.uid, title: data.title, category: data.category, 
        startTime: Timestamp.fromDate(data.start), endTime: Timestamp.fromDate(data.end), 
        deleted: false, updatedAt: serverTimestamp() 
      };
      if(data.id) await updateDoc(doc(db, "events", data.id), payload);
      else { payload.createdAt = serverTimestamp(); await addDoc(collection(db, "events"), payload); }
      setModalOpen(false); loadEvents(user); notify("Saved successfully");
    } catch(e) { notify("Failed to save", "error"); }
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
    } catch(e) { loadEvents(user); }
    setDragData(null);
  }, [dragData, events, user]);

  useEffect(() => {
    if(dragData) { window.addEventListener('mousemove', onDragMove); window.addEventListener('mouseup', onDragEnd); }
    return () => { window.removeEventListener('mousemove', onDragMove); window.removeEventListener('mouseup', onDragEnd); };
  }, [dragData, onDragMove, onDragEnd]);

  // --- HELPERS ---
  const nav = (amt) => {
    const d = new Date(currentDate);
    if(viewMode === 'year') d.setFullYear(d.getFullYear() + amt);
    else if(viewMode === 'week') d.setDate(d.getDate() + (amt*7));
    else d.setDate(d.getDate() + amt);
    setCurrentDate(d);
  };
  const isToday = (d) => d.toDateString() === now.toDateString();
  const fmtTime = (d) => d.toLocaleTimeString([], { hour: settings.use24Hour?"2-digit":"numeric", minute:"2-digit", hour12:!settings.use24Hour });

  if (!user) return <div style={{height:"100vh", background: "#0F172A", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column"}}>
    <h1 className="brand" style={{fontSize: 64, color: "#fff", marginBottom: 20, letterSpacing: "-2px"}}>Meridian.</h1>
    <button onClick={() => signInWithPopup(auth, provider)} style={{padding: "16px 32px", borderRadius: 12, background: "#4F46E5", color: "#fff", border:"none", fontSize: 16, fontWeight: 600, cursor: "pointer"}}>Sign In</button>
  </div>;

  return (
    <div style={{ display: "flex", height: "100vh", background: theme.bg, color: theme.text }}>
      
      {/* SIDEBAR */}
      <aside style={{ width: CONFIG.SIDEBAR_WIDTH, background: theme.sidebar, borderRight: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", padding: 24, zIndex: 20 }}>
        <div style={{ marginBottom: 40, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 24, height: 24, background: theme.accent, borderRadius: 6 }} />
          <h1 className="brand" style={{ fontSize: 24, fontWeight: 700, color: theme.text }}>{APP_NAME}</h1>
        </div>

        <button onClick={() => { setEditingEvent(null); setModalOpen(true); }} style={{ width: "100%", padding: "14px", borderRadius: 12, background: theme.accent, color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 10px ${theme.accent}40`, marginBottom: 32 }}>+ New Event</button>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.textSecondary, textTransform: "uppercase", marginBottom: 16, letterSpacing: 1 }}>Categories</div>
          {TAGS.map(t => (
            <div key={t.id} onClick={() => setSettings(s => ({...s, activeTags: s.activeTags.includes(t.id) ? s.activeTags.filter(x=>x!==t.id) : [...s.activeTags, t.id] }))} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", cursor: "pointer", opacity: settings.activeTags.includes(t.id) ? 1 : 0.4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.border }} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>{t.name}</span>
            </div>
          ))}
        </div>

        <button onClick={() => setShowSettings(true)} style={{ padding: 12, borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Preferences</button>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* HEADER */}
        <header style={{ height: CONFIG.HEADER_HEIGHT, borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", background: theme.bg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <h2 className="brand" style={{ fontSize: 24, fontWeight: 600, minWidth: 180 }}>{viewMode === 'year' ? currentDate.getFullYear() : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <div style={{ display: "flex", background: theme.sidebar, padding: 4, borderRadius: 10, border: `1px solid ${theme.border}` }}>
              <button onClick={() => nav(-1)} className="btn-nav" style={{ color: theme.text }}>←</button>
              <button onClick={() => setCurrentDate(new Date())} className="btn-nav" style={{ color: theme.text }}>Today</button>
              <button onClick={() => nav(1)} className="btn-nav" style={{ color: theme.text }}>→</button>
            </div>
          </div>

          <div style={{ display: "flex", background: theme.sidebar, padding: 4, borderRadius: 10, border: `1px solid ${theme.border}` }}>
            {['day', 'week', 'year'].map(m => (
              <button key={m} onClick={() => setViewMode(m)} className="btn-nav" style={{ background: viewMode === m ? theme.bg : "transparent", color: viewMode === m ? theme.accent : theme.textSecondary, boxShadow: viewMode === m ? theme.eventShadow : "none", textTransform: "capitalize" }}>{m}</button>
            ))}
          </div>
        </header>

        {/* VIEWPORT */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          
          {/* DAY & WEEK SHARED GRID LOGIC */}
          {(viewMode === 'day' || viewMode === 'week') && (
            <div style={{ display: "flex", minHeight: "100%" }}>
              {/* Time Column */}
              <div style={{ width: 60, flexShrink: 0, borderRight: `1px solid ${theme.border}`, background: theme.bg }}>
                {Array.from({length: 24}).map((_, h) => (
                  <div key={h} style={{ height: 60 * CONFIG.PIXELS_PER_MINUTE, position: "relative" }}>
                    <span style={{ position: "absolute", top: -6, right: 8, fontSize: 11, color: theme.textSecondary, fontWeight: 600 }}>
                      {settings.use24Hour ? `${h}:00` : `${h===0?12:h>12?h-12:h} ${h>=12?'PM':'AM'}`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Grid Columns */}
              <div style={{ flex: 1, display: "flex" }}>
                {(viewMode === 'day' ? [currentDate] : (() => {
                  const s = new Date(currentDate);
                  const day = s.getDay();
                  const diff = s.getDate() - day + (settings.weekStartMon ? (day === 0 ? -6 : 1) : 0);
                  return Array.from({length:7}, (_,i) => { const d = new Date(s); d.setDate(diff + i); return d; });
                })()).map((date, i) => {
                  const isT = isToday(date);
                  const isPast = settings.blurPast && date < new Date(new Date().setHours(0,0,0,0));
                  const dEvents = events.filter(e => e.start.toDateString() === date.toDateString() && settings.activeTags.includes(e.category));

                  return (
                    <div key={i} style={{ flex: 1, borderRight: `1px solid ${theme.border}`, position: "relative", background: isT ? (settings.darkMode ? "#172033" : "#F8FAFC") : "transparent" }} className={isPast ? "past-blur" : ""}>
                      {/* Week Header */}
                      {viewMode === 'week' && (
                        <div style={{ height: 50, borderBottom: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: theme.sidebar, position: "sticky", top: 0, zIndex: 20 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: isT ? theme.accent : theme.textSecondary, textTransform: "uppercase" }}>{date.toLocaleDateString('en-US',{weekday:'short'})}</div>
                          <div style={{ fontSize: 18, fontWeight: 600, color: isT ? theme.accent : theme.text }}>{date.getDate()}</div>
                        </div>
                      )}

                      {/* Lines */}
                      {Array.from({length: 24}).map((_, h) => <div key={h} style={{ height: 60 * CONFIG.PIXELS_PER_MINUTE, borderBottom: `1px solid ${theme.gridLine}` }} />)}

                      {/* Time Indicator */}
                      {isT && <div style={{ position: "absolute", top: (now.getHours() * 60 + now.getMinutes()) * CONFIG.PIXELS_PER_MINUTE, left: 0, right: 0, height: 2, background: theme.timeIndicator, zIndex: 10 }}>
                        <div className={settings.darkMode ? "pulse-blue" : "pulse-red"} style={{ position: "absolute", left: -4, top: -4, width: 10, height: 10, borderRadius: "50%", background: theme.timeIndicator }} />
                      </div>}

                      {/* Click Creation */}
                      <div style={{ position: "absolute", inset: 0, zIndex: 1 }} onClick={(e) => {
                        if(dragData) return;
                        const m = Math.floor(e.nativeEvent.offsetY / CONFIG.PIXELS_PER_MINUTE / 15) * 15;
                        const s = new Date(date); s.setHours(0, m, 0, 0);
                        const en = new Date(s); en.setMinutes(m+60);
                        setEditingEvent({ start: s, end: en, title: "", category: TAGS[0].id });
                        setModalOpen(true);
                      }} />

                      {/* Events */}
                      {dEvents.map(ev => {
                        const top = (ev.start.getHours() * 60 + ev.start.getMinutes()) * CONFIG.PIXELS_PER_MINUTE;
                        const h = Math.max(((ev.end - ev.start)/60000) * CONFIG.PIXELS_PER_MINUTE, 24);
                        const tag = TAGS.find(t => t.id === ev.category) || TAGS[0];
                        const isDrag = dragData?.id === ev.id;
                        
                        return (
                          <div key={ev.id} onMouseDown={(e) => onDragStart(e, ev, 'move')}
                            style={{
                              position: "absolute", top, height: h, left: 4, right: 8,
                              background: settings.darkMode ? tag.darkBg : tag.bg,
                              borderLeft: `3px solid ${tag.border}`, borderRadius: 4, padding: "2px 6px",
                              boxShadow: isDrag ? theme.shadow : theme.eventShadow,
                              cursor: isDrag ? "grabbing" : "grab", zIndex: isDrag ? 50 : 10, opacity: isDrag ? 0.8 : 1
                            }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: settings.darkMode ? "#fff" : tag.text }}>{ev.title || "Untitled"}</div>
                            <div style={{ fontSize: 10, color: settings.darkMode ? "rgba(255,255,255,0.7)" : tag.text }}>{fmtTime(ev.start)} - {fmtTime(ev.end)}</div>
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

          {/* LINEAR YEAR VIEW */}
          {viewMode === 'year' && (
            <div style={{ padding: 40, overflowX: "auto" }}>
              <div style={{ minWidth: 1000, maxWidth: 1400, margin: "0 auto" }}>
                <div style={{ display: "flex", marginLeft: 100, marginBottom: 12 }}>
                  {Array.from({length: CONFIG.YEAR_COLUMNS}).map((_,i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 10, fontWeight: 700, color: theme.textSecondary, opacity: 0.6 }}>{(settings.weekStartMon ? ["M","T","W","T","F","S","S"] : ["S","M","T","W","T","F","S"])[i%7]}</div>)}
                </div>
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
                          return <div key={col} onClick={() => { setCurrentDate(date); setViewMode('day'); }}
                            style={{ flex: 1, borderRadius: 3, height: 30, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, cursor: "pointer", 
                            background: isT ? theme.accent : hasEv ? (settings.darkMode ? "#1E293B" : "#E0F2FE") : "transparent",
                            color: isT ? "#fff" : hasEv ? (settings.darkMode ? "#60A5FA" : "#0369A1") : theme.text, fontWeight: isT?700:400 }}>{num}</div>
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

      {/* FLOATING SETTINGS */}
      {showSettings && (
        <div className="fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={() => setShowSettings(false)}>
          <div style={{ width: 380, background: theme.card, padding: 24, borderRadius: 20, boxShadow: theme.shadow, border: `1px solid ${theme.border}` }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <h3 className="brand" style={{ fontSize: 18, color: theme.text }}>Settings</h3>
              <button onClick={() => setShowSettings(false)} style={{ background: "transparent", border: "none", color: theme.textSecondary, fontSize: 24, cursor: "pointer" }}>&times;</button>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, marginBottom: 8 }}>Theme</div>
              <div style={{ display: "flex", background: theme.bg, padding: 4, borderRadius: 10 }}>
                <button onClick={() => setSettings(s => ({...s, darkMode: false}))} style={{ flex: 1, padding: 8, borderRadius: 8, border: "none", background: !settings.darkMode ? theme.card : "transparent", color: !settings.darkMode ? theme.text : theme.textSecondary, fontWeight: 600, boxShadow: !settings.darkMode ? theme.eventShadow : "none", cursor: "pointer" }}>Light</button>
                <button onClick={() => setSettings(s => ({...s, darkMode: true}))} style={{ flex: 1, padding: 8, borderRadius: 8, border: "none", background: settings.darkMode ? theme.card : "transparent", color: settings.darkMode ? theme.text : theme.textSecondary, fontWeight: 600, boxShadow: settings.darkMode ? theme.eventShadow : "none", cursor: "pointer" }}>Dark</button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div><div style={{fontSize:13, fontWeight:600}}>Blur Past Dates</div><div style={{fontSize:11, color: theme.textSecondary}}>Fade out old days</div></div>
              <div className={`switch ${settings.blurPast?'active':''}`} onClick={() => setSettings(s => ({...s, blurPast:!s.blurPast}))}><div className="knob"/></div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div><div style={{fontSize:13, fontWeight:600}}>Start Monday</div><div style={{fontSize:11, color: theme.textSecondary}}>Week alignment</div></div>
              <div className={`switch ${settings.weekStartMon?'active':''}`} onClick={() => setSettings(s => ({...s, weekStartMon:!s.weekStartMon}))}><div className="knob"/></div>
            </div>

            <button onClick={() => signOut(auth)} style={{ width: "100%", padding: 12, border: "1px solid #EF4444", color: "#EF4444", background: "transparent", borderRadius: 8, cursor: "pointer", marginTop: 12 }}>Sign Out</button>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {modalOpen && (
        <div className="fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setModalOpen(false)}>
          <EventForm event={editingEvent} theme={theme} onSave={handleSave} onDelete={async (id) => { if(window.confirm("Delete?")) { await updateDoc(doc(db,"events",id), {deleted:true}); setModalOpen(false); loadEvents(user); } }} onClose={() => setModalOpen(false)} />
        </div>
      )}
      
      {/* NOTIFICATIONS */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, display: "flex", flexDirection: "column", gap: 10 }}>
        {notifications.map(n => <div key={n.id} className="fade-in" style={{ padding: "10px 20px", background: n.type==='error'?"#EF4444":"#10B981", color: "#FFF", borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 10px rgba(0,0,0,0.2)" }}>{n.msg}</div>)}
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: FORM ---
function EventForm({ event, theme, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(event?.title || "");
  const [cat, setCat] = useState(event?.category || TAGS[0].id);
  const [sTime, setSTime] = useState(event?.start?.toTimeString().slice(0,5) || "09:00");
  const [eTime, setETime] = useState(event?.end?.toTimeString().slice(0,5) || "10:00");

  const submit = () => {
    if(!title) return;
    const s = new Date(event?.start || new Date()); 
    const [sh, sm] = sTime.split(':'); s.setHours(sh, sm, 0, 0);
    const e = new Date(s); 
    const [eh, em] = eTime.split(':'); e.setHours(eh, em, 0, 0);
    if(e <= s) e.setDate(e.getDate() + 1);
    onSave({ id: event?.id, title, category: cat, start: s, end: e });
  };

  return (
    <div style={{ width: 400, background: theme.card, padding: 32, borderRadius: 20, boxShadow: theme.shadow }} onClick={e => e.stopPropagation()}>
      <h3 className="brand" style={{ fontSize: 22, color: theme.text, marginBottom: 24 }}>{event?.id ? "Edit" : "New"} Event</h3>
      <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" style={{ width: "100%", padding: 12, marginBottom: 16, borderRadius: 8, background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text, fontSize: 16 }} />
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <input type="time" value={sTime} onChange={e => setSTime(e.target.value)} style={{ flex: 1, padding: 12, borderRadius: 8, background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }} />
        <input type="time" value={eTime} onChange={e => setETime(e.target.value)} style={{ flex: 1, padding: 12, borderRadius: 8, background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        {TAGS.map(t => <button key={t.id} onClick={() => setCat(t.id)} style={{ padding: "6px 12px", borderRadius: 20, border: cat === t.id ? `2px solid ${t.border}` : `1px solid ${theme.border}`, background: cat === t.id ? t.bg : "transparent", color: cat === t.id ? t.text : theme.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{t.name}</button>)}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        {event?.id && <button onClick={() => onDelete(event.id)} style={{ marginRight: "auto", color: "#EF4444", background: "none", border: "none", cursor: "pointer" }}>Delete</button>}
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, background: theme.bg, color: theme.text, border: "none", cursor: "pointer" }}>Cancel</button>
        <button onClick={submit} style={{ padding: "10px 24px", borderRadius: 8, background: theme.accent, color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}>Save</button>
      </div>
    </div>
  );
}