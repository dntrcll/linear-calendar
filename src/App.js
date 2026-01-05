import { useEffect, useState, useRef, useCallback } from "react";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth, provider } from "./firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

// Configuration
const PIXELS_PER_MINUTE = 1.2; // Adjusted for vertical readability
const SNAP_MINUTES = 15;
const MIN_EVENT_DURATION = 15;

const COLORS = {
  emerald: { 50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 400: "#34d399", 500: "#10b981", 600: "#059669", 900: "#064e3b" },
  stone: { 50: "#fafaf9", 100: "#f5f5f4", 200: "#e7e5e4", 300: "#d6d3d1", 400: "#a8a29e", 500: "#78716c", 600: "#57534e", 700: "#44403c", 800: "#292524", 900: "#1c1917" },
  amber: { 500: "#f59e0b" },
  rose: { 500: "#f43f5e" }, // For current time line
  bgLight: "#fafaf9", // Flat cleaner background
  bgDark: "#1c1917",
};

const EVENT_COLORS = {
  emerald: { bg: "#d1fae5", border: "#10b981", text: "#064e3b", dot: "#10b981" },
  sage: { bg: "#ecfccb", border: "#84cc16", text: "#365314", dot: "#84cc16" },
  amber: { bg: "#fef3c7", border: "#f59e0b", text: "#78350f", dot: "#f59e0b" },
  terracotta: { bg: "#ffedd5", border: "#ea580c", text: "#7c2d12", dot: "#ea580c" },
  slate: { bg: "#f1f5f9", border: "#64748b", text: "#0f172a", dot: "#64748b" },
};

