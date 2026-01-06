import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth, provider } from "./firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

// ==========================================
// 1. CORE CONFIGURATION & CONSTANTS
// ==========================================

const APP_META = { 
  name: "Timeline", 
  version: "4.0.0-Luxe",
  quoteInterval: 4 * 60 * 60 * 1000 // New quote every 4 hours
};

const LAYOUT = {
  SIDEBAR_WIDTH: 280,
  HEADER_HEIGHT: 80,
  PIXELS_PER_MINUTE: 2.0, // High precision
  SNAP_MINUTES: 15,
  YEAR_COLS: 38
};

const QUOTES = [
  "Time is the luxury you cannot buy.",
  "Design your life, or someone else will.",
  "Focus on the rhythm, not the speed.",
  "Simplicity is the ultimate sophistication.",
  "What is essential is invisible to the eye.",
  "Act as if what you do makes a difference.",
  "The best way to predict the future is to create it."
];

// ==========================================
// 2. DESIGN SYSTEM (LUXE)
// ==========================================

const THEMES = {
  light: {
    id: 'light',
    bg: "#FAFAF9", // Warm Alabaster
    sidebar: "#F5F5F4", // Stone 100
    card: "#FFFFFF",
    text: "#1C1917", // Stone 900
    textSec: "#57534E", // Stone 600
    textMuted: "#A8A29E",
    border: "#E7E5E4",
    accent: "#D97706", // Amber 600 (Luxury)
    accentFade: "rgba(217, 119, 6, 0.1)",
    familyAccent: "#059669", // Emerald 600
    selection: "#FDE68A",
    shadow: "0 12px 32px -4px rgba(28, 25, 23, 0.08)",
    glass: "rgba(250, 250, 249, 0.85)",
    indicator: "#BE123C" // Rose 700
  },
  dark: {
    id: 'dark',
    bg: "#0C0A09", // Warm Black
    sidebar: "#171717", // Neutral 900
    card: "#1C1917",
    text: "#F5F5F4",
    textSec: "#A8A29E",
    textMuted: "#57534E",
    border: "#292524",
    accent: "#F59E0B", // Amber 500
    accentFade: "rgba(245, 158, 11, 0.15)",
    familyAccent: "#10B981",
    selection: "#78350F",
    shadow: "0 20px 40px -8px rgba(0, 0, 0, 0.6)",
    glass: "rgba(12, 10, 9, 0.8)",
    indicator: "#F43F5E"
  }
};

