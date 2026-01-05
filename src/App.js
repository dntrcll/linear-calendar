import { useEffect, useState, useRef, useCallback } from "react";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth, provider } from "./firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

// --- CONFIGURATION ---
const APP_NAME = "Nexus";
const PIXELS_PER_MINUTE = 2; 
const SNAP_MINUTES = 15;

// --- MIDNIGHT LUXE THEME ---
const THEME = {
  light: {
    bg: "#FAFAFA", 
    sidebar: "#FFFFFF", 
    card: "#FFFFFF",
    text: "#18181B", 
    muted: "#71717A", 
    border: "#E4E4E7", 
    line: "#3B82F6", // Blue accent
    weekend: "#F4F4F5",
    activeBtnText: "#FFFFFF",
    activeBtnBg: "#18181B",
    primary: "#3B82F6"
  },
  dark: {
    bg: "#0B0E11", // Deep Midnight
    sidebar: "#151921", // Slightly lighter midnight
    card: "#1E232E", 
    text: "#F8FAFC", 
    muted: "#64748B", // Slate 500
    border: "#2D3748", 
    line: "#3B82F6", // Bright Blue
    weekend: "#11141C",
    activeBtnText: "#FFFFFF",
    activeBtnBg: "#3B82F6", // Blue active state like screenshot
    primary: "#3B82F6"
  }
};

const TAG_COLORS = [
  { name: "Blue",    bg: "#EFF6FF", border: "#3B82F6", text: "#1E40AF", dot: "#3B82F6" },
  { name: "Emerald", bg: "#ECFDF5", border: "#10B981", text: "#064E3B", dot: "#10B981" },
  { name: "Amber",   bg: "#FFFBEB", border: "#F59E0B", text: "#78350F", dot: "#F59E0B" },
  { name: "Purple",  bg: "#FAF5FF", border: "#A855F7", text: "#6B21A8", dot: "#A855F7" },
  { name: "Rose",    bg: "#FFF1F2", border: "#F43F5E", text: "#881337", dot: "#F43F5E" },
];

const DEFAULT_CATS = [
  { id: "work", name: "Work", ...TAG_COLORS[0] },
  { id: "personal", name: "Personal", ...TAG_COLORS[3] },
  { id: "family", name: "Family", ...TAG_COLORS[1] },
];

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; overflow: hidden; transition: background 0.3s ease, color 0.3s ease; }
  h1, h2, h3, h4, .brand { font-family: 'Plus Jakarta Sans', sans-serif; }
  
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 3px; }
  
  .fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  
  .pulse { animation: pulse 2s infinite; }
  @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }

  .past-blur { opacity: 0.4; filter: grayscale(1); }
  
  /* Screenshot matching Year View Grid */
  .year-grid-cell { 
    width: 32px; height: 32px; 
    display: flex; align-items: center; justify-content: center; 
    font-size: 11px; border-radius: 4px; 
    cursor: pointer; transition: all 0.2s;
  }
  .year-grid-cell:hover { background: rgba(255,255,255,0.1); }
  .year-grid-header {
    width: 32px; text-align: center; 
    font-size: 10px; font-weight: 700; 
    text-transform: uppercase; margin-bottom: 8px;
    color: #64748B;
  }
