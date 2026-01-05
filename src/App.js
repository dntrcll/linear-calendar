import { useEffect, useState, useRef, useCallback } from "react";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth, provider } from "./firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

// --- CONFIGURATION ---
const APP_NAME = "Epoch";
const PIXELS_PER_MINUTE = 1.8; // Taller, more elegant timeline
const SNAP_MINUTES = 15;

// --- LUXE COLOR PALETTE ---
const THEME = {
  light: {
    bg: "#FDFCF8", // Alabaster/Cream
    sidebar: "#F4F2EB", // Warm Stone
    text: "#1C1917", // Charcoal
    muted: "#78716C", // Stone Gray
    border: "#E7E5E4",
    line: "#D97706", // Amber 600 for current time
    active: "#1C1917",
    inactive: "#A8A29E"
  },
  dark: {
    bg: "#0C0A09", // Deep Warm Black
    sidebar: "#1C1917",
    text: "#E7E5E4", // Warm Grey
    muted: "#78716C",
    border: "#292524",
    line: "#F59E0B", // Amber 500
    active: "#E7E5E4",
    inactive: "#57534E"
  }
};

// Default Palette for Tags
const PALETTE_OPTIONS = [
  { label: "Emerald", bg: "#d1fae5", text: "#064e3b", border: "#059669" },
  { label: "Amber",   bg: "#fef3c7", text: "#78350f", border: "#d97706" },
  { label: "Stone",   bg: "#e7e5e4", text: "#1c1917", border: "#57534e" },
  { label: "Clay",    bg: "#ffedd5", text: "#7c2d12", border: "#ea580c" },
  { label: "Slate",   bg: "#f1f5f9", text: "#0f172a", border: "#475569" },
  { label: "Rose",    bg: "#ffe4e6", text: "#881337", border: "#e11d48" },
];

