import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth, provider } from "./firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

// --- CONFIGURATION ---
const PIXELS_PER_MINUTE = 2; // Slightly reduced for better overview
const EVENT_HEIGHT = 48;
const HEADER_HEIGHT = 40;
const ROW_GAP = 6;
const DAY_WIDTH = 1440 * PIXELS_PER_MINUTE;
const SNAP_MINUTES = 15;
const MIN_EVENT_DURATION = 15;

// --- THEME & COLORS ---
const COLORS = {
  white: "#ffffff",
  emerald: { 50: "#ecfdf5", 100: "#d1fae5", 500: "#10b981", 600: "#059669", 900: "#064e3b" },
  stone: { 50: "#fafaf9", 100: "#f5f5f4", 200: "#e7e5e4", 300: "#d6d3d1", 400: "#a8a29e", 500: "#78716c", 600: "#57534e", 700: "#44403c", 800: "#292524", 850: "#1f1c1a", 900: "#1c1917" },
  amber: { 500: "#f59e0b" },
  rose: { 500: "#f43f5e" },
  // Gradients
  bgLight: "#f5f5f4", // Cleaner flat background for modern feel
  bgDark: "#1c1917",
};

const EVENT_COLORS = {
  emerald: { bg: "linear-gradient(135deg, #10b981, #059669)", border: "#059669", dot: "#10b981", light: "#ecfdf5", text: "#065f46" },
  sage: { bg: "linear-gradient(135deg, #84cc16, #65a30d)", border: "#4d7c0f", dot: "#84cc16", light: "#f7fee7", text: "#3f6212" },
  amber: { bg: "linear-gradient(135deg, #f59e0b, #d97706)", border: "#b45309", dot: "#f59e0b", light: "#fffbeb", text: "#92400e" },
  terracotta: { bg: "linear-gradient(135deg, #ea580c, #c2410c)", border: "#9a3412", dot: "#ea580c", light: "#fff7ed", text: "#9a3412" },
  slate: { bg: "linear-gradient(135deg, #64748b, #475569)", border: "#334155", dot: "#64748b", light: "#f1f5f9", text: "#334155" },
  indigo: { bg: "linear-gradient(135deg, #6366f1, #4f46e5)", border: "#3730a3", dot: "#6366f1", light: "#eef2ff", text: "#3730a3" },
};