`;

export default function App() {
  // --- STATE ---
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [viewMode, setViewMode] = useState("day"); 
  
  // Settings
  const [darkMode, setDarkMode] = useState(() => JSON.parse(localStorage.getItem('nexus_dark')) || true); // Default to Dark based on screenshot
  const [use24Hour, setUse24Hour] = useState(() => JSON.parse(localStorage.getItem('nexus_24h')) || false);
  const [categories, setCategories] = useState(() => JSON.parse(localStorage.getItem('nexus_cats')) || DEFAULT_CATS);
  const [activeTags, setActiveTags] = useState(categories.map(c => c.id));
  
  // UI
  const [showSettings, setShowSettings] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  // Form/Drag
  const [editingEvent, setEditingEvent] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formCat, setFormCat] = useState(categories[0].id);
  const [dragState, setDragState] = useState(null);
  
  const containerRef = useRef(null);
  const colors = darkMode ? THEME.dark : THEME.light;

  // --- EFFECTS ---
  useEffect(() => { const s = document.createElement('style'); s.textContent = GLOBAL_STYLES; document.head.appendChild(s); return () => s.remove(); }, []);
  useEffect(() => { setPersistence(auth, browserLocalPersistence); auth.onAuthStateChanged(setUser); }, []);
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(i); }, []);
  useEffect(() => { localStorage.setItem('nexus_dark', JSON.stringify(darkMode)); }, [darkMode]);
  useEffect(() => { localStorage.setItem('nexus_24h', JSON.stringify(use24Hour)); }, [use24Hour]);
  useEffect(() => { localStorage.setItem('nexus_cats', JSON.stringify(categories)); }, [categories]);

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
    } catch (e) { notify("Error loading events", "error"); }
  }, [user]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // --- ACTIONS ---
  const notify = (msg, type = "success") => {
    const id = Date.now();
    setNotifications(p => [...p, { id, msg, type }]);
    setTimeout(() => setNotifications(p => p.filter(n => n.id !== id)), 3000);
  };

  const nav = (amt, mode) => {
    const d = new Date(currentDate);
    if (mode === 'year') d.setFullYear(d.getFullYear() + amt);
    else if (mode === 'week') d.setDate(d.getDate() + (amt * 7));
    else d.setDate(d.getDate() + amt);
    setCurrentDate(d);
  };

  const saveEvent = async () => {
    if (!formTitle || !formStart || !formEnd) return notify("Missing fields", "error");
    const [sh, sm] = formStart.split(":").map(Number);
    const [eh, em] = formEnd.split(":").map(Number);
    const base = editingEvent ? editingEvent.start : currentDate;
    const s = new Date(base); s.setHours(sh, sm, 0, 0);
    const e = new Date(base); e.setHours(eh, em, 0, 0);
    if (e <= s) e.setDate(e.getDate() + 1);

    const payload = {
      uid: user.uid, title: formTitle, category: formCat,
      startTime: Timestamp.fromDate(s), endTime: Timestamp.fromDate(e),
      deleted: false, updatedAt: serverTimestamp()
    };

    try {
      if (editingEvent) await updateDoc(doc(db, "events", editingEvent.id), payload);
      else { payload.createdAt = serverTimestamp(); await addDoc(collection(db, "events"), payload); }
      setShowModal(false); loadEvents(); notify(editingEvent ? "Updated" : "Created");
    } catch { notify("Save failed", "error"); }
  };

  const deleteEvent = async (id) => {
    if (!window.confirm("Delete?")) return;
    await updateDoc(doc(db, "events", id), { deleted: true });
    setShowModal(false); loadEvents(); notify("Deleted");
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
      const s = new Date(dragState.origStart);
      const end = new Date(dragState.origEnd);
      if (dragState.mode === 'move') { s.setMinutes(s.getMinutes() + deltaMins); end.setMinutes(end.getMinutes() + deltaMins); }
      else { end.setMinutes(end.getMinutes() + deltaMins); if ((end - s) < 15 * 60000) return ev; }
      return { ...ev, start: s, end: end };
    }));
  }, [dragState]);

  const handleMouseUp = useCallback(async () => {
    if (!dragState) return;
    const ev = events.find(e => e.id === dragState.id);
    if (ev) {
      await updateDoc(doc(db, "events", ev.id), { startTime: Timestamp.fromDate(ev.start), endTime: Timestamp.fromDate(ev.end) });
      notify("Event moved");
    }
    setDragState(null);
  }, [dragState, events]);

  useEffect(() => {
    if (dragState) { window.addEventListener("mousemove", handleMouseMove); window.addEventListener("mouseup", handleMouseUp); }
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [dragState, handleMouseMove, handleMouseUp]);

  // --- HELPERS ---
  const fmtTime = (d) => d.toLocaleTimeString([], { hour: use24Hour ? "2-digit" : "numeric", minute: "2-digit", hour12: !use24Hour });
  const isToday = (d) => d.toDateString() === now.toDateString();
  const isPast = (d) => { const t = new Date(); t.setHours(0,0,0,0); return d < t; };

  // Generate Year Grid Data
  // We need ~37 columns (Mon-Sun repeating) to cover a full month starting on any day
  const YEAR_COLS = 38; // 31 days + max offset (6) + buffer
  const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  
  if (!user) return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0B0E11", color: "#F8FAFC" }}>
    <div style={{ textAlign: "center" }}>
      <h1 className="brand" style={{ fontSize: 48, marginBottom: 16, background: "linear-gradient(135deg, #3B82F6, #8B5CF6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{APP_NAME}.</h1>
      <button onClick={() => signInWithPopup(auth, provider)} style={{ padding: "14px 28px", background: "#3B82F6", color: "#FFF", border: "none", borderRadius: 8, fontSize: 16, cursor: "pointer", fontWeight: 600 }}>Sign In</button>
    </div>
  </div>;

  return (
    <div style={{ height: "100vh", display: "flex", background: colors.bg, color: colors.text }}>
      
      {/* SIDEBAR */}
      <aside style={{ width: 260, background: colors.sidebar, borderRight: `1px solid ${colors.border}`, display: "flex", flexDirection: "column", padding: 24, zIndex: 50 }}>
        <div style={{ marginBottom: 40 }}>
          <h1 className="brand" style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 12, height: 12, background: colors.primary, borderRadius: "50%" }} />
            {APP_NAME}
          </h1>
        </div>
        
        <button onClick={() => { setEditingEvent(null); setFormTitle(""); setFormStart("09:00"); setFormEnd("10:00"); setShowModal(true); }} 
          style={{ width: "100%", padding: "12px", borderRadius: 8, background: colors.primary, color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 32, boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)" }}>
          + New Event
        </button>
        
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: colors.muted }}>Tags</span>
            <button onClick={() => setShowSettings(true)} style={{ background: "none", border: "none", color: colors.muted, cursor: "pointer" }}>+</button>
          </div>
          {categories.map(c => (
            <div key={c.id} onClick={() => setActiveTags(p => p.includes(c.id) ? p.filter(x => x !== c.id) : [...p, c.id])} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer", opacity: activeTags.includes(c.id) ? 1 : 0.4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot }} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</span>
            </div>
          ))}
        </div>

        <button onClick={() => setShowSettings(true)} style={{ padding: 12, borderRadius: 8, background: colors.card, border: `1px solid ${colors.border}`, color: colors.text, fontSize: 13, cursor: "pointer" }}>Settings</button>
      </aside>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* HEADER */}
        <header style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
             <h2 className="brand" style={{ fontSize: 24, fontWeight: 700 }}>{viewMode === 'year' ? currentDate.getFullYear() : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
             <div style={{ display: "flex", gap: 4 }}>
               <button onClick={() => nav(-1, viewMode === 'year' ? 'year' : 'day')} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, cursor: "pointer" }}>←</button>
               <button onClick={() => nav(0, 'today')} style={{ padding: "0 12px", height: 32, borderRadius: 6, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Today</button>
               <button onClick={() => nav(1, viewMode === 'year' ? 'year' : 'day')} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${colors.border}`, background: "transparent", color: colors.text, cursor: "pointer" }}>→</button>
             </div>
          </div>

          <div style={{ display: "flex", background: colors.card, padding: 4, borderRadius: 8, border: `1px solid ${colors.border}` }}>
            {['day', 'week', 'year'].map(m => (
              <button key={m} onClick={() => setViewMode(m)} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: viewMode === m ? colors.activeBtnBg : "transparent", color: viewMode === m ? colors.activeBtnText : colors.muted, fontSize: 13, fontWeight: 600, textTransform: "capitalize", cursor: "pointer" }}>{m}</button>
            ))}
          </div>
        </header>

        {/* VIEWPORT */}
        <div ref={containerRef} style={{ flex: 1, overflow: "auto", position: "relative" }}>
          
          {/* DAY VIEW */}
          {viewMode === 'day' && (
            <div style={{ height: 1440 * PIXELS_PER_MINUTE + 60, position: "relative" }}>
              {Array.from({length: 24}).map((_, h) => (
                <div key={h} style={{ position: "absolute", top: h * 60 * PIXELS_PER_MINUTE, left: 0, right: 0, height: 60 * PIXELS_PER_MINUTE, borderTop: `1px solid ${colors.border}` }}>
                  <span style={{ position: "absolute", top: -10, left: 20, fontSize: 11, fontWeight: 600, color: colors.muted, background: colors.bg, padding: "0 6px" }}>{use24Hour ? `${h}:00` : `${h === 0 ? 12 : h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`}</span>
                </div>
              ))}
              
              {isToday(currentDate) && <div style={{ position: "absolute", top: (now.getHours() * 60 + now.getMinutes()) * PIXELS_PER_MINUTE, left: 0, right: 0, height: 2, background: colors.line, zIndex: 10 }}>
                <div className="pulse" style={{ position: "absolute", left: 70, top: -5, width: 10, height: 10, borderRadius: "50%", background: colors.line }} />
              </div>}

              <div style={{ position: "absolute", inset: "0 0 0 80px", zIndex: 1 }} onClick={(e) => {
                const m = Math.floor(e.nativeEvent.offsetY / PIXELS_PER_MINUTE / 15) * 15;
                const d = new Date(currentDate); d.setHours(0, m, 0, 0);
                setEditingEvent(null); setFormTitle(""); setFormCat(categories[0].id);
                setFormStart(d.toTimeString().slice(0,5)); d.setMinutes(m+60); setFormEnd(d.toTimeString().slice(0,5));
                setShowModal(true);
              }} />

              {events.filter(e => e.start.toDateString() === currentDate.toDateString() && activeTags.includes(e.category)).map(ev => {
                const cat = categories.find(c => c.id === ev.category) || categories[0];
                const top = (ev.start.getHours() * 60 + ev.start.getMinutes()) * PIXELS_PER_MINUTE;
                const h = Math.max(((ev.end - ev.start)/60000) * PIXELS_PER_MINUTE, 30);
                const isDrag = dragState?.id === ev.id;
                return (
                  <div key={ev.id} onMouseDown={(e) => handleDragStart(e, ev, 'move')} style={{ 
                    position: "absolute", top, height: h, left: 90, right: 24, 
                    background: cat.bg, borderLeft: `4px solid ${cat.border}`, borderRadius: 4, padding: "6px 12px",
                    cursor: isDrag ? "grabbing" : "grab", zIndex: isDrag ? 50 : 20, boxShadow: isDrag ? "0 10px 30px rgba(0,0,0,0.2)" : "0 2px 4px rgba(0,0,0,0.05)"
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: cat.text }}>{ev.title}</div>
                    <div style={{ fontSize: 11, color: cat.text, opacity: 0.8 }}>{fmtTime(ev.start)} - {fmtTime(ev.end)}</div>
                    <div onMouseDown={(e) => handleDragStart(e, ev, 'resize')} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 8, cursor: "ns-resize" }} />
                  </div>
                );
              })}
            </div>
          )}

          {/* WEEK VIEW */}
          {viewMode === 'week' && (
            <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", minHeight: "100%" }}>
              <div style={{ borderRight: `1px solid ${colors.border}` }}>
                {Array.from({length:24}).map((_,h) => <div key={h} style={{ height: 60, fontSize: 10, color: colors.muted, textAlign: "center", paddingTop: 8 }}>{h}</div>)}
              </div>
              {Array.from({length:7}).map((_, i) => {
                const d = new Date(currentDate); 
                d.setDate(d.getDate() - d.getDay() + i + (1)); // Start Monday
                const isT = isToday(d);
                return (
                  <div key={i} className={isPast(d) && !isT ? "past-blur" : ""} style={{ borderRight: `1px solid ${colors.border}`, background: isT ? (darkMode ? "#1E232E" : "#EFF6FF") : "transparent" }}>
                    <div style={{ height: 50, borderBottom: `1px solid ${colors.border}`, textAlign: "center", padding: 8 }}>
                       <div style={{ fontSize: 11, fontWeight: 700, color: isT ? colors.primary : colors.muted }}>{d.toLocaleDateString('en-US',{weekday:'short'})}</div>
                       <div style={{ fontSize: 18, fontWeight: 600, color: isT ? colors.primary : colors.text }}>{d.getDate()}</div>
                    </div>
                    <div style={{ position: "relative", height: 1440 }}>
                      {events.filter(e => e.start.toDateString() === d.toDateString() && activeTags.includes(e.category)).map(ev => {
                         const cat = categories.find(c => c.id === ev.category) || categories[0];
                         const t = ev.start.getHours() * 60 + ev.start.getMinutes();
                         const h = (ev.end - ev.start)/60000;
                         return <div key={ev.id} onClick={() => { setEditingEvent(ev); setFormTitle(ev.title); setFormCat(ev.category); setFormStart(ev.start.toTimeString().slice(0,5)); setFormEnd(ev.end.toTimeString().slice(0,5)); setShowModal(true); }}
                         style={{ position: "absolute", top: t, height: Math.max(h,20), left: 4, right: 4, background: cat.bg, borderLeft: `3px solid ${cat.border}`, fontSize: 10, color: cat.text, padding: 4, overflow: "hidden", borderRadius: 3, cursor: "pointer", fontWeight: 600 }}>{ev.title}</div>
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* SCREENSHOT-MATCHING YEAR VIEW */}
          {viewMode === 'year' && (
            <div style={{ padding: 40, overflowX: "auto" }}>
               <div style={{ minWidth: 1000 }}>
                  
                  {/* Fixed Header Row: Repeated Mo Tu We... */}
                  <div style={{ display: "flex", marginLeft: 80, marginBottom: 8 }}>
                     {Array.from({length: YEAR_COLS}).map((_, i) => (
                        <div key={i} className="year-grid-header" style={{ width: 34 }}>{WEEKDAYS[i % 7]}</div>
                     ))}
                  </div>

                  {/* Months */}
                  {Array.from({length: 12}).map((_, m) => {
                     const monthStart = new Date(currentDate.getFullYear(), m, 1);
                     const daysInMonth = new Date(currentDate.getFullYear(), m + 1, 0).getDate();
                     // Calculate shift: Monday=0. If month starts on Tue(2), shift is 1.
                     // JS getDay(): Sun=0, Mon=1...
                     // We want header Mon=0. So Mon(1)->0, Tue(2)->1... Sun(0)->6.
                     let startDay = monthStart.getDay(); 
                     startDay = startDay === 0 ? 6 : startDay - 1;

                     return (
                        <div key={m} style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                           {/* Month Label */}
                           <div style={{ width: 80, fontSize: 13, fontWeight: 700, color: colors.primary }}>{monthStart.toLocaleDateString('en-US',{month:'short'})}</div>
                           
                           {/* Grid Cells */}
                           <div style={{ display: "flex" }}>
                              {Array.from({length: YEAR_COLS}).map((_, colIndex) => {
                                 const dayNum = colIndex - startDay + 1;
                                 const isValidDay = dayNum > 0 && dayNum <= daysInMonth;
                                 
                                 if (!isValidDay) return <div key={colIndex} style={{ width: 34, height: 32 }} />;

                                 const date = new Date(currentDate.getFullYear(), m, dayNum);
                                 const isT = isToday(date);
                                 const hasEv = events.some(e => e.start.toDateString() === date.toDateString());

                                 return (
                                    <div key={colIndex} onClick={() => { setCurrentDate(date); setViewMode('day'); }}
                                       style={{ 
                                          width: 32, height: 32, margin: "0 1px", borderRadius: 4,
                                          display: "flex", alignItems: "center", justifyContent: "center",
                                          fontSize: 11, cursor: "pointer", fontWeight: isT ? 700 : 500,
                                          background: isT ? colors.primary : hasEv ? (darkMode ? "#1E293B" : "#DBEAFE") : "transparent",
                                          color: isT ? "#fff" : hasEv ? (darkMode ? "#60A5FA" : "#1E40AF") : colors.text
                                       }}
                                       className="year-grid-cell"
                                    >
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

        </div>
      </div>

      {/* NOTIFICATIONS */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, display: "flex", flexDirection: "column", gap: 10 }}>
        {notifications.map(n => <div key={n.id} className="fade-in" style={{ padding: "10px 20px", background: n.type==='error'?"#EF4444":"#10B981", color: "#FFF", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>{n.msg}</div>)}
      </div>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setShowSettings(false)}>
          <div className="fade-in" style={{ width: 450, background: colors.card, padding: 32, borderRadius: 16, border: `1px solid ${colors.border}` }} onClick={e => e.stopPropagation()}>
            <h3 className="brand" style={{ fontSize: 24, marginBottom: 24, color: colors.text }}>Settings</h3>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "flex", justifyContent: "space-between", padding: 12, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text }}>
                <span>Dark Mode</span> <input type="checkbox" checked={darkMode} onChange={e => setDarkMode(e.target.checked)} />
              </label>
            </div>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: colors.text }}>Tags</h4>
            <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 12 }}>
              {categories.map(c => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, background: colors.bg, borderRadius: 6, marginBottom: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 4, background: c.bg, border: `1px solid ${c.border}` }} />
                  <span style={{ flex: 1, color: colors.text }}>{c.name}</span>
                  <button onClick={() => setCategories(p => p.filter(x => x.id !== c.id))} style={{ color: "#EF4444", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input id="newTag" placeholder="New Tag" style={{ flex: 1, padding: 8, borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text }} />
              <select id="newColor" style={{ padding: 8, borderRadius: 6, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text }}>{TAG_COLORS.map((c,i) => <option key={i} value={i}>{c.name}</option>)}</select>
              <button onClick={() => {
                const name = document.getElementById('newTag').value;
                if(name) { setCategories(p => [...p, { id: name.toLowerCase(), name, ...TAG_COLORS[document.getElementById('newColor').value] }]); document.getElementById('newTag').value = ""; }
              }} style={{ padding: "0 16px", background: colors.primary, color: "#fff", borderRadius: 6, border: "none", cursor: "pointer" }}>Add</button>
            </div>
            <button onClick={() => signOut(auth)} style={{ marginTop: 24, width: "100%", padding: 12, border: "1px solid #EF4444", background: "transparent", color: "#EF4444", borderRadius: 8, cursor: "pointer" }}>Sign Out</button>
          </div>
        </div>
      )}

      {/* EVENT MODAL */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setShowModal(false)}>
           <div className="fade-in" style={{ width: 400, background: colors.card, padding: 32, borderRadius: 16, border: `1px solid ${colors.border}` }} onClick={e => e.stopPropagation()}>
             <h3 className="brand" style={{ fontSize: 22, marginBottom: 20, color: colors.text }}>{editingEvent ? "Edit" : "New"} Event</h3>
             <input autoFocus value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Title" style={{ width: "100%", padding: 12, marginBottom: 12, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text }} />
             <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
               <input type="time" value={formStart} onChange={e => setFormStart(e.target.value)} style={{ flex: 1, padding: 12, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text }} />
               <input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} style={{ flex: 1, padding: 12, borderRadius: 8, border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text }} />
             </div>
             <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
               {categories.map(c => (
                 <button key={c.id} onClick={() => setFormCat(c.id)} style={{ padding: "6px 12px", borderRadius: 20, border: formCat === c.id ? `2px solid ${c.border}` : `1px solid ${colors.border}`, background: formCat === c.id ? c.bg : "transparent", color: formCat === c.id ? c.text : colors.text, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>{c.name}</button>
               ))}
             </div>
             <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
               {editingEvent && <button onClick={() => deleteEvent(editingEvent.id)} style={{ marginRight: "auto", color: "#EF4444", background: "none", border: "none", cursor: "pointer" }}>Delete</button>}
               <button onClick={saveEvent} style={{ padding: "10px 24px", background: colors.primary, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Save</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}