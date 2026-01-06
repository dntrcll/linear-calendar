import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth, provider } from "./firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

// ==========================================
// 1. CORE SYSTEM CONFIGURATION
// ==========================================

const APP_META = { 
  name: "Timeline", 
  version: "4.0.0-Luxe",
  quoteInterval: 14400000 // 4 Hours
};

const LAYOUT = {
  SIDEBAR_WIDTH: 280,
  HEADER_HEIGHT: 80,
  PIXELS_PER_MINUTE: 2.2, // Increased for manifesto readability
  SNAP_MINUTES: 15,
  YEAR_COLS: 38 // Sufficient cols for 31 days + max offset
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
// 2. DESIGN SYSTEM (RESTORED LUXE PALETTE)
// ==========================================

const THEMES = {
  light: {
    id: 'light',
    bg: "#FAFAF9", // Warm Alabaster
    sidebar: "#F5F5F4",
    card: "#FFFFFF",
    text: "#1C1917", // Stone 900
    textSec: "#57534E",
    textMuted: "#A8A29E",
    border: "#E7E5E4",
    accent: "#D97706", // Amber 600
    familyAccent: "#059669", // Emerald
    selection: "#FDE68A",
    shadow: "0 12px 32px -4px rgba(28, 25, 23, 0.08)",
    glass: "rgba(255, 255, 255, 0.9)",
    indicator: "#BE123C", // Rose
    manifestoLine: "#D6D3D1"
  },
  dark: {
    id: 'dark',
    bg: "#0B0E11", // Deep Midnight (Matches Screenshot)
    sidebar: "#111418",
    card: "#181B21",
    text: "#F5F5F4",
    textSec: "#A8A29E",
    textMuted: "#57534E",
    border: "#292524",
    accent: "#3B82F6", // Electric Blue (Matches Screenshot)
    familyAccent: "#10B981",
    selection: "#1E3A8A",
    shadow: "0 24px 48px -12px rgba(0, 0, 0, 0.8)",
    glass: "rgba(11, 14, 17, 0.85)",
    indicator: "#F43F5E",
    manifestoLine: "#292524"
  }
};

const TAGS = [
  { id: 'work',    name: "Business",  color: "#78716C", bg: "#F5F5F4", darkBg: "#292524" },
  { id: 'health',  name: "Wellness",  color: "#BE123C", bg: "#FFF1F2", darkBg: "#881337" },
  { id: 'finance', name: "Finance",   color: "#059669", bg: "#ECFDF5", darkBg: "#064E3B" },
  { id: 'social',  name: "Social",    color: "#7C3AED", bg: "#F5F3FF", darkBg: "#5B21B6" },
  { id: 'deep',    name: "Deep Work", color: "#2563EB", bg: "#EFF6FF", darkBg: "#1E3A8A" },
];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
  
  :root { --ease: cubic-bezier(0.22, 1, 0.36, 1); }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
  
  body { font-family: 'Inter', sans-serif; overflow: hidden; transition: background 0.4s var(--ease); }
  h1, h2, h3, .serif { font-family: 'Playfair Display', serif; }
  
  /* Scrollbar */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(120, 113, 108, 0.2); border-radius: 10px; }
  
  /* Animations */
  .fade-enter { animation: fadeIn 0.5s var(--ease) forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  
  .glass-panel { backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
  .past-event { filter: grayscale(1) opacity(0.5); transition: 0.3s; pointer-events: none; }
  
  /* UI Components */
  .btn-reset { border: none; background: transparent; cursor: pointer; color: inherit; font-family: inherit; }
  .btn-hover:hover { transform: translateY(-1px); transition: transform 0.2s; }
  
  /* Settings Toggle (Matches Screenshot) */
  .switch-container { position: relative; width: 44px; height: 24px; border-radius: 12px; background: #3F3F46; transition: 0.3s; cursor: pointer; }
  .switch-container.active { background: #3B82F6; }
  .switch-knob { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: 0.3s var(--ease); box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
  .switch-container.active .switch-knob { transform: translateX(20px); }

  /* Segmented Control (Matches Screenshot) */
  .segmented { display: flex; background: rgba(120, 120, 120, 0.1); padding: 3px; border-radius: 8px; border: 1px solid rgba(120,120,120,0.1); }
  .seg-opt { flex: 1; padding: 6px; text-align: center; font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 6px; color: inherit; opacity: 0.6; transition: 0.2s; }
  .seg-opt.active { background: #3B82F6; color: #fff; opacity: 1; font-weight: 600; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3); }
  .light-mode .seg-opt.active { background: #fff; color: #000; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
`;

// ==========================================
// 3. MAIN APPLICATION KERNEL
// ==========================================

export default function TimelineOS() {
  // --- STATE ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Temporal
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [viewMode, setViewMode] = useState("year"); // Default to Year view per screenshot
  
  // Context & Data
  const [context, setContext] = useState("personal"); // 'personal' | 'family'
  const [events, setEvents] = useState([]);
  const [deletedEvents, setDeletedEvents] = useState([]);
  const [activeTags, setActiveTags] = useState(TAGS.map(t => t.id));
  const [quote, setQuote] = useState(QUOTES[0]);
  
  // UI Overlays
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  // Settings (Persistent)
  const [config, setConfig] = useState(() => JSON.parse(localStorage.getItem('timeline_v4_cfg')) || {
    darkMode: true, // Default to Dark per screenshot
    use24Hour: false,
    blurPast: true,
    weekStartMon: true
  });

  const scrollRef = useRef(null);
  const theme = config.darkMode ? THEMES.dark : THEMES.light;

  // --- INITIALIZATION ---
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

  // Scroll logic for Manifesto View
  useEffect(() => {
    if (viewMode === 'day' && scrollRef.current) {
      scrollRef.current.scrollTop = 6 * 60 * LAYOUT.PIXELS_PER_MINUTE; // Start at 6 AM
    }
  }, [viewMode]);

  // --- DATA OPERATIONS ---
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
        context: context, // Save current context
        description: data.description || "",
        startTime: Timestamp.fromDate(data.start),
        endTime: Timestamp.fromDate(data.end),
        deleted: false,
        updatedAt: serverTimestamp()
      };
      if(data.id) await updateDoc(doc(db, "events", data.id), payload);
      else { payload.createdAt = serverTimestamp(); await addDoc(collection(db, "events"), payload); }
      setModalOpen(false); loadData(user); notify("Saved to Timeline.");
    } catch(e) { notify("Save error.", "error"); }
  };

  const softDelete = async (id) => {
    if(!window.confirm("Move to trash?")) return;
    await updateDoc(doc(db, "events", id), { deleted: true });
    setModalOpen(false); loadData(user); notify("Item discarded.");
  };

  const notify = (msg, type='neutral') => {
    const id = Date.now();
    setNotifications(p => [...p, {id, msg, type}]);
    setTimeout(() => setNotifications(p => p.filter(n => n.id !== id)), 3000);
  };

  // --- VIEW HELPERS ---
  const nav = (amt) => {
    const d = new Date(currentDate);
    if(viewMode === 'year') d.setFullYear(d.getFullYear() + amt);
    else if(viewMode === 'week') d.setDate(d.getDate() + (amt*7));
    else d.setDate(d.getDate() + amt);
    setCurrentDate(d);
  };

  // Filtered Events
  const visibleEvents = useMemo(() => {
    return events.filter(e => e.context === context && activeTags.includes(e.category));
  }, [events, context, activeTags]);

  const upcoming = visibleEvents.filter(e => e.start > now).sort((a,b) => a.start - b.start).slice(0, 3);

  if (!user) return <AuthScreen onLogin={() => signInWithPopup(auth, provider)} theme={theme} />;

  return (
    <div style={{ display: "flex", height: "100vh", background: theme.bg, color: theme.text }}>
      
      {/* 4. SIDEBAR NAVIGATION */}
      <aside style={{ width: LAYOUT.SIDEBAR_WIDTH, background: theme.sidebar, borderRight: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", padding: "32px 24px", zIndex: 50 }}>
        <div style={{ marginBottom: 32 }}>
          <h1 className="serif" style={{ fontSize: 32, fontWeight: 700, color: theme.text, letterSpacing: "-0.5px" }}>Timeline.</h1>
          <div style={{ fontSize: 13, color: theme.textSec, marginTop: 4 }}>Welcome back, <span style={{fontWeight:600}}>{user.displayName?.split(" ")[0]}</span></div>
        </div>

        {/* Context Tabs */}
        <div style={{ display: "flex", background: "rgba(0,0,0,0.04)", padding: 4, borderRadius: 12, marginBottom: 32 }}>
          <button onClick={() => setContext('personal')} className="btn-reset" style={{ flex: 1, padding: "8px", borderRadius: 8, background: context==='personal' ? theme.card : 'transparent', color: context==='personal' ? theme.accent : theme.textSec, fontSize: 13, fontWeight: 600, boxShadow: context==='personal' ? theme.shadow : 'none', transition: "0.2s" }}>Personal</button>
          <button onClick={() => setContext('family')} className="btn-reset" style={{ flex: 1, padding: "8px", borderRadius: 8, background: context==='family' ? theme.card : 'transparent', color: context==='family' ? theme.familyAccent : theme.textSec, fontSize: 13, fontWeight: 600, boxShadow: context==='family' ? theme.shadow : 'none', transition: "0.2s" }}>Family</button>
        </div>

        <button onClick={() => { setEditingEvent(null); setModalOpen(true); }} className="btn-reset btn-hover" style={{ width: "100%", padding: "14px", borderRadius: 12, background: context==='family' ? theme.familyAccent : theme.accent, color: "#fff", fontSize: 14, fontWeight: 600, marginBottom: 32 }}>
          + New Event
        </button>

        <div style={{ padding: 20, background: theme.card, borderRadius: 16, border: `1px solid ${theme.border}`, marginBottom: 32 }}>
          <p className="serif" style={{ fontSize: 16, fontStyle: "italic", lineHeight: 1.5, color: theme.textSec }}>"{quote}"</p>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <h4 style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>Upcoming</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {upcoming.length === 0 && <span style={{fontSize:13, color: theme.textMuted}}>No upcoming events.</span>}
            {upcoming.map(e => (
              <div key={e.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 3, height: 32, borderRadius: 2, background: TAGS.find(t=>t.id===e.category)?.color }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{e.title}</div>
                  <div style={{ fontSize: 12, color: theme.textMuted }}>{e.start.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between" }}>
          <button onClick={() => setTrashOpen(true)} className="btn-reset" style={{ color: theme.textSec, fontSize: 14 }}>Trash ({deletedEvents.length})</button>
          <button onClick={() => setSettingsOpen(true)} className="btn-reset" style={{ color: theme.textSec, fontSize: 14 }}>Settings</button>
        </div>
      </aside>

      {/* 5. MAIN WORKSPACE */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        
        {/* Header */}
        <header style={{ height: LAYOUT.HEADER_HEIGHT, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", borderBottom: `1px solid ${theme.border}`, background: theme.bg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <h2 className="serif" style={{ fontSize: 32, fontWeight: 500 }}>{viewMode === 'year' ? currentDate.getFullYear() : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => nav(-1)} className="btn-reset btn-hover" style={{ width: 32, height: 32, borderRadius: 16, border: `1px solid ${theme.border}` }}>←</button>
              <button onClick={() => setCurrentDate(new Date())} className="btn-reset btn-hover" style={{ padding: "0 16px", height: 32, borderRadius: 16, border: `1px solid ${theme.border}`, fontSize: 13, fontWeight: 500 }}>Today</button>
              <button onClick={() => nav(1)} className="btn-reset btn-hover" style={{ width: 32, height: 32, borderRadius: 16, border: `1px solid ${theme.border}` }}>→</button>
            </div>
          </div>
          <div style={{ display: "flex", background: theme.sidebar, padding: 4, borderRadius: 12 }}>
            {['day', 'week', 'year'].map(m => (
              <button key={m} onClick={() => setViewMode(m)} className="btn-reset" style={{ padding: "8px 20px", borderRadius: 8, background: viewMode===m ? theme.card : 'transparent', color: viewMode===m ? theme.text : theme.textMuted, fontSize: 13, fontWeight: 600, boxShadow: viewMode===m ? theme.shadow : 'none', textTransform: "capitalize", transition: "0.2s" }}>{m}</button>
            ))}
          </div>
        </header>

        {/* Viewport */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          
          {/* DAY VIEW: DAILY MANIFESTO (Screenshot 3) */}
          {viewMode === 'day' && (
            <div className="fade-enter" style={{ padding: "40px 80px", maxWidth: 900, margin: "0 auto" }}>
              <div style={{ marginBottom: 60 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.accent, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>{currentDate.toLocaleDateString('en-US', {weekday:'long'})}</div>
                <h1 className="serif" style={{ fontSize: 64, fontWeight: 500, color: theme.text }}>{currentDate.toDateString() === now.toDateString() ? "Today's Agenda" : currentDate.toLocaleDateString('en-US', {month:'long', day:'numeric'})}</h1>
              </div>

              <div style={{ position: "relative", borderLeft: `1px solid ${theme.manifestoLine}`, paddingLeft: 40 }}>
                {Array.from({length: 24}).map((_, h) => {
                  if (h < 5) return null; // Start from 5AM like screenshot
                  
                  const slotEvents = visibleEvents.filter(e => 
                    e.start.toDateString() === currentDate.toDateString() && 
                    e.start.getHours() === h
                  );

                  return (
                    <div key={h} style={{ minHeight: 80, position: "relative", marginBottom: 20 }}>
                      {/* Time Marker */}
                      <div className="serif" style={{ position: "absolute", left: -90, top: -8, fontSize: 16, color: theme.textMuted, width: 40, textAlign: "right" }}>
                        {config.use24Hour ? h : (h % 12 || 12) + (h<12?' AM':' PM')}
                      </div>
                      
                      {/* Dot */}
                      <div style={{ position: "absolute", left: -45, top: 4, width: 9, height: 9, borderRadius: "50%", background: theme.bg, border: `2px solid ${theme.textSec}` }} />

                      {/* Content */}
                      <div>
                        {slotEvents.map(ev => {
                          const tag = TAGS.find(t => t.id === ev.category) || TAGS[0];
                          const isPast = config.blurPast && ev.end < now;
                          return (
                            <div key={ev.id} onClick={() => { setEditingEvent(ev); setModalOpen(true); }} className={`btn-hover ${isPast ? 'past-event' : ''}`} style={{ marginBottom: 12, cursor: "pointer" }}>
                              <div style={{ fontSize: 20, fontWeight: 500, color: theme.text }}>{ev.title}</div>
                              <div style={{ fontSize: 14, color: theme.textSec, marginTop: 4 }}>{ev.start.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})} — {ev.end.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}</div>
                            </div>
                          );
                        })}
                        {/* Empty Slot Click Target */}
                        {slotEvents.length === 0 && (
                          <div 
                            style={{ height: 40, cursor: "pointer" }} 
                            onClick={() => {
                              const s = new Date(currentDate); s.setHours(h,0,0,0);
                              const e = new Date(s); e.setHours(h+1);
                              setEditingEvent({ start: s, end: e, title: "", category: TAGS[0].id });
                              setModalOpen(true);
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* YEAR VIEW: LINEAR (Screenshot 1) */}
          {viewMode === 'year' && (
            <div className="fade-enter" style={{ padding: "40px", overflowX: "auto" }}>
              <div style={{ minWidth: 1200 }}>
                {/* Header Row */}
                <div style={{ display: "flex", marginLeft: 100, marginBottom: 16 }}>
                  {Array.from({length: LAYOUT.YEAR_COLS}).map((_,i) => (
                    <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: 700, color: theme.textMuted }}>{(config.weekStartMon ? ["M","T","W","T","F","S","S"] : ["S","M","T","W","T","F","S"])[i%7]}</div>
                  ))}
                </div>
                {/* Month Rows */}
                {Array.from({length: 12}).map((_, m) => {
                  const monthStart = new Date(currentDate.getFullYear(), m, 1);
                  const daysInMonth = new Date(currentDate.getFullYear(), m+1, 0).getDate();
                  let offset = monthStart.getDay(); 
                  if(config.weekStartMon) offset = offset===0 ? 6 : offset-1;

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
                                border: isT ? `1px solid ${theme.accent}` : "none",
                                fontWeight: isT ? 700 : 400
                              }}>
                              {dayNum}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WEEK VIEW */}
          {viewMode === 'week' && <WeekView currentDate={currentDate} events={visibleEvents} theme={theme} config={config} onNew={(s,e) => { setEditingEvent({start:s, end:e, title:"", category: TAGS[0].id}); setModalOpen(true); }} />}

        </div>
      </div>

      {/* 6. SETTINGS MODAL (Screenshot 2) */}
      {settingsOpen && (
        <div className="glass-panel fade-enter" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }} onClick={() => setSettingsOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 400, background: theme.card, padding: 24, borderRadius: 20, boxShadow: theme.shadow }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
              <h3 className="serif" style={{ fontSize: 20 }}>Settings</h3>
              <button onClick={() => setSettingsOpen(false)} className="btn-reset" style={{ fontSize: 20 }}>✕</button>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Theme</label>
              <div className={`segmented ${!config.darkMode ? 'light-mode' : ''}`}>
                <div onClick={() => setConfig({...config, darkMode: false})} className={`seg-opt ${!config.darkMode?'active':''}`}>☀ Light</div>
                <div onClick={() => setConfig({...config, darkMode: true})} className={`seg-opt ${config.darkMode?'active':''}`}>☾ Dark</div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div><div style={{fontSize:14, fontWeight:500}}>Blur Past Dates</div><div style={{fontSize:11, color:theme.textMuted}}>Fade old days</div></div>
              <div className={`switch-container ${config.blurPast?'active':''}`} onClick={() => setConfig({...config, blurPast:!config.blurPast})}><div className="switch-knob"/></div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Week Starts On</label>
              <div className={`segmented ${!config.darkMode ? 'light-mode' : ''}`}>
                <div onClick={() => setConfig({...config, weekStartMon: false})} className={`seg-opt ${!config.weekStartMon?'active':''}`}>Sunday</div>
                <div onClick={() => setConfig({...config, weekStartMon: true})} className={`seg-opt ${config.weekStartMon?'active':''}`}>Monday</div>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Time Format</label>
              <div className={`segmented ${!config.darkMode ? 'light-mode' : ''}`}>
                <div onClick={() => setConfig({...config, use24Hour: false})} className={`seg-opt ${!config.use24Hour?'active':''}`}>12-hour</div>
                <div onClick={() => setConfig({...config, use24Hour: true})} className={`seg-opt ${config.use24Hour?'active':''}`}>24-hour</div>
              </div>
            </div>

            <button onClick={() => signOut(auth)} style={{ width: "100%", padding: "12px", borderRadius: 8, border: `1px solid ${theme.indicator}`, color: theme.indicator, background: "transparent", fontWeight: 600, cursor: "pointer" }}>Sign Out</button>
          </div>
        </div>
      )}

      {/* EVENT MODAL */}
      {modalOpen && (
        <div className="glass-panel fade-enter" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }} onClick={() => setModalOpen(false)}>
          <EventEditor event={editingEvent} theme={theme} onSave={handleSave} onDelete={editingEvent?.id ? () => softDelete(editingEvent.id) : null} onCancel={() => setModalOpen(false)} />
        </div>
      )}

      {/* TRASH MODAL */}
      {trashOpen && (
        <TrashModal events={deletedEvents} theme={theme} onClose={() => setTrashOpen(false)} onRestore={(id) => { restoreEvent(id); setTrashOpen(false); }} />
      )}

      {/* NOTIFICATIONS */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, display: "flex", flexDirection: "column", gap: 10 }}>
        {notifications.map(n => (<div key={n.id} className="fade-enter" style={{ padding: "12px 24px", background: n.type==='error' ? theme.indicator : theme.card, color: n.type==='error' ? '#fff' : theme.text, borderRadius: 8, boxShadow: "0 10px 40px rgba(0,0,0,0.2)", fontSize: 13, fontWeight: 600 }}>{n.msg}</div>))}
      </div>

    </div>
  );
}

// ==========================================
// 4. SUB-COMPONENTS
// ==========================================

function WeekView({ currentDate, events, theme, config, onNew }) {
  const days = useMemo(() => {
    const s = new Date(currentDate);
    const day = s.getDay();
    const diff = s.getDate() - day + (config.weekStartMon ? (day === 0 ? -6 : 1) : 0);
    return Array.from({length:7}, (_,i) => { const d = new Date(s); d.setDate(diff + i); return d; });
  }, [currentDate, config.weekStartMon]);

  return (
    <div style={{ display: "flex", minHeight: "100%" }}>
      <div style={{ width: 60, flexShrink: 0, borderRight: `1px solid ${theme.border}`, background: theme.bg }}>
        {Array.from({length:24}).map((_,h) => <div key={h} style={{ height: 60*LAYOUT.PIXELS_PER_MINUTE, position:"relative" }}><span style={{ position:"absolute", top:-6, right:8, fontSize:11, color:theme.textMuted }}>{h}:00</span></div>)}
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
              <div style={{ position: "relative", height: 24*60*LAYOUT.PIXELS_PER_MINUTE }}>
                {Array.from({length:24}).map((_,h) => <div key={h} style={{ height: 60*LAYOUT.PIXELS_PER_MINUTE, borderBottom: `1px solid ${theme.border}40` }} />)}
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
                  const tag = TAGS.find(t => t.id === ev.category) || TAGS[0];
                  return (
                    <div key={ev.id} className="btn-hover" style={{ position: "absolute", top, height: h, left: 4, right: 4, background: config.darkMode ? tag.darkBg : tag.bg, borderLeft: `3px solid ${tag.color}`, borderRadius: 4, padding: 4, fontSize: 11, color: theme.text, cursor: "pointer", zIndex: 5, overflow: "hidden" }}>
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

function EventEditor({ event, theme, onSave, onDelete, onCancel }) {
  const [data, setData] = useState({ 
    title: event?.title || "", 
    category: event?.category || TAGS[0].id,
    start: event?.start ? event.start.toTimeString().slice(0,5) : "09:00",
    end: event?.end ? event.end.toTimeString().slice(0,5) : "10:00",
    description: event?.description || ""
  });

  const submit = () => {
    const s = new Date(event?.start || new Date());
    const [sh, sm] = data.start.split(':'); s.setHours(sh, sm);
    const e = new Date(s);
    const [eh, em] = data.end.split(':'); e.setHours(eh, em);
    onSave({ ...data, id: event?.id, start: s, end: e });
  };

  return (
    <div onClick={e => e.stopPropagation()} style={{ width: 440, background: theme.card, padding: 32, borderRadius: 24, boxShadow: theme.shadow }}>
      <h3 className="serif" style={{ fontSize: 24, marginBottom: 24 }}>{event?.id ? "Edit Event" : "Create Event"}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <input autoFocus value={data.title} onChange={e => setData({...data, title: e.target.value})} placeholder="Title" style={{ width: "100%", padding: "12px", borderRadius: 8, background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text, fontSize: 16 }} />
        <div style={{ display: "flex", gap: 12 }}>
          <input type="time" value={data.start} onChange={e => setData({...data, start: e.target.value})} style={{ flex: 1, padding: "12px", borderRadius: 8, background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }} />
          <input type="time" value={data.end} onChange={e => setData({...data, end: e.target.value})} style={{ flex: 1, padding: "12px", borderRadius: 8, background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {TAGS.map(t => (
            <button key={t.id} onClick={() => setData({...data, category: t.id})} style={{ padding: "6px 12px", borderRadius: 20, border: `1px solid ${data.category===t.id ? t.color : theme.border}`, background: data.category===t.id ? t.bg : "transparent", color: t.color, fontSize: 12, cursor: "pointer" }}>{t.name}</button>
          ))}
        </div>
        <textarea value={data.description} onChange={e => setData({...data, description: e.target.value})} placeholder="Notes..." style={{ width: "100%", padding: "12px", borderRadius: 8, background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text, minHeight: 80 }} />
        <div style={{ display: "flex", justifySelf: "end", gap: 12, marginTop: 12 }}>
          {onDelete && <button onClick={onDelete} style={{ marginRight: "auto", color: theme.indicator, background: "transparent", border: "none", cursor: "pointer" }}>Delete</button>}
          <button onClick={onCancel} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", color: theme.textSec, border: "none", cursor: "pointer" }}>Cancel</button>
          <button onClick={submit} style={{ padding: "10px 24px", borderRadius: 8, background: theme.accent, color: "#fff", border: "none", cursor: "pointer" }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function TrashModal({ events, theme, onClose, onRestore }) {
  return (
    <div className="glass-panel fade-enter" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 500, height: "70vh", background: theme.card, padding: 32, borderRadius: 24, boxShadow: theme.shadow, display: "flex", flexDirection: "column" }}>
        <h3 className="serif" style={{ fontSize: 24, marginBottom: 24 }}>Trash</h3>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {events.map(ev => (
            <div key={ev.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottom: `1px solid ${theme.border}` }}>
              <div><div style={{fontWeight:600}}>{ev.title}</div><div style={{fontSize:12, color:theme.textMuted}}>{ev.start.toLocaleDateString()}</div></div>
              <button onClick={() => onRestore(ev.id)} style={{ padding: "6px 12px", borderRadius: 6, background: theme.accent, color: "#fff", border: "none", cursor: "pointer" }}>Restore</button>
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