const DEFAULT_CATEGORIES = [
  { id: "work", name: "Deep Work", ...PALETTE_OPTIONS[0] }, // Emerald
  { id: "meeting", name: "Meeting", ...PALETTE_OPTIONS[2] }, // Stone
];

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Plus Jakarta Sans', sans-serif; overflow: hidden; transition: background 0.3s ease; }
  h1, h2, h3, h4, .serif { font-family: 'Playfair Display', serif; }
  
  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(120, 113, 108, 0.3); border-radius: 3px; }
  
  /* Animations */
  .fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  
  .pulse { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.7); animation: pulse-animation 2s infinite; }
  @keyframes pulse-animation {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(217, 119, 6, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(217, 119, 6, 0); }
  }

  /* Glassmorphism & UI */
  .glass-panel { backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
  .btn-hover:hover { transform: translateY(-1px); transition: all 0.2s; }
  
  input:focus, select:focus { outline: 2px solid #d97706; outline-offset: 1px; }
`;

export default function App() {
  // --- STATE ---
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [viewMode, setViewMode] = useState("day"); // day, week, year
  
  // Customization State
  const [darkMode, setDarkMode] = useState(() => JSON.parse(localStorage.getItem('darkMode')) || false);
  const [use24Hour, setUse24Hour] = useState(false);
  const [categories, setCategories] = useState(() => JSON.parse(localStorage.getItem('categories')) || DEFAULT_CATEGORIES);
  const [activeTags, setActiveTags] = useState(categories.map(c => c.id));
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [notifications, setNotifications] = useState([]); // {id, msg, type}
  
  // Form State
  const [editingEvent, setEditingEvent] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formCat, setFormCat] = useState(categories[0].id);

  // Drag State
  const [dragState, setDragState] = useState(null);
  const containerRef = useRef(null);

  const colors = darkMode ? THEME.dark : THEME.light;

  // --- EFFECTS ---
  useEffect(() => { const s = document.createElement('style'); s.textContent = GLOBAL_STYLES; document.head.appendChild(s); return () => s.remove(); }, []);
  useEffect(() => { setPersistence(auth, browserLocalPersistence); auth.onAuthStateChanged(setUser); }, []);
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(i); }, []);
  useEffect(() => { localStorage.setItem('darkMode', JSON.stringify(darkMode)); }, [darkMode]);
  useEffect(() => { localStorage.setItem('categories', JSON.stringify(categories)); }, [categories]);

  // Load Data
  const loadEvents = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "events"), where("uid", "==", user.uid), where("deleted", "==", false));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ 
        id: d.id, ...d.data(), start: d.data().startTime.toDate(), end: d.data().endTime.toDate() 
      }));
      setEvents(data);
    } catch (e) { notify("Failed to load events", "error"); }
  }, [user]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // --- NOTIFICATIONS ---
  const notify = (msg, type = "success") => {
    const id = Date.now();
    setNotifications(p => [...p, { id, msg, type }]);
    setTimeout(() => setNotifications(p => p.filter(n => n.id !== id)), 3000);
  };

  // --- ACTIONS ---
  const navDate = (amount, unit = "day") => {
    const d = new Date(currentDate);
    if (unit === "day") d.setDate(d.getDate() + amount);
    if (unit === "week") d.setDate(d.getDate() + (amount * 7));
    if (unit === "year") d.setFullYear(d.getFullYear() + amount);
    setCurrentDate(d);
  };

  const handleSaveEvent = async () => {
    if (!formTitle || !formStart || !formEnd) return notify("Please fill required fields", "error");
    
    // Parse times
    const [sh, sm] = formStart.split(":").map(Number);
    const [eh, em] = formEnd.split(":").map(Number);
    const baseDate = editingEvent ? editingEvent.start : currentDate;
    const start = new Date(baseDate); start.setHours(sh, sm, 0, 0);
    const end = new Date(baseDate); end.setHours(eh, em, 0, 0);
    if (end <= start) end.setDate(end.getDate() + 1); // Handle overnight

    const payload = {
      uid: user.uid, title: formTitle, category: formCat,
      startTime: Timestamp.fromDate(start), endTime: Timestamp.fromDate(end),
      deleted: false, updatedAt: serverTimestamp()
    };

    try {
      if (editingEvent) await updateDoc(doc(db, "events", editingEvent.id), payload);
      else { payload.createdAt = serverTimestamp(); await addDoc(collection(db, "events"), payload); }
      setShowEventModal(false); loadEvents(); notify("Event saved");
    } catch (e) { notify("Error saving", "error"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this event?")) return;
    await updateDoc(doc(db, "events", id), { deleted: true });
    setShowEventModal(false); loadEvents(); notify("Event deleted");
  };

  // --- DRAG HANDLERS ---
  const handleDragStart = (e, ev, mode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setDragState({ id: ev.id, mode, startY: e.clientY, origStart: ev.start, origEnd: ev.end });
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragState) return;
    const deltaMins = Math.floor((e.clientY - dragState.startY) / PIXELS_PER_MINUTE / SNAP_MINUTES) * SNAP_MINUTES;
    if (deltaMins === 0) return;

    setEvents(prev => prev.map(ev => {
      if (ev.id !== dragState.id) return ev;
      const newS = new Date(dragState.origStart);
      const newE = new Date(dragState.origEnd);
      
      if (dragState.mode === 'move') {
        newS.setMinutes(newS.getMinutes() + deltaMins);
        newE.setMinutes(newE.getMinutes() + deltaMins);
      } else {
        newE.setMinutes(newE.getMinutes() + deltaMins);
        if ((newE - newS) < 15 * 60000) return ev; // Min duration
      }
      return { ...ev, start: newS, end: newE };
    }));
  }, [dragState]);

  const handleMouseUp = useCallback(async () => {
    if (!dragState) return;
    const ev = events.find(e => e.id === dragState.id);
    if (ev) {
      await updateDoc(doc(db, "events", ev.id), {
        startTime: Timestamp.fromDate(ev.start), endTime: Timestamp.fromDate(ev.end)
      });
      notify("Event updated");
    }
    setDragState(null);
  }, [dragState, events]);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  // --- RENDER HELPERS ---
  const fmtTime = (d) => d.toLocaleTimeString([], { hour: use24Hour ? "2-digit" : "numeric", minute: "2-digit", hour12: !use24Hour });
  const isToday = (d) => d.toDateString() === now.toDateString();

  if (!user) return <LoginScreen onLogin={() => signInWithPopup(auth, provider)} />;

  return (
    <div style={{ height: "100vh", display: "flex", background: colors.bg, color: colors.text }}>
      
      {/* --- SIDEBAR --- */}
      <aside style={{ width: 280, background: colors.sidebar, borderRight: `1px solid ${colors.border}`, display: "flex", flexDirection: "column", padding: "32px 24px", zIndex: 20 }}>
        <div style={{ marginBottom: 40 }}>
          <h1 className="serif" style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-1px" }}>{APP_NAME}.</h1>
          <p style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>Curate your time.</p>
        </div>

        <button onClick={() => { setEditingEvent(null); setFormTitle(""); setFormStart("09:00"); setFormEnd("10:00"); setShowEventModal(true); }} 
          className="btn-hover"
          style={{ width: "100%", padding: "14px", borderRadius: 12, background: "#1C1917", color: "#F4F2EB", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 32, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}>
          Create Event
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
             <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: colors.muted }}>Categories</h3>
             <button onClick={() => setShowSettings(true)} style={{ background: "transparent", border: "none", color: colors.muted, cursor: "pointer", fontSize: 18 }}>+</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {categories.map(cat => (
              <div key={cat.id} onClick={() => setActiveTags(p => p.includes(cat.id) ? p.filter(x => x !== cat.id) : [...p, cat.id])}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", cursor: "pointer", opacity: activeTags.includes(cat.id) ? 1 : 0.4 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: cat.border, boxShadow: `0 0 10px ${cat.bg}` }} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>{cat.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setShowSettings(true)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, fontSize: 13, cursor: "pointer" }}>Settings</button>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: colors.text, color: colors.bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>
            {user.displayName?.[0]}
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* Header */}
        <header style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
             <div style={{ display: "flex", gap: 4 }}>
               <button onClick={() => navDate(-1, viewMode === 'year' ? 'year' : viewMode === 'week' ? 'week' : 'day')} style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
               <button onClick={() => navDate(1, viewMode === 'year' ? 'year' : viewMode === 'week' ? 'week' : 'day')} style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>→</button>
             </div>
             <div>
               <h2 className="serif" style={{ fontSize: 28, fontWeight: 600, color: colors.text }}>
                 {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
               </h2>
               {viewMode === 'day' && <p style={{ fontSize: 14, color: colors.muted, display:"flex", alignItems:"center", gap:8 }}>
                  {currentDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric' })}
                  {isToday(currentDate) && <span style={{fontSize:10, fontWeight:700, color: colors.line, textTransform:"uppercase", letterSpacing:1}}>Today</span>}
               </p>}
             </div>
          </div>

          <div style={{ background: colors.sidebar, padding: 4, borderRadius: 12, display: "flex", border: `1px solid ${colors.border}` }}>
            {['day', 'week', 'year'].map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} 
                style={{ 
                  padding: "8px 24px", borderRadius: 8, border: "none", 
                  background: viewMode === mode ? (darkMode ? "#E7E5E4" : "#1C1917") : "transparent", 
                  color: viewMode === mode ? (darkMode ? "#1C1917" : "#F4F2EB") : colors.muted,
                  fontSize: 13, fontWeight: 600, textTransform: "capitalize", cursor: "pointer", transition: "all 0.2s"
                }}>
                {mode}
              </button>
            ))}
          </div>
        </header>

        {/* Viewport */}
        <div ref={containerRef} style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          
          {/* DAY VIEW */}
          {viewMode === 'day' && (
            <div style={{ height: 1440 * PIXELS_PER_MINUTE + 100, position: "relative", width: "100%" }}>
              {/* Grid Background */}
              {Array.from({ length: 24 }).map((_, h) => (
                <div key={h} style={{ position: "absolute", top: h * 60 * PIXELS_PER_MINUTE, left: 0, right: 0, height: 60 * PIXELS_PER_MINUTE, borderTop: `1px solid ${colors.border}` }}>
                  <span style={{ position: "absolute", top: -10, left: 24, fontSize: 12, fontWeight: 500, color: colors.muted, background: colors.bg, padding: "0 8px" }}>
                    {use24Hour ? `${h}:00` : `${h === 0 ? 12 : h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`}
                  </span>
                </div>
              ))}

              {/* Today Marker */}
              {isToday(currentDate) && (
                <div style={{ position: "absolute", top: (now.getHours() * 60 + now.getMinutes()) * PIXELS_PER_MINUTE, left: 0, right: 0, height: 1, background: colors.line, zIndex: 10 }}>
                   <div className="pulse" style={{ position: "absolute", left: 80, top: -4, width: 8, height: 8, borderRadius: "50%", background: colors.line }} />
                </div>
              )}

              {/* Click Surface */}
              <div style={{ position: "absolute", inset: "0 0 0 90px", zIndex: 1 }} onClick={(e) => {
                const mins = Math.floor((e.nativeEvent.offsetY) / PIXELS_PER_MINUTE / 15) * 15;
                const d = new Date(currentDate); d.setHours(0, mins, 0, 0);
                setEditingEvent(null); setFormTitle(""); setFormCat(categories[0].id);
                setFormStart(d.toTimeString().slice(0,5)); d.setMinutes(d.getMinutes()+60); setFormEnd(d.toTimeString().slice(0,5));
                setShowEventModal(true);
              }} />

              {/* Events */}
              <div style={{ position: "absolute", inset: "0 40px 0 90px", pointerEvents: "none" }}>
                {events.filter(e => activeTags.includes(e.category) && e.start.toDateString() === currentDate.toDateString()).map(ev => {
                  const cat = categories.find(c => c.id === ev.category) || categories[0];
                  const top = (ev.start.getHours() * 60 + ev.start.getMinutes()) * PIXELS_PER_MINUTE;
                  const height = Math.max(((ev.end - ev.start)/60000) * PIXELS_PER_MINUTE, 30);
                  const isDrag = dragState?.id === ev.id;

                  return (
                    <div key={ev.id} onMouseDown={(e) => handleDragStart(e, ev, 'move')}
                      style={{ 
                        position: "absolute", top, height, left: 0, right: 0,
                        background: cat.bg, borderLeft: `4px solid ${cat.border}`, borderRadius: 4,
                        padding: "8px 12px", cursor: isDrag ? "grabbing" : "grab", pointerEvents: "auto",
                        zIndex: isDrag ? 50 : 10, boxShadow: isDrag ? "0 10px 30px rgba(0,0,0,0.1)" : "0 2px 5px rgba(0,0,0,0.02)",
                        transition: isDrag ? "none" : "all 0.2s"
                      }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: cat.text }}>{ev.title}</div>
                      <div style={{ fontSize: 11, color: cat.text, opacity: 0.8 }}>{fmtTime(ev.start)} - {fmtTime(ev.end)}</div>
                      {/* Resize Handle */}
                      <div onMouseDown={(e) => handleDragStart(e, ev, 'resize')} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 10, cursor: "ns-resize", display: "flex", justifyContent: "center" }}>
                        <div style={{ width: 30, height: 4, background: cat.border, borderRadius: 2, opacity: 0.5, marginTop: 4 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* YEAR VIEW (Architectural Grid) */}
          {viewMode === 'year' && (
             <div style={{ padding: 40 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
                  {Array.from({ length: 12 }).map((_, m) => {
                    const monthStart = new Date(currentDate.getFullYear(), m, 1);
                    const days = new Date(currentDate.getFullYear(), m + 1, 0).getDate();
                    const startDay = (monthStart.getDay() + 6) % 7; // Mon start
                    return (
                      <div key={m}>
                        <h4 className="serif" style={{ fontSize: 20, marginBottom: 16, color: colors.muted, borderBottom: `1px solid ${colors.border}`, paddingBottom: 8 }}>
                          {monthStart.toLocaleDateString('en-US', { month: 'long' })}
                        </h4>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                          {['M','T','W','T','F','S','S'].map(d => <div key={d} style={{ fontSize: 10, textAlign: "center", color: colors.muted, marginBottom: 4 }}>{d}</div>)}
                          {Array.from({ length: startDay }).map((_, i) => <div key={`e-${i}`} />)}
                          {Array.from({ length: days }).map((_, d) => {
                            const date = new Date(currentDate.getFullYear(), m, d+1);
                            const isT = isToday(date);
                            const hasE = events.some(e => e.start.toDateString() === date.toDateString());
                            return (
                              <div key={d} onClick={() => { setCurrentDate(date); setViewMode('day'); }}
                                style={{ 
                                  aspectRatio: "1/1", display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 11, borderRadius: "50%", cursor: "pointer",
                                  background: isT ? colors.line : hasE ? (darkMode ? "#292524" : "#E7E5E4") : "transparent",
                                  color: isT ? "#fff" : colors.text, fontWeight: isT ? 700 : 400
                                }}>
                                {d+1}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
             </div>
          )}

          {/* WEEK VIEW */}
          {viewMode === 'week' && (
             <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", minHeight: "100%", width: "100%" }}>
                <div style={{ borderRight: `1px solid ${colors.border}` }}>
                   {Array.from({length:24}).map((_,h) => <div key={h} style={{ height: 60, fontSize:10, color: colors.muted, textAlign:"center", paddingTop: 8 }}>{h}</div>)}
                </div>
                {Array.from({length:7}).map((_, i) => {
                   const d = new Date(currentDate); 
                   const day = d.getDay(); 
                   const diff = d.getDate() - day + (day === 0 ? -6 : 1) + i;
                   d.setDate(diff);
                   const isT = isToday(d);
                   return (
                     <div key={i} style={{ borderRight: `1px solid ${colors.border}`, background: isT ? (darkMode ? "#1c1917" : "#fffbeb") : "transparent" }}>
                        <div style={{ padding: 12, textAlign: "center", borderBottom: `1px solid ${colors.border}` }}>
                           <div style={{ fontSize: 11, fontWeight: 700, color: isT ? colors.line : colors.muted, textTransform: "uppercase" }}>{d.toLocaleDateString('en-US',{weekday:'short'})}</div>
                           <div className="serif" style={{ fontSize: 24, color: isT ? colors.line : colors.text }}>{d.getDate()}</div>
                        </div>
                        <div style={{ position: "relative", height: 1440 }}>
                           {events.filter(e => e.start.toDateString() === d.toDateString()).map(ev => {
                              const top = ev.start.getHours() * 60 + ev.start.getMinutes();
                              const h = (ev.end - ev.start)/60000;
                              const cat = categories.find(c => c.id === ev.category) || categories[0];
                              return (
                                <div key={ev.id} onClick={() => { setEditingEvent(ev); setFormTitle(ev.title); setFormCat(ev.category); setShowEventModal(true); }}
                                  style={{ position: "absolute", top, height: Math.max(h, 20), left: 2, right: 2, background: cat.bg, borderLeft: `2px solid ${cat.border}`, fontSize: 10, padding: 2, color: cat.text, overflow: "hidden", borderRadius: 2, cursor: "pointer" }}>
                                  {ev.title}
                                </div>
                              )
                           })}
                        </div>
                     </div>
                   )
                })}
             </div>
          )}
        </div>
      </div>

      {/* --- NOTIFICATIONS --- */}
      <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 10, zIndex: 200 }}>
        {notifications.map(n => (
          <div key={n.id} className="fade-in" style={{ padding: "12px 24px", background: n.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 600, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
            {n.msg}
          </div>
        ))}
      </div>

      {/* --- MODALS --- */}
      {showEventModal && (
        <Modal onClose={() => setShowEventModal(false)} colors={colors}>
           <h3 className="serif" style={{ fontSize: 24, marginBottom: 24 }}>{editingEvent ? "Edit Event" : "New Event"}</h3>
           <Input label="Title" value={formTitle} onChange={setFormTitle} colors={colors} autoFocus />
           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
             <Input label="Start" type="time" value={formStart} onChange={setFormStart} colors={colors} />
             <Input label="End" type="time" value={formEnd} onChange={setFormEnd} colors={colors} />
           </div>
           <div style={{ margin: "20px 0" }}>
             <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: colors.muted }}>Category</label>
             <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
               {categories.map(c => (
                 <button key={c.id} onClick={() => setFormCat(c.id)} style={{ padding: "8px 16px", borderRadius: 20, border: formCat === c.id ? `2px solid ${c.border}` : `1px solid ${colors.border}`, background: formCat === c.id ? c.bg : "transparent", color: formCat === c.id ? c.text : colors.text, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>{c.name}</button>
               ))}
             </div>
           </div>
           <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 32 }}>
             {editingEvent && <button onClick={() => handleDelete(editingEvent.id)} style={{ marginRight: "auto", color: "#ef4444", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Delete</button>}
             <button onClick={handleSaveEvent} style={{ padding: "12px 24px", background: "#1C1917", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>Save Event</button>
           </div>
        </Modal>
      )}

      {showSettings && (
        <Modal onClose={() => setShowSettings(false)} colors={colors}>
          <h3 className="serif" style={{ fontSize: 24, marginBottom: 24 }}>Settings</h3>
          
          <div style={{ marginBottom: 32 }}>
             <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Appearance</h4>
             <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, border: `1px solid ${colors.border}`, borderRadius: 8 }}>
                <span>Dark Mode</span>
                <input type="checkbox" checked={darkMode} onChange={e => setDarkMode(e.target.checked)} />
             </label>
          </div>

          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Manage Tags</h4>
            <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 16 }}>
               {categories.map((c, i) => (
                 <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, padding: 8, background: colors.bg, borderRadius: 6 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: c.bg, border: `1px solid ${c.border}` }} />
                    <span style={{ flex: 1 }}>{c.name}</span>
                    <button onClick={() => setCategories(p => p.filter(x => x.id !== c.id))} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                 </div>
               ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
               <input placeholder="New Tag Name" id="newTag" style={{ flex: 1, padding: 8, borderRadius: 6, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text }} />
               <select id="newColor" style={{ padding: 8, borderRadius: 6, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text }}>
                 {PALETTE_OPTIONS.map((p, i) => <option key={i} value={i}>{p.label}</option>)}
               </select>
               <button onClick={() => {
                  const name = document.getElementById('newTag').value;
                  const colorIdx = document.getElementById('newColor').value;
                  if(name) {
                     setCategories(p => [...p, { id: name.toLowerCase(), name, ...PALETTE_OPTIONS[colorIdx] }]);
                     document.getElementById('newTag').value = "";
                  }
               }} style={{ padding: "0 16px", background: colors.text, color: colors.bg, border: "none", borderRadius: 6, cursor: "pointer" }}>Add</button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}

// --- SUBCOMPONENTS ---
const Modal = ({ children, onClose, colors }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
    <div className="fade-in" style={{ width: 450, background: colors.sidebar, padding: 32, borderRadius: 16, border: `1px solid ${colors.border}`, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }} onClick={e => e.stopPropagation()}>
      {children}
    </div>
  </div>
);

const Input = ({ label, colors, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: "uppercase", marginBottom: 6 }}>{label}</label>
    <input {...props} style={{ width: "100%", padding: "12px", borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, fontSize: 15 }} />
  </div>
);

const LoginScreen = ({ onLogin }) => (
  <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FDFCF8" }}>
     <div style={{ textAlign: "center" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 64, marginBottom: 16, color: "#1C1917" }}>Epoch.</h1>
        <p style={{ color: "#78716C", marginBottom: 32 }}>Time, refined.</p>
        <button onClick={onLogin} style={{ padding: "16px 32px", background: "#1C1917", color: "#fff", fontSize: 16, borderRadius: 8, border: "none", cursor: "pointer" }}>Enter</button>
     </div>
  </div>
);