const DEFAULT_CATEGORIES = [
  { id: "work", name: "Work", color: "emerald" },
  { id: "personal", name: "Personal", color: "sage" },
  { id: "meeting", name: "Meeting", color: "amber" },
  { id: "event", name: "Event", color: "terracotta" },
  { id: "code", name: "Code", color: "slate" },
];

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, sans-serif; overflow: hidden; } /* Prevent body scroll */
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  .fade-in { animation: fadeIn 0.2s ease-out forwards; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.3); }
`;

export default function App() {
  const PERSONAL_SPACE_ID = "0Ti7Ru6X3gPh9qNwv7lT"; // Replace or keep logic
  const QUOTES = ["Make it happen.", "Focus.", "Day by day.", "Simplicity is key."];

  const [user, setUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [now, setNow] = useState(() => new Date());
  const [spaceId] = useState(PERSONAL_SPACE_ID);
  const [events, setEvents] = useState([]);
  const [deletedEvents, setDeletedEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showDeletedOverlay, setShowDeletedOverlay] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [eventCategory, setEventCategory] = useState("work");
  const [viewMode, setViewMode] = useState("day"); // day, week, year
  const [categories] = useState(DEFAULT_CATEGORIES);
  const [darkMode, setDarkMode] = useState(() => JSON.parse(localStorage.getItem('darkMode')) || false);
  const [use24HourFormat] = useState(false);

  const containerRef = useRef(null);

  // Persistence & styling
  useEffect(() => { const s = document.createElement('style'); s.textContent = globalStyles; document.head.appendChild(s); return () => s.remove(); }, []);
  useEffect(() => { setPersistence(auth, browserLocalPersistence).catch(console.error); return auth.onAuthStateChanged(setUser); }, []);
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(i); }, []);
  useEffect(() => { localStorage.setItem('darkMode', JSON.stringify(darkMode)); }, [darkMode]);

  // Scroll to 8 AM on load
  useEffect(() => {
    if (viewMode === 'day' && containerRef.current) {
      containerRef.current.scrollTop = 8 * 60 * PIXELS_PER_MINUTE;
    }
  }, [viewMode, loading]);

  const loadEvents = useCallback(async () => {
    if (!user || !spaceId) return;
    setLoading(true);
    try {
      const q = query(collection(db, "events"), where("spaceId", "==", spaceId), where("deleted", "==", false));
      const snap = await getDocs(q);
      const delQ = query(collection(db, "events"), where("spaceId", "==", spaceId), where("deleted", "==", true));
      const delSnap = await getDocs(delQ);
      
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data(), start: d.data().startTime.toDate(), end: d.data().endTime.toDate() })));
      setDeletedEvents(delSnap.docs.map(d => ({ id: d.id, ...d.data(), start: d.data().startTime?.toDate(), end: d.data().endTime?.toDate() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [user, spaceId]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Form logic
  const saveEvent = async () => {
    if (!title.trim() || !startTime || !endTime) return;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const s = new Date(currentDate); s.setHours(sh, sm, 0, 0);
    const e = new Date(currentDate); e.setHours(eh, em, 0, 0);
    
    const data = { title, startTime: Timestamp.fromDate(s), endTime: Timestamp.fromDate(e), category: eventCategory, spaceId, deleted: false, updatedAt: serverTimestamp() };
    
    try {
      if (editingEvent) await updateDoc(doc(db, "events", editingEvent.id), data);
      else { data.createdAt = serverTimestamp(); await addDoc(collection(db, "events"), data); }
      setShowModal(false); loadEvents();
    } catch (err) { alert("Error saving"); }
  };

  const deleteEventAction = async (id, permanent = false) => {
    if (permanent) await deleteDoc(doc(db, "events", id));
    else await updateDoc(doc(db, "events", id), { deleted: true });
    loadEvents();
  };
  const restoreEvent = async (id) => { await updateDoc(doc(db, "events", id), { deleted: false }); loadEvents(); };

  const openNew = (dStart) => { 
    setEditingEvent(null); setTitle(""); 
    if(dStart) {
        setStartTime(`${dStart.getHours().toString().padStart(2,'0')}:${dStart.getMinutes().toString().padStart(2,'0')}`);
        const dEnd = new Date(dStart); dEnd.setMinutes(dEnd.getMinutes() + 60);
        setEndTime(`${dEnd.getHours().toString().padStart(2,'0')}:${dEnd.getMinutes().toString().padStart(2,'0')}`);
    } else {
        setStartTime("09:00"); setEndTime("10:00");
    }
    setShowModal(true); 
  };
  const openEdit = (ev) => { 
    setEditingEvent(ev); setTitle(ev.title); setEventCategory(ev.category);
    setStartTime(`${ev.start.getHours().toString().padStart(2,'0')}:${ev.start.getMinutes().toString().padStart(2,'0')}`);
    setEndTime(`${ev.end.getHours().toString().padStart(2,'0')}:${ev.end.getMinutes().toString().padStart(2,'0')}`);
    setShowModal(true); 
  };

  // Helpers
  const fmtTime = (d) => d.toLocaleTimeString([], { hour: use24HourFormat ? "2-digit" : "numeric", minute: "2-digit", hour12: !use24HourFormat });
  const navDate = (d) => { const n = new Date(currentDate); n.setDate(n.getDate() + d); setCurrentDate(n); };
  
  // Day View Layout Logic (Vertical Overlap Handling)
  const getVerticalLayout = (dayEvents) => {
    const sorted = [...dayEvents].sort((a,b) => a.start - b.start);
    const columns = [];
    let lastEventEnd = null;

    sorted.forEach(ev => {
        let placed = false;
        for (let i = 0; i < columns.length; i++) {
            const col = columns[i];
            const lastInCol = col[col.length - 1];
            if (ev.start >= lastInCol.end) {
                col.push(ev);
                placed = true;
                break;
            }
        }
        if (!placed) columns.push([ev]);
    });

    return columns.map((col, colIndex) => col.map(ev => ({
        ...ev,
        left: (colIndex / columns.length) * 100,
        width: 100 / columns.length
    }))).flat();
  };

  const dayEvents = events.filter(e => e.start.toDateString() === currentDate.toDateString());
  const processedDayEvents = getVerticalLayout(dayEvents);

  if (!user) return <div style={{height: "100vh", display: "flex", justifyContent: "center", alignItems: "center", background: COLORS.bgLight}}><button onClick={() => signInWithPopup(auth, provider)} style={{padding: "12px 24px", borderRadius: 8, background: "#000", color: "#fff", cursor: "pointer"}}>Sign In</button></div>;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: darkMode ? COLORS.bgDark : COLORS.bgLight, color: darkMode ? "#fff" : "#1c1917" }}>
      
      {/* 1. Header (Fixed) */}
      <header style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${darkMode ? COLORS.stone[800] : COLORS.stone[200]}`, background: darkMode ? COLORS.stone[900] : "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 18, fontFamily: "Inter, sans-serif", letterSpacing: "-0.5px" }}>Linear.</div>
          <div style={{ display: "flex", background: darkMode ? COLORS.stone[800] : COLORS.stone[100], borderRadius: 8, padding: 2 }}>
            {['day', 'week', 'year'].map(v => (
              <button key={v} onClick={() => setViewMode(v)} style={{ padding: "6px 12px", border: "none", borderRadius: 6, background: viewMode === v ? (darkMode ? COLORS.stone[600] : "#fff") : "transparent", color: darkMode ? "#fff" : "#000", boxShadow: viewMode === v ? "0 2px 4px rgba(0,0,0,0.05)" : "none", cursor: "pointer", fontSize: 13, fontWeight: 500, textTransform: "capitalize" }}>{v}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setDarkMode(!darkMode)} style={{background:"transparent", border:"none", cursor:"pointer", fontSize: 18}}>{darkMode ? "☀️" : "🌙"}</button>
            <button onClick={() => setShowDeletedOverlay(true)} style={{background:"transparent", border:"none", cursor:"pointer", fontSize: 18}}>🗑</button>
            <div style={{width: 32, height: 32, borderRadius: "50%", background: "#10b981", color: "#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600}}>{user.displayName?.[0]}</div>
        </div>
      </header>

      {/* 2. Navigation Bar (Fixed) */}
      <div style={{ padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: darkMode ? COLORS.bgDark : COLORS.bgLight }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => navDate(-1)} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[300]}`, background: "transparent", color: "inherit", cursor: "pointer" }}>←</button>
            <button onClick={() => setCurrentDate(new Date())} style={{ padding: "0 12px", height: 32, borderRadius: 6, border: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[300]}`, background: "transparent", color: "inherit", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>Today</button>
            <button onClick={() => navDate(1)} style={{ width: 32, height: 32, borderRadius: 6, border: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[300]}`, background: "transparent", color: "inherit", cursor: "pointer" }}>→</button>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginLeft: 8 }}>
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                {viewMode === 'day' && <span style={{color: COLORS.stone[500], marginLeft: 8, fontWeight: 400}}>{currentDate.getDate()} ({currentDate.toLocaleDateString('en-US', {weekday:'long'})})</span>}
            </h2>
        </div>
        <button onClick={() => openNew()} style={{ background: "#10b981", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 6px rgba(16,185,129,0.2)" }}>+ Add Event</button>
      </div>

      {/* 3. Main Scrollable Content Area */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", position: "relative" }}>
        
        {/* DAY VIEW (Fixed: Vertical Layout) */}
        {viewMode === 'day' && (
            <div ref={containerRef} style={{ flex: 1, overflowY: "auto", position: "relative", scrollBehavior: "smooth" }}>
                <div style={{ height: 24 * 60 * PIXELS_PER_MINUTE, position: "relative", width: "100%" }}>
                    
                    {/* Time Grid (Background) */}
                    {Array.from({ length: 24 }).map((_, h) => (
                        <div key={h} style={{ position: "absolute", top: h * 60 * PIXELS_PER_MINUTE, left: 0, right: 0, height: 60 * PIXELS_PER_MINUTE, borderTop: `1px solid ${darkMode ? COLORS.stone[800] : COLORS.stone[200]}` }}>
                            <span style={{ position: "absolute", top: -10, left: 16, fontSize: 12, color: COLORS.stone[500], background: darkMode ? COLORS.bgDark : COLORS.bgLight, padding: "0 4px" }}>
                                {h === 0 ? "" : `${h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`}
                            </span>
                        </div>
                    ))}

                    {/* Current Time Line */}
                    {currentDate.toDateString() === now.toDateString() && (
                        <div style={{ position: "absolute", top: (now.getHours() * 60 + now.getMinutes()) * PIXELS_PER_MINUTE, left: 0, right: 0, height: 2, background: COLORS.rose[500], zIndex: 10 }}>
                            <div style={{ position: "absolute", left: 0, top: -4, width: 8, height: 8, borderRadius: "50%", background: COLORS.rose[500] }} />
                        </div>
                    )}

                    {/* Click Area for Creation */}
                    <div style={{position:"absolute", inset:0, zIndex: 0}} onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const y = e.clientY - rect.top + e.currentTarget.scrollTop; // Simple approximation
                        const mins = Math.floor((e.nativeEvent.offsetY) / PIXELS_PER_MINUTE / 15) * 15;
                        const d = new Date(currentDate); d.setHours(0, mins, 0,0);
                        openNew(d);
                    }} />

                    {/* Events */}
                    <div style={{ position: "absolute", top: 0, left: 70, right: 20, bottom: 0, pointerEvents: "none" }}>
                        {processedDayEvents.map(ev => {
                            const top = (ev.start.getHours() * 60 + ev.start.getMinutes()) * PIXELS_PER_MINUTE;
                            const height = Math.max(((ev.end - ev.start) / 1000 / 60) * PIXELS_PER_MINUTE, MIN_EVENT_DURATION * PIXELS_PER_MINUTE);
                            const style = EVENT_COLORS[ev.category] || EVENT_COLORS.emerald;
                            
                            return (
                                <div key={ev.id} onClick={(e) => { e.stopPropagation(); openEdit(ev); }} 
                                    style={{ 
                                        position: "absolute", top, height: height - 2, 
                                        left: `${ev.left}%`, width: `${ev.width}%`,
                                        background: style.bg, borderLeft: `3px solid ${style.border}`,
                                        borderRadius: 4, padding: "4px 8px", cursor: "pointer", pointerEvents: "auto",
                                        overflow: "hidden", zIndex: 5, transition: "transform 0.1s",
                                        color: style.text, fontSize: 12
                                    }}
                                    className="event-card"
                                >
                                    <div style={{ fontWeight: 600 }}>{ev.title}</div>
                                    <div style={{ opacity: 0.8, fontSize: 10 }}>{fmtTime(ev.start)} - {fmtTime(ev.end)}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        )}

        {/* WEEK VIEW (Simplified) */}
        {viewMode === 'week' && (
             <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", height: "100%", width: "100%", overflowY: "auto" }}>
                {Array.from({length: 7}).map((_, i) => {
                    const d = new Date(currentDate);
                    const dayOfWeek = d.getDay(); // 0 is Sun
                    const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) + i; // Adjust to start Mon
                    d.setDate(diff);
                    
                    const isToday = d.toDateString() === now.toDateString();
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    const daysEvents = events.filter(e => e.start.toDateString() === d.toDateString()).sort((a,b) => a.start - b.start);

                    return (
                        <div key={i} style={{ 
                            borderRight: `1px solid ${darkMode?COLORS.stone[800]:COLORS.stone[200]}`, 
                            background: isWeekend ? (darkMode ? COLORS.stone[800] : COLORS.stone[50]) : "transparent",
                            minHeight: "100%"
                        }}>
                            <div style={{ padding: 12, borderBottom: `1px solid ${darkMode?COLORS.stone[800]:COLORS.stone[200]}`, textAlign: "center", background: isToday ? (darkMode ? COLORS.emerald[900] : COLORS.emerald[50]) : "transparent" }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.stone[500], textTransform: "uppercase" }}>{d.toLocaleDateString('en-US', {weekday:'short'})}</div>
                                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: isToday ? COLORS.emerald[500] : "inherit" }}>{d.getDate()}</div>
                            </div>
                            <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                                {daysEvents.map(ev => {
                                    const style = EVENT_COLORS[ev.category];
                                    return (
                                        <div key={ev.id} onClick={() => openEdit(ev)} style={{ background: style.bg, borderLeft: `2px solid ${style.border}`, padding: "4px 6px", borderRadius: 4, fontSize: 11, cursor: "pointer", color: style.text }}>
                                            <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                                            <div>{fmtTime(ev.start)}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
             </div>
        )}

        {/* YEAR VIEW (Linear with Tone for Weekends) */}
        {viewMode === 'year' && (
            <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
                <div style={{ minWidth: 1000, display: "grid", gridTemplateColumns: "60px repeat(37, 1fr)", gap: 2 }}>
                    {/* Header Row */}
                    <div />
                    {Array.from({length: 37}).map((_, i) => (
                        <div key={i} style={{ fontSize: 10, fontWeight: 700, color: COLORS.stone[400], textAlign: "center", paddingBottom: 8 }}>
                            {['M','T','W','T','F','S','S'][i % 7]}
                        </div>
                    ))}
                    
                    {/* Months */}
                    {Array.from({ length: 12 }).map((_, m) => {
                        const monthStart = new Date(currentDate.getFullYear(), m, 1);
                        const daysInMonth = new Date(currentDate.getFullYear(), m + 1, 0).getDate();
                        const startOffset = (monthStart.getDay() + 6) % 7; // Mon=0
                        
                        return (
                            <div key={m} style={{ display: "contents" }}>
                                <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.stone[500], alignSelf: "center", paddingRight: 12 }}>{monthStart.toLocaleDateString('en-US', {month: 'short'})}</div>
                                
                                {/* Empty start slots */}
                                {Array.from({length: startOffset}).map((_, i) => <div key={`empty-${i}`} />)}
                                
                                {/* Days */}
                                {Array.from({length: daysInMonth}).map((_, d) => {
                                    const date = new Date(currentDate.getFullYear(), m, d + 1);
                                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                    const isToday = date.toDateString() === now.toDateString();
                                    const hasEvent = events.some(e => e.start.toDateString() === date.toDateString());
                                    
                                    return (
                                        <div key={d} onClick={() => { setCurrentDate(date); setViewMode('day'); }}
                                            style={{ 
                                                aspectRatio: "1/1", 
                                                background: isToday ? COLORS.emerald[500] : isWeekend ? (darkMode ? "#292524" : "#f5f5f4") : (darkMode ? "#1c1917" : "#fff"),
                                                borderRadius: 4, 
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                fontSize: 12, fontWeight: isToday ? 600 : 400,
                                                color: isToday ? "#fff" : "inherit",
                                                cursor: "pointer", position: "relative",
                                                border: `1px solid ${darkMode ? (isWeekend?"#292524":"#1c1917") : (isWeekend?"#f5f5f4":"#fff")}`
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.border = `1px solid ${COLORS.emerald[500]}`}
                                            onMouseLeave={e => e.currentTarget.style.border = `1px solid ${darkMode ? (isWeekend?"#292524":"#1c1917") : (isWeekend?"#f5f5f4":"#fff")}`}
                                        >
                                            {d + 1}
                                            {hasEvent && !isToday && <div style={{ position: "absolute", bottom: 4, width: 4, height: 4, borderRadius: "50%", background: COLORS.emerald[500] }} />}
                                        </div>
                                    );
                                })}
                                {/* Fill rest of row */}
                                {Array.from({length: 37 - (startOffset + daysInMonth)}).map((_, i) => <div key={`fill-${i}`} />)}
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

      </div>

      {/* Modals (Simplified for brevity, logic retained) */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
            <div className="fade-in" style={{ width: 400, background: darkMode ? COLORS.stone[900] : "#fff", padding: 24, borderRadius: 12, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
                <h3 style={{ marginBottom: 20 }}>{editingEvent ? "Edit Event" : "New Event"}</h3>
                <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} style={{ width: "100%", padding: 12, marginBottom: 12, borderRadius: 8, border: `1px solid ${COLORS.stone[300]}`, background: darkMode?COLORS.stone[800]:"#fff", color: "inherit" }} />
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${COLORS.stone[300]}`, background: darkMode?COLORS.stone[800]:"#fff", color: "inherit" }} />
                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${COLORS.stone[300]}`, background: darkMode?COLORS.stone[800]:"#fff", color: "inherit" }} />
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                    {categories.map(c => (
                        <div key={c.id} onClick={() => setEventCategory(c.id)} style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", border: eventCategory === c.id ? `2px solid ${EVENT_COLORS[c.color].border}` : `1px solid ${darkMode?COLORS.stone[700]:COLORS.stone[200]}`, background: eventCategory === c.id ? EVENT_COLORS[c.color].bg : "transparent", color: eventCategory === c.id ? EVENT_COLORS[c.color].text : "inherit" }}>{c.name}</div>
                    ))}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                    {editingEvent && <button onClick={() => { deleteEventAction(editingEvent.id); setShowModal(false); }} style={{ color: COLORS.rose[500], background: "transparent", border: "none", cursor: "pointer", marginRight: "auto" }}>Delete</button>}
                    <button onClick={() => setShowModal(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: COLORS.stone[200], color: "#000" }}>Cancel</button>
                    <button onClick={saveEvent} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "#10b981", color: "#fff" }}>Save</button>
                </div>
            </div>
        </div>
      )}

      {showDeletedOverlay && (
          <div style={{position: "fixed", inset:0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", justifyContent:"center", alignItems:"center"}} onClick={() => setShowDeletedOverlay(false)}>
              <div style={{width: 400, maxHeight: "80vh", overflow:"auto", background: darkMode?COLORS.stone[900]:"#fff", padding: 24, borderRadius: 12}} onClick={e => e.stopPropagation()}>
                  <h3>Trash</h3>
                  {deletedEvents.map(ev => (
                      <div key={ev.id} style={{padding: 12, borderBottom: `1px solid ${COLORS.stone[200]}`, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                          <span>{ev.title}</span>
                          <button onClick={() => restoreEvent(ev.id)} style={{fontSize: 12, background: COLORS.emerald[100], color: COLORS.emerald[900], padding: "4px 8px", borderRadius: 4, border:"none", cursor:"pointer"}}>Restore</button>
                      </div>
                  ))}
                  {deletedEvents.length === 0 && <p style={{color: COLORS.stone[500]}}>Trash is empty</p>}
              </div>
          </div>
      )}
    </div>
  );
}