const DEFAULT_CATEGORIES = [
  { id: "work", name: "Work", color: "emerald" },
  { id: "personal", name: "Personal", color: "sage" },
  { id: "meeting", name: "Meeting", color: "amber" },
  { id: "event", name: "Event", color: "terracotta" },
  { id: "deepwork", name: "Deep Work", color: "indigo" },
];

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,300;400;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
  body { font-family: 'DM Sans', -apple-system, sans-serif; overflow: hidden; }
  
  /* Scrollbar Polish */
  .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
  .custom-scroll::-webkit-scrollbar-track { background: transparent; }
  .custom-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
  .dark .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
  
  /* Animations */
  @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
  @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  @keyframes pulseGlow { 0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); } 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }
  
  .fade-in { animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .slide-in { animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .pulse-glow { animation: pulseGlow 2s infinite; }
  
  .glass-panel { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
  
  /* Tooltip for Year View */
  .year-day:hover .tooltip { opacity: 1; transform: translate(-50%, -8px); pointer-events: none; }
`;

export default function App() {
  const PERSONAL_SPACE_ID = "0Ti7Ru6X3gPh9qNwv7lT"; // Consider moving to env or dynamic
  const QUOTES = ["Every day is a fresh start.", "Small progress is still progress.", "Focus on what you can control.", "Make today count.", "Progress over perfection.", "You've got this.", "Trust the process."];

  // --- STATE ---
  const [user, setUser] = useState(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [now, setNow] = useState(() => new Date());
  const [spaceId] = useState(PERSONAL_SPACE_ID);
  const [events, setEvents] = useState([]);
  const [deletedEvents, setDeletedEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // UI State
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showDeletedOverlay, setShowDeletedOverlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  
  // Form State
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [eventCategory, setEventCategory] = useState("work");
  
  // Preferences
  const [filterCategory, setFilterCategory] = useState("All");
  const [viewMode, setViewMode] = useState("day");
  const [categories, setCategories] = useState(() => { const s = localStorage.getItem('categories'); return s ? JSON.parse(s) : DEFAULT_CATEGORIES; });
  const [darkMode, setDarkMode] = useState(() => { const s = localStorage.getItem('darkMode'); return s ? JSON.parse(s) : true; });
  const [use24HourFormat, setUse24HourFormat] = useState(() => { const s = localStorage.getItem('use24HourFormat'); return s ? JSON.parse(s) : false; });
  const [dailyQuote] = useState(() => QUOTES[Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000) % QUOTES.length]);

  // Drag & Drop Refs
  const [draggingEvent, setDraggingEvent] = useState(null);
  const [resizingEvent, setResizingEvent] = useState(null);
  const dragDataRef = useRef({ startX: 0, originalStart: null, originalEnd: null, handle: null });
  const [hasDragged, setHasDragged] = useState(false);
  
  // Refs for Scrolling
  const timelineContainerRef = useRef(null);
  const isSavingRef = useRef(false);

  // --- EFFECTS ---
  useEffect(() => { const s = document.createElement('style'); s.textContent = globalStyles; document.head.appendChild(s); return () => s.remove(); }, []);
  useEffect(() => { setPersistence(auth, browserLocalPersistence).catch(console.error); return auth.onAuthStateChanged(setUser); }, []);
  
  // Clock & Theme
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(i); }, []);
  useEffect(() => { localStorage.setItem('categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('darkMode', JSON.stringify(darkMode)); document.body.style.backgroundColor = darkMode ? COLORS.bgDark : COLORS.bgLight; }, [darkMode]);
  useEffect(() => { localStorage.setItem('use24HourFormat', JSON.stringify(use24HourFormat)); }, [use24HourFormat]);

  // Auto-Scroll to Now
  const scrollToNow = useCallback(() => {
    if (viewMode === 'day' && timelineContainerRef.current) {
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      const scrollPos = (nowMin * PIXELS_PER_MINUTE) - (window.innerWidth / 2);
      timelineContainerRef.current.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
    }
  }, [viewMode]);

  useEffect(() => {
    // Scroll to now when switching to Day view
    if (viewMode === 'day') setTimeout(scrollToNow, 100);
  }, [viewMode, scrollToNow]);


  // --- DATA LOADING ---
  const loadEvents = useCallback(async () => {
    if (!user || !spaceId) return;
    try {
      setLoading(true);
      const [activeSnap, deletedSnap] = await Promise.all([
        getDocs(query(collection(db, "events"), where("spaceId", "==", spaceId), where("deleted", "==", false))),
        getDocs(query(collection(db, "events"), where("spaceId", "==", spaceId), where("deleted", "==", true)))
      ]);
      setEvents(activeSnap.docs.map(d => ({ id: d.id, ...d.data(), start: d.data().startTime.toDate(), end: d.data().endTime.toDate() })));
      setDeletedEvents(deletedSnap.docs.map(d => ({ id: d.id, ...d.data(), start: d.data().startTime?.toDate(), end: d.data().endTime?.toDate() })));
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [user, spaceId]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // --- CRUD ACTIONS ---
  const saveEvent = async () => {
    if (!title.trim() || !startTime || !endTime || !user) return;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const start = new Date(currentDate); start.setHours(sh, sm, 0, 0);
    const end = new Date(currentDate); end.setHours(eh, em, 0, 0);
    if (end <= start) end.setDate(end.getDate() + 1); // Handle overnight
    
    const data = { title: title.trim(), startTime: Timestamp.fromDate(start), endTime: Timestamp.fromDate(end), category: eventCategory, spaceId, deleted: false, updatedAt: serverTimestamp() };
    try {
      if (editingEvent) await updateDoc(doc(db, "events", editingEvent.id), data);
      else { data.createdAt = serverTimestamp(); await addDoc(collection(db, "events"), data); }
      setShowModal(false); resetForm(); loadEvents();
    } catch (err) { console.error(err); alert("Failed to save"); }
  };

  const softDeleteEvent = async (id) => { await updateDoc(doc(db, "events", id), { deleted: true, deletedAt: serverTimestamp() }); loadEvents(); };
  const restoreEvent = async (id) => { await updateDoc(doc(db, "events", id), { deleted: false, deletedAt: null }); loadEvents(); };
  const permanentlyDeleteEvent = async (id) => { await deleteDoc(doc(db, "events", id)); loadEvents(); };

  // --- HELPERS ---
  const resetForm = () => { setTitle(""); setStartTime(""); setEndTime(""); setEventCategory("work"); setEditingEvent(null); };
  const openNewEvent = (ps, pe) => { resetForm(); if (ps && pe) { setStartTime(fmtIn(ps)); setEndTime(fmtIn(pe)); } setShowModal(true); };
  const openEditEvent = (ev) => { setEditingEvent(ev); setTitle(ev.title); setStartTime(fmtIn(ev.start)); setEndTime(fmtIn(ev.end)); setEventCategory(ev.category || "work"); setShowModal(true); };

  const fmtIn = (d) => `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
  const fmtTime = (d) => use24HourFormat ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  
  const navDate = (dir) => { const d = new Date(currentDate); if (viewMode === "day") d.setDate(d.getDate() + dir); else if (viewMode === "week") d.setDate(d.getDate() + dir * 7); else d.setFullYear(d.getFullYear() + dir); setCurrentDate(d); };
  const goToToday = () => { setCurrentDate(new Date()); setViewMode("day"); scrollToNow(); };
  const goToDate = (d) => { setCurrentDate(d); setViewMode("day"); };

  // --- LAYOUT LOGIC ---
  const filteredEvents = useMemo(() => events.filter(ev => filterCategory === "All" || ev.category === filterCategory), [events, filterCategory]);

  const assignRows = (evts) => {
    // Sort by start time, then duration (longer first)
    const sorted = [...evts].sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
    const rows = [];
    return sorted.map(ev => {
      const es = ev.start.getHours() * 60 + ev.start.getMinutes();
      const ee = ev.end.getHours() * 60 + ev.end.getMinutes();
      let row = 0;
      // Find first row where this event doesn't collide
      while (rows[row]?.some(x => { 
        const xs = x.start.getHours() * 60 + x.start.getMinutes(); 
        const xe = x.end.getHours() * 60 + x.end.getMinutes(); 
        return es < xe && ee > xs; // Collision detection
      })) row++;
      if (!rows[row]) rows[row] = [];
      rows[row].push(ev);
      return { ...ev, row };
    });
  };

  const dayEvts = useMemo(() => filteredEvents.filter(ev => ev.start.toDateString() === currentDate.toDateString()), [filteredEvents, currentDate]);
  const evtsRows = useMemo(() => assignRows(dayEvts), [dayEvts]);
  const maxRow = Math.max(0, ...evtsRows.map(e => e.row));
  const tlHeight = Math.max((maxRow + 1) * (EVENT_HEIGHT + ROW_GAP) + 60, window.innerHeight - 300);

  // --- DRAG & DROP HANDLERS ---
  const handleEvtDown = (e, ev, handle = null) => {
    if (e.button !== 0) return;
    e.stopPropagation(); e.preventDefault();
    dragDataRef.current = { startX: e.clientX, originalStart: new Date(ev.start), originalEnd: new Date(ev.end), handle };
    setHasDragged(false);
    handle ? setResizingEvent(ev) : setDraggingEvent(ev);
  };

  const handleMove = useCallback((e) => {
    if (!draggingEvent && !resizingEvent) return;
    const dx = e.clientX - dragDataRef.current.startX;
    if (Math.abs(dx) > 3) setHasDragged(true);
    const md = Math.round(dx / PIXELS_PER_MINUTE / SNAP_MINUTES) * SNAP_MINUTES;
    
    if (draggingEvent) {
      const ns = new Date(dragDataRef.current.originalStart); ns.setMinutes(ns.getMinutes() + md);
      const ne = new Date(dragDataRef.current.originalEnd); ne.setMinutes(ne.getMinutes() + md);
      if (ns.getHours() >= 0 && ne.getHours() < 24) setEvents(p => p.map(ev => ev.id === draggingEvent.id ? { ...ev, start: ns, end: ne } : ev));
    } else if (resizingEvent) {
      const { handle } = dragDataRef.current;
      if (handle === "left") {
        const ns = new Date(dragDataRef.current.originalStart); ns.setMinutes(ns.getMinutes() + md);
        if (ns.getHours() >= 0 && ns < dragDataRef.current.originalEnd) setEvents(p => p.map(ev => ev.id === resizingEvent.id ? { ...ev, start: ns } : ev));
      } else {
        const ne = new Date(dragDataRef.current.originalEnd); ne.setMinutes(ne.getMinutes() + md);
        const ms = new Date(dragDataRef.current.originalStart); ms.setMinutes(ms.getMinutes() + MIN_EVENT_DURATION);
        if (ne.getHours() <= 23 && ne > ms) setEvents(p => p.map(ev => ev.id === resizingEvent.id ? { ...ev, end: ne } : ev));
      }
    }
  }, [draggingEvent, resizingEvent]);

  const handleUp = useCallback(async () => {
    const evSave = draggingEvent || resizingEvent;
    if (evSave && hasDragged && !isSavingRef.current) {
      isSavingRef.current = true;
      const upd = events.find(ev => ev.id === evSave.id);
      if (upd) try { await updateDoc(doc(db, "events", evSave.id), { startTime: Timestamp.fromDate(upd.start), endTime: Timestamp.fromDate(upd.end), updatedAt: serverTimestamp() }); } catch { loadEvents(); }
      isSavingRef.current = false;
    }
    setDraggingEvent(null); setResizingEvent(null); setHasDragged(false);
  }, [draggingEvent, resizingEvent, hasDragged, events, loadEvents]);

  useEffect(() => {
    if (draggingEvent || resizingEvent) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
      return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
    }
  }, [draggingEvent, resizingEvent, handleMove, handleUp]);

  const handleTlClick = (e) => {
    if (hasDragged || draggingEvent || resizingEvent) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const mins = Math.round(x / PIXELS_PER_MINUTE / SNAP_MINUTES) * SNAP_MINUTES;
    const sd = new Date(currentDate); sd.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
    const ed = new Date(sd); ed.setMinutes(ed.getMinutes() + 60);
    openNewEvent(sd, ed);
  };

  // --- RENDER HELPERS ---
  const isToday = currentDate.toDateString() === now.toDateString();
  const upcoming = events.filter(ev => ev.start >= now && !ev.deleted).sort((a, b) => a.start - b.start).slice(0, 10);

  // Auth Screen
  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bgLight, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="fade-in" style={{ background: "#fff", borderRadius: 24, padding: "56px 48px", maxWidth: 440, width: "100%", boxShadow: "0 20px 80px rgba(0,0,0,0.06)", textAlign: "center", border: `1px solid ${COLORS.stone[200]}` }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 12px 28px rgba(16, 185, 129, 0.25)" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 600, color: COLORS.stone[900], marginBottom: 8, letterSpacing: "-0.02em" }}>Linear Calendar</h1>
          <p style={{ color: COLORS.stone[500], fontSize: 16, lineHeight: 1.5, marginBottom: 32 }}>Experience time differently. <br/>Organized, fluid, and beautiful.</p>
          <button onClick={() => signInWithPopup(auth, provider)} style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", background: "#1c1917", color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer", transition: "transform 0.1s" }}>Sign in with Google</button>
        </div>
      </div>
    );
  }

  return (
    <div className={darkMode ? "dark" : ""} style={{ height: "100vh", background: darkMode ? COLORS.bgDark : COLORS.bgLight, color: darkMode ? COLORS.stone[200] : COLORS.stone[800], display: "flex", overflow: "hidden" }}>
      
      {/* --- SIDEBAR --- */}
      <aside style={{ 
          width: showSidebar ? 300 : 0, 
          opacity: showSidebar ? 1 : 0,
          background: darkMode ? COLORS.stone[850] : COLORS.white, 
          borderRight: `1px solid ${darkMode ? COLORS.stone[800] : COLORS.stone[200]}`, 
          display: "flex", flexDirection: "column", transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)", overflow: "hidden", position: "relative", zIndex: 20 
      }}>
        <div style={{ padding: "24px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center" }}>
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Fraunces', serif", color: darkMode ? COLORS.white : COLORS.stone[900] }}>{user.displayName?.split(" ")[0]}'s Space</div>
          </div>
          <button onClick={() => setShowSidebar(false)} style={{ background: "transparent", border: "none", color: COLORS.stone[500], cursor: "pointer", padding: 4 }}>
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }} className="custom-scroll">
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.stone[500], letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 12 }}>Upcoming</div>
            {upcoming.length === 0 ? (
              <div style={{ padding: 16, background: darkMode ? COLORS.stone[800] : COLORS.stone[50], borderRadius: 12, textAlign: "center", fontSize: 13, color: COLORS.stone[500] }}>No upcoming events</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {upcoming.map(ev => {
                  const cs = EVENT_COLORS[ev.category] || EVENT_COLORS.emerald;
                  const isTd = ev.start.toDateString() === now.toDateString();
                  return (
                    <div key={ev.id} onClick={() => { goToDate(ev.start); openEditEvent(ev); }} 
                      style={{ padding: "10px 12px", borderRadius: 10, background: darkMode ? COLORS.stone[800] : COLORS.stone[50], borderLeft: `3px solid ${cs.border}`, cursor: "pointer", transition: "transform 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.transform = "translateX(2px)"}
                      onMouseLeave={e => e.currentTarget.style.transform = "translateX(0)"}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: darkMode ? COLORS.stone[200] : COLORS.stone[800] }}>{ev.title}</div>
                      <div style={{ fontSize: 11, marginTop: 2, color: COLORS.stone[500] }}>
                        <span style={{ color: isTd ? COLORS.emerald[500] : "inherit", fontWeight: isTd ? 600 : 400 }}>{isTd ? "Today" : ev.start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span> • {fmtTime(ev.start)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
             <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.stone[500], letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 12 }}>Filters</div>
             <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <button onClick={() => setFilterCategory("All")} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", background: filterCategory === "All" ? COLORS.stone[800] : (darkMode ? COLORS.stone[800] : COLORS.stone[100]), color: filterCategory === "All" ? COLORS.white : COLORS.stone[500], cursor: "pointer" }}>All</button>
                {categories.map(cat => {
                   const cs = EVENT_COLORS[cat.color] || EVENT_COLORS.emerald;
                   const active = filterCategory === cat.id;
                   return (
                     <button key={cat.id} onClick={() => setFilterCategory(cat.id)} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: `1px solid ${active ? cs.border : "transparent"}`, background: active ? cs.light : (darkMode ? COLORS.stone[800] : COLORS.stone[100]), color: active ? cs.text : COLORS.stone[500], cursor: "pointer" }}>
                       {cat.name}
                     </button>
                   )
                })}
             </div>
          </div>
        </div>
        
        <div style={{ padding: 20, borderTop: `1px solid ${darkMode ? COLORS.stone[800] : COLORS.stone[200]}` }}>
           <button onClick={() => setShowSettings(true)} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: darkMode ? COLORS.stone[800] : COLORS.stone[100], color: COLORS.stone[500], fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
             <span>⚙ Settings</span>
           </button>
        </div>
      </aside>


      {/* --- MAIN CONTENT --- */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", width: "100%" }}>
        
        {/* Toggle Sidebar Button (when hidden) */}
        {!showSidebar && (
          <button onClick={() => setShowSidebar(true)} style={{ position: "absolute", left: 16, top: 24, width: 40, height: 40, borderRadius: 12, border: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}`, background: darkMode ? COLORS.stone[800] : COLORS.white, color: COLORS.stone[400], cursor: "pointer", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        )}

        {/* --- HEADER --- */}
        <header style={{ padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${darkMode ? COLORS.stone[800] : COLORS.stone[200]}`, background: darkMode ? COLORS.bgDark : COLORS.bgLight }}>
           <div style={{ marginLeft: !showSidebar ? 48 : 0 }}>
             <h1 style={{ fontSize: 24, fontFamily: "'Fraunces', serif", fontWeight: 600, color: darkMode ? COLORS.stone[100] : COLORS.stone[900], display: "flex", alignItems: "center", gap: 8 }}>
               {viewMode === "day" && currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
               {viewMode === "year" && currentDate.getFullYear()}
               {viewMode === "day" && isToday && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: COLORS.emerald[500], color: "white", fontWeight: 700, letterSpacing: "0.05em" }}>TODAY</span>}
             </h1>
             <p style={{ color: COLORS.stone[500], fontSize: 13, marginTop: 4 }}>"{dailyQuote}"</p>
           </div>

           <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
             <div style={{ background: darkMode ? COLORS.stone[800] : COLORS.white, padding: 4, borderRadius: 10, border: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}`, display: "flex" }}>
                <button onClick={() => setViewMode("day")} style={{ padding: "6px 16px", borderRadius: 7, border: "none", background: viewMode === "day" ? (darkMode ? COLORS.stone[600] : COLORS.stone[100]) : "transparent", color: viewMode === "day" ? (darkMode ? COLORS.white : COLORS.stone[900]) : COLORS.stone[500], fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Day</button>
                <button onClick={() => setViewMode("year")} style={{ padding: "6px 16px", borderRadius: 7, border: "none", background: viewMode === "year" ? (darkMode ? COLORS.stone[600] : COLORS.stone[100]) : "transparent", color: viewMode === "year" ? (darkMode ? COLORS.white : COLORS.stone[900]) : COLORS.stone[500], fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Year</button>
             </div>
             <button onClick={() => navDate(-1)} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}`, background: darkMode ? COLORS.stone[800] : COLORS.white, color: COLORS.stone[400], cursor: "pointer" }}>←</button>
             <button onClick={() => navDate(1)} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}`, background: darkMode ? COLORS.stone[800] : COLORS.white, color: COLORS.stone[400], cursor: "pointer" }}>→</button>
             <button onClick={() => openNewEvent()} style={{ marginLeft: 12, padding: "10px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${COLORS.emerald[500]}, ${COLORS.emerald[600]})`, color: "white", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)" }}>+ New Event</button>
           </div>
        </header>

        {/* --- VIEW AREA --- */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          
          {/* ================= DAY VIEW (LINEAR FIXED) ================= */}
          {viewMode === "day" && (
            <div 
              ref={timelineContainerRef}
              className="custom-scroll"
              style={{ height: "100%", overflowX: "auto", overflowY: "auto", position: "relative", cursor: draggingEvent ? "grabbing" : "default" }}
            >
              <div style={{ width: DAY_WIDTH, minHeight: "100%", position: "relative", background: darkMode ? `repeating-linear-gradient(90deg, ${COLORS.stone[850]}, ${COLORS.stone[850]} 1px, transparent 1px, transparent ${60 * PIXELS_PER_MINUTE}px)` : `repeating-linear-gradient(90deg, ${COLORS.white}, ${COLORS.white} 1px, transparent 1px, transparent ${60 * PIXELS_PER_MINUTE}px)` }}>
                
                {/* Time Header Sticky Strip */}
                <div className="glass-panel" style={{ position: "sticky", top: 0, height: HEADER_HEIGHT, width: "100%", zIndex: 40, borderBottom: `1px solid ${darkMode ? COLORS.stone[800] : COLORS.stone[200]}`, display: "flex", alignItems: "center" }}>
                   {Array.from({ length: 24 }, (_, h) => (
                     <div key={h} style={{ position: "absolute", left: h * 60 * PIXELS_PER_MINUTE, paddingLeft: 8, fontSize: 12, fontWeight: 600, color: COLORS.stone[500] }}>
                       {use24HourFormat ? `${h}:00` : `${h === 0 ? 12 : h > 12 ? h - 12 : h} ${h < 12 ? "am" : "pm"}`}
                     </div>
                   ))}
                </div>

                {/* Grid & Events Area */}
                <div 
                  onClick={handleTlClick}
                  style={{ position: "relative", height: tlHeight, marginTop: 10 }}
                >
                  {/* Vertical Hour Lines */}
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} style={{ position: "absolute", left: h * 60 * PIXELS_PER_MINUTE, top: 0, bottom: 0, width: 1, background: darkMode ? COLORS.stone[800] : COLORS.stone[200] }} />
                  ))}

                  {/* Current Time Line */}
                  {isToday && (
                    <div className="pulse-glow" style={{ position: "absolute", left: (now.getHours() * 60 + now.getMinutes()) * PIXELS_PER_MINUTE, top: -10, bottom: 0, width: 2, background: COLORS.emerald[500], zIndex: 30, pointerEvents: "none" }}>
                      <div style={{ position: "absolute", top: -4, left: -4, width: 10, height: 10, borderRadius: "50%", background: COLORS.emerald[500] }} />
                    </div>
                  )}

                  {/* Events */}
                  {evtsRows.map(ev => {
                     const sm = ev.start.getHours() * 60 + ev.start.getMinutes();
                     const dur = (ev.end - ev.start) / 60000;
                     const width = Math.max(dur * PIXELS_PER_MINUTE, MIN_EVENT_DURATION * PIXELS_PER_MINUTE);
                     const top = ev.row * (EVENT_HEIGHT + ROW_GAP);
                     const cs = EVENT_COLORS[ev.category] || EVENT_COLORS.emerald;
                     const isDrag = draggingEvent?.id === ev.id || resizingEvent?.id === ev.id;
                     
                     return (
                       <div key={ev.id}
                         onMouseDown={e => handleEvtDown(e, ev)}
                         onClick={e => { e.stopPropagation(); if (!hasDragged) openEditEvent(ev); }}
                         style={{
                           position: "absolute", left: sm * PIXELS_PER_MINUTE, top, width, height: EVENT_HEIGHT,
                           background: isDrag ? cs.bg : (darkMode ? COLORS.stone[800] : cs.light),
                           borderLeft: `3px solid ${cs.border}`,
                           borderRadius: 6,
                           padding: "4px 8px",
                           cursor: "grab",
                           zIndex: isDrag ? 100 : 10,
                           boxShadow: isDrag ? "0 10px 30px rgba(0,0,0,0.3)" : "0 2px 5px rgba(0,0,0,0.05)",
                           opacity: isDrag ? 0.9 : 1,
                           overflow: "hidden",
                           border: isDrag ? `1px solid ${COLORS.white}` : `1px solid ${darkMode ? COLORS.stone[700] : "transparent"}`
                         }}
                       >
                         {/* Drag Handles */}
                         <div onMouseDown={e => handleEvtDown(e, ev, "left")} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 10, cursor: "ew-resize", zIndex: 20 }} />
                         <div style={{ fontSize: 12, fontWeight: 700, color: isDrag ? "#fff" : (darkMode ? COLORS.stone[200] : cs.text), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title}</div>
                         <div style={{ fontSize: 10, color: isDrag ? "rgba(255,255,255,0.8)" : COLORS.stone[500] }}>{fmtTime(ev.start)} - {fmtTime(ev.end)}</div>
                         <div onMouseDown={e => handleEvtDown(e, ev, "right")} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 10, cursor: "ew-resize", zIndex: 20 }} />
                       </div>
                     )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= YEAR VIEW (REFINED) ================= */}
          {viewMode === "year" && (
            <div className="custom-scroll fade-in" style={{ padding: 40, overflowY: "auto", height: "100%", display: "flex", justifyContent: "center" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32, width: "100%", maxWidth: 1400 }}>
                {Array.from({ length: 12 }, (_, mi) => {
                  const monthStart = new Date(currentDate.getFullYear(), mi, 1);
                  const daysInMonth = new Date(currentDate.getFullYear(), mi + 1, 0).getDate();
                  const startDay = monthStart.getDay(); // 0 is Sunday
                  
                  return (
                    <div key={mi} style={{ breakInside: "avoid" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: darkMode ? COLORS.stone[200] : COLORS.stone[800], marginBottom: 16 }}>{monthStart.toLocaleDateString(undefined, { month: 'long' })}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                         {["S","M","T","W","T","F","S"].map(d => <div key={d} style={{ fontSize: 10, fontWeight: 600, color: COLORS.stone[500], textAlign: "center", paddingBottom: 4 }}>{d}</div>)}
                         
                         {/* Empty slots */}
                         {Array.from({ length: startDay }, (_, i) => <div key={`e-${i}`} />)}
                         
                         {/* Days */}
                         {Array.from({ length: daysInMonth }, (_, d) => {
                            const dayNum = d + 1;
                            const thisDate = new Date(currentDate.getFullYear(), mi, dayNum);
                            const isTd = thisDate.toDateString() === now.toDateString();
                            const evCount = filteredEvents.filter(e => e.start.toDateString() === thisDate.toDateString()).length;
                            
                            // Heatmap colors
                            let bg = "transparent";
                            let color = darkMode ? COLORS.stone[500] : COLORS.stone[600];
                            if (isTd) { bg = COLORS.emerald[500]; color = "#fff"; }
                            else if (evCount > 0) {
                              const intensity = Math.min(evCount * 100, 900); // emerald-100 to 900
                              // Simple opacity logic for heatmap effect
                              bg = darkMode ? `rgba(16, 185, 129, ${0.1 + (evCount * 0.15)})` : `rgba(16, 185, 129, ${0.1 + (evCount * 0.15)})`;
                              color = darkMode ? COLORS.emerald[100] : COLORS.emerald[900];
                            }

                            return (
                              <div key={dayNum} className="year-day" onClick={() => goToDate(thisDate)}
                                style={{ 
                                  aspectRatio: "1", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", 
                                  fontSize: 12, fontWeight: isTd || evCount > 0 ? 600 : 400, 
                                  background: bg, color: color, cursor: "pointer", position: "relative" 
                                }}>
                                {dayNum}
                                {evCount > 0 && <div className="tooltip" style={{ position: "absolute", top: 0, left: "50%", background: "#000", color: "#fff", padding: "4px 8px", borderRadius: 4, fontSize: 10, whiteSpace: "nowrap", opacity: 0, transition: "opacity 0.2s" }}>{evCount} events</div>}
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
        </div>

      </main>

      {/* --- MODAL --- */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="fade-in" onClick={e => e.stopPropagation()} style={{ background: darkMode ? COLORS.stone[850] : COLORS.white, borderRadius: 16, width: "100%", maxWidth: 400, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", border: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}` }}>
            <h2 style={{ fontSize: 18, marginBottom: 20, color: darkMode ? COLORS.stone[100] : COLORS.stone[900] }}>{editingEvent ? "Edit Event" : "New Event"}</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <input autoFocus type="text" placeholder="What are you up to?" value={title} onChange={e => setTitle(e.target.value)} 
                style={{ width: "100%", padding: "12px", borderRadius: 8, border: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[300]}`, background: darkMode ? COLORS.stone[800] : COLORS.white, color: darkMode ? COLORS.stone[100] : COLORS.stone[900], fontSize: 15 }} />
              
              <div style={{ display: "flex", gap: 12 }}>
                 <div style={{ flex: 1 }}>
                   <label style={{ fontSize: 11, fontWeight: 700, color: COLORS.stone[500], textTransform: "uppercase" }}>Start</label>
                   <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ width: "100%", marginTop: 4, padding: "10px", borderRadius: 8, border: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[300]}`, background: darkMode ? COLORS.stone[800] : COLORS.white, color: darkMode ? COLORS.stone[100] : COLORS.stone[900] }} />
                 </div>
                 <div style={{ flex: 1 }}>
                   <label style={{ fontSize: 11, fontWeight: 700, color: COLORS.stone[500], textTransform: "uppercase" }}>End</label>
                   <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ width: "100%", marginTop: 4, padding: "10px", borderRadius: 8, border: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[300]}`, background: darkMode ? COLORS.stone[800] : COLORS.white, color: darkMode ? COLORS.stone[100] : COLORS.stone[900] }} />
                 </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: COLORS.stone[500], textTransform: "uppercase", display: "block", marginBottom: 8 }}>Category</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {categories.map(cat => {
                    const cs = EVENT_COLORS[cat.color] || EVENT_COLORS.emerald;
                    const active = eventCategory === cat.id;
                    return (
                      <button key={cat.id} onClick={() => setEventCategory(cat.id)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${active ? cs.border : darkMode ? COLORS.stone[700] : COLORS.stone[300]}`, background: active ? cs.light : "transparent", color: active ? cs.text : COLORS.stone[500], fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{cat.name}</button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 20, borderTop: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}` }}>
              {editingEvent ? (
                <button onClick={() => { softDeleteEvent(editingEvent.id); setShowModal(false); }} style={{ color: COLORS.rose[500], background: "transparent", border: "none", fontWeight: 600, cursor: "pointer" }}>Delete</button>
              ) : <div />}
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => setShowModal(false)} style={{ color: COLORS.stone[500], background: "transparent", border: "none", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={saveEvent} style={{ padding: "8px 20px", borderRadius: 8, background: COLORS.emerald[500], color: "white", border: "none", fontWeight: 600, cursor: "pointer" }}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SETTINGS MODAL --- */}
      {showSettings && (
        <div onClick={() => setShowSettings(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
           <div className="fade-in" onClick={e => e.stopPropagation()} style={{ background: darkMode ? COLORS.stone[850] : COLORS.white, borderRadius: 16, width: "100%", maxWidth: 360, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", border: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[200]}` }}>
              <h2 style={{ fontSize: 18, marginBottom: 24, color: darkMode ? COLORS.stone[100] : COLORS.stone[900] }}>Settings</h2>
              
              <div style={{ marginBottom: 20 }}>
                 <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.stone[500], textTransform: "uppercase", marginBottom: 8 }}>Theme</div>
                 <div style={{ display: "flex", background: darkMode ? COLORS.stone[800] : COLORS.stone[100], padding: 4, borderRadius: 8 }}>
                    <button onClick={() => setDarkMode(false)} style={{ flex: 1, padding: 8, borderRadius: 6, border: "none", background: !darkMode ? COLORS.white : "transparent", color: !darkMode ? COLORS.stone[900] : COLORS.stone[500], fontWeight: 600, cursor: "pointer", boxShadow: !darkMode ? "0 2px 4px rgba(0,0,0,0.1)" : "none" }}>Light</button>
                    <button onClick={() => setDarkMode(true)} style={{ flex: 1, padding: 8, borderRadius: 6, border: "none", background: darkMode ? COLORS.stone[600] : "transparent", color: darkMode ? COLORS.white : COLORS.stone[500], fontWeight: 600, cursor: "pointer", boxShadow: darkMode ? "0 2px 4px rgba(0,0,0,0.1)" : "none" }}>Dark</button>
                 </div>
              </div>
              
              <button onClick={() => signOut(auth)} style={{ width: "100%", padding: "12px", borderRadius: 8, border: `1px solid ${darkMode ? COLORS.stone[700] : COLORS.stone[300]}`, background: "transparent", color: COLORS.stone[500], fontWeight: 600, cursor: "pointer" }}>Sign Out</button>
           </div>
        </div>
      )}

    </div>
  );
}