const TAGS = [
  { id: 'work',    name: "Business",  color: "#57534E", bg: "#F5F5F4", darkBg: "#292524" },
  { id: 'health',  name: "Wellness",  color: "#BE123C", bg: "#FFF1F2", darkBg: "#881337" },
  { id: 'finance', name: "Finance",   color: "#059669", bg: "#ECFDF5", darkBg: "#064E3B" },
  { id: 'social',  name: "Social",    color: "#7C3AED", bg: "#F5F3FF", darkBg: "#5B21B6" },
  { id: 'travel',  name: "Travel",    color: "#EA580C", bg: "#FFF7ED", darkBg: "#7C2D12" },
  { id: 'deep',    name: "Deep Work", color: "#1D4ED8", bg: "#EFF6FF", darkBg: "#1E3A8A" },
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
  ::-webkit-scrollbar-thumb:hover { background: rgba(120, 113, 108, 0.4); }
  
  /* Animations */
  .fade-enter { animation: fadeIn 0.5s var(--ease) forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  
  .pulse-dot { animation: pulse 3s infinite; }
  @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.4); } 70% { box-shadow: 0 0 0 8px rgba(217, 119, 6, 0); } 100% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0); } }

  .glass-panel { backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
  .past-event { filter: grayscale(1) opacity(0.6); transition: 0.3s; }
  
  /* UI Components */
  .btn-reset { border: none; background: transparent; cursor: pointer; color: inherit; font-family: inherit; }
  .btn-hover:hover { transform: translateY(-1px); transition: transform 0.2s; }
  
  .tab-pill { padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; transition: 0.3s var(--ease); position: relative; overflow: hidden; }
  .tab-pill.active { font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
  
  .sidebar-link { display: flex; alignItems: center; gap: 12px; padding: 12px; border-radius: 8px; color: inherit; opacity: 0.7; transition: 0.2s; text-decoration: none; font-size: 14px; }
  .sidebar-link:hover { opacity: 1; background: rgba(0,0,0,0.03); }
  
  .input-luxe { width: 100%; padding: 14px 16px; border-radius: 8px; font-size: 15px; transition: 0.2s; border: 1px solid transparent; background: rgba(0,0,0,0.03); }
  .input-luxe:focus { outline: none; background: rgba(0,0,0,0.05); box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.2); }
`;

// ==========================================
// 3. LOGIC KERNEL
// ==========================================

export default function TimelineOS() {
  // Authentication & Core State
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Temporal State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [viewMode, setViewMode] = useState("day"); // 'day', 'week', 'year'
  
  // Domain State
  const [context, setContext] = useState("personal"); // 'personal' | 'family'
  const [events, setEvents] = useState([]);
  const [deletedEvents, setDeletedEvents] = useState([]); // Soft delete cache
  const [activeTags, setActiveTags] = useState(TAGS.map(t => t.id));
  const [quote, setQuote] = useState(QUOTES[0]);
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  // Persistent Settings
  const [config, setConfig] = useState(() => JSON.parse(localStorage.getItem('timeline_config')) || {
    darkMode: false,
    use24Hour: false,
    blurPast: true,
    showWeather: true
  });

  const scrollRef = useRef(null);
  const theme = config.darkMode ? THEMES.dark : THEMES.light;

  // --- INITIALIZATION ---
  useEffect(() => {
    const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    const i = setInterval(() => setNow(new Date()), 60000);
    // Dynamic Quote Rotation
    const qI = setInterval(() => setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]), APP_META.quoteInterval);
    return () => { s.remove(); clearInterval(i); clearInterval(qI); };
  }, []);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence);
    return auth.onAuthStateChanged(u => { setUser(u); if(u) loadData(u); else setLoading(false); });
  }, []);

  useEffect(() => localStorage.setItem('timeline_config', JSON.stringify(config)), [config]);

  // Scroll to 8 AM on view switch
  useEffect(() => {
    if ((viewMode === 'day' || viewMode === 'week') && scrollRef.current) {
      scrollRef.current.scrollTop = 8 * 60 * LAYOUT.PIXELS_PER_MINUTE;
    }
  }, [viewMode]);

  // --- DATA LAYER ---
  const loadData = async (u) => {
    setLoading(true);
    try {
      // Fetch Active Events
      const q = query(collection(db, "events"), where("uid", "==", u.uid), where("deleted", "==", false));
      const snap = await getDocs(q);
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data(), start: d.data().startTime.toDate(), end: d.data().endTime.toDate() })));
      
      // Fetch Deleted Events (for Trash)
      const qDel = query(collection(db, "events"), where("uid", "==", u.uid), where("deleted", "==", true));
      const snapDel = await getDocs(qDel);
      setDeletedEvents(snapDel.docs.map(d => ({ id: d.id, ...d.data(), start: d.data().startTime.toDate(), end: d.data().endTime.toDate() })));
    } catch(e) { notify("Sync failed. Check connection.", "error"); }
    setLoading(false);
  };

  const handleSave = async (data) => {
    if(!user) return;
    try {
      const payload = {
        uid: user.uid,
        title: data.title,
        category: data.category,
        context: context, // Save with current context
        description: data.description || "",
        location: data.location || "",
        startTime: Timestamp.fromDate(data.start),
        endTime: Timestamp.fromDate(data.end),
        deleted: false,
        updatedAt: serverTimestamp()
      };

      if(data.id) await updateDoc(doc(db, "events", data.id), payload);
      else { payload.createdAt = serverTimestamp(); await addDoc(collection(db, "events"), payload); }
      
      setModalOpen(false); loadData(user); notify("Event saved.");
    } catch(e) { notify("Save failed.", "error"); }
  };

  const softDelete = async (id) => {
    if(!window.confirm("Move this event to trash?")) return;
    try {
      await updateDoc(doc(db, "events", id), { deleted: true, deletedAt: serverTimestamp() });
      setModalOpen(false); loadData(user); notify("Moved to trash.");
    } catch(e) { notify("Delete failed.", "error"); }
  };

  const restoreEvent = async (id) => {
    try {
      await updateDoc(doc(db, "events", id), { deleted: false });
      loadData(user); notify("Event restored.");
    } catch(e) { notify("Restore failed.", "error"); }
  };

  const hardDelete = async (id) => {
    if(!window.confirm("Permanently destroy this record?")) return;
    try { await deleteDoc(doc(db, "events", id)); loadData(user); notify("Permanently deleted."); } catch(e) {}
  };

  const notify = (msg, type='neutral') => {
    const id = Date.now();
    setNotifications(p => [...p, {id, msg, type}]);
    setTimeout(() => setNotifications(p => p.filter(n => n.id !== id)), 4000);
  };

  // --- DERIVED STATE ---
  const filteredEvents = useMemo(() => {
    return events.filter(e => e.context === context && activeTags.includes(e.category));
  }, [events, context, activeTags]);

  const upcomingEvents = useMemo(() => {
    return events
      .filter(e => e.context === context && e.start > now && !e.deleted)
      .sort((a,b) => a.start - b.start)
      .slice(0, 3);
  }, [events, now, context]);

  // --- DRAG ENGINE ---
  const [dragData, setDragData] = useState(null);
  
  const handleDragMove = useCallback((e) => {
    if(!dragData) return;
    const diff = Math.floor((e.clientY - dragData.startY) / LAYOUT.PIXELS_PER_MINUTE / LAYOUT.SNAP_MINUTES) * LAYOUT.SNAP_MINUTES;
    if(diff === 0) return;

    setEvents(prev => prev.map(ev => {
      if(ev.id !== dragData.id) return ev;
      const s = new Date(dragData.origStart);
      const en = new Date(dragData.origEnd);
      if(dragData.mode === 'move') { s.setMinutes(s.getMinutes() + diff); en.setMinutes(en.getMinutes() + diff); }
      else { en.setMinutes(en.getMinutes() + diff); if((en-s) < 15*60000) return ev; }
      return { ...ev, start: s, end: en };
    }));
  }, [dragData]);

  const handleDragEnd = useCallback(async () => {
    if(!dragData) return;
    const ev = events.find(e => e.id === dragData.id);
    if(ev) try {
      await updateDoc(doc(db, "events", ev.id), { startTime: Timestamp.fromDate(ev.start), endTime: Timestamp.fromDate(ev.end) });
      notify("Timeline updated.");
    } catch(e) { loadData(user); }
    setDragData(null);
  }, [dragData, events, user]);

  useEffect(() => {
    if(dragData) { window.addEventListener('mousemove', handleDragMove); window.addEventListener('mouseup', handleDragEnd); }
    return () => { window.removeEventListener('mousemove', handleDragMove); window.removeEventListener('mouseup', handleDragEnd); };
  }, [dragData, handleDragMove, handleDragEnd]);

  // --- HELPERS ---
  const nav = (amt) => {
    const d = new Date(currentDate);
    if(viewMode === 'year') d.setFullYear(d.getFullYear() + amt);
    else if(viewMode === 'week') d.setDate(d.getDate() + (amt*7));
    else d.setDate(d.getDate() + amt);
    setCurrentDate(d);
  };
  const isToday = (d) => d.toDateString() === now.toDateString();
  const isPast = (d) => d < new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!user) return <AuthScreen onLogin={() => signInWithPopup(auth, provider)} theme={theme} />;

  return (
    <div style={{ display: "flex", height: "100vh", background: theme.bg, color: theme.text }}>
      
      {/* 4. NAVIGATION SIDEBAR */}
      <aside style={{ width: LAYOUT.SIDEBAR_WIDTH, background: theme.sidebar, borderRight: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", padding: "28px 20px", zIndex: 50, transition: "0.3s" }}>
        {/* Header / Brand */}
        <div style={{ marginBottom: 32 }}>
          <h1 className="serif" style={{ fontSize: 28, fontWeight: 700, color: theme.text, letterSpacing: "-0.5px" }}>Timeline.</h1>
          <div style={{ fontSize: 13, color: theme.textSec, marginTop: 4 }}>Welcome back, <span style={{fontWeight:600, color: theme.text}}>{user.displayName.split(" ")[0]}</span></div>
        </div>

        {/* Context Switcher (Tabs) */}
        <div style={{ display: "flex", background: "rgba(0,0,0,0.04)", padding: 4, borderRadius: 12, marginBottom: 32 }}>
          <button onClick={() => setContext('personal')} className={`btn-reset tab-pill ${context==='personal'?'active':''}`} style={{ flex: 1, background: context==='personal' ? theme.card : 'transparent', color: context==='personal' ? theme.accent : theme.textSec }}>Personal</button>
          <button onClick={() => setContext('family')} className={`btn-reset tab-pill ${context==='family'?'active':''}`} style={{ flex: 1, background: context==='family' ? theme.card : 'transparent', color: context==='family' ? theme.familyAccent : theme.textSec }}>Family</button>
        </div>

        {/* Action */}
        <button onClick={() => { setEditingEvent(null); setModalOpen(true); }} className="btn-reset btn-hover" style={{ width: "100%", padding: "14px", borderRadius: 12, background: context==='family' ? theme.familyAccent : theme.accent, color: "#fff", fontSize: 14, fontWeight: 600, boxShadow: theme.shadow, marginBottom: 32 }}>
          + New Event
        </button>

        {/* Dynamic Quote */}
        <div style={{ marginBottom: 32, padding: 16, background: theme.card, borderRadius: 12, border: `1px solid ${theme.border}` }}>
          <p className="serif" style={{ fontSize: 15, fontStyle: "italic", lineHeight: 1.5, color: theme.textSec }}>"{quote}"</p>
        </div>

        {/* Upcoming (Mini) */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <h4 style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Upcoming</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcomingEvents.length === 0 && <span style={{fontSize:13, color: theme.textMuted}}>No upcoming events.</span>}
            {upcomingEvents.map(e => (
              <div key={e.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 4, height: 24, borderRadius: 2, background: TAGS.find(t=>t.id===e.category)?.color }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{e.title}</div>
                  <div style={{ fontSize: 11, color: theme.textMuted }}>{e.start.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => setTrashOpen(true)} className="sidebar-link"><span style={{fontSize:16}}>🗑</span> Trash</button>
          <button onClick={() => setSettingsOpen(true)} className="sidebar-link"><span style={{fontSize:16}}>⚙</span> Settings</button>
        </div>
      </aside>

      {/* 5. MAIN WORKSPACE */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        
        {/* Navigation Header */}
        <header style={{ height: LAYOUT.HEADER_HEIGHT, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", borderBottom: `1px solid ${theme.border}`, background: theme.bg, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <h2 className="serif" style={{ fontSize: 32, fontWeight: 600 }}>{viewMode === 'year' ? currentDate.getFullYear() : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => nav(-1)} className="btn-reset btn-hover" style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${theme.border}`, display:"flex", alignItems:"center", justifyContent:"center" }}>←</button>
              <button onClick={() => setCurrentDate(new Date())} className="btn-reset btn-hover" style={{ padding: "0 16px", height: 32, borderRadius: 16, border: `1px solid ${theme.border}`, fontSize: 13, fontWeight: 500 }}>Today</button>
              <button onClick={() => nav(1)} className="btn-reset btn-hover" style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${theme.border}`, display:"flex", alignItems:"center", justifyContent:"center" }}>→</button>
            </div>
          </div>

          <div style={{ display: "flex", background: theme.sidebar, padding: 4, borderRadius: 12 }}>
            {['day', 'week', 'year'].map(m => (
              <button key={m} onClick={() => setViewMode(m)} className={`btn-reset tab-pill ${viewMode===m?'active':''}`} style={{ background: viewMode===m ? theme.bg : 'transparent', color: viewMode===m ? theme.text : theme.textMuted, textTransform: "capitalize" }}>{m}</button>
            ))}
          </div>
        </header>

        {/* Viewport */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          
          {/* DAY VIEW (Manifesto Style) */}
          {viewMode === 'day' && (
            <div className="fade-enter" style={{ padding: "40px 60px", maxWidth: 1000, margin: "0 auto", minHeight: "100%" }}>
              <div style={{ marginBottom: 40 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{currentDate.toLocaleDateString('en-US', {weekday:'long'})}</div>
                <h1 className="serif" style={{ fontSize: 48, fontWeight: 700, color: theme.text }}>{isToday(currentDate) ? "Today's Agenda" : currentDate.toLocaleDateString('en-US', {month:'long', day:'numeric'})}</h1>
              </div>

              <div style={{ position: "relative", borderLeft: `1px solid ${theme.border}`, marginLeft: 20, paddingLeft: 40 }}>
                {Array.from({length: 24}).map((_, h) => {
                  // Only show hours from 6AM to 11PM for cleaner look unless there are events
                  if(h < 6) return null;
                  
                  const dEvents = filteredEvents.filter(e => 
                    e.start.toDateString() === currentDate.toDateString() && 
                    e.start.getHours() === h
                  );

                  return (
                    <div key={h} style={{ marginBottom: 40, position: "relative" }}>
                      {/* Time Marker */}
                      <div style={{ position: "absolute", left: -65, top: 0, fontSize: 13, color: theme.textMuted, fontWeight: 500, width: 40, textAlign: "right" }}>
                        {config.use24Hour ? `${h}:00` : `${h%12||12} ${h>=12?'PM':'AM'}`}
                      </div>
                      
                      {/* Timeline Node */}
                      <div style={{ position: "absolute", left: -45, top: 6, width: 9, height: 9, borderRadius: "50%", background: theme.bg, border: `2px solid ${theme.border}` }} />

                      {/* Content Area */}
                      <div style={{ minHeight: 40 }}>
                        {dEvents.length === 0 ? (
                          <div 
                            onClick={() => {
                              const s = new Date(currentDate); s.setHours(h,0,0,0);
                              const e = new Date(s); e.setHours(h+1);
                              setEditingEvent({ start: s, end: e, title: "", category: TAGS[0].id });
                              setModalOpen(true);
                            }}
                            style={{ height: 40, cursor: "pointer" }}
                          />
                        ) : (
                          dEvents.map(ev => {
                            const tag = TAGS.find(t => t.id === ev.category) || TAGS[0];
                            return (
                              <div key={ev.id} onClick={() => { setEditingEvent(ev); setModalOpen(true); }} className="btn-hover" style={{ background: config.darkMode ? tag.darkBg : tag.bg, padding: "16px 20px", borderRadius: 12, marginBottom: 12, borderLeft: `4px solid ${tag.color}`, cursor: "pointer" }}>
                                <div style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 4 }}>{ev.title}</div>
                                <div style={{ display: "flex", gap: 12, fontSize: 13, color: theme.textSec }}>
                                  <span>{ev.start.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})} - {ev.end.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}</span>
                                  {ev.location && <span>📍 {ev.location}</span>}
                                </div>
                                {ev.description && <div style={{ marginTop: 8, fontSize: 13, color: theme.textMuted, lineHeight: 1.4 }}>{ev.description}</div>}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WEEK & YEAR VIEWS (Technical Implementation) */}
          {viewMode !== 'day' && <StandardViews viewMode={viewMode} currentDate={currentDate} setCurrentDate={setCurrentDate} setViewMode={setViewMode} events={filteredEvents} theme={theme} config={config} onEdit={(ev) => { setEditingEvent(ev); setModalOpen(true); }} onNew={(s, e) => { setEditingEvent({ start: s, end: e, title: "", category: TAGS[0].id }); setModalOpen(true); }} />}

        </div>
      </div>

      {/* 6. MODALS & OVERLAYS */}
      
      {/* Event Modal */}
      {modalOpen && (
        <div className="glass-panel fade-enter" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }} onClick={() => setModalOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 480, background: theme.card, padding: 32, borderRadius: 24, boxShadow: theme.shadow }}>
            <h3 className="serif" style={{ fontSize: 24, marginBottom: 24 }}>{editingEvent?.id ? "Edit Event" : "Create Event"}</h3>
            <EventForm event={editingEvent} theme={theme} tags={TAGS} onSave={handleSave} onDelete={editingEvent?.id ? () => softDelete(editingEvent.id) : null} onCancel={() => setModalOpen(false)} />
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="glass-panel fade-enter" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }} onClick={() => setSettingsOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 400, background: theme.card, padding: 32, borderRadius: 24, boxShadow: theme.shadow }}>
            <h3 className="serif" style={{ fontSize: 24, marginBottom: 24 }}>Preferences</h3>
            
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: theme.textSec, marginBottom: 12 }}>Theme</label>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => setConfig({...config, darkMode: false})} style={{ flex: 1, padding: 12, borderRadius: 8, border: `2px solid ${!config.darkMode ? theme.accent : theme.border}`, background: THEMES.light.bg, color: THEMES.light.text }}>Light</button>
                <button onClick={() => setConfig({...config, darkMode: true})} style={{ flex: 1, padding: 12, borderRadius: 8, border: `2px solid ${config.darkMode ? theme.accent : theme.border}`, background: THEMES.dark.bg, color: THEMES.dark.text }}>Dark</button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Dim Past Events</span>
              <div onClick={() => setConfig({...config, blurPast: !config.blurPast})} style={{ width: 44, height: 24, background: config.blurPast ? theme.accent : theme.border, borderRadius: 12, position: "relative", cursor: "pointer", transition: "0.2s" }}>
                <div style={{ width: 20, height: 20, background: "#fff", borderRadius: "50%", position: "absolute", top: 2, left: config.blurPast ? 22 : 2, transition: "0.2s cubic-bezier(0.22, 1, 0.36, 1)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </div>
            </div>

            <button onClick={() => signOut(auth)} style={{ width: "100%", padding: "14px", borderRadius: 12, border: `1px solid ${theme.indicator}`, color: theme.indicator, background: "transparent", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 24 }}>Sign Out</button>
          </div>
        </div>
      )}

      {/* Trash Modal */}
      {trashOpen && (
        <div className="glass-panel fade-enter" style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }} onClick={() => setTrashOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 500, height: "70vh", background: theme.card, padding: 32, borderRadius: 24, boxShadow: theme.shadow, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 className="serif" style={{ fontSize: 24 }}>Trash</h3>
              <button onClick={() => setTrashOpen(false)} className="btn-reset" style={{ fontSize: 24 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {deletedEvents.length === 0 ? <p style={{ color: theme.textMuted, textAlign: "center", marginTop: 40 }}>Trash is empty.</p> : (
                deletedEvents.map(ev => (
                  <div key={ev.id} style={{ padding: 16, border: `1px solid ${theme.border}`, borderRadius: 12, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{ev.title}</div>
                      <div style={{ fontSize: 12, color: theme.textMuted }}>{ev.start.toLocaleDateString()}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => restoreEvent(ev.id)} style={{ padding: "6px 12px", borderRadius: 6, background: theme.accent, color: "#fff", border: "none", fontSize: 12, cursor: "pointer" }}>Restore</button>
                      <button onClick={() => hardDelete(ev.id)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${theme.indicator}`, color: theme.indicator, background: "transparent", fontSize: 12, cursor: "pointer" }}>Purge</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div style={{ position: "fixed", bottom: 32, right: 32, zIndex: 200, display: "flex", flexDirection: "column", gap: 12 }}>
        {notifications.map(n => (
          <div key={n.id} className="fade-enter" style={{ padding: "14px 24px", background: n.type==='error' ? theme.indicator : theme.card, color: n.type==='error' ? '#fff' : theme.text, borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", border: n.type==='neutral' ? `1px solid ${theme.border}` : 'none', fontWeight: 500, fontSize: 14 }}>
            {n.msg}
          </div>
        ))}
      </div>

    </div>
  );
}

