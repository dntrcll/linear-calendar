import { useEffect, useState, useRef, useCallback } from "react";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth, provider } from "./firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

// --- CONFIGURATION & CONSTANTS ---
const PIXELS_PER_MINUTE = 1.6; // Taller for better drag precision
const SNAP_MINUTES = 15;
const APP_NAME = "Tempo";

const QUOTES = [
  "Focus on the rhythm, not the noise.",
  "Time is the most valuable thing a man can spend.",
  "Make today a masterpiece.",
  "Simplicity is the ultimate sophistication.",
  "Your future is created by what you do today."
];

const COLORS = {
  bg: "#FAFAFA",
  bgDark: "#0f0f11",
  sidebar: "#ffffff",
  sidebarDark: "#18181b",
  primary: "#6366f1", // Indigo
  text: "#18181b",
  textDark: "#f4f4f5",
  muted: "#71717a",
  mutedDark: "#a1a1aa",
  border: "#e4e4e7",
  borderDark: "#27272a",
  line: "#f43f5e" // Current time line
};

const CATEGORIES = [
  { id: "work", name: "Deep Work", color: "violet", bg: "#ede9fe", border: "#8b5cf6", text: "#5b21b6" },
  { id: "meeting", name: "Meeting", color: "blue", bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
  { id: "personal", name: "Personal", color: "emerald", bg: "#d1fae5", border: "#10b981", text: "#065f46" },
  { id: "creative", name: "Creative", color: "amber", bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
  { id: "health", name: "Health", color: "rose", bg: "#ffe4e6", border: "#f43f5e", text: "#9f1239" },
];

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; overflow: hidden; }
  h1, h2, h3, h4, button { font-family: 'Outfit', sans-serif; }
  
  /* Custom Scrollbar */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
  
  .glass { background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid rgba(0,0,0,0.05); }
  .glass-dark { background: rgba(24, 24, 27, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.05); }
  
  .fade-in { animation: fadeIn 0.3s ease-out forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
  
  .past-day { filter: grayscale(1); opacity: 0.6; }
`;

export default function App() {
  // --- STATE ---
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [viewMode, setViewMode] = useState("day"); // day, week, year
  
  // Settings
  const [darkMode, setDarkMode] = useState(() => JSON.parse(localStorage.getItem('darkMode')) || false);
  const [use24Hour, setUse24Hour] = useState(() => JSON.parse(localStorage.getItem('use24Hour')) || false);
  const [weekStartMon, setWeekStartMon] = useState(() => JSON.parse(localStorage.getItem('weekStartMon')) || false);
  const [activeCategories, setActiveCategories] = useState(CATEGORIES.map(c => c.id));
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [quote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [loading, setLoading] = useState(false);

  // Form / Editing State
  const [editingEvent, setEditingEvent] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formCat, setFormCat] = useState("work");

  // Drag State
  const [dragState, setDragState] = useState(null); // { id, mode: 'move'|'resize', startY, originalStart, originalEnd }
  const containerRef = useRef(null);

  // --- EFFECTS ---
  useEffect(() => { const s = document.createElement('style'); s.textContent = GLOBAL_STYLES; document.head.appendChild(s); return () => s.remove(); }, []);
  useEffect(() => { setPersistence(auth, browserLocalPersistence); auth.onAuthStateChanged(setUser); }, []);
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(i); }, []);
  
  // Persistence
  useEffect(() => localStorage.setItem('darkMode', JSON.stringify(darkMode)), [darkMode]);
  useEffect(() => localStorage.setItem('use24Hour', JSON.stringify(use24Hour)), [use24Hour]);
  useEffect(() => localStorage.setItem('weekStartMon', JSON.stringify(weekStartMon)), [weekStartMon]);

  // Load Data
  const loadEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, "events"), where("uid", "==", user.uid), where("deleted", "==", false));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(), 
        start: d.data().startTime.toDate(), 
        end: d.data().endTime.toDate() 
      }));
      setEvents(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // --- HELPERS ---
  const fmtTime = (d) => d.toLocaleTimeString([], { hour: use24Hour ? "2-digit" : "numeric", minute: "2-digit", hour12: !use24Hour });
  const isPast = (d) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return d < today;
  };
  
  const getWeekDays = (baseDate) => {
    const d = new Date(baseDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (weekStartMon ? (day === 0 ? -6 : 1) : 0);
    return Array.from({ length: 7 }).map((_, i) => {
      const w = new Date(d);
      w.setDate(diff + i);
      return w;
    });
  };

  // --- DRAG HANDLERS (Day View) ---
  const handleDragStart = (e, ev, mode) => {
    if (e.button !== 0) return; // Left click only
    e.stopPropagation();
    setDragState({
      id: ev.id,
      mode, // 'move' or 'resize'
      startY: e.clientY,
      originalStart: ev.start,
      originalEnd: ev.end
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragState) return;
    
    const deltaPixels = e.clientY - dragState.startY;
    const deltaMinutes = Math.floor(deltaPixels / PIXELS_PER_MINUTE / SNAP_MINUTES) * SNAP_MINUTES;

    if (deltaMinutes === 0) return;

    setEvents(prev => prev.map(ev => {
      if (ev.id !== dragState.id) return ev;

      const newStart = new Date(dragState.originalStart);
      const newEnd = new Date(dragState.originalEnd);

      if (dragState.mode === 'move') {
        newStart.setMinutes(newStart.getMinutes() + deltaMinutes);
        newEnd.setMinutes(newEnd.getMinutes() + deltaMinutes);
      } else if (dragState.mode === 'resize') {
        newEnd.setMinutes(newEnd.getMinutes() + deltaMinutes);
        if ((newEnd - newStart) < 15 * 60 * 1000) return ev; // Min duration
      }
      return { ...ev, start: newStart, end: newEnd };
    }));
  }, [dragState]);

  const handleMouseUp = useCallback(async () => {
    if (!dragState) return;
    const ev = events.find(e => e.id === dragState.id);
    if (ev) {
      await updateDoc(doc(db, "events", ev.id), {
        startTime: Timestamp.fromDate(ev.start),
        endTime: Timestamp.fromDate(ev.end)
      });
    }
    setDragState(null);
  }, [dragState, events]);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);


  // --- FORM ACTIONS ---
  const saveEvent = async () => {
    if (!formTitle || !formStart || !formEnd) return;
    const [sh, sm] = formStart.split(":").map(Number);
    const [eh, em] = formEnd.split(":").map(Number);
    
    // Determine date (use selected date if new, or event date if editing)
    const baseDate = editingEvent ? editingEvent.start : currentDate;
    const start = new Date(baseDate); start.setHours(sh, sm, 0, 0);
    const end = new Date(baseDate); end.setHours(eh, em, 0, 0);

    // Handle overnight events (end next day)
    if (end < start) end.setDate(end.getDate() + 1);

    const payload = {
      uid: user.uid,
      title: formTitle,
      category: formCat,
      startTime: Timestamp.fromDate(start),
      endTime: Timestamp.fromDate(end),
      deleted: false,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingEvent) await updateDoc(doc(db, "events", editingEvent.id), payload);
      else {
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, "events"), payload);
      }
      setShowModal(false); loadEvents();
    } catch (e) { alert("Save failed"); }
  };

  const deleteEvent = async (id) => {
    if(!window.confirm("Remove this event?")) return;
    await updateDoc(doc(db, "events", id), { deleted: true });
    setShowModal(false);
    loadEvents();
  };

  const openNew = (d) => {
    setEditingEvent(null); setFormTitle(""); setFormCat("work");
    // Round to nearest 30m
    const s = d || new Date(); 
    const rem = s.getMinutes() % 30;
    if (rem) s.setMinutes(s.getMinutes() + (30 - rem));
    
    setFormStart(`${s.getHours().toString().padStart(2,'0')}:${s.getMinutes().toString().padStart(2,'0')}`);
    s.setHours(s.getHours() + 1);
    setFormEnd(`${s.getHours().toString().padStart(2,'0')}:${s.getMinutes().toString().padStart(2,'0')}`);
    setShowModal(true);
  };

  const openEdit = (ev) => {
    setEditingEvent(ev); setFormTitle(ev.title); setFormCat(ev.category);
    setFormStart(`${ev.start.getHours().toString().padStart(2,'0')}:${ev.start.getMinutes().toString().padStart(2,'0')}`);
    setFormEnd(`${ev.end.getHours().toString().padStart(2,'0')}:${ev.end.getMinutes().toString().padStart(2,'0')}`);
    setShowModal(true);
  };

  // --- RENDER HELPERS ---
  const filteredEvents = events.filter(e => activeCategories.includes(e.category));
  const upcomingEvents = [...filteredEvents].filter(e => e.start > now).sort((a,b) => a.start - b.start).slice(0, 5);

  // --- LOGIN SCREEN ---
  if (!user) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fafaf9" }}>
        <div style={{ textAlign: "center", maxWidth: 400, padding: 40 }}>
          <h1 style={{ fontSize: 48, fontWeight: 700, color: "#18181b", marginBottom: 12 }}>{APP_NAME}.</h1>
          <p style={{ color: "#71717a", marginBottom: 32, fontSize: 18 }}>Master your rhythm. Own your time.</p>
          <button onClick={() => signInWithPopup(auth, provider)} style={{ width: "100%", padding: "16px", borderRadius: 12, background: "#18181b", color: "#fff", fontSize: 16, fontWeight: 600, border: "none", cursor: "pointer", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", background: darkMode ? COLORS.bgDark : COLORS.bg, color: darkMode ? COLORS.textDark : COLORS.text }}>
      
      {/* SIDEBAR */}
      {sidebarOpen && (
        <aside style={{ width: 300, background: darkMode ? COLORS.sidebarDark : COLORS.sidebar, borderRight: `1px solid ${darkMode ? COLORS.borderDark : COLORS.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-1px" }}>{APP_NAME}.</h1>
            <p style={{ fontSize: 13, marginTop: 4, color: darkMode ? COLORS.mutedDark : COLORS.muted, fontStyle: "italic" }}>"{quote}"</p>
          </div>

          <div style={{ padding: "0 24px", marginBottom: 24 }}>
            <button onClick={() => openNew()} style={{ width: "100%", padding: 12, borderRadius: 10, background: COLORS.primary, color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)" }}>+ New Event</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 24px" }}>
            
            {/* Upcoming */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: COLORS.muted, letterSpacing: 1, marginBottom: 12 }}>Upcoming</h3>
              {upcomingEvents.length === 0 ? <p style={{fontSize: 13, color: COLORS.muted}}>No upcoming events.</p> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {upcomingEvents.map(ev => {
                    const c = CATEGORIES.find(cat => cat.id === ev.category) || CATEGORIES[0];
                    return (
                      <div key={ev.id} onClick={() => openEdit(ev)} style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
                        <div style={{ width: 3, height: 32, borderRadius: 2, background: c.border }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{ev.title}</div>
                          <div style={{ fontSize: 11, color: COLORS.muted }}>{ev.start.toLocaleDateString(undefined, {weekday:'short'})} {fmtTime(ev.start)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Tags/Filters */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: COLORS.muted, letterSpacing: 1, marginBottom: 12 }}>Tags</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {CATEGORIES.map(cat => {
                  const isActive = activeCategories.includes(cat.id);
                  return (
                    <button key={cat.id} 
                      onClick={() => setActiveCategories(p => p.includes(cat.id) ? p.filter(x=>x!==cat.id) : [...p, cat.id])}
                      style={{ 
                        padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", 
                        background: isActive ? cat.bg : "transparent", 
                        border: `1px solid ${isActive ? cat.border : darkMode ? COLORS.borderDark : COLORS.border}`,
                        color: isActive ? cat.text : COLORS.muted 
                      }}
                    >
                      {cat.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Settings */}
            <div>
              <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: COLORS.muted, letterSpacing: 1, marginBottom: 12 }}>Settings</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, cursor: "pointer" }}>
                  <span>Dark Mode</span>
                  <input type="checkbox" checked={darkMode} onChange={e => setDarkMode(e.target.checked)} />
                </label>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, cursor: "pointer" }}>
                  <span>24-Hour Time</span>
                  <input type="checkbox" checked={use24Hour} onChange={e => setUse24Hour(e.target.checked)} />
                </label>
                <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, cursor: "pointer" }}>
                  <span>Start Week Monday</span>
                  <input type="checkbox" checked={weekStartMon} onChange={e => setWeekStartMon(e.target.checked)} />
                </label>
              </div>
            </div>

          </div>

          <div style={{ padding: 24, borderTop: `1px solid ${darkMode?COLORS.borderDark:COLORS.border}`, display: "flex", alignItems: "center", gap: 12 }}>
             {user.photoURL && <img src={user.photoURL} alt="user" style={{width: 32, height: 32, borderRadius: 16}} />}
             <div style={{flex: 1, overflow:"hidden"}}>
               <div style={{fontSize: 13, fontWeight: 600, whiteSpace:"nowrap"}}>{user.displayName}</div>
               <button onClick={() => signOut(auth)} style={{fontSize: 11, color: COLORS.primary, background:"transparent", border:"none", cursor:"pointer", padding:0}}>Sign Out</button>
             </div>
          </div>
        </aside>
      )}

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* Header */}
        <header className={darkMode ? "glass-dark" : "glass"} style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", padding: 8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <h2 style={{ fontSize: 20, fontWeight: 600 }}>
              {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              {viewMode === 'day' && <span style={{ opacity: 0.5, marginLeft: 8, fontWeight: 400 }}>{currentDate.getDate()}</span>}
            </h2>
          </div>

          <div style={{ display: "flex", background: darkMode ? COLORS.borderDark : "#f4f4f5", padding: 3, borderRadius: 8 }}>
            {['day', 'week', 'year'].map(v => (
              <button key={v} onClick={() => setViewMode(v)} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: viewMode === v ? (darkMode ? "#27272a" : "#fff") : "transparent", color: "inherit", fontWeight: 500, fontSize: 13, cursor: "pointer", boxShadow: viewMode === v ? "0 2px 5px rgba(0,0,0,0.05)" : "none", textTransform: "capitalize" }}>{v}</button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setCurrentDate(new Date())} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${darkMode?COLORS.borderDark:COLORS.border}`, background: "transparent", color: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Today</button>
            <div style={{ display: "flex", gap: 2 }}>
              <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - (viewMode==='week'?7:1)); setCurrentDate(d); }} style={{ width: 36, borderRadius: 8, border: `1px solid ${darkMode?COLORS.borderDark:COLORS.border}`, background: "transparent", color: "inherit", cursor: "pointer" }}>←</button>
              <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + (viewMode==='week'?7:1)); setCurrentDate(d); }} style={{ width: 36, borderRadius: 8, border: `1px solid ${darkMode?COLORS.borderDark:COLORS.border}`, background: "transparent", color: "inherit", cursor: "pointer" }}>→</button>
            </div>
          </div>
        </header>

        {/* View Container */}
        <div style={{ flex: 1, overflowY: "auto", position: "relative", scrollBehavior: "smooth" }} ref={containerRef}>
          
          {/* DAY VIEW */}
          {viewMode === 'day' && (
            <div style={{ height: 1440 * PIXELS_PER_MINUTE + 50, position: "relative" }}>
              {/* Time Grid */}
              {Array.from({ length: 24 }).map((_, h) => (
                <div key={h} style={{ position: "absolute", top: h * 60 * PIXELS_PER_MINUTE, left: 0, right: 0, height: 60 * PIXELS_PER_MINUTE, borderTop: `1px solid ${darkMode ? COLORS.borderDark : COLORS.border}` }}>
                  <span style={{ position: "absolute", top: -10, left: 16, fontSize: 11, color: COLORS.muted, background: darkMode ? COLORS.bgDark : COLORS.bg, padding: "0 6px" }}>
                    {use24Hour ? `${h}:00` : `${h === 0 ? 12 : h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`}
                  </span>
                </div>
              ))}

              {/* Current Time Line */}
              {currentDate.toDateString() === now.toDateString() && (
                <div style={{ position: "absolute", top: (now.getHours() * 60 + now.getMinutes()) * PIXELS_PER_MINUTE, left: 0, right: 0, height: 1, background: COLORS.line, zIndex: 20 }}>
                  <div style={{ position: "absolute", left: 60, top: -3, width: 6, height: 6, borderRadius: "50%", background: COLORS.line }} />
                </div>
              )}
              
              {/* Click to Create Area */}
              <div style={{ position: "absolute", inset: "0 0 0 70px", zIndex: 1 }} onClick={(e) => {
                 const rect = e.currentTarget.getBoundingClientRect();
                 const offsetY = e.clientY - rect.top; // Relative to viewport/scroll
                 const minutes = Math.floor(offsetY / PIXELS_PER_MINUTE / 15) * 15;
                 const d = new Date(currentDate); d.setHours(0, minutes, 0, 0);
                 openNew(d);
              }} />

              {/* Events */}
              <div style={{ position: "absolute", inset: "0 20px 0 70px", pointerEvents: "none" }}>
                {filteredEvents.filter(e => e.start.toDateString() === currentDate.toDateString()).map(ev => {
                  const top = (ev.start.getHours() * 60 + ev.start.getMinutes()) * PIXELS_PER_MINUTE;
                  const duration = (ev.end - ev.start) / 60000;
                  const height = Math.max(duration * PIXELS_PER_MINUTE, 25);
                  const cat = CATEGORIES.find(c => c.id === ev.category) || CATEGORIES[0];
                  const isDragging = dragState?.id === ev.id;
                  
                  return (
                    <div key={ev.id} 
                      onMouseDown={(e) => handleDragStart(e, ev, 'move')}
                      style={{ 
                        position: "absolute", top, height, left: 0, right: 0,
                        background: cat.bg, borderLeft: `4px solid ${cat.border}`,
                        borderRadius: 6, padding: "4px 8px", cursor: isDragging ? "grabbing" : "grab",
                        pointerEvents: "auto", overflow: "hidden", zIndex: isDragging ? 50 : 10,
                        boxShadow: isDragging ? "0 10px 20px rgba(0,0,0,0.15)" : "0 2px 4px rgba(0,0,0,0.02)",
                        opacity: isDragging ? 0.9 : 1, transition: isDragging ? "none" : "box-shadow 0.2s"
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: cat.text }}>{ev.title}</div>
                        <div style={{ fontSize: 11, color: cat.text, opacity: 0.8 }}>{fmtTime(ev.start)} - {fmtTime(ev.end)}</div>
                        <div style={{ position: "absolute", top: 2, right: 2 }} onClick={(e) => { e.stopPropagation(); openEdit(ev); }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={cat.text} strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                        </div>
                        {/* Resize Handle */}
                        <div 
                          onMouseDown={(e) => handleDragStart(e, ev, 'resize')}
                          style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 8, cursor: "ns-resize" }} 
                        />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* WEEK VIEW (Fixed Grid) */}
          {viewMode === 'week' && (
            <div style={{ display: "grid", gridTemplateColumns: "50px repeat(7, 1fr)", minHeight: "100%", width: "100%" }}>
              {/* Left Time Column */}
              <div style={{ borderRight: `1px solid ${darkMode?COLORS.borderDark:COLORS.border}` }}>
                 {Array.from({length: 24}).map((_,h) => (
                   <div key={h} style={{ height: 60, fontSize: 10, color: COLORS.muted, textAlign: "center", paddingTop: 8 }}>{h}</div>
                 ))}
              </div>

              {getWeekDays(currentDate).map((day, i) => {
                const isToday = day.toDateString() === now.toDateString();
                const past = isPast(day);
                const dayEvents = filteredEvents.filter(e => e.start.toDateString() === day.toDateString());
                
                return (
                  <div key={i} className={past && !isToday ? "past-day" : ""} style={{ borderRight: `1px solid ${darkMode?COLORS.borderDark:COLORS.border}`, minWidth: 100 }}>
                    <div style={{ height: 50, borderBottom: `1px solid ${darkMode?COLORS.borderDark:COLORS.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: isToday ? (darkMode ? "#18181b" : "#f0fdf4") : "transparent" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: isToday ? COLORS.primary : COLORS.muted, textTransform: "uppercase" }}>{day.toLocaleDateString(undefined, {weekday:'short'})}</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: isToday ? COLORS.primary : "inherit" }}>{day.getDate()}</span>
                    </div>
                    <div style={{ position: "relative", height: 24 * 60 }}>
                      {/* Grid Lines */}
                      {Array.from({length:24}).map((_,h) => <div key={h} style={{ height: 60, borderBottom: `1px solid ${darkMode?COLORS.borderDark:COLORS.border}`, opacity: 0.3 }} />)}
                      
                      {/* Events */}
                      {dayEvents.map(ev => {
                         const top = ev.start.getHours() * 60 + ev.start.getMinutes();
                         const dur = (ev.end - ev.start) / 60000;
                         const cat = CATEGORIES.find(c => c.id === ev.category) || CATEGORIES[0];
                         return (
                           <div key={ev.id} onClick={() => openEdit(ev)} style={{
                             position: "absolute", top: top, height: Math.max(dur, 20), left: 4, right: 4,
                             background: cat.bg, borderLeft: `3px solid ${cat.border}`, borderRadius: 4, padding: 4, cursor: "pointer", fontSize: 11, overflow:"hidden", color: cat.text
                           }}>
                             <div style={{fontWeight: 600}}>{ev.title}</div>
                           </div>
                         )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* YEAR VIEW */}
          {viewMode === 'year' && (
            <div style={{ padding: 40, overflowX: "auto" }}>
               <div style={{ minWidth: 1000 }}>
                 <div style={{ display: "flex", marginBottom: 10, marginLeft: 80 }}>
                   {Array.from({length: 37}).map((_, i) => (
                     <div key={i} style={{ width: 30, fontSize: 10, fontWeight: 700, textAlign: "center", color: COLORS.muted }}>{['M','T','W','T','F','S','S'][i%7]}</div>
                   ))}
                 </div>
                 {Array.from({length: 12}).map((_, m) => {
                    const d = new Date(currentDate.getFullYear(), m, 1);
                    const days = new Date(currentDate.getFullYear(), m + 1, 0).getDate();
                    const offset = (d.getDay() + 6) % 7;
                    return (
                      <div key={m} style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                         <div style={{ width: 80, fontSize: 13, fontWeight: 600, color: COLORS.muted }}>{d.toLocaleDateString(undefined, {month:'long'})}</div>
                         {Array.from({length: offset}).map((_,i) => <div key={`spacer-${i}`} style={{ width: 30 }} />)}
                         {Array.from({length: days}).map((_, i) => {
                            const date = new Date(currentDate.getFullYear(), m, i + 1);
                            const isToday = date.toDateString() === now.toDateString();
                            const past = isPast(date);
                            const hasEv = events.some(e => e.start.toDateString() === date.toDateString());
                            const weekend = date.getDay() === 0 || date.getDay() === 6;

                            return (
                              <div key={i} onClick={() => { setCurrentDate(date); setViewMode('day'); }} 
                                className={past && !isToday ? "past-day" : ""}
                                style={{ 
                                  width: 26, height: 26, margin: "0 2px", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 11, cursor: "pointer", position: "relative",
                                  background: isToday ? COLORS.primary : hasEv ? (darkMode ? "#3f3f46" : "#e4e4e7") : weekend ? (darkMode ? "#18181b" : "#f4f4f5") : "transparent",
                                  color: isToday ? "#fff" : "inherit", border: weekend && !hasEv ? `1px solid ${darkMode?COLORS.borderDark:COLORS.border}` : "none"
                                }}>
                                  {i+1}
                              </div>
                            )
                         })}
                      </div>
                    )
                 })}
               </div>
            </div>
          )}

        </div>
      </div>

      {/* EVENT MODAL */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div className="fade-in" style={{ width: 400, background: darkMode ? "#18181b" : "#fff", padding: 24, borderRadius: 16, boxShadow: "0 20px 50px rgba(0,0,0,0.2)", border: `1px solid ${darkMode ? "#27272a" : "#fff"}` }}>
             <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>{editingEvent ? "Edit Event" : "Create Event"}</h3>
             
             <div style={{ marginBottom: 16 }}>
               <label style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase" }}>Title</label>
               <input autoFocus value={formTitle} onChange={e => setFormTitle(e.target.value)} style={{ width: "100%", padding: "10px 12px", marginTop: 6, borderRadius: 8, border: `1px solid ${darkMode?COLORS.borderDark:COLORS.border}`, background: "transparent", color: "inherit", fontSize: 15 }} />
             </div>
             
             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
               <div>
                 <label style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase" }}>Start</label>
                 <input type="time" value={formStart} onChange={e => setFormStart(e.target.value)} style={{ width: "100%", padding: "10px 12px", marginTop: 6, borderRadius: 8, border: `1px solid ${darkMode?COLORS.borderDark:COLORS.border}`, background: "transparent", color: "inherit", fontSize: 14 }} />
               </div>
               <div>
                 <label style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase" }}>End</label>
                 <input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} style={{ width: "100%", padding: "10px 12px", marginTop: 6, borderRadius: 8, border: `1px solid ${darkMode?COLORS.borderDark:COLORS.border}`, background: "transparent", color: "inherit", fontSize: 14 }} />
               </div>
             </div>

             <div style={{ marginBottom: 24 }}>
               <label style={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase" }}>Category</label>
               <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                 {CATEGORIES.map(c => (
                   <button key={c.id} onClick={() => setFormCat(c.id)} style={{ padding: "6px 10px", borderRadius: 8, border: formCat === c.id ? `2px solid ${c.border}` : `1px solid ${darkMode?COLORS.borderDark:COLORS.border}`, background: formCat === c.id ? c.bg : "transparent", color: formCat === c.id ? c.text : "inherit", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>{c.name}</button>
                 ))}
               </div>
             </div>

             <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
               {editingEvent && <button onClick={() => deleteEvent(editingEvent.id)} style={{ marginRight: "auto", color: COLORS.line, background: "transparent", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Delete</button>}
               <button onClick={() => setShowModal(false)} style={{ padding: "10px 16px", borderRadius: 10, background: darkMode?"#27272a":"#f4f4f5", color: "inherit", border: "none", cursor: "pointer", fontWeight: 500 }}>Cancel</button>
               <button onClick={saveEvent} style={{ padding: "10px 20px", borderRadius: 10, background: COLORS.primary, color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}>Save</button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}