// ==========================================
// 4. SUB-COMPONENTS & UTILS
// ==========================================

// Extracted for brevity but fully functional
function StandardViews({ viewMode, currentDate, setCurrentDate, setViewMode, events, theme, config, onEdit, onNew }) {
  // WEEK VIEW
  if (viewMode === 'week') {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (1); // Monday start fixed for simplicity in this view
    const days = Array.from({length:7}, (_,i) => { const d = new Date(start); d.setDate(diff+i); return d; });

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
              <div key={i} style={{ flex: 1, borderRight: `1px solid ${theme.border}`, background: isT ? (config.darkMode ? "#1C1917" : "#FAFAFA") : "transparent" }}>
                <div style={{ height: 60, borderBottom: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "sticky", top: 0, background: theme.sidebar, zIndex: 2 }}>
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
                      <div key={ev.id} onClick={(e) => { e.stopPropagation(); onEdit(ev); }} 
                        className="btn-hover"
                        style={{ position: "absolute", top, height: h, left: 4, right: 4, background: config.darkMode ? tag.darkBg : tag.bg, borderLeft: `3px solid ${tag.color}`, borderRadius: 4, padding: 4, fontSize: 11, color: theme.text, cursor: "pointer", zIndex: 10, overflow: "hidden" }}>
                        <div style={{ fontWeight: 600 }}>{ev.title}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    );
  }

  // YEAR VIEW (Linear Grid)
  if (viewMode === 'year') {
    return (
      <div style={{ padding: 40, overflowX: "auto" }}>
        <div style={{ minWidth: 1000 }}>
          <div style={{ display: "flex", marginLeft: 100, marginBottom: 12 }}>{Array.from({length: LAYOUT.YEAR_COLS}).map((_,i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 10, fontWeight: 700, color: theme.textMuted }}>{["M","T","W","T","F","S","S"][i%7]}</div>)}</div>
          {Array.from({length: 12}).map((_, m) => {
            const d = new Date(currentDate.getFullYear(), m, 1);
            const days = new Date(currentDate.getFullYear(), m+1, 0).getDate();
            const start = (d.getDay() + 6) % 7; 
            return (
              <div key={m} style={{ display: "flex", alignItems: "center", marginBottom: 8, height: 36 }}>
                <div style={{ width: 100, fontSize: 13, fontWeight: 600, color: theme.textSec }}>{d.toLocaleDateString('en-US',{month:'short'})}</div>
                <div style={{ flex: 1, display: "flex", gap: 2 }}>
                  {Array.from({length: LAYOUT.YEAR_COLS}).map((_, col) => {
                    const num = col - start + 1;
                    if(num < 1 || num > days) return <div key={col} style={{ flex: 1 }} />;
                    const date = new Date(currentDate.getFullYear(), m, num);
                    const isT = date.toDateString() === new Date().toDateString();
                    const hasEv = events.some(e => e.start.toDateString() === date.toDateString());
                    return <div key={col} onClick={() => { setCurrentDate(date); setViewMode('day'); }} style={{ flex: 1, borderRadius: 3, height: 30, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, cursor: "pointer", background: isT ? theme.accent : hasEv ? (config.darkMode ? "#292524" : "#E7E5E4") : "transparent", color: isT ? "#fff" : theme.text, fontWeight: isT?700:400 }}>{num}</div>
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
}

function EventForm({ event, theme, tags, onSave, onDelete, onCancel }) {
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
    const [sh, sm] = data.start.split(':'); s.setHours(sh, sm);
    const e = new Date(s);
    const [eh, em] = data.end.split(':'); e.setHours(eh, em);
    onSave({ ...data, id: event?.id, start: s, end: e });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input autoFocus value={data.title} onChange={e => setData({...data, title: e.target.value})} placeholder="Event Title" className="input-luxe" style={{ fontSize: 18, fontWeight: 600, background: theme.bg, color: theme.text }} />
      <div style={{ display: "flex", gap: 12 }}>
        <input type="time" value={data.start} onChange={e => setData({...data, start: e.target.value})} className="input-luxe" style={{ color: theme.text }} />
        <input type="time" value={data.end} onChange={e => setData({...data, end: e.target.value})} className="input-luxe" style={{ color: theme.text }} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tags.map(t => (
          <button key={t.id} onClick={() => setData({...data, category: t.id})} className="btn-reset" style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, border: `1px solid ${data.category===t.id ? t.color : theme.border}`, background: data.category===t.id ? t.bg : "transparent", color: t.color }}>{t.name}</button>
        ))}
      </div>
      <input value={data.location} onChange={e => setData({...data, location: e.target.value})} placeholder="Add location" className="input-luxe" style={{ color: theme.text }} />
      <textarea value={data.description} onChange={e => setData({...data, description: e.target.value})} placeholder="Add details..." className="input-luxe" style={{ minHeight: 80, resize: "none", color: theme.text }} />
      
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        {onDelete ? <button onClick={onDelete} className="btn-reset" style={{ color: theme.indicator, fontWeight: 600 }}>Delete</button> : <div/>}
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={onCancel} className="btn-reset" style={{ color: theme.textSec }}>Cancel</button>
          <button onClick={submit} className="btn-reset" style={{ padding: "10px 24px", borderRadius: 8, background: theme.accent, color: "#fff", fontWeight: 600 }}>Save Event</button>
        </div>
      </div>
    </div>
  );
}

function AuthScreen({ onLogin, theme }) {
  return (
    <div style={{ height: "100vh", background: "#0C0A09", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <h1 className="serif" style={{ fontSize: 64, color: "#F5F5F4", marginBottom: 24 }}>Timeline.</h1>
      <p style={{ color: "#A8A29E", marginBottom: 40, fontSize: 18, fontFamily: "serif", fontStyle: "italic" }}>"Time is the luxury you cannot buy."</p>
      <button onClick={onLogin} style={{ padding: "16px 40px", borderRadius: 4, background: "#D97706", color: "#fff", border: "none", fontSize: 14, textTransform: "uppercase", letterSpacing: 2, cursor: "pointer", fontWeight: 600 }}>Enter System</button>
    </div>